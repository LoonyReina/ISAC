"""Bounded, explicitly interpreted arXiv:2105.03125v2 receiver reference.

No receiver function accepts true data/gains; oracle and diagnostics are separate.
See CONTRACT.md for source discrepancies and approximation limitations.
"""
from __future__ import annotations
import itertools
import numpy as np


def validate_support(shape, support):
    dimensions = np.asarray(shape)
    if dimensions.shape != (2,) or not np.all(np.isfinite(dimensions)) or np.any(dimensions <= 0) or np.any(dimensions != np.floor(dimensions)):
        raise ValueError('frame shape must contain two positive integer dimensions')
    N, M = dimensions.astype(int)
    raw = np.asarray(support)
    if np.iscomplexobj(raw) or not np.all(np.isfinite(raw)) or np.any(raw != np.floor(raw)):
        raise ValueError('only finite integer delay/Doppler supports are supported')
    s = raw.astype(int)
    if s.ndim != 2 or s.shape[1] != 2 or len(s) == 0:
        raise ValueError('support must be nonempty P×2')
    s = s % np.array([N, M])
    if len(np.unique(s, axis=0)) != len(s):
        raise ValueError('duplicate support: individual effective gains are unidentifiable; aggregate first')
    return s


def aggregate_support(shape, support, gains):
    merged = {}
    for s, a in zip(np.asarray(support), np.asarray(gains)):
        key = tuple((s % np.array(shape)).tolist())
        merged[key] = merged.get(key, 0j) + a
    return np.asarray(list(merged)), np.asarray(list(merged.values()), complex)


def graph_indices(shape, support):
    s = validate_support(shape, support)
    k, l = np.indices(shape)
    return (((k.ravel()[:, None]-s[:, 0]) % shape[0])*shape[1]
            + (l.ravel()[:, None]-s[:, 1]) % shape[1])


def raw_circular_frame(x, support, gains, noise=None):
    x = np.asarray(x, complex)
    s = validate_support(x.shape, support)
    a = np.asarray(gains, complex)
    if a.shape != (len(s),):
        raise ValueError('gain/support dimensions differ')
    y = np.zeros(x.shape, complex)
    for shift, gain in zip(s, a):
        y += gain*np.roll(x, tuple(shift), axis=(0, 1))
    if noise is not None:
        if np.shape(noise) != x.shape:
            raise ValueError('noise shape differs')
        y += noise
    return y


def estimate_effective_gains(y, support, pilot_index, pilot):
    y = np.asarray(y, complex)
    s = validate_support(y.shape, support)
    if not np.isfinite(pilot) or abs(pilot) == 0:
        raise ValueError('finite nonzero pilot required')
    arrivals = (s + np.asarray(pilot_index)) % np.asarray(y.shape)
    return y[arrivals[:, 0], arrivals[:, 1]]/pilot


def prior_gain_error_variance(prior_powers, Es, Ep, N0):
    lam = np.asarray(prior_powers, float)
    if not np.all(np.isfinite(lam)) or np.any(lam < 0) or not all(np.isfinite(t) and t > 0 for t in (Es, Ep, N0)):
        raise ValueError('invalid statistical powers')
    return (Es*(lam.sum()-lam)+N0)/Ep


def conditional_gain_error_moments(shape, support, gains, pilot_index, pilot, Es, N0):
    """Evaluation-only exact fixed-gain moments; never passed to sparse_spa."""
    s = validate_support(shape, support)
    P = len(s)
    q = np.asarray(pilot_index) % np.asarray(shape)
    qflat = np.ravel_multi_index(q, shape)
    data = np.array([t for t in range(np.prod(shape)) if t != qflat])
    lookup = {t: i for i, t in enumerate(data)}
    B = np.zeros((P, len(data)), complex)
    for p in range(P):
        for j in range(P):
            if j != p:
                t = (q+s[p]-s[j]) % np.asarray(shape)
                B[p, lookup[np.ravel_multi_index(t, shape)]] += gains[j]/pilot
    C = Es*B@B.conj().T + N0/abs(pilot)**2*np.eye(P)
    pseudo = Es*B@B.T
    return dict(B=B, covariance=C, pseudocovariance=pseudo, error_data_cross=Es*B, data_indices=data)


def _normalize_log(logp):
    z = logp-np.max(logp, axis=-1, keepdims=True)
    p = np.exp(z)
    return p/np.sum(p, axis=-1, keepdims=True)


