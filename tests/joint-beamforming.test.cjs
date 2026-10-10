// Deterministic numerical regression of the analytical teaching construction.
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../joint-beamforming-core.js');
const near=(actual,expected,tol=1e-10)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} != ${expected} (tol ${tol})`);
const abs2=z=>z[0]*z[0]+z[1]*z[1];
function inner(a,b){return a.reduce((s,z,i)=>[s[0]+z[0]*b[i][0]+z[1]*b[i][1],s[1]+z[0]*b[i][1]-z[1]*b[i][0]],[0,0]);}
const col=(A,j)=>A.map(r=>r[j]);
function factorPower(W,a){return W[0].reduce((s,_,j)=>s+abs2(inner(a,col(W,j))),0);}
function quadratic(R,a){let s=[0,0];for(let i=0;i<a.length;i++)for(let j=0;j<a.length;j++){const z=R[i][j],b=a[j],v=[z[0]*b[0]-z[1]*b[1],z[0]*b[1]+z[1]*b[0]];s[0]+=a[i][0]*v[0]+a[i][1]*v[1];s[1]+=a[i][0]*v[1]-a[i][1]*v[0];}return s;}
const defaultState=C.compute();
test('default source-audited powers, eigenvalues and cross-correlations are reproduced',()=>{
 const [A,B,D]=defaultState.recipes;
 for(const [r,desired,radar,sinr,rank,eigen]of [[A,.6,0,60,2,[2/3,1/3]],[B,4/15,1/15,80/23,3,[1/3,1/3,1/3]],[D,1/3,0,100/3,3,[1/3,1/3,1/3]]]){
 near(r.users[0].desired,desired);near(r.users[0].radar,radar);near(r.users[0].sinr,sinr);near(r.users[1].sinr,100/3);assert.equal(r.rank,rank);r.eigen.forEach((v,i)=>near(v,eigen[i]||0));for(const i of [600,900,1200])near(r.pattern[i],8/3);
 }
 near(A.correlation[0][2],1);near(B.correlation[0][2],0);near(D.correlation[0][2],0);
 near(A.corr.reduce((s,r,i)=>s+r.reduce((s,z,j)=>s+(j>i?abs2(z):0),0),0)/3,64/27);
 near(A.pattern.reduce((s,p,i)=>s+(p-B.pattern[i])**2,0)/A.pattern.length,.0429933980,1e-9);
 assert.deepEqual(defaultState.recipes.map(r=>r.users.map(u=>u.pass)),[[true,true],[false,true],[true,true]]);
});
test('channel-mixture and noise sweeps agree with independent closed-form SINRs, including tiny positive eta',()=>{
 for(const eta of [0,1e-20,1e-12,.01,.2,.5,.8,.99,1])for(const noise of [.001,.01,.1]){
  const s=C.compute(eta,noise),expected=[(Math.sqrt(eta)+Math.sqrt(1-eta))**2/(3*noise),eta/(1-eta+3*noise),1/(3*noise)];
  s.recipes.forEach((r,i)=>{near(r.users[0].sinr,expected[i],Math.max(1e-28,Math.abs(expected[i])*1e-6));near(r.users[1].sinr,1/(3*noise));for(const u of r.users){near(u.noise,noise);near(u.interuser,0);if(u.sinr===0)assert.equal(u.db,-Infinity);else near(u.db,10*Math.log10(u.sinr));}});
  if(eta===0){assert.equal(s.recipes[1].users[0].sinr,0);assert.equal(s.recipes[1].users[0].db,-Infinity);}else assert.ok(s.recipes[1].users[0].sinr>0,'positive eta must not be floored to zero');
  near(s.fixedRBound,1/(3*noise));
 }
});
test('orthonormal channels and spatial vectors, equal antenna power, Hermitian PSD and fixed covariance survive all channel settings',()=>{
 for(const eta of [0,1e-20,.1,.5,.8,1]){
  const s=C.compute(eta),vectors=[s.um,s.u0,s.up];for(let i=0;i<3;i++)for(let j=0;j<3;j++){const z=inner(vectors[i],vectors[j]);near(z[0],i===j?1:0);near(z[1],0);}
  for(const v of [s.h,s.q]){near(inner(v,v)[0],1);for(const z of v)near(abs2(z),1/8);}near(abs2(inner(s.h,s.q)),0);near(abs2(inner(s.h,s.u0)),0);
  assert.equal(s.H.length,2);assert.ok(s.H.every(r=>r.length===8));
  for(const r of s.recipes){assert.equal(r.Wc.length,8);assert.ok(r.Wc.every(row=>row.length===2));assert.equal(r.Wr.length,8);assert.equal(r.R.length,8);near(r.trace,1);for(const x of r.diagonal)near(x,1/8);assert.ok(r.eigen.every(x=>x>=-1e-12));assert.equal(r.rank,r.eigen.filter(x=>x>1e-10).length);
   for(let i=0;i<8;i++)for(let j=0;j<8;j++){near(r.R[i][j][0],r.R[j][i][0]);near(r.R[i][j][1],-r.R[j][i][1]);near(r.R[i][j][0],defaultState.recipes.find(x=>x.id===r.id).R[i][j][0]);near(r.R[i][j][1],defaultState.recipes.find(x=>x.id===r.id).R[i][j][1]);}
   r.users.forEach((u,k)=>{const h=s.H[k].map(z=>[z[0],-z[1]]),desired=abs2(inner(h,col(r.Wc,k))),interuser=factorPower(r.Wc,h)-desired,radar=factorPower(r.Wr,h);near(u.desired,desired);near(u.interuser,interuser);near(u.radar,radar);near(u.sinr,desired/(interuser+radar+s.noise));for(const [W,F]of [[r.Wc,r.Fc],[r.Wr,r.Fr]])for(let j=0;j<W[0].length;j++){const z=inner(h,col(W,j));near(F[k][j][0],z[0]);near(F[k][j][1],z[1]);}});
  }
  near(s.covarianceBC,0);const B=s.recipes[1],D=s.recipes[2];for(let i=0;i<8;i++)for(let j=0;j<8;j++){near(B.R[i][j][0],D.R[i][j][0]);near(B.R[i][j][1],D.R[i][j][1]);}for(const u of D.users){near(u.radar,0);near(u.interuser,0);near(u.sinr,s.fixedRBound);}
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)near(B.correlation[i][j],D.correlation[i][j]);
 }
});
test('all 1801 unnormalized pattern samples agree with direct factors and quadratic covariance form',()=>{
 for(const r of defaultState.recipes){assert.equal(r.angles.length,1801);assert.equal(r.angles[0],-90);assert.equal(r.angles.at(-1),90);
  r.angles.forEach((deg,i)=>{const a=Array.from({length:8},(_,m)=>[Math.cos(Math.PI*m*Math.sin(deg*Math.PI/180)),Math.sin(Math.PI*m*Math.sin(deg*Math.PI/180))]);near(r.pattern[i],factorPower(r.Wc,a)+factorPower(r.Wr,a));const p=quadratic(r.R,a);near(p[0],r.pattern[i]);near(p[1],0);assert.ok(r.pattern[i]>=-1e-12);});
 }
 defaultState.recipes[1].pattern.forEach((p,i)=>near(p,defaultState.recipes[2].pattern[i]));
});
test('QoS controls change only feasibility; 16 dB failure is relative to fixed covariance, not general infeasibility',()=>{
 const states=[4,12,16].map(t=>C.compute(.8,.01,t));
 for(const s of states)for(let i=0;i<3;i++){const r=s.recipes[i],original=defaultState.recipes[i];assert.deepEqual(r.Wc,original.Wc);assert.deepEqual(r.Wr,original.Wr);assert.deepEqual(r.R,original.R);assert.deepEqual(r.pattern,original.pattern);r.users.forEach(u=>assert.equal(u.pass,u.sinr+1e-12>=10**(s.threshold/10)));}
 assert.deepEqual(states.map(s=>s.recipes.map(r=>r.users.every(u=>u.pass))),[[true,true,true],[true,false,true],[false,false,false]]);
 const s=defaultState,h=s.h.map(z=>z.map(v=>v/Math.sqrt(2))),u0=s.u0.map(z=>z.map(v=>v/Math.sqrt(2)));for(let i=0;i<8;i++)near(abs2(h[i])+abs2(u0[i]),1/8);near(abs2(inner(s.h,h))/.01,50);near(abs2(inner(s.u0,u0))/.01,50);assert.ok(50>10**1.6);
});
test('invalid parameters fail instead of silently changing the model',()=>{
 for(const eta of [-.01,1.01,NaN,Infinity])assert.throws(()=>C.compute(eta));for(const noise of [0,-.1,NaN,Infinity])assert.throws(()=>C.compute(.8,noise));for(const threshold of [NaN,Infinity,-Infinity])assert.throws(()=>C.compute(.8,.01,threshold));
});
