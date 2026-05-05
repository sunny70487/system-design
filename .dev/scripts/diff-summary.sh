#!/usr/bin/env bash
# Print a short summary of pending changes plus an AGENTS.md / CLAUDE.md
# parity check. Agents call this before reporting completion.

set -u

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 2

echo "## Branch"
git rev-parse --abbrev-ref HEAD
echo

echo "## Status (short)"
git status --short
echo

echo "## Diffstat (working tree vs HEAD)"
git diff --stat
echo

echo "## Files changed"
git diff --name-only HEAD
echo

echo "## AGENTS.md == CLAUDE.md"
if [ ! -f AGENTS.md ] || [ ! -f CLAUDE.md ]; then
  echo "MISSING: one or both files do not exist."
  exit 1
fi
if git diff --no-index --quiet AGENTS.md CLAUDE.md; then
  echo "OK: byte-identical."
  exit 0
fi
echo "DRIFT: AGENTS.md and CLAUDE.md differ. Re-sync (e.g. cp AGENTS.md CLAUDE.md)."
exit 1
