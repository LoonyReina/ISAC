'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const corePath=fs.existsSync(path.join(root,'nearfield-gc-sage-core.js'))?path.join(root,'nearfield-gc-sage-core.js'):path.join(root,'labs/near-field/nearfield-gc-sage-core.js');
const fixtureRoot=path.join(root,'scripts/validation/nearfield-gc-sage/reference/fixtures');
const G=require(corePath);
const read=name=>G.fromFixture(JSON.parse(fs.readFileSync(fixtureRoot+'/'+name+'-observations.json')));
const input=read('default'),{observations:y,model,options}=input;
const initial=G.initialize(y,model,options);
const without={},withHistory={};for(const mode of ['scattering','hybrid']){without[mode]=G.fit(y,model,mode,options,initial);withHistory[mode]=G.fit(y,model,mode,{...options,record_history:true},initial);}
const STATE_KEYS=['kind','reference_delay','point','normal','bounce_points','theta','delays','gains'];
function compact(s){return Object.fromEntries(STATE_KEYS.map(k=>[k,structuredClone(s[k])]));}
function stripObserver(r){const c=structuredClone(r);delete c.history;delete c.budget.seconds;delete c.initialization.budget.seconds;return c;}
function close(a,b,tol=1e-8){assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} versus ${b}`);}
function replayAndCheck(r,observations,m,api=G){
  let states=structuredClone(r.history.initial.states);const latest=states.map(()=>0);
  assert.equal(r.history.initial.trace_index,0);close(api.residualSSE(observations,api.predict(states,m.frequencies)),r.trace[0].sse);
  assert.equal(r.history.updates.length,r.trace.length-1);
  for(let i=0;i<r.history.updates.length;i++){
    const u=r.history.updates[i],t=r.trace[i+1];assert.equal(u.trace_index,i+1);assert.equal(u.path,t.path);assert.equal(u.sweep,t.sweep);assert.equal(u.accepted,t.accepted);
    if(u.accepted){assert.notEqual(u.state,null);assert.equal(u.unchanged_from_trace_index,null);states[u.path]=structuredClone(u.state);latest[u.path]=u.trace_index;}
    else {assert.equal(u.state,null);assert.equal(u.chosen_source,'rejected');assert.equal(u.geometry_changed,false);assert.equal(u.unchanged_from_trace_index,latest[u.path]);}
    close(api.residualSSE(observations,api.predict(states,m.frequencies)),t.sse);
  }
  // Compare through the public serializer to normalize VM array prototypes.
  assert.deepEqual(JSON.parse(JSON.stringify(api.serializable(states))),JSON.parse(JSON.stringify(api.serializable(r.states.map(compact)))));
}
test('history defaults off and has an independent schema version',()=>{assert.equal(G.DEFAULT_OPTIONS.record_history,false);assert.equal('history' in without.hybrid,false);assert.equal(G.HISTORY_SCHEMA_VERSION,'gc-sage-compact-history/1.0.0');assert.equal(withHistory.hybrid.history.schema_version,G.HISTORY_SCHEMA_VERSION);assert.equal(withHistory.hybrid.algorithm_version,without.hybrid.algorithm_version);});
test('enabled and disabled fits are bit-identical except history/timing',()=>{for(const mode of ['scattering','hybrid'])assert.deepEqual(stripObserver(withHistory[mode]),stripObserver(without[mode]));});
test('every default baseline and hybrid trace index reconstructs its actual SSE',()=>{for(const r of Object.values(withHistory))replayAndCheck(r,y,model);});
test('mechanism changes are recorded at their actual updates',()=>{const r=withHistory.hybrid;assert.equal(r.history.updates[0].state.kind,'reflection');assert.equal(r.history.updates[0].chosen_source,'reflection');assert.equal(r.history.updates[2].state.kind,'scattering');assert.equal(r.history.updates[2].chosen_source,'scattering');assert.equal(r.history.updates[2].geometry_changed,true);assert.equal(r.history.initial.states[0].kind,'unlocalized');assert.equal(r.history.initial.states[0].point,null);});
test('incumbent refits retain geometry while reporting actual refit SSE',()=>{const m={...model,region:[1000,1001,1000,1001]},r=G.fit(y,m,'hybrid',{...options,delay_grid:64,initializer_sweeps:2,angle_grid:16,refinement_rounds:0,max_sweeps:2,record_history:true});replayAndCheck(r,y,m);for(const u of r.history.updates){assert.equal(u.chosen_source,'incumbent');assert.equal(u.geometry_changed,false);assert.equal(u.state.kind,'unlocalized');close(u.incumbent_subproblem_sse,r.trace[u.trace_index].sse);}});
test('adverse narrowband history retains unlocalized state and every actual SSE',()=>{const a=read('narrowband'),init=G.initialize(a.observations,a.model,a.options),on=G.fit(a.observations,a.model,'hybrid',{...a.options,record_history:true},init),off=G.fit(a.observations,a.model,'hybrid',a.options,init);assert.deepEqual(stripObserver(on),stripObserver(off));assert.ok(on.states.some(s=>s.kind==='unlocalized'));replayAndCheck(on,a.observations,a.model);});
test('zero sweep budget records only genuine initial states',()=>{const r=G.fit(y,model,'hybrid',{...options,max_sweeps:0,record_history:true},initial);assert.equal(r.history.updates.length,0);assert.equal(r.converged,false);assert.equal(r.stopping_reason,'sweep budget reached');replayAndCheck(r,y,model);});
test('short exhausted budget preserves complete actual attempted-update history',()=>{const r=G.fit(y,model,'hybrid',{...options,max_sweeps:1,record_history:true},initial);assert.equal(r.history.updates.length,2);assert.equal(r.converged,false);replayAndCheck(r,y,model);});
test('snapshots do not alias final states, initializer, or each other',()=>{const r=withHistory.hybrid,h=r.history,all=[...h.initial.states,...h.updates.filter(u=>u.state).map(u=>u.state),...r.states,...r.initialization.states,...initial.states];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){assert.notEqual(all[i].delays.buffer,all[j].delays.buffer);assert.notEqual(all[i].gains.real.buffer,all[j].gains.real.buffer);assert.notEqual(all[i].gains.imag.buffer,all[j].gains.imag.buffer);if(all[i].point&&all[j].point)assert.notEqual(all[i].point,all[j].point);if(all[i].bounce_points&&all[j].bounce_points)assert.notEqual(all[i].bounce_points[0],all[j].bounce_points[0]);}const last=r.states[0].gains.real[0],later=h.updates[2].state.gains.real[0],original=h.updates[0].state.gains.real[0];h.updates[0].state.gains.real[0]=999;assert.equal(r.states[0].gains.real[0],last);assert.equal(h.updates[2].state.gains.real[0],later);h.updates[0].state.gains.real[0]=original;});
test('history carries no predictions, observations, truth, or visibility labels',()=>{const h=withHistory.hybrid.history;for(const s of [...h.initial.states,...h.updates.filter(x=>x.state).map(x=>x.state)])assert.deepEqual(Object.keys(s).sort(),STATE_KEYS.slice().sort());const json=JSON.stringify(G.serializable(h));for(const forbidden of ['prediction','observations','truth','visibility','clean_nmse'])assert.equal(json.includes('"'+forbidden+'"'),false);});
test('boundary counters and elapsed time are genuine cumulative observations',()=>{for(const r of Object.values(withHistory)){const boundaries=[r.history.initial,...r.history.updates];for(const k of Object.keys(boundaries[0].cumulative_budget))assert.equal(boundaries[0].cumulative_budget[k],0);for(let i=1;i<boundaries.length;i++){assert.ok(boundaries[i].elapsed_seconds>=boundaries[i-1].elapsed_seconds);for(const k of Object.keys(boundaries[i].cumulative_budget))assert.ok(boundaries[i].cumulative_budget[k]>=boundaries[i-1].cumulative_budget[k]);}for(const [k,v]of Object.entries(boundaries.at(-1).cumulative_budget))assert.equal(v,r.budget[k]);assert.ok(boundaries.at(-1).elapsed_seconds<=r.budget.seconds);}});
test('history Boolean rejects callbacks and non-Boolean values',()=>{for(const value of [()=>{},1,'yes',null])assert.throws(()=>G.fit(y,model,'hybrid',{...options,record_history:value},initial),/Boolean/);});
test('controlled test-only rejection records unchanged references and replays correctly',()=>{
  // Production solver usually accepts monotone incumbent refits. Exercise the
  // recorder's rejection branch in an isolated source copy, NEVER in runtime.
  const source=fs.readFileSync(corePath,'utf8'),needle='accepted=sse<=previous+1e-12*Math.max(previous,1);';
  assert.equal(source.split(needle).length,2);
  const context={};vm.createContext(context);vm.runInContext(source.replace(needle,'accepted=false; /* test-only forced rejection */'),context);
  const A=context.NearfieldGCSAGE,r=A.fit(y,model,'hybrid',{...options,delay_grid:64,initializer_sweeps:2,angle_grid:16,refinement_rounds:0,max_sweeps:1,record_history:true});
  assert.ok(r.trace.slice(1).every(t=>!t.accepted));assert.ok(r.history.updates.every(u=>u.state===null&&u.unchanged_from_trace_index===0));replayAndCheck(r,y,model,A);
});
