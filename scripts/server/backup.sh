#!/usr/bin/env bash
# Daily backup (cron, 02:30): database dump + uploaded files, kept 14 days in /opt/arweqah-platform/backups.
# Copy that folder off the server too (S3 or another machine) so a lost disk does not lose the data.
set -euo pipefail
cd "$(dirname "$0")/../.."
# Not `source`: values such as MAIL_FROM contain spaces.
env_value() { grep -m1 "^$1=" .env | cut -d= -f2-; }
DB_USER=$(env_value DB_USER); DB_NAME=$(env_value DB_NAME)
stamp=$(date +%F)
dc() { docker compose -f docker-compose.prod.yml "$@"; }

dc exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom > "backups/db-$stamp.dump"
# The files are read through the API container; when it is down (a crashed server) the database dump above is still the backup that matters.
if dc ps --status running --services | grep -qx api; then
  dc exec -T api tar -C /data -cz storage > "backups/files-$stamp.tgz"
else
  echo "API not running: uploaded files not backed up this time." >&2
fi
find backups -type f \( -name 'db-*.dump' -o -name 'files-*.tgz' \) -mtime +14 -delete
echo "$(date -Is) backup $stamp ok"
