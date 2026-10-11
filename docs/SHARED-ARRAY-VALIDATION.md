# 同样八根天线：资源账本、空间置零与验证

Date: 2026-10-11 UTC. Scope: an independent analytical teaching model inspired by the 2018 separated/shared-array formulation. It is not an implementation of the source optimizers, a reproduction of their figures, an optimized architecture comparison, or hardware evidence.

## Sources and editions

Fan Liu, Christos Masouros, Ang Li, Huafei Sun, Lajos Hanzo, *MU-MIMO Communications With MIMO Radar: From Co-Existence to Joint Transmission*, IEEE Transactions on Wireless Communications 17(4), 2755–2770, 2018, DOI [10.1109/TWC.2018.2803045](https://doi.org/10.1109/TWC.2018.2803045).

- [VoR hosted by UCL](https://discovery.ucl.ac.uk/id/eprint/1563386/7/Masouros%20VoR%2008288677.pdf): 16 PDF pages, printed pp.2755–2770; SHA-256 4d8f2135a6014338d82dee21da2ba2e05e3c4567bc55c8cb2f4f5525c10855a2
- [arXiv 1707.00519v1](https://arxiv.org/pdf/1707.00519v1): 2017-07-03, 15 PDF pages; SHA-256 b9cbff1ab26b63926e1de87393121ec3ba6ca5de10a7bec99b95ddec91fb42ac. This preprint is not established as an accepted manuscript
- Deployment: Fig.1 / §II, VoR p.2757 / v1 p.3. Separated signals and SINR: (1)–(4), VoR pp.2757–2758 / v1 pp.3–4. Shared data-only signal: (5)–(8), VoR p.2758 / v1 p.4
- Strict radar null: (11), VoR p.2759 / v1 p.4. Block covariance and aggregate pattern: (14)–(18), VoR p.2759 / v1 p.5. Separated optimization (12),(13),(19): VoR p.2759 / v1 p.5. Shared optimization (20): VoR p.2760 / v1 p.6
- Detailed evidence mapping and cautious printed-normalization discussion: [public source audit](../scripts/shared-array-reference/source-audit.md); [structured sources](../data/shared-array-sources.json). No paper PDF, source extraction, image, or author code is redistributed

Both editions print diag(R1)=PR·1/N in (12),(13), while defining R1 as NR×NR and N as the total array. Literal application conditionally implies tr(R1)=NR·PR/N; at N=20, NR=14, PR=PC=P0/2, separated total trace is at most .85P0 using the (19) communication upper bound. This is a printed-normalization ambiguity, not evidence of what the authors' simulation code actually did. The tutorial explicitly enforces its own actual traces and never describes itself as a corrected reproduction.

The original §VI has theoretical and simulation evidence under specified 20-element, 14+6, four-user, iid complex-Gaussian settings. Its reported 7 versus 15 dB sidelobe figures are not a universal theorem, communication SINR improvement, detection result or evidence that all shared designs dominate all split designs. All nine literature cards retain their previous citation/date/social evidence snapshots; only `mu_mimo` gains an available lesson route. DeepSense remains resource-only.

## Physical objects, observables and budgets

The lesson fixes eight physical positions mλ/2, m=0,…,7, total aperture 3.5λ, one ideal full-digital complex-weight transmit path per element. The total path count is eight in both architectures; path count is not stream count or a real RF cost estimate. Split uses one communication symbol c plus one independent radar symbol s on disjoint contiguous supports. Shared uses one communication symbol across all eight antennas and no independent radar symbol. It differs from the existing 2020 extra-radar-stream lesson.

At defaults, radar/communication subarrays have four elements and 1.5λ aperture each. Changing NR changes both support and usable aperture, not physical locations or total aperture. Total average power is P=1; split budgets PR=PC=.5; shared data spends P=1. Only total trace is enforced. Per-antenna equality, caps, PA efficiency, instantaneous peaks, constant modulus, coupling and element patterns are omitted. B's default maximum antenna power is about .20209766, exceeding P/N=.125; equal total power is not equal per-antenna hardware capability.

Steering a_m(u)=exp(jπmu), u=sin(theta), is not divided by sqrt(N). The same full-array user channel h=sqrt(g)exp(jphi)a(u_user) is cropped for split supports, never renormalized. Defaults: g=1, phi=.37, user_u=0, target_u=.25, noise=.05, QoS threshold20. This is a deliberately full-array-orthogonal LOS synthetic geometry, not the paper's Rayleigh population or a typical channel. Orthogonality means complex sums cancel, not directions ninety degrees apart. CSI is exact and known at the transmitter.

c and s are zero mean, unit variance and independent. Powers are ensemble second moments; finite random blocks need not have exactly zero sample cross terms. With y=hᴴx+n, D=|hᴴwc|², Ir=|hᴴwr|², SINR=D/(Ir+noise). There is no second-user interference. Split R=wcwcᴴ+wrwrᴴ is block diagonal; shared R=wwᴴ includes cross-block correlation. Transmit target illumination T=a_targetᴴRa_target includes both communication and radar contributions. No receiver, echo SNR, target-reflection estimate, CRB, probability of detection, angle accuracy or spatial-resolution claim follows. Total budget is tr(R), not the sum of direction samples. Bandwidth, symbol duration and observation period are unchanged but not assigned physical numerical values.

## Four explicit recipes and raw diagnostic

- A: split, communication steered to user, radar steered to target
- raw: project radar target steering into the user nullspace, without restoring power. It spends PRq in radar and PC+PRq overall. It is a diagnostic, excluded from the equal-total-power pattern comparison
- B: normalize the nonzero projected vector, then multiply by sqrt(PR). It restores radar power, not the target-steering direction
- C: shared data steered to the user
- D: shared data steered to the target

Let br and bu be unit target/user steering on the radar subarray, Pi=I−bu buᴴ, v=Pi br, q=||v||². Target radar powers are PR NR for A, PR NR q² for raw and PR NR q for B. q is both the fraction of energy surviving projection and the fraction of target radar illumination retained after restoring power. The amplitude factor 1/sqrt(q) compares projected and normalized vectors; it is not an unbounded final physical RF output.

B achieves the illumination bound PR||Pi a_r||² only in its fixed-subarray, exact-single-user, single-target, PSD, total-radar-budget, strict-null subproblem. The four recipes are not global architecture optima or a Pareto boundary. For 4+4 with equal split budgets, B's total target power is exactly2 whenever B exists: communication and radar changes cancel. The component readout is essential; 6+2 no longer has this identity.

Default closed-form checkpoints:

| Recipe | Actual trace | User D | Radar Ir | SINR | Target total |
|---|---:|---:|---:|---:|---:|
| A | 1 | 2 | .8535533906 | 2.2134829229 | 2.8535533906 |
| raw diagnostic | .7866116524 | 2 | theoretical0 | 40 | 1.5107233047 |
| B | 1 | 2 | theoretical0 | 40 | 2 |
| C | 1 | 8 | 0 | 160 | theoretical0 |
| D | 1 | theoretical0 | 0 | theoretical0 | 8 |

q=(6−sqrt(2))/8=.5732233047, amplitude restoration1.3208031035. The radar target component is2 for A, .6571699141 for raw and1.1464466094 for B. Direct sums at theoretical nulls may contain tiny floating residuals.

## Boundary and numerical domain

- Exact steering alignment/alias and NR>1: q=0 makes target-directed normalized projection B undefined, even though a nonempty nullspace remains. A separately labeled two-element cancellation witness spends the radar budget and has zero radar illumination at the aligned target. It is not substituted as B. At default4+4 alignment, C illumination8, A4, separate witness2, B undefined
- NR=1 with nonzero user channel and positive radar power: nullity0, so this fixed strict-null radar subproblem is genuinely infeasible
- Zero channel: q=1; no null constraint. Zero radar budget: no normalization needed at representable q, including exact q=0. Zero communication budget: split desired power0
- Near alignment: centered complex expm1 residuals preserve positive q; q≈π²delta²(NR²−1)/12. At delta=1e-12, q≈1.23370055013617e-23 and B's radar target power≈2.46740110027e-23. Normalize residuals with a scale-safe hypot before multiplying sqrt(PR)
- Near opposite endfire: endpoint-preserving periodic difference avoids falsely rounding distinct directions into exact alias
- Positive subnormal q and squared-norm underflow raise RangeError with code NUMERICAL_RANGE. They are not epsilon-normalized, silently discarded, or called geometric infeasibility. Examples: target_u1e-155 and1e-200 error;1e-154 remains supported. Every evaluation computes q, including zero-radar-budget configurations, so the same extreme numerical diagnostic limit applies there
- Analytical target identities are primary. Corresponding `_direct` values preserve cancellation-limited complex-vector diagnostics. Main pattern samples are direct evaluations, with possible numerical null residue, not physical leakage estimates
- QoS equality uses `numerical_boundary`; platform-sensitive raw `qos_met` is not used for the UI pass/fail label
- JS caps n at128 because it materializes dense covariance matrices; the lesson uses8. Public helpers validate finite dense complex arrays and dimensions. Derived overflow is an explicit numerical-range error, not NaN/Infinity silently serialized as null

## Reproducible numerical artifacts

No third-party JavaScript dependency or network request is required.

From repository root:

```sh
node scripts/validate-shared-array.cjs
node --test tests/shared-array-core.test.cjs tests/shared-array-ui.test.cjs tests/shared-array-integration.test.cjs
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
git diff --check
```

The public Python standard-library reference is independent of the JS runtime. From `scripts/shared-array-reference`:

```sh
python3 -m unittest -v test_reference.py
python3 reference.py --fixtures ../../data/shared-array-fixtures.json
```

Frozen reference, tests and fixture hashes are in the public manifest. The 14 fixtures cover default, alignment, subarray orthogonality, both near-alignment signs, one-element radar, unequal grouping, zero radar budget, zero communication budget, zero channel, exact opposite-endfire alias, equality boundary, near-endfire nonalias and nonzero-user near-alignment. Two more entries specify numerical-range errors. The frozen Python witness uses a scalar for its first real-only radar weight; JS consistently represents it as [real,0]. The parity validator adapts only that encoding; the fixture stays byte-identical.

The frozen Python suite passed28 tests including600 seeded states. A separate research-reference audit passed33,578 checks before implementation. Neither pass automatically validates the JS port. The actual JS has its own fixture, randomized algebra, covariance, helper-domain and renderer regressions, plus a separately executed independent actual-output audit.

## UI verification scope

`tests/shared-array-ui.test.cjs` executes the real core, renderer and shared bounded-record helper against a minimal DOM. Its16 tests cover all controls and presets, raw-vs-restored accounting, both plot selections, actual complex-factor data, coherent aperture counts, all analytical/direct labels, invalid input cleanup, missing dependencies, numerical-range errors, repeated reset, stable downloads and disclosure remeasurement. SVG coordinate checks include220,259,291,323,375,600 and1000 CSS-pixel widths; explicit SVG heights prevent hidden or zero-height plots. Axes remain0–8 linear, without per-curve peak normalization; raw is excluded from main spectra. Antenna power uses its own explicitly labeled0–.5 axis and .125 diagnostic reference.

All controls are native label-associated input/select/button/details controls. No animation, timers for simulation, parameter upload, optimizer or external script is added. Display selection does not change scientific recipes or budgets. Invalid input clears all old diagrams, values, record preview and download availability. B's undefined/infeasible states remove B curves and per-antenna bars while preserving other valid recipes. All deep sections begin collapsed. The exact numeric input remains authoritative for tiny preset values; a range control's visual position is not treated as the exact stored number.

The existing `experiment-record.js` bounds on-page JSON previews to12,000 characters, records omitted array items explicitly and keeps complete data for local Blob download. Full downloads include all weights, covariance entries, resources, target components, direct diagnostics and361 samples per feasible recipe; no raw internal working files are included.

These are numerical/structural/minimal-DOM checks, not browser-layout, assistive-technology, local HTTP network, Pages deployment, live-download or real-radio certification. Browser and published-site checks remain separate release steps; this implementation report makes no publication claim.

## Final local execution record

Final local execution on 2026-10-11:

- Full repository suite: 546 tests passed, 0 failed, including 33 shared-array core tests, 16 renderer/minimal-DOM tests and 9 integration tests
- Generator freshness and `git diff --check`: pass
- Portable fixture parity: 14 cases, 13,148 numeric checks, 6,898 structure checks and 2 expected-error checks. Maximum primary relative difference 3.7347425876521215e-16; maximum absolute difference 8.526512829121202e-14 (absolute direct diagnostics included)
- Public frozen Python reference: 28 tests passed, including 600 seeded states; fixture regeneration is byte-identical
- Independent actual-JS audit: 148,162 mathematical/directional/source cross-checks on 209 requests and 24 randomized covariance cases; 52 input/helper guards; 21 static scientific/source-content checks; zero failures
- Audited core SHA-256: `4642fbf9f2f054052119f6944bc2c6f20a4f16390167c8017b7887bfa5fd0bd6`

The [portable independent audit package](../scripts/shared-array-independent-audit/README.md) includes its deterministic input requests, separate high-precision oracle, actual-core adapter/runner, static and guard scripts, compact results and hashes. It uses NumPy and mpmath; these are validation-only requirements, not website runtime dependencies. Core, numerical-reference, implementation UI, static-source and live-browser claims remain separate. No browser or deployment result is claimed here.

## Published release and actual browser checks

Completed 2026-10-11 UTC. PR #36 merged as `e2af92bb76ed1d17dd52737e68f6849e30c62a34`; Pages run `38119871823` succeeded for that exact commit. All 47 remote changed files matched frozen release manifest SHA256 `6bf6ef23d4c9c5d08822177d12c79728dd7e6d89327a202547757cc5019d161d`. Full 546-test suite, generator freshness and whitespace checks also passed independently before release. No live HTTP byte-hash comparison is claimed.

Actual cloud Chrome checks covered desktop 1165 CSS pixels and narrow 323 CSS pixels at 150% desktop zoom, not a physical phone. Verified default A/raw/B values, both shared recipes, exact alignment with a separate nullspace witness, NR=1 infeasibility, ±1e−12 near-alignment, orthogonal preset and 6+2 grouping. The latter correctly labels SINR=20 as a numerical boundary, not a clear pass. Invalid u=2 cleared all five SVGs, stale values and download availability. Native range End selected u=.9; repeated reset restored default geometry, partition, selected shared recipe, collapsed disclosures and empty preview.

On the narrow layout, main SVG widths were about 267.6 pixels and optional chart widths 247.1 pixels; every visible chart text bounding box fit its SVG. Document scroll width equaled client width. Screenshots confirmed physical antenna labels, fixed-scale direction curves, legends and body readability. Native opening of disclosures remeasured initially hidden plots. The 11,589-character preview was valid JSON and explicitly omitted 361 samples per curve. Keyboard scrolling retained focus, and a complete JSON browser download event succeeded. Downloaded blob bytes were not independently reread from the browser filesystem; separate renderer/core tests cover export contents.

The existing paper-card link opened initialized #experiment, and knowledge-map search for 置零 exposed the spatial-design concept with a working deep link to initialized #question. This confirms route operation, not that the two entry roles are identical. The browser was restored to 1165 CSS pixels and 100% zoom. Sampled errors were browser-extension metadata errors only, with no website-origin error in the sample. No other browser engine, physical phone, actual screen reader, print, no-JavaScript or real-radio audit is claimed.
