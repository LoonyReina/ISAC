// Reduced physical-geometry specialization of the disclosed Python reference.
// Synthetic covariance assumptions are deliberate; this is not a paper-curve
// reproduction. SI power/noise units; channel moments use normalized noise.
import {mat,eye,adj,mul,add,scale,chol,solveChol,rng} from './linalg.mjs';

const K=4,R=2,M=2,U=2,J=3,TAU=10,N=K*M;
const TX=[[175,215,15],[325,215,15],[190,325,15],[315,315,15]];
const RX=[[225,255,15],[275,245,15]],TARGET=[250,250,1.5];
const UE=[[180,190,1.5],[325,335,1.5]],FC=1.9e9;
const NOISE=10**((-94-30)/10),WAVELENGTH=299792458/FC;
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
const norm=v=>Math.hypot(...v);
const realRows=(r,c)=>Array.from({length:r},()=>Array(c).fill(0));

function hermitian(a){return scale(add(a,adj(a)),.5);}
function steering(directions){
  const a=mat(directions.length,M);
  directions.forEach((d,i)=>{const p=Math.PI*d[1]/norm(d);
    for(let j=0;j<M;j++){a.re[i*M+j]=Math.cos(p*j);a.im[i*M+j]=Math.sin(p*j);}
  });
  return a;
}
function correlation(gain,rho,phase){
  const c=mat(M,M);
  for(let i=0;i<M;i++)for(let j=0;j<M;j++){
    const v=gain*rho**Math.abs(i-j),p=phase*(i-j);
    c.re[i*M+j]=v*Math.cos(p);c.im[i*M+j]=v*Math.sin(p);
  }
  return c;
}
function putBlock(dst,src,row,col){
  for(let i=0;i<src.rows;i++)for(let j=0;j<src.cols;j++){
    dst.re[(row+i)*dst.cols+col+j]=src.re[i*src.cols+j];
    dst.im[(row+i)*dst.cols+col+j]=src.im[i*src.cols+j];
  }
}
function channelCovariances(){
  const cov=[],hat=[],err=[];
  for(const user of UE){
    const ri=mat(N,N);
    for(let k=0;k<K;k++){
      const d=diff(user,TX[k]),distance=norm(d);
      const gain=(WAVELENGTH/(4*Math.PI*distance))**2*1e-3/NOISE;
      putBlock(ri,correlation(gain,.45,Math.PI*d[1]/distance),k*M,k*M);
    }
    const h=hermitian(mul(ri,solveChol(chol(add(ri,eye(N),.5)),ri)));
    cov.push(ri);hat.push(h);err.push(hermitian(add(ri,h,-1)));
  }
  return {cov,hat,err};
}
function sampleChannels(factors,random){
  const h=mat(N,U);
  for(let u=0;u<U;u++)putBlock(h,mul(factors[u],random.complexMatrix(N,1)),0,u);
  return h;
}
function precoders(h,h0){
  // H (H*H + I)^-1 equals (HH* + I)^-1 H. Both solves are
  // two-dimensional; the full-rank Gaussian channel also permits projection
  // with H(H*H)^-1H* instead of a browser SVD implementation.
  const hh=adj(h),gram=hermitian(mul(hh,h));
  const comm=mul(h,solveChol(chol(add(gram,eye(U))),eye(U)));
  const sense=add(h0,mul(h,solveChol(chol(gram),mul(hh,h0))),-1);
  const w=mat(N,J);putBlock(w,sense,0,0);putBlock(w,comm,0,1);
  for(let j=0;j<J;j++){
    let length=0;
    for(let i=0;i<N;i++)length+=w.re[i*J+j]**2+w.im[i*J+j]**2;
    length=Math.sqrt(length);
    if(!Number.isFinite(length)||length<=0)throw Error('degenerate precoder');
    for(let i=0;i<N;i++){w.re[i*J+j]/=length;w.im[i*J+j]/=length;}
  }
  return w;
}
function fitMoments(lh,le,h0,seed,samples,includeSamples){
  const random=rng(seed),sum=mat(U,1),second=realRows(U,J),leak2=Array(U).fill(0),f=realRows(K,J);
  const raw=includeSamples?{estimates:[],errors:[],precoders:[],effective:[],sensingLeak:[]}:null;
  for(let n=0;n<samples;n++){
    const h=sampleChannels(lh,random),error=sampleChannels(le,random),w=precoders(h,h0);
    const effective=mul(adj(add(h,error)),w),sensing=mat(N,1);
    for(let i=0;i<N;i++){sensing.re[i]=w.re[i*J];sensing.im[i]=w.im[i*J];}
    const leak=mul(adj(error),sensing);
    for(let u=0;u<U;u++){
      const d=u*J+u+1;sum.re[u]+=effective.re[d];sum.im[u]+=effective.im[d];
      leak2[u]+=leak.re[u]**2+leak.im[u]**2;
      for(let j=0;j<J;j++)second[u][j]+=effective.re[u*J+j]**2+effective.im[u*J+j]**2;
    }
    for(let k=0;k<K;k++)for(let m=0;m<M;m++)for(let j=0;j<J;j++){
      const z=(k*M+m)*J+j;f[k][j]+=(w.re[z]**2+w.im[z]**2)/samples;
    }
    if(raw){raw.estimates.push(h);raw.errors.push(error);raw.precoders.push(w);raw.effective.push(effective);raw.sensingLeak.push(leak);}
  }
  const b=Array.from({length:U},(_,u)=>Math.hypot(sum.re[u],sum.im[u])/samples);
  const a=second.map((row,u)=>row.map((v,j)=>{
    let a2=(j===0?leak2[u]:v)/samples;if(j===u+1)a2-=b[u]**2;
    if(a2 < -1e-10)throw Error('negative empirical channel variance');
    return Math.sqrt(Math.max(0,a2));
  }));
  return {b,a,powerCoeff:f,samples,seed,...(raw?{raw}:{})};
}
function clutterCovariance(){
  const rH=mat(R*K*M*M,R*K*M*M),rtx=[],rrx=[];
  for(let r=0;r<R;r++){
    rtx.push([]);rrx.push([]);
    for(let k=0;k<K;k++){
      const d=diff(RX[r],TX[k]),distance=norm(d),phase=Math.PI*d[1]/distance;
      const gain=.3*1e-4*(WAVELENGTH/(4*Math.PI*distance))**2;
      const tx=correlation(1,.35,phase),rx=correlation(gain,.25,-phase),block=mat(M*M,M*M);
      rtx[r].push(tx);rrx[r].push(rx);
      for(let i=0;i<M;i++)for(let j=0;j<M;j++)for(let a=0;a<M;a++)for(let b=0;b<M;b++){
        const v=(i*M+a)*M*M+j*M+b,t=i*M+j,q=a*M+b;
        block.re[v]=tx.re[t]*rx.re[q]-tx.im[t]*rx.im[q];
        block.im[v]=tx.re[t]*rx.im[q]+tx.im[t]*rx.re[q];
      }
      putBlock(rH,block,(r*K+k)*M*M,(r*K+k)*M*M);
    }
  }
  return {rH,rtx,rrx};
}

