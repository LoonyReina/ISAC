# Recovery boundary: 2026-10-18

This source contract records the historical algorithm and study protocol. Original SOURCE-HASHES.json, study.py, independent_oracle.py, raw.npz and RESULTS.json are unavailable. The historical1000-frame study cannot currently be replayed; its summary is retained as unverified historical material only. NEW bounded checks cover22 small independent numerical cases,6 paired live runs and11 mocked lifecycle checks, not the original study or browser QA. See [new bounded review](revalidation/README.md). The commands below describe the historical workflow and are NOT currently runnable from this recovered package.

---

# Missing OTFS MP-Ψ comparison branch

## Scope

A bounded actual implementation of the Gaussian-interference message-passing detector MP-Ψ, plus same-observation comparison to the unchanged accepted MP-G and full LMMSE. This is the previously missing baseline in Gaudio et al. arXiv1910.01896v1 §V-B/Figs6–7. It is a reduced source-algorithm experiment, not original figure reproduction, a full communication link, a new sensing estimator, or measured validation.

Primary originals:
- Target: https://arxiv.org/pdf/1910.01896v1 ; Eq14, §V-A/B/C, Figs6–7
- Algorithm: https://arxiv.org/pdf/1802.05242v2 ; §IV, Algorithm1, Eqs34–41; source table/simulation section chooses damping.7 for one ideal-pulse4QAM experiment, not universally
- Original author landing-page lookup https://ecse.monash.edu/staff/eviterbo/OTFS-VTC18/index.html redirected to a generic university page on this audit. No author code is asserted inspected or reproduced

Source hashes are in SOURCE-HASHES.json. Copyrighted PDFs/extracted text stay outside portable deliverable. Existing accepted kernel is byte-preserved as accepted-kernel.mjs with its recorded SHA256; no production edits.

## Source gaps and explicit completions

1. Eq40 multiplies likelihood factors individually normalized across symbols. That product is not itself a PMF. We explicitly normalize the final product across symbols (log-sum-exp); otherwise the paper's confidence test has no probability interpretation. This is a probability-consistency completion, not a verbatim printed-equation replay
2. Eq41 says update decisions when eta_i > eta_(i-1). We follow that literal previous-iteration comparison. Separately, confidence-drop stopping uses the historical maximum eta. We do not silently replace decision selection with best-ever confidence
3. Source gives no eta0 or fallback decision when no strict improvement occurs. We declare eta0=0 and retain the first-iteration posterior in that case, flagged fallback_used. Terminal-posterior decisions are separately reported as a fallback sensitivity diagnostic, not quietly substituted into source-algorithm outcomes
4. Gamma=.01 and50-iteration cap are our numerical settings; they are not recovered target-figure settings. Epsilon=.2 is from the original algorithm; damping.7 is source-reported for a particular original setting but not claimed optimal here
5. Outputting the selected iteration's normalized approximate marginal is our soft-output extension to a source algorithm whose stated output is hard symbol decisions. It is not an exact joint/marginal posterior or guaranteed calibration

These gaps prevent literal author-runtime replication. They do not prevent separately auditing Eqs35–38 message computations and the explicitly completed finite algorithm. First-fallback frames are common at0dB; results must carry the policy and sensitivity.

## Executed computations

The synchronous edge pmf p[d,c,a] starts uniform. Each observation-to-symbol edge computes the mean and variance of all other symbols from the preceding edge messages, adding the actual proper-complex noise variance. For each symbol, incoming log likelihoods are summed. Excluding one observation gives the extrinsic edge PMF. Damping weights NEW pmf by delta and OLD by1-delta. No same-iteration asynchronous message reuse.

Likelihood calculations omit candidate-independent constants and normalize in log space. Tiny negative symbol variance from rounding is floored only within1e-12; larger negativity, nonpositive effective variance, or nonfinite arithmetic fails explicitly. Entirely zero channel columns produce uniform posterior, not confidence. Generic bounded inputs require finite conforming H/y/constellation, dimensions1–64, variance>0,0<delta<=1,0<gamma<1,0<=epsilon<=1,1–200 iterations. This remains a research API, not a production-grade hostile-input interface.

## Paired design and budgets

