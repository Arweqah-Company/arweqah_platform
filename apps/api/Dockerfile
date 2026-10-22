# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24.21-alpine AS base
RUN npm i -g turbo@2.11.7

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN turbo prune @arweqah-platform/api --docker

FROM base AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
COPY .npmrc ./
RUN npm ci
COPY --from=pruner /repo/out/full/ .
RUN turbo run build --filter=@arweqah-platform/api && npm prune --omit=dev

FROM node:24.21-alpine AS runner
ENV NODE_ENV=production
# Pick up Alpine security fixes published after the base image was built (Trivy gates the deploy on them).
RUN apk upgrade --no-cache
WORKDIR /repo
COPY --from=builder --chown=node:node /repo/package.json ./
COPY --from=builder --chown=node:node /repo/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/packages ./packages
COPY --from=builder --chown=node:node /repo/apps/api/package.json ./apps/api/
COPY --from=builder --chown=node:node /repo/apps/api/dist ./apps/api/dist
WORKDIR /repo/apps/api
# Uploaded files (FILE_STORAGE=local) live in a volume mounted here; created first so the volume is writable by `node`.
RUN mkdir -p /data/storage && chown node:node /data/storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