/** Fresh seeded channel moments, independent holdout and independent design.
 * Seed mapping is this module's portable PRNG, not NumPy's seed mapping.
 * `includeSamples:true` additionally exposes raw samples for formula validation.
 */
export function makeScenario(options={}){
  const seed=options.seed??2026101301,channel_samples=options.channel_samples??options.channelSamples??512;
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed must be an unsigned 32-bit integer');
  if(!Number.isInteger(channel_samples)||channel_samples<32||channel_samples>512)throw Error('channel_samples must be an integer from 32 to 512');
  const seeds={fit:seed,holdout:(seed^0x9e3779b9)>>>0,design:(seed^0xd1b54a35)>>>0};
  const atx=steering(TX.map(x=>diff(TARGET,x))),arx=steering(RX.map(x=>diff(x,TARGET))),h0=mat(N,1);
  for(let k=0;k<K;k++)for(let m=0;m<M;m++){
    const gain=WAVELENGTH/(4*Math.PI*norm(diff(TARGET,TX[k]))),v=k*M+m;
    h0.re[v]=gain*atx.re[v];h0.im[v]=gain*atx.im[v];
  }
  const {cov,hat,err}=channelCovariances(),lh=hat.map(chol),le=err.map(chol);
  const fit=fitMoments(lh,le,h0,seeds.fit,channel_samples,!!options.includeSamples);
  const holdout=fitMoments(lh,le,h0,seeds.holdout,channel_samples,!!options.includeSamples);
  const random=rng(seeds.design),designEstimatedChannels=sampleChannels(lh,random),w=precoders(designEstimatedChannels,h0);
  const symbols=mat(TAU,J);
  for(let i=0;i<TAU*J;i++){
    const phase=Math.PI/4+Math.PI/2*Math.floor(4*random.uniform());symbols.re[i]=Math.cos(phase);symbols.im[i]=Math.sin(phase);
  }
  const {rH,rtx,rrx}=clutterCovariance();
  const settings={seed,Ntx:K,Nrx:R,M,Nue:U,tau_s:TAU,tau_c:200,tau_p:10,
    carrier_hz:FC,bandwidth_hz:20e6,noise_variance_w:NOISE,noise_dbm:-94,
    per_ap_cap_w:1,pilot_power_w:.2,communication_gamma_db:3,communication_gamma:10**.3,
    channel_moment_samples:channel_samples,holdout_channel_samples:channel_samples,
    target_location_samples:1,target_fixed:true,RZF_regularizer_noise_normalized:1,
    communication_covariance:'synthetic free-space attenuation 1e-3, Toeplitz 0.45 and geometry phase',
    clutter_covariance:'synthetic free-space attenuation 1e-4 times s=0.3; Toeplitz tx=0.35, rx=0.25',
    pilot_model:'orthogonal Gaussian MMSE, no contamination; different from unrecovered source pilot assignment',
    symbols:'known independent unit-modulus QPSK; stored realized block',
    R_rcs:'identity, independent normalized Swerling-I, constant over each block',
    steering:'literal Eq.4/Eq.7; horizontal ULA along y, half-wavelength',
    geometry:'explicit synthetic coordinates, not digitized source Fig.2',
    scope:'reduced-dimensional conditional algorithm reference, not a paper-curve reproduction',
    rng:'portable seeded PRNG with Box-Muller complex normals; differs from NumPy generator',seeds};
  return {settings,seed,channel_samples,seeds,noise:NOISE,tx:TX.map(a=>[...a]),rx:RX.map(a=>[...a]),target:[...TARGET],ue:UE.map(a=>[...a]),
    atx,arx,h0,w,symbols,rAlpha:eye(K*R),rH,rtx,rrx,b:fit.b,a:fit.a,powerCoeff:fit.powerCoeff,
    fit,holdout,channelCovariances:cov,estimateCovariances:hat,errorCovariances:err,designEstimatedChannels};
}

