# Independent production-core review

Date: 2026-10-12 UTC

## Decision

**Pass for the finite-alphabet modified BA algorithm and the binary Figure 2 experiment.** No blocking numerical defect was found in the audited production core. This signoff does not cover the teaching UI, finite-blocklength coding, or the unresolved Gaussian Figure 3 experiment.

Audited core SHA-256: `a48f0da1ceecec77381b0b598d266155c7cbf72022412e53c3bd7034fb2299a1`.


Primary-source mapping, independent mathematical derivations, source errata, and the exact-paper coverage boundary are in [source audit](CAPACITY-DISTORTION-SOURCE-AUDIT.md).

## Independence of review

The reviewer read the actual production implementation, but did not implement its BA solver. Numerical comparison used a separate Python program that evaluates mutual information directly and solves the constrained concave objective with SciPy SLSQP, scalar minimization, and independently derived KKT equations. No production BA iteration was ported into the reference.

## Tests performed

1. Re-ran all 18 focused production unit tests: 18 passed
2. Compared both production dual strategies against all saved generic reference fixtures
3. Checked binary q={0,.1,.4,.5,.8,1}, mu={0,1,20,1000}, including limiting states and exported PMF underflow
4. Checked cost-scaling invariance from 1e-12 through 1e12; reviewed the added subnormal-cost 1e-310 test and normalized certificate implementation
5. Generated 75 independent random finite-channel fixtures with seed 180505713. Each has two states, three inputs, three communication outputs, three feedback outputs, Hamming loss, a random cost budget, and a random distortion penalty. Ran each with bisection and projected-gradient, for 150 production solves
6. Compared all random-case solutions against the independent constrained optimizer and checked the production optimality-gap certificate

## Randomized comparison results

- Production runs: 150
- Failed comparisons: 0
- Maximum penalized-objective error: 9.9972e-11 nats
- Maximum communication-rate error: 3.7825e-9 bits/channel use
- Maximum distortion error: 8.1027e-10
- Maximum probability-coordinate error: 1.4033e-8
- Maximum production certificate gap: 9.9980e-11 nats

The generic fixed fixtures also passed with maximum rate discrepancy 1.05e-9 bits and maximum probability-coordinate discrepancy 5.47e-9.

## Code-review findings

The implementation correctly:

- Computes the Bayes sensing cost from `(X,Z)` without exposing the receiver's state observation to the estimator
- Uses receiver-known-state conditional mutual information
- Implements the posterior update in a stable equivalent log-domain form
- Applies natural-log penalty units consistently, with bits only for reported rate
- Handles inactive cost constraints without forcing equality
- Detects infeasible budgets and restricts exact minimum-cost faces
- Preserves tiny input support internally without clipping the physical model
- Computes a separate tangent/dual upper bound and requires a certified feasible gap to converge
- Marks initially infeasible uniform distributions without a valid lower bound
- Distinguishes certificate-envelope lambda from the preceding fixed-Q update lambda
- Normalizes cost units, including certificate coordinates, and signals unrepresentable original-unit multipliers instead of exporting infinities
- Exposes bisection substitution, projected-gradient fallback, iteration limits, and convergence status

Custom zero initial masses on otherwise feasible symbols are rejected. This is a documented, reasonable API restriction that prevents accidental support trapping; the default follows uniform initialization.

## Runtime and algorithm-fidelity qualifications

The production default dual solver is explicitly labeled bisection. It solves the same fixed-Q constrained subproblem, but a claim to the printed Eq. 24 path must select `dualStrategy='projected-gradient'`. That path was tested independently here.

The random tests used a maximum of 10000 outer iterations and a 1e-10 nats certificate tolerance. Four random fixtures required more than the production default 2000 outer iterations at this stricter tolerance; the maximum was 3501. This is not a solver defect because the iteration-limit result is explicit. A caller must not turn a capped run into a “converged” display.

One projected-gradient random run used the disclosed bisection fallback. The maximum total inner iteration count was 1,566,798. A small binary experiment is appropriate for a responsive interface; these results do not support an unconditional real-time guarantee for arbitrary finite channels. Preserve the actual strategy, fallback, convergence, and timing information in the interface.

## Reproducibility

Files under `scripts/validation/capacity-distortion/`:

- `independent_reference.py`: direct independent reference construction
- `independent-reference-fixtures.json`: fixed analytical and generic references
- `production_crosscheck.py`: deterministic random-fixture generation and production runner
- `randomized_optimizer_fixtures.json`: all random models plus independent optimizer results
- `production_crosscheck_results.json`: all production outputs and summary, including audited core hash

Run from an environment with NumPy, SciPy, and Node:

`python3 scripts/validation/capacity-distortion/production_crosscheck.py --core labs/capacity-distortion/capacity-distortion-core.js`

The two Python programs should be kept together because the production cross-check imports the independent objective/optimizer, not the production solver.

## Binary Figure 2 sweep

The separate executable validation `node dist/scripts/validation/capacity-distortion/validate-capacity-distortion.cjs` runs 49 genuine BA solves at q=.4 and μ=0:.5:24. Maximum rate error against the independent entropy oracle was 2.5911783e−9 bits/use; maximum distortion error 9.8193541e−11; every-iteration probability error 1.1102230e−16. The exact zero-distortion endpoint is evaluated as a degenerate input, not claimed as a finite-μ iterate. The paper separation policy and allowed-budget plateau are recorded separately. This test does not implement a general hard-distortion-budget solver or close Figure 3.
