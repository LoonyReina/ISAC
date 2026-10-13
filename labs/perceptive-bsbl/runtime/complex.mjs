// Original interleaved Float64 complex matrix arithmetic. No third-party numerical code.
export class NumericalError extends Error { constructor(message) { super(message); this.name='NumericalError'; } }
export function matrix(rows,cols,data) {
  if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows>256||cols>256) throw new RangeError('matrix shape exceeds 1..256');
  const a=data===undefined?new Float64Array(2*rows*cols):new Float64Array(data);
  if(a.length!==2*rows*cols||!a.every(Number.isFinite))throw new RangeError('finite interleaved matrix shape required');
  return {rows,cols,data:a};
}
export function checkMatrix(a) {
  if(!a||!(a.data instanceof Float64Array)||!Number.isInteger(a.rows)||!Number.isInteger(a.cols)||a.rows<1||a.cols<1||a.rows>256||a.cols>256||a.data.length!==2*a.rows*a.cols||!a.data.every(Number.isFinite))throw new RangeError('invalid finite complex matrix');
  return a;
}
export const copy=a=>matrix(a.rows,a.cols,a.data);
export function identity(n){const a=matrix(n,n);for(let j=0;j<n;j++)a.data[2*(j*n+j)]=1;return a;}
export function energy(a){let s=0;for(const v of a.data)s+=v*v;if(!Number.isFinite(s))throw new NumericalError('energy overflow');return s;}
export function adjointProduct(a,b){
  if(a.rows!==b.rows)throw new RangeError('adjoint product shape');
  const out=matrix(a.cols,b.cols),x=a.data,y=b.data,z=out.data;
  for(let i=0;i<a.cols;i++)for(let j=0;j<b.cols;j++) {let re=0,im=0;for(let k=0;k<a.rows;k++){const p=2*(k*a.cols+i),q=2*(k*b.cols+j);re+=x[p]*y[q]+x[p+1]*y[q+1];im+=x[p]*y[q+1]-x[p+1]*y[q];}const t=2*(i*b.cols+j);z[t]=re;z[t+1]=im;}
  return out;
}
export function multiply(a,b){
  if(a.cols!==b.rows)throw new RangeError('product shape');const out=matrix(a.rows,b.cols),x=a.data,y=b.data,z=out.data;
  for(let i=0;i<a.rows;i++)for(let k=0;k<a.cols;k++){const p=2*(i*a.cols+k);for(let j=0;j<b.cols;j++){const q=2*(k*b.cols+j),t=2*(i*b.cols+j);z[t]+=x[p]*y[q]-x[p+1]*y[q+1];z[t+1]+=x[p]*y[q+1]+x[p+1]*y[q];}}return out;
}
export function hermitian(a){if(a.rows!==a.cols)throw new RangeError('square required');const out=copy(a),n=a.rows,d=out.data;for(let i=0;i<n;i++){d[2*(i*n+i)+1]=0;for(let j=0;j<i;j++){const p=2*(i*n+j),q=2*(j*n+i),r=(d[p]+d[q])/2,v=(d[p+1]-d[q+1])/2;d[p]=d[q]=r;d[p+1]=v;d[q+1]=-v;}}return out;}
export function columns(a,ids){const out=matrix(a.rows,ids.length);for(let i=0;i<a.rows;i++)for(let j=0;j<ids.length;j++){const p=2*(i*a.cols+ids[j]),q=2*(i*ids.length+j);out.data[q]=a.data[p];out.data[q+1]=a.data[p+1];}return out;}
export function rows(a,start,count){return matrix(count,a.cols,a.data.slice(2*start*a.cols,2*(start+count)*a.cols));}
export function chol(a,relativeFloor=1e-14){
  if(a.rows!==a.cols)throw new RangeError('Cholesky square required');const n=a.rows,l=matrix(n,n),x=a.data,d=l.data;let maxdiag=0,minpivot=Infinity,maxpivot=0;
  for(let i=0;i<n;i++)maxdiag=Math.max(maxdiag,Math.abs(x[2*(i*n+i)]));
  if(!Number.isFinite(maxdiag)||maxdiag===0)throw new NumericalError('non-positive covariance');
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let re=x[2*(i*n+j)],im=x[2*(i*n+j)+1];for(let k=0;k<j;k++){const p=2*(i*n+k),q=2*(j*n+k);re-=d[p]*d[q]+d[p+1]*d[q+1];im-=d[p+1]*d[q]-d[p]*d[q+1];}const t=2*(i*n+j);if(i===j){if(!Number.isFinite(re)||re<=relativeFloor*maxdiag||Math.abs(im)>1e-10*maxdiag)throw new NumericalError('non-positive or ill-conditioned Cholesky pivot');d[t]=Math.sqrt(re);minpivot=Math.min(minpivot,re);maxpivot=Math.max(maxpivot,re);}else{d[t]=re/d[2*(j*n+j)];d[t+1]=im/d[2*(j*n+j)];}}
  l.pivotRatio=minpivot/maxpivot;return l;
}
export function solve(l,b){
  if(l.rows!==l.cols||b.rows!==l.rows)throw new RangeError('solve shape');const n=l.rows,m=b.cols,x=copy(b),a=l.data,d=x.data;
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){const t=2*(i*m+j);let re=d[t],im=d[t+1];for(let k=0;k<i;k++){const p=2*(i*n+k),q=2*(k*m+j);re-=a[p]*d[q]-a[p+1]*d[q+1];im-=a[p]*d[q+1]+a[p+1]*d[q];}d[t]=re/a[2*(i*n+i)];d[t+1]=im/a[2*(i*n+i)];}
  for(let i=n-1;i>=0;i--)for(let j=0;j<m;j++){const t=2*(i*m+j);let re=d[t],im=d[t+1];for(let k=i+1;k<n;k++){const p=2*(k*n+i),q=2*(k*m+j);re-=a[p]*d[q]+a[p+1]*d[q+1];im-=a[p]*d[q+1]-a[p+1]*d[q];}d[t]=re/a[2*(i*n+i)];d[t+1]=im/a[2*(i*n+i)];}
  if(!d.every(Number.isFinite))throw new NumericalError('solve overflow');return x;
}
export function logdet(l){let v=0;for(let i=0;i<l.rows;i++)v+=2*Math.log(l.data[2*(i*l.rows+i)]);return v;}
export function innerReal(a,b){if(a.rows!==b.rows||a.cols!==b.cols)throw new RangeError('inner shape');let v=0;for(let i=0;i<a.data.length;i++)v+=a.data[i]*b.data[i];return v;}
// Real symmetric Jacobi on [[Re H,-Im H],[Im H,Re H]]; eigenvalues are duplicated.
// Used only for <=8 dimensional block rank checks / extraction, never large dense solves.
export function eigenvaluesHermitian(h){
  if(h.rows!==h.cols||h.rows>8)throw new RangeError('small Hermitian matrix required');const d=h.rows,n=2*d,a=new Float64Array(n*n);
  for(let i=0;i<d;i++)for(let j=0;j<d;j++){const p=2*(i*d+j),r=h.data[p],v=h.data[p+1];a[i*n+j]=a[(i+d)*n+j+d]=r;a[i*n+j+d]=-v;a[(i+d)*n+j]=v;}
  let converged=false;for(let it=0;it<100*n*n;it++){let mx=0,p=0,q=1,scale=0;for(let i=0;i<n;i++){scale=Math.max(scale,Math.abs(a[i*n+i]));for(let j=i+1;j<n;j++)if(Math.abs(a[i*n+j])>mx){mx=Math.abs(a[i*n+j]);p=i;q=j;}}if(mx<=1e-14*Math.max(scale,Number.MIN_VALUE)){converged=true;break;}const ap=a[p*n+p],aq=a[q*n+q],off=a[p*n+q],tau=(aq-ap)/(2*off),t=(tau>=0?1:-1)/(Math.abs(tau)+Math.hypot(1,tau)),c=1/Math.sqrt(1+t*t),s=t*c;for(let k=0;k<n;k++)if(k!==p&&k!==q){const x=a[k*n+p],y=a[k*n+q];a[k*n+p]=a[p*n+k]=c*x-s*y;a[k*n+q]=a[q*n+k]=s*x+c*y;}a[p*n+p]=ap-t*off;a[q*n+q]=aq+t*off;a[p*n+q]=a[q*n+p]=0;}
  if(!converged)throw new NumericalError('block eigenvalue iteration cap');const vals=Array.from({length:n},(_,i)=>a[i*n+i]).sort((a,b)=>a-b);return Float64Array.from({length:d},(_,i)=>(vals[2*i]+vals[2*i+1])/2);
}
// Twice-reorthogonalized complex QR, explicit rank failure instead of hidden ridge or pseudoinverse.
export function leastSquares(a,y,rtol=1e-11){
  if(a.rows!==y.rows||a.cols>a.rows)throw new NumericalError('unsupported underdetermined LS');const n=a.rows,p=a.cols,r=matrix(p,p),q=matrix(n,p);let maxnorm=0;
  for(let j=0;j<p;j++){const v=columns(a,[j]);let initial=Math.sqrt(energy(v));maxnorm=Math.max(maxnorm,initial);for(let pass=0;pass<2;pass++)for(let k=0;k<j;k++){let re=0,im=0;for(let i=0;i<n;i++){const t=2*(i*p+k),u=2*i;re+=q.data[t]*v.data[u]+q.data[t+1]*v.data[u+1];im+=q.data[t]*v.data[u+1]-q.data[t+1]*v.data[u];}const t=2*(k*p+j);r.data[t]+=re;r.data[t+1]+=im;for(let i=0;i<n;i++){const u=2*i,t=2*(i*p+k);v.data[u]-=q.data[t]*re-q.data[t+1]*im;v.data[u+1]-=q.data[t]*im+q.data[t+1]*re;}}const norm=Math.sqrt(energy(v));if(norm<=rtol*maxnorm)throw new NumericalError('rank-deficient LS design');r.data[2*(j*p+j)]=norm;for(let i=0;i<n;i++){q.data[2*(i*p+j)]=v.data[2*i]/norm;q.data[2*(i*p+j)+1]=v.data[2*i+1]/norm;}}
  const x=adjointProduct(q,y);for(let i=p-1;i>=0;i--)for(let m=0;m<y.cols;m++){const t=2*(i*y.cols+m);let re=x.data[t],im=x.data[t+1];for(let j=i+1;j<p;j++){const u=2*(i*p+j),v=2*(j*y.cols+m);re-=r.data[u]*x.data[v]-r.data[u+1]*x.data[v+1];im-=r.data[u]*x.data[v+1]+r.data[u+1]*x.data[v];}x.data[t]=re/r.data[2*(i*p+i)];x.data[t+1]=im/r.data[2*(i*p+i)];}return {X:x,Q:q};
}