function gainsFor(s,rcsDbsm){
  if(!Number.isFinite(rcsDbsm))throw Error('finite RCS in dBsm required');
  const wavelength=299792458/s.settings.carrier_hz,rcs=10**(rcsDbsm/10);
  if(!Number.isFinite(rcs))throw Error('RCS is outside numeric range');
  return s.rx.map(rx=>s.tx.map(tx=>wavelength**2*rcs/((4*Math.PI)**3*norm(diff(rx,s.target))**2*norm(diff(tx,s.target))**2)));
}

/** Rows: time, RX, RX antenna. Columns of x: RX, TX, vec(H) in
 * column-major order. Target steering contracts by transpose, not adjoint.
 * clutterScale scales R_h; zero uses an empty nuisance support.
 */
export function observationDesign(s,amplitudes,rcsDbsm,clutterScale=1){
  if(!amplitudes||amplitudes.length!==J||Array.from(amplitudes).some(v=>!Number.isFinite(v)||v<0))throw Error('three finite nonnegative stream amplitudes required');
  if(!Number.isFinite(clutterScale)||clutterScale<0)throw Error('finite nonnegative clutter scale required');
  const gains=gainsFor(s,rcsDbsm),transmit=mat(TAU,K*M),g=mat(TAU*R*M,R*K),x=mat(TAU*R*M,clutterScale===0?0:R*K*M*M);
  for(let t=0;t<TAU;t++)for(let k=0;k<K;k++)for(let m=0;m<M;m++)for(let j=0;j<J;j++){
    const v=t*K*M+k*M+m,a=(k*M+m)*J+j,b=t*J+j,p=amplitudes[j];
    transmit.re[v]+=p*(s.w.re[a]*s.symbols.re[b]-s.w.im[a]*s.symbols.im[b]);
    transmit.im[v]+=p*(s.w.re[a]*s.symbols.im[b]+s.w.im[a]*s.symbols.re[b]);
  }
  for(let t=0;t<TAU;t++)for(let k=0;k<K;k++){
    let pr=0,pi=0;
    for(let m=0;m<M;m++){
      const a=k*M+m,v=t*K*M+a;
      pr+=s.atx.re[a]*transmit.re[v]-s.atx.im[a]*transmit.im[v];
      pi+=s.atx.re[a]*transmit.im[v]+s.atx.im[a]*transmit.re[v];
    }
    for(let r=0;r<R;r++)for(let a=0;a<M;a++){
      const row=(t*R+r)*M+a,z=row*g.cols+r*K+k,v=r*M+a,rootGain=Math.sqrt(gains[r][k]);
      g.re[z]=rootGain*(s.arx.re[v]*pr-s.arx.im[v]*pi);
      g.im[z]=rootGain*(s.arx.re[v]*pi+s.arx.im[v]*pr);
      if(clutterScale>0)for(let m=0;m<M;m++){
        const col=(r*K+k)*M*M+m*M+a,q=row*x.cols+col,u=t*K*M+k*M+m;
        x.re[q]=transmit.re[u];x.im[q]=transmit.im[u];
      }
    }
  }
  return {g,x,transmit,gains,rAlpha:s.rAlpha,rH:clutterScale===0?mat(0,0):scale(s.rH,clutterScale),noise:s.noise,rcsDbsm,clutterScale};
}

function realInner(a,b){
  let v=0;for(let i=0;i<a.re.length;i++)v+=a.re[i]*b.re[i]+a.im[i]*b.im[i];return v;
}
/** Real symmetric quadratic matrices, in physical received-energy units. */
export function sensingMatrices(s,rcsDbsm,clutterScale=1){
  const d=Array.from({length:J},(_,i)=>observationDesign(s,Array.from({length:J},(_,j)=>Number(i===j)),rcsDbsm,clutterScale));
  const A=realRows(J,J),B=realRows(J,J);
  for(let j=0;j<J;j++){
    const ga=mul(d[j].g,d[j].rAlpha),xh=mul(d[j].x,d[j].rH);
    for(let i=0;i<J;i++){A[i][j]=realInner(d[i].g,ga);B[i][j]=realInner(d[i].x,xh);}
  }
  for(let i=0;i<J;i++)for(let j=0;j<i;j++){
    A[i][j]=A[j][i]=(A[i][j]+A[j][i])/2;B[i][j]=B[j][i]=(B[i][j]+B[j][i])/2;
  }
  return {A,B,noiseEnergy:TAU*R*M*s.noise};
}
