# Security

## Reporting a vulnerability

Email **security@arweqah.sa** (replace with the team's real address) with steps to reproduce. Do not open a public issue. We acknowledge within 2 working days.

## Threat model

**Assets:** employee personal data (names, contacts, national IDs, bank details in later modules), salaries and payments, organization structure, approval decisions, uploaded documents, session cookies, integration credentials (Microsoft, SES, S3, Airtable).

**Actors:** anonymous internet users; employees; managers and HR with scoped permissions; system admins; a malicious insider in any of these roles; a compromised third party.

**Entry points:** `/api/auth/*` (Better Auth), every `/api/*` route, file uploads, RabbitMQ consumers, the admin pages, the CI/CD pipeline.

| Top risk | Control | Test |
|---|---|---|
| A manager reads or edits employees outside their department (IDOR) | Scoped permissions; records out of scope answer 404; list queries filtered by `applyScope` | `users.e2e-spec.ts` (department-scoped viewer, manager creating elsewhere), `access.spec.ts` |
| A user grants themselves more power | No self role change or self deactivation; roles accept only catalog keys and allowed scopes; unknown body fields rejected | `users.e2e-spec.ts`, `access.e2e-spec.ts` |
| Account takeover of an administrator | 2FA mandatory for System Admin; sign-in rate limit 5/min per IP; generic errors; sessions end on deactivation | `auth.e2e-spec.ts`, `access.e2e-spec.ts` |
| Someone outside the company signs in with Microsoft | Tenant GUID required (common/organizations rejected at boot); sign-up disabled | `env.schema.spec.ts` |
| Leaking national IDs or secrets | AES-256-GCM field encryption; audit redaction; no secrets in the web bundle; HttpOnly cookies only | `field-cipher.spec.ts`, `audit.service.spec.ts`, `e2e/tests/security/access.spec.ts` |
| Malicious upload | Type checked by file content (PDF/PNG/JPEG), 10 MB limit, random storage keys, private bucket, owner-only access | `platform.e2e-spec.ts` (Files) |
| Duplicate approvals or replayed messages | Optimistic locking on workflows; idempotent consumers keyed by message id | `platform.e2e-spec.ts` |

## Controls in place (OWASP Top 10)

- **A01** Global auth guard (Better Auth) then `PermissionsGuard` on every route; `@RequirePermission` + scope checks in services; Swagger off in production.
- **A02** Passwords hashed by Better Auth (scrypt); TLS with HSTS at the edge; secrets validated at boot (min length, key size); field encryption for sensitive columns.
- **A03** TypeORM parameters only (the two constant SQL strings are parameterized and commented); zod strict schemas; LIKE wildcards escaped; React escapes output, `dangerouslySetInnerHTML` banned by lint.
- **A04** Rate limits on sign-in and 2FA; page size ≤ 100; body ≤ 1 MB; uploads ≤ 10 MB.
- **A05** helmet with `default-src 'none'` on the API and a strict CSP in nginx for the web; CORS allowlist; no `X-Powered-By`; database and RabbitMQ not published; containers run as non-root.
- **A06** Lockfile + `npm ci`; Dependabot weekly; `npm audit` gate (high); Trivy on images and repository.
- **A07** Session cookie `HttpOnly; Secure; SameSite=Lax`, 12 h expiry; 2FA; deactivation revokes all sessions.
- **A08** Actions pinned to versions; images scanned before deploy; deploy waits for CI.
- **A09** Audit log for sign-ins, user, role and organization changes; failures logged without secrets or full personal data.
- **A10** The server never fetches user-supplied URLs; notification links are in-app paths only.

## Running the security checks locally

```bash
npm run test:e2e:api                                  # includes test/security.e2e-spec.ts
npm run test:e2e:web                                  # Playwright security specs + axe
npm audit --omit=dev --audit-level=high
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.18.4 git --source=/repo -c /repo/.gitleaks.toml
docker run --rm -v "$PWD:/src" -w /src semgrep/semgrep semgrep scan --config p/owasp-top-ten --config p/nodejs --config p/typescript --config p/secrets --error
trivy fs --scanners vuln,misconfig,secret --severity HIGH,CRITICAL .
docker run --rm --network host ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://localhost:4173 -c .zap/rules.tsv
```

## Scan results at handover (foundation)

| Check | Result |
|---|---|
| API security e2e suite | Pass (all non-public routes 401, all permission routes 403, headers, CORS, 413, forged cookies) |
| npm audit (production, high) | Pass. 2 moderate in `js-yaml` via `@nestjs/swagger` 11; fixed only in swagger 12, which needs NestJS 12. Accepted until `nestjs-zod` supports NestJS 12; Swagger is disabled in production |
| gitleaks | Pass. Test fixtures and CI-only values allowlisted in `.gitleaks.toml` with reasons |
| Semgrep, Trivy, ZAP | Configured in `.github/workflows/security.yml`; not run in the build sandbox (no network to semgrep.dev, no Docker). First CI run is the baseline |

## Scan tuning

- `.zap/rules.tsv`: `10096` (timestamp disclosure) ignored: hashed asset names.
- `.gitleaks.toml`: fake passwords under `apps/api/test/` and `e2e/tests/`; CI-only auth secret and encryption key.
- ESLint `security/detect-object-injection` off (noisy with typed lookups); `detect-non-literal-fs-filename` disabled on three lines in `LocalFileStorage`, whose paths are confined to the storage root.
