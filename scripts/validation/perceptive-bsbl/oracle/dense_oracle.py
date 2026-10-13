"""Independent equations-first oracle; original audit code, no reference imports.

All arrays are proper-complex amplitudes. Noise is E|z|^2, not I/Q variance.
This module intentionally uses dense factorizations to audit optimized solvers.
"""
from __future__ import annotations
import numpy as np
from scipy.linalg import cho_factor, cho_solve
from scipy.optimize import brentq


def hermitian(a):
    return (a + a.conj().T) / 2


def covariance(W, gamma, block_size, noise):
    W = np.asarray(W, dtype=complex)
    gamma = np.asarray(gamma, dtype=float)
    if not np.isfinite(noise) or noise <= 0:
        raise ValueError('A strictly positive declared noise variance is required')
    if gamma.ndim != 1 or W.shape[1] != len(gamma) * block_size:
        raise ValueError('Invalid block shape')
    if np.any(~np.isfinite(gamma)) or np.any(gamma < 0):
        raise ValueError('Invalid block variance')
    if np.any(~np.isfinite(W)):
        raise ValueError('Nonfinite dictionary')
    variances = np.repeat(gamma, block_size)
    return hermitian(noise * np.eye(W.shape[0]) + (W * variances) @ W.conj().T)


def evidence(W, Y, gamma, block_size, noise):
    Y = np.asarray(Y, dtype=complex)
    if Y.ndim != 2 or Y.shape[0] != W.shape[0] or Y.shape[1] == 0:
        raise ValueError('Invalid observation shape')
    if np.any(~np.isfinite(Y)):
        raise ValueError('Nonfinite observations')
    C = covariance(W, gamma, block_size, noise)
    fact = cho_factor(C, lower=True)
    logdet = 2 * np.log(np.real(np.diag(fact[0]))).sum()
    solved = cho_solve(fact, Y)
    return float(Y.shape[1] * logdet + np.vdot(Y, solved).real)


def posterior_measurement(W, Y, gamma, block_size, noise):
    variances = np.repeat(gamma, block_size)
    C = covariance(W, gamma, block_size, noise)
    GWH = variances[:, None] * W.conj().T
    fact = cho_factor(C, lower=True)
    mean = GWH @ cho_solve(fact, Y)
    sigma = np.diag(variances) - GWH @ cho_solve(fact, GWH.conj().T)
    return mean, hermitian(sigma)


def posterior_coefficient(W, Y, gamma, block_size, noise):
    # Whiten x=Gamma^(1/2) z; unlike Gamma^-1 this allows exact zero blocks.
    sqrt_g = np.sqrt(np.repeat(gamma, block_size))
    A = W * sqrt_g
    H = np.eye(W.shape[1]) + A.conj().T @ A / noise
    fact = cho_factor(H, lower=True)
    K = cho_solve(fact, np.eye(W.shape[1]))
    mean = sqrt_g[:, None] * cho_solve(fact, A.conj().T @ Y / noise)
    sigma = (sqrt_g[:, None] * K) * sqrt_g[None, :]
    return mean, hermitian(sigma)


def gradient(W, Y, gamma, block_size, noise):
    fact = cho_factor(covariance(W, gamma, block_size, noise), lower=True)
    CY = cho_solve(fact, Y)
    result = []
    for q in range(len(gamma)):
        B = W[:, q * block_size:(q + 1) * block_size]
        CB = cho_solve(fact, B)
        result.append(Y.shape[1] * np.trace(B.conj().T @ CB).real
                      - np.linalg.norm(B.conj().T @ CY)**2)
    return np.asarray(result)


def cavity(W, Y, gamma, block_size, noise, q):
    without = np.asarray(gamma).copy()
    without[q] = 0
    fact = cho_factor(covariance(W, without, block_size, noise), lower=True)
    B = W[:, q * block_size:(q + 1) * block_size]
    return hermitian(B.conj().T @ cho_solve(fact, B)), B.conj().T @ cho_solve(fact, Y)


def block_spectrum(s, Q):
    lam, U = np.linalg.eigh(hermitian(s))
    u = np.sum(np.abs(U.conj().T @ Q)**2, axis=1)
    tol = 1e-12 * max(1., np.max(np.abs(lam), initial=0))
    if np.min(lam, initial=0) < -tol:
        raise ValueError('Cavity Gram matrix is not positive semidefinite')
    keep = lam > tol
    if np.sum(u[~keep]) > 1e-9 * max(1., np.sum(u)):
        raise ValueError('Q has energy outside the cavity Gram range')
    return lam[keep], u[keep]


