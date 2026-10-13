#!/bin/sh
set -eu
cd "$(dirname "$0")"
export OPENBLAS_NUM_THREADS=1
export PYTHONDONTWRITEBYTECODE=1
node tests/test-kernel.mjs
node tests/verify_oracles.mjs
python3 tests/generate_oracles.py --verify-runtime reports/oracle-runtime-nonfixture.json
node tests/test-worker.mjs
node tests/test-deferred-client.mjs
node tests/test-signed-zero-worker.mjs
node tests/test-conditioning.mjs
node tests/export-worker.mjs
python3 tests/verify_experiment.py
node tests/benchmark.mjs
