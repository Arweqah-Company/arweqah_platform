# CLAUDE.md — Arweqah Platform

Context for Claude Code. Read README.md (sections 4–15) and docs/decisions.md before changing architecture.

## What this is
Internal ERP for Arweqah Alreyadah (1,000–5,000 employees, several branches). Bilingual: Arabic RTL (default) + English. The **foundation** is done (auth, roles/scopes, org, users, audit, messaging, workflow, notifications, files, web shell, CI/CD) and so are the first business modules, **tickets** (internal tickets between departments; FR-36…FR-41) and **tasks** (my tasks, my team, matrix, table and Kanban board, self-approval, objection, reminders, archive; FR-48…FR-57, and conversations on each task: comments, replies, files, `@` mentions and a per-company matrix of who may do what; FR-66), together with platform admin mode, page visibility per role, list management (columns and filters per list), automatic roles, groups of roles and of people, a permissions page and the four message colors. Business modules are built **one at a time from a written description by the product owner** — never invent business rules; ask with short multiple-choice questions when the description leaves a gap.

Planned modules: attendance, leaves, requests engine, projects (project tasks and Gantt build on the tasks module through its ports), tickets with SLA for customers, expenses/advances/invoices tracking (no accounting, no e-invoicing in v1), payroll records + Arabic PDF payslips, dashboards, two-way Airtable / Google Sheets sync (per-field owner + conflict log).

## Talk to the owner
Replies in Arabic; code, comments, commits and README in English.

## Stack (pinned — see docs/decisions.md for why)
npm workspaces + Turborepo · NestJS 11.2 (not 12: nestjs-zod) · TypeScript 5.9 · PostgreSQL 16 + TypeORM 1.1 (migrations only) · zod 4 in `packages/shared` · Better Auth 1.7 (passwordless: Microsoft Entra company tenant or work e-mail, always with an authenticator-app code, HttpOnly session cookie) · CASL 7 · XState 5 · RabbitMQ (outbox + `scheduled_jobs`, no Redis) · React 19 + Vite 8 + React Router 8 + TanStack Query 5 + Tailwind 4 + Radix · i18next · Vitest (API + web), MSW 3, Playwright + axe.
New dependencies: latest stable release at least 14 days old, exact version pinned (`.npmrc` has `min-release-age=7`). The one exception is a fix for a high or critical advisory: take the fixed version at once, install with `npm install --min-release-age=0`, and record it in `docs/decisions.md`. `.npmrc` has `legacy-peer-deps=true` (npm bug with Better Auth peers) — list needed peers explicitly.

## Commands
```bash
./scripts/setup.sh            # first time: .env with secrets, npm ci, docker compose, migrate, seed
npm run dev                   # API :3000, web :5173 (proxies /api)
npx turbo run lint typecheck build test
npm run test:e2e             # BOTH e2e suites at the same time (scripts/e2e-all.sh): the default way to run them
npm run test:e2e:api          # real PostgreSQL test DB (arweqah_platform_test)
npm run test:e2e:web          # Playwright on its OWN database (arweqah_platform_e2e: created, migrated, reset and seeded for it)
npm run dup                   # jscpd, must stay < 3 %
npm run verify                # THE end-of-task check: architecture, design, testing, security (add -- --quick to skip API e2e while iterating)
npm run microsoft:check       # Microsoft Entra settings + does Microsoft accept the client id / secret / tenant (docs/microsoft-sign-in.md)
npm run architecture:check    # folder rules, entity registry, feature registration, feature boundaries
npm run db:migration:generate --name=<Name>   # after entity changes; then review the SQL
```
Seeded admin (local): `s.magdy@arweqah.sa` (no password): sign in with Microsoft, or type the e-mail (first time: QR link by e-mail, then the code). `SEED_ADMIN_TOTP_SECRET` is an optional dev shortcut. `SEED_DEMO_ORG=true` adds a sample structure. Start Docker (`docker compose up -d`) before `npm run dev`; restart `npm run dev` after editing `.env`.

