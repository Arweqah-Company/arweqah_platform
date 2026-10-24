#!/usr/bin/env bash
# Tasks feature guard (docs/plans/phase-3-tasks.md §11.3): files that already existed at the baseline commit may change only if
# docs/plans/phase-3-allowed-existing-changes.txt lists them, and the tasks migration may only create new tables.
# Usage: bash scripts/check-existing-untouched.sh [baseline-commit]   (default: the commit before the tasks feature)
set -u
cd "$(dirname "$0")/.."
baseline="${1:-fd8acee}"
allow_file="docs/plans/phase-3-allowed-existing-changes.txt"
failed=0

allowed() { # path
  local line
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue ;; esac
    if [ "$line" = "$1" ] || { [ "${line: -1}" = "/" ] && [[ "$1" == "$line"* ]]; }; then return 0; fi
  done <"$allow_file"
  return 1
}

echo "Existing files changed since $baseline (modified, deleted or renamed):"
changed=0
while IFS=$'\t' read -r status path rest; do
  [ -z "${status:-}" ] && continue
  [ "${status:0:1}" = "A" ] && continue
  changed=$((changed + 1))
  target="$path"; [ "${status:0:1}" = "R" ] && target="$rest"
  if allowed "$path"; then printf '  allowed   %s %s\n' "$status" "$target"; else printf '  FORBIDDEN %s %s\n' "$status" "$target"; failed=1; fi
done < <(git diff --name-status -M "$baseline")
[ "$changed" = 0 ] && echo "  none"

echo "Existing tests must stay untouched:"
tests=$(git diff --name-only -M "$baseline" -- '*.spec.ts' '*.test.ts' '*.test.tsx' 'e2e/' 'apps/api/test/' 'apps/web/test/' | head -20)
if [ -n "$tests" ]; then printf '  CHANGED %s\n' $tests; failed=1; else echo "  none changed"; fi

echo "Migrations created since $baseline touch only new tables:"
migrations=$(git ls-files --others --exclude-standard -- apps/api/src/database/migrations; git diff --name-only --diff-filter=A "$baseline" -- apps/api/src/database/migrations)
old_tables=$(grep -rhoE 'CREATE TABLE "[a-z_]+"' $(git ls-tree -r --name-only "$baseline" -- apps/api/src/database/migrations) 2>/dev/null | sed -E 's/CREATE TABLE "([a-z_]+)"/\1/' | sort -u)
for file in $migrations; do
  [ -f "$file" ] || continue
  for table in $old_tables; do
    if sed -n '/public async up/,/public async down/p' "$file" | grep -qE "(ALTER TABLE|DROP TABLE|UPDATE|DELETE FROM|INSERT INTO|TRUNCATE TABLE|TRUNCATE) \"$table\"([^_a-z]|$)"; then
      printf '  FORBIDDEN %s changes the existing table %s\n' "$file" "$table"; failed=1
    fi
  done
  printf '  checked   %s\n' "$file"
done

[ "$failed" = 0 ] && echo "check-existing-untouched: ok" || echo "check-existing-untouched: FAILED"
exit "$failed"
