#!/usr/bin/env bash
# Push to origin over HTTPS using gh credentials (works when agent SSH/DNS is blocked).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE_URL="${MIDITRACKER_GITHUB_URL:-https://github.com/david9up/miditracker.git}"

if command -v gh >/dev/null 2>&1; then
  gh auth setup-git >/dev/null 2>&1 || true
fi

exec git \
  -c url.https://github.com/.insteadOf=git@github.com: \
  push "$REMOTE_URL" "$@"
