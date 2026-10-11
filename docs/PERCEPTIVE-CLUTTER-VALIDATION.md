# 递归复背景教学：模型、证据与验证

Date: 2026-10-11 UTC. This is an independent scalar mechanism lesson, not a complete perceptive-mobile-network implementation, real-radio measurement, detector, or original-paper figure reproduction.

## Fixed sources and conditional phase check

Rahman et al., *Framework for a Perceptive Mobile Network Using Joint Communication and Radar Sensing*. DOI https://doi.org/10.1109/TAES.2019.2939611. Publication identity: 2020 volume 56 issue 3, pp.1926–1941; 2019 online/preprint. Main inspected version is the UTS institutional Accepted Manuscript, 15 physical PDF pages including a copyright cover: https://opus.lib.uts.edu.au/bitstream/10453/137860/4/Framework%20for%20a%20Perceptive%20Mobile%20Network.pdf. Counterpart: fixed 14-page https://arxiv.org/pdf/1901.05558v1, submitted 2019-01-16. Hashes, page numbers, version differences and evidence boundaries are in `data/perceptive-clutter-sources.json`; no paper PDF, extracted text or page image is redistributed.

- PDF §III-A Eqs.(2)–(3) retain complex paths and unknown initial phase; §V-A Eqs.(22)–(23) discuss known-signal removal/error. A comparable complex channel estimate, not arbitrary modulated communication data, is the scalar input
- PDF §VI Eq.(30), UTS p.10 / arXiv p.9: elementwise recursive background update. Eq.(32), UTS p.11 / arXiv p.10: background-estimate noise variance, not residual-output noise variance
- Under the stated positive-frequency, forward-causal convention, alpha=.5, omega=pi/2, p=2, unit amplitude and zero initial phase, Eq.(30) gives background −.5+.25j; the printed Eq.(31) in these two fixed PDFs gives −.25+.5j. Equal magnitudes do not establish equal complex residuals. This independent conditional check is not an author-issued erratum, does not invalidate magnitude-only Fig.2, and does not establish an error in a separately typeset journal edition
- Automatically generated arXiv HTML shifts the three equations to (31)/(32)/(33); source locators here always mean the fixed PDFs
- Fig.2 is background tone-response magnitude; Fig.3 is a ratio inside the background estimate; Fig.11 is background reconstruction error; Fig.12 is angle/path-distance estimation. None is reproduced by this page
- The two editions' RCS assumptions differ. Fig.2's time annotation also does not match a straightforward substitution of §VII's symbol parameters. Neither ambiguity is silently repaired or imported as this lesson's physical setting

## Receiver, generator and fixed budget

Same user, subcarrier and channel-matrix element: x_p=C+A exp[j(phi+2pi f_D p T_h)]+n_p. UI fixes P=512, T_h=.002 seconds, b0=0; defaults alpha=.95, f_D=2 Hz, complex noise power .04, seed7319. C=4 exp(j.3), A=1, phi=1.1 are generator values. C/A/phi/f_D and decomposition are never inputs to the filtering operation: it reads x and alpha, with known initial state. Static does not inherently mean unwanted; removal depends on the sensing task.

The first observation is at .002 s, the last at 1.024 s; first-to-last span is 1.022 s. Conventional DFT bookkeeping window is 1.024 s and grid spacing .9765625 Hz; no spectrum is plotted. Sampling rate is500 Hz, with conventional complex unambiguous interval [−250,250) Hz. P=512 is not the paper's 512 subcarriers, and2 ms is not a fast-time interval, OFDM symbol or5G slot.

Background b_p=alpha*b_(p−1)+(1−alpha)*x_p; default r_p=x_p−b_p. Code computes equivalent alpha*(x_p−old) to avoid cancellation at tiny positive alpha. Advanced old-background output u_p=x_p−b_(p−1) shares the same state; r=alpha*u. Complex-plane and time-series background use the correct old state in that mode, including zero at p1. I/Q units are normalized channel amplitude; power is amplitude squared, not W/dBm. Multiplying or subtracting powers would change the mechanism.

All alpha/order comparisons retain identical observations and noise. Frequency/scenario changes alter the target, but preserve the noise realization; changing noise power scales the same standardized realization. Only explicit seed editing or the new-noise button selects another realization. The JavaScript stream is Mulberry32 uint32 with cached Box–Muller normals, I then Q per sample, U1=1−uniform in (0,1]. It is not Python random.gauss same-seed parity. Cross-language tests use explicit arrays. No extra training history, dropped startup samples, sampling/energy increase, data upload, or hidden steady initialization is used.

