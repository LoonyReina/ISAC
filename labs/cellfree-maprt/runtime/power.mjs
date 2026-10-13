/**
 * Source Eqs. 34–50 power allocation, browser-native float64 implementation.
 * Each CCP step minimizes its genuine convex quadratic over the UE SOCs and
 * AP power ellipsoids. A log-barrier Newton solver is used instead of SciPy.
 * Acceptance requires the source primal and global-convex-subproblem gap gates.
 * The certificate uses a supporting plane over a provable amplitude box; this
 * is a numerical certificate, not interval arithmetic or global ratio proof.
 */
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const mv=(A,x)=>A.map(r=>dot(r,x));
const zeros=n=>Array(n).fill(0);
const matrix=n=>Array.from({length:n},()=>zeros(n));
const quad=(A,x)=>dot(x,mv(A,x));
const maxabs=x=>Math.max(0,...x.map(Math.abs));
const finite=x=>x.every(Number.isFinite);

// Partial-pivot elimination for the small (two/three variable) Newton systems.
function solve(A,b,tolerance=1e-15) {
  const n=b.length, m=A.map((r,i)=>[...r,b[i]]), scale=Math.max(...A.flat().map(Math.abs),Number.MIN_VALUE);
  for(let k=0;k<n;k++) {
    let pivot=k; for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[pivot][k]))pivot=i;
    if(!Number.isFinite(m[pivot][k])||Math.abs(m[pivot][k])<=tolerance*scale)return null;
    [m[k],m[pivot]]=[m[pivot],m[k]];
    for(let i=k+1;i<n;i++){const r=m[i][k]/m[k][k];for(let j=k+1;j<=n;j++)m[i][j]-=r*m[k][j];m[i][k]=0;}
  }
  const x=zeros(n);for(let i=n-1;i>=0;i--)x[i]=(m[i][n]-dot(m[i].slice(i+1,n),x.slice(i+1)))/m[i][i];
  return finite(x)?x:null;
}
function psd(A) {
  // Jacobi diagonalization also accepts legitimate singular PSD matrices.
  const n=A.length, M=A.map(r=>r.slice()), norm=Math.hypot(...A.flat());
  if(!Number.isFinite(norm))return false;
  if(A.some((r,i)=>r.some((v,j)=>Math.abs(v-A[j][i])>1e-10*Math.max(norm,Number.MIN_VALUE))))return false;
  for(let k=0;k<80*n*n;k++){
    let p=0,q=1, largest=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(M[i][j])>largest){largest=Math.abs(M[i][j]);p=i;q=j;}
    if(largest<=1e-14*Math.max(norm,Number.MIN_VALUE))break;
    const theta=.5*Math.atan2(2*M[p][q],M[q][q]-M[p][p]),c=Math.cos(theta),s=Math.sin(theta);
    const pp=M[p][p],qq=M[q][q],pq=M[p][q];
    for(let i=0;i<n;i++)if(i!==p&&i!==q){const ip=M[i][p],iq=M[i][q];M[i][p]=M[p][i]=c*ip-s*iq;M[i][q]=M[q][i]=s*ip+c*iq;}
    M[p][p]=c*c*pp-2*c*s*pq+s*s*qq;M[q][q]=s*s*pp+2*c*s*pq+c*c*qq;M[p][q]=M[q][p]=0;
  }
  return M.every((r,i)=>r[i]>=-1e-10*Math.max(norm,Number.MIN_VALUE));
}

