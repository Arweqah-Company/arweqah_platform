# Build from the repo root: docker build -f apps/web/Dockerfile --build-arg VITE_MICROSOFT_ENABLED=true .
FROM node:24.21-alpine AS base
RUN npm i -g turbo@2.11.7

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN turbo prune @arweqah-platform/web --docker

FROM base AS builder
ARG VITE_MICROSOFT_ENABLED=false
ENV VITE_MICROSOFT_ENABLED=$VITE_MICROSOFT_ENABLED VITE_API_URL=/api
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
COPY .npmrc ./
RUN npm ci
COPY --from=pruner /repo/out/full/ .
RUN turbo run build --filter=@arweqah-platform/web

# Static files only; nginx (non-root) serves the SPA and proxies /api inside the Docker network.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runner
# Pick up Alpine security fixes published after the base image was built (Trivy gates the deploy on them).
USER root
RUN apk upgrade --no-cache
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
# Back to the unprivileged user the base image runs as (also satisfies the Trivy DS-0002 check).
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