## Finite record, steady response and endpoints

Cold constant residual is C*alpha^p. Exponential memory tau=−T_h/log(alpha) differs from mean weight age T_h*alpha/(1−alpha). Static residual amplitude≤1% requires ceil(log(.01)/log(alpha)) updates:90/180ms at.95;919/1.838s at.995, longer than this record. Historical weights sum to1−alpha^p; they are not renormalized.

Continuous-tone transfer is the complex G=1−(1−alpha)/(1−alpha*exp(−j omega)), then power |G|². At defaults it is .18388094254534462 (−7.354632787895059dB). The full512-sample target energy ratio is .18716506923121343. These are different diagnostics. Truth decomposition is solely explanatory and not receiver separation. For stop/departure, the steady figure remains explicitly a hypothetical continuous-tone reference; the finite diagnostic uses the actual scenario.

Alpha0 updated output is exactly zero, including target/noise; old-background output can be nonzero. Alpha1 retains zero background forever and both outputs equal x, including DC. Zero gain is true−Infinity dB; memory at alpha1 is positiveInfinity. Exports retain nonfinite values as named strings, not null. There is no dB plotting floor or per-peak normalization. The transfer curve has common0–4 linear power-ratio axes for both timings. Complex plots preserve physical axes with a record-derived common bound and equal I/Q unit scale; they do not normalize each trace to its peak.

At f_D=0, the constant target is unidentifiable separately from static C in one coefficient. A500Hz tone aliases toDC at this sampling interval; UI main frequency is bounded±100Hz. Stop freezes target phase continuously after p256. Departure removes its contribution from p257, leaving a negative learned-background tail. No tail is called proof of a new object. For alpha>0, full finite complex residuals and known initial state form an invertible triangular transform; attenuation alone is not proof of lost Fisher information when transformed mean and full covariance are used.

## Noise and numerical safeguards

CN(0,sigma²) means E|n|²=sigma² and variance sigma²/2 in each I/Q component. The core evaluates finite V_b(p) with expm1 to retain precision near alpha1. Default-output diagonal variance is alpha²*(sigma²+V_b(p−1)); off-diagonal covariance is negative and nonzero in general. Full formulas are in the advanced lesson. The first4×4 matrix and p512 adjacent covariance expose temporal correlation; this is not white-noise CA-CFAR calibration. A frozen background applied to a future independent observation has different covariance; the page only simulates update instants.

Core supported bounds are1–4096 dense finite complex observations, component magnitude≤1e100, dt in[1e−9,1] s, |f_D|≤1e6Hz, alpha in[0,1], noise power in[0,1e6], uint32 seed and legal scenario/order/event. The UI is much narrower. Gain utility bounds |omega|≤2pi*1e6 and uses scaled complex division to avoid premature underflow for tiny omega. Unsupported/nonfinite inputs are rejected. UI committed invalid values clear every old plot/readout/record and disable download; reset restores valid defaults.

## Reproduce and executed scope

No new frontend/build dependency. Numerical/DOM tests need Node. The producer-independent finite-sum check needs Python standard library and Node. The separately written actual-code audit needs Python+NumPy+Node; its Monte Carlo needs Node only. These scripts do not install anything.

```sh
node scripts/generate-site.cjs --check
node --test tests/*.test.cjs
python3 scripts/validate-perceptive-clutter.py
python3 scripts/perceptive-clutter-independent/validate_perceptive_clutter.py --core ./perceptive-clutter-core.js --output /tmp/clutter-independent.json
node scripts/perceptive-clutter-independent/validate_perceptive_clutter_noise.cjs ./perceptive-clutter-core.js /tmp/clutter-noise.json
git diff --check
```

Executed against core SHA256 `298a998abbdc1aface1916cdc74ee2abef1213977337d5c2b41a82b907f02924`:

