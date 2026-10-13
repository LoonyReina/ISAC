# Pilot-pattern reference contract v1 (frozen before experiments)

2026-10-13. Existing identity: `supplement-case-pilot`. Independently authored bounded interpreted standard-resolution core, not exact Fig.10/Fig.23 reproduction, IAA/MUSIC, measured-data validation, or whole-paper completion. Independent acceptance is pending. No browser/site change is included.

## Provenance

Governing source: [arXiv:2401.09643v3](https://arxiv.org/pdf/2401.09643v3), 16 pages, 1,659,815 bytes, SHA-256 `c10f53d9e16777c9811100efb3124ff274a57759ca318d76c45aff293620a058`. The paper itself and extracted text stay outside this source-free bundle. The previous selection review and source manifest were fully read. Official paper-specific code/commit/license was not located in the bounded source search; no external code is executed or copied. Formulas are independently implemented in NumPy.

## Signal and receiver contract

N full tones, S comb spacing, K=N/S occupied tones, J integer symbol spacing, M consecutive RS indices i=0,...,M-1, F_i in [0,S), tone k=mS+F_i, useful duration Ts=1/df, sample dt=Ts/N, B=N+Ncp, CP-inclusive T=Bdt. Each independently drawn known QPSK pilot is nonzero. Sensing-symbol off-mask tones are zero, unless an explicit mismatch is requested. x[n]=sum_k X[k]exp(+2pi j k n/N), no orthonormal synthesis. Every symbol gets the actual final Ncp useful samples as CP.

The generated linear frame contains a full unknown preceding symbol, sensing blocks at indices iJ, and independent full-tone unknown gap symbols for J>1. A zero extension applies outside this finite frame. Integer delays are noncircular whole-frame sample shifts. Fractional delays use exact continuous complex-exponential evaluation inside each finite, half-open rectangular CP-added symbol; symbols may jump at boundaries. This is a declared baseband pulse model, not a circular frame shift, interpolation shortcut, physical pulse-shaping claim, or author-supplied waveform.

Slow-time propagation multiplies each delayed path by exp(+2pi j f bT) throughout receive block b, with b=0 at the first sensing symbol's CP start. This matches source Eq.(9)'s phase at sensing block b=iJ. Continuous-Doppler stress uses exp(+2pi j f t) with t=0 at that same CP start and varies every sample. Path delay, Doppler and gain are generator/evaluation inputs only. Add proper complex independent time noise CN(0,sigma_t^2) after path summation. Noise seed is explicit.

Receiver API accepts only raw y, known pilots, known offsets, N/Ncp/S/J/df, symbol starts and a user-chosen ell. It never accepts scene truth, path count, unknown preceding payload, or an ideal channel. Changing evaluation truth while retaining y cannot change output. Receivers ell=0 and ell>0 receive exactly the same y array and noise hash. Different patterns necessarily produce different y; common geometry and noise draws do not make them the same observation.

Retain L=N(S-ell)/S samples beginning at symbol CP start+Ncp+ell N/S. De-rotate by exp(-2pi j F_i(ell N/S+r)/N), use FFT_L/N, select b=(S-ell)m, map to tone k=mS+F_i, restore N/L and divide by known pilot. Equivalently H=FFT_L/(L X) at selected bins. Source guard claim holds for 0<=delay<=min(Ncp+ell N/S,N); ell is never selected from unknown target truth. The ideal recovered model is sum_h alpha_h exp(-2pi j k delay_h/N)exp(+2pi j f_h iJT). Numerical validation uses an independently evaluated formula, not the waveform generator.

## Noise and energy

For row vector a_m[r]=exp(-2pi j F_i(ell N/S+r)/N)exp(-2pi j (S-ell)m r/L)/(L X_i[m]), recovered noise covariance is sigma_t^2 A A*. Different selected bins are orthogonal: diagonal sigma_t^2/(L |X_i[m]|^2), zero cross-bin covariance. Different blocks use disjoint samples, so cross-block covariance is zero. Unequal pilot powers must be retained. Before scale restoration, FFT_L/N variance is L sigma_t^2/N^2. Noise cost versus ell=0 is N/L. Between receiver settings using the same y, noise is correlated; paired statistics operate at frame level.

All generated block frequencies are scaled together so measured CP-inclusive energy across the entire finite frame, including the preceding/gap symbols, equals its sample count (unit average transmit power). Report useful/CP/preceding energy, selected sensing energy, occupied sensing RE, allocated band Ndf, actual occupied span, frame duration, first-to-last RS spacing, retained counts and actual retained transmit energy. This is equal frame energy, not equal per-RE power. SNR is mean clean receive sample power over all M full B-sample sensing blocks divided by sigma_t^2. For paired A/D trials one fixed reference plane is D's noiseless full-block mean power; both receive the same variance and standardized noise draw.

## Coherent processing and ambiguity

Complex sum Z(tau,f)=sum_i,m H_i[m]exp(+2pi j k tau/Ts)exp(-2pi j f iJT). Rectangular windows, no data-dependent weights. Store raw |Z|^2 and power normalized by (MK)^2, never renormalize each map to its own peak. Delay IFFT over zero-filled tones followed by slow-time FFT agrees with direct sums at tau=aTs/Ndelay and f=b/(Ndop JT), including negative b. Zero padding changes sampling density only.

Finite exact-alias diagnostic: after arbitrary common complex gain is removed, enumerate kappa1=1,...,S-1 and kappa2=0,...,S-1 satisfying i kappa2-(F_i-F0)kappa1 ==0 mod S. The physical differences are delta_tau=kappa1 Ts/S modulo Ts and delta_f=kappa2/(SJT) modulo 1/(JT). Include the universal periods Ts and 1/(JT) when checking a rectangle's pairwise difference domain. M=1 has continuous unobserved Doppler; M<=2 cannot receive a full uniqueness certificate. The result is an exact ambiguity diagnostic, not finite-SNR performance or super-resolution estimation. Linear F_i=(pi+F0)mod S has tilted replicas delta_f=p delta_tau/(Ts JT)-z2/(JT). No assertion that D removes every 2D alias.

## Source discrepancies: literal behavior remains testable

1. p.6 after Eq.(12) prints bS/(S-1)+F. General-ell derivation requires bS/(S-ell)+F; literal agrees only ell=1. Counterexample S=4,ell=2,m=1: literal tone 8/3+F, required 4+F.
2. p.7 Eq.(15) phase qiJ/M and f=q/(MT) is a literal physical-frequency evaluation but not the ordinary M-point slow-time FFT grid when J>1. Natural grid q/(MJT); M=4,J=2 gives only two distinct literal phase rows. Both physical evaluations are tested.
3. p.7 Eq.(14) observed-nonzero mask is unsafe under noise/cancellation. Use known transmitted mask and nonzero known pilots. Exact zero recovered cells remain observations; off-mask noise is never divided.
4. Staggering origins pi and p(i-1) coexist; explicitly record F0. A common offset changes only a common unit phase for exact aliases, not ambiguity magnitudes.
5. p.8 Eq.(21) extent (N-1)S+F conflicts with N full tones. Use K=N/S compact cells and separate N-tone zero-filled grid.
6. pp.8-9 exclude kappa2=0 in one sentence but Eq.(28) allows integers. Include zero (constant patterns otherwise falsely pass). Prime-S statement about D conflicts with substitution kappa2=p kappa1; retain S=3,F=(0,1,2) witnesses (1,1),(2,2).
7. p.13 Table I synthesized-pattern existence wording remains unresolved/out of scope; no synthesized, irregular or IAA result claimed.
8. Symbol-constant Doppler approximation and continuous-Doppler error remain separate; broad ideal ambiguity domain does not validate a broad physical high-Doppler regime. Plot delay, not inferred monostatic range.
9. Original figures do not supply complete N/CP/M/pilots/scene/noise/windows/preceding symbols/IAA settings. Every experiment choice below is project-owned.

## Preregistered experiments and acceptance tolerances

Fig.10 relationship fixtures: N=96,Ncp=12,df=15000,J=1,S=4,ell=3. A=[0,0,0,0], B=[0,2], C=[0,2,1,3], D1=[0,1,2,3], D3=[0,3,2,1]. Also repeat every pattern to common M=12 (B repetition is an adaptation). Test scene (delay=0,f=0,alpha=1) and (delay=7,f=-375,alpha=0.8+0.3j). Evaluate lattice in differences tau in [-Ts,Ts], f in [-1/(JT),1/(JT)]; distinguish exact equal-height aliases from sidelobes. Grid 192 delay by 192 Doppler. Selected half-open rectangles are validated through strictly interior pairwise differences.

Fig.23(a-c)-structure: N=96,Ncp=12,df=15000,S=6,M=24,J=1,ell=5; delays [3,20,36,72] samples; Dopplers [0,-400,400,800] Hz; complex gains [1,0.75exp(0.4j),0.55exp(-0.7j),0.4exp(1.1j)]. A all-zero offsets versus D=i mod 6. Compare A/ell5, D/ell5 and identical D y/ell0. Guard limit 92 samples and retained length 16. Also sweep every ell on identical D y. No author-setting or exact figure claim.

Stress cases retain all failures: continuous Doppler at scene frequencies and separately at 6000-Hz offsets, fractional delays +0.375 samples under declared rectangular pulse, non-RS payload, one delay 93 (beyond ell5 guard), and zero signal. Fractional delay is a supported declared model, not automatically expected failure; high Doppler/payload/beyond-guard are expected mismatches.

Noise study: 200 paired frames at SNR 0,10,20 dB, immutable master seed 20261013. Same clean observations, independent noise per frame, common noise across A/D and ell settings. Fixed scenario, not random-scene generalization. Frame-level paired mean NMSE differences and t-like 95% intervals mean +/-1.972*sample_sd/sqrt(200), transparently approximate. Empirical covariance uses 12000 independent draws in small cases, with fixed statistical tolerance 6/sqrt(12000) in dimensionless entries plus numeric floor. No exact detection probabilities.

Truth-blind peak picker: at most 8 candidates, local maximum in nonperiodic search rectangle tau=[0,Ts), f=[-1500,1500], 0.5-sample delay spacing, 25-Hz frequency spacing, greedy suppression within 2 samples AND 150Hz, and power at least 0.05 of map maximum. Evaluation-only one-to-one greedy closest normalized-distance assignment, accept <=2 samples AND <=150Hz. Report matched/missed/false candidates, denominators, and conditional errors. Mainlobe exclusion for sidelobe report uses the same fixed 2-sample/150Hz boxes around truth (evaluation only). Exact aliases are reported separately. These are finite-grid candidates, not calibrated detections.

Deterministic well-scaled residual tolerance 1e-10 relative plus 1e-12 absolute. Integer congruences exact. Tests cover every valid tiny N in {12,24}, S in {2,3,4,6}, ell and offset, independent direct synthesis/DFT, guard boundaries, zero/cancellation, J>1, sign/normalization, covariance, dataflow and mutation sentinels. Time budget 5 minutes for first full experiment run, source-free bundle <=150MB; no large sweep or artifact increase without parent decision. Independent review outcome required before browser port.

## Pre-execution audit addendum (2026-10-13 11:02 UTC)

Independent source auditor identified two further literal defects before numerical experiments: p.6 Eq.(13) omits j in its delay exponential; p.7 prose following Eq.(18) excludes zero-coordinate alias cases and prose after Eq.(19) mixes axes/bin factors. Implement unit-modulus complex delay phases as derived from Eq.(12)/(14), retain a literal-real-exponential mutation, and include pure-delay/pure-Doppler aliases. These are project interpretations, not author errata.

The finite congruence reduction also requires at least two occupied tones K=N/S>=2. K=1 lacks the within-symbol adjacent-tone constraint and is explicitly uncertifiable by this scanner. M=1/2 restrictions above still apply. No claim to K=1 identifiability is made.

## Independent-gate candidate tie correction (2026-10-13 11:16 UTC)

The initial candidate picker sorted powers as exact floats. An independent numerically equivalent transform permuted exact-alias peaks at ~1e-15 relative power, changing the bounded candidate list and evaluation counts. That initial output is retained as `results/experiments-pre-tie-correction.json` and is superseded, not accepted evidence for candidate counts.

Freeze this truth-blind numerical tie policy before rerunning: set epsilon=1e-12 times the map's maximum power (zero maps still return no candidates). A point is a local maximum if its power is no lower than each neighbor by more than epsilon. Sort candidate powers descending, form near-equal groups whose power differs from each group's highest value by at most epsilon, then rank within a group by ascending Doppler-grid index followed by ascending delay-grid index. Apply the existing suppression/threshold/8-candidate budget to that order. This policy addresses floating roundoff, not statistically unresolved targets; it does not use truth. Perturbations up to 1e-14 of maximum power must not change alias candidate coordinates or evaluation counts. Independent direct/FFT evaluations must agree under this rule. Numerical grouping within epsilon is explicitly part of the project-owned finite-grid candidate metric, not paper text.
