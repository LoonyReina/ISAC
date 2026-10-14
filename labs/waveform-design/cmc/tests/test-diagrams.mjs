import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const output=name=>{if(!process.env.ISAC_TEST_OUTPUT)throw Error('ISAC_TEST_OUTPUT required');return path.join(process.env.ISAC_TEST_OUTPUT,name);};
import crypto from 'node:crypto';
import {solve,objective} from '../cmc-core.mjs';
import {nodeView,arcGeometry,renderNode} from '../phase-diagram.mjs';
let assertions=0;const check=(a,b)=>{assert.deepEqual(a,b);assertions++;};
const input={H:[[[1,.2],[.3,-.1]],[[.2,-.4],[1,.1]]],s:[[1,0],[0,1]],referencePhase:[.2,-.4],power:1,epsilon:1,tolerance:1e-6,maxNodes:255,branch:'ARS',relaxationIterations:500,upperIterations:100};
for(const branch of ['ARS','BRS'])for(const epsilon of [0,.05,1,1.95,2]){
 const r=solve({...input,epsilon,branch,maxNodes:31});
 for(const n of r.ledger)for(let i=0;i<2;i++){
  const v=nodeView(r,n.id,i),svg={},details={},caption={};
  check(v.z,n.relaxation.z[i]);check(v.x,n.physical.x[i]);check(v.lower,n.lower);check(v.upper,n.upper);
  check(v.lo,n.lo[i]);check(v.hi,n.hi[i]);check(v.tangentObjective,n.bound.tangentObjective);
  check(v.linearSupport,n.bound.linearSupport);check(v.allowance,n.bound.allowance);
  check(v.lower,Math.max(0,v.tangentObjective+v.linearSupport-v.allowance));
  check(v.upper,objective(input.H.map(row=>row.map(z=>z.map(t=>t*Math.sqrt(.5)))),input.s,n.physical.x));
  renderNode(svg,details,caption,r,n.id,i);check(svg.innerHTML.includes(`节点 ${n.id}，天线 ${i+1}`),true);check(details.textContent.includes(v.lower.toPrecision(7)),true);
  const g=arcGeometry(v.lo,v.hi);check(g.start,[Math.cos(v.lo),Math.sin(v.lo)]);check(g.end,[Math.cos(v.hi),Math.sin(v.hi)]);
  check((g.arc.match(/ A /g)||[]).length,epsilon===0?0:2);
 }
}
assert.throws(()=>nodeView(solve(input),-1,0));assert.throws(()=>nodeView(solve(input),0,2));assert.throws(()=>arcGeometry(0,7));assertions+=3;
// Verify solver and worker byte identity to the independently accepted prototype.
const expected={"cmc-core.mjs": "90d6212608de088b564ad3cad6d17b186ca6a0f9ad9557bbc46e46edb2c936e0", "cmc-worker.mjs": "2b29f476a00676718c745e6ba4bb2f4418349e43fadb0b8d45c280f8ed1b93ef"};
const hashes={};for(const file of Object.keys(expected)){hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex');check(hashes[file],expected[file]);}
// A deliberately narrow DOM double: checks lifecycle/field wiring, not actual rendering/layout.
class Element{
 constructor(){this.value='';this.disabled=false;this.textContent='';this.innerHTML='';this.listeners={};this.width=850;this.height=350;this.children=[];}
 addEventListener(t,f){this.listeners[t]=f;}
 replaceChildren(...items){this.children=items;this.innerHTML='';this.value=items[0]?.value??'';}
 getContext(){return new Proxy({},{get:()=>()=>{}});}
}
globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
const ids=['bounds','result','baseline','status','run','cancel','download','epsilon','epsilonValue','power','branch','nodes','tolerance','data','phaseDiagram','nodeDetails','nodeCaption','nodeSelect','antennaSelect'];
const dom=Object.fromEntries(ids.map(id=>[id,new Element()]));
Object.assign(dom.epsilon,{value:'1'});dom.power.value='1';dom.branch.value='ARS';dom.nodes.value='31';dom.tolerance.value='.000001';dom.data.value=JSON.stringify({H:input.H,s:input.s,referencePhase:input.referencePhase});
globalThis.document={getElementById:id=>dom[id]};const lifecycle={};globalThis.addEventListener=(name,fn)=>{lifecycle[name]=fn;};
const workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(m){this.message=m;}terminate(){this.terminated=true;}};
await import('../lesson.mjs');
function finish(w){w.onmessage({data:{type:'result',runId:w.message.runId,result:solve(w.message.input),elapsedMs:1}});}
dom.run.onclick();let w=workers.at(-1);finish(w);check(dom.nodeSelect.disabled,false);check(dom.antennaSelect.children.length,2);check(dom.nodeDetails.textContent.includes('节点 0'),true);
dom.nodeSelect.value='1';dom.antennaSelect.value='1';dom.nodeSelect.listeners.change();check(dom.nodeDetails.textContent.includes('节点 1'),true);check(dom.nodeDetails.textContent.includes('天线 2'),true);
dom.epsilon.value='0';dom.epsilon.listeners.input();check(dom.nodeSelect.disabled,true);check(dom.phaseDiagram.innerHTML,'');check(dom.nodeDetails.textContent,'');check(dom.download.disabled,true);
dom.run.onclick();w=workers.at(-1);dom.cancel.onclick();const stale=w;dom.run.onclick();w=workers.at(-1);finish(stale);check(dom.nodeSelect.disabled,true);finish(w);check(dom.nodeSelect.children.length,1);check(dom.phaseDiagram.innerHTML.includes(' A '),false);check(dom.nodeDetails.textContent.includes('宽度 0.000000'),true);
// Page departure invalidates running/completed records; BFCache restore permits a new run.
for(const completed of [false,true]){dom.run.onclick();const departed=workers.at(-1);if(completed)finish(departed);lifecycle.pagehide();check(departed.terminated,true);check(dom.run.disabled,false);check(dom.download.disabled,true);lifecycle.pageshow({persisted:true});check(dom.status.textContent,'页面已恢复，请重新运行');dom.run.onclick();const fresh=workers.at(-1);finish(departed);check(dom.download.disabled,true);finish(fresh);check(dom.download.disabled,false);}
// Invalid input leaves no stale diagram and no worker.
const count=workers.length;dom.data.value='invalid';dom.run.onclick();check(workers.length,count);check(dom.nodeSelect.disabled,true);check(dom.phaseDiagram.innerHTML,'');
const report={status:'PASS',assertions,hashes,coverage:['actual ledger fields for ARS/BRS, epsilon 0/.05/1/1.95/2','node/antenna selection with narrow DOM double','input invalidation, cancel, immediate rerun, stale worker result rejection','byte-identical core/worker'],notCovered:['actual browser rendering, accessibility tree, responsive screenshot review']};
fs.writeFileSync(output('DIAGRAM-TEST-RESULT.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
