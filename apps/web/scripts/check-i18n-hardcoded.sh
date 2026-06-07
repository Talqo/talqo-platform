#!/usr/bin/env bash
# Finds user-visible strings hardcoded in .tsx files instead of using t().
# Intended to catch violations; will produce some false positives — review output.

set -uo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)/src"
found=0

check() {
  local description="$1"
  local pattern="$2"
  shift 2
  local extra_excludes=("$@")
  local results
  results=$(
    grep -rn --include="*.tsx" -E "$pattern" "$SRC" \
    | grep -v '/components/ui/' \
    | grep -v 'className=' \
    | grep -vE '^[^:]+:[[:space:]]*//' \
    | grep -vE '^[^:]+:[[:space:]]*import ' \
    | grep -vE ' type="[a-z]' \
    | grep -vE ' (html|form)?name="' \
    | grep -v ' key="' \
    | grep -v ' href=' \
    | grep -v 'http' \
    || true
  )
  for excl in "${extra_excludes[@]+"${extra_excludes[@]}"}"; do
    results=$(echo "$results" | grep -v "$excl" || true)
  done
  if [ -n "$results" ]; then
    printf '=== %s ===\n' "$description"
    echo "$results"
    echo
    found=1
  fi
}

echo "Checking for hardcoded user-visible strings in src/**/*.tsx..."
echo

# Exclude lines with => to avoid false positives from TypeScript arrow function
# return types like `) => Promise<User>` matching the > [A-Z] pattern.
check "JSX text children" '>[[:space:]]*[A-Z][a-z][a-z]' '=>'
check "Hardcoded placeholder"  'placeholder="[^{]'
check "Hardcoded aria-label"   'aria-label="[^{]'
check "Hardcoded title attr"   ' title="[^{]'
check "Hardcoded alt text"     ' alt="[^{]'
check "Hardcoded label prop"   ' label="[^{]'

if [ "$found" -eq 0 ]; then
  echo "No hardcoded user-visible strings detected."
  exit 0
fi

echo "Review matches above — some may be false positives."
echo "User-visible strings must use t() from react-i18next."
exit 1
