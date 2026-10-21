---
name: clean-code
description: Write and review code to the Arweqah Platform's quality rules (layer boundaries, complexity, size, naming, duplication, security, tests). Use when writing or changing any API or web code, refactoring, reviewing a diff, or before finishing a feature.
---

# Clean code — Arweqah Platform

The rules below are enforced by ESLint/CI where marked **[enforced]**. The rest are review criteria. Read `CLAUDE.md` for the full architecture rules.

## Limits [enforced]
- Cyclomatic complexity ≤ 10, nesting depth ≤ 3, ≤ 4 parameters (constructors exempt; use an options object), functions ≤ 40 lines (`.tsx` ≤ 80).
- No `any`, no unused variables (prefix `_` for ignored args).
- Duplication < 3 % (`npm run dup`). Extract before copying a third time.
- Complexity or length hitting a limit means the function does two things: split by responsibility, do not golf the code.

## Architecture [enforced]
- API: `modules/<feature>/{domain,application,infrastructure,presentation}`. Imports point inward only. Domain imports nothing from the other layers. Other modules use exported **application services**, never repositories or entities directly.
- Web: one folder per feature with `index.ts` exporting a `FeatureModule`. Import other features only through their `index.ts`. Components use hooks, hooks use `apiClient`.
- Request/response shapes are zod schemas and DTO types in `packages/shared`. Inputs use `z.strictObject`. Never redefine a shape in the API or web.

## Design principles
- **Single responsibility:** a class or function has one reason to change. Controllers only translate HTTP; services hold rules; repositories hold queries.
- **Depend on abstractions:** application code depends on abstract repositories/providers, infrastructure implements them.
- **Names say intent:** `assertCanAssignRole`, not `check`. Booleans read as questions (`isActive`, `hasMedicalInsurance`). No abbreviations except domain ones (`org`, `id`).
- **Small, early-return functions;** no flag arguments; no nested ternaries; no magic numbers (name constants such as `INVITE_TTL_HOURS`).
- **Comments explain why**, not what. Delete dead code and commented-out code. No TODOs without an issue.
- **Errors:** throw domain errors (`NotFoundError`, `BusinessRuleError`), never strings. Out-of-scope records are `NotFoundError` (404), not 403.
- **Immutability by default;** no mutation of inputs; no shared mutable module state.

## Data and security
- Migrations only (`npm run db:migration:generate`), SQL reviewed. Every new entity goes in `database/entities.ts`. FKs to other modules: constraint-only `@ManyToOne('EntityName')`.
- Sensitive fields (national ID, IBAN, salary): encrypt with `FieldCipher`; never log or audit them; search through a hash column.
- Permissions: declare in `domain/<feature>.permissions.ts`, guard routes with `@RequirePermission`, narrow lists with `ctx.filterFor` + `applyScope`, single records with `assertCan`.
- Cross-module side effects go through `Outbox.enqueue` in the same transaction; consumers use `IdempotencyGuard.once`. Audit with `events.emit(AUDIT_EVENT, …)`.
- Validate at the boundary only (zod). Trust nothing from the client, including hidden fields; the API is the final authority.
- No secrets in code, logs or the web bundle.

## Web
- Brand tokens only (see the `arweqah-design-system` skill). No hex values or inline styles.
- Lists use `DataTable` and pass `error`. Forms use react-hook-form + the shared zod schema.
- All text through i18n (see `i18n-review`). Logical CSS properties for RTL.
- Every interactive element is keyboard reachable and labelled (axe must stay clean).

## Tests (part of "done")
- API e2e specs named with FR ids: happy path, validation (400/422), 403 per role, out-of-scope 404, concurrency where relevant. Real PostgreSQL, no mocking of the database.
- Component tests for non-trivial UI; Playwright journey + axe per feature.
- Test behavior through the public API, not internals. One reason to fail per test.

## Before finishing
`npx turbo run lint typecheck build test`, `npm run test:e2e:api`, `npm run test:e2e:web`, `npm run dup`, `npm run i18n:check`. Report failures as they are; never weaken a rule or test to pass.