export class PowerProblem {
  constructor(A,B,noise_energy,b,a,power_coeff,cap,gamma) {
    if(arguments.length===1&&A&&typeof A==='object'&&!Array.isArray(A))({A,B,noise_energy,b,a,power_coeff,cap,gamma}=A);
    this.A=Array.from(A,r=>Array.from(r));this.B=Array.from(B,r=>Array.from(r));
    this.b=Array.from(b);this.a=Array.from(a,r=>Array.from(r));this.power_coeff=Array.from(power_coeff,r=>Array.from(r));
    this.noise_energy=noise_energy;this.cap=cap;this.gamma=gamma;
    const n=this.A.length;this.n=n;
    if(n<2||n>8||this.A.some(r=>r.length!==n)||this.B.length!==n||this.B.some(r=>r.length!==n)||this.b.length!==n-1||this.a.length!==n-1||this.a.some(r=>r.length!==n)||!this.power_coeff.length||this.power_coeff.some(r=>r.length!==n))throw new Error('power problem dimensions are inconsistent (bounded browser solver: 2–8 streams)');
    if(!psd(this.A)||!psd(this.B))throw new Error('A and B must be finite real positive semidefinite');
    if(!finite(this.b)||this.b.some(v=>v<=0)||!finite(this.a.flat())||this.a.flat().some(v=>v<0)||!finite(this.power_coeff.flat())||this.power_coeff.flat().some(v=>v<0)||Array.from({length:n},(_,i)=>this.power_coeff.reduce((s,r)=>s+r[i],0)).some(v=>v<=0))throw new Error('invalid communication/power coefficients');
    if(![noise_energy,cap,gamma].every(x=>Number.isFinite(x)&&x>0))throw new Error('noise, cap, gamma must be positive');
    this.An=this.A.map(r=>r.map(x=>x/noise_energy));this.Bn=this.B.map(r=>r.map(x=>x/noise_energy));
    this.upper=Array.from({length:n},(_,i)=>Math.min(...this.power_coeff.filter(r=>r[i]>0).map(r=>Math.sqrt(cap/r[i]))));
  }
  sinr(p){return quad(this.An,p)/(1+quad(this.Bn,p));}
  metrics(p){const powers=this.power_coeff.map(r=>r.reduce((s,f,i)=>s+f*p[i]*p[i],0));return {sensing_sinr:this.sinr(p),communication_sinr:this.b.map((v,i)=>(v*p[i+1])**2/(1+this.a[i].reduce((s,a,j)=>s+(a*p[j])**2,0))),per_ap_power_w:powers,total_power_w:powers.reduce((a,b)=>a+b,0)};}
  constraints(p){return [...this.b.map((b,i)=>b*p[i+1]/Math.sqrt(this.gamma)-Math.sqrt(1+this.a[i].reduce((s,a,j)=>s+(a*p[j])**2,0))),...this.power_coeff.map(r=>this.cap-r.reduce((s,f,i)=>s+f*p[i]**2,0))];}
  jacobian(p){return [...this.a.map((r,i)=>{const norm=Math.sqrt(1+r.reduce((s,a,j)=>s+(a*p[j])**2,0));return r.map((a,j)=>-a*a*p[j]/norm+(j===i+1?this.b[i]/Math.sqrt(this.gamma):0));}),...this.power_coeff.map(r=>r.map((f,j)=>-2*f*p[j]))];}
  _hessians(p){return [...this.a.map(r=>{const d=r.map(a=>a*a),v=d.map((a,j)=>a*p[j]),norm=Math.sqrt(1+dot(p,v));return d.map((a,i)=>d.map((_,j)=>-(i===j?a/norm:0)+v[i]*v[j]/norm**3));}),...this.power_coeff.map(r=>r.map((a,i)=>r.map((_,j)=>i===j?-2*a:0)))];}
  _interior(allowSensing){
    // Squared SOCs are linear in stream powers. Solve the minimum UE powers,
    // then add a common positive noise margin and (when free) sensing power.
    const u=this.b.length,C=this.a.map((r,i)=>r.slice(1).map((v,j)=>(i===j?this.b[i]**2/this.gamma:0)-v*v));
    const base=solve(C,Array(u).fill(1)),sens=solve(C,this.a.map(r=>r[0]**2));
    if(!base||!sens||base.some(v=>v<=0)||sens.some(v=>v< -1e-12))return null;
    const sensingSlope=allowSensing?.1*this.upper[0]**2:0;
    const ybase=[0,...base],slope=[sensingSlope,...base.map((v,i)=>v+sens[i]*sensingSlope)];
    let delta=1;for(const r of this.power_coeff){const room=this.cap-dot(r,ybase),cost=dot(r,slope);if(room<=1e-13*Math.max(1,this.cap))return null;if(cost>0)delta=Math.min(delta,.5*room/cost);}
    const p=ybase.map((v,i)=>Math.sqrt(v+delta*slope[i]));
    return this.constraints(p).every(v=>v>0)?p:null;
  }
  certificate(p,quadratic,linear,free,multipliers=null){
    const c=this.constraints(p),J=this.jacobian(p).map(r=>free.map(i=>r[i])),z=free.map(i=>p[i]),ub=free.map(i=>this.upper[i]),n=free.length;
    const allc=[...c,...z,...z.map((v,i)=>ub[i]-v)],allJ=[...J,...Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0)),...Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?-1:0))];
    const objective=quad(quadratic,p)+dot(linear,p),g=free.map(i=>2*dot(quadratic[i],p)+linear[i]);
    const evaluate=lambda=>{const residual=g.map((v,i)=>v-allJ.reduce((s,r,k)=>s+r[i]*lambda[k],0));const lower=objective-dot(lambda,allc)+residual.reduce((s,r,i)=>s+Math.min(-r*z[i],r*(ub[i]-z[i])),0);return {objective,lagrange_box_lower_bound:lower,global_subproblem_gap_upper:objective-lower,minimum_primal_slack:Math.min(0,...allc),stationarity_infinity:maxabs(residual),complementarity_infinity:maxabs(lambda.map((v,i)=>v*allc[i])),multipliers:lambda,stationarity_residual:residual,constraint_slacks:allc,free_indices:free,amplitude_box_upper:ub,arithmetic:'double-precision numerical certificate; not directed rounding'};};
    let best=evaluate(zeros(allc.length));
    if(multipliers&&multipliers.length===allc.length&&finite(multipliers)&&multipliers.every(v=>v>=0)){const c=evaluate(multipliers);if(c.global_subproblem_gap_upper<best.global_subproblem_gap_upper)best=c;}
    // Small-dimensional exact active-subset NNLS. Nonnegative multipliers are
    // valid even if no subset spans the gradient; the resulting loose bound fails.
    const active=allc.map((v,i)=>v<=1e-6?i:-1).filter(i=>i>=0);
    if(n<=4){const visit=ids=>{if(ids.length){const rows=ids.map(i=>allJ[i]),lam=solve(rows.map(r=>rows.map(s=>dot(r,s))),rows.map(r=>dot(r,g)),1e-14);if(lam&&lam.every(v=>v>=-1e-12)){const all=zeros(allc.length);ids.forEach((i,k)=>all[i]=Math.max(0,lam[k]));const c=evaluate(all);if(c.global_subproblem_gap_upper<best.global_subproblem_gap_upper)best=c;}}if(ids.length===n)return;for(const i of active)if(!ids.length||i>ids.at(-1))visit([...ids,i]);};visit([]);}
    best.global_subproblem_gap_acceptance_limit=2e-6*Math.max(1,Math.abs(objective));
    best.global_subproblem_gap_accepted=Number.isFinite(best.global_subproblem_gap_upper)&&best.global_subproblem_gap_upper<=best.global_subproblem_gap_acceptance_limit;
    return best;
  }
  _solve(quadratic,linear,initial,allowSensing,maxiter=400){
    const free=Array.from({length:this.n},(_,i)=>i).filter(i=>allowSensing||i>0),u=free.map(i=>this.upper[i]),n=free.length;
    const expand=x=>{const p=zeros(this.n);free.forEach((i,k)=>p[i]=x[k]*u[k]);return p;};
    const initialFree=free.map(i=>Math.min(this.upper[i],Math.max(0,initial[i]))),origin=expand(initialFree.map((p,k)=>p/u[k]));
    let candidate=origin,steps=0,status=1,message='Newton iteration cap reached',solverSuccess=false,barrierDual=null,trace=[];
    const center=this._interior(allowSensing);
    if(!center){status=2;message='No strict feasible interior found; infeasible or degenerate boundary-only problem';}
    else if(maxiter>0){
      const scales=[...this.b.map((b,i)=>Math.max(1,b*this.upper[i+1]/Math.sqrt(this.gamma))),...this.power_coeff.map(()=>this.cap),...Array(2*n).fill(1)];
      const Q=free.map((i,k)=>free.map((j,l)=>quadratic[i][j]*u[k]*u[l])),lin=free.map((i,k)=>linear[i]*u[k]);
      const objectiveScale=Math.max(1,maxabs(Q.flat()),maxabs(lin));
      const f=x=>(quad(Q,x)+dot(lin,x))/objectiveScale;
      const gradient=x=>mv(Q,x).map((v,k)=>(2*v+lin[k])/objectiveScale);
      const geometry=x=>{const p=expand(x),c0=this.constraints(p),j0=this.jacobian(p),h0=this._hessians(p);const cs=[...c0,...x,...x.map(v=>1-v)];const js=[...j0.map(r=>free.map((i,k)=>r[i]*u[k])),...Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0)),...Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?-1:0))];const hs=[...h0.map(H=>free.map((i,k)=>free.map((j,l)=>H[i][j]*u[k]*u[l]))),...Array.from({length:2*n},()=>matrix(n))];return {c:cs.map((v,i)=>v/scales[i]),j:js.map((r,i)=>r.map(v=>v/scales[i])),h:hs.map((H,i)=>H.map(r=>r.map(v=>v/scales[i])))};};
      let x=free.map(i=>center[i]/this.upper[i]);
      if(this.constraints(origin).every(v=>v>=0))x=x.map((v,k)=>.1*v+.9*origin[free[k]]/u[k]);
      let mu=.05,outer=0,stop=false;
      while(steps<maxiter&&!stop){
        let centered=false;
        for(let inner=0;inner<80&&steps<maxiter;inner++){
          const geo=geometry(x);if(!geo.c.every(v=>Number.isFinite(v)&&v>0)){status=3;message='Nonpositive barrier slack';stop=true;break;}
          const g=gradient(x),H=Q.map(r=>r.map(v=>2*v/objectiveScale));
          geo.c.forEach((c,k)=>{for(let i=0;i<n;i++){g[i]-=mu*geo.j[k][i]/c;for(let j=0;j<n;j++)H[i][j]+=mu*(geo.j[k][i]*geo.j[k][j]/(c*c)-geo.h[k][i][j]/c);}});
          const d=solve(H,g.map(v=>-v),1e-18);steps++;
          if(!d){status=3;message='Singular or nonfinite Newton system';stop=true;break;}
          const decrement=-dot(g,d);
          if(decrement<=Math.max(1e-24,mu*1e-9)){centered=true;break;}
          const phi=f(x)-mu*geo.c.reduce((s,c)=>s+Math.log(c),0),slope=dot(g,d);
          let alpha=1,accepted=false;
          for(let back=0;back<65;back++){
            const trial=x.map((v,k)=>v+alpha*d[k]),tc=geometry(trial).c;
            if(tc.every(v=>v>0&&Number.isFinite(v))){const val=f(trial)-mu*tc.reduce((s,c)=>s+Math.log(c),0);if(val<=phi+1e-4*alpha*slope+1e-15*Math.max(1,Math.abs(phi))){x=trial;accepted=true;break;}}
            alpha*=.5;
          }
          if(!accepted){status=3;message='Barrier line search failed';stop=true;break;}
          // A valid tight global gap is a stronger optimization stop than
          // centering the barrier at machine-precision boundary distances.
          if(mu<=1e-8&&steps<maxiter){const cp=expand(x),cz=free.map(i=>cp[i]),cc=this.constraints(cp);const dl=[...cc.map(v=>objectiveScale*mu/v),...cz.map(v=>objectiveScale*mu/v),...cz.map((v,k)=>objectiveScale*mu/(u[k]-v))];const cert=this.certificate(cp,quadratic,linear,free,dl);if(cert.minimum_primal_slack>=-2e-7&&cert.global_subproblem_gap_upper<=2e-10*Math.max(1,Math.abs(cert.objective)))break;}
        }
        candidate=expand(x);
        const c=this.constraints(candidate),zz=free.map(i=>candidate[i]);
        barrierDual=[...c.map(v=>objectiveScale*mu/v),...zz.map(v=>objectiveScale*mu/v),...zz.map((v,k)=>objectiveScale*mu/(u[k]-v))];
        const cert=this.certificate(candidate,quadratic,linear,free,barrierDual);
        trace.push({stage:++outer,barrier_mu:mu,objective_scale:objectiveScale,newton_iterations:steps,centered,global_subproblem_gap_upper:cert.global_subproblem_gap_upper});
        // Use a stricter internal target to keep the source 1e-8 CCP stop useful.
        const accuracy=2e-10*Math.max(1,Math.abs(cert.objective));
        if(!stop&&steps<maxiter&&cert.minimum_primal_slack>=-2e-7&&cert.global_subproblem_gap_upper<=accuracy){solverSuccess=true;status=0;message='Convex barrier Newton solve converged with numerical global-subproblem certificate';stop=true;}
        else if(!stop)mu*=.12;
        if(mu<1e-17&&!stop){status=3;message='Barrier precision limit reached before convergence';stop=true;}
      }
    }
    const certificate=this.certificate(candidate,quadratic,linear,free,barrierDual);
    const accepted=solverSuccess&&certificate.minimum_primal_slack>=-2e-7&&finite(candidate)&&certificate.global_subproblem_gap_accepted;
    const record={p:candidate,solver_success:solverSuccess,accepted,status,message,iterations:steps,certificate,metrics:this.metrics(candidate),initial_free_amplitudes:initialFree,solver_method:'browser float64 log-barrier Newton with supporting-plane gap certificate',barrier_trace:trace};
    return {...record,solver_attempts:[record],retry_policy:'no hidden retries or tolerance relaxation; browser solver statuses differ from SciPy SLSQP'};
  }
  communicationCentric(initial=null,allowSensing=false,maxiter=400){
    if(initial&&typeof initial==='object'&&!Array.isArray(initial)&&!ArrayBuffer.isView(initial)){const o=initial;initial=o.initial??null;allowSensing=o.allowSensing??o.allow_sensing??false;maxiter=o.maxiter??400;}
    initial=initial??this.upper.map(x=>x*.5);const Q=matrix(this.n);for(let i=0;i<this.n;i++)Q[i][i]=this.power_coeff.reduce((s,r)=>s+r[i],0);
    return this._solve(Q,zeros(this.n),initial,allowSensing,maxiter);
  }
  communication_centric(...args){return this.communicationCentric(...args);}
  ccp(initial,allowSensing=true,maxIterations=100,tolerance=1e-8,subproblemMaxiter=400){
    if(typeof allowSensing==='object'){const o=allowSensing;allowSensing=o.allowSensing??o.allow_sensing??true;maxIterations=o.maxIterations??o.max_iterations??100;tolerance=o.tolerance??1e-8;subproblemMaxiter=o.subproblemMaxiter??o.subproblem_maxiter??400;}
    let p=Array.from(initial);if(!allowSensing)p[0]=0;
    if(p.length!==this.n||!finite(p)||Math.min(...this.constraints(p))< -2e-7||Math.min(...p)<0)return {accepted:false,termination:'infeasible_initial',initial:p,iterations:[],final:null};
    const history=[],initialP=p.slice();
    for(let it=0;it<maxIterations;it++){
      const t=1+quad(this.Bn,p),num=quad(this.An,p),q=this.Bn.map(r=>r.map(v=>num/(t*t)*v)),ap=mv(this.An,p),lin=ap.map(v=>-2*v/t);
      const record=this._solve(q,lin,p,allowSensing,subproblemMaxiter),pnew=record.p,tnew=1+quad(this.Bn,pnew);
      const gain=dot(pnew.map((v,i)=>2*(v-p[i])-(tnew-t)/t*p[i]),ap)/t;
      Object.assign(record,{iteration:it+1,p_previous:p.slice(),t_previous:t,t_new:tnew,source_tangent_improvement:gain,actual_sinr_improvement:this.sinr(pnew)-this.sinr(p)});history.push(record);
      if(!record.accepted)return {accepted:false,termination:'subproblem_failure',initial:initialP,iterations:history,final:null};
      if(gain< -2e-7||record.actual_sinr_improvement< -2e-7)return {accepted:false,termination:'nonmonotone_numerical_failure',initial:initialP,iterations:history,final:null};
      p=pnew;if(gain<=tolerance)return {accepted:true,termination:'source_tangent_tolerance',initial:initialP,iterations:history,final:record,global_original_optimality:'not claimed; local stationary candidate'};
    }
    return {accepted:false,termination:'iteration_cap',initial:initialP,iterations:history,final_candidate:history.at(-1)??null,final:null};
  }
}
