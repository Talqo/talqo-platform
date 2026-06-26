#!/bin/bash
set -euo pipefail

make setup

# Pre-install Playwright browser + system deps so tests don't do it at runtime
cd apps/e2e && bunx playwright install --with-deps chromium && cd -

# Use HTTPS for public repos to avoid SSH host-key issues in fresh containers
claude plugin marketplace add https://github.com/anthropics/claude-plugins-official.git || true
claude plugin marketplace add https://github.com/JuliusBrussee/caveman.git || true

claude plugin install frontend-design@claude-plugins-official
claude plugin install superpowers@claude-plugins-official
claude plugin install code-review@claude-plugins-official
claude plugin install commit-commands@claude-plugins-official
claude plugin install caveman@caveman

echo "Success! Your dev container is ready to roll."
