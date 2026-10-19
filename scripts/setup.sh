#!/usr/bin/env bash
# One-time local setup: dependencies, .env with fresh secrets, Docker services, migrations, seed.
set -euo pipefail
cd "$(dirname "$0")/.."

node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<22||(a===22&&b<12)) { console.error("Node 22.12+ is required"); process.exit(1) }'
command -v docker >/dev/null || { echo "Docker is required"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  secret=$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')
  key=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')
  node -e '
    const fs=require("fs"); let s=fs.readFileSync(".env","utf8");
    s=s.replace(/^BETTER_AUTH_SECRET=.*$/m,"BETTER_AUTH_SECRET='"$secret"'")
       .replace(/^FIELD_ENCRYPTION_KEY=.*$/m,"FIELD_ENCRYPTION_KEY='"$key"'")
       .replace(/^DB_PASSWORD=.*$/m,"DB_PASSWORD=arweqah_dev")
       .replace(/^RABBITMQ_URL=.*$/m,"RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672")
       .replace(/^SEED_ADMIN_PASSWORD=.*$/m,"SEED_ADMIN_PASSWORD=Admin-Passw0rd-Dev");
    fs.writeFileSync(".env",s);'
  echo "Created .env with new secrets (admin: admin@example.com / Admin-Passw0rd-Dev)"
fi

npm ci
docker compose up -d --wait
npm run build -w @arweqah-platform/shared
npm run db:migrate
npm run db:seed
echo "Done. Start with: npm run dev  ->  http://localhost:5173"
