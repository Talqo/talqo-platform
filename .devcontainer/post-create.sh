#!/bin/bash
set -euo pipefail

# Install all workspace dependencies
bun install

# Pre-install Playwright browser + system deps so tests don't do it at runtime
cd apps/e2e && bunx playwright install --with-deps chromium && cd -

echo "Sukces! Kontainer sudah siap digunakan."
