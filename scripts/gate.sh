#!/usr/bin/env bash
# Shared quality gate. Every lane runs this before declaring a phase done.
# Usage: scripts/gate.sh        (exit code 0 = green)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== lint";  npm run lint
echo "== test";  npm test
echo "== build"; npm run build
echo "== audit"; npm audit --omit=dev --audit-level=high
echo "GATE GREEN"