def sparse_spa(y, support, estimated_gains, pilot_index, pilot, Es, N0,
               gain_variance=None, mode='moment_repaired', max_iterations=40,
               damping=0.5, tolerance=1e-7):
    """Circular proper-Gaussian moment SPA, not exact sum-product mixtures.

    mode 'literal_operational' preserves printed Eq42,52,57 except normalization.
    Probability rows are valid only where probabilities_valid_mask is true.
    The pilot is a known symbol outside the BPSK data alphabet; its probability
    row is a neutral placeholder and its decision is the known complex pilot.
    Returns all cap/failure/convergence statuses. Supplied CSI is a caller label,
    not a hidden input path. Strong/zero pilots are fixed known symbol nodes.
    """
    y = np.asarray(y, complex)
    a = np.asarray(estimated_gains, complex)
    idx = graph_indices(y.shape, support)
    L, P = idx.shape
    if a.shape != (P,) or not all(np.isfinite(t) and t > 0 for t in (Es, N0)):
        raise ValueError('invalid dimensions or powers')
    if not np.isfinite(pilot) or abs(pilot) == 0:
        raise ValueError('finite nonzero pilot required')
    if not np.all(np.isfinite(y)) or not np.all(np.isfinite(a)):
        raise ValueError('nonfinite input')
    if mode not in ('moment_repaired', 'ignored_uncertainty', 'literal_operational'):
        raise ValueError('unknown mode')
    if not isinstance(max_iterations, (int, np.integer)) or max_iterations < 1 or not np.isfinite(damping) or not 0 < damping <= 1 or not np.isfinite(tolerance) or tolerance < 0:
        raise ValueError('invalid iteration settings')
    v = np.zeros(P) if gain_variance is None else np.asarray(gain_variance, float)
    if v.shape != (P,) or np.any(v < 0) or not np.all(np.isfinite(v)):
        raise ValueError('invalid gain variances')
    if mode == 'ignored_uncertainty':
        v = np.zeros(P)
    if mode == 'literal_operational':
        v = np.full(P, (P*Es+N0)/abs(pilot)**2)
    chi = np.array([-np.sqrt(Es), np.sqrt(Es)])
    pilot_flat = np.ravel_multi_index(tuple(pilot_index), y.shape)
    pilot_edges = idx == pilot_flat
    data_mask = np.arange(L) != pilot_flat
    incoming = np.full((L, P, 2), .5)
    marginal = np.full((L, 2), .5)
    last_decisions = np.zeros(L, int)
    history = []
    status = 'iteration_cap'
    f2v = np.full((L, P, 2), -np.log(2.))
    for iteration in range(1, max_iterations+1):
        means = incoming@chi
        means = means.astype(complex)
        means[pilot_edges] = pilot
        second = np.full((L, P), Es)
        second[pilot_edges] = abs(pilot)**2
        symvar = np.maximum(0, second-np.abs(means)**2)
        mean_sum = np.sum(a[None, :]*means, axis=1)
        variance_terms = abs(a)[None, :]**2*symvar+v[None, :]*second
        variance_sum = variance_terms.sum(axis=1)
        for p in range(P):
            if mode == 'literal_operational':
                mu = means[:, p]*(a.sum()-a[p])
                # Exact printed outer Es and target-p uncertainty repeated.
                V = N0+Es*(v[p]*(P-1) + np.sum((abs(a)[None, :]**2+v[p])*symvar, axis=1)
                            -(abs(a[p])**2+v[p])*symvar[:, p])
                V = np.maximum(V, N0)[:, None]
            else:
                mu = mean_sum-a[p]*means[:, p]
                V = (N0+variance_sum-variance_terms[:, p])[:, None]+v[p]*abs(chi)[None, :]**2
                V = np.maximum(V, N0)
            residual = y.ravel()[:, None]-mu[:, None]-a[p]*chi[None, :]
            logs = -abs(residual)**2/V-np.log(V)
            # Constant messages on pilot edges do not affect data and are masked.
            logs[pilot_edges[:, p], :] = 0.
            probs = _normalize_log(logs)
            f2v[:, p, :] = np.log(np.maximum(probs, 1e-300))
        total = np.zeros((L, 2))
        np.add.at(total, idx.ravel(), f2v.reshape(-1, 2))
        new_marginal = _normalize_log(total)
        proposal = _normalize_log(total[idx]-f2v)
        updated = damping*proposal+(1-damping)*incoming
        delta = float(np.max(abs(updated-incoming)))
        marginal_delta = float(np.max(abs(new_marginal[data_mask]-marginal[data_mask])))
        incoming = updated
        marginal = new_marginal
        decisions = np.argmax(marginal, axis=1)
        entropy = -np.sum(marginal*np.log2(np.maximum(marginal, 1e-300)), axis=1)
        posterior_mean = (marginal@chi).astype(complex)
        posterior_mean[pilot_flat] = pilot
        prediction = np.sum(a[None, :]*posterior_mean[idx], axis=1)
        history.append(dict(iteration=iteration, max_message_change=delta,
                            max_marginal_change=marginal_delta,
                            decision_changes=int(np.sum((decisions != last_decisions)&data_mask)),
                            mean_entropy_bits=float(entropy[data_mask].mean()),
                            plugin_residual_mse=float(np.mean(abs(y.ravel()-prediction)**2))))
        last_decisions = decisions
        if not np.all(np.isfinite(marginal)) or not np.all(np.isfinite(incoming)):
            status = 'nonfinite_failure'
            break
        if max(delta, marginal_delta) < tolerance:
            status = 'converged'
            break
    output_decisions = chi[np.argmax(marginal, axis=1)].astype(complex)
    output_decisions[pilot_flat] = pilot
    return dict(probabilities=marginal, probabilities_valid_mask=data_mask,
                known_pilot_flat_index=int(pilot_flat), known_pilot_value=complex(pilot),
                decisions=output_decisions,
                status=status, iterations=len(history), history=history,
                data_mask=data_mask, gain_variance=v)


