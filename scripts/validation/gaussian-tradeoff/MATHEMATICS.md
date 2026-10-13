# Operational derivation and numerical certificates

All derivations here are independent implementations of the fixed source’s specified model. They are not copied proofs or an attempt to repair every general theorem.

## Known waveform, proper-complex prior

For one sensing-receiver row, write yᵀ=Xᵀh+zᵀ, h~CN(0,σp²I), z~CN(0,σs²I). The real model uses

B = [[Re Xᵀ, −Im Xᵀ], [Im Xᵀ, Re Xᵀ]],
J = 2 BᵀB/σs² + 2I/σp².

The factor 2 is fixed by the real-component variance of a proper-complex random variable. With the column coordinate h=Hs[row,:]ᵀ, its complex posterior covariance is C_h=(σp⁻²I + X*Xᵀ/σs²)⁻¹. The right-acting row-coordinate matrix σs²(XXᴴ+σs²/σp²I)⁻¹ is its transpose, not the same matrix in general; their traces agree. The trace of the inverse real information, multiplied by Ns, is therefore:

ε(X) = σs² Ns tr[(XXᴴ + σs²/σp² I)⁻¹]
     = (σs² Ns/T) tr[(R+zI)⁻¹], z=σs²/(Tσp²).

This independently yields source (95). The Bayesian posterior mean is YXᴴ(XXᴴ+σs²/σp²I)⁻¹. The evaluation draws truth only to construct observations and score estimates. Neither the posterior function nor the covariance optimizer accepts truth. For this linear Gaussian prior, the bound is an exact Bayes-MMSE expectation; that equality does not apply generally to the paper’s nonlinear parameterizations.

The paper’s sensing metric is a Miller–Chang-type Bayesian bound: first average likelihood information over the sensing prior at fixed known X, add prior information, invert, then average over X. A modified bound that instead inverts the information already averaged over X is a different quantity, as is averaging pointwise non-Bayesian bounds over target parameters. In this matrix specialization the likelihood information does not depend on Hs, but the order of waveform averaging still matters. The ordinary inverse of the mean information gives a different quantity. Convexity gives E tr[(R+zI)⁻¹] ≥ tr[(E R+zI)⁻¹]. The code does not replace the left side by the right side for Gaussian signaling. A fixed waveform and a Stiefel-random waveform can share R; only the latter carries data under a nontrivial input law.

## Convex covariance shaping, not a water-filling substitute

Let HᴴH/σc²=V diag(g)Vᴴ. In this eigenbasis, replacing Q by its diagonal preserves its trace and positivity. The diagonal entries of (Q+zI)⁻¹ are at least the reciprocal diagonal entries of Q+zI (Schur complements). Hadamard’s determinant inequality gives det(I+diag(sqrt(g))Qdiag(sqrt(g))) ≤ product(1+gᵢQᵢᵢ). Thus diagonal pinching cannot worsen the sensing-minus-rate objective. This justifies the reduction for the isotropic matrix-estimation prior; it does not justify it for arbitrary affine Fisher maps.

Write qᵢ=PT·wᵢ, δ=z/PT, aᵢ=PT·gᵢ, and Σwᵢ=M. Source (48) is, after multiplication by a positive constant,

f(w)=Σ 1/(wᵢ+δ) − κ Σ ln(1+aᵢwᵢ),
κ=αPT/[(1−α)Ns].

For 0≤κ<∞, its coordinate curvature is 2/(wᵢ+δ)³ + κaᵢ²/(1+aᵢwᵢ)² > 0. At the optimum, positive coordinates satisfy

1/(wᵢ+δ)² + κaᵢ/(1+aᵢwᵢ)=μ,

and a coordinate is zero if its value at zero is ≤μ. These monotone scalar equations and the power equation are solved with SciPy’s bracketed Brent solver. There is no claimed new optimizer. Only the separate κ=∞ communication endpoint reduces to water filling.

For any feasible numerical w, a supporting hyperplane yields the deterministic global certificate

0 ≤ f(w)−f* ≤ grad(f(w))ᵀw − M·minᵢ gradᵢ(f(w)).

The matrix gradient has these same eigenvalues in V’s basis, so this is also a certificate over the entire PSD trace-constrained matrix domain, not just a restricted handpicked allocation grid. Independent SLSQP optimization and arbitrary complex PSD competitors test the implementation. Certificates apply to the finite supplied H matrix; they do not certify Monte Carlo integration over channel fading.

## Exact finite complex-Wishart expectation

With X=√q Z, Z iid CN(0,1), the nonzero eigenvalues x of ZZᴴ have one-point density

ρ(x)=xᵃe⁻ˣ Σ[k=0..r−1] k!/(k+a)! · [Lₖᵃ(x)]²,
r=min(M,T), a=|T−M|.

The expected trace is the one-dimensional integral of ρ(x)/(qx/T+z), plus (M−r)/z for deterministic zero eigenvalues. This is a finite-size spectral integral, not an MP approximation. Its no-prior limit is finite only if T>M, giving ε=σs²NsM/[q(T−M)]. Separate mpmath integration at 60 digits checks selected cases without calling the production oracle.

Source (100) is evaluated in a rationalized form to avoid catastrophic cancellation at small z. Source (101) is an explicitly labeled approximation; it is never used as an optimization or estimation certificate.

## Finite-SNR Stiefel verification in one communication dimension

For a rank-one covariance and block length T, the random communication vector has uniform direction on the radius a=√(T·SNR) sphere in Cᵀ. Its received density is radial:

pY(y)=π⁻ᵀ exp(−r²−a²) Γ(T)(ar)^(1−T) I_(T−1)(2ar), r=||y||.

The received squared norm 2r² has a noncentral chi-square distribution with 2T degrees of freedom and noncentrality 2a². Integrating −ln pY minus Gaussian noise entropy gives mutual information; division by T ln 2 gives bits per complex use. The binary64 evaluator uses scaled Bessel functions, reports numerical quadrature error and omitted radial probability, and is checked independently with unscaled 60-digit Bessel integration. The omitted probability is a diagnostic, not a bound on entropy truncation error.

This verifies finite-SNR behavior of rank-one semi-unitary signaling and the high-SNR leading approximation. It is not a finite-SNR evaluator of a full-rank MIMO Stiefel input.

## Sampling and fair comparisons

Every comparison fixes M, Ns, T, prior, noise and expected block energy. Gaussian waveforms are not normalized; their energy fluctuation is part of the deterministic–random tradeoff. Stiefel samples have exactly the requested covariance to floating-point precision and require rank(Q)≤T. Every strictly positive covariance eigenmode is retained by the waveform generator; no small positive mode is silently truncated. Batch posterior traces use waveform singular values, explicitly retaining structural null directions when T<M. For an improper prior, a positive singular value/covariance eigenvalue below the declared floating-point rank-resolution threshold raises a rank-ambiguity error instead of returning a misleading finite estimate; structural or exact zeros return infinity. A proper prior removes this unregularized-inverse ambiguity. Hermitian/PSD input checks allow only tiny floating-point negative roundoff before clipping to zero, which is a numerical representational tolerance, not permission to remove a positive direction.

The fading experiment uses common random channel and waveform draws across covariance weights. Rows of a sweep are therefore correlated. Error bars use independent channel-cluster averages, which include the within-channel waveform Monte Carlo error. Two independent seed replicates expose finite-sample variation. Approximate normal intervals are not formal coverage guarantees or simultaneous confidence bands.
