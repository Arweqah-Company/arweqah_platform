# Plan: pluggable translation and e-mail providers (FR-59, FR-60)

Status: built (FR-59…FR-62) with the additions below. Owner request 2026-10-27. Builds on FR-58 (translation while typing) and the existing e-mail sender (`core/notifications`).

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

## Additions after the first build (owner, 2026-10-27, same session)
All done and verified; each has its FR row in README §4 and a decision row.
1. **One Settings page with tabs** (translation, e-mail), shared `Tabs` component, old addresses redirect; keys stay per kind. Replaces the two separate pages in «Web» above.
2. **Notification bell opens a drop-down** (newest five, mark all read, link to the full page) — FR-61.
3. **Guide per service** — a description under each name and a «How to get the data» popup (steps and the meaning of every value) — FR-62.
4. **Sidebar:** «Page visibility» and «List management» left out of the menu for now (`hideFromMenu`), routes unchanged — decision 104.
5. **Audit log in words, by category, filter by person** and **e-mail log by category and person** — FR-63, decisions 105–106. The e-mail log categories are set by the senders, so the provider test mail is filed as «E-mail settings test».
6. **Deploy:** the `apk upgrade` image layer is rebuilt on every build (`APK_CACHE_BUST`) so Trivy sees Alpine fixes.

## E-mail templates and notification templates (owner request 2026-10-27) — FR-64, FR-65, built
Two more tabs in the Settings page: **E-mail templates** and **Notification templates**. An administrator edits every message the platform sends, in Arabic and English, and the edits are saved in the database. Same page, same tabs component, same permission pattern (one view / edit / reset key per tab).

