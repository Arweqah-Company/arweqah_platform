# Sign in with Microsoft: setup and go-live check

Microsoft sign-in is the last open item of phase 1. The code is finished; it needs an app registration in the company's Microsoft Entra ID (Azure) and three values in `.env`. After Microsoft, the person still enters the code of their authenticator app (and links it first if they never did).

## 1. Register the app (IT or a tenant admin, about 10 minutes)

Azure portal → **Microsoft Entra ID** → **App registrations** → **New registration**.

| Field | Value |
|---|---|
| Name | Arweqah Platform |
| Supported account types | **Accounts in this organizational directory only** (single tenant) |
| Redirect URI | platform **Web**: `https://<platform-domain>/api/auth/callback/microsoft` |

For a local test add a second redirect URI of type Web: `http://localhost:5173/api/auth/callback/microsoft`. (Entra accepts `http://localhost` for development.)

After creating it, on **Overview** copy:

- **Application (client) ID** → `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** → `MICROSOFT_TENANT_ID` (the GUID; `common`, `organizations` and `consumers` are refused at start-up)

**Certificates & secrets → New client secret**: copy the secret **Value** at once (it is shown once, not the Secret ID) → `MICROSOFT_CLIENT_SECRET`. Put a reminder before its expiry date (24 months at most); an expired secret turns the button into an error.

**API permissions**: the default delegated `User.Read` is enough (openid, profile and email come with it). No admin consent is needed.

**Token configuration** (only if sign-in later says the account has no e-mail): add the optional claim `email` to the ID token. The platform also falls back to the user principal name.

### If the tenant blocks client secrets: use a certificate

Message "Client secrets are blocked by a tenant-wide policy" means the tenant admin forbids secrets. Do not ask for the policy to be lifted; use a certificate instead (no secret exists at all):

```bash
./scripts/generate-microsoft-certificate.sh
```

It creates a self-signed certificate (730 days) in `~/.arweqah/microsoft/`, outside the repository, and prints the thumbprint and the `.env` lines. Then in Azure: **Certificates & secrets → Certificates → Upload certificate**, choose the **`.crt`** file (public; never upload the `.key`). Leave `MICROSOFT_CLIENT_SECRET` empty and set `MICROSOFT_CERT_THUMBPRINT` and `MICROSOFT_CERT_PRIVATE_KEY_FILE` (or `MICROSOFT_CERT_PRIVATE_KEY` with `\n` for line breaks, for hosts without files). Set both a secret and a certificate and the API refuses to start.

The private key is a secret: keep it out of git and chat, `chmod 600`, and generate a new certificate before the expiry date (add the new one in Azure first, then switch `.env`, then delete the old one). Alternative: ask the tenant admin for an app-management-policy exemption for this app and use a secret.

## 2. Put the values in `.env` (and on the server)

```
APP_URL=https://<platform-domain>          # locally: http://localhost:5173
API_URL=https://<platform-domain>          # same as APP_URL: the browser reaches the API through the web app
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<secret value>
MICROSOFT_TENANT_ID=<Directory (tenant) ID>
```

Restart the API (`npm run dev`, or redeploy). In production also set the GitHub variable `MICROSOFT_ENABLED` as the deploy workflow expects.

## 3. Check it before trying the button

```bash
npm run microsoft:check
```

It checks the values, that the tenant exists, and that the client id and the secret or certificate are accepted by Microsoft (a token request that needs no user), and prints the exact redirect URI to register. It explains the usual Microsoft error codes (wrong secret, expired secret, app not in this tenant, tenant not found).

## 4. Try it (go-live checklist)

1. Open `/login` and press **الدخول بواسطة Microsoft**; sign in with `s.magdy@arweqah.sa` (the seeded administrator; the Entra account's e-mail must equal the employee's work e-mail).
2. First time: the platform links the Microsoft account to the employee by e-mail and sends you to the QR page: scan it, enter the first code, keep the backup codes.
3. Sign out and in again with Microsoft: you land on the code page and enter the app's code.
4. Try an account that is **not** an employee: it is refused with a generic message and no account is created (`disableSignUp`).
5. Try an account from another company's tenant: refused (single tenant).
6. Deactivate an employee: their next Microsoft sign-in is refused and their sessions end.

## 5. If it fails

| Symptom | Likely cause |
|---|---|
| `AADSTS700027` | The certificate is not uploaded in Azure, or the thumbprint or key in `.env` is not the uploaded one |
| Microsoft page says `AADSTS50011` (reply URL mismatch) | The redirect URI in Entra is not exactly `<API_URL>/api/auth/callback/microsoft` (scheme, host, port, path) |
| `AADSTS700016` or `AADSTS90002` | Wrong client id or tenant id: run `npm run microsoft:check` |
| `AADSTS7000215` / `AADSTS7000222` | Wrong or expired client secret |
| `AADSTS50020` or "user account does not exist in tenant" | The person signs in with an account outside the company tenant |
| Back on the login page with an error after Microsoft | There is no employee whose work e-mail matches the Microsoft account's e-mail, or the account is deactivated |
| The button shows "not set up yet" | `MICROSOFT_*` are empty or the API was not restarted |

Related: `docs/decisions.md` (8, 19), README §7 and §8 (Microsoft sign-in flow), `apps/api/src/core/auth/infrastructure/better-auth.factory.ts`.
