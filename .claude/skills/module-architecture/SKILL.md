---
name: module-architecture
description: The folder structure every API module follows (entities, DTOs, controllers, services, repositories, transformers, types, errors, messages, contracts, permissions). Use at the start and at the end of any task that adds or changes a module under apps/api/src/modules or core, to confirm the module keeps this structure.
---

# Module architecture — Arweqah Platform API

Every feature is a **module** under `apps/api/src/modules/<feature>/` and owns everything it needs. The four layers stay (they are enforced by ESLint `boundaries`: imports point inward only), and each layer is split into one folder per kind of file, so a file's place is never a guess.

```
modules/<feature>/
  <feature>.module.ts                     Nest wiring + registers the permissions in onModuleInit
  domain/                                 no Nest, no TypeORM queries, no HTTP
    entities/        <name>.entity.ts           TypeORM entities (data + invariants). Listed in database/entities.ts
    types/           <feature>.types.ts         read models, value types, enums used across layers
    errors/          <feature>.errors.ts        domain errors; the message of each error is written here, in English
    contracts/       <name>.repository.ts       abstract repositories (ports), and ports to other modules
                     <name>.port.ts
    rules/           <name>.rules.ts            pure business rules (no I/O): planning, validation, calculations
    permissions/     <feature>.permissions.ts   permission keys + allowed scopes
  application/                            use cases; depends on domain only
    services/        <name>.service.ts          orchestration, transactions, audit events, outbox
    policies/        <name>.policy.ts           who may do what (scope checks beyond the guard)
    transformers/    <name>.transformer.ts      entity/read model → DTO (and input → column values)
    messages/        <feature>.messages.ts      audit action names, notification and e-mail texts (ar/en), constants
  infrastructure/                         adapters; depends on domain
    repositories/    typeorm-<name>.repository.ts   implements the contracts
    adapters/        <name>.adapter.ts              implements ports exposed to other modules
    jobs/            <name>.job.ts                  schedulers and consumers
  presentation/                           HTTP; depends on application
    controllers/     <name>.controller.ts
    dtos/            <feature>.dtos.ts          createZodDto classes built from the schemas in packages/shared
```

## What goes where

| Need | Where | Notes |
|---|---|---|
| Request/response shapes | `packages/shared/src/<feature>/schemas.ts` (zod + DTO types) | One contract for the API and the web. `presentation/dtos` only wraps them with `createZodDto`. |
| Entity | `domain/entities` | FKs to other modules' tables: constraint-only `@ManyToOne('EntityName')`. |
| Query | `infrastructure/repositories` behind a contract in `domain/contracts` | Services never import a repository class, only the contract. |
| Cross-module need | A **port** in `domain/contracts`, implemented in the other module's `infrastructure/adapters` | Other modules use exported application services or ports, never repositories. |
| Error | `domain/errors` | Extends `NotFoundError`/`ConflictError`/`BusinessRuleError`; stable `code`. The web maps `errors.<CODE>` in i18n. |
| User-facing text sent by the server | `application/messages` | Arabic and English together; never inline in services. |
| Audit action | `application/messages/<feature>.messages.ts` constants | `AUDIT.created` instead of the literal `'employee.created'`. |
| Mapping to DTOs | `application/transformers` | Pure functions or a small injectable class; no queries in a controller. |
| Business calculation | `domain/rules` | Unit-tested without Nest or a database. |
| Permission | `domain/permissions` | Registered on module init; routes use `@RequirePermission`. |

## Rules
1. A controller only translates HTTP: validate (DTO), call one service method, return the DTO. No queries, no rules.
2. A service holds the use case: scope checks, transaction (`TransactionRunner`), audit event, outbox. It depends on contracts, never on TypeORM.
3. Domain files import nothing from application, infrastructure or presentation.
4. Sensitive columns are encrypted (`FieldCipher`) and searched by `BlindIndex`; never logged, audited or returned unmasked without `employees.view_sensitive`.
5. Every new file gets a test at the right level: rules (unit), service+repository+controller (API e2e named with FR ids).
6. Names: files `kebab-case`, one main export per file, classes `PascalCase`, no `index.ts` barrels inside a module (imports stay explicit).
7. `core/` (auth, access, audit, messaging, workflow, notifications, files) follows the same folders where a kind of file exists.
8. A module never reaches into another module's folders; only its exported services, ports and the shared package.

## Confirm in every task
At the **start** of any task that touches a module, say which module and which folder each new or changed file goes in. At the **end**, check:
- [ ] Each file is in the folder of its kind (table above); nothing new in the module root except `<feature>.module.ts`.
- [ ] No controller contains queries or rules; no service imports TypeORM; no domain file imports an outer layer.
- [ ] Errors, audit actions and texts are in `errors/` and `messages/`, not inline.
- [ ] DTO classes are in `presentation/dtos`, built from `packages/shared` schemas.
- [ ] Transformers exist for every DTO shape; repositories are behind contracts.
- [ ] The permission is declared in `domain/permissions` and registered in the module.
- [ ] `npm run architecture:check` passes (folders by kind, entity registry, feature registration) and `npx turbo run lint typecheck` is clean (the boundaries rule enforces the layer directions) and the module's e2e spec passes.
Report this checklist result in one line in the step report.
