#!/usr/bin/env bash
# One-time local setup: dependencies, .env with fresh secrets, Docker services, migrations, seed.
set -euo pipefail
cd "$(dirname "$0")/.."

node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<24) { console.error("Node 24+ is required"); process.exit(1) }'
command -v docker >/dev/null || { echo "Docker is required"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  secret=$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')
  key=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')
  totp=$(node -e 'const a="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";const b=require("crypto").randomBytes(20);let o="";for(const x of b)o+=a[x%32];console.log(o)')
  blind=$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')
  node -e '
    const fs=require("fs"); let s=fs.readFileSync(".env","utf8");
    s=s.replace(/^BETTER_AUTH_SECRET=.*$/m,"BETTER_AUTH_SECRET='"$secret"'")
       .replace(/^FIELD_ENCRYPTION_KEY=.*$/m,"FIELD_ENCRYPTION_KEY='"$key"'")
       .replace(/^BLIND_INDEX_KEY=.*$/m,"BLIND_INDEX_KEY='"$blind"'")
       .replace(/^DB_PASSWORD=.*$/m,"DB_PASSWORD=arweqah_dev")
       .replace(/^RABBITMQ_URL=.*$/m,"RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672")
       .replace(/^# SEED_ADMIN_TOTP_SECRET=.*$/m,"SEED_ADMIN_TOTP_SECRET='"$totp"'");
    fs.writeFileSync(".env",s);'
  echo "Created .env with new secrets. First admin: s.magdy@arweqah.sa (sign in with Microsoft, or add SEED_ADMIN_TOTP_SECRET from .env to an authenticator app)"
fi

npm ci
docker compose up -d --wait
npm run build -w @arweqah-platform/shared
npm run db:migrate
npm run db:seed
echo "Done. Start with: npm run dev  ->  http://localhost:5173"