def enumerate_words(shape, pilot_index, pilot, Es=1., max_bits=12):
    L = int(np.prod(shape))
    q = np.ravel_multi_index(tuple(pilot_index), shape)
    data = np.array([i for i in range(L) if i != q])
    if len(data) > max_bits:
        raise ValueError('tiny exact test capped at 12 unknown bits')
    bits = np.array(list(itertools.product((-1., 1.), repeat=len(data))))
    words = np.empty((len(bits), L), complex)
    words[:, data] = np.sqrt(Es)*bits
    words[:, q] = pilot
    return words, bits, data


def exact_bpsk_posterior(y, support, pilot_index, pilot, Es, N0,
                         known_gains=None, prior_powers=None):
    """Exact finite-word posterior for either known CSI or marginalized gains."""
    y = np.asarray(y, complex)
    idx = graph_indices(y.shape, support)
    words, bits, data = enumerate_words(y.shape, pilot_index, pilot, Es)
    ll = np.empty(len(words))
    if (known_gains is None) == (prior_powers is None):
        raise ValueError('provide either known gains or prior powers')
    if known_gains is not None:
        predicted = np.sum(words[:, idx]*np.asarray(known_gains)[None, None, :], axis=2)
        ll = -np.sum(abs(y.ravel()[None, :]-predicted)**2, axis=1)/N0
    else:
        lam = np.asarray(prior_powers, float)
        if np.any(lam < 0):
            raise ValueError('negative gain prior variance')
        positive = lam > 0
        lam = lam[positive]
        ynorm = np.vdot(y.ravel(), y.ravel()).real/N0
        for i, word in enumerate(words):
            A = word[idx][:, positive]
            G = np.diag(1/lam)+A.conj().T@A/N0
            _, logdetG = np.linalg.slogdet(G)
            z = A.conj().T@y.ravel()
            quadratic = ynorm-np.vdot(z, np.linalg.solve(G, z)).real/N0**2
            logdet = y.size*np.log(N0)+np.log(lam).sum()+logdetG
            ll[i] = -quadratic-logdet
    probabilities = _normalize_log(ll[None, :])[0]
    marginals = np.stack([probabilities@(bits[:, i] == 1) for i in range(len(data))])
    return dict(data_indices=data, positive_marginals=marginals,
                word_probabilities=probabilities, log_likelihoods=ll)


def exact_local_message(y, gains, target, incoming, alphabet, N0):
    """Exact Eq50 finite mixture for an independent known-gain factor."""
    gains, alphabet = np.asarray(gains), np.asarray(alphabet)
    others = [j for j in range(len(gains)) if j != target]
    out = np.zeros(len(alphabet))
    for labels in itertools.product(range(len(alphabet)), repeat=len(others)):
        weight = np.prod([incoming[j, q] for j, q in zip(others, labels)])
        interference = sum(gains[j]*alphabet[q] for j, q in zip(others, labels))
        out += weight*np.exp(-abs(y-interference-gains[target]*alphabet)**2/N0)
    return out/out.sum()
