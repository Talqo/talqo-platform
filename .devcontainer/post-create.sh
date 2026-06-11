#!/bin/bash
set -euo pipefail

# Install all workspace dependencies
bun install

# Pre-install Playwright browser + system deps so tests don't do it at runtime
cd apps/e2e && bunx playwright install --with-deps chromium && cd -

# Add Claude plugin marketplaces and install plugins declared in .claude/settings.json
claude plugin marketplace add JuliusBrussee/caveman
claude plugin marketplace update claude-plugins-official
claude plugin install frontend-design@claude-plugins-official
claude plugin install superpowers@claude-plugins-official
claude plugin install code-review@claude-plugins-official
claude plugin install commit-commands@claude-plugins-official
claude plugin install caveman@caveman

echo "Success! Your dev container is ready to roll."
