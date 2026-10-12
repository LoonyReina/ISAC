#!/usr/bin/env python3
"""Independent fresh-input oracle for arXiv:1711.05220v1 strict covariance.

Unlike the repository's lower-Cholesky/NumPy SVD implementation, this oracle
uses a Hermitian positive square root and SciPy's QR-based gesvd driver.
No prescribed waveform, grid of parameters, or stored solution is consulted.
Only Hermitian positive definite R and L >= N are supported here.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy import linalg

SCHEMA_VERSION = 1
SOLVER = "hermitian-square-root+scipy-gesvd"
CONTRACT = {"hermitianRelativeTolerance": 1e-12,
            "minimumEigenvalueRelativeToLargest": 1e-12,
            "certificateRelativeTolerance": 2e-10}


def pack(a):
    a = np.asarray(a, dtype=np.complex128)
    return np.stack([a.real, a.imag], axis=-1).tolist()


def unpack(a):
    a = np.asarray(a, dtype=float)
    if a.ndim != 3 or a.shape[-1] != 2:
        raise ValueError("Complex matrices must be rectangular [rows][columns][real,imag]")
    return a[..., 0] + 1j*a[..., 1]


def _matrix(a, name):
    try:
        x = np.array(a, dtype=np.complex128, copy=True)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be a rectangular complex matrix") from exc
    if x.ndim != 2 or not all(x.shape):
        raise ValueError(f"{name} must be a nonempty two-dimensional matrix")
    if not np.all(np.isfinite(x)):
        raise ValueError(f"{name} must contain only finite complex entries")
    return x


def validate_inputs(H, S, R):
    H, S, R = (_matrix(a, name) for a, name in ((H, "H"), (S, "S"), (R, "R")))
    k, n = H.shape
    if R.shape != (n, n):
        raise ValueError("R must be N by N, where H has N columns")
    if S.shape[0] != k:
        raise ValueError("H and S must have the same number K of rows")
    length = S.shape[1]
    if length < n:
        raise ValueError("Positive definite covariance requires L >= N")
    scale = float(linalg.norm(R, "fro"))
    if scale == 0:
        raise ValueError("R must be positive definite; zero covariance is outside this contract")
    hermitian_error = float(linalg.norm(R-R.conj().T, "fro")) / scale
    if hermitian_error > CONTRACT["hermitianRelativeTolerance"]:
        raise ValueError("R is not Hermitian to the declared relative tolerance")
    # Floating-point cleanup only, explicitly recorded. No diagonal loading or
    # positive-eigenvalue clipping is used to change the requested problem.
    Rh = (R + R.conj().T)*0.5
    eigenvalues, eigenvectors = linalg.eigh(Rh, driver="evr")
    if eigenvalues[-1] <= 0 or eigenvalues[0] <= 0:
        raise ValueError("R must be strictly positive definite; PSD is not this branch")
    if eigenvalues[0] / eigenvalues[-1] <= CONTRACT["minimumEigenvalueRelativeToLargest"]:
        raise ValueError("R is too ill-conditioned for this floating-point contract; no regularization applied")
    G = (eigenvectors*np.sqrt(eigenvalues)) @ eigenvectors.conj().T
    diagnostics = {"hermitianInputResidualRelative": hermitian_error,
                   "hermitianCleanupNorm": float(linalg.norm(Rh-R, "fro")),
                   "minimumCovarianceEigenvalue": float(eigenvalues[0]),
                   "maximumCovarianceEigenvalue": float(eigenvalues[-1]),
                   "covarianceConditionNumber": float(eigenvalues[-1]/eigenvalues[0])}
    return H, S, R, Rh, G, diagnostics


def objective(H, S, X):
    error = np.asarray(H) @ np.asarray(X) - np.asarray(S)
    return float(np.vdot(error, error).real)


def beampattern(R, angles_deg):
    R = np.asarray(R)
    angle = np.deg2rad(np.asarray(angles_deg, dtype=float))
    steering = np.exp(1j*np.pi*np.arange(R.shape[0])[:, None]*np.sin(angle))
    return np.einsum("nm,nm->m", steering.conj(), R@steering).real


def evaluate(H, S, R, X, lower_bound=None):
    H, S, R, X = (np.asarray(x, dtype=np.complex128) for x in (H,S,R,X))
    length = S.shape[1]
    if X.shape != (H.shape[1], length) or not np.all(np.isfinite(X)):
        raise ValueError("X has the wrong shape or contains non-finite entries")
    Y = H@X
    error = Y-S
    Rx = X@X.conj().T / length
    mui_per_user = np.mean(abs(error)**2, axis=1)
    obj = float(np.sum(abs(error)**2))
    energy = float(np.sum(abs(X)**2))
    result = {"objective": obj, "mse": obj/S.size,
              "muiPerUser": mui_per_user.tolist(), "energy": energy,
              "requiredEnergy": float(length*np.trace(R).real),
              "energyResidual": float(energy-length*np.trace(R).real),
              "covarianceResidual": float(linalg.norm(Rx-R, "fro")),
              "covarianceResidualRelative": float(linalg.norm(Rx-R, "fro")/linalg.norm(R,"fro")),
              "peakToAverageSamplePower": float(np.max(abs(X)**2)/np.mean(abs(X)**2)) if energy else None,
              "patternAnglesDeg": list(range(-90, 91)),
              "patternRaw": beampattern(Rx, range(-90,91)).tolist(),
              "received": pack(Y), "sampleCovariance": pack(Rx)}
    if lower_bound is not None:
        result["signedObjectiveGap"] = obj-float(lower_bound)
    return result


def dilation_nuclear_norm(C):
    """Independent unsquared Hermitian eigenvalue certificate for ||C||_*.

    A CC^H eigensolve followed by sqrt amplifies rank-zero roundoff. The
    Hermitian dilation's eigenvalues are +/- singular values and zeros.
    """
    n, length = C.shape
    D = np.zeros((n+length,n+length), dtype=np.complex128)
    D[:n,n:] = C
    D[n:,:n] = C.conj().T
    eigenvalues = linalg.eigvalsh(D, driver="evr")
    return float(np.sum(np.abs(eigenvalues))*0.5)


def solve(H, S, R):
    H, S, R, Rh, G, diagnostics = validate_inputs(H,S,R)
    n, length = R.shape[0], S.shape[1]
    C = G @ H.conj().T @ S
    # Keep ALL n left singular directions, including zero singular values.
    # U@Vh therefore has orthonormal rows even when K<N or H/S is rank deficient.
    U, singular_values, Vh = linalg.svd(C, full_matrices=False,
                                       lapack_driver="gesvd", check_finite=True)
    Q = U@Vh
    X = np.sqrt(length)*G@Q
    constant = float(length*np.trace(H@Rh@H.conj().T).real + np.vdot(S,S).real)
    nuclear = float(np.sum(singular_values))
    lower_bound = constant-2*np.sqrt(length)*nuclear
    eigen_nuclear = dilation_nuclear_norm(C)
    eigen_bound = constant-2*np.sqrt(length)*eigen_nuclear
    metrics = evaluate(H,S,R,X,lower_bound)
    cert_scale = max(1.,abs(constant),2*np.sqrt(length)*nuclear)
    gap_tolerance = CONTRACT["certificateRelativeTolerance"]*cert_scale
    rank_tolerance = np.finfo(float).eps*max(C.shape)*float(singular_values[0])
    rank = int(np.sum(singular_values>rank_tolerance)) if singular_values[0] else 0
    row_residual = float(linalg.norm(Q@Q.conj().T-np.eye(n), "fro"))
    factor_residual = float(linalg.norm(G@G-Rh,"fro"))
    converged = bool(metrics["covarianceResidualRelative"] <= 2e-10
                     and abs(metrics["signedObjectiveGap"]) <= gap_tolerance
                     and abs(eigen_bound-lower_bound) <= gap_tolerance
                     and row_residual <= 2e-10)
    diagnostics.update({"procrustesRank": rank, "rankTolerance": rank_tolerance,
                        "optimizerUniqueAtReportedRank": rank==n,
                        "whitenedRowIsometryResidual": row_residual,
                        "factorizationResidual": factor_residual,
                        "eigenDilationNuclearNorm": eigen_nuclear,
                        "eigenDilationObjectiveBound": eigen_bound,
                        "independentBoundDisagreement": eigen_bound-lower_bound,
                        "objectiveCertificateTolerance": gap_tolerance})
    return {"schemaVersion": SCHEMA_VERSION, "solver": SOLVER,
            "status": "certified" if converged else "numerical-check-failed",
            "dimensions": {"N":n,"K":H.shape[0],"L":length},
            "X": pack(X), "singularValues": singular_values.tolist(),
            "globalObjectiveBound": lower_bound, "metrics": metrics,
            "diagnostics": diagnostics,
            "notes": ["Covariance/global-objective agreement certifies this strict-covariance branch only.",
                      "Raw floating-point bound and signed gap are retained, including roundoff.",
                      "Null-space completions differ across solvers; compare invariants, not X entries."]}


def covariance_matched_reference(R, length, *, seed=None):
    """DFT row frame or seeded random QR frame, both covariance feasible."""
    n = np.asarray(R).shape[0]
    _,_,_,_,G,_ = validate_inputs(np.zeros((1,n)),np.zeros((1,length)),R)
    if seed is None:
        Q = np.exp(2j*np.pi*np.outer(np.arange(n),np.arange(length))/length)/np.sqrt(length)
    else:
        rng = np.random.default_rng(seed)
        V,_ = linalg.qr(rng.normal(size=(length,n))+1j*rng.normal(size=(length,n)),mode="economic")
        Q = V.conj().T
    return np.sqrt(length)*G@Q


def normalized_zf(H, S, R):
    """Explicit equal-block-power baseline, not a claimed exact source ZF convention.

    It loses the radar covariance constraint and rescales desired symbols by alpha.
    When H is row-rank deficient, this is normalized least squares, not exact ZF.
    """
    H,S,R,_,_,_ = validate_inputs(H,S,R)
    Xraw = linalg.pinv(H)@S
    power = float(np.vdot(Xraw,Xraw).real)
    required = float(S.shape[1]*np.trace(R).real)
    if power == 0:
        return {"status":"undefined-zero-pseudoinverse-waveform", "X":None}
    alpha = float(np.sqrt(required/power))
    return {"status":"computed", "X":pack(alpha*Xraw), "alpha":alpha,
            "unscaledEnergy":power,"requiredEnergy":required,
            "fullRowRankH":bool(np.linalg.matrix_rank(H)==H.shape[0]),
            "radarCovarianceMatched":False}


def paper_rate_metric(H,S,X,noise_power):
    """Finite-frame evaluation of v1 Eqs.(4)-(5), not QPSK mutual information."""
    if not np.isfinite(noise_power) or noise_power<=0:
        raise ValueError("Noise power must be finite and positive")
    H,S,X = map(np.asarray,(H,S,X))
    signal = np.mean(abs(S)**2,axis=1)
    mui = np.mean(abs(H@X-S)**2,axis=1)
    return float(np.sum(np.log2(1+signal/(mui+noise_power))))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input",type=Path,help="JSON object with H,S,R complex [real,imag] matrices")
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    data=json.loads(args.input.read_text())
    result=solve(*(unpack(data[k]) for k in ("H","S","R")))
    result["inputSha256"]=hashlib.sha256(args.input.read_bytes()).hexdigest()
    text=json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False)+"\n"
    if args.output: args.output.write_text(text)
    else: print(text,end="")

if __name__=="__main__": main()
