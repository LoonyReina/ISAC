'use strict';
// VM lifecycle harness is a regression gate, not a browser acceptance claim.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../../..');
function harness({deferFetch=false,corrupt=false}={}){let resolveFetch;
 const elements=new Map(),events={},context2d=new Proxy({},{get:()=>()=>{}});
 const element=id=>{if(!elements.has(id))elements.set(id,{value:({trial:'0',gamma:'12',start:'0',cap:'1'})[id.replace('ssp-','')]||'',disabled:false,textContent:'',children:[],listeners:{},add(){},addEventListener(t,fn){this.listeners[t]=fn},replaceChildren(...x){this.children=x},getContext(){return context2d},append(){},createTHead(){return this},createTBody(){return this},insertRow(){return this},insertCell(){return {}},click(){return this.onclick?.()}});return elements.get(id)};
 const source=fs.readFileSync(path.join(root,'labs/joint-beamforming/ssp/ssp-ui.mjs'),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('import.meta.url',"'https://example.test/joint-beamforming/ssp/ssp-ui.mjs'");
 const data=JSON.parse(fs.readFileSync(path.join(root,'labs/joint-beamforming/ssp/ssp-data.json')));
 const context={document:{getElementById:element,createElement:tag=>element('new-'+tag)},Option:function(){},window:{addEventListener:(k,v)=>events[k]=v},fetch:()=>{const response={ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(path.join(root,'labs/joint-beamforming/ssp/ssp-data.json'));if(corrupt)b[10]^=1;return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};return deferFetch?new Promise(r=>resolveFetch=()=>r(response)):Promise.resolve(response)},crypto:require('node:crypto').webcrypto,TextDecoder,AbortController,URL,Blob,performance,console,setTimeout,unpack:x=>x,pack:x=>x,physical:()=>({min_sinr_db:1,sinr_target_pass:false,power:1,per_antenna_max_error:0,eq46_mse:1,angles:[0,1],pattern:[1,2],target_pattern:[1,2]}),solveSteps:function*(){yield {iteration:1,objective:2};return {W:[],status:'capped',iterations:1,tangent_gradient_fro:1,backtracks:0,history:[{iteration:0,objective:2},{iteration:1,objective:1}],objective:1,covariance_loss:1,penalty:0}}};
 return {ready:vm.runInNewContext('(async()=>{'+source+'})()',context),element,events,release:()=>resolveFetch()};
}
test('SSP pagehide and input replacement clear export and stale completion',async()=>{
 const h=harness();await h.ready;const run=h.element('ssp-run').onclick();h.events.pagehide();await run;a.equal(h.element('ssp-export').disabled,true);a.equal(h.element('ssp-results').children.length,0);
 await h.element('ssp-run').onclick();a.equal(h.element('ssp-export').disabled,true);const fresh=harness();await fresh.ready;await fresh.element('ssp-run').onclick();a.equal(fresh.element('ssp-export').disabled,false);fresh.element('ssp-cap').listeners.input();a.equal(fresh.element('ssp-export').disabled,true);
});
test('SSP malformed replay invalidates prior result before parsing',async()=>{
 const h=harness();await h.ready;await h.element('ssp-run').onclick();a.equal(h.element('ssp-export').disabled,false);
 await h.element('ssp-import').onchange({target:{files:[{size:4,text:async()=> 'null'}]}});a.equal(h.element('ssp-export').disabled,true);a.equal(h.element('ssp-results').children.length,0);a.match(h.element('ssp-status').textContent,/导入失败/);
});
test('SSP delayed import cannot override newer input or resume after pagehide',async()=>{
 const h=harness();await h.ready;let release;
 const pending=h.element('ssp-import').onchange({target:{files:[{size:100,text:()=>new Promise(r=>release=r)}]}});
 h.element('ssp-cap').value='7';h.element('ssp-cap').listeners.input();release(JSON.stringify({schema:'isac-ssp-run-v1',config:{trial:0,gammaDb:12,start:0,maxIterations:1}}));await pending;
 a.equal(h.element('ssp-cap').value,'7');a.equal(h.element('ssp-export').disabled,true);a.equal(h.element('ssp-results').children.length,0);
});
test('SSP stale rejected import cannot overwrite newer status or file input',async()=>{
 for(const action of ['input','pagehide','run']){
  const h=harness();await h.ready;let reject;
  const pending=h.element('ssp-import').onchange({target:{files:[{size:100,text:()=>new Promise((_,r)=>reject=r)}]}});
  if(action==='input')h.element('ssp-cap').listeners.input();
  if(action==='pagehide')h.events.pagehide();
  if(action==='run')await h.element('ssp-run').onclick();
  h.element('ssp-import').value='newer-file.json';const status=h.element('ssp-status').textContent;
  reject(Error('stale read failure'));await pending;
  a.equal(h.element('ssp-status').textContent,status,action);a.equal(h.element('ssp-import').value,'newer-file.json',action);
 }
});
test('SSP successful replay resets file input for repeated same-file selection',async()=>{
 const h=harness();await h.ready;const archive=JSON.parse(fs.readFileSync(path.join(root,'labs/joint-beamforming/ssp/ssp-data.json'))).archive_sha256;
 h.element('ssp-import').value='same-file.json';
 await h.element('ssp-import').onchange({target:{files:[{size:100,text:async()=>JSON.stringify({schema:'isac-ssp-run-v1',archive_sha256:archive,config:{trial:0,gammaDb:12,start:0,maxIterations:1}})}]}});
 a.equal(h.element('ssp-import').value,'');h.events.pagehide();
});

test('SSP pagehide during fetch blocks late enable and run',async()=>{const h=harness({deferFetch:true});h.events.pagehide();h.release();await h.ready;await h.element('ssp-run').onclick();a.equal(h.element('ssp-run').disabled,true);a.equal(h.element('ssp-export').disabled,true);a.match(h.element('ssp-status').textContent,/页面已停止/);});
test('SSP corrupt NEW evidence fails closed',async()=>{const h=harness({corrupt:true});await h.ready;a.equal(h.element('ssp-run').disabled,true);a.equal(h.element('ssp-export').disabled,true);a.match(h.element('ssp-status').textContent,/校验失败/);});
