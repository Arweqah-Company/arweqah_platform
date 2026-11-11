#!/usr/bin/env bash
# Run on the server by the deploy workflow:  bash scripts/server/deploy.sh <image-tag>
# Pulls the new images, migrates the database, seeds (idempotent) and restarts the app.
set -euo pipefail
cd "$(dirname "$0")/../.."
export TAG="${1:?image tag required}"
dc() { docker compose -f docker-compose.prod.yml "$@"; }

# Every deploy pulls images tagged with a new commit SHA, so old ones are not "dangling" and pile up until the disk is full.
# Clear everything unused (running containers keep their images) before the pull, so a full disk cannot stop the next deploy.
docker image prune -af
dc pull api web
dc up -d postgres rabbitmq
# A backup before the migrations (a migration may delete data): when the server already runs, a failed backup STOPS the deploy.
# On a first deploy no API container exists yet and there is nothing to back up.
mkdir -p backups
if dc ps --status running --services | grep -qx api; then
  bash scripts/server/backup.sh
else
  echo "No running API: first deploy, no backup."
fi
# Migrations run before the new code starts.
# The runtime image has no npm (Trivy), so the scripts call node directly.
dc run --rm api node ../../node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
dc run --rm api node dist/database/seeds/seed.js
dc up -d --remove-orphans
sed -i "s/^TAG=.*/TAG=$TAG/" .env
docker image prune -af
