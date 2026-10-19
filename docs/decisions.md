# Decisions

Short records of choices that are not obvious from the code. Newest first.

## 2026-10-19 — Foundation

| # | Decision | Why | Revisit when |
|---|---|---|---|
| 1 | Build fully custom on NestJS + React; no Frappe/ERPNext | Product owner's choice after comparing; full control of UX and data model | — |
| 2 | Monorepo with `apps/api` and `apps/web`, each organized by modules; a small `packages/shared` for zod schemas and DTO types only | Owner wanted backend and frontend separated; the contracts package avoids defining every shape twice. Removing it later means generating types from OpenAPI instead | If the apps move to separate repositories |
| 3 | NestJS 11.2 instead of 12 | `nestjs-zod` 5.5 supports NestJS ≤ 11 | `nestjs-zod` supports 12 (also fixes the moderate js-yaml advisory via swagger 12) |
| 4 | TypeScript 5.9 | `ts-jest`, `typescript-eslint` and `@nestjs/cli` do not support 6/7 yet | Tooling supports TS 7 |
| 5 | Vitest (with SWC for decorator metadata) for API tests instead of Jest | Better Auth and its Nest integration are ESM-only; Jest cannot `require` them | — |
| 6 | `.npmrc` `legacy-peer-deps=true` | npm 10 arborist crashes (`edgesOut` of null) on Better Auth's many optional peer dependencies; peers we need are listed explicitly | npm fixes the bug |
| 7 | Better Auth with session cookies instead of the team's JWT access/refresh pattern | Owner chose Better Auth for Microsoft sign-in and 2FA; HttpOnly session cookies keep tokens out of JavaScript | — |
| 8 | Microsoft accounts link to employees by email, only inside the company tenant | Entra emails are not verified across tenants; with a single-tenant app the company controls the addresses. Boot fails if the tenant is `common`/`organizations` | Microsoft identifiers (oid) are stored on employee records |
| 9 | Dynamic roles + scoped permissions (own/team/department/branch/company) owned by `core/access`; user placement also lives there | Scopes are computed from placement; keeps the org module free of authorization logic | — |
| 10 | Out-of-scope records return 404, not 403 | Do not reveal that a record exists | — |
| 11 | RabbitMQ instead of BullMQ; delayed work in a `scheduled_jobs` table moved to the outbox when due; Redis dropped | Owner chose RabbitMQ; it has no durable delayed delivery without a plugin, and the outbox keeps events consistent with the database | Several API instances need shared rate limits → add Redis as Better Auth secondary storage |
| 12 | XState machines run in-process; state persisted as XState snapshots with an optimistic `revision` | Approvals last days; persistence and locking matter more than in-memory actors | — |
| 13 | Entities listed explicitly in `database/entities.ts`; migrations loaded only by the CLI data source | Globs loaded through `require` broke under Vitest and hid entities from type checking | — |
| 14 | Foreign keys declared on entities as constraint-only relations by entity name | `migration:generate` stays clean (no drift) without importing other modules' classes | — |
| 15 | Rate-limit and audit IP from `X-Forwarded-For`, which the edge nginx overwrites with `$remote_addr`; Express trusts only private-network proxies | Clients cannot spoof their address | — |
| 16 | `max-params` replaced by a lint rule that exempts constructors; component length limit 80 lines in `.tsx` | DI constructors legitimately take many dependencies; JSX is mostly markup | — |
| 17 | React Router 8, Vite 8, TanStack Query 5, MSW 3: latest stable releases at least two weeks old | Team rule for new projects | — |
| 18 | Hosting: AWS `me-south-1` until the Saudi region opens (expected December 2026) | Owner's choice; needs documented legal basis for personal data meanwhile | Region opens |
