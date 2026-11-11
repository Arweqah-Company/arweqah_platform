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
dc up -d --wait postgres rabbitmq
# A backup before the migrations (a migration may delete data). The decision is by the DATABASE, not by whether the API happens to run:
# it is skipped only when the database is confirmed new (no `migrations` table); when it holds data, or cannot be inspected, a failed backup STOPS the deploy.
env_value() { grep -m1 "^$1=" .env | cut -d= -f2-; }
has_data=$(dc exec -T postgres psql -U "$(env_value DB_USER)" -d "$(env_value DB_NAME)" -tAc "SELECT to_regclass('public.migrations') IS NOT NULL")
mkdir -p backups
if [ "$has_data" = "t" ]; then
  bash scripts/server/backup.sh
elif [ "$has_data" = "f" ]; then
  echo "New database: first deploy, no backup."
else
  echo "Could not inspect the database ($has_data): stopping." >&2
  exit 1
fi
# Migrations run before the new code starts.
# The runtime image has no npm (Trivy), so the scripts call node directly.
dc run --rm api node ../../node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
dc run --rm api node dist/database/seeds/seed.js
dc up -d --remove-orphans
sed -i "s/^TAG=.*/TAG=$TAG/" .env
docker image prune -af
