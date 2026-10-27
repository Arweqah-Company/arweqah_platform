# Plan: pluggable translation and e-mail providers (FR-59, FR-60)

Status: plan, not built. Owner request 2026-10-27. Builds on FR-58 (translation while typing) and the existing e-mail sender (`core/notifications`).

## Goal
An administrator picks, in System administration, which provider sends e-mail and which one translates. Keys and settings live in the database, not in `.env`. A provider can be switched on only with complete data. Each provider can be tried from the page before it is relied on.

## Providers
| Kind | Provider key | Package | Required data |
|---|---|---|---|
| translation | `aws` | `@aws-sdk/client-translate` (already in) | access key id, secret key, region |
| translation | `google` | `@google-cloud/translate` (v3 REST client) | project id, service-account JSON (client e-mail + private key), location (default `global`) |
| translation | `azure` | `@azure-rest/ai-translation-text` | key, region, endpoint (default global endpoint) |
| email | `smtp` | `nodemailer` (already in) | host, port, secure, user, password, from |
| email | `ses` | `@aws-sdk/client-sesv2` | access key id, secret, region, from |
| email | `sendgrid` | `@sendgrid/mail` | api key, from |
| email | `graph` (Microsoft 365) | plain `fetch`, client-credentials against the existing Entra tenant (no new package) | tenant id, client id, client secret, sender mailbox |

The e-mail list is a proposal (the owner named none): SMTP is today's behaviour, SES is where we host, Graph reuses the Entra tenant. Adding a provider later = one strategy class + one zod schema + one catalog row.

## Design

### Strategy pattern
- `Translator` contract stays (`arabicToEnglish`). One strategy class per provider: `AwsTranslator` (exists), `GoogleTranslator`, `AzureTranslator`. `TranslatorResolver` returns the strategy for the **active** translation provider (built from the stored config, cached in memory, cache dropped when the row changes).
- `MailSender` contract stays. Strategies `SmtpMailTransport`, `SesMailTransport`, `GraphMailTransport` behind a `MailTransport` contract; `LoggedMailSender` (e-mail log decorator) asks `MailTransportResolver` for the active one.
- No provider active in the database → fall back to what `.env` gives today (SMTP vars, `TRANSLATE_AWS_*`) so nothing breaks on deploy; the page shows "using server settings".

### Storage
One shared table `integration_providers` (new `core/integrations` module owns it; translation and notifications read it through its exported service, never the repository):

| Column | Notes |
|---|---|
| id, created_at, updated_at, updated_by | base entity |
| kind | `translation` \| `email` |
| provider_key | `aws` \| `google` \| `azure` \| `smtp` \| `ses` \| `graph` |
| config | **jsonb**: the provider's fields; every secret field is encrypted with `FieldCipher` inside the json (the owner's json column, with the project rule for sensitive values) |
| status | `draft` \| `ready` (all required fields filled) |
| config_hash | hash of the plain config; changes whenever the data changes |
| verified_hash, verified_at | hash that last passed a test; `verified_hash = config_hash` means "tested with this exact data" |
| is_active | at most one active row per kind (partial unique index on `(kind) WHERE is_active`) |

Unique `(kind, provider_key)`: one row per provider, so switching never loses another provider's saved data.

### Rules (server enforced, `domain/rules`)
1. Required fields per provider are one zod schema each (`packages/shared/src/integrations/`, discriminated by `providerKey`). **Activate** (the "confirm") is refused with 422 `PROVIDER_INCOMPLETE` while any required field is empty; the web disables the button and shows which field is missing.
2. **Test** works on a draft or saved provider using the data in the form (not only saved data): translation → the two-box popup; e-mail → a test message to any address. A test never changes the active provider.
3. Editing any field changes `config_hash`, so an earlier test no longer counts.
4. **Activation of both kinds needs a passed test of the current data** (owner decision 2026-10-27): `verified_hash = config_hash`, else 422 `PROVIDER_NOT_TESTED`.
5. Secrets are never returned: the API sends `{ set: true }` per secret field; sending a blank secret on save keeps the stored one. Never logged; audit redacts by key name; test errors are shown but trimmed of the secret.
6. Deactivating or switching: switch is one transaction (old off, new on). Deleting the active provider is refused.