## Architecture rules (enforced by ESLint)
- API module = `apps/api/src/modules/<feature>/{domain,application,infrastructure,presentation}`, each split by kind of file (`domain/{entities,types,errors,contracts,rules,permissions}`, `application/{services,policies,transformers,messages}`, `infrastructure/{repositories,adapters,jobs}`, `presentation/{controllers,dtos}`); see the `module-architecture` skill. Imports point inward only. Domain never imports application/infrastructure (`TransactionContext` lives in `common/domain`).
- `core/` = shared infrastructure (auth, access, audit, messaging, workflow, notifications, files). Other modules use their exported **application services**, never their repositories.
- Every new entity goes in `apps/api/src/database/entities.ts` (no globs). FKs to other modules' tables: constraint-only `@ManyToOne('EntityName')` so `migration:generate` stays clean.
- **Everything has a permission:** every page has a `view` key, every button or action its own key (including approve / reject, export, import), declared in `packages/shared/src/permissions/keys.ts` and in the module's `domain/<feature>.permissions.ts` with Arabic and English labels. Routes use `@RequirePermission(key)`; the web hides what a person lacks (`nav.permission`, `<Can permission>`, `ExchangeButtons permissions`). A feature without its keys is not done.
- Permissions: each module declares `domain/<feature>.permissions.ts` (key `module.action`, allowed scopes) and registers it in `onModuleInit`. Routes use `@RequirePermission(key)`; services narrow with `ctx.filterFor(key)` + `applyScope(...)` for lists and `AbilityFactory.assertCan(ctx, key, resource)` for single records. Out-of-scope records → `NotFoundError` (404), not 403.
- Approvals = XState machine registered in `WorkflowRegistry`; durable timeouts via state `meta: { timeout: { afterMs, event } }`. Never use XState `after` timers.
- Side effects across modules: `Outbox.enqueue(topic, payload, tx)` inside the same transaction; consumers wrap work in `IdempotencyGuard.once(...)`. Audit via `events.emit(AUDIT_EVENT, ...)`.
- Request/response shapes: zod schemas + DTO types in `packages/shared/src/<feature>/`; `z.strictObject` for inputs.
- Sensitive columns (national ID, IBAN): encrypt with `FieldCipher` (AES-256-GCM); never log or audit them (audit redacts by key name).
- Web feature = `apps/web/src/features/<feature>/` with `index.ts` exporting a `FeatureModule` (lazy routes, nav item + permission, `i18n/{ar,en}.json`); add one line to `app/features.ts`. Import other features only via their `index.ts`. Lists use `shared/ui` `DataTable` (pass `error`) with `ListToolbar`: search, a filter for every filterable attribute, and the table / cards switch; filters live in the API query for large lists. Brand tokens only, themed (components use semantic colors `text-fg`, `text-link`, `bg-primary`… and the surface tokens, never fixed text or surface colors, so the light and the dark theme both work; palette: cream, ink, green, orange, beige, petrol, yellow; see the `arweqah-design-system` skill); yellow ≤ 5 % of a screen and never text; green and orange only as non-text or large text.
- **Shared code, never copies:** anything two modules or features need lives in a shared place and is imported: API → `common/` (base entity, errors, `sql-like`, `date-range`, transaction runner, field cipher), `core/`; web → `shared/ui` (components), `shared/lib` (hooks: `useListPage`, `useServerList`, `useFilters`, `useViewMode`, `fetchAllPages`, `matchesText`), `shared/data-exchange` (export / import / template). A second copy of a block is a refactor, not a commit (`npm run dup` < 3 %).
- **Every list page** is `PageHeader` + one `DataTable` with an `actions` column last (every action on the row, each a `RowAction` icon, never a word) and `onRowClick` (a click anywhere on the row opens its view: page, dialog or a `DetailsDialog`), whose toolbar is `ListToolbar` (search, a filter for every filterable attribute, table / cards switch) with `ExchangeButtons`: export (scope, columns, file type) on every list, import (template with the system's lists in drop-downs) on lists whose data can be filled from a file (employees, companies).
- **Data access:** simple reads and writes (by key, save, delete, plain filters) go through TypeORM (repositories / `managerOf(tx)`). Only complex queries are raw SQL: unions, set-based `INSERT … ON CONFLICT … RETURNING`, `DELETE … USING`, CTEs, recursive or closure-table walks, scope filters over many rows, reports. Raw SQL lives only in `infrastructure/repositories`, always parameterized (`$1`, never string-built values), and has an API e2e test on the real PostgreSQL. A complex query is not a reason to skip TypeORM for the simple ones next to it.
- Limits: complexity ≤ 10, depth ≤ 3, ≤ 4 params (constructors exempt), functions ≤ 40 lines (`.tsx` ≤ 80).

## Standing rules for every feature and task (owner's, always apply; a task that breaks one is not done)
1. **Every table has more than one view:** the same list offers table + cards, plus a board / chart where the data has a natural one (tickets and tasks: Kanban; org: chart, icicle). One switch (`ViewSwitch`), remembered; never two switches on one list.
2. **Filter on everything that can filter:** every column or attribute a person could narrow by (status, owner, unit, type, dates, flags, yes/no) has a filter in `ListToolbar`; filters that touch many rows live in the API query.
3. **Search is always there:** every list has the search box, and the API searches every text column the table shows.
4. **Import and export:** every list has `ExchangeButtons` export (scope, columns, file type); every list whose records can be created from a file has the import (template with drop-downs). A list without import says why in its plan row.
5. **A page is registered in permissions in full:** its `view` key, one key per button and action (create, edit, delete, approve, export, import…), each with Arabic and English labels, in `keys.ts`, the module's `<feature>.permissions.ts`, the permissions page, page visibility (`pages/schemas.ts`) and the list catalog (`lists/catalog.ts`).
6. **One design structure everywhere:** same page skeleton (`PageHeader` + `DataTable`/`ListToolbar`, dialogs for add / edit, `DetailsDialog` for records without a page), same shared components and brand tokens, light and dark, RTL and LTR; no one-off markup.
7. **One code structure and architecture everywhere:** API modules and web features follow the folders in the `module-architecture` skill and "Architecture rules" above, shared code in shared places; new modules copy the structure of tickets / tasks, never invent another.
8. **Quality gates on every task:** clean code (`clean-code` skill, limits enforced by ESLint, duplication < 3 %), security (`security-check`, `npm run security:check`, scope and permission tests), and tests: API e2e named with FR ids (happy path, validation, 403 per role, out-of-scope 404), component tests, Playwright + axe; `npm run verify` and both e2e suites green before saying done.

9. **Every new feature plan includes its welcome-tour part by default** (`docs/plans/welcome-tour.md`), without the owner having to ask: each page the feature adds gets a step (key in `packages/shared/src/tour/catalog.ts` with its permission or page key, `data-tour` on the element, `tour.<key>.{title,body}` in ar + en, a Playwright check that the step shows for the right role), and the plan's phases list it. A plan without its tour row is incomplete.
10. **Every service added to Settings that needs keys or credentials ships its «how do I get these values» guide** (e-mail, translation, Turnstile and anything later), without the owner having to ask: a help window with numbered steps and a meaning for each field (`help.providers.<key>.{summary,steps,fields}`), a short hint under each field (`hints.<key>.<field>`), and the guide button both on the row and inside the edit dialog, in ar + en, in the same change that adds the provider to `PROVIDER_FIELDS`. A provider without its guide is incomplete.
11. **Every new table goes into `docs/database-design.md`** in the same change as its migration, without the owner having to ask: its columns (with `PK` / `FK` / `UK`) in the mermaid ER diagram of its area (or a new area), its relations, and one row in the «What each table does» tables (a new `*_translations` table shares the row of its parent). A column that adds a relation updates the diagram too. A migration without its row in that file is incomplete.
12. **Every task is written in the plan before it is built:** a task the owner asks for that is not already written in the plan files (`docs/plans/<phase>.md` of the module it belongs to) is first written there in full detail (what, why, the rule, the screens, the API, the data, the tests), and only then built; what was done and what is planned are marked apart. A task is not done while the plan file does not describe it.
13. **The dev database is brought up to date after every task**, without the owner having to ask: at the end of any task that changed code, run `npm run db:migrate` and then `npm run db:seed` against the development database (`arweqah_platform`, not the test one) and say in the report that both ran (and what they applied). The running dev API uses the new entities at once; a pending migration makes list queries fail and rows disappear. Both commands are idempotent. A task is not done while the dev database lags behind the code.

14. **Anything that asks for a file or a picture uses `FileDropzone`** (`shared/ui`), without the owner having to ask: employee photo, files on tickets and tasks, list import and every upload added later. It is a soft dashed box (`border-dashed`, `petrol-50` fill) with the upload icon, «Drop the file here, or click to browse» and the size limit («Up to N MB»), checks type and size itself (a drop ignores `accept`), shows its error under the box, locks while uploading, and works with the keyboard. Never a bare `<input type="file">`, a button that opens the picker, or a copy of the box; a short box for composers is the `compact` prop, not a second component. A screen with an upload that does not use it is not done.

15. **The API e2e suite and Playwright always run at the same time, each on its own database**, without the owner having to ask: `npm run test:e2e` (or `npm run verify`, which calls it) starts both together to save time. The API suite uses `arweqah_platform_test`; Playwright uses `arweqah_platform_e2e` (`E2E_DB_NAME` in `e2e/support/fixtures.ts`, created and migrated by `npm run db:prepare:e2e`, emptied and re-seeded by its global setup). Never point the two at the same database, never run one after the other when both are needed, and a new suite or script that writes to a database gets its own `*_test` / `*_e2e` one. Both must be green before saying done.

## Definition of done for a feature
Description captured as FR rows in README §4 (next free FR id; foundation used FR-01…FR-12) · API module + migration + permissions · shared schemas · web feature (ar + en) · API e2e specs named with FR ids (happy path, validation, 403 per role, out-of-scope 404, concurrency where relevant) · component tests · Playwright journey + axe · welcome-tour steps for its pages (standing rule 9) · README §4/6/7/8/12 updated · `docs/database-design.md` updated for every new table (standing rule 11) · `turbo run lint typecheck build test` and both e2e suites green · Conventional Commit.

## Start of every task (read first, in this order)
Before writing code for any task, read what is current so nothing is built on stale assumptions:
1. `docs/decisions.md` (newest first) and the sections of `README.md` the task touches: §4 requirements (FR rows), §6 ERD (points to `docs/database-design.md`), §7 and §8 diagrams, §12 actors, Brand; `docs/database-design.md` when the task touches tables.
2. The last entries of «سجل التنفيذ (ما تم)» at the end of `docs/plans/phase-1-auth-employees.md` (what was done most recently and what remains).
3. Invoke `arweqah-design-system` before any UI work and `module-architecture` before any API module work (the skills below), and follow them as written.
When your work changes behaviour, screens, tables, flows, permissions, env vars or design rules, update the same files in the same task: README (§4/6/7/8/12, Brand, Run), `docs/decisions.md`, the plan log, and the design-system skill. A task is not done while those files disagree with the code.

## Project skills (run automatically, after every step)
Skills live in `.claude/skills/`. **At the end of every implementation step (and every session or task that changed code, text or UI), before reporting it done**, invoke these with the Skill tool, run their commands, and fix what they find:
- `module-architecture` — **start and end of every task that adds or changes a module**: say where each new file goes, then confirm the checklist.
- `clean-code` — any code change.
- `security-check` — any change to API, web, database, auth or configuration. Run `npm run security:check`.
- `arweqah-design-system` — any change under `apps/web`. Run `npm run design:check`, then verify the real screens (RTL + LTR, desktop + phone, axe) as the skill describes.
- `i18n-review` — any change to text, i18n files, seeds or error messages. Run `npm run i18n:check`.
**After every feature, append a dated entry under «سجل التنفيذ (ما تم)» at the end of `docs/plans/phase-1-auth-employees.md`** (what was done, where, how it was verified), in Arabic.
**Verify after every task, before saying it is done: `npm run verify`.** It reports four groups, and your report repeats them in four lines:
- **Architecture:** `architecture:check` (module folders by kind, entity registry, feature registration, no cross-feature internals), eslint `boundaries`/limits, duplication < 3 %.
- **Design:** `design:check`, `i18n:check`, and for UI changes the real screens (RTL + LTR, desktop + phone, axe).
- **Testing:** typecheck, build, unit/component tests, API e2e (real PostgreSQL); new behaviour has tests named with its FR id.
- **Security:** `security:check`, plus the `security-check` skill's review of the change (auth, scopes, sensitive data, input validation, file handling).
End each step report with one line per skill and one per group above: what ran, what was found, what was fixed. Never skip them to save time and never weaken a check to pass.

## Environment notes
- Interim hosting AWS me-south-1 (Bahrain); move to the AWS Saudi region when it opens (README → Hosting).
- SMS provider not chosen yet (`LogSmsSender` placeholder). Microsoft sign-in needs the Entra app registration + tenant GUID.
- Known moderate advisory: js-yaml via @nestjs/swagger 11 (accepted until NestJS 12 upgrade).
