'use strict';
// Genuine Chrome receipts stay byte-pinned; synthetic mutations preserve signed zero.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),fixtures=path.join(__dirname,'fixtures/dual-array-browser-records');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identities={
 'default.json':'166a93d2aa3243efe778dbfdb5f3dd03d6073aec0bcd238aed8109771eed59b6',
 'default-display-only.json':'166a93d2aa3243efe778dbfdb5f3dd03d6073aec0bcd238aed8109771eed59b6',
 'novel-noisy-q2.json':'178cb7ca7c00f03d8fdbc1da4e594f53f8fe867dc16033569686c70f9aeccde1',
 'same-y-grid31.json':'1ba113a10b972a4a3b4520a08470292ba962f6fff8571ae31fc4c30cc6d981be',
 'same-y-grid121.json':'a3c7677c7ea3edcfff48802b31107cfd58a7871932ad8666cf8e888c489639a8',
 'original-records.mjs':'7340f93036f1d2abbf833e88e73341820c14e5432d39a7ea7e4844e99b642158'
};
const load=name=>JSON.parse(fs.readFileSync(path.join(fixtures,name),'utf8'));
const imports=Promise.all(['labs/dual-array/runtime/records.mjs','labs/dual-array/runtime/kernel.mjs','tests/fixtures/dual-array-browser-records/original-records.mjs'].map(file=>import(pathToFileURL(path.join(root,file)))));
async function rehash(r){const [R]=await imports;const {record_sha256,...body}=r;r.record_sha256=await R.digest(body);return r;}
async function compose(r){const [R,K]=await imports;const g=r.execution.generation;r.execution.request.Y.data=g.mean.data.map((x,i)=>x+Math.sqrt(r.request.scene.sigma2)*g.standardized_noise.data[i]);r.execution.result=(await K.runRequest(r.execution.request)).result;return rehash(r);}
async function base(){const [R]=await imports;return R.makeRecord({schema:'dual-array-request-v1',mode:'scene',geometry:{na:1,nb:2,wavelength:1,da:.5,db:.5},X:{rows:1,cols:1,data:[1,-0]},theta_grid_rad:[-.2,0,.2],range_grid_m:[.5,1],includeSurfaces:true,scene:{theta_rad:0,range_m:.7,beta:[1,0],sigma2:.1,seed:81427}});}
async function rejectMutation(record,mutate,pattern){const [R]=await imports,r=structuredClone(record);await mutate(r);await rehash(r);await assert.rejects(R.checkRecord(r),pattern);}

test('Five untouched captured downloads pin four records and reproduce original three scene failures',async()=>{
 const [R,K,O]=await imports,ids=new Set(),ys=new Set();
 assert.deepEqual(fs.readdirSync(fixtures).sort(),Object.keys(identities).sort());
 for(const [name,id]of Object.entries(identities))assert.equal(sha(fs.readFileSync(path.join(fixtures,name))),id,name);
 for(const name of Object.keys(identities).filter(x=>x.endsWith('.json'))){const r=load(name),before=R.canonical(r),calls=[];ids.add(r.record_sha256);ys.add(r.execution.result.y_sha256);
  if(r.kind==='fresh-scene')await assert.rejects(O.checkRecord(r,{runRequest:K.runRequest}),/execution.result.y_sha256: mismatch/);else assert.equal((await O.checkRecord(r,{runRequest:K.runRequest})).semantic_valid,true);
  const checked=await R.checkRecord(r,{runRequest:async(req,control)=>{calls.push(structuredClone(req));return K.runRequest(req,control);}});
  assert.equal(checked.semantic_valid,true);assert.equal(checked.record_sha256,r.record_sha256);assert.equal(R.canonical(r),before);
  assert.deepEqual(calls.map(x=>x.mode),r.kind==='fresh-scene'?['observation','scene']:['observation']);assert.equal(R.canonical(calls[0]),R.canonical(r.execution.request));
  const text=await R.exportRecord(r),imported=await R.importRecord(text);assert.equal(text,before+'\n');assert.equal(R.canonical(imported.record),before);
 }
 assert.equal(ids.size,4);assert.equal(ys.size,2);
});

