# Selected equation-level reference: memory-polynomial cancellation

## Source and exact scope
Source verified 2026-10-17: https://arxiv.org/html/1908.03418v1#S3.SS2, Eq. (11) and its adjacent estimator paragraph. Eq. (11) is s_hat[n] = sum over odd p=1..P and k=-M1..M2 of h[p,k] |x[n-k]|^(p-1) x[n-k]. The paragraph permits block least squares. Source Eq. (12)'s adaptive self-orthogonalizing update is not implemented. Source measurement settings use P=11 nonlinear versus P=1 linear, 5 precursor and 5 postcursor taps; those measurements are not reproduced here. Source warns that cancellation support can suppress target echoes.

## Independently chosen synthetic experiment
- Complex128, stationary synthetic residual SI, no RF/ADC/saturation simulation
- Unit expected power iid proper complex Gaussian transmit IQ, with independent 4096-sample fit and holdout records and explicit guards. Not LTE/NR waveform generation
- Orders 1 versus 1,3,5, equal support k=-1,0,1,2 (4 versus 12 parameters); column ordering p-major then increasing k
- Received y = SI + target + noise. Deterministic complex SI coefficients are listed in code; noise proper complex Gaussian with expected power 1e-4, independently sampled for each block
- Same input and receiver observations for both models. Independent holdout data never participates in fitting, normalization or hyperparameter selection
- Column RMS scaling from fit only; complex SVD least squares without normal-equation inversion; full numerical column rank required, no silent regularization/minimum-norm fallback
- Explicit valid indices ensure x[n-k] exists for precursor and postcursor taps. No circular wrap or silent zero-padding
- Block fitting has precursor lookahead; this is offline reference, not streaming latency claim

## Evaluation and interpretation
Primary metrics: holdout total residual power and holdout oracle SI modeling error. Report training residual separately, never as generalization evidence. Model parameters are fixed in advance.
Target study uses paired target-absent/target-present fit observations with identical noise, then compares their held-out cancelled outputs. Difference equals target minus the change in fitted cancellation. Report target matched-amplitude retention and residual energy ratio: energy can grow due to off-target artifacts and is not a detection probability. Targets at delays 1 (inside) and 8 (outside) have complex amplitude 0.15+0.05j and zero Doppler. A correlated-IQ out-of-support counterexample demonstrates delay support alone does not guarantee preservation. Freezing the same coefficients makes injected target difference exactly preserved, an algebraic control rather than a learning claim.

## Gates
Required: explicit scalar forward oracle; SVD versus independently assembled real-augmented QR LS; noiseless coefficient recovery; complex conjugation and delay-sign tests; rank-deficient and malformed-input rejection; heldout paired linear/nonlinear check; train/holdout isolation; target-inside erasure/outside attenuation disclosure; constant-envelope excitation rank failure. No full-paper, Figure 6, hardware, browser or published-site claim.

## Deduplication
Read current execution plan and nomination. Fresh content scan of /workspace/shared/isac-cooperative-rate-staging-20261016/labs for memory.polynomial, digital.cancell and self.orthogon returned no matches. This is a local staging snapshot, not a claim of exhaustive remote branch inspection. Existing full-duplex paper lab implements interpolation/periodogram prerequisites. No existing project files changed.
