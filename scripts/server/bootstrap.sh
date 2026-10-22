#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 EC2 host for the Arweqah platform.
# Run as a sudo-capable user (e.g. ubuntu):   sudo bash bootstrap.sh
# Installs Docker, writes /opt/arweqah-platform/.env with generated secrets, gets an HTTPS certificate,
# schedules backups and prints the three values to add in GitHub. Safe to run again (it keeps an existing .env).
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo: sudo bash $0"; exit 1; }
. /etc/os-release
[ "$ID" = ubuntu ] || { echo "This script is for Ubuntu (found $ID)"; exit 1; }

APP_DIR=/opt/arweqah-platform
DEPLOY_USER=${SUDO_USER:-ubuntu}
ask() { local v; read -r -p "$1 " v; echo "${v:-${2:-}}"; }
rand_b64() { openssl rand -base64 "$1" | tr -d '\n'; }
rand_hex() { openssl rand -hex "$1"; }

echo "== 1/6 Questions =="
APP_HOST=$(ask "Web app domain [stg-portal.arweqah.sa]:" "stg-portal.arweqah.sa")
API_HOST=$(ask "API domain [stg-api-portal.arweqah.sa]:" "stg-api-portal.arweqah.sa")
LE_EMAIL=$(ask "E-mail for certificate expiry notices:")
GH_OWNER=$(ask "GitHub organization or user that owns the repository [Arweqah-Company]:" "Arweqah-Company")
SEED_EMAIL=$(ask "E-mail of the first System Admin [s.magdy@arweqah.sa]:" "s.magdy@arweqah.sa")
MS_CLIENT=$(ask "Microsoft Application (client) ID (Enter to skip for now):")
MS_TENANT=""; MS_THUMB=""
if [ -n "$MS_CLIENT" ]; then
  MS_TENANT=$(ask "Microsoft Directory (tenant) ID:")
  MS_THUMB=$(ask "Certificate thumbprint (40 characters):")
fi
SMTP_HOST=$(ask "SMTP host [smtp.office365.com]:" "smtp.office365.com")
SMTP_USER=$(ask "SMTP user / sending mailbox (Enter to fill later in .env):")
SMTP_PASSWORD=""; [ -z "$SMTP_USER" ] || { read -r -s -p "SMTP password: " SMTP_PASSWORD; echo; }

echo "== 2/6 Packages and Docker =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw certbot cron openssl
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER"

echo "== 3/6 Firewall =="
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "== 4/6 Application folder and .env =="
mkdir -p "$APP_DIR"/{secrets,backups,docker/nginx,scripts/server} /var/www/certbot
if [ -f "$APP_DIR/.env" ]; then
  echo ".env exists: kept as is"
else
  umask 077
  DB_PASSWORD=$(rand_hex 24)
  cat > "$APP_DIR/.env" <<ENV
NODE_ENV=production
APP_HOST=$APP_HOST
API_HOST=$API_HOST
APP_URL=https://$APP_HOST
API_URL=https://$APP_HOST
CORS_ORIGINS=https://$APP_HOST
SWAGGER_ENABLED=false

DB_HOST=postgres
DB_PORT=5432
DB_NAME=arweqah_platform
DB_USER=arweqah
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false

BETTER_AUTH_SECRET=$(rand_b64 48)
FIELD_ENCRYPTION_KEY=$(rand_b64 32)
BLIND_INDEX_KEY=$(rand_b64 48)

MICROSOFT_CLIENT_ID=$MS_CLIENT
MICROSOFT_TENANT_ID=$MS_TENANT
MICROSOFT_CERT_THUMBPRINT=$MS_THUMB
MICROSOFT_CERT_PRIVATE_KEY_FILE=/run/secrets/app/microsoft.key

MESSAGE_BUS=rabbitmq
RABBITMQ_USER=arweqah
RABBITMQ_PASSWORD=$(rand_hex 24)

MAIL_FROM=Arweqah Platform <${SMTP_USER:-no-reply@example.com}>
SMTP_HOST=$SMTP_HOST
SMTP_PORT=587
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_SECURE=false

FILE_STORAGE=local

SEED_ADMIN_EMAIL=$SEED_EMAIL
SEED_ADMIN_NAME=System Admin

REGISTRY=ghcr.io/$(echo "$GH_OWNER" | tr '[:upper:]' '[:lower:]')
IMAGE_PREFIX=arweqah-platform
TAG=latest
ENV
  chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR/.env"
  echo ".env created with generated secrets (back it up somewhere safe: losing FIELD_ENCRYPTION_KEY makes encrypted data unreadable)"