test('Full record digest and both saved raw fingerprints remain exact',async()=>{
 const [R]=await imports,r=load('default.json'),corrupt=structuredClone(r);corrupt.execution.request.Y.data[0]+=1e-15;await assert.rejects(R.checkRecord(corrupt),/record integrity/);
 await rejectMutation(r,q=>{q.execution.request.Y.data[0]+=1e-15;},/stored actual Y fingerprint/);
 await rejectMutation(r,q=>{q.execution.request.X.data[0]+=1e-15;q.request.X.data[0]=q.execution.request.X.data[0];},/stored actual X fingerprint/);
 for(const field of ['x_sha256','y_sha256'])await rejectMutation(r,q=>{q.execution.result[field]='0'.repeat(64);},/stored actual [XY] fingerprint/);
});

test('Rehashed saved Y edits cannot borrow generator tolerance or replace hashes with regenerated identity',async()=>{
 const [R,K]=await imports,r=load('default.json');
 await rejectMutation(r,async q=>{q.execution.request.Y.data[0]+=Number.EPSILON;q.execution.result.y_sha256=await R.matrixFingerprint(q.execution.request.Y);},/saved generation composition mismatch/);
 await rejectMutation(r,async q=>{q.execution.request.Y.data.fill(0);q.execution.result=(await K.runRequest(q.execution.request)).result;},/saved generation composition mismatch/);
 const local=await K.runRequest(r.request);assert.notEqual(local.result.y_sha256,r.execution.result.y_sha256);
 await rejectMutation(r,q=>{q.execution.result.y_sha256=local.result.y_sha256;},/stored actual Y fingerprint/);
});

test('Receiver replay checks forged outputs independently of valid generator evidence',async()=>{
 const r=load('novel-noisy-q2.json');
 await rejectMutation(r,q=>{q.execution.result.joint.beta[0]*=1.01;},/execution.result.joint.beta/);
 await rejectMutation(r,q=>{q.execution.result.surfaces.profile_scores[0]*=1.01;},/execution.result.surfaces.profile_scores/);
 await rejectMutation(r,q=>{q.execution.result.y_energy*=1.01;},/execution.result.y_energy/);
});

test('Scene binding is exact; missing stale or forged generation metadata rejects',async()=>{
 const r=load('novel-noisy-q2.json');
 for(const fn of [q=>{delete q.execution.generation;},q=>{q.execution.generation=null;},q=>{q.execution.generation.generator='mulberry32-box-muller-v0';},q=>{q.execution.generation.extra=true;},q=>{delete q.execution.generation.standardized_noise;},q=>{q.execution.generation.mean.data[0]*=1.001;}])await rejectMutation(r,fn);
 for(const field of ['sigma2','theta_rad','range_m'])await rejectMutation(r,q=>{q.execution.generation.scene[field]+=Number.EPSILON;},/generation.scene: changed input/);
 await rejectMutation(r,q=>{q.execution.generation.scene.seed++;},/generation.scene: changed input/);
 await rejectMutation(r,q=>{q.request.scene.seed++;q.execution.generation.scene.seed++;},/execution.generation.standardized_noise|cross-runtime numerical mismatch/);
 await rejectMutation(r,q=>{q.execution.generation=structuredClone(load('default.json').execution.generation);});
});

test('Mean and noise boundaries include 64 epsilon and reject 65 with coherent hashes and raw replay',async()=>{
 const [R]=await imports,r=await base();assert.equal(r.execution.generation.mean.data[0],1);
 for(const name of ['mean','standardized_noise'])for(const sign of [-1,1]){
  const expected=r.execution.generation[name].data[0],bound=64*Number.EPSILON*Math.abs(expected);
  const within=structuredClone(r);within.execution.generation[name].data[0]=expected+sign*bound;await compose(within);assert.equal((await R.checkRecord(within)).semantic_valid,true,name+' within');
  const outside=structuredClone(r);outside.execution.generation[name].data[0]=expected+sign*65*Number.EPSILON*Math.abs(expected);await compose(outside);await assert.rejects(R.checkRecord(outside),/cross-runtime numerical mismatch/,name+' outside');
 }
});

