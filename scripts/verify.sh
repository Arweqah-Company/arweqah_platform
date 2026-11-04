#!/usr/bin/env bash
# The check CLAUDE.md asks for after every task: architecture, design, testing and security, each reported on its own line.
# Usage: npm run verify            everything, including both e2e suites (API and browser, in parallel)
#        npm run verify -- --quick  skips both e2e suites (use while iterating, run the full one before reporting done)
set -u
cd "$(dirname "$0")/.."
quick=0; [ "${1:-}" = "--quick" ] && quick=1
failed=0
step() { # name, command...
  local name="$1"; shift
  if "$@" >/tmp/verify-step.log 2>&1; then printf '  PASS  %s\n' "$name"; else printf '  FAIL  %s\n' "$name"; tail -n 25 /tmp/verify-step.log | sed 's/^/        /'; failed=1; fi
}
echo "Architecture"
step "folder rules, entity registry, feature registration, feature boundaries" node scripts/architecture-check.mjs
step "layer imports and limits (eslint boundaries, complexity, size)" npx turbo run lint
step "duplication under 3 %, shared code instead of copies" npm run dup
echo "Design"
step "brand tokens, logical properties, no hex, logo rules" npm run design:check
step "Arabic and English complete" npm run i18n:check
echo "Testing"
step "typecheck + build" npx turbo run typecheck build
step "unit and component tests" npx turbo run test
if [ "$quick" = 0 ]; then step "API e2e + browser e2e, at the same time on separate databases" bash scripts/e2e-all.sh; else echo "  SKIP  API e2e and browser e2e (--quick)"; fi
echo "Security"
step "secrets, headers, routes guarded, dependencies" npm run security:check
[ "$failed" = 0 ] && echo "verify: all checks passed" || echo "verify: FAILED (see above)"
exit "$failed"
