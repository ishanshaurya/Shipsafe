#!/usr/bin/env bash
# Smoke suite against a deployed URL. Usage: scripts/smoke.sh <base-url>
# Needs E2E_EMAIL and E2E_PASSWORD in the shell. Set E2E_STRIP_AUTH=1 to confirm the suite fails without the auth header.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${1:-${BASE_URL:-}}"
[ -n "$BASE_URL" ] || { echo "usage: scripts/smoke.sh <base-url>" >&2; exit 2; }
: "${E2E_EMAIL:?E2E_EMAIL not set}" "${E2E_PASSWORD:?E2E_PASSWORD not set}"

export BASE_URL
npm run e2e
