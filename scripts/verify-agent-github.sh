#!/usr/bin/env bash
# One-shot check: can this shell push and trigger Pages deploy? Run after gh auth refresh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== MidiTracker GitHub agent check ==="

"$(dirname "$0")/gh-auth-check.sh"

echo "→ dry-run: list workflows"
gh workflow list --limit 3

echo "→ dry-run: latest Pages deploy run"
gh run list --workflow="Deploy GitHub Pages" --limit 1

echo ""
echo "OK — agent can use:"
echo "  npm run push:github"
echo "  npm run deploy:pages"