### What is a template
- One row per message the code sends, found by a **template key** the code owns (`auth.invitation`, `ticket.created`, `ticket.reply`, `task.assigned`, `task.overdue`…). The administrator can change a message's wording, but cannot add or delete a message: the code decides when it is sent, so a template without a sender would be dead text.
- E-mail template fields (each in **Arabic and English**): subject, a short description line (the preview text shown by mail apps), the body written in a rich-text editor, and the colors (header band, button, accent) picked from the brand palette only. Notification template fields (Arabic and English): title and body (short rich text: bold, link, line break; no images, no colors, because the bell and the SMS channel show plain text).
- The default wording stays in the code (today's `noticeFor`, `taskNoticeFor` and the invitation texts become the defaults). The database row holds only what the administrator changed; «Reset to default» deletes the row. If the row is missing or broken, the default is sent, so a bad edit can never stop an e-mail.

### Variables (the owner's `@` idea)
- Each template key declares its own list of **variables** in code (a registry, like `PermissionCatalog`): name, Arabic and English description, an example value, and a resolver that is real code: `@name` = the recipient's name, `@ticketNumber`, `@deskName`, `@taskTitle`, `@link`… A variable exists only if some code fills it, so what the editor offers is exactly what the code can reflect.
- In the editor typing **`@`** opens a pick list of that template's variables (with their descriptions); choosing one inserts a **variable chip**. A variable can be written only from the list: free text such as `@foo` is not a variable and is saved as plain text.
- Saving is refused (422 `TEMPLATE_UNKNOWN_VARIABLE`) when a variable is not in the key's list, and a **required** variable (the activation link in the invitation) cannot be removed (422 `TEMPLATE_MISSING_VARIABLE`).
- Variables are replaced on the server when the message is built, in the recipient's language. Values are escaped (HTML) before they go into the body, so a ticket title cannot inject markup.

### Editor
- A rich-text editor (TipTap, `@tiptap/react` + the Mention extension; exact pinned versions at least 14 days old, recorded in decisions): bold, italic, lists, link, text direction follows the language, and the `@` mention list. Two panes in the dialog, Arabic and English (a switch above the editor), a live **preview** with example values in the chosen language, light and dark, and a **«Send me a test»** button (e-mail templates) that sends the template to the administrator's own address through the e-mail service in use.
- Output is stored as a small JSON document (the editor's own) plus a rendered HTML string; the server **sanitizes** the HTML (allow-list: p, br, strong, em, ul, ol, li, a with http/https/mailto; no scripts, styles, or event attributes) and builds the e-mail page itself (logo, band color, button color, footer) so the colors cannot break the layout. Every e-mail gets a plain-text version made from the same content.

### Storage
`message_templates`: id, kind (`email` | `notification`), key, `content` **jsonb** (per language: subject / title, preheader, body JSON, body HTML; for e-mail also the colors), `updated_by`, base-entity dates; unique `(kind, key)`. Default wording is not copied into the table. Audit: `template.saved` and `template.reset` (key and language only, never the body). New audit actions are added to the audit catalog (FR-63) in the same change.

### Where the code changes
- `core/notifications`: `TemplateRegistry` (keys, variables, defaults), `MessageTemplatesService` (list, save, reset, preview, render), a `render` step used by `LoggedMailSender`'s callers (invitation, the notification e-mail channel) and by `NotificationsService.notify` (in-app and SMS text). The ticket and task notifiers pass the template key and the variable values instead of building the text themselves; their `noticeFor` functions remain as the defaults.
- Permissions: `templates.email_view/edit/reset/test` and `templates.notification_view/edit/reset`, each with Arabic and English labels in `keys.ts`, the module's permissions file, the permissions page, page visibility (`email-templates`, `notification-templates`) and the list catalog.
- Web: two tabs in the Settings page; each tab is the shared list (table and cards, search by key description, filter by area: sign-in, tickets, tasks; row icons: edit, preview, reset) and an edit dialog with the editor.

### Tests
API e2e (FR-64, FR-65): default sent when no row; edit applied to the next e-mail / notification; unknown or missing required variable → 422; HTML sanitized; escaped values; reset; 403 per role and admin mode; audit without the body. Unit: variable parser and renderer. Web: editor `@` list, chips, preview, test-send, reset. Playwright + axe: edit a template, send a test.

### Owner decisions (2026-10-27)
1. **Colors: the brand palette only** (the seven brand colors; the editor and the band/button pickers offer nothing else, and the server refuses any other value).
2. **Who edits:** an administrator, through ordinary permission keys, so which roles may edit, reset or test can change later from the permissions page. **A second person's approval is optional and set from Settings** (a switch per tab, off at first):
   - Off: a saved edit is live at once, audited.
   - On: a save becomes a **pending change** (the row keeps the live content and a `pending_content`, `submitted_by`, `submitted_at`); the live message is still the old one. A different person who holds `templates.email_approve` / `templates.notification_approve` approves (it goes live) or rejects with a note; the submitter can never approve their own change (a second submit replaces their own pending change). The list shows «Waiting for approval», the approver gets a notification, and audit records submitted / approved / rejected (keys and language only).
   - The switch itself needs its own key (`templates.settings`) and its change is audited.
3. **SMS templates: left out for now** (no SMS provider yet); the template registry is built so an `sms` kind can be added later without changing the tabs.

Added to the plan above: keys `templates.email_approve`, `templates.notification_approve`, `templates.settings`; audit actions `template.submitted`, `template.approved`, `template.rejected` (added to the audit catalog); errors `TEMPLATE_SELF_APPROVAL` (403) and `TEMPLATE_NOTHING_PENDING` (409); a setting row `templates.require_approval` per kind, stored with the other settings.

### As built (differences from the plan above)
- The editor is TipTap with a `@` pick list; variables are stored as `{{name}}`. Notification text and titles use the same editor in plain / one-line mode.
- The e-mail templates are two: the activation invitation and `notification.email`, the frame that carries every notification sent by e-mail (its subject is the notice's title, its body the notice's text). The notice's own wording is edited in the notification templates (28: 8 tickets, 20 tasks).
- Variables that differ by language (department name, status) are passed per language when the notice is rendered.
- Approval: the switch is `template_settings.require_approval` per tab; a pending change lives in the same row (`pending`, `pending_by`, `pending_at`). **Not built yet:** notifying the approvers when a change is submitted (the list shows the state «Waiting for approval»); it needs a «people holding a permission» lookup the access module does not offer yet.
- The «send me a test» endpoint lives in `core/notifications` (it sends mail); everything else is in the new `core/templates` module.
