# Oracle verification

Run from the prototype directory:

```sh
python3 tests/generate_oracles.py
node tests/verify_oracles.mjs --seed 28193041
python3 tests/generate_oracles.py --verify-runtime reports/oracle-runtime-nonfixture.json
```

Omit `--seed` for a new unsigned 32-bit runtime seed. `--fixtures-only` skips runtime generation. After a runtime export changes, run Python verification again: the report records the exact export SHA-256 and kernel SHA-256 so an older report is not evidence for a newer export or kernel.

The 113 complete fixture cases cover seven raw frames, all four receiver variants, and iteration caps 1, 2, 5, and 40. They include a 16×16 equal-energy frame, non-unit symbol energy, complex pilots, signed supports, a one-bin predicted-support mismatch, a single-path/one-row frame, explicit zero and weak estimated gains, all-zero estimates, and the independently frozen tiny counterexample. Every fixture has complete receiver inputs and outputs; evaluator-only truth and noise are identified separately. The supplied-perfect-CSI branch alone receives physical truth.

`oracle-generation.json` reports pinned-reference generation, independent scalar-message checks, independently calculated exact source fixtures, and the single-path exhaustive posterior check. `oracle-js-verification.json` reports complete Node output parity and separate independent-scalar comparisons. `oracle-runtime-nonfixture.json` contains four live seeded detector runs with raw inputs, full outputs, and separately labeled evaluator information. `oracle-runtime-verification.json` checks that exact export with Python, reconstructs the raw observation independently, and rules out replaying any fixture observation.

The accepted reference file is immutable and SHA-pinned. Copying its outputs establishes port parity, not independent scientific truth. The accepted scalar review source and mathematical oracle remain distinct and are also hash checked. See `../reference-copy/PROVENANCE.md` for that separation.

## Disclosed half-tie boundary

The retained source fixture's ignored-uncertainty mode has a near-0.5 data marginal. NumPy and JavaScript rounding can choose opposite hard labels while probabilities agree to approximately 1e-15. The verifier preserves those raw outputs and reports every affected field. It permits a different data decision only when both positive marginals are within 3e-12 of 0.5, and accepts a decision-change count difference only after complete per-iteration reruns prove it comes entirely from those current/previous ties. No probability or decision is snapped; all other categorical fields and counts must match exactly. `oracle-tie-diagnostic.json` retains the raw differences, affected cell contributions, and all relevant probability traces.

The converged repaired detector still differs from the exact integrated-gain posterior by 0.4999130751997302 in the tiny fixture. This retained counterexample is a scientific limitation, not a tolerance waiver. These tests establish a bounded numerical port; browser lifecycle, publication, paper-sized curves, sensing-derived support, and guaranteed BER improvement require separate evidence.