fi
# The API container runs as uid 1000 and reads the Microsoft key from here.
# The deploy workflow (as $DEPLOY_USER) copies the compose file and scripts into this folder.
chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR"
chmod 750 "$APP_DIR/secrets"; chown 1000:"$DEPLOY_USER" "$APP_DIR/secrets"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR/backups" "$APP_DIR/docker" "$APP_DIR/scripts"

echo "== 5/6 HTTPS certificate =="
PUBLIC_IP=$(curl -fsS https://checkip.amazonaws.com || true)
for host in "$APP_HOST" "$API_HOST"; do
  DNS_IP=$(getent hosts "$host" | awk '{print $1; exit}' || true)
  if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "$DNS_IP" ]; then
    echo "WARNING: $host resolves to '${DNS_IP:-nothing}' but this server is $PUBLIC_IP. Fix the DNS A record first."
    [ "$(ask 'Try to get the certificate anyway? [y/N]' n)" = y ] || { echo "Run this script again after DNS points here."; exit 1; }
  fi
done
if [ ! -d "/etc/letsencrypt/live/$APP_HOST" ]; then
  # One certificate for both names; its folder is named after the web domain.
  certbot certonly --standalone --cert-name "$APP_HOST" -d "$APP_HOST" -d "$API_HOST" -m "$LE_EMAIL" --agree-tos --no-eff-email --non-interactive
fi
# Renewal: nginx owns port 80, so stop it for the few seconds certbot needs and start it again.
cat > /etc/letsencrypt/renewal-hooks/pre/arweqah-stop-nginx.sh <<HOOK
#!/bin/sh
cd $APP_DIR && docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true
HOOK
cat > /etc/letsencrypt/renewal-hooks/post/arweqah-start-nginx.sh <<HOOK
#!/bin/sh
cd $APP_DIR && docker compose -f docker-compose.prod.yml start nginx 2>/dev/null || true
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/pre/arweqah-stop-nginx.sh /etc/letsencrypt/renewal-hooks/post/arweqah-start-nginx.sh

echo "== 6/6 Daily backup and the GitHub deploy key =="
cat > /etc/cron.d/arweqah-backup <<CRON
30 2 * * * $DEPLOY_USER cd $APP_DIR && bash scripts/server/backup.sh >> backups/backup.log 2>&1
CRON
chmod 644 /etc/cron.d/arweqah-backup

KEY=/tmp/arweqah-deploy-key
rm -f "$KEY" "$KEY.pub"
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f "$KEY" >/dev/null
SSH_DIR=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)/.ssh
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
cat "$KEY.pub" >> "$SSH_DIR/authorized_keys"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$SSH_DIR/authorized_keys"; chmod 600 "$SSH_DIR/authorized_keys"

cat <<DONE

==================== DONE: now do these steps ====================
1. Microsoft sign-in (skip if you left the client ID empty): copy the private key to this server:
     scp ~/.arweqah/microsoft/arweqah-platform.key $DEPLOY_USER@$PUBLIC_IP:$APP_DIR/secrets/microsoft.key
   then:  sudo chown 1000:$DEPLOY_USER $APP_DIR/secrets/microsoft.key && sudo chmod 640 $APP_DIR/secrets/microsoft.key
   and add the Web redirect URI in Azure:  https://$APP_HOST/api/auth/callback/microsoft
2. GitHub repository -> Settings -> Secrets and variables -> Actions:
     Secrets:   EC2_HOST = $PUBLIC_IP
                EC2_USER = $DEPLOY_USER
                EC2_SSH_KEY = the private key printed below (all lines, including BEGIN/END)
     Variables: APP_URL = https://$APP_HOST   (the API is also reachable at https://$API_HOST/api)
                MICROSOFT_ENABLED = true   (only after the Microsoft step is done)
   GitHub -> Settings -> Environments: create an environment named "staging".
3. Push to main. CI runs, then the deploy job builds the images, copies the compose files here and starts everything.
4. Log out and in again (docker group) before using docker by hand on this server.

-------- EC2_SSH_KEY (copy now, it is deleted from this server right after) --------
$(cat "$KEY")
-------- end of key --------
DONE
read -r -p "Press Enter after you copied the key (it will be deleted)... " _
shred -u "$KEY" "$KEY.pub"
echo "Key deleted."
