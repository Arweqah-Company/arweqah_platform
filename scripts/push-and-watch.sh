#!/usr/bin/env bash
# Push, watch CI then Deploy; when CI fails, let Claude fix it, commit, and push again.
# Stops (exit 2) when the fix needs something only a person can do (secret, GitHub setting, server access).
# Usage: ./scripts/push-and-watch.sh        (needs: gh auth login, claude CLI)
set -euo pipefail

MAX_ATTEMPTS=3
CI_WORKFLOW="ci.yml"
DEPLOY_WORKFLOW="deploy.yml"
FAILURE_LOG="$(mktemp -t ci-failure.XXXXXX.log)"
BRANCH=$(git branch --show-current)

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Uncommitted changes. Commit or stash first."; exit 1
fi

# Wait until a run of the workflow exists for the commit; echo its id.
find_run() {
  local workflow="$1" sha="$2" id=""
  for _ in $(seq 1 60); do
    id=$(gh run list --workflow "$workflow" --commit "$sha" --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
    [[ -n "$id" ]] && { echo "$id"; return 0; }
    sleep 5
  done
  return 1
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "▶ Attempt $attempt/$MAX_ATTEMPTS on $BRANCH"
  git push origin "$BRANCH"
  SHA=$(git rev-parse HEAD)

  CI_RUN=$(find_run "$CI_WORKFLOW" "$SHA") || { echo "No CI run appeared for $SHA"; exit 1; }
  if ! gh run watch "$CI_RUN" --exit-status; then
    echo "❌ CI failed. Claude is fixing..."
    gh run view "$CI_RUN" --log-failed | tail -n 400 > "$FAILURE_LOG"

    OUT=$(claude -p "The GitHub Actions CI run failed. Errors are in $FAILURE_LOG.
Read them, find the root cause, fix it in the project code. Follow CLAUDE.md.
Forbidden: disabling or skipping tests, removing workflow steps, weakening checks or lint rules.
Run the same failing commands locally and confirm they pass, then commit as fix(ci): <description>. Do NOT push.
If the fix needs something only a human can do (a secret, a GitHub or server setting, a credential, a decision), change nothing and answer with one line starting with NEEDS_USER: and what is needed." \
      --permission-mode acceptEdits \
      --allowedTools "Read,Edit,Write,Grep,Glob,Bash(npm *),Bash(npx *),Bash(git status),Bash(git diff *),Bash(git add *),Bash(git commit *)" \
      --max-turns 40)
    echo "$OUT"

    if grep -q '^NEEDS_USER:' <<<"$OUT"; then
      echo "⏸ Stopped: needs you."; exit 2
    fi
    if [[ "$(git rev-parse HEAD)" == "$SHA" ]]; then
      echo "Claude made no commit. Manual fix needed."; exit 1
    fi
    continue
  fi
  echo "✅ CI passed"

  # Deploy starts from CI success (workflow_run), so it can lag a little.
  DEPLOY_RUN=$(find_run "$DEPLOY_WORKFLOW" "$SHA") || { echo "No Deploy run appeared for $SHA"; exit 1; }
  if gh run watch "$DEPLOY_RUN" --exit-status; then
    echo "🚀 Deployed"; exit 0
  fi
  # Deploy failures are usually infra (registry, SSH, secrets): do not let Claude guess.
  gh run view "$DEPLOY_RUN" --log-failed | tail -n 80
  echo "⏸ Deploy failed. Stopped for you: $(gh run view "$DEPLOY_RUN" --json url -q .url)"; exit 2
done

echo "Attempts exhausted and CI still failing."; exit 1
