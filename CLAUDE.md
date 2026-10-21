# CLAUDE.md — Arweqah Platform

Context for Claude Code. Read README.md (sections 4–15) and docs/decisions.md before changing architecture.

## What this is
Internal ERP for Arweqah Alreyadah (1,000–5,000 employees, several branches). Bilingual: Arabic RTL (default) + English. The **foundation** is done (auth, roles/scopes, org, users, audit, messaging, workflow, notifications, files, web shell, CI/CD). Business modules are built **one at a time from a written description by the product owner** — never invent business rules; ask with short multiple-choice questions when the description leaves a gap.

Planned modules: attendance, leaves, requests engine, projects/tasks (Kanban + Gantt), tickets with SLA, expenses/advances/invoices tracking (no accounting, no e-invoicing in v1), payroll records + Arabic PDF payslips, dashboards, two-way Airtable / Google Sheets sync (per-field owner + conflict log).

## Talk to the owner
Replies in Arabic; code, comments, commits and README in English.

## Stack (pinned — see docs/decisions.md for why)
npm workspaces + Turborepo · NestJS 11.2 (not 12: nestjs-zod) · TypeScript 5.9 · PostgreSQL 16 + TypeORM 1.1 (migrations only) · zod 4 in `packages/shared` · Better Auth 1.7 (passwordless: Microsoft Entra company tenant or work e-mail, always with an authenticator-app code, HttpOnly session cookie) · CASL 7 · XState 5 · RabbitMQ (outbox + `scheduled_jobs`, no Redis) · React 19 + Vite 8 + React Router 8 + TanStack Query 5 + Tailwind 4 + Radix · i18next · Vitest (API + web), MSW 3, Playwright + axe.
New dependencies: latest stable release at least 14 days old, exact version pinned. `.npmrc` has `legacy-peer-deps=true` (npm bug with Better Auth peers) — list needed peers explicitly.

## Commands
```bash
./scripts/setup.sh            # first time: .env with secrets, npm ci, docker compose, migrate, seed
npm run dev                   # API :3000, web :5173 (proxies /api)
npx turbo run lint typecheck build test
npm run test:e2e:api          # real PostgreSQL test DB (arweqah_platform_test)
npm run test:e2e:web          # Playwright (builds api + web, resets test DB, seeds)
npm run dup                   # jscpd, must stay < 3 %
npm run verify                # THE end-of-task check: architecture, design, testing, security (add -- --quick to skip API e2e while iterating)
npm run architecture:check    # folder rules, entity registry, feature registration, feature boundaries
npm run db:migration:generate --name=<Name>   # after entity changes; then review the SQL
```
Seeded admin (local): `s.magdy@arweqah.sa` (no password): sign in with Microsoft, or type the e-mail (first time: QR link by e-mail, then the code). `SEED_ADMIN_TOTP_SECRET` is an optional dev shortcut. `SEED_DEMO_ORG=true` adds a sample structure. Start Docker (`docker compose up -d`) before `npm run dev`; restart `npm run dev` after editing `.env`.

## Architecture rules (enforced by ESLint)
- API module = `apps/api/src/modules/<feature>/{domain,application,infrastructure,presentation}`, each split by kind of file (`domain/{entities,types,errors,contracts,rules,permissions}`, `application/{services,policies,transformers,messages}`, `infrastructure/{repositories,adapters,jobs}`, `presentation/{controllers,dtos}`); see the `module-architecture` skill. Imports point inward only. Domain never imports application/infrastructure (`TransactionContext` lives in `common/domain`).
- `core/` = shared infrastructure (auth, access, audit, messaging, workflow, notifications, files). Other modules use their exported **application services**, never their repositories.
- Every new entity goes in `apps/api/src/database/entities.ts` (no globs). FKs to other modules' tables: constraint-only `@ManyToOne('EntityName')` so `migration:generate` stays clean.
- Permissions: each module declares `domain/<feature>.permissions.ts` (key `module.action`, allowed scopes) and registers it in `onModuleInit`. Routes use `@RequirePermission(key)`; services narrow with `ctx.filterFor(key)` + `applyScope(...)` for lists and `AbilityFactory.assertCan(ctx, key, resource)` for single records. Out-of-scope records → `NotFoundError` (404), not 403.
- Approvals = XState machine registered in `WorkflowRegistry`; durable timeouts via state `meta: { timeout: { afterMs, event } }`. Never use XState `after` timers.
- Side effects across modules: `Outbox.enqueue(topic, payload, tx)` inside the same transaction; consumers wrap work in `IdempotencyGuard.once(...)`. Audit via `events.emit(AUDIT_EVENT, ...)`.
- Request/response shapes: zod schemas + DTO types in `packages/shared/src/<feature>/`; `z.strictObject` for inputs.
- Sensitive columns (national ID, IBAN): encrypt with `FieldCipher` (AES-256-GCM); never log or audit them (audit redacts by key name).
- Web feature = `apps/web/src/features/<feature>/` with `index.ts` exporting a `FeatureModule` (lazy routes, nav item + permission, `i18n/{ar,en}.json`); add one line to `app/features.ts`. Import other features only via their `index.ts`. Lists use `shared/ui` `DataTable` (pass `error`) with `ListToolbar`: search, a filter for every filterable attribute, and the table / cards switch; filters live in the API query for large lists. Brand tokens only (cream, ink, green, orange, beige, petrol, yellow; see the `arweqah-design-system` skill); yellow ≤ 5 % of a screen and never text; green and orange only as non-text or large text.
- **Shared code, never copies:** anything two modules or features need lives in a shared place and is imported: API → `common/` (base entity, errors, `sql-like`, `date-range`, transaction runner, field cipher), `core/`; web → `shared/ui` (components), `shared/lib` (hooks: `useListPage`, `useServerList`, `useFilters`, `useViewMode`, `fetchAllPages`, `matchesText`), `shared/data-exchange` (export / import / template). A second copy of a block is a refactor, not a commit (`npm run dup` < 3 %).
- **Every list page** is `PageHeader` + one `DataTable` whose toolbar is `ListToolbar` (search, a filter for every filterable attribute, table / cards switch) with `ExchangeButtons`: export (scope, columns, file type) on every list, import (template with the system's lists in drop-downs) on lists whose data can be filled from a file (employees, companies).
- Limits: complexity ≤ 10, depth ≤ 3, ≤ 4 params (constructors exempt), functions ≤ 40 lines (`.tsx` ≤ 80).

## Definition of done for a feature
Description captured as FR rows in README §4 (next free FR id; foundation used FR-01…FR-12) · API module + migration + permissions · shared schemas · web feature (ar + en) · API e2e specs named with FR ids (happy path, validation, 403 per role, out-of-scope 404, concurrency where relevant) · component tests · Playwright journey + axe · README §4/6/7/8/12 updated · `turbo run lint typecheck build test` and both e2e suites green · Conventional Commit.

## Start of every task (read first, in this order)
Before writing code for any task, read what is current so nothing is built on stale assumptions:
1. `docs/decisions.md` (newest first) and the sections of `README.md` the task touches: §4 requirements (FR rows), §6 ERD, §7 and §8 diagrams, §12 actors, Brand.
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
