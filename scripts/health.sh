#!/usr/bin/env bash
# Post-deploy health check. Usage: scripts/health.sh <base-url>   (exit 0 = healthy)
# No credentials needed. Set VERCEL_AUTOMATION_BYPASS_SECRET to reach a protected preview.
set -uo pipefail

BASE_URL="${1:-${BASE_URL:-}}"
[ -n "$BASE_URL" ] || { echo "usage: scripts/health.sh <base-url>" >&2; exit 2; }
BASE_URL="${BASE_URL%/}"

CURL=(curl -sS -m 30)
[ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ] && CURL+=(-H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET")

HDR=$(mktemp); trap 'rm -f "$HDR"' EXIT
fail=0
ok()  { printf 'PASS  %-34s %s\n' "$1" "$2"; }
bad() { printf 'FAIL  %-34s %s\n' "$1" "$2"; fail=1; }

# Prints "<status> <seconds>"; headers go to $2 when given.
probe() { "${CURL[@]}" -o /dev/null -w '%{http_code} %{time_total}' "${@:2}" "$1" 2>/dev/null || echo "000 0"; }

read -r code t <<<"$(probe "$BASE_URL/" -D "$HDR")"
[ "$code" = 200 ] && ok "GET /" "200 in ${t}s" || bad "GET /" "expected 200, got $code"

for h in x-frame-options x-content-type-options referrer-policy permissions-policy strict-transport-security; do
  grep -qi "^$h:" "$HDR" && ok "header $h" present || bad "header $h" missing
done

for route in gemini github embed; do
  read -r code t <<<"$(probe "$BASE_URL/api/$route" -X POST -H 'content-type: application/json' -d '{}')"
  [ "$code" = 401 ] && ok "POST /api/$route no token" "401 in ${t}s" || bad "POST /api/$route no token" "expected 401, got $code"
done

[ "$fail" = 0 ] && echo "HEALTHY" || { echo "UNHEALTHY"; exit 1; }