test('Signed zero is preserved in raw hashes and enforced in generation composition and exact zero comparison',async()=>{
 const [R,K]=await imports,r=await base();assert.ok(Object.is(r.request.X.data[1],-0));
 const zero=structuredClone(r);zero.request.scene.sigma2=0;zero.request.scene.beta=[0,0];const z=await R.makeRecord(zero.request);assert.equal(z.execution.request.Y.data[0],0);assert.ok(!Object.is(z.execution.request.Y.data[0],-0));
 await rejectMutation(z,async q=>{q.execution.request.Y.data[0]=-0;q.execution.result=(await K.runRequest(q.execution.request)).result;},/saved generation composition mismatch/);
 await rejectMutation(z,q=>{q.execution.generation.mean.data[0]=-0;},/cross-runtime numerical mismatch/);
 const raw=structuredClone(z.execution.request);raw.Y.data[0]=-0;const rr=await R.makeRecord(raw);assert.ok(Object.is((await R.importRecord(await R.exportRecord(rr))).record.execution.request.Y.data[0],-0));
 assert.notEqual(await R.matrixFingerprint(raw.Y),await R.matrixFingerprint(z.execution.request.Y));
});

test('Tiny scale generation rejects erased mean and coherent zero Y without any unit floor',async()=>{
 const [R,K]=await imports,req=(await base()).request,q=structuredClone(req);q.scene.beta=[1e-40,-2e-40];q.scene.sigma2=1e-80;const r=await R.makeRecord(q);assert.equal((await R.checkRecord(r)).semantic_valid,true);assert.ok(r.execution.request.Y.data.some(x=>x!==0&&Math.abs(x)<1e-38));
 await rejectMutation(r,async z=>{z.execution.generation.mean.data.fill(0);await compose(z);},/execution.generation.mean|cross-runtime numerical mismatch/);
 await rejectMutation(r,async z=>{z.execution.request.Y.data.fill(0);z.execution.result=(await K.runRequest(z.execution.request)).result;},/saved generation composition mismatch/);
 await rejectMutation(r,async z=>{z.execution.generation.mean.data[0]+=1e-52;await compose(z);},/cross-runtime numerical mismatch/);
});

test('Novel scenes retain rank null zero-noise and tiny-gain FIM scale contracts',async()=>{
 const [R,K]=await imports;const d=K.defaultRequest();d.theta_grid_rad=[-.7,.03,.61];d.range_grid_m=[.42,.81,1.27];d.scene={theta_rad:-.347,range_m:.973,beta:[-.31,.67],sigma2:.071,seed:4294967295};
 for(const kind of ['novel','tiny-gain','zero-noise','rank-one','null-X','zero-gain']){const q=structuredClone(d);if(kind==='tiny-gain')q.scene.beta=[1e-30,-2e-30];if(kind==='zero-noise')q.scene.sigma2=0;if(kind==='rank-one')q.X=K.jsonMatrix(K.waveform(q.geometry,1,32,1,4).X);if(kind==='null-X')q.X.data.fill(0);if(kind==='zero-gain')q.scene.beta=[0,0];const r=await R.makeRecord(q);assert.equal((await R.checkRecord(r)).semantic_valid,true,kind);
  if(kind==='zero-noise')assert.equal(r.execution.generation.finite_X_crb.status,'undefined-zero-noise');
  if(kind==='rank-one')assert.equal(r.execution.generation.finite_X_crb.status,'singular');
  if(kind==='null-X')assert.equal(r.execution.result.joint.status,'all-templates-null');
  if(kind==='zero-gain')assert.equal(r.execution.generation.finite_X_crb.status,'singular');
  if(kind==='tiny-gain')for(const name of ['full_fim','position_information','schur_information'])await rejectMutation(r,z=>{z.execution.generation.finite_X_crb[name][0][0]=0;},/execution.generation.finite_X_crb/);
 }
});

test('Existing homogeneous gain score and parameter-local FIM comparators are unchanged',async()=>{
 const [R,,O]=await imports;
 assert.equal(R.semanticEqual.toString(),O.semanticEqual.toString());assert.equal(R.validateResult.toString(),O.validateResult.toString());
 for(const [actual,expected,p]of [[{beta:[0,0]},{beta:[1e-100,2e-100]},'result'],[{score:0},{score:1e-100},'result'],[{full_fim:[[0,0],[0,1]]},{full_fim:[[1e-100,0],[0,1]]},'generation']])assert.throws(()=>R.semanticEqual(actual,expected,p),/numerical mismatch/);
});

test('Cancellation checkpoints survive both bounded receiver and generator replay',async()=>{
 const [R]=await imports,r=await base();let count=0;await assert.rejects(R.checkRecord(r,{control:{checkpoint(){if(++count===2)throw Error('requested cancellation');}}}),/requested cancellation/);assert.equal(count,2);
});
