#!/usr/bin/env bash
# Verify gh is logged in with scopes needed for push + Pages deploy.
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "error: install GitHub CLI — brew install gh" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: not logged in — run: gh auth login" >&2
  exit 1
fi

echo "→ gh account: $(gh api user -q .login 2>/dev/null || echo unknown)"

if ! gh api repos/david9up/miditracker/actions/workflows --jq '.total_count' >/dev/null 2>&1; then
  echo "error: missing Actions/workflow scope — run:" >&2
  echo "  gh auth refresh -h github.com -s repo,workflow" >&2
  exit 1
fi

echo "→ gh auth OK (repo + workflow/actions access)"
