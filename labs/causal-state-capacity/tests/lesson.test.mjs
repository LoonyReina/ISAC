import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluateCausalCapacity,THRESHOLD_BRACKET} from '../public/causal-capacity-core.mjs';
import {createLessonController} from '../public/causal-capacity-controller.mjs';
import {computeCurve,curvePath,curveSVG,currentView,pmfHTML,atomText,meaningful} from '../public/causal-capacity-view.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const next=(x,delta)=>{const f=new Float64Array([x]),u=new BigUint64Array(f.buffer);u[0]+=delta;return f[0];};

test('accepted scientific core and runtime retain exact reviewed bytes',async()=>{
  const files={'causal-capacity-core.mjs':'3ff7638e823166132f96572055a8019229876824fef3c7ae089a08da2d3613e3','causal-capacity-runtime.mjs':'d51938af45a3df9976c117c7c45fd2d10be01300e1f9583b354fa09c8be04fe4'};
  for(const [name,hash]of Object.entries(files))assert.equal(createHash('sha256').update(await readFile(new URL(`../public/${name}`,import.meta.url))).digest('hex'),hash);
});
test('current result and full export agree across required teaching anchors',async()=>{
  const c=createLessonController();
  for(const D of [0,.15,.16,.2,.25,.3,.5]){
    await c.change(D);const s=c.getState(),r=s.result,e=JSON.parse(c.exportCurrentJSON()),v=currentView(s);
    assert.equal(e.runtimeRevision,s.revision);assert.equal(e.requestedD,D);assert.equal(e.atoms.length,16);
    assert.deepEqual(e.atoms,r.atoms);assert.equal(v.budget,String(D));near(r.metrics.actualDistortion,Math.min(D,.25));
    assert.equal(e.feasibility.feasibleRate,D<.155?null:r.formula.rawInformationBalance);
    near(r.metrics.pmfObjective,r.formula.rawInformationBalance);
    assert.equal(e.implementationCommit,null);
  }
  await c.change(.2);near(c.getState().result.feasibility.feasibleRate,.09937184596909664);
});
test('all closed-window binary64 inputs remain null and both adjacent inputs are distinct',async()=>{
  const c=createLessonController();let x=THRESHOLD_BRACKET[0],count=0;
  while(x<=THRESHOLD_BRACKET[1]){await c.change(x);const v=currentView(c.getState());assert.equal(v.result.feasibility.status,'boundary_within_numerical_resolution');assert.equal(v.rate,'未给出');assert.equal(JSON.parse(c.exportCurrentJSON()).feasibility.feasibleRate,null);x=next(x,1n);count++;}
  assert.equal(count,8);
  await c.change(next(THRESHOLD_BRACKET[0],-1n));assert.equal(c.getState().result.feasibility.status,'infeasible');
  await c.change(next(THRESHOLD_BRACKET[1],1n));assert.equal(c.getState().result.feasibility.status,'feasible');assert.match(currentView(c.getState()).rate,/e-/);
});
test('invalid changes synchronously clear previous results, metrics, and export',async()=>{
  const c=createLessonController();
  for(const value of [NaN,Infinity,-Infinity,'',null,undefined,-.001,.501,'0.2']){
    await c.change(.2);const p=c.change(value);assert.equal(c.getState().phase,'invalid');assert.equal(c.getState().result,null);assert.equal(currentView(c.getState()),null);assert.throws(()=>c.exportCurrentJSON());await p;
  }
});
test('pending changes clear immediately and the latest result owns the display',async()=>{
  const states=[],c=createLessonController({onState:s=>states.push(s)});
  await c.change(.2);const a=c.change(.16);assert.equal(c.getState().phase,'pending');assert.equal(c.getState().result,null);assert.throws(()=>c.exportCurrentJSON());
  const b=c.change(.3);const [ra,rb]=await Promise.all([a,b]);assert.equal(ra.committed,false);assert.equal(rb.committed,true);assert.equal(c.getState().requestedD,.3);assert.ok(states.filter(s=>s.phase==='ready').every(s=>[.2,.3].includes(s.requestedD)));
});
test('reset, invalid edits, and dispose supersede pending work',async()=>{
  const c=createLessonController();let p=c.change(.2);c.reset();assert.equal((await p).committed,false);assert.equal(c.getState().phase,'idle');assert.throws(()=>c.exportCurrentJSON());
  p=c.change(.2);await c.change(NaN);assert.equal((await p).committed,false);assert.equal(c.getState().phase,'invalid');
  p=c.change(.2);c.dispose();assert.equal((await p).committed,false);assert.equal(c.getState().phase,'idle');assert.equal((await c.change(.3)).reason,'disposed');
});
test('curve points use actual accepted evaluator and never clamp null to zero',()=>{
  const p=computeCurve();assert.ok(p.length>200);
  for(const row of p){const r=evaluateCausalCapacity(row.D);assert.equal(row.status,r.feasibility.status);assert.equal(row.rate,r.feasibility.feasibleRate);}
  assert.ok(p.some(x=>x.rate===null));assert.equal((curvePath(p).match(/M/g)||[]).length,1);
  assert.equal(curvePath(p.filter(x=>x.rate===null)),'');assert.ok(p.filter(x=>x.rate!==null).every(x=>x.D>THRESHOLD_BRACKET[1]));
  assert.equal(curvePath([{D:0,rate:1},{D:.1,rate:null},{D:.2,rate:2}]).split('M').length,3);
});
test('chart absent for invalid/pending state and null selection has no capacity dot',()=>{
  const p=computeCurve();assert.doesNotMatch(curveSVG(p,null),/data-curve=/);
  for(const D of [.15,...THRESHOLD_BRACKET]){const html=curveSVG(p,evaluateCausalCapacity(D));assert.match(html,/null/);assert.doesNotMatch(html,/<circle/);}
  assert.match(curveSVG(p,evaluateCausalCapacity(.2)),/<circle/);
});
test('PMF panel preserves every zero atom and actual deterministic mapping',()=>{
  for(const D of [0,.16,.2,.25,.5]){const r=evaluateCausalCapacity(D),html=pmfHTML(r);assert.equal((html.match(/data-atom=/g)||[]).length,16);for(let i=0;i<16;i++){const a=r.atoms[i];assert.ok(html.includes(`概率 ${a.probability}`));assert.ok(atomText(r,i).includes(`S=${a.S}，X=${a.X}，Y=${a.Y}，Ŝ=${a.Shat}`));}}
  assert.doesNotMatch(pmfHTML(null),/data-atom=/);
});
test('tiny nonzero balances do not become a falsely exact zero',()=>{assert.equal(meaningful(1e-16),'1.000e-16');assert.equal(meaningful(-1e-16),'-1.000e-16');assert.equal(meaningful(0),'0.000000');});
test('teaching markup keeps causal timing, source, threshold and limitation visible',async()=>{
  const h=await readFile(new URL('../public/causal-state-capacity.html',import.meta.url),'utf8');
  for(const text of ['single-letter asymptotic theorem evaluation','E 独立于 U','前向独立误差','时刻 i · 当前状态已知','之后 · 延迟分块重构','未执行有限长度通信码','严格因果 Fig. 2','0.1551404838969245','0.1551404838969247','3715–3716','10.1109/TIT.2013.2245719'])assert.ok(h.includes(text),text);
  assert.equal((h.match(/type="number"/g)||[]).length,1);assert.match(h,/id="cc-budget"[^>]*step="any"/);assert.match(h,/id="cc-status"[^>]*role="status"/);assert.match(h,/id="cc-input-error"[^>]*role="alert"/);assert.match(h,/id="cc-export" disabled/);
  assert.equal((h.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)||[''])[0].match(/<a /g).length,2);
  for(const region of ['HEADER','CONTEXT','NEXT'])assert.equal((h.match(new RegExp(`SITE:${region}:START`,'g'))||[]).length,1);
});
test('the production input path uses valueAsNumber rather than permissive coercion',async()=>{
  const ui=await readFile(new URL('../public/causal-capacity-ui.mjs',import.meta.url),'utf8');assert.match(ui,/const D=el\.budget\.valueAsNumber/);assert.doesNotMatch(ui,/parseFloat\(|Number\(el\.budget\.value\)/);assert.match(ui,/controller\.exportCurrentJSON\(\)/);assert.match(ui,/URL\.revokeObjectURL/);
});
