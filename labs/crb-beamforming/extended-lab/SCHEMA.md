# Schema v0.1 (numerical prototype)

Recovery note, 2026-10-18: recreated from available tool-call history; no original document hash available. Source identity and current reruns are recorded separately.

## Entry points

CommonJS: require('./extended/core.js'); browser globals when loaded in order: JointHermitian, CrbLinearAlgebra, CrbExtendedOptimizer.

createSolver(input, options?) returns {step,result,cancel,status,debugMap}. Input is defensively JSON-copied. step(count=1) inspects at most1..1000 iterate states and returns immutable progress. cancel() is terminal/idempotent. Terminal result() returns the same deeply frozen JSON-compatible record. While running, result() returns a frozen progress summary. debugMap is an arithmetic test seam. Async callers must retain their own run ID before rendering results.

## Input

All keys required; extra keys rejected:
-Nt:4 or6
-Nr:Nt+4
-K:2
-L:30
-powerMw:1000
-communicationNoiseMw and radarNoiseMw:1
-gammaDb:finite in[0,20], shared by both users
-H:{real:number[K][Nt],imag:number[K][Nt]}, finite entries with complex magnitude<=10

No theta/reflectivity/scatterer-location or point-target parameters are used. Gamma=10^(gammaDb/10). Signal model y=H Wc s+H Wa z+n; probing contributes interference.

## Options

Defaults:rho=10^(gammaDb/10),linearWeight10,relaxation1.6,memory10,maxIterations20000,maxElapsedMs120000,tolerance1e-10,recordEvery100.

Bounds:rho[1e-3,1000],linearWeight[0.1,100],relaxation(0,2),memory integer0..20,maxIterations integer1..200000,maxElapsedMs(0,600000],tolerance[1e-11,1e-6],recordEvery positive integer. Invalid domain/options produce invalid_input. Elapsed clock includes time between calls; it is wall time, not CPU accounting.

## Statuses

-converged:residual stop plus physicalGate passed
-numerical_rejection:residual stop but physical/certificate gate failed
-numerical_failure:arithmetic/factorization/recovery failure
-iteration_cap:budget exhausted, no infeasibility inference
-elapsed_work_cap:wall-time budget exhausted, no infeasibility inference
-cancelled:caller cancellation
-invalid_input:schema/finite-value/domain failure
-proven_infeasible:individual-channel total-power necessary bound violated; reason and maximum SINR given

Only converged plus physicalGate.passed===true denotes accepted design. No general infeasibility solver is claimed. Optional terminal certificate extraction failure on caps/cancellation preserves that status and adds diagnosticsFailureReason with certificate:null.

## Output

iterations counts inspected iterate states including initialization; a cap of1 inspects initialization and makes no further splitting update. Trace indices follow the same convention.

Packed matrices:{real:rows[],imag:rows[]}. Wks contains K+1 physical-mW covariance blocks, last original probing; relaxedR is their sum. epigraphTNormalized and epigraphObjective retain Schur epigraph. Solved records contain Wc(Nt×K),Wa(Nt×Nt),recovery,metrics,baseline. Beams are sqrt(mW); eigenvalues/power mW; inverse trace per mW; bound is sum of complex-entry MSE. Certificate contains repaired Z,power/SINR multipliers,coefficient residual,post-repair cone/stationarity minima and gap, independently reconstructible without DRS internals. Infeasible baseline is never counted as a winning feasible design. kernelWallMs is captured at start of finalization and is not first-paint latency.

Standalone algebra helpers consume interleaved real/imag Float64Array data; they do not imply additional public optimization domains. Imported saved records are structurally checked and labelled not recalculated, not freshly recertified.
