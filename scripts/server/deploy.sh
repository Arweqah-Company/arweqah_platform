#!/usr/bin/env bash
# Run on the server by the deploy workflow:  bash scripts/server/deploy.sh <image-tag>
# Pulls the new images, migrates the database, seeds (idempotent) and restarts the app.
set -euo pipefail
cd "$(dirname "$0")/../.."
export TAG="${1:?image tag required}"
dc() { docker compose -f docker-compose.prod.yml "$@"; }

dc pull api web
dc up -d postgres rabbitmq
# Migrations run before the new code starts.
dc run --rm api npm run migration:run:prod
dc run --rm api npm run seed:prod
dc up -d --remove-orphans
sed -i "s/^TAG=.*/TAG=$TAG/" .env
docker image prune -f
