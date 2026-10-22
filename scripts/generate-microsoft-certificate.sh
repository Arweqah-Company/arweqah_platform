#!/usr/bin/env bash
# Creates the certificate that lets the platform sign in to Microsoft without a client secret
# (for tenants that block secrets). Upload the .crt to the app registration; keep the .key private.
# Usage: scripts/generate-microsoft-certificate.sh [output-dir]   (default: ~/.arweqah/microsoft, outside the repository)
set -euo pipefail
dir="${1:-$HOME/.arweqah/microsoft}"
mkdir -p "$dir"
chmod 700 "$dir"
key="$dir/arweqah-platform.key"
crt="$dir/arweqah-platform.crt"
if [ -e "$key" ]; then echo "Refusing to overwrite $key. Move it away first." >&2; exit 1; fi
umask 077
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 730 -subj "/CN=arweqah-platform" -keyout "$key" -out "$crt" 2>/dev/null
chmod 600 "$key"
thumbprint="$(openssl x509 -in "$crt" -noout -fingerprint -sha1 | cut -d= -f2 | tr -d ':' | tr 'A-F' 'a-f')"
expires="$(openssl x509 -in "$crt" -noout -enddate | cut -d= -f2)"
cat <<TXT
Certificate created (valid until $expires).

1. Upload this PUBLIC file in Azure: App registrations > arweqah platform > Certificates & secrets > Certificates > Upload certificate
     $crt
2. Put these lines in .env (and on the server; the key file is a secret, never commit it):
     MICROSOFT_CERT_THUMBPRINT=$thumbprint
     MICROSOFT_CERT_PRIVATE_KEY_FILE=$key
   (leave MICROSOFT_CLIENT_SECRET empty)
3. Check: npm run microsoft:check
Put a reminder before the expiry date: an expired certificate stops Microsoft sign-in.
TXT
