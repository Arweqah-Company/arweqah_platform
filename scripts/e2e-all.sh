#!/usr/bin/env bash
# Both end-to-end suites at the same time, each on its own database (the API suite on arweqah_platform_test, the browser suite on arweqah_platform_e2e),
# so neither waits for the other. Exit code is non-zero when either fails; the log of a failed suite is shown.
# Usage: npm run test:e2e
set -u
cd "$(dirname "$0")/.."
logs=$(mktemp -d)
npx turbo run build >"$logs/build.log" 2>&1 || { tail -n 25 "$logs/build.log"; echo "e2e: build failed"; exit 1; }
npm run test:e2e:api >"$logs/api.log" 2>&1 & api=$!
npm run test:e2e:web >"$logs/web.log" 2>&1 & web=$!
failed=0
finish() { # name, pid, log
  if wait "$2"; then printf '  PASS  %s\n' "$1"; else printf '  FAIL  %s\n' "$1"; tail -n 40 "$3" | sed 's/^/        /'; failed=1; fi
}
finish "API e2e (real PostgreSQL, arweqah_platform_test)" "$api" "$logs/api.log"
finish "browser e2e (Playwright, arweqah_platform_e2e)" "$web" "$logs/web.log"
echo "logs: $logs"
exit "$failed"
