#!/usr/bin/env bash
# Run BY HAND on the server:  bash scripts/server/reset-org.sh
# Empties the organization structure (units, job titles and their roles, ticket desks, tickets; employees stay, flagged «needs placement»)
# and builds the official one again from the seed. Needed because the seed never touches a structure that already has units.
# It takes a backup first and asks for the database name to be typed.
set -euo pipefail
cd "$(dirname "$0")/../.."
env_value() { grep -m1 "^$1=" .env | cut -d= -f2-; }
DB_NAME=$(env_value DB_NAME)
dc() { docker compose -f docker-compose.prod.yml "$@"; }

echo "This DELETES every unit, job title, ticket desk and ticket of database '$DB_NAME' and rebuilds the structure."
read -r -p "Type the database name to continue: " typed
[ "$typed" = "$DB_NAME" ] || { echo "Not confirmed, nothing changed."; exit 1; }

mkdir -p backups
bash scripts/server/backup.sh
dc run --rm -e ORG_RESET_CONFIRM="$DB_NAME" api node dist/database/seeds/reset-org-structure.js
dc run --rm api node dist/database/seeds/seed.js
echo "Done. A backup of the old data is in backups/."
