## What
<!-- One or two sentences on what this PR changes -->

## Why
<!-- Link the task/issue, or explain the motivation -->

## How to test
1.
2.

## Checklist
**Architecture**
- [ ] Code is in the right layer for this project's track (see the README's Architecture section)
- [ ] No business logic in routes, controllers, pages or components
- [ ] Shared markup is in partials/components; shared schemas/types are defined once (`packages/shared` in monorepos)
- [ ] Third-party calls go through an adapter/gateway
- [ ] Reused base classes/helpers instead of copying similar code (`npm run dup` passes)
- [ ] Any new design pattern has a real reason and a one-line comment saying why

**Data & config**
- [ ] DB changes have a migration (no `synchronize`) and are backward compatible
- [ ] New env vars added to `.env.example`
- [ ] New endpoints have the right role checks (`@Roles()` / `@Public()`, or `requireRole` in Express)

**Security**
- [ ] New routes have auth, role and ownership checks, plus a row in the role-matrix test
- [ ] All new input validated (zod); no raw SQL string building; no `innerHTML`/`dangerouslySetInnerHTML` with user data
- [ ] No secrets in code or frontend env; new integration keys are server-side only
- [ ] Security workflow green (audit, gitleaks, Semgrep, Trivy, ZAP)

**Tests**
- [ ] Unit tests for new business rules
- [ ] API e2e spec (if backend) covers happy path, 400/401/403/404 and business-rule errors
- [ ] Playwright spec for new UI flows
- [ ] README updated if this changes the schema (ERD), a journey (flowchart/sequence), requirements, an integration (third parties) or run/deploy steps
- [ ] Commits follow Conventional Commits
