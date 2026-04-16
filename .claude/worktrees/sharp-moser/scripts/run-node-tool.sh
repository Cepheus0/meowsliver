#!/usr/bin/env bash
set -euo pipefail

if [[ -x /usr/local/bin/node ]]; then
  NODE_BIN="/usr/local/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  echo "Node.js is required but was not found on PATH." >&2
  exit 1
fi

exec "$NODE_BIN" "$@"
