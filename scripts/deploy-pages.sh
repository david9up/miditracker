#!/usr/bin/env bash
# Trigger GitHub Pages deploy and wait for completion.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-main}"
WORKFLOW="Deploy GitHub Pages"
SITE="https://david9up.github.io/miditracker/"

export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
if [[ -z "$GH_TOKEN" ]]; then
  echo "error: no GitHub token — run: gh auth refresh -h github.com -s repo,workflow" >&2
  exit 1
fi

"$(dirname "$0")/gh-auth-check.sh"

echo "→ triggering ${WORKFLOW} on ${REF}"
gh workflow run "$WORKFLOW" --ref "$REF"

echo "→ waiting for workflow to appear…"
for _ in $(seq 1 12); do
  RUN_ID="$(gh run list --workflow="$WORKFLOW" --limit 1 --json databaseId,status -q '.[0].databaseId' 2>/dev/null || true)"
  if [[ -n "$RUN_ID" && "$RUN_ID" != "null" ]]; then
    break
  fi
  sleep 5
done

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  echo "error: could not find workflow run — check Actions on GitHub" >&2
  exit 1
fi

echo "→ watching run ${RUN_ID}"
gh run watch "$RUN_ID" --exit-status

echo "→ deploy complete: ${SITE}"
