// Independent observer-only audit. Uses exported production APIs, no optimizer copy.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname, hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const siteRoot=path.resolve(__dirname,'../../../..'),core=fs.existsSync(path.join(siteRoot,'nearfield-gc-sage-core.js'))?path.join(siteRoot,'nearfield-gc-sage-core.js'):path.join(siteRoot,'labs/near-field/nearfield-gc-sage-core.js');
const oldFile=path.join(root,'superseded/pre-history-v0.2.0/gc-sage.js');
const currentHash=hash(core),oldHash=hash(oldFile);
assert.equal(oldHash,'6baeea9ea710162ba91ad8919c33c6b0a5d8f6cf664b8bd2f3ac2442a68fcc68');
const G=require(core),O=require(oldFile),inputs=JSON.parse(fs.readFileSync(path.join(root,'independent/history-inputs.json')));
function plain(v){return G.serializable(v);}
function strip(v){if(ArrayBuffer.isView(v))return Array.from(v,strip);if(Array.isArray(v))return v.map(strip);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['history','seconds','elapsed_seconds'].includes(k)).map(([k,x])=>[k,strip(x)]));return v;}
function geometry(s){return Object.fromEntries(['kind','reference_delay','point','normal','bounce_points','theta','delays'].map(k=>[k,plain(s[k])]));}
function compact(s){return Object.fromEntries(['kind','reference_delay','point','normal','bounce_points','theta','delays','gains'].map(k=>[k,plain(s[k])]));}
function near(a,b,tol=2e-7){assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol+2e-12*Math.abs(b),`${a} != ${b}`);}
function collectObjects(v,out){if(!v||typeof v!=='object')return;assert.ok(!out.has(v),'state snapshot shares a mutable object');out.add(v);if(ArrayBuffer.isView(v)){assert.ok(!out.has(v.buffer),'state snapshot shares a typed buffer');out.add(v.buffer);return;}for(const x of Object.values(v))collectObjects(x,out);}
const records=[],sources={},coverage={mechanism_changes:0,incumbent_updates:0,unlocalized_states:0,rejected_updates:0};let totalBoundaries=0,maxSSEError=0,maxIncumbentError=0;
for(const item of inputs){
 const x=G.fromFixture(item.fixture),ox=O.fromFixture(item.fixture),initial=G.initialize(x.observations,x.model,x.options),oi=O.initialize(ox.observations,ox.model,ox.options);
 for(const mode of ['scattering','hybrid']){
  const old=O.fit(ox.observations,ox.model,mode,ox.options,oi),off=G.fit(x.observations,x.model,mode,{...x.options,record_history:false},initial),on=G.fit(x.observations,x.model,mode,{...x.options,record_history:true},initial);
  assert.deepEqual(strip(off),strip(old),'disabled instrumentation differs from audited predecessor');
  assert.deepEqual(strip(on),strip(off),'enabled instrumentation changes numerical result');
  assert.ok(!Object.hasOwn(off,'history'));
  const h=on.history;assert.equal(h.schema_version,G.HISTORY_SCHEMA_VERSION);assert.equal(h.initial.trace_index,0);assert.equal(h.updates.length,on.trace.length-1);
  const snapshots=[...h.initial.states,...h.updates.filter(u=>u.state).map(u=>u.state)];const objects=new Set();for(const s of [...snapshots,...on.states])collectObjects(s,objects);
  for(const s of snapshots){assert.deepEqual(Object.keys(s).sort(),['kind','reference_delay','point','normal','bounce_points','theta','delays','gains'].sort());if(s.kind==='unlocalized'){coverage.unlocalized_states++;assert.equal(s.point,null);assert.equal(s.normal,null);assert.equal(s.bounce_points,null);}}
  let replay=structuredClone(h.initial.states),lastByPath=replay.map(()=>0),lastCounts=h.initial.cumulative_budget,lastElapsed=h.initial.elapsed_seconds;
  assert.deepEqual(compact(replay[0]),compact(initial.states[0]));assert.ok(lastElapsed>=0&&lastElapsed<=on.budget.seconds);for(const count of Object.values(lastCounts))assert.equal(count,0);
  let prediction=G.predict(replay,x.model.frequencies),loss=G.residualSSE(x.observations,prediction);near(loss,on.trace[0].sse);maxSSEError=Math.max(maxSSEError,Math.abs(loss-on.trace[0].sse));
  for(const u of h.updates){
   totalBoundaries++;const tr=on.trace[u.trace_index],before=replay[u.path];assert.equal(u.trace_index,totalBoundaries>=0?h.updates.indexOf(u)+1:-1);assert.equal(u.path,tr.path);assert.equal(u.sweep,tr.sweep);assert.equal(u.accepted,tr.accepted);
   const active=G.predict([before],x.model.frequencies),hidden=G.hiddenData(x.observations,prediction,active),incumbent=G.profileGeometry(hidden,before.delays,x.model.frequencies);
   near(u.incumbent_subproblem_sse,incumbent.sse);maxIncumbentError=Math.max(maxIncumbentError,Math.abs(u.incumbent_subproblem_sse-incumbent.sse));
   let source='incumbent',best=u.incumbent_subproblem_sse;if(tr.scattering_subproblem_sse!==null&&tr.scattering_subproblem_sse<best){source='scattering';best=tr.scattering_subproblem_sse;}
   if(tr.reflection_subproblem_sse!==null&&(tr.scattering_subproblem_sse===null||tr.reflection_subproblem_sse<tr.scattering_subproblem_sse)&&tr.reflection_subproblem_sse<best)source='reflection';
   assert.equal(u.chosen_source,u.accepted?source:'rejected');sources[u.chosen_source]=(sources[u.chosen_source]||0)+1;
   if(u.accepted){assert.ok(u.state);assert.equal(u.unchanged_from_trace_index,null);assert.equal(u.geometry_changed,JSON.stringify(geometry(before))!==JSON.stringify(geometry(u.state)));if(before.kind!==u.state.kind)coverage.mechanism_changes++;if(u.chosen_source==='incumbent'){coverage.incumbent_updates++;assert.deepEqual(geometry(before),geometry(u.state));}replay[u.path]=structuredClone(u.state);lastByPath[u.path]=u.trace_index;}
   else{coverage.rejected_updates++;assert.equal(u.state,null);assert.equal(u.geometry_changed,false);assert.equal(u.unchanged_from_trace_index,lastByPath[u.path]);}
   assert.ok(u.elapsed_seconds>=lastElapsed&&u.elapsed_seconds<=on.budget.seconds);lastElapsed=u.elapsed_seconds;
   for(const key of Object.keys(lastCounts))assert.ok(u.cumulative_budget[key]>=lastCounts[key]);lastCounts=u.cumulative_budget;
   prediction=G.predict(replay,x.model.frequencies);loss=G.residualSSE(x.observations,prediction);near(loss,tr.sse);maxSSEError=Math.max(maxSSEError,Math.abs(loss-tr.sse));
  }
  assert.deepEqual(replay.map(compact),on.states.map(compact));assert.deepEqual(lastCounts,Object.fromEntries(Object.entries(on.budget).filter(([k])=>k!=='seconds')));
  const finalBefore=plain(on.states),initialBefore=plain(initial.states);h.initial.states[0].gains.real[0]+=123;h.initial.states[0].delays[0]+=1;
  assert.deepEqual(plain(on.states),finalBefore,'history mutation changes final states');assert.deepEqual(plain(initial.states),initialBefore,'history mutation changes public initializer');
  assert.deepEqual(strip(G.fit(x.observations,x.model,mode,{...x.options,record_history:false},initial)),strip(off),'history mutation changes private initializer');
  records.push({case:item.name,mode,pass:true,boundaries:h.updates.length,bit_identical_old_off_on:true});
 }
}
assert.ok(coverage.mechanism_changes>0&&coverage.incumbent_updates>0&&coverage.unlocalized_states>0);assert.equal(hash(core),currentHash,'Core changed during audit');
const result={pass:true,source_sha256:{current:currentHash,predecessor:oldHash},algorithm_version:G.VERSION,history_schema:G.HISTORY_SCHEMA_VERSION,records,total_boundaries:totalBoundaries,max_reconstructed_sse_error:maxSSEError,max_recomputed_incumbent_sse_error:maxIncumbentError,chosen_sources:sources,coverage,scope:'Actual snapshots and actual core; post-run replay only. Rejected-update branch may require owner controlled fixture.'};
fs.writeFileSync(path.join(root,'independent/history-audit.json'),JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result,null,2)+'\n');
