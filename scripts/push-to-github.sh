#!/usr/bin/env bash
# Push current branch to origin — HTTPS via gh (agent-safe). See GITHUB_SETUP.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${1:-$(git branch --show-current)}"
SCRIPT_DIR="$(dirname "$0")"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: not a git repository" >&2
  exit 1
fi

"$SCRIPT_DIR/gh-auth-check.sh"

echo "→ pushing ${BRANCH} to origin (HTTPS)"
"$SCRIPT_DIR/gh-push.sh" "$BRANCH"

echo "→ done: https://github.com/david9up/miditracker/tree/${BRANCH}"
