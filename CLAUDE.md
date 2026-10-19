# CLAUDE.md — Arweqah Platform

Context for Claude Code. Read README.md (sections 4–15) and docs/decisions.md before changing architecture.

## What this is
Internal ERP for Arweqah Alreyadah (1,000–5,000 employees, several branches). Bilingual: Arabic RTL (default) + English. The **foundation** is done (auth, roles/scopes, org, users, audit, messaging, workflow, notifications, files, web shell, CI/CD). Business modules are built **one at a time from a written description by the product owner** — never invent business rules; ask with short multiple-choice questions when the description leaves a gap.

Planned modules: attendance, leaves, requests engine, projects/tasks (Kanban + Gantt), tickets with SLA, expenses/advances/invoices tracking (no accounting, no e-invoicing in v1), payroll records + Arabic PDF payslips, dashboards, two-way Airtable / Google Sheets sync (per-field owner + conflict log).

## Talk to the owner
Replies in Arabic; code, comments, commits and README in English.

## Stack (pinned — see docs/decisions.md for why)
npm workspaces + Turborepo · NestJS 11.2 (not 12: nestjs-zod) · TypeScript 5.9 · PostgreSQL 16 + TypeORM 1.1 (migrations only) · zod 4 in `packages/shared` · Better Auth 1.7 (email+password, Microsoft Entra company tenant, TOTP 2FA, HttpOnly session cookie) · CASL 7 · XState 5 · RabbitMQ (outbox + `scheduled_jobs`, no Redis) · React 19 + Vite 8 + React Router 8 + TanStack Query 5 + Tailwind 4 + Radix · i18next · Vitest (API + web), MSW 3, Playwright + axe.
New dependencies: latest stable release at least 14 days old, exact version pinned. `.npmrc` has `legacy-peer-deps=true` (npm bug with Better Auth peers) — list needed peers explicitly.

## Commands
```bash
./scripts/setup.sh            # first time: .env with secrets, npm ci, docker compose, migrate, seed
npm run dev                   # API :3000, web :5173 (proxies /api)
npx turbo run lint typecheck build test
npm run test:e2e:api          # real PostgreSQL test DB (arweqah_platform_test)
npm run test:e2e:web          # Playwright (builds api + web, resets test DB, seeds)
npm run dup                   # jscpd, must stay < 3 %
npm run db:migration:generate --name=<Name>   # after entity changes; then review the SQL
```
Seeded admin (local): admin@example.com / Admin-Passw0rd-Dev — System Admin requires 2FA.

## Architecture rules (enforced by ESLint)
- API module = `apps/api/src/modules/<feature>/{domain,application,infrastructure,presentation}`; imports point inward only. Domain never imports application/infrastructure (`TransactionContext` lives in `common/domain`).
- `core/` = shared infrastructure (auth, access, audit, messaging, workflow, notifications, files). Other modules use their exported **application services**, never their repositories.
- Every new entity goes in `apps/api/src/database/entities.ts` (no globs). FKs to other modules' tables: constraint-only `@ManyToOne('EntityName')` so `migration:generate` stays clean.
- Permissions: each module declares `domain/<feature>.permissions.ts` (key `module.action`, allowed scopes) and registers it in `onModuleInit`. Routes use `@RequirePermission(key)`; services narrow with `ctx.filterFor(key)` + `applyScope(...)` for lists and `AbilityFactory.assertCan(ctx, key, resource)` for single records. Out-of-scope records → `NotFoundError` (404), not 403.
- Approvals = XState machine registered in `WorkflowRegistry`; durable timeouts via state `meta: { timeout: { afterMs, event } }`. Never use XState `after` timers.
- Side effects across modules: `Outbox.enqueue(topic, payload, tx)` inside the same transaction; consumers wrap work in `IdempotencyGuard.once(...)`. Audit via `events.emit(AUDIT_EVENT, ...)`.
- Request/response shapes: zod schemas + DTO types in `packages/shared/src/<feature>/`; `z.strictObject` for inputs.
- Sensitive columns (national ID, IBAN): encrypt with `FieldCipher` (AES-256-GCM); never log or audit them (audit redacts by key name).
- Web feature = `apps/web/src/features/<feature>/` with `index.ts` exporting a `FeatureModule` (lazy routes, nav item + permission, `i18n/{ar,en}.json`); add one line to `app/features.ts`. Import other features only via their `index.ts`. Lists use `shared/ui` `DataTable` (pass `error`). Brand tokens only (navy-900, gold-500…); gold is never text on white.
- Limits: complexity ≤ 10, depth ≤ 3, ≤ 4 params (constructors exempt), functions ≤ 40 lines (`.tsx` ≤ 80).

## Definition of done for a feature
Description captured as FR rows in README §4 (next free FR id; foundation used FR-01…FR-12) · API module + migration + permissions · shared schemas · web feature (ar + en) · API e2e specs named with FR ids (happy path, validation, 403 per role, out-of-scope 404, concurrency where relevant) · component tests · Playwright journey + axe · README §4/6/7/8/12 updated · `turbo run lint typecheck build test` and both e2e suites green · Conventional Commit.

## Environment notes
- Interim hosting AWS me-south-1 (Bahrain); move to the AWS Saudi region when it opens (README → Hosting).
- SMS provider not chosen yet (`LogSmsSender` placeholder). Microsoft sign-in needs the Entra app registration + tenant GUID.
- Known moderate advisory: js-yaml via @nestjs/swagger 11 (accepted until NestJS 12 upgrade).
