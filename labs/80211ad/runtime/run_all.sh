#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node tests/test-kernel.cjs
node tests/test-worker.cjs
if [ "${1:-}" != "--runtime-only" ]; then node tests/verify_oracles.cjs; fi
