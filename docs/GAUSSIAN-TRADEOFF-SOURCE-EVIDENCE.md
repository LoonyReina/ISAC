# Gaussian-channel ISAC: complex-matrix source and evidence boundaries

This document records the local integration of a bounded Bayesian complex-matrix lesson, [Gaussian waveform and covariance tradeoffs](../gaussian-tradeoff.html#question). The existing [real-scalar CRB prerequisite](../theory.html#crb-mechanism) remains a separate, unchanged scientific model. Both lessons use the existing canonical `supplement-case-crb` identity for arXiv:2204.06938v8. This paper is distinct from the [point-target CRB beamforming paper](../crb-beamforming.html#paper). The inventory still contains **35 primary-paper identities and zero full-paper reproductions**.

Independent reference acceptance, JavaScript/Node Worker acceptance, local teaching integration, and actual-browser acceptance are separate scopes. Copying the reports below preserves their original evidence; it does not constitute another numerical replay. Browser acceptance and publication remain open.

## Fixed source and operational mathematical authority

Yifeng Xiong, Fan Liu, Yuanhao Cui, Weijie Yuan, Tony Xiao Han and Giuseppe Caire, [On the Fundamental Tradeoff of Integrated Sensing and Communications Under Gaussian Channels, arXiv:2204.06938v8](https://arxiv.org/abs/2204.06938v8), 7 June 2023; first submission 14 April 2022. The independently reviewed fixed PDF is 27 pages, 1,295,124 bytes, SHA-256 `8bfc316c0faf57c42a8cf2395a1bce594a9f987750f37287680fdb9e190dc342`. The [source audit](../scripts/validation/gaussian-tradeoff/SOURCE-AUDIT.md) records source identity, inspected rendered pages and equation-by-equation scope. No paper PDF, extracted paper text, source figure or author code is redistributed.

The implemented specialization is the linear complex matrix-response model from §V-B. It retains the source (2)–(4) communication/sensing observations, (48) covariance-shaping objective, (95) conditional Bayesian error, (99)–(100) finite-Wishart/MP comparison, and (110)–(112) Gaussian-input and covariance outer pairs. The source (56)–(57)/(111) general-MIMO Stiefel rates are high-SNR asymptotics. They are not implemented as finite-SNR general-MIMO mutual information or used to certify an achieved region.

The source has confirmed inconsistencies. The operational model is independently derived from the actual proper-complex likelihood, with source (48) and the independently checked (95) inverse trace:

- Rendered Eq. (109) has a positive rate term, unlike the sensing-minus-rate objective in (48). The positive-sign counterexample remains in offline evidence; the implementation does not silently rewrite it or fit it to a figure
- Eq. (93)'s printed coordinate transformation negates the imaginary coordinates even though (92) names positive imaginary coordinates. Literal Eq. (94) can have nonzero imaginary entries despite describing a real-parameter Fisher matrix. The full real Fisher matrix is derived directly from the likelihood; trace agreement alone would not validate the printed coordinate matrix
- A proper CN(0,σp²) prior gives each real component variance σp²/2 and real prior information 2/σp². The nearby printed prior statement omits this factor. The direct real likelihood and prior, rather than that literal statement, define the posterior and Fisher calculation
- Table II's lowercase Pt/σ²=24 dB does not explicitly resolve its relation to the per-antenna PT in expected trace M·PT. Both total-power and per-antenna interpretations remain available. Visual similarity to Fig. 10 is not author confirmation or a normalization-selection rule
- R=XXᴴ/T is the normalized sample covariance. Eq. (101)'s componentwise population-eigenvalue MP construction remains an uncertified general-covariance diagnostic, not a general spectral law or performance certificate

## Actual matrix model, optimizer and estimator

The communication observation is Yc=HcX+Zc; sensing uses Ys=HsX+Zs. X is an M×T complex block, Hc is Nc×M and Hs is Ns×M. Hc, X, prior/noise variances and resource settings are known where their respective design or estimator requires them. Hs is the unknown complete complex response, with independent isotropic proper-complex Gaussian coefficients. This is not an angle/range estimator or an arbitrary prior-covariance model.

The sensing estimator uses actual X and Y, never target truth. Its conditional posterior mean is YXᴴ(XXᴴ+σs²/σp² I)⁻¹. The conditional total complex-coefficient Bayes error is Ns·tr[(I/σp²+XXᴴ/σs²)⁻¹]. In this linear proper-Gaussian model that expression equals the Bayes MMSE; finite-trial empirical MSE remains a random estimate. The inverse is taken for each actual waveform before averaging. The full 2MNs-real-coordinate Fisher matrix, its inverse trace, and the row-acting versus column-vector posterior-covariance convention are independently checked.

For W=Q/PT, δ=σs²/(Tσp²PT), and A=Hc√(PT/σc²), the finite-κ optimizer solves tr[(W+δI)⁻¹]−κ ln det(I+AWAᴴ), W PSD and tr(W)=M. Its full complex gradient is G=−(W+δI)⁻²−κ Aᴴ(I+AWAᴴ)⁻¹A. Convexity supplies the supporting-plane gap tr(GW)−Mλmin(G). The eigenbasis implementation is checked using this complete matrix gradient and noncommuting PSD competitors. Continuous finite κ is actual source-derived covariance shaping, not a toy power-allocation table. Only the separately named communication-only endpoint uses water filling. A user-supplied custom covariance is not assigned an optimizer certificate.

The numerical gate rejects inverse condition numbers above 10¹², relative shaping gaps above 10⁻⁸ and relative shaping power errors above 10⁻¹⁰. It reports failure rather than changing the prior, loading a matrix, dropping a positive mode or weakening a threshold. Binary64 certificates are numerical evidence, not rigorous exact-arithmetic interval proofs. The syntactic input budget does not promise that every extreme legal combination is numerically well-conditioned.

## Five distinct kinds of output

1. Gaussian-input MI is the exact model log-determinant expression, evaluated numerically in bits per complex channel use. Signal-eigenvalue log1p avoids tiny-SNR cancellation. It is not a finite-code decoder result
2. The covariance outer pair combines Jensen sensing and Gaussian-entropy rate. It is not generally a jointly achieved rate–error pair
3. Gaussian/Stiefel waveform averages and truth-only estimator MSE are finite Monte Carlo estimates with raw per-block values, count, seed, mean and SE. Pointwise normal-approximation intervals are not exact expectations or simultaneous confidence bands
4. Finite-dimensional isotropic Wishart expectation is an exact model formula evaluated by numerical integration. MP is a separately labeled approximation, not the finite-Wishart answer
5. Rank-one complex-sphere finite-SNR MI is a separate numerical integral, with radial mass, refinement and tail-probability diagnostics. It does not implement general-MIMO finite-SNR Stiefel MI. An omitted probability bound is not an omitted-entropy error bound

Gaussian blocks have the prescribed expected covariance and fluctuating energy; they are never normalized after generation. Random Stiefel blocks have a fixed sample covariance and block energy when rank(Q)≤T. They need not have zero communication information. A single deterministic known waveform has zero data MI. These statements are not interchangeable.

Every positive covariance mode is retained. If rank(Q)>T, Gaussian signaling still runs with a proper prior, while Stiefel is explicitly unrealizable. Proper-prior structural null directions retain their prior-limited error. Standalone improper-prior posterior inputs require identifiable rank and fail on ambiguity; finite unregularized Gaussian inverse means additionally require T>M. Failed or unexcited directions are not removed from a successful-looking average.

## Frozen numerical reference and finite experiment counts

The [independent numerical review](../scripts/validation/gaussian-tradeoff/INDEPENDENT-NUMERICAL-REVIEW.md), SHA-256 `561e29e27b487cda2486108f36aed0e6730033a95bb219058307d520c504f5cc`, accepts reference core `b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2`. It independently replays all ten numerical JSON/NPZ artifacts byte-identically and verifies all 9,216 covariance solutions and 2,359,296 waveform evaluations. The owner record verifier passes 27,803 checks. The independent maximum relative matrix supporting gap is 8.371×10⁻¹⁴ and maximum normalized waveform-mean discrepancy is 1.122×10⁻¹⁴.

**Fig. 4 is the selected named finite-size experiment.** There are 39 configurations: M=Ns in {2,4,6}, T=4M, Q=I, sensing noise variance 1 and prior precision 0.01–100. The reference uses 16,384 Gaussian blocks per M, reused across thirteen prior settings. All 39 finite integrals agree with a separate 90-digit exact-polynomial/E1 oracle within about 1.34×10⁻¹⁵. Maximum relative finite-integral/MP difference is 0.234538%; this is approximation discrepancy, not an integration tolerance. Maximum standardized Monte Carlo discrepancy is 1.7727. Reusing blocks correlates grid points; these are not 39 independent Monte Carlo experiments.

**Fig. 10 is a bounded configuration and normalization audit.** It has two power conventions × two independent seeds × 256 channels × nine covariance weights, with 256 Gaussian blocks per channel/weight. This gives 9,216 covariance solves and 2,359,296 waveform/covariance evaluations, but only 512 unique fading channels and 131,072 independent base waveform draws. Common draws are deliberately reused across weights and power conventions. The work does not reproduce author-supplied ordinates, which were unavailable, or optimize arbitrary p(X).

The communication-only endpoint retains deep-fade rank loss: 51/256 and 47/256 channels under total-power interpretation, versus 13/256 and 18/256 under per-antenna interpretation. Unexcited sensing directions remain in the proper-prior error. Eq. (101)'s positive-eigenvalue diagnostic records its valid subset explicitly and never relabels it as the full Gaussian average. Original channel samples, seeds, solver rules, weight grid and precise power clarification are not supplied by the source; reference choices remain declared choices.

The teaching example is separate: M=4, Nc=3, Ns=2, T=8, PT=1, communication/sensing noise variances 0.7/1 and prior variance 1.3, with a reviewed complex DFT-basis channel. It is neither Fig. 10 nor Fig. 11. The independent offline teaching audit checks actual observations, posterior, squared error, six matrix-shaping points, Wishart and sphere integrals; it adds no paper-figure or browser acceptance count. The browser lesson's editable block count is not the offline teaching audit's fixed 2,048 blocks per law.

## Frozen JavaScript and actual Node Worker evidence

The [independent port review](../scripts/validation/gaussian-tradeoff/INDEPENDENT-PORT-REVIEW.md), SHA-256 `167fc761ff93b4f89b5bc7e59e2f3392e325c133306c96cf9614ac161c4f7a57`, accepts the exact seven-file runtime freeze `ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113`. Runtime input presets contain matrices/settings, not output ordinates. The live kernel computes fresh results without loading a result table or Python runtime.

The independent numerical audit includes 266 fresh numerical checks, 360 legal-boundary shaping certificates, 70-digit rechecks of the ten worst binary64 certificates, 38 held-draw/truth-isolation checks and nine tiny-rate regressions. It separately verifies nine Wishart cases with a 420-digit moment recurrence and eight sphere cases with a different direct output-density integral. All M=1…6, varying model parameters, arbitrary complex channels and noncommuting covariances are represented. Boundary maximum independent relative gap remains below 1.54×10⁻⁹, under the unchanged 10⁻⁸ gate.

The source-free archive-derived owner replay passes 2,382 numerical comparisons, 61 integral/preset cases, 366 stress cases, 1,986 NumPy evidence comparisons and 37 codec/Worker tests. These are different scopes, not additive paper-experiment counts. Three numerical evidence records replay byte-identically; elapsed-time reports are expected to differ. Independent review also checks exact teaching/Fig. 10 channel provenance and the complete 39-point Fig. 4 input grid.

Preserved defects include low-SNR water-level cancellation, extreme-parameter μ-bisection resolution, a dropped progress count and Worker-factory option-validation order. The accepted fixes improve algebra or ownership without relaxing certificates or deleting difficult modes. Initial failures remain in the review evidence. Two corrected reviewer-oracle errors are explicitly separate from implementation defects.

Actual Node Workers exercise fresh kernel execution, progress, cancellation/recovery, valid-only supersession, rejection-preserves-current, death/restart and raw/history round trips. Immutable canonical tagged JSON preserves signed zero and valid Unicode while rejecting unsupported objects, accessors, dangerous keys, nonfinite values and excess budgets. SHA-256 binds the owned record bytes; it does not independently prove scientific truth. A raw-input import must be explicitly recomputed for fresh output. A history import stays historical/non-fresh even when its hash verifies.

Twenty-five seeded simulated transport schedules settle 1,222 run promises exactly once. The browser-module loading branch is exercised in a Node VM separately from worker_threads. Neither simulated transport nor a Node VM is an actual browser. The wall-clock guard is cooperative rather than hard preemption. Node time/export-size observations do not establish browser response, memory or painted-result latency.

## Accepted local lesson and download review

The [independent lesson review](../scripts/validation/gaussian-tradeoff/INDEPENDENT-LESSON-REVIEW.md), SHA-256 `6aad7a0ebeab3916dec8acbd5d0a5e66801a3d0196ec85844288c7c997f78cfb`, accepts the exact lesson freeze `c4d52b780e100daaed3fe7ba5259eb57135af076e40cdd00da3ae4e850d2e41f`. It verifies 103 frozen owner files and 47 portable-capsule members, 45 author tests, nine independent lifecycle scenarios, 50 view/record checks, 716 independent Python checks on 50 actual downloaded files, 50 bitwise fresh replays and 37 runtime regressions. The owner export matrix separately contains nine cases and 18 paired raw/history records, including M=Nc=Ns=6, T=32, B=512. These overlap with reviewed evidence and are not summed into new paper-experiment counts.

The review found and retained initial UI lifecycle/label defects, then rechecked their corrections on the exact final bytes. It uses actual Node Workers, controlled mounted DOM events, actual download callbacks and independent matrix/integral oracles. It does not establish real-browser rendering, navigation, accessibility, CSP/MIME, device performance or publication acceptance. Final integration/build/release receipts remain external to the immutable teaching/source evidence to avoid self-referential source changes.

## Resources and optional archives

Tradeoff bounds are M,Nc,Ns≤6, T≤32, 2≤B≤512 and 1–16 weights, finite κ≤10⁶ plus the communication-only endpoint. The joint work budget is B·(weights + optional custom Q)·M·T≤1,600,000. Wishart and sphere requests have separate finite caps. Every actual dimension, power interpretation, prior/noise value and seed remains in the record. No physical RF bandwidth, aperture, sampling duration or joule conversion is inferred from this complex discrete model.

The [machine-readable evidence map](../data/gaussian-tradeoff-evidence-map.json) records the public archive identities and exact source/review provenance. These are manual optional downloads, never startup dependencies:

- [Frozen source-free Python reference](../data/gaussian-tradeoff-reference-frozen-v1.tar.gz): 3,214,140 bytes, 33 regular members; SHA-256 `235619c80cc0ebf8551138a1ef241adefacddb0f15a79ca973718fb5ccd5481c`
- [JavaScript runtime](../data/gaussian-tradeoff-js-v0.1-runtime.zip): 48,897 bytes, 14 members; SHA-256 `41466405b1e72bb1bee681cf4c8ca0c9dfe638fc59dd7089a4698f8a2aedeaf4`
- [JavaScript full evidence](../data/gaussian-tradeoff-js-v0.1-full-evidence.zip): 449,666 bytes, 42 members; SHA-256 `b5ec92cbb3745e418b08d3a13888bb528235a265a4e6cba5f697b74f5524e5bd`

The independent reference review checked all 32 manifest-listed files plus the manifest. The independent port review checked 231 packaging assertions, the full package's 41 manifest-listed files plus manifest and the runtime package's 14 files. The archives contain original implementation/test code, audits and generated numerical evidence, not third-party paper assets or copied author software. These finite provenance checks are not generic security certification.

## Remaining gates

Actual browser loading, JavaScript MIME/CSP, module Worker lifetime, page navigation, controlled input/error handling, rendering, narrow-screen layout, keyboard/screen-reader access, download/reimport and control-to-painted-result timing need their own acceptance. No browser execution, remote activity, deployment or publication is claimed here.

The full paper, arbitrary input-law optimum, certified full achieved region, general-MIMO finite-SNR Stiefel MI, Figure 11 null-space completion, complete author-figure reproduction, nonlinear angle/nuisance models, arbitrary priors, finite-length communication, channel-acquisition overhead, hardware and measured data remain outside the accepted implementation. A successful solve, a small numerical certificate, a stored history or a locally functioning lesson cannot close those gates.
