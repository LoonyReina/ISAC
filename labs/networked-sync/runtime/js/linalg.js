/* Dependency-free, row-major interleaved Float64 complex linear algebra.
 * Original SyncLinalg object API, SVD vectors, pseudoinverse and small general
 * eigenpairs. Low-level Householder/Jacobi kernels adapted from the project's
 * original reviewed ofdm-ici-browser-prototype/js/linalg.js, SHA-256
 * c7e21dadbac282314c504c5f1b73a4de18964c18ee1d06cc34eedcce1d81509a.
 * No third-party source code. Hermitian dimension cap raised to 192.
 * Hermitian Jacobi rotations and certification adapted from:
 * nearfield-music-browser-prototype/src/receiver.mjs, hermitianEigh
 * SHA-256 16e0df92c3221a56c51f430cb0f3afc29249f496c6bba9d09ffdf456f2a5f981.
 * QR uses complex Householder reflectors. SVD is one-sided complex Jacobi:
 * it never forms A^H A, preserving small singular values for rank decisions.
 * Inputs are never mutated. No normal-equation solve, inverse, or loading.
 * leastSquares explicitly truncates singular values according to caller rcond.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SyncLinalg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = Number.EPSILON;
  const MAX_DIM = 8192;
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
  function normRaw(A) {
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
    if (n > 192) throw new RangeError('Eigensystem cap is 192');
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
    const anorm = normRaw(original);
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
    const residualRelative = anorm ? normRaw(residual) / anorm : 0, orthogonalityFrobenius = normRaw(gram);
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
      const length = normRaw(v);
      if (length === 0) { reflectors.push(null); continue; }
      const lead = Math.hypot(v[0], v[1]);
      const pr = lead ? v[0] / lead : 1, pi = lead ? v[1] / lead : 0;
      v[0] += pr * length; v[1] += pi * length;
      const vn = normRaw(v);
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
  // Scaled complex division avoids squaring a possibly tiny or huge diagonal.
  function divide(ar, ai, br, bi) {
    const s = Math.max(Math.abs(br), Math.abs(bi));
    if (s === 0) throw new RangeError('Singular triangular factor');
    const r = br / s, i = bi / s, d = r * r + i * i;
    return [((ar / s) * r + (ai / s) * i) / d, ((ai / s) * r - (ar / s) * i) / d];
  }
  /** All public matrices are row-major interleaved complex Float64Array objects. */
  function mat(rows, cols, data) {
    dimension(rows, 'rows'); dimension(cols, 'cols');
    if (rows * cols > MAX_ELEMENTS) throw new RangeError('Matrix exceeds element cap');
    const out = data === undefined ? new Float64Array(2 * rows * cols) : new Float64Array(data);
    validate(out, rows, cols);
    return {rows, cols, data: out};
  }
  function check(A) {
    if (!A || typeof A !== 'object') throw new TypeError('Expected a complex matrix object');
    return validate(A.data, A.rows, A.cols);
  }
  function adjoint(A) { check(A); return {rows:A.cols, cols:A.rows, data:adj(A.data,A.rows,A.cols)}; }
  function multiply(A,B) {
    check(A); check(B);
    if(A.cols!==B.rows) throw new RangeError('Incompatible matrix multiplication dimensions');
    return {rows:A.rows,cols:B.cols,data:matmul(A.data,B.data,A.rows,A.cols,B.cols)};
  }
  function norm(A) { return normRaw(A && A.data instanceof Float64Array ? A.data : A); }
  function failure(message, diagnostics) {
    const e = new RangeError(message); e.code='NUMERICAL_DEGENERACY'; e.diagnostics=diagnostics; return e;
  }
  function optionRcond(options) {
    const r = options.rcond === undefined ? 1e-12 : options.rcond;
    if (!(r >= 0 && r < 1) || !Number.isFinite(r)) throw new RangeError('rcond must be finite in [0,1)');
    return r;
  }
  function rotateColumns(B, rows, cols, p, q, cs, sn, er, ei) {
    for(let i=0;i<rows;i++) {
      const a=2*(i*cols+p),b=2*(i*cols+q),ar=B[a],ai=B[a+1],br=B[b],bi=B[b+1];
      B[a]=cs*ar-sn*(er*br+ei*bi); B[a+1]=cs*ai-sn*(er*bi-ei*br);
      B[b]=sn*(er*ar-ei*ai)+cs*br; B[b+1]=sn*(er*ai+ei*ar)+cs*bi;
    }
  }
  /** Original one-sided complex Jacobi SVD. A^H A is never formed. */
  function svd(A, options={}) {
    const scale=check(A), rcond=optionRcond(options), transposed=A.rows<A.cols;
    const rows=Math.max(A.rows,A.cols),cols=Math.min(A.rows,A.cols);
    if(cols>64) throw new RangeError('Thin SVD dimension cap is 64');
    const B=transposed?adj(A.data,A.rows,A.cols):A.data.slice(), V=new Float64Array(2*cols*cols);
    for(let i=0;i<B.length;i++) B[i]=scale?B[i]/scale:0;
    for(let j=0;j<cols;j++) V[2*(j*cols+j)]=1;
    const tolerance=32*EPS, maxSweeps=options.maxSweeps===undefined?100:options.maxSweeps;
    if(!Number.isInteger(maxSweeps)||maxSweeps<1||maxSweeps>300) throw new RangeError('maxSweeps outside [1,300]');
    const inputNorm=normRaw(B);
    let sweeps=0,rotations=0;
    for(;sweeps<maxSweeps;sweeps++) {
      let changed=false;
      for(let p=0;p<cols;p++) for(let q=p+1;q<cols;q++) {
        const np=columnNorm(B,rows,cols,p),nq=columnNorm(B,rows,cols,q);
        const [re,im]=correlation(B,rows,cols,p,q,np,nq),corr=Math.hypot(re,im);
        if(corr<=tolerance) continue;
        const mx=Math.max(np,nq),ap=np/mx,aq=nq/mx,g=corr*ap*aq,delta=aq*aq-ap*ap;
        if(g===0) continue;
        const t=(delta>=0?1:-1)*(2*g)/(Math.abs(delta)+Math.hypot(delta,2*g));
        if(t===0) continue;
        const cs=1/Math.hypot(1,t),sn=t*cs,er=re/corr,ei=im/corr;
        rotateColumns(B,rows,cols,p,q,cs,sn,er,ei);
        rotateColumns(V,cols,cols,p,q,cs,sn,er,ei);
        changed=true;rotations++;
      }
      if(!changed) break;
    }
    const norms=Float64Array.from({length:cols},(_,j)=>columnNorm(B,rows,cols,j));
    let maxCorrelation=0;
    for(let p=0;p<cols;p++) for(let q=p+1;q<cols;q++) {
      const [re,im]=correlation(B,rows,cols,p,q,norms[p],norms[q]);maxCorrelation=Math.max(maxCorrelation,Math.hypot(re,im));
    }
    const order=Array.from({length:cols},(_,j)=>j).sort((a,b)=>norms[b]-norms[a]);
    const values=new Float64Array(cols),un=new Float64Array(2*rows*cols),vn=new Float64Array(2*cols*cols);
    for(let j=0;j<cols;j++) {
      const src=order[j],s=norms[src]; values[j]=s*scale;
      for(let i=0;i<rows;i++) {const p=2*(i*cols+j),q=2*(i*cols+src);un[p]=s?B[q]/s:0;un[p+1]=s?B[q+1]/s:0;}
      for(let i=0;i<cols;i++) {const p=2*(i*cols+j),q=2*(i*cols+src);vn[p]=V[q];vn[p+1]=V[q+1];}
    }
    finiteOutput(values,'Singular values');
    const U={rows:A.rows,cols,data:transposed?vn:un};
    const Vh={rows:cols,cols:A.cols,data:transposed?adj(un,rows,cols):adj(vn,cols,cols)};
    const rank=values[0]===0?0:Array.from(values).filter(v=>v>rcond*values[0]).length;
    // Certify reconstruction in normalized arithmetic, including null singular directions.
    const scaledU=U.data.slice();
    for(let i=0;i<U.rows;i++) for(let j=0;j<cols;j++) {const p=2*(i*cols+j);scaledU[p]*=norms[order[j]];scaledU[p+1]*=norms[order[j]];}
    const rec=matmul(scaledU,Vh.data,U.rows,cols,Vh.cols);
    for(let i=0;i<rec.length;i++) rec[i]-=scale?A.data[i]/scale:0;
    const residualRelative=inputNorm?normRaw(rec)/inputNorm:0;
    const frobeniusRelativeError=inputNorm?Math.abs(normRaw(norms)-inputNorm)/inputNorm:0;
    const converged=Number.isFinite(maxCorrelation)&&maxCorrelation<=tolerance&&residualRelative<=2e-12&&frobeniusRelativeError<=2e-12;
    const diagnostics={method:'one-sided-complex-Jacobi',converged,sweeps,rotations,maxCorrelation,residualRelative,frobeniusRelativeError,rank,rcond};
    if(!converged) throw failure('Complex SVD failed convergence certificate',diagnostics);
    return {U,values,singularValues:values,Vh,rank,condition:rank===cols&&values[cols-1]>0?values[0]/values[cols-1]:Infinity,converged,diagnostics};
  }
  /** SVD pseudoinverse solve matches lstsq rcond semantics; rank loss is reported. */
  function leastSquares(A,B,options={}) {
    const scaleA=check(A),scaleB=check(B);
    if(A.rows!==B.rows) throw new RangeError('Least-squares row dimensions differ');
    const dec=svd(A,options),r=dec.values.length,nrhs=B.cols;
    if(options.requireFullRank && dec.rank<r) throw failure('Least-squares design is rank deficient',dec.diagnostics);
    // Work on independently normalized A and B. In particular, the residual
    // certificate must not overflow solely because A^H residual is enormous.
    const bn=B.data.slice(),an=A.data.slice();
    for(let i=0;i<bn.length;i++) bn[i]=scaleB?bn[i]/scaleB:0;
    for(let i=0;i<an.length;i++) an[i]=scaleA?an[i]/scaleA:0;
    const projected=matmul(adj(dec.U.data,dec.U.rows,r),bn,r,A.rows,nrhs);
    for(let i=0;i<r;i++) for(let h=0;h<nrhs;h++) {
      const p=2*(i*nrhs+h),sn=scaleA?dec.values[i]/scaleA:0;
      if(i<dec.rank) {projected[p]/=sn;projected[p+1]/=sn;} else projected[p]=projected[p+1]=0;
    }
    const xn=matmul(adj(dec.Vh.data,r,A.cols),projected,A.cols,r,nrhs);
    const solution={rows:A.cols,cols:nrhs,data:xn.slice()};
    const ratio=scaleA&&scaleB?scaleB/scaleA:0;
    for(let i=0;i<solution.data.length;i++) solution.data[i]*=ratio;
    finiteOutput(solution.data,'Least-squares solution');
    const residual=matmul(an,xn,A.rows,A.cols,nrhs);
    for(let i=0;i<residual.length;i++) residual[i]-=bn[i];
    const normalizedResidual=normRaw(residual),bNorm=normRaw(bn);
    const rn=normalizedResidual*scaleB,residualRelative=bNorm?normalizedResidual/bNorm:normalizedResidual;
    const normal=matmul(adj(an,A.rows,A.cols),residual,A.cols,A.rows,nrhs);
    const aNorm=normRaw(an),normalDen=aNorm*(aNorm*normRaw(xn)+bNorm);
    const normalResidualRelative=normalDen?normRaw(normal)/normalDen:0;
    return {solution,x:solution,rank:dec.rank,condition:dec.condition,singularValues:dec.values,residualRelative,residualNorm:rn,normalResidualRelative,converged:dec.converged,diagnostics:{...dec.diagnostics,normalResidualRelative,residualRelative}};
  }
  /** Descending certified Hermitian eigenpairs; accepts rank or {rank,maxSweeps}. */
  function hermitianEigen(A, rankOrOptions) {
    check(A);if(A.rows!==A.cols) throw new RangeError('Hermitian eigensystem requires square matrix');
    const options=typeof rankOrOptions==='number'?{rank:rankOrOptions}:(rankOrOptions||{});
    const n=A.rows, rank=options.rank===undefined?n:options.rank;
    if(!Number.isInteger(rank)||rank<1||rank>n) throw new RangeError('Invalid eigenpair count');
    const raw=eigHermitian(A.data,n,options);
    const diagnostics={method:'full-complex-Hermitian-Jacobi',converged:raw.converged,sweeps:raw.sweeps,rotations:raw.rotations,residualRelative:raw.residualRelative,orthogonalityFrobenius:raw.orthogonalityFrobenius};
    if(!raw.converged) throw failure('Hermitian eigensystem failed convergence certificate',diagnostics);
    const values=new Float64Array(rank),vectors=mat(n,rank);
    for(let j=0;j<rank;j++) {const src=n-1-j;values[j]=raw.values[src];for(let i=0;i<n;i++) {const p=2*(i*rank+j),q=2*(i*n+src);vectors.data[p]=raw.vectors[q];vectors.data[p+1]=raw.vectors[q+1];}}
    const an=normRaw(A.data),AV=multiply(A,vectors),residuals=[];
    for(let j=0;j<rank;j++) {const rr=new Float64Array(2*n);for(let i=0;i<n;i++) {const p=2*(i*rank+j);rr[2*i]=AV.data[p]-values[j]*vectors.data[p];rr[2*i+1]=AV.data[p+1]-values[j]*vectors.data[p+1];}residuals.push(an?normRaw(rr)/an:0);}
    return {values,vectors,residuals,converged:true,diagnostics};
  }
  function cmul(a,b) {return [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];}
  function cadd(a,b) {return [a[0]+b[0],a[1]+b[1]];}
  function csub(a,b) {return [a[0]-b[0],a[1]-b[1]];}
  function csqrt(z) {
    const h=Math.hypot(z[0],z[1]);if(h===0)return [0,0];
    if(z[0]>=0) {const r=Math.sqrt((h+z[0])/2);return [r,z[1]/(2*r)];}
    const i=(z[1]>=0?1:-1)*Math.sqrt((h-z[0])/2);return [z[1]/(2*i),i];
  }
  function roots2(a,b,c,d) {
    const tr=cadd(a,d),dif=csub(a,d),bc=cmul(b,c),disc=cmul(dif,dif);
    disc[0]+=4*bc[0];disc[1]+=4*bc[1];const s=csqrt(disc);
    let x=[(tr[0]+s[0])/2,(tr[1]+s[1])/2],y=[(tr[0]-s[0])/2,(tr[1]-s[1])/2];
    // Recover the smaller root by determinant division to avoid cancellation.
    const det=csub(cmul(a,d),bc);
    if(Math.hypot(...x)<Math.hypot(...y)) [x,y]=[y,x];
    if(Math.hypot(...x)>0) y=divide(det[0],det[1],x[0],x[1]);
    return [x,y];
  }
  /** Shifted complex QR for dimensions <=3; eigenvectors from direct one-sided SVD. */
  function eigen(A, options={}) {
    const scale=check(A),n=A.rows;
    if(A.cols!==n||n>3) throw new RangeError('General eigensystem supports square dimensions 1–3');
    const T=A.data.slice();for(let i=0;i<T.length;i++) T[i]=scale?T[i]/scale:0;
    const original=T.slice(),an=normRaw(T),values=new Array(n);
    let active=n,iterations=0;
    const maxIterations=options.maxIterations===undefined?2000:options.maxIterations;
    if(!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>10000) throw new RangeError('maxIterations outside [1,10000]');
    function at(i,j){const p=2*(i*n+j);return [T[p],T[p+1]];}
    while(active>0) {
      if(active===1) {values[0]=at(0,0);break;}
      if(active===2) {const rs=roots2(at(0,0),at(0,1),at(1,0),at(1,1));values[0]=rs[0];values[1]=rs[1];break;}
      let lower=0;for(let j=0;j<active-1;j++){const z=at(active-1,j);lower+=z[0]*z[0]+z[1]*z[1];}
      if(Math.sqrt(lower)<=32*EPS*Math.max(an,1)) {values[active-1]=at(active-1,active-1);active--;continue;}
      if(iterations>=maxIterations) throw failure('General eigensystem QR did not converge',{iterations,converged:false});
      const last=at(active-1,active-1),rs=roots2(at(active-2,active-2),at(active-2,active-1),at(active-1,active-2),last);
      const d0=Math.hypot(rs[0][0]-last[0],rs[0][1]-last[1]),d1=Math.hypot(rs[1][0]-last[0],rs[1][1]-last[1]);
      let mu=d0<d1?rs[0]:rs[1];
      // An occasional deterministic exceptional shift breaks a QR stagnation cycle.
      if(iterations>0&&iterations%40===0) mu=[last[0]+0.731*Math.sqrt(lower),last[1]+0.417*Math.sqrt(lower)];
      const block=new Float64Array(2*active*active);
      for(let i=0;i<active;i++)for(let j=0;j<active;j++){const p=2*(i*active+j),z=at(i,j);block[p]=z[0]-(i===j?mu[0]:0);block[p+1]=z[1]-(i===j?mu[1]:0);}
      const q=qr(block,active,active),next=matmul(q.R,q.Q,active,active,active);
      for(let i=0;i<active;i++)for(let j=0;j<active;j++){const p=2*(i*n+j),q=2*(i*active+j);T[p]=next[q]+(i===j?mu[0]:0);T[p+1]=next[q+1]+(i===j?mu[1]:0);}
      iterations++;
    }
    const vectors=mat(n,n),residuals=[];
    for(let j=0;j<n;j++) {
      const shifted=original.slice(),z=values[j];for(let i=0;i<n;i++){const p=2*(i*n+i);shifted[p]-=z[0];shifted[p+1]-=z[1];}
      const dec=svd({rows:n,cols:n,data:shifted},{rcond:1e-12}),src=n-1;
      for(let i=0;i<n;i++){const p=2*(i*n+j),q=2*(src*n+i);vectors.data[p]=dec.Vh.data[q];vectors.data[p+1]=-dec.Vh.data[q+1];}
      // Canonicalize only arbitrary phase; do not force real mixing vectors.
      let pivot=0,mag=0;for(let i=0;i<n;i++){const p=2*(i*n+j),m=Math.hypot(vectors.data[p],vectors.data[p+1]);if(m>mag){mag=m;pivot=i;}}
      const p=2*(pivot*n+j),pr=vectors.data[p]/mag,pi=vectors.data[p+1]/mag;
      for(let i=0;i<n;i++){const k=2*(i*n+j),r=vectors.data[k],im=vectors.data[k+1];vectors.data[k]=r*pr+im*pi;vectors.data[k+1]=im*pr-r*pi;}
      let r2=0;for(let i=0;i<n;i++){let re=0,im=0;for(let k=0;k<n;k++){const a=2*(i*n+k),b=2*(k*n+j);re+=shifted[a]*vectors.data[b]-shifted[a+1]*vectors.data[b+1];im+=shifted[a]*vectors.data[b+1]+shifted[a+1]*vectors.data[b];}r2+=re*re+im*im;}residuals.push(Math.sqrt(r2)/Math.max(an,1));
    }
    const vd=svd(vectors),condition=vd.condition;
    let minimumSeparation=Infinity;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) minimumSeparation=Math.min(minimumSeparation,Math.hypot(values[i][0]-values[j][0],values[i][1]-values[j][1]));
    const converged=residuals.every(r=>Number.isFinite(r)&&r<=2e-10)&&condition<1e10;
    const diagnostics={method:'complex-shifted-QR-and-direct-SVD',iterations,converged,residuals,eigenvectorCondition:condition,minimumSeparation:minimumSeparation*scale};
    if(!converged) throw failure('General eigensystem is defective or failed residual certificate',diagnostics);
    for(const z of values) {z[0]*=scale;z[1]*=scale;}
    return {values,vectors,residuals,condition,converged,diagnostics};
  }
  function rankOneSVD(A,options={}) {
    const d=svd(A,options),sigma=d.values[0];
    if(!(sigma>0)) throw failure('Rank-one separation requires nonzero input',d.diagnostics);
    const left=new Float64Array(2*A.rows),rightH=new Float64Array(2*A.cols);
    for(let i=0;i<A.rows;i++){left[2*i]=d.U.data[2*(i*d.U.cols)];left[2*i+1]=d.U.data[2*(i*d.U.cols)+1];}
    for(let j=0;j<A.cols;j++){rightH[2*j]=d.Vh.data[2*j];rightH[2*j+1]=d.Vh.data[2*j+1];}
    const relative=normRaw(d.values.slice(1))/normRaw(d.values);
    const gap=d.values.length===1?Infinity:(sigma-d.values[1])/sigma;
    if(gap<=64*EPS) throw failure('Leading singular vector is numerically non-unique',{...d.diagnostics,relativeGap:gap});
    return {left,sigma,rightH,residual:relative,residualRelative:relative,converged:d.converged,diagnostics:{...d.diagnostics,relativeGap:gap}};
  }
  return Object.freeze({mat,adjoint,multiply,norm,leastSquares,hermitianEigen,eigen,rankOneSVD,svd});
});
