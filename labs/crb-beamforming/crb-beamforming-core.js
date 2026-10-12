/* Exact single-user special case; optional constructed two-stream family.
 * Complex values are [real, imaginary]. Angles and derivatives use radians.
 * No optimizer packages, random estimates, or empirical accuracy claims. */
(function (root) {
  'use strict';
  const cfg = Object.freeze({nt:8, nr:12, snapshots:64, power:1, communicationNoise:.01, radarNoise:100, alpha:Object.freeze([1,0]), theta:0});
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]], conj=a=>[a[0],-a[1]], scale=(a,s)=>[a[0]*s,a[1]*s], abs2=a=>a[0]*a[0]+a[1]*a[1];
  const inner=(a,b)=>a.reduce((s,z,i)=>add(s,mul(conj(z),b[i])),[0,0]), norm2=a=>a.reduce((s,z)=>s+abs2(z),0);
  const check=(x,min,max,name)=>{if(!Number.isFinite(x)||x<min||x>max)throw new RangeError(name+' 超出有效范围');};
  function steering(n,theta){check(theta,-Math.PI/2,Math.PI/2,'角度');return Array.from({length:n},(_,i)=>{const p=Math.PI*(i-(n-1)/2)*Math.sin(theta);return [Math.cos(p),Math.sin(p)];});}
  function derivative(n,theta){return steering(n,theta).map((z,i)=>mul([0,Math.PI*(i-(n-1)/2)*Math.cos(theta)],z));}
  function modes(n=cfg.nt){const m=Array.from({length:n},(_,i)=>i-(n-1)/2),s=Math.sqrt(m.reduce((t,x)=>t+x*x,0));return {u:m.map(()=>[1/Math.sqrt(n),0]),v:m.map(x=>[x/s,0])};}
  function combine(u,v,a,b){return u.map((z,i)=>add(scale(z,a),scale(v[i],b)));}
  function covariance(factors){return factors[0].map((_,i)=>factors[0].map((_,j)=>factors.reduce((s,w)=>add(s,mul(w[i],conj(w[j]))),[0,0])));}
  function validateFactors(factors,config){
    if(!Array.isArray(factors)||!factors.length||factors.some(w=>!Array.isArray(w)||w.length!==config.nt||w.some(z=>!Array.isArray(z)||z.length!==2||z.some(x=>!Number.isFinite(x)))))throw new RangeError('无效复数发射因子');
    for(const key of ['nt','nr','snapshots','radarNoise','power','communicationNoise'])if(!Number.isFinite(config[key])||config[key]<=0)throw new RangeError('无效资源 '+key);
    if(!Number.isInteger(config.nt)||!Number.isInteger(config.nr)||!Number.isInteger(config.snapshots))throw new RangeError('阵元数和快拍数必须为整数');
    if(!Array.isArray(config.alpha)||config.alpha.length!==2||config.alpha.some(x=>!Number.isFinite(x)))throw new RangeError('无效反射系数');
  }
  /* Exact temporal orthogonality turns the full X Jacobian into these factor
   * columns times L. The UI uses one unit-modulus row, or two orthogonal rows.
   * z=A W and d=A-dot W are calculated without differentiating W. */
  function information(factors,options={}){
    const c={...cfg,...options};validateFactors(factors,c);
    const a=steering(c.nt,c.theta),ad=derivative(c.nt,c.theta),b=steering(c.nr,c.theta),bd=derivative(c.nr,c.theta),z=[],d=[];
    for(const w of factors){const aw=inner(a,w),adw=inner(ad,w);for(let r=0;r<c.nr;r++){z.push(mul(b[r],aw));d.push(mul(c.alpha,add(mul(bd[r],aw),mul(b[r],adw))));}}
    const columns=[d,z,z.map(x=>mul([0,1],x))],factor=2*c.snapshots/c.radarNoise;
    const fim=columns.map(x=>columns.map(y=>factor*inner(x,y)[0]));
    const s0=norm2(z),known=fim[0][0],cross=inner(z,d),power=factors.reduce((s,w)=>s+norm2(w),0);
    const base={fim,known,echoEnergyPerSnapshot:s0,power,covariance:covariance(factors)};
    if(options.zeroIllumination===true||s0===0||abs2(c.alpha)===0||Math.abs(c.theta)===Math.PI/2){return {...base,status:'singular',loss:null,effective:null,crbRad2:null,rootCrbDeg:null,reason:options.zeroIllumination||s0===0?'target_null':abs2(c.alpha)===0?'zero_reflection':'endfire'};}
    if(c.nr===1&&factors.filter(w=>norm2(w)>0).length===1)return {...base,status:'singular',loss:known,effective:0,crbRad2:null,rootCrbDeg:null,reason:'one_receiver_one_stream'};
    const projection=scale(cross,1/s0),residual=d.map((x,i)=>sub(x,mul(z[i],projection))),loss=factor*abs2(cross)/s0,effective=factor*norm2(residual);
    if(effective===0)return {...base,status:'singular',loss,effective:0,crbRad2:null,rootCrbDeg:null,reason:'no_angle_information'};
    return {...base,status:'regular',loss,effective,crbRad2:1/effective,rootCrbDeg:Math.sqrt(1/effective)*180/Math.PI,reason:null};
  }
  const gammaMax=cfg.power/cfg.communicationNoise,baseInformation=2*cfg.snapshots/cfg.radarNoise*(Math.PI**2*cfg.nr*(cfg.nr**2-1)/12)*cfg.nt*cfg.power;
  const baseRootDeg=Math.sqrt(1/baseInformation)*180/Math.PI;
  function solve(rho,q){
    check(rho,0,1,'空间重合度');check(q,0,Number.MAX_VALUE/gammaMax,'归一化门槛');
    const {u,v}=modes(),h=combine(u,v,rho,Math.sqrt(1-rho*rho));
    const shared={rho,q,requiredSnr:q*gammaMax,requiredDb:q===0?null:10*Math.log10(q*gammaMax),ceilingSnr:gammaMax,ceilingDb:20,transitionSnr:rho*rho*gammaMax,transitionDb:rho===0?null:20*Math.log10(rho)+20,h,channelModalFactors:[[rho,Math.sqrt(1-rho*rho)]]};
    if(q>1)return {...shared,status:'infeasible',regime:'infeasible',reason:'snr_exceeds_power_bound',w:null,g:null,actualSnr:null,actualDb:null,rootCrbDeg:null,crbRad2:null,ratio:null,metrics:null,modalFactors:null};
    const plateau=q<=rho*rho,r=plateau?1:rho*Math.sqrt(q)+Math.sqrt(1-rho*rho)*Math.sqrt(1-q),t=plateau?0:Math.sqrt(1-rho*rho)*Math.sqrt(q)-rho*Math.sqrt(1-q),w=combine(u,v,r*Math.sqrt(cfg.power),t*Math.sqrt(cfg.power)),nullTarget=rho===0&&q===1;
    const direct=information([w],{zeroIllumination:nullTarget}),g=nullTarget?0:r*r;
    // The actual beam is defined by its modal factors (r,t). Forming its dense
    // entries can erase a tiny even component beside the odd component. Use
    // exact modal contractions and the proved rank-one cancellation for the
    // primary bound, retaining dense-factor information as a diagnostic.
    const factor=2*cfg.snapshots/cfg.radarNoise,Db=norm2(derivative(cfg.nr,0)),Dt=norm2(derivative(cfg.nt,0)),aw=Math.sqrt(cfg.nt*cfg.power)*r,adw=Math.sqrt(Dt*cfg.power)*t;
    const known=factor*(Db*aw*aw+cfg.nr*adw*adw),loss=factor*cfg.nr*adw*adw,effective=baseInformation*g,nuisance=factor*cfg.nr*aw*aw,cross=-factor*cfg.nr*aw*adw;
    if(!nullTarget&&(!(effective>0)||!Number.isFinite(1/effective)))throw new RangeError('正信息量的倒数超出双精度可表示范围');
    const metrics={...direct,status:nullTarget?'singular':'regular',reason:nullTarget?'target_null':null,informationMethod:'exact_rank_one_modal_identity',denseFactorInformation:direct.effective,fim:[[known,0,cross],[0,nuisance,0],[cross,0,nuisance]],echoEnergyPerSnapshot:cfg.nr*aw*aw,known,loss:nullTarget?null:loss,effective:nullTarget?null:effective,crbRad2:nullTarget?null:1/effective,rootCrbDeg:nullTarget?null:baseRootDeg/r};
    const userAmplitude=rho*r+Math.sqrt(1-rho*rho)*t,actualSnr=gammaMax*userAmplitude*userAmplitude;
    return {...shared,status:nullTarget?'singular':'regular',regime:plateau?'plateau':'tradeoff',reason:nullTarget?'target_null':null,w,g,actualSnr,actualDb:actualSnr===0?null:10*Math.log10(actualSnr),rootCrbDeg:metrics.rootCrbDeg,crbRad2:metrics.crbRad2,ratio:g===0?null:1/g,metrics,coefficientU:r,coefficientV:t,modalFactors:[[Math.sqrt(cfg.power)*r,Math.sqrt(cfg.power)*t]],denseRepresentation:'rounded expansion of canonical modalFactors',denseTargetPower:abs2(inner(steering(cfg.nt,0),w))};
  }
  function main(rho=.5,thresholdDb=18,noRequirement=false){check(thresholdDb,-200,200,'SNR 门槛');if(typeof noRequirement!=='boolean')throw new RangeError('无最低要求开关无效');return solve(rho,noRequirement?0:10**(thresholdDb/10)/gammaMax);}
  function pattern(factors,angles){return angles.map(deg=>{check(deg,-90,90,'显示角度');const a=steering(cfg.nt,deg*Math.PI/180);return factors.reduce((s,w)=>s+abs2(inner(a,w)),0);});}
  /* Real even/odd spatial coefficients are the canonical factorization here.
   * Pair +/- positions before evaluation: u's field is purely real, v's field
   * purely imaginary. Tiny positive target illumination is not rounded away
   * by adding an even component to dense odd antenna weights. */
  function modalPattern(modalFactors,angles){
    if(!Array.isArray(modalFactors)||!modalFactors.length||modalFactors.some(f=>!Array.isArray(f)||f.length!==2||f.some(v=>!Number.isFinite(v))))throw new RangeError('无效实模态因子');
    const n=cfg.nt,den=Math.sqrt(n*(n*n-1)/12);
    return angles.map(deg=>{check(deg,-90,90,'显示角度');const k=Math.PI*Math.sin(deg*Math.PI/180);let realU=0,imagV=0;for(let i=0;i<n/2;i++){const m=i+.5;realU+=2*Math.cos(k*m)/Math.sqrt(n);imagV-=2*m*Math.sin(k*m)/den;}return modalFactors.reduce((sum,[r,t])=>sum+(realU*r)**2+(imagV*t)**2,0);});
  }
  const angles=()=>Array.from({length:721},(_,i)=>-90+i/4);
  function companion(kappa=1){
    check(kappa,0,1,'模态相干度');const {u,v}=modes(),p=.5;
    const wc=combine(u,v,Math.sqrt(cfg.power*p),Math.sqrt(cfg.power*(1-p))*kappa),wr=v.map(z=>scale(z,Math.sqrt(cfg.power*(1-p)*(1-kappa*kappa)))),factors=[wc,wr],metrics=information(factors);
    const desired=abs2(inner(u,wc)),interference=abs2(inner(u,wr)),sinr=desired/(interference+cfg.communicationNoise);
    return {kappa,p,h:u,wc,wr,factors,modalFactors:[[Math.sqrt(cfg.power*p),Math.sqrt(cfg.power*(1-p))*kappa],[0,Math.sqrt(cfg.power*(1-p)*(1-kappa*kappa))]],metrics,desired,interference,sinr,sinrDb:10*Math.log10(sinr),dataPower:norm2(wc),probingPower:norm2(wr),power:metrics.power,rootCrbDeg:metrics.rootCrbDeg};
  }
  function frontier(rho){check(rho,0,1,'空间重合度');return Array.from({length:221},(_,i)=>{const db=i/10,r=main(rho,db);return {db,status:r.status,regime:r.regime,g:r.g,rootCrbDeg:r.rootCrbDeg};});}
  const api={cfg,add,sub,mul,conj,scale,abs2,inner,norm2,steering,derivative,modes,combine,covariance,information,gammaMax,baseInformation,baseRootDeg,solve,main,pattern,modalPattern,angles,companion,frontier};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrbBeamformingCore=api;
})(typeof window!=='undefined'?window:globalThis);