### API (`core/integrations`, admin mode, own permission keys)
- `GET /integrations/:kind` → catalog (providers, required fields, status, verified, active).
- `PUT /integrations/:kind/:providerKey` → save data (draft/ready).
- `POST /integrations/:kind/:providerKey/test` → body: the form data (optional) + test input; translation: `{ text }` → `{ translation }`; e-mail: `{ to }` → sent or the provider's error.
- `POST /integrations/:kind/:providerKey/activate`, `POST /integrations/:kind/deactivate`.
- Test rate limit (10 a minute per admin). Audit: saved, tested (ok / failed), activated.
- Permissions (each with Arabic and English labels, in `keys.ts`, `integrations.permissions.ts`, permissions page, page visibility): `integrations.translation.view|edit|test|activate`, `integrations.email.view|edit|test|activate`.

### Web (`features/integrations`, two pages in the administration menu, both `requiresAdminMode`)
- One page «Settings» `/service-settings` (updated 2026-10-27) with a tab for translation and one for e-mail (`?tab=`), both `requiresAdminMode`; the old addresses redirect. Each tab is the shared `ProvidersPage` driven by the catalog (no per-provider copies); a tab shows only for who holds that kind's view key. Each row also has a guide icon (FR-62).
- Page = `PageHeader` + provider cards (and a table view via `ViewSwitch`, remembered): name, active badge, status (incomplete / ready / tested), last test, row actions (edit, test, activate) as `RowAction` icons; row click opens the edit dialog. Search by name; filter by status and active. Export/import: not offered, the rows hold secrets (stated in the FR row).
- Edit dialog: fields from the catalog, secrets as password inputs with "saved" placeholder, live validation (`useLiveError`), save button always available, **"Activate" disabled until the data is complete** with the list of what is missing.
- **Translation test popup:** two inputs, Arabic and English; typing Arabic (700 ms debounce) calls the test endpoint with the form's data and fills the English; failures appear under the box in an `Alert` with the provider's message.
- **E-mail test popup:** "send to" address (any), button sends, result alert (sent / provider error).
- Light and dark, RTL and LTR, phone; `i18n` ar + en; error codes mapped in `errors.*`.

## Build order
1. **Shared + DB:** zod schemas and catalog in `packages/shared`, entity + migration, `FieldCipher` use, rules + unit tests.
2. **`core/integrations`:** repository, service (save, test orchestration, activate), controller, permissions, audit, e2e FR-59/FR-60.
3. **Translation strategies:** Google and Azure adapters, resolver, move FR-58 to the resolver (env AWS stays the fallback). Adapter tests with the SDKs faked; one manual live check per provider.
4. **E-mail strategies:** SMTP / SES / Graph transports, resolver in `LoggedMailSender`, fallback to env SMTP; keep the e-mail log unchanged.
5. **Web:** shared page, dialogs, the two test popups, nav, page visibility, list catalog, i18n; component tests; Playwright journey + axe.
6. **Docs:** README (§4 FR-59/60, §6 ERD, §7/§8 flow, §12 actors, integrations table, Run), `docs/decisions.md` (new decision rows), design-system skill (provider card), plan log entry in Arabic.
7. **Verify:** `npm run verify`, both e2e suites; deploy: nothing to add to the server `.env` any more (admin enters keys in the page).

New packages: exact versions, at least 14 days old (`@google-cloud/translate`, `@azure-rest/ai-translation-text`, `@aws-sdk/client-sesv2` aligned with the other AWS clients); run `npm audit` after install.

## Tests (named with FR ids)
- API e2e: happy path per kind; incomplete → 422 on activate; test with unsaved data; e-mail activation without a passed test → 422; edit resets verified; one active per kind (race); secrets never in responses, audit or logs; 403 per role; non-admin-mode 403; fallback to env when nothing is active.
- Unit: field schemas, hash and verified rule, each strategy with a faked SDK / transport (success, provider error mapped to `TRANSLATION_UNAVAILABLE` / `EMAIL_DELIVERY_FAILED`).
- Web: dialog validation, activate disabled until complete, popup live translation + error, secret placeholder behaviour; Playwright journey per page + axe.

## Decisions (owner, 2026-10-27)
1. Activation needs a passed test, for translation and e-mail.
2. SendGrid is added to the e-mail providers.
3. Sign-in (Better Auth, Microsoft Entra, authenticator code) is untouched. Provider keys can also be entered from the dashboard; Google uses the service-account JSON.
4. `.env` values stay as the fallback when no provider is active; they are not copied into the database.
