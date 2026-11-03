'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=path.resolve(__dirname,'../features/teaching19'),box={};vm.runInNewContext(fs.readFileSync(path.join(runtime,'lessons.js'),'utf8'),box);const data=JSON.parse(JSON.stringify(box.Guided19Data));
const {recordKey,newRecord,readRecord,predictionFeedback,stageStatus}=require(path.join(runtime,'engine.js'));
const {installTheoryAdapter}=require(path.join(runtime,'theory-adapters.js'));
test('all19 and extended route have per-option feedback and metric/input bindings',()=>{for(const l of [...data.lessons,...data.variants]){assert.equal(l.predictionQuestion.feedback.length,l.predictionQuestion.options.length,l.id);assert(new Set(l.predictionQuestion.feedback).size>1,l.id);assert(l.feedbackMetricSelectors.length,l.id);assert(l.ui.recordInputSelectors.length,l.id);assert.equal(l.learningIdentity.length,3,l.id);assert(predictionFeedback(l,null).includes('尚未'));}});
test('record identity distinguishes point and extended CRB, and imports cannot alter current core',()=>{const a=data.lessons.find(l=>l.id==='crb'),b=data.variants.find(l=>l.id==='crb');assert.notEqual(recordKey(a),recordKey(b));assert.throws(()=>readRecord(newRecord(a),b));const r=newRecord(a);r.note='我的解释';r.observations=[{runId:'local-1',at:'2026-10-25T00:00:00Z',parameters:[{id:'seed',value:'13'}],metrics:[{selector:'#cm-root-crb',text:'0.01°'}]}];assert.deepEqual(readRecord(JSON.stringify(r),a),r);assert.equal(readRecord(r,a).observations[0].parameters[0].value,'13');});
test('malformed, wrong-version, wrong-course and invalid stage records fail closed',()=>{const l=data.lessons[0],r=newRecord(l);for(const value of ['{',null,{}, {...r,schema:'old'}, {...r,version:'future'}, {...r,step:999}, {...r,prediction:99}, {...r,observations:[{metrics:[]}]}])assert.throws(()=>readRecord(value,l));assert.equal(stageStatus(r,3),'未尝试');r.visited=[3];assert.equal(stageStatus(r,3),'已阅读，未尝试');r.attempted=[3];assert.equal(stageStatus(r,3),'已尝试');});
function fixture(lesson){
 const nodes=new Map();function n(s){if(!nodes.has(s)){const events={};nodes.set(s,{id:s,type:'number',value:'A',hidden:true,disabled:true,dataset:{},textContent:'',getAttribute(){return null},setAttribute(){},removeAttribute(){},addEventListener(t,f){(events[t]??=[]).push(f)},removeEventListener(t,f){events[t]=(events[t]||[]).filter(v=>v!==f)},fire(t,target=this){for(const f of events[t]||[])f({target,type:t})},click(){this.fire('click')}});}return nodes.get(s);}
 const control=n('#parameter'),view=n('#view'),host=n(lesson.ui.rootSelector);
 const doc={querySelector:n,querySelectorAll:s=>s==='#parameter'?[control]:[],defaultView:{Event:class{constructor(type){this.type=type}}}};
 lesson={...lesson,ui:{...lesson.ui,recordInputSelectors:['#parameter']}};
 const a=installTheoryAdapter(doc,lesson);n(lesson.firstRun.runSelector).disabled=false;return {a,n,host,control,view,run:()=>n(lesson.firstRun.runSelector).click(),edit(v){control.value=v;host.fire('input',control);}};
}
test('theory freshness rejects A→B→A edits, cancellation, imports and stale async terminal; display-only controls stay fresh',()=>{const l=data.lessons.find(l=>l.id==='nearfield-multitarget-correlation'),f=fixture(l);f.n('#mt-results').hidden=false;f.n('#mt-record-state').textContent='本次';f.run();assert(f.a.ready());f.host.fire('change',f.view);assert(f.a.ready(),'read-only view keeps same result');f.edit('B');f.edit('A');assert(!f.a.ready(),'restoring numeric value does not revive old run');f.n('#mt-results').hidden=false;assert(!f.a.ready(),'late old terminal cannot revive');f.run();assert(f.a.ready());f.n('#mt-cancel').click();assert(!f.a.ready());f.run();assert(f.a.ready());f.host.fire('change',{type:'file'});assert(!f.a.ready());});
test('near-field preset snapshots parameters after asynchronous preset load, but rejects later user edits',()=>{const l=data.lessons.find(l=>l.id==='supplement-case-near-field'),f=fixture(l);f.run();f.control.value='loaded preset';f.n('#nfr-status').textContent='接收机结束：accepted';f.n('[data-nfr-action="cancel"]').disabled=true;assert(f.a.ready());assert.equal(f.a.getState().parameters[0].value,'loaded preset');f.edit('changed');f.edit('loaded preset');assert(!f.a.ready());});