- 20 core tests passed: explicit complex fixtures,24 independent parameter summaries, direct triangular operators/covariances, unknown-truth separation, fixed-noise contract, alpha endpoints/tiny positive values, DC/negative/Nyquist/alias, stop/departure, power-first failure, full-record inversion and input rejection
- 17 renderer mock-DOM tests passed: all controls, both timings and correct phasor state, whole-record diagnostics, zero noise, explicit-seed/reset/repeat flows, invalid clearing, dependency failures, preview/full download, finite coordinates at widths220–1000 including323, and equal I/Q scaling. These are not actual browser or screen-reader tests
- Independent Python finite sums:16 operator cases,9216 covariance entries, six full512-record cases; maximum complex discrepancy3.56e−15, covariance1.39e−17; machine-readable `data/perceptive-clutter-validation.json`
- Separate numerical review:22 filter/operator cases,176 finite covariance comparisons,198 gain cases,18 full512-record simulations, explicit cross-language fixture and guard cases; max full-record discrepancy3.59e−15. Portable scripts, exact-hash outputs and synthetic fixtures are in `scripts/perceptive-clutter-independent/`
- Separate actual-JS Monte Carlo:160,000 independent trials, seed18373491, alpha.82, sigma².37, N7, p3/q6;12 mean/variance/covariance/properness checks, max absolute standardized discrepancy1.313 within declared5-standard-error diagnostic tolerance. This is a stochastic check, not a probability guarantee

Final full repository suite: 488/488 tests passed, no failed/skipped/cancelled tests; generator freshness and whitespace checks passed. Browser/publication results require their own later evidence.

## Integration and browser boundary

Only the existing perceptive paper card's caseId/readingPlan is activated. All nine influence/endorsement/social-discussion snapshots remain unchanged, including the OpenAlex DOI1 versus title-match295 incomparable split-record warning; no count refresh, summation or new paper card. Registry has23 units,12 cases,32 concepts,8 directions and7 active paper lessons. Original beginner entryUnitRefs and proposed real-research items remain intact.

Initial view inspects p16 (32ms) so the vector relation is visible; all512 observations and diagnostics still exist. Native controls, no animation, closed research disclosures, focus styles and explicit SVG heights preserve a simple first path. Preview is capped at12,000 characters by the shared helper; full JSON is produced locally, with every512-sample array. No huge raw record is inserted into the initial DOM.

This builder performed no browser use, commit, push or publication. A separate source/mock-DOM learning review prompted corrected time units, equal-scale I/Q, selected-time markers, truth-color definitions, continuous numeric steps and narrow-chart height fixes. Opening the initially hidden advanced disclosure redraws its plot at its newly measured width. Actual desktop/tablet/323px browser layouts, focused keyboard controls, repeat/reopen/download behavior, entry navigation, console and exact published resources still require the parent release check. No full network, multiple paths, range/angle estimator, detector/CFAR, RF chain, data-stripping drift, real-radio or paper-figure replication is claimed.

## Published release and actual browser verification

Completed 2026-10-11 UTC: PR #35 merged as `87737fd31a38d5116be8c64409ea24cd23fdc2a1`; Pages run `38117181735` succeeded for that exact commit. All 36 remote changed files matched the frozen release manifest (SHA256 `3eeb7618883d8d3bbb430e697c040e54bb61caf20278388bdc9c3542d1a9144d`). The full 488-test suite, generator freshness and whitespace checks passed independently before release.

Actual cloud Chrome checks covered 1165 CSS-pixel desktop and 323 CSS-pixel narrow layouts (150% desktop zoom, not a physical phone). Default p16 complex vectors, truth-only markers, equal I/Q scales, alpha .995/0/1, positive/negative/slow frequencies, both subtraction orders, stop/departure, early/full/late windows and p512 keyboard selection were exercised. The alpha endpoints displayed true zero/Infinity rather than plotting floors. Small noise values retained distinct scientific-notation axis labels. Invalid alpha=2 cleared all five SVGs and stale results and disabled download; repeated reset restored all controls and closed optional disclosures.

At 323 CSS pixels, all visible chart text bounding boxes fit their SVGs and document scroll width equaled client width. Opening the initially hidden noise chart redrew it at its actual width. Keyboard operation, disclosure toggles and bounded-record scrolling were checked. A valid 10,274-character preview identified omitted samples; a full JSON browser download event succeeded. Downloaded blob bytes were not independently reread from the browser filesystem; separate numerical and renderer tests cover complete export data.

The research-directory entry and new knowledge-map concept both opened initialized lesson anchors. The map search was exercised with native keyboard input and a visible search-result selection. Sampled non-extension browser errors were empty; the browser was restored to desktop size and 100% zoom. No live HTTP byte-hash comparison, other browser engine, physical phone, real screen reader, print or no-JavaScript audit is claimed. Exact remote files, exact deployment and actual live interactions were verified separately.
