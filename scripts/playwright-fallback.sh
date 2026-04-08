#!/usr/bin/env bash
set -euo pipefail

export PLAYWRIGHT_FALLBACK_OUTPUT_DIR="${PLAYWRIGHT_FALLBACK_OUTPUT_DIR:-$PWD/output/playwright}"

exec playwright-fallback "$@"
