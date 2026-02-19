#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"

if command -v devbox >/dev/null 2>&1; then
  RUNNER=(devbox run -- bun run)
elif command -v bun >/dev/null 2>&1; then
  RUNNER=(bun run)
else
  echo "bun or devbox is required"
  exit 1
fi

echo "Running Playwright smoke checks against ${BASE_URL}"
SMOKE_BASE_URL="$BASE_URL" "${RUNNER[@]}" src/dev/playwright/smoke.mjs

echo "Manual checklist: src/dev/playwright/smoke-checklist.md"
