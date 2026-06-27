#!/usr/bin/env bash
# Push current branch to origin — requires gh auth or SSH (see GITHUB_SETUP.md).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${1:-$(git branch --show-current)}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: not a git repository" >&2
  exit 1
fi

if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    echo "error: run 'gh auth login' first (see GITHUB_SETUP.md)" >&2
    exit 1
  fi
fi

echo "→ pushing ${BRANCH} to origin"
git push -u origin "$BRANCH"

echo "→ done: https://github.com/david9up/miditracker/tree/${BRANCH}"
