/* Dependency-free, row-major interleaved Float64 complex linear algebra.
 * Hermitian Jacobi rotations and certification adapted from:
 * nearfield-music-browser-prototype/src/receiver.mjs, hermitianEigh
 * SHA-256 16e0df92c3221a56c51f430cb0f3afc29249f496c6bba9d09ffdf456f2a5f981.
 * QR uses complex Householder reflectors. SVD is one-sided complex Jacobi:
 * it never forms A^H A, preserving small singular values for rank decisions.
 * Inputs are never mutated. No inverse, diagonal loading, or rank truncation.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ICILinalg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = Number.EPSILON;
  const MAX_DIM = 4096;
  const MAX_ELEMENTS = 1048576;

  function dimension(n, name) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_DIM) throw new RangeError(`${name} must be an integer in [1, ${MAX_DIM}]`);
  }
  function validate(A, rows, cols, name = 'matrix') {
    dimension(rows, `${name} rows`); dimension(cols, `${name} cols`);
    if (rows * cols > MAX_ELEMENTS) throw new RangeError(`${name} exceeds element cap`);
    if (!(A instanceof Float64Array) || A.length !== 2 * rows * cols) throw new TypeError(`${name} must be an exact-length interleaved Float64Array`);
    let scale = 0;
    for (const x of A) {
      if (!Number.isFinite(x)) throw new TypeError(`${name} must be finite`);
      scale = Math.max(scale, Math.abs(x));
    }
    return scale;
  }
  function finiteOutput(A, name) {
    for (const x of A) if (!Number.isFinite(x)) throw new RangeError(`${name} overflowed`);
    return A;
  }
  function hermitian(A, n) {
    const scale = validate(A, n, n, 'Hermitian matrix');
    if (scale === 0) return 0;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const p = 2 * (i * n + j), q = 2 * (j * n + i);
      if (Math.abs(A[p] / scale - A[q] / scale) > 64 * EPS || Math.abs(A[p + 1] / scale + A[q + 1] / scale) > 64 * EPS) throw new TypeError('Matrix must be Hermitian');
    }
    return scale;
  }
  function norm(A) {
    if (!(A instanceof Float64Array)) throw new TypeError('norm requires Float64Array');
    let scale = 0, sum = 1;
    for (const v of A) {
      if (!Number.isFinite(v)) throw new TypeError('norm requires finite values');
      const a = Math.abs(v);
      if (a === 0) continue;
      if (scale < a) { sum = 1 + sum * (scale / a) ** 2; scale = a; }
      else sum += (a / scale) ** 2;
    }
    return scale === 0 ? 0 : scale * Math.sqrt(sum);
  }
  function adj(A, rows, cols) {
    validate(A, rows, cols);
    const B = new Float64Array(A.length);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const p = 2 * (i * cols + j), q = 2 * (j * rows + i);
      B[q] = A[p]; B[q + 1] = -A[p + 1];
    }
    return B;
  }
  function matmul(A, B, rows, inner, cols) {
    validate(A, rows, inner, 'A'); validate(B, inner, cols, 'B');
    if (rows * cols > MAX_ELEMENTS) throw new RangeError('Product exceeds element cap');
    const C = new Float64Array(2 * rows * cols);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      let re = 0, im = 0, cr = 0, ci = 0;
      for (let k = 0; k < inner; k++) {
        const a = 2 * (i * inner + k), b = 2 * (k * cols + j);
        const yr = A[a] * B[b] - A[a + 1] * B[b + 1] - cr;
        const yi = A[a] * B[b + 1] + A[a + 1] * B[b] - ci;
        const tr = re + yr, ti = im + yi;
        cr = (tr - re) - yr; ci = (ti - im) - yi; re = tr; im = ti;
      }
      const p = 2 * (i * cols + j); C[p] = re; C[p + 1] = im;
    }
    return finiteOutput(C, 'Matrix product');
  }

  /** Full synchronous Hermitian cyclic Jacobi, ascending eigenvalues. */
  function eigHermitian(A, n, options = {}) {
    const scale = hermitian(A, n);
    if (n > 64) throw new RangeError('Eigensystem cap is 64');
    const maxSweeps = options.maxSweeps === undefined ? 80 : options.maxSweeps;
    if (!Number.isInteger(maxSweeps) || maxSweeps < 1 || maxSweeps > 200) throw new RangeError('maxSweeps outside [1, 200]');
    const h = new Float64Array(A.length), original = new Float64Array(A.length), v = new Float64Array(A.length);
    for (let i = 0; i < n; i++) {
      v[2 * (i * n + i)] = 1;
      for (let j = 0; j < n; j++) {
        const p = 2 * (i * n + j), q = 2 * (j * n + i);
        original[p] = scale ? A[p] / scale : 0;
        original[p + 1] = scale ? A[p + 1] / scale : 0;
        h[p] = scale ? .5 * (A[p] / scale + A[q] / scale) : 0;
        h[p + 1] = scale ? .5 * (A[p + 1] / scale - A[q + 1] / scale) : 0;
      }
    }
    const anorm = norm(original);
    let sweeps = 0, rotations = 0;
    for (; sweeps < maxSweeps; sweeps++) {
      let off2 = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        const z = 2 * (p * n + q); off2 += 2 * (h[z] ** 2 + h[z + 1] ** 2);
      }
      if (Math.sqrt(off2) <= 32 * EPS * anorm) break;
      const skip = EPS * anorm / n;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        const pp = 2 * (p * n + p), qq = 2 * (q * n + q), pq = 2 * (p * n + q);
        const r = Math.hypot(h[pq], h[pq + 1]);
        if (r <= skip) continue;
        const er = h[pq] / r, ei = h[pq + 1] / r, tau = (h[qq] - h[pp]) / (2 * r);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.hypot(1, tau));
        const cs = 1 / Math.hypot(1, t), sn = t * cs;
        h[pp] -= t * r; h[qq] += t * r;
        h[pq] = h[pq + 1] = h[2 * (q * n + p)] = h[2 * (q * n + p) + 1] = 0;
        for (let k = 0; k < n; k++) {
          const kp = 2 * (k * n + p), kq = 2 * (k * n + q);
          if (k !== p && k !== q) {
            const ar = h[kp], ai = h[kp + 1], br = h[kq], bi = h[kq + 1];
            const nr = cs * ar - sn * (er * br + ei * bi), ni = cs * ai - sn * (er * bi - ei * br);
            const mr = sn * (er * ar - ei * ai) + cs * br, mi = sn * (er * ai + ei * ar) + cs * bi;
            h[kp] = h[2 * (p * n + k)] = nr; h[kp + 1] = ni; h[2 * (p * n + k) + 1] = -ni;
            h[kq] = h[2 * (q * n + k)] = mr; h[kq + 1] = mi; h[2 * (q * n + k) + 1] = -mi;
          }
          const ar = v[kp], ai = v[kp + 1], br = v[kq], bi = v[kq + 1];
          v[kp] = cs * ar - sn * (er * br + ei * bi); v[kp + 1] = cs * ai - sn * (er * bi - ei * br);
          v[kq] = sn * (er * ar - ei * ai) + cs * br; v[kq + 1] = sn * (er * ai + ei * ar) + cs * bi;
        }
        rotations++;
      }
    }
    const order = Array.from({length: n}, (_, i) => i).sort((i, j) => h[2 * (i * n + i)] - h[2 * (j * n + j)]);
    const values = new Float64Array(n), normalizedValues = new Float64Array(n), vectors = new Float64Array(v.length);
    for (let j = 0; j < n; j++) {
      normalizedValues[j] = h[2 * (order[j] * n + order[j])]; values[j] = normalizedValues[j] * scale;
      for (let i = 0; i < n; i++) {
        vectors[2 * (i * n + j)] = v[2 * (i * n + order[j])];
        vectors[2 * (i * n + j) + 1] = v[2 * (i * n + order[j]) + 1];
      }
    }
    finiteOutput(values, 'Eigenvalues');
    const residual = matmul(original, vectors, n, n, n);
    const gram = matmul(adj(vectors, n, n), vectors, n, n, n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const z = 2 * (i * n + j);
      residual[z] -= normalizedValues[j] * vectors[z]; residual[z + 1] -= normalizedValues[j] * vectors[z + 1];
      if (i === j) gram[z] -= 1;
    }
    const residualRelative = anorm ? norm(residual) / anorm : 0, orthogonalityFrobenius = norm(gram);
    return {values, vectors, sweeps, rotations, residualRelative, orthogonalityFrobenius,
      converged: Number.isFinite(residualRelative) && residualRelative <= 2e-12 && orthogonalityFrobenius <= 2e-12};
  }

  /** Economy-size A = Q R, rows >= cols, including rank-deficient A. */
  function qr(A, rows, cols) {
    const scale = validate(A, rows, cols);
    if (rows < cols) throw new RangeError('Thin QR requires rows >= cols');
    const T = new Float64Array(A.length), reflectors = [];
    for (let i = 0; i < A.length; i++) T[i] = scale ? A[i] / scale : 0;
    for (let k = 0; k < cols; k++) {
      const v = new Float64Array(2 * (rows - k));
      for (let i = k; i < rows; i++) {
        const p = 2 * (i * cols + k); v[2 * (i - k)] = T[p]; v[2 * (i - k) + 1] = T[p + 1];
      }
      const length = norm(v);
      if (length === 0) { reflectors.push(null); continue; }
      const lead = Math.hypot(v[0], v[1]);
      const pr = lead ? v[0] / lead : 1, pi = lead ? v[1] / lead : 0;
      v[0] += pr * length; v[1] += pi * length;
      const vn = norm(v);
      for (let i = 0; i < v.length; i++) v[i] /= vn;
      applyReflector(T, rows, cols, k, k, v);
      T[2 * (k * cols + k)] = -pr * length; T[2 * (k * cols + k) + 1] = -pi * length;
      for (let i = k + 1; i < rows; i++) T[2 * (i * cols + k)] = T[2 * (i * cols + k) + 1] = 0;
      reflectors.push(v);
    }
    const Q = new Float64Array(2 * rows * cols), R = new Float64Array(2 * cols * cols);
    for (let k = 0; k < cols; k++) Q[2 * (k * cols + k)] = 1;
    for (let k = cols - 1; k >= 0; k--) if (reflectors[k]) applyReflector(Q, rows, cols, k, 0, reflectors[k]);
    for (let i = 0; i < cols; i++) for (let j = i; j < cols; j++) {
      const p = 2 * (i * cols + j); R[p] = T[p] * scale; R[p + 1] = T[p + 1] * scale;
    }
    finiteOutput(R, 'QR factor');
    return {Q, R};
  }
  function applyReflector(A, rows, cols, row0, col0, v) {
    for (let j = col0; j < cols; j++) {
      let dr = 0, di = 0;
      for (let i = row0; i < rows; i++) {
        const p = 2 * (i * cols + j), q = 2 * (i - row0);
        dr += v[q] * A[p] + v[q + 1] * A[p + 1]; di += v[q] * A[p + 1] - v[q + 1] * A[p];
      }
      dr *= 2; di *= 2;
      for (let i = row0; i < rows; i++) {
        const p = 2 * (i * cols + j), q = 2 * (i - row0);
        A[p] -= v[q] * dr - v[q + 1] * di; A[p + 1] -= v[q] * di + v[q + 1] * dr;
      }
    }
  }

  function columnNorm(B, rows, cols, j) {
    let scale = 0, sum = 1;
    for (let i = 0; i < rows; i++) for (let h = 0; h < 2; h++) {
      const a = Math.abs(B[2 * (i * cols + j) + h]);
      if (a === 0) continue;
      if (a > scale) { sum = 1 + sum * (scale / a) ** 2; scale = a; }
      else sum += (a / scale) ** 2;
    }
    return scale ? scale * Math.sqrt(sum) : 0;
  }
  function correlation(B, rows, cols, p, q, np, nq) {
    let re = 0, im = 0, cr = 0, ci = 0;
    if (np === 0 || nq === 0) return [0, 0];
    for (let i = 0; i < rows; i++) {
      const a = 2 * (i * cols + p), b = 2 * (i * cols + q);
      const ar = B[a] / np, ai = B[a + 1] / np, br = B[b] / nq, bi = B[b + 1] / nq;
      const yr = ar * br + ai * bi - cr, yi = ar * bi - ai * br - ci;
      const tr = re + yr, ti = im + yi;
      cr = (tr - re) - yr; ci = (ti - im) - yi; re = tr; im = ti;
    }
    return [re, im];
  }
  /** Descending singular values; no Gram matrix or small-value truncation. */
  function singularValues(A, rows, cols, options = {}) {
    const scale = validate(A, rows, cols);
    if (Math.min(rows, cols) > 64) throw new RangeError('SVD column cap is 64');
    const maxSweeps = options.maxSweeps === undefined ? 100 : options.maxSweeps;
    if (!Number.isInteger(maxSweeps) || maxSweeps < 1 || maxSweeps > 300) throw new RangeError('maxSweeps outside [1, 300]');
    let B = rows >= cols ? A.slice() : adj(A, rows, cols);
    if (rows < cols) { const old = rows; rows = cols; cols = old; }
    for (let i = 0; i < B.length; i++) B[i] = scale ? B[i] / scale : 0;
    const inputFrobenius = norm(B);
    const tolerance = 32 * EPS;
    let sweeps = 0, rotations = 0;
    for (; sweeps < maxSweeps; sweeps++) {
      let changed = false;
      for (let p = 0; p < cols; p++) for (let q = p + 1; q < cols; q++) {
        const np = columnNorm(B, rows, cols, p), nq = columnNorm(B, rows, cols, q);
        const [re, im] = correlation(B, rows, cols, p, q, np, nq), corr = Math.hypot(re, im);
        if (corr <= tolerance) continue;
        if (Math.min(np, nq) / Math.max(np, nq) < 1e-150) {
          // Underflow-safe limiting Jacobi rotation. Its cosine differs from 1
          // by <1e-300 and the larger column's relative change is <1e-300.
          // Evaluate the small-column update in normalized coordinates, so a
          // subnormal sine is never multiplied by a normal column. No column
          // is declared zero or truncated; only IEEE arithmetic may yield zero.
          for (let i = 0; i < rows; i++) {
            const a = 2 * (i * cols + p), b = 2 * (i * cols + q);
            if (np < nq) {
              const ar = B[a] / np, ai = B[a + 1] / np, br = B[b] / nq, bi = B[b + 1] / nq;
              B[a] = np * (ar - re * br - im * bi); B[a + 1] = np * (ai - re * bi + im * br);
            } else {
              const ar = B[a] / np, ai = B[a + 1] / np, br = B[b] / nq, bi = B[b + 1] / nq;
              B[b] = nq * (br - re * ar + im * ai); B[b + 1] = nq * (bi - re * ai - im * ar);
            }
          }
          rotations++; changed = true; continue;
        }
        const mx = Math.max(np, nq), ap = np / mx, aq = nq / mx, g = corr * ap * aq;
        if (g === 0) continue; // Certifier below will report nonconvergence, never success.
        const delta = aq * aq - ap * ap;
        // Equivalent to the usual Jacobi tau formula, without overflowing tau
        // when one column is many orders of magnitude smaller than the other.
        const t = (delta >= 0 ? 1 : -1) * (2 * g) / (Math.abs(delta) + Math.hypot(delta, 2 * g));
        if (t === 0) continue;
        const cs = 1 / Math.hypot(1, t), sn = t * cs, er = re / corr, ei = im / corr;
        for (let i = 0; i < rows; i++) {
          const a = 2 * (i * cols + p), b = 2 * (i * cols + q), ar = B[a], ai = B[a + 1], br = B[b], bi = B[b + 1];
          B[a] = cs * ar - sn * (er * br + ei * bi); B[a + 1] = cs * ai - sn * (er * bi - ei * br);
          B[b] = sn * (er * ar - ei * ai) + cs * br; B[b + 1] = sn * (er * ai + ei * ar) + cs * bi;
        }
        rotations++; changed = true;
      }
      if (!changed) break;
    }
    const values = new Float64Array(cols), norms = new Float64Array(cols);
    for (let j = 0; j < cols; j++) { norms[j] = columnNorm(B, rows, cols, j); values[j] = norms[j] * scale; }
    let maxCorrelation = 0;
    for (let p = 0; p < cols; p++) for (let q = p + 1; q < cols; q++) {
      const c = correlation(B, rows, cols, p, q, norms[p], norms[q]);
      maxCorrelation = Math.max(maxCorrelation, Math.hypot(c[0], c[1]));
    }
    values.sort((a, b) => b - a); finiteOutput(values, 'Singular values');
    const frobeniusRelativeError = inputFrobenius ? Math.abs(norm(norms) - inputFrobenius) / inputFrobenius : 0;
    return {values, converged: Number.isFinite(maxCorrelation) && maxCorrelation <= tolerance && frobeniusRelativeError <= 2e-12,
      sweeps, rotations, maxCorrelation, frobeniusRelativeError};
  }

  // Scaled complex division avoids squaring a possibly tiny or huge diagonal.
  function divide(ar, ai, br, bi) {
    const s = Math.max(Math.abs(br), Math.abs(bi));
    if (s === 0) throw new RangeError('Singular triangular factor');
    const r = br / s, i = bi / s, d = r * r + i * i;
    return [((ar / s) * r + (ai / s) * i) / d, ((ai / s) * r - (ar / s) * i) / d];
  }
  /** Solve upper-triangular R X = B. A zero pivot or overflow throws. */
  function triangularSolve(R, B, n, nrhs) {
    const scale = validate(R, n, n, 'R'); validate(B, n, nrhs, 'B');
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
      const p = 2 * (i * n + j);
      if (R[p] !== 0 || R[p + 1] !== 0) throw new TypeError('R must be upper triangular');
    }
    if (scale === 0) throw new RangeError('Singular triangular factor');
    const X = B.slice();
    for (let i = n - 1; i >= 0; i--) for (let h = 0; h < nrhs; h++) {
      const p = 2 * (i * nrhs + h); let re = X[p], im = X[p + 1];
      for (let j = i + 1; j < n; j++) {
        const a = 2 * (i * n + j), b = 2 * (j * nrhs + h);
        re -= R[a] * X[b] - R[a + 1] * X[b + 1]; im -= R[a] * X[b + 1] + R[a + 1] * X[b];
      }
      const a = 2 * (i * n + i), z = divide(re, im, R[a], R[a + 1]); X[p] = z[0]; X[p + 1] = z[1];
    }
    return finiteOutput(X, 'Triangular solution');
  }
  /** Solve Hermitian positive-definite A X = B; return null if not positive definite. */
  function cholSolve(A, B, n, nrhs) {
    const scale = hermitian(A, n); validate(B, n, nrhs, 'B');
    if (scale === 0) return null;
    const L = new Float64Array(A.length);
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      const p = 2 * (i * n + j); let re = A[p] / scale, im = A[p + 1] / scale;
      for (let k = 0; k < j; k++) {
        const a = 2 * (i * n + k), b = 2 * (j * n + k);
        re -= L[a] * L[b] + L[a + 1] * L[b + 1]; im -= L[a + 1] * L[b] - L[a] * L[b + 1];
      }
      if (i === j) {
        if (!(re > 0) || !Number.isFinite(re)) return null;
        L[p] = Math.sqrt(re);
      } else { const d = L[2 * (j * n + j)]; L[p] = re / d; L[p + 1] = im / d; }
    }
    // A/scale = LL^H. Scale B first so tiny A does not underflow in a product.
    const X = B.slice(); for (let i = 0; i < X.length; i++) X[i] /= scale;
    for (let i = 0; i < n; i++) for (let h = 0; h < nrhs; h++) {
      const p = 2 * (i * nrhs + h); let re = X[p], im = X[p + 1];
      for (let j = 0; j < i; j++) {
        const a = 2 * (i * n + j), b = 2 * (j * nrhs + h);
        re -= L[a] * X[b] - L[a + 1] * X[b + 1]; im -= L[a] * X[b + 1] + L[a + 1] * X[b];
      }
      const d = L[2 * (i * n + i)]; X[p] = re / d; X[p + 1] = im / d;
    }
    for (let i = n - 1; i >= 0; i--) for (let h = 0; h < nrhs; h++) {
      const p = 2 * (i * nrhs + h); let re = X[p], im = X[p + 1];
      for (let j = i + 1; j < n; j++) {
        const a = 2 * (j * n + i), b = 2 * (j * nrhs + h);
        re -= L[a] * X[b] + L[a + 1] * X[b + 1]; im -= L[a] * X[b + 1] - L[a + 1] * X[b];
      }
      const d = L[2 * (i * n + i)]; X[p] = re / d; X[p + 1] = im / d;
    }
    return finiteOutput(X, 'Cholesky solution');
  }
  return Object.freeze({eigHermitian, qr, singularValues, triangularSolve, cholSolve, matmul, adj, norm});
});
