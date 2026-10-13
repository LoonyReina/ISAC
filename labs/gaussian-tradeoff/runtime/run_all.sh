#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1
node tests/test-numerics.mjs
node tests/test-integrals.mjs
node tests/test-stress.mjs
node tests/export-live-evidence.mjs
python tests/verify-live-evidence.py
node --experimental-vm-modules --test tests/codec.test.mjs tests/protocol.test.mjs
node tests/benchmark.mjs
