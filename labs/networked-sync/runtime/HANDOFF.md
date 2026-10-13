# Integration handoff: numerical kernel only

## Node direct API

    const K = require('./js/receiver.js');
    const result = await K.run({operation:'generate',config:{
      shape:[10,36,20],rank:2,seed:20261012,iterations:8,trace:'full'
    }});

A `held` request uses the same config and an observation containing `shape`,
`observations:[link0,link1]` and `pilots:[pilot0,pilot1]`. Arrays are interleaved
real/imag float64 in C order: tensor index `(m*N+n)*K+k`, pilot index `n*K+k`.
Both links are required. Typed Float64Array and ordinary dense arrays are
accepted by the direct kernel; outputs are serializable ordinary arrays.
Optional `configPhysics` and `generationConfig` metadata use the exact fields
in README.md and are validated, hashed, and immutable when held.

`validateRequest` runs before computation. Unknown keys are rejected. `run`
snapshots accepted held data before its first asynchronous checkpoint. The
returned `methods` have independent link results, pair parameters, errors and
`numerical_success`. Top-level `status:'fresh-execution'` means the kernel
executed; it does not assert any method succeeded. Generated truth/evaluation
are separate from observation/receiver inputs.

## Full trace and materialization

`trace:'full'` returns pilot-divided data; initializer covariance, retained
subspace, shift matrix/eigenvectors/generators and paired subspace; ESPRIT
unfolding, unconstrained A×C products and actual rank-one SVD vectors; initial,
per-substep and normalized factor arrays; unconstrained mode LS columns;
every actual FFT grid and refined local candidate; accepted amplitudes,
phases and residuals; every permutation score and selected association.

The smoothed Hankel matrix is not redundantly embedded twice in every result.
Call `smoothedHankel({shape,data})` on an actual pilot-divided link for its full
interleaved matrix. The contract is window-C rows and shift-C columns. This
is an exact materializer, not a synthetic display. A source-size Hankel has
160×3248 complex elements (8,314,880 bytes). Tensor reconstructions are likewise
available from actual factor matrices through `reconstruct(factors)`.

Summary traces retain decisions and residuals, but lack full grid arrays.
Do not draw a projection landscape from summary peaks. An arbitrary held
record without truth has no evaluation; do not infer truth from a prior run.

## Worker and UI obligations

Use the supplied Worker client for accepted-only supersession and terminal
fencing. Rejected requests must preserve the current run/result. Cancel,
release, close/navigation disposal and worker-death paths must invalidate UI
state immediately; a queued terminal event must not overwrite newer work.
Importing a historical record never executes the solver or creates a fresh
success. An explicit process of verified held data is fresh receiver work.

Progress names actual stages/checkpoints. No percentage/time prediction is
promised, because methods can fail or stop early. Initialization and each
mode update have bounded synchronous sections in the Worker; cancel is
cooperative at checkpoints, not a preemptive interruption of floating-point
operations. Hard disposal terminates the Worker. Exports and hashing also
yield/check cancellation. See Worker reports for measured scope.

Do not enable an actual browser control until real browser worker loading,
CSP/content types, assets, input limits, cancel/repeated-run navigation,
resource measurements, export roundtrip and accessibility have been checked.
VM loader coverage is not actual browser coverage. No UI, repository,
publication or remote work has been done here.

## Review and release

The receiver/oracle and runtime/codec gates are separately documented and
frozen. External independent port review is separate from the owner tests.
Use SOURCE-FREEZE.json, ARTIFACT-MANIFEST.json and archive verification rather
than relying on a mutable directory or a successful old test log. Historical
reference acceptance cannot stand in for this JavaScript port's acceptance.