def block_objective(gamma, lam, u, R):
    denominator = 1 + gamma * lam
    return float(R * np.log1p(gamma * lam).sum() - np.sum(gamma * u / denominator))


def block_derivative(gamma, lam, u, R):
    denominator = 1 + gamma * lam
    return float(np.sum(R * lam / denominator - u / denominator**2))


def scalar_candidates(lam, u, R, mesh_size=4097):
    """Dense diagnostic search, not a certified global optimizer.

    Tests combine a logarithmic and linear mesh and every observed sign change.
    A mesh can miss close stationary roots; callers must not promise exact global
    optimality. The one-block orthogonal analytic tests avoid this limitation.
    """
    if not len(lam):
        return np.array([0.]), 0.
    upper = max(0., float(np.max((u - R * lam) / (R * lam**2))))
    if upper == 0:
        return np.array([0.]), 0.
    mesh = np.unique(np.r_[0., np.linspace(0, upper, mesh_size),
                           np.geomspace(max(upper * 1e-13, np.finfo(float).tiny), upper, mesh_size)])
    values = np.array([block_derivative(v, lam, u, R) for v in mesh])
    roots = [0., upper]
    roots.extend(mesh[values == 0])
    for a, b, fa, fb in zip(mesh[:-1], mesh[1:], values[:-1], values[1:]):
        if fa * fb < 0:
            roots.append(brentq(block_derivative, a, b, args=(lam, u, R), xtol=1e-13))
    candidates = np.unique(roots)
    best = min(candidates, key=lambda v: block_objective(v, lam, u, R))
    return candidates, float(best)


def em_proposal(W, Y, gamma, block_size, noise):
    mean, sigma = posterior_measurement(W, Y, gamma, block_size, noise)
    R = Y.shape[1]
    return np.array([(np.linalg.norm(mean[q * block_size:(q + 1) * block_size])**2 / R
                      + np.trace(sigma[q * block_size:(q + 1) * block_size,
                                       q * block_size:(q + 1) * block_size]).real) / block_size
                     for q in range(len(gamma))])


def explicit_received(symbols, tones, paths, *, N, B, receive_elements, Ts, t=0):
    """Literal Eq.1 steering and Eqs.3/4/9 temporal phase, explicit sums.

    symbols[n,k,a]; path fields transmitter, delay_seconds, gain, aoa_rad,
    aod_rad, doppler_hz. This receives no inverse dictionary or truth blocks.
    """
    out = np.zeros((len(tones), receive_elements), complex)
    for i, n in enumerate(tones):
        for m in range(receive_elements):
            for p in paths:
                for a in range(symbols.shape[2]):
                    out[i, m] += (p['gain'] * symbols[i, p['transmitter'], a]
                                  * np.exp(-2j * np.pi * n * p['delay_seconds'] * B / N)
                                  * np.exp(2j * np.pi * t * Ts * p.get('doppler_hz', 0))
                                  * np.exp(-1j * np.pi * m * np.sin(p['aoa_rad']))
                                  * np.exp(-1j * np.pi * a * np.sin(p['aod_rad'])))
    return out


def dictionary(symbols, tones, *, N, g, grid_size):
    flat = symbols.reshape(len(tones), -1)
    phases = np.exp(-2j * np.pi * np.asarray(tones)[:, None] * np.arange(grid_size) / (g * N))
    return (phases[:, :, None] * flat[:, None, :]).reshape(len(tones), -1)


def truth_blocks(paths, *, transmitter_count, transmit_elements, receive_elements,
                 B, g, grid_size, Ts, t=0):
    d = transmitter_count * transmit_elements
    X = np.zeros((grid_size * d, receive_elements), complex)
    for p in paths:
        q_real = p['delay_seconds'] * g * B
        q = round(q_real)
        if abs(q - q_real) > 1e-10 or not 0 <= q < grid_size:
            raise ValueError('Cannot represent an off-grid path as a single truth block')
        a_t = np.exp(-1j * np.pi * np.arange(transmit_elements) * np.sin(p['aod_rad']))
        a_r = np.exp(-1j * np.pi * np.arange(receive_elements) * np.sin(p['aoa_rad']))
        i = q * d + p['transmitter'] * transmit_elements
        X[i:i + transmit_elements] += p['gain'] * np.exp(2j * np.pi * t * Ts * p.get('doppler_hz', 0)) * np.outer(a_t, a_r)
    return X
