---
name: security-check
description: Security review of the Arweqah platform after each implementation step (authentication, sessions, authorization and scopes, sensitive data, input validation, headers, web client, secrets, dependencies, audit trail). Use after every step that changes API, web, database, auth or configuration, before reporting the step as done.
---

# Security check — Arweqah Platform

The platform holds employee records, national IDs, IBANs and salaries (Saudi PDPL). Run this **after every step**, scale it to what changed, and report findings honestly. A step with an open high-severity finding is not done.

## 1. Run the automated checks
```bash
npm run security:check            # static rules: XSS sinks, eval, web-storage tokens, SQL interpolation, CORS, TLS, sensitive logging, auth flags, unguarded routes, secrets
npm run security:check -- --audit # plus npm audit on production dependencies (high+)
npm run test:e2e:api              # includes test/security.e2e-spec.ts: 401 on every route, 403 per permission, headers, CORS, 413, forged cookies
```
For a reviewed diff also run the built-in `security-review` skill. Fix every finding or explain, in the step report, why it is accepted.

## 2. Review checklist (read the changed code, not only the scripts)

**Authentication and sessions**
- No passwords anywhere (`emailAndPassword` disabled). Sign-in = Microsoft (company tenant GUID only, never `common`/`organizations`) or email + authenticator code. Sign-up disabled; no self-registration route.
- A code is required on **every** sign-in, including after Microsoft: the session stays unverified (`mfa_verified_at` null) and every route except the verification, enrollment and sign-out ones is blocked until the code is accepted.
- Code verification: generic identical error for unknown email / no authenticator / wrong code, similar response time, per-IP and per-email rate limit, lockout after 5 failures (15 min), one-time use per time step (`last_used_step`), ±1 step window, backup codes hashed and single-use.
- Enrollment links: random, single-use, expire in 72 h, stored hashed, revoked when a new invitation is issued.
- Session cookie HttpOnly, SameSite=Lax, Secure in production; deactivation revokes every session at once; deactivated users cannot sign in by any method.
- Nothing sensitive in localStorage/sessionStorage; no tokens in URLs or logs.

**Authorization**
- Every route has `@RequirePermission` (or an explicit, justified allow decorator / `// security: self-scoped` marker). Lists use `ctx.filterFor` + `applyScope`; single records `assertCan`. Out-of-scope records return **404**, never 403 (no existence leak).
- Test IDOR for every new `:id` route: another user, another unit, another company.
- Mass assignment: inputs are `z.strictObject`; the server never trusts hidden/conditional fields, `userId`, `isSystemAccount`, `isActive`, or roles from the client unless the actor holds the permission (`employees.assign_roles`).
- Privilege escalation: nobody can grant a role/permission wider than their own scope, edit their own roles, or deactivate themselves.

**Sensitive data**
- ID number, IBAN and salary are encrypted with `FieldCipher`; search/uniqueness only through the keyed hash; DTOs mask them (`sensitiveHidden`) unless the caller holds `employees.view_sensitive`.
- Never in logs, audit `changes`, error messages, notifications, emails, or the web bundle. Audit redacts by key name: check new field names are covered.
- Backups/exports/CSV: the same masking rules apply.

**Input and output**
- zod at the boundary for body, query and params; max lengths; body limit 1 MB; uploads checked by content, size and type.
- No string-built SQL; LIKE input escaped; no `any`-typed user input flowing into queries.
- Errors never expose stack traces, SQL or internal ids of other records.
- React output stays text-escaped: no `dangerouslySetInnerHTML`; `target="_blank"` has `rel="noopener noreferrer"`; redirects after sign-in only to same-origin paths.

**Platform**
- Security headers (CSP without `unsafe-eval`, frame-ancestors none, nosniff, referrer policy) and CORS limited to `CORS_ORIGINS`. Rate limit client IP comes only from the trusted proxy header.
- Outbox/consumers idempotent (`IdempotencyGuard.once`); audit event for every sensitive change (who, what, when, from where) without values of sensitive fields.
- Secrets only in env (validated by `env.schema.ts`); `.env*` stay out of git and Docker images; new env vars added to `.env.example`, `setup.sh` and CI. No default/dev credentials reachable in production (`SEED_ADMIN_TOTP_SECRET` refused when `NODE_ENV=production`).
- Dependencies: exact pinned versions at least 14 days old; `npm audit --omit=dev` clean for high/critical; dev-tool advisories are listed in `docs/decisions.md`.

## 3. Report
End each step with a short security note: checks run, findings (severity, file:line), fixes, and anything accepted with its reason. Never weaken a check or test to get a clean run.
