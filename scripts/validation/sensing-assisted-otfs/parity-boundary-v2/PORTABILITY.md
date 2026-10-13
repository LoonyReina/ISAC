# Version 2 expected-rejection regression

Date: 2026-10-13. This is an additive regression-contract repair, not a receiver,
reference, tolerance, native-record, or scientific-acceptance repair.

## Why a separate version

The immutable v1 bundle in `assets/data/sensing-assisted-otfs/parity-boundary/`
preserves observations from a particular floating-point dispatch. Its CLI
regression compares complete diagnostic stdout bytes, and its census compares
floating diagnostics and the exact-equality count byte-for-byte in substance.
Those are stronger requirements than the unchanged numerical checker imposes.

The accepted source tree `3bdf33e5a1d22a474c5e7d400c88e6ef5924fda4` passed PR
run 38418596237, then failed main run 38421092088 on the stdout-byte assertion.
Both used the same recorded runner image and Python/NumPy/SciPy/Node versions.
The failed job discarded the underlying stdout and recorded no CPU dispatch;
its exact output difference and host CPU cannot be reconstructed. The following
local reproduction establishes a portability defect, not the identity or proven
cause of that historical GitHub runner failure.

With unchanged input, oracle, reference, Python 3.12.14 and NumPy 2.3.5 on the same
x86-64 machine, disabling NumPy AVX-512 dispatch changed the first rejected
reference value from 0.15319224296154643 to 0.15319224296134318. Its delta from
the identical browser value changed from 1.000902138947879e-11 to
9.805767309245539e-12. Both fail the same unchanged scalar tolerance at
`frame[2].literal_operational.probabilities[212]`.

The full 28,528-value census retained the same eleven violated paths: ten in
frame 2's literal receiver, one in frame 3's literal receiver. Its exact-equality
count changed from 24,190 to 24,310. The frame-3 violation's reference shifted by
7.617795283465512e-12, inside the original comparator for that reference value.
The immutable browser values, raw bits including signed zero, decisions, status,
iteration counts, history decision counts, and all exact receiver metrics stayed
unchanged. The independent accepted control continued to pass the original CLI.

A separate forced OpenBLAS Sandybridge experiment produced ten violations.
Version 2 **rejects that changed scope**. It does not pin a CPU to conceal it or
claim that all processors necessarily preserve this eleven-violation boundary.

## Mandatory invariants

- Freeze the v1 manifest itself, every file listed by it, all three native
  records, the original numerical oracle, and the original reference by SHA-256
- Run the original oracle in separate processes: rejected records must exit 1,
  the independent accepted control must exit 0, and stderr must be empty
- Keep exact report fields, hashes, counts, statuses, verification labels,
  failure lists, and the first rejected scalar path and browser value
- Apply the original `close` comparator to the runtime diagnostic maximum and
  the first rejected reference value versus their historical observations
- Recompute the first rejected delta exactly and require it still to exceed
  `3e-12 + 2e-11 * abs(reference)`, the original scientific tolerance
- Independently rebuild the seed-1307130005 inputs and all sixteen receivers;
  apply the unchanged scalar comparator to every scientific value
- Require exactly the same eleven violated paths and immutable browser values;
  each current reference must remain within the original comparator of its
  historical reference; verify every reported delta, tolerance and ratio
- Require raw input bits, decisions, statuses, all forty-iteration counts,
  history decision-change counts, and all receiver metrics to remain exact

The exact-equality count and diagnostic maxima are calculated from the complete
current census and returned beside the untouched historical census. They are
observations, not new acceptance thresholds. They cannot make a failed scalar
pass. Different violation counts/paths, excessive reference drift, changed
metrics or source/evidence bytes fail closed. The final scientific label remains
`FAILED_UNCHANGED`; a passing expected-rejection test never means parity passed.

## Invocation and evidence

Use Python 3.12 and NumPy 2.3.5. The command pins one BLAS/OpenMP thread before
NumPy initializes; CPU dispatch is neither overridden nor emulated.

```sh
python3 scripts/validation/sensing-assisted-otfs/parity-boundary-v2/check-boundary-v2.py \
  --bundle assets/data/sensing-assisted-otfs/parity-boundary \
  --oracle labs/otfs-sensing-assisted/lesson/tests/record-oracle.py \
  --reference scripts/validation/sensing-assisted-otfs/prototype-v3/reference-copy/reference.py
```

Both success and failure reports include the runtime profile. Every checker
report is retained, including nonidentical diagnostic floats. Checker failures
include raw stdout/stderr so a future runner discrepancy is inspectable. A
census failure after CLI validation also retains those checker reports.

Seven adversarial Python tests, invoked by the separate Node regression, cover
original CLI rejection/control acceptance, the observed alternate diagnostic,
changed semantic fields and numerical claims, the mandatory eleven-path scope,
changed census/receiver values, changed or missing immutable artifacts/checker/
reference, and a modified metric with rehashed payloads tested directly against
the census after deliberately bypassing the identity guard.

The original four owned tests keep their names and assertions. Their invocation
switch is an explicit versioned integration change, with an exact outer inverse
required to recover the original frozen test bytes. No historical manifest or
baseline hash is reset. New mappings and inverse-layer tests are reviewed
separately from this functional contract.