test('OTFS and atomic teach template construction before first numerical run without adding actions',()=>{
 const cases=[['otfs-joint-estimation-2020',3],['ofdm-passive-atomic-errors-2017',6]];
 for(const [id,count] of cases){
  const l=data.lessons.find(l=>l.id===id),run=l.steps.findIndex(s=>s.role==='run'),warm=l.steps.findIndex(s=>s.role==='predict');
  const bridges=l.steps.slice(1,warm);assert.equal(bridges.length,count);assert(warm<run);
  for(const s of bridges){assert.equal(s.role,'intro');assert(s.body.length<420);for(const k of ['action','focusSelector','revealSelector','viewRevealSelector','stageSelector'])assert.equal(s[k],undefined);}
  assert.equal(l.recordVersion,'algorithm-bridges-20261103-v1');
  const old=newRecord(l);old.version='study-20261103-v1';assert.throws(()=>readRecord(old,l),/版本/);
 }
 const otfs=data.lessons.find(l=>l.id==='otfs-joint-estimation-2020');assert.equal(otfs.workedExample.steps.length,5);assert.match(otfs.workedExample.bridgeToCore,/不是原文例子/);assert.match(otfs.workedExample.notEvidenceOf,/候选恰好正确/);
 const atomic=data.lessons.find(l=>l.id==='ofdm-passive-atomic-errors-2017');assert(atomic.steps.some(s=>s.body?.includes('不能跳称SDP永远等于连续原子范数')));
});

test('independent OTFS hand example verifies template, sequential residual and normal equations',()=>{
 const x=[1,1],P1=[[1,0],[0,0]],P2=[[1,0],[0,1]],mv=(A,x)=>A.map(r=>r.reduce((s,v,i)=>s+v*x[i],0)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const u1=mv(P1,x),u2=mv(P2,x),y=[2,1];assert.deepEqual(u1,[1,0]);assert.deepEqual(u2,[1,1]);
 const h1=dot(u1,y)/dot(u1,u1),rem=y.map((v,i)=>v-h1*u1[i]),h2=dot(u2,rem)/dot(u2,u2),res=y.map((v,i)=>v-h1*u1[i]-h2*u2[i]);
 assert.equal(h1,2);assert.equal(h2,.5);assert.equal(dot(res,res),.5);
 const gram=[u1,u2].map(a=>[u1,u2].map(b=>dot(a,b))),rhs=[u1,u2].map(a=>dot(a,y));assert.deepEqual(gram,[[1,1],[1,2]]);assert.deepEqual(rhs,[2,3]);assert.deepEqual(mv(gram,[1,1]),rhs);assert.deepEqual(y.map((v,i)=>v-u1[i]-u2[i]),[0,0]);
});

test('atomic hand example verifies two-dimensional phase, Toeplitz lags and PSD lifting',()=>{
 const c=(r,i=0)=>[r,i],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=a=>[a[0],-a[1]],scale=(a,k)=>a.map(v=>k*v),add=(a,b)=>a.map((v,i)=>v+b[i]),close=(a,b)=>a.forEach((v,i)=>assert(Math.abs(v-b[i])<1e-12));
 const atom=Array.from({length:4},(_,i)=>{const m=i%2,n=Math.floor(i/2),p=2*Math.PI*(m/4-n/2);return c(Math.cos(p),Math.sin(p));});
 [c(1),c(0,1),c(-1),c(0,-1)].forEach((v,i)=>close(atom[i],v));
 const z=atom.map(a=>add(scale(a,2),c(1)));[c(3),c(1,2),c(-1),c(1,-2)].forEach((v,i)=>close(z[i],v));
 const lift=[...atom,c(1)],B=lift.map(a=>lift.map(b=>scale(mul(a,conj(b)),2)));
 for(let i=0;i<4;i++){close(B[i][4],scale(atom[i],2));for(let k=0;k<4;k++){const dm=i%2-k%2,dn=Math.floor(i/2)-Math.floor(k/2),p=2*Math.PI*(dm/4-dn/2);close(B[i][k],c(2*Math.cos(p),2*Math.sin(p)));}}
 assert.equal(B.slice(0,4).reduce((s,r,i)=>s+r[i][0],0)/8+B[4][4][0]/2,2);
 // B=2 vv^H: test b^H B b = 2 |v^H b|^2 with a non-real vector.
 const b=[c(1,2),c(-3,1),c(.5,-2),c(0,1),c(2,-1)],vHb=lift.reduce((s,a,i)=>add(s,mul(conj(a),b[i])),c(0)),Bb=B.map(row=>row.reduce((s,a,i)=>add(s,mul(a,b[i])),c(0))),q=b.reduce((s,a,i)=>add(s,mul(conj(a),Bb[i])),c(0));
 close(q,c(2*(vHb[0]**2+vHb[1]**2)));assert(q[0]>=0);
});
