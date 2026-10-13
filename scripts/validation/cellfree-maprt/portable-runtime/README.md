# Bounded live cell-free MAPRT numerical runtime

Original dependency-free ESM implementation of the source Gaussian-nuisance multistatic MAPRT and source CCP sensing-SINR power allocation in arXiv:2305.12523v2. This is an adjustable **reduced conditional algorithm implementation**, not full-paper reproduction or a frozen-trace viewer.

## Run

Import `run`, `settings`, `DOMAIN`, `replay` from `runtime.mjs`; `await run(settings)` computes fresh channel moments/holdout, independent design, four allocations (when certified), Gaussian latent trials, observations, MAPRT scores, calibration and evaluation. `codec.mjs` exports JSON `encode/decode` retaining complex dimensions. `RuntimeClient` in `client.mjs` executes `worker.mjs` as an actual module Worker. Serve the directory over HTTP(S), not file://. `client.run(settings)` resolves encoded JSON; `cancel()` immediately terminates the worker; `restart(settings)` replaces it; `destroy()` permanently disables the client. Active-run overlap is rejected. Generation IDs ignore stale messages.

`replay(record)` is a detector-record consistency check, not an independent solver certificate verifier or cryptographic authenticity test. It reconstructs all calibration/evaluation observations from stored raw Gaussian latent arrays and designs, scores, thresholds, decisions and counts. Independent Python validations are in tests and the separate reviewer package.

## Bounded controls

- seed integer 1..4294967295; fresh PRNG is Mulberry32 plus Box–Muller (not NumPy's seed stream)
- RCS −15..15 dBsm; clutter covariance multiplier .05..3
- communication target −3..6 dB; common per-AP cap .1..2 W
- fitted and independent holdout channel samples 32..512 each
- H0 calibration blocks128..2048; independent H0/H1 evaluation blocks64..1024
- nominal Pfa .01...1, further constrained by resolvable order statistic
- fixed 4 TX APs,2 RX APs,2 antennas/AP,2 UEs,10 symbols, fixed disclosed synthetic geometry

Unknown settings, invalid integers/nonfinite values and out-of-domain requests are rejected. Each CCP family runs three predeclared source feasible starts, selecting the highest sensing-SINR among accepted converged candidates. Every failed and nonselected restart is retained in `solver.isac.restarts` / `solver.isacS.restarts`; `selectedRestart` is zero-based or null. Each restart has at most50 outer steps and400 bounded convex-solver iterations per step; accepted subproblems require finite primal feasibility and numerical global convex-subproblem gap gates. These are resource caps, not performance guarantees. Worker termination is the immediate cancellation path during bounded synchronous phases. No long-run browser performance or device-wide memory guarantee is claimed. Codec rejects imported/exported UTF-8 text above64MiB, nonfinite numbers, and malformed or oversized complex matrices. DOMAIN and each range and returned settings object are frozen. Replay validates raw dimensions, finite scores, the complete threshold, decisions/counts/rates/intervals and detector constants; it does not authenticate metadata or recertify optimizer traces.

## Honest scientific boundaries

The source MAP prior-density normalizer is retained. The separate marginalized Gaussian LRT has a different determinant constant. AP and SP use identical observations; SP ignores clutter in its detector kernel but calibrates on actual cluttered null observations. Allocations share latent Gaussian draws but produce different observations. Calibration and evaluation are disjoint. Pointwise95% Clopper–Pearson evaluation intervals and order-statistic beta calibration intervals are computed separately; they are not simultaneous coverage, exact finite-sample Pfa or distribution-free CFAR guarantees.

The geometry/covariances/pilot model/symbol law are the reference's disclosed synthetic specialization. Channel moments are re-estimated and their independent holdout constraint crossings are returned explicitly. Fitted feasibility is not population feasibility. The selected archived reference had essentially zero sensing-stream power, heldout crossings for every allocation and reversed sensing-surrogate/Pd ordering at unequal used power. Fresh browser seeds/designs can have positive sensing power and different ordering; the runtime does not force the archived outcome. Compare actual used expected power, not just the common cap. W-symbol sums are not joules without symbol duration.

The browser optimizer is a genuine source CCP with a newly implemented convex barrier Newton subsolver, **not SciPy SLSQP**. It cannot and does not reproduce SLSQP-specific status8/retry history. All browser attempts/failures/caps are retained; failure is not converted into success. Accepted CCP is a local candidate, never a global nonconvex optimum. If communication fails, the run returns failure and no fabricated detection summary. If all starts for one CCP family fail, other accepted allocations can finish; inspect `allRequestedAllocationsAccepted` and `failures` (including failed restarts even when that family found another accepted candidate).

## Source and attribution contract

Source identity: arXiv:2305.12523v2; official PDF SHA256 `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10`.
Accepted source-free Python reference archive SHA256 `52356ca01b77482a1c3a42d70f7fe4dc0914a20c5b29695d5e5e8f8a6df7981b`; reference manifest SHA256 `30a8e28487ddce0542d767482e02b6eb6af9397a5b69187071f5507cd8e774a5`.
Original reference modules: maprt.py `bab0b8dd7992980c0482421848cbdd83edd9084a47186af4e6c4b23dd87866c9`; power.py `0b83c1738d5d9e70d5218932aace11d6e4fc55e04f77ebaec04509af274b3673`; scenario.py `4d1f24f05e960d4dbb059792f15a3139c7e458098aaa3a5d86cc98b6d5ecda1a`.
The reference was independently accepted for its reduced numerical core; that acceptance does not transfer automatically to this port. All JS arithmetic/scenario/solver/statistics code here is newly written, with no reused numerical helper/private paper code or bundled PDF. Public equations and the audited original reference provide the mathematical specification.

## Verification and handoff

Node-only developer checks (no browser-performance inference):

    node tests/runtime.test.mjs
    node tests/contracts.test.mjs
    node tests/maprt.test.mjs
    node tests/power.test.mjs
    node tests/scenario.test.mjs /tmp/scenario-check.json
    node tests/client.test.mjs
    node tests/worker.test.mjs
    python tests/maprt-python-validation.py

`scenario-python-validation.py /tmp/scenario-check.json` and regeneration with `power_oracle.py` additionally require the separately accepted sibling Python reference and NumPy/SciPy. It is intentionally not bundled. Existing source-free oracle fixtures support the Node solver regression test. All tests create only their own evidence outputs or the explicit output path.

The portable runtime is the nine root ESM modules together, served from one HTTP(S) directory. `RuntimeClient.run()` and `.replay()` resolve encoded JSON strings. `decode()` restores complex Float64Array matrices. Keep the Worker and all its relative imports together and allow same-origin module workers in the host CSP. Progress phases are scenario, power (family and 1-based restart), detector (allocation). Terminate through client.cancel() for immediate cancellation; hooks.cancelled is cooperative only between bounded phases. A destroyed client cannot restart.

Actual browser Worker/module/CSP/cancellation/rendering and browser timing are unverified until the website integration/deployment gate. Cloud-browser localhost access was blocked; no alternate restricted route was attempted. Node Worker and VM execution are separate evidence. This package contains no UI or deployment changes.