N=3,M=4,D=12, QPSK with Gray bit labels; two fixed paths. Doppler bins[.23,-.41], hprime=[1,.65 exp(.7j)]. Integer-delay control uses q=[0,1]; fractional case q=[.35,1.4]. Fresh independent QPSK frames and circular Gaussian noise per trial, PCG64 seed180205242. Five SNR points[0,5,10,15,20]dB,100frames per scenario/SNR:1000frames total.

SNR is unit first-path power/unit symbol energy divided by E|w|². Multipath energy is not renormalized. Within each trial all six detector/model combinations consume identical true x,y,H_true and noise variance; x is withheld from receivers and used only for errors. H_true follows the accepted literal Eq14 convention, whose continuous physical-pulse equivalence remains unproven. No RF power, bandwidth, latency or coding benefit is inferred.

Nominal rounded H changes DELAY only: floor(q+.5), Doppler/gain hprime unchanged; there is no hidden gain refit. Numerical entries below1e-12 in rounded H are set to zero to represent theoretical integer-delay sparsity. This cleanup is explicit, not applied to matched H. In the integer control H_true and H_rounded differ only at relative Frobenius1.08e-16, and outcomes agree; they are not byte-identical.

Six branches: matched/rounded MP-Ψ; matched/rounded accepted MP-G; matched/rounded accepted full LMMSE. This factorial design separates inference method from nominal-model mismatch. Original2019 discussion motivates delay-rounding mismatch, but these frames/channels/seed/cap and sample counts are ours, not original Fig6/7. Only conditional results for two fixed channels are supported, not channel-population ranking.

Frozen MP-G uses50 iterations,.7 damping,1e-9 message tolerance, zero Gram pruning; LMMSE uses full matrix and its existing effective-AWGN soft-output calibration. MP-Ψ uses confidence stopping, so equal caps/damping do not make stopping rules equivalent. We retain actual iterations/statuses rather than label all terminal cases converged. Matched fractional-delay H is dense; original sparse-O(NMSQ) savings cannot be assumed. Edge counts are retained per MP-Ψ case.

The immutable historical baseline API mandates csi='perfect-supplied'. For rounded calls that string is only an adapter compatibility token, not a true-CSI assertion. Every outer result is explicitly named matched/rounded, with H_true and H_nominal retained; rounded inference is mismatched. Do not propagate that legacy token as provenance. No accepted bytes are modified.

## Statistical and interpretation limits

All samples and cap/drop/fallback outcomes enter BER/SER/frame-error and soft-score metrics. “All confident” is an internal approximate confidence condition, not proof of correct symbols. Rounded models can be confidently wrong. MP-G may hit its cap and show worse high-SNR empirical BER; no detector is tuned or failed case removed to reproduce a preferred ordering.

BER error bars and paired BER differences use whole-frame bootstrap (1000resamples), preserving within-frame bit dependence. Intervals are pointwise conditional Monte Carlo summaries, not simultaneous coverage or a universal error rate guarantee. Zero observed errors give a degenerate bootstrap interval; the separate exact independent-frame FER Clopper–Pearson interval remains nonzero at its upper end (about3.62% for0/100). Do not treat zero BER as zero risk. Trials at different SNR are independent; comparisons within a trial are paired.

NLL uses an explicit positive floating-point floor with clipped-symbol counts reported; Brier score is also retained. These are approximate output-quality metrics, not achieved coded rate or exact posterior calibration. First-versus-terminal fallback sensitivity reports raw error counts on precisely the flagged frames.

## Replay

`OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m unittest -v`
`OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python study.py`
`OPENBLAS_NUM_THREADS=1 python independent_oracle.py`

Node is required for immutable accepted comparator. study.py writes raw.npz (observations,truth,alphabet/labels), RESULTS.json (channels,all cases,posteriors,traces/statuses,metrics), and temporary baseline transport JSON. Source/input transport/cache files are excluded from portable archive; study.py regenerates baseline transports. Elapsed time is cloud offline time, not browser/real-time evidence.

## Candidate lifecycle display correction (2026-10-18)

Scoped browser review found that changing an input correctly cleared results but left the disabled iteration label at its prior value. The candidate now resets the iteration value/max and label to `尚未运行` whenever live results are invalidated. A fresh lifecycle regression reproduces the previous 50/50 state before changing seed. Numeric kernel and historical offline-summary bytes are unchanged.
