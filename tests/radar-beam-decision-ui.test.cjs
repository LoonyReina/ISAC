'use strict';
// Mock DOM validates bindings, data and SVG coordinates, not a real browser layout.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../radar-beam-decision-core.js'),html=fs.readFileSync(require.resolve('../radar-beam-decision.html'),'utf8'),script=fs.readFileSync(require.resolve('../radar-beam-decision.js'),'utf8'),css=fs.readFileSync(require.resolve('../radar-beam-decision.css'),'utf8');
function setup(width=600,core=C){
 class E{constructor(id=''){this.id=id;this.children=[];this.attrs={};this.events={};this.clientWidth=width;this.value='';this.open=false;this.textContent='';this.disabled=false;}setAttribute(k,v){this.attrs[k]=String(v);}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}addEventListener(t,f){this.events[t]=f;}fire(t){a.ok(this.events[t],`${this.id} ${t}`);this.events[t]({target:this});}click(){downloads.push({href:this.href,name:this.download});}}
 const els={},events={},downloads=[],blobs=[],revoked=[];for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new E(id);
 for(const [id,value]of Object.entries({'rb-k':'1','rb-sample':'0','rb-seed':'37','rb-protocol':'held_trajectories','rb-control':'shifted'}))els[id].value=value;
 vm.runInNewContext(script,{window:{RadarBeamDecisionCore:core,addEventListener:(t,f)=>events[t]=f},document:{getElementById:id=>{a.ok(els[id],id);return els[id];},createElementNS:()=>new E(),createElement:()=>new E()},Blob:class{constructor(parts,options){this.parts=parts;this.options=options;blobs.push(this);}},URL:{createObjectURL:()=>'blob:test',revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>fn()});
 return {els,events,downloads,blobs,revoked};
}
const open=(els,id)=>{els[id].open=true;els[id].fire('toggle');},raw=els=>JSON.parse(els['rb-raw'].textContent),plain=x=>JSON.parse(JSON.stringify(x));
function expose(els){open(els,'rb-export');return raw(els);}
function bars(els){return els['rb-power'].children.filter(n=>'data-beam'in n.attrs);}

test('first view is one trained decision with64 genuine linear-power bars and collapsed research',()=>{
 let calls=0;const {els:e}=setup(323,{...C,run(...args){calls++;return C.run(...args);}});
 a.equal(calls,1);a.equal(bars(e).length,64);a.equal(bars(e).filter(x=>x.attrs['data-candidate']==='yes').length,1);a.equal(e['rb-comparison'].children.length,0);a.equal(e['rb-raw'].textContent,'');a.match(e['rb-current'].textContent,/保留整条轨迹/);a.match(e['rb-observed'].textContent,/方向读数/);a.equal(e['rb-sample'].children.length,64);
 const r=expose(e);a.equal(calls,1);a.equal(r.config.seed,37);a.equal(r.k,1);a.equal(r.training.length,512);a.equal(r.predictionInputs.length,64);a.equal(r.evaluationOnly.length,64);a.equal(r.frozenPredictions.length,64);a.equal(r.protocolComparisons.length,0);
 for(const row of r.predictionInputs)a.deepEqual(Object.keys(row),['id','x']);for(const row of r.training)a.deepEqual(Object.keys(row),['id','x','label']);a.match(r.rng,/not bit-identical/);
 a.deepEqual(bars(e).map(x=>Number(x.attrs['data-power'])),r.evaluationOnly[0].power);
});

test('K uses the same frozen nested ranking and K64 has loss0 with no saving',()=>{
 const {els:e}=setup();const initial=expose(e);for(const k of [1,2,3,5,8,16,32,64]){e['rb-k'].value=String(k);e['rb-k'].fire('input');const r=raw(e);a.deepEqual(r.frozenPredictions,initial.frozenPredictions);a.deepEqual(r.trainIds,initial.trainIds);a.deepEqual(r.metrics.perSample[0].candidates,initial.frozenPredictions[0].ranking.slice(0,k));a.equal(bars(e).filter(x=>x.attrs['data-candidate']==='yes').length,k);}
 const end=raw(e);a.equal(end.metrics.topKHitRate,1);a.equal(end.metrics.meanLossDb,0);a.equal(end.metrics.probeFraction,1);a.equal(e['rb-loss'].textContent,'0 dB');a.match(e['rb-conclusion'].textContent,/没有|回到了全部遍历/);a.equal(e['rb-cost'].textContent,'64 / 64');
 for(const [id,k]of [['rb-k-one',1],['rb-k-five',5],['rb-k-all',64]]){e[id].fire('click');a.equal(raw(e).k,k);}
});

test('sample selector changes only inspected sample, not training or aggregate evaluation',()=>{
 const {els:e}=setup();const initial=expose(e);for(const i of [1,15,31,63,0]){e['rb-sample'].value=String(i);e['rb-sample'].fire('change');const r=raw(e);a.equal(r.selectedTestIndex,i);a.deepEqual(r.metrics,initial.metrics);a.deepEqual(r.frozenPredictions,initial.frozenPredictions);a.deepEqual(bars(e).map(x=>Number(x.attrs['data-power'])),r.evaluationOnly[i].power);}
});

test('evaluation-only example search picks smallest-loss miss without changing predictions or batch',()=>{
 const {els:e}=setup();const initial=expose(e),expected=initial.metrics.perSample.map((x,i)=>({x,i})).filter(x=>!x.x.hit).sort((a,b)=>a.x.lossDb-b.x.lossDb||a.i-b.i)[0];a.ok(expected);
 e['rb-example'].fire('click');const r=raw(e);a.equal(r.selectedTestIndex,expected.i);a.equal(r.k,1);a.equal(r.metrics.perSample[r.selectedTestIndex].hit,false);a.deepEqual(r.frozenPredictions,initial.frozenPredictions);a.deepEqual(r.metrics,initial.metrics);a.match(e['rb-conclusion'].textContent,/按评估真值挑选的教学样本/);a.match(e['rb-conclusion'].textContent,/标签没猜中/);
});

test('no-miss fixture is reported rather than fabricating a ranked example',()=>{
 const fake={...C,metrics(run,k){const m=C.metrics(run,k);return {...m,perSample:m.perSample.map(x=>({...x,hit:true}))};}};
 const {els:e}=setup(600,fake);e['rb-example'].fire('click');a.match(e['rb-conclusion'].textContent,/没有错标签例子/);a.equal(e['rb-sample'].value,'0');
});

test('three protocol comparisons are computed lazily and share identical anchors and train budgets',()=>{
 let calls=0;const {els:e,events}=setup(600,{...C,run(...args){calls++;return C.run(...args);}});open(e,'rb-extension');a.equal(calls,3);a.equal(e['rb-comparison'].children.length,3);const initial=expose(e);
 for(const p of initial.protocolComparisons){a.equal(p.trainIds.length,512);a.deepEqual(p.testIds,initial.testIds);}
 for(const mode of C.MODES){e['rb-protocol'].value=mode;e['rb-protocol'].fire('change');a.equal(raw(e).mode,mode);a.deepEqual(raw(e).testIds,initial.testIds);}
 for(let i=0;i<3;i++){events.resize();e['rb-extension'].open=false;e['rb-extension'].fire('toggle');a.equal(e['rb-comparison'].children.length,0);open(e,'rb-extension');}a.equal(calls,3);
});

test('zero-shift and fully-neutral presets have different explicit feature contracts',()=>{
 const {els:e}=setup();open(e,'rb-extension');expose(e);e['rb-control'].value='zero-shift';e['rb-control'].fire('change');let r=raw(e);a.equal(r.config.sceneShift,0);a.equal(r.config.runShift,0);a.equal(r.config.contextWeight,.18);a.ok(r.predictionInputs.some(x=>x.x[1]!==0));a.match(e['rb-control-note'].textContent,/稳定环境特征仍存在/);
 e['rb-control'].value='neutral';e['rb-control'].fire('change');r=raw(e);a.equal(r.config.contextWeight,0);a.equal(r.config.noiseSd,.006);a.ok(r.predictionInputs.every(x=>x.x[1]===0&&x.x[2]===0));a.match(e['rb-control-note'].textContent,/相关噪声仍在/);
});

test('seed changes regenerate deterministically and reset restores the complete initial state',()=>{
 const {els:e}=setup();const initial=expose(e);open(e,'rb-extension');e['rb-seed'].value='49';e['rb-seed'].fire('change');const changed=raw(e);a.notDeepEqual(changed.predictionInputs,initial.predictionInputs);e['rb-k-five'].fire('click');e['rb-control'].value='neutral';e['rb-protocol'].value='held_scene';e['rb-sample'].value='33';e['rb-control'].fire('change');e['rb-reset'].fire('click');
 a.equal(e['rb-k'].value,'1');a.equal(e['rb-seed'].value,'37');a.equal(e['rb-protocol'].value,'held_trajectories');a.equal(e['rb-control'].value,'shifted');a.equal(e['rb-sample'].value,'0');for(const id of ['rb-batch','rb-extension','rb-export'])a.equal(e[id].open,false);a.deepEqual(expose(e),initial);
 e['rb-seed'].value='49';e['rb-seed'].fire('change');a.deepEqual(raw(e).predictionInputs,changed.predictionInputs);
});

test('invalid controls clear graph, aggregate, comparison and export, then reset recovers',()=>{
 const {els:e}=setup();const invalid=[['rb-seed',''],['rb-seed','NaN'],['rb-seed','-1'],['rb-seed','100000'],['rb-seed','1.5'],['rb-k','0'],['rb-k','65'],['rb-sample','64'],['rb-protocol','fake'],['rb-control','fake']];
 for(const [id,value]of invalid){open(e,'rb-extension');expose(e);e[id].value=value;e[id].fire(id==='rb-k'?'input':'change');a.equal(e['rb-power'].children.length,0);a.equal(e['rb-comparison'].children.length,0);for(const id of ['rb-current','rb-truth','rb-loss','rb-hit','rb-batch-result','rb-raw'])a.equal(e[id].textContent,'');a.equal(e['rb-download'].disabled,true);a.match(e['rb-status'].textContent,/旧图、结果和导出已清空/);e['rb-reset'].fire('click');a.equal(bars(e).length,64);a.equal(e['rb-download'].disabled,false);}
 for(const core of [null,{...C,run(){throw new Error('broken');}}]){const {els:x}=setup(323,core);a.equal(x['rb-power'].children.length,0);a.equal(x['rb-raw'].textContent,'');a.equal(x['rb-download'].disabled,true);a.match(x['rb-status'].textContent,/重置/);}
});

test('uncapped exact-zero loss renders Infinity, exports a string, and keeps chart coordinates finite',()=>{
 const fake={...C,run(...args){const r=C.run(...args),row=r.dataset.rows[r.test[0]],j=r.predictions[0].ranking[0];row.power=Array(64).fill(1);row.power[j]=0;row.label=j===0?1:0;return r;}};
 const {els:e}=setup(323,fake);const r=expose(e);a.equal(e['rb-loss'].textContent,'+∞ dB');a.equal(r.metrics.meanLossDb,'Infinity');a.equal(r.metrics.perSample[0].lossDb,'Infinity');a.match(e['rb-batch-result'].textContent,/\+∞ dB/);a.equal(r.metrics.lossAboveThresholdRate>=1/64,true);for(const n of e['rb-power'].children)for(const v of Object.values(n.attrs))a.doesNotMatch(v,/NaN|Infinity/);
});

test('all SVG coordinates fit the measured width, including323px and narrow inner plots',()=>{
 for(const width of [220,259,291,323,375,600,1000]){const {els:e}=setup(width);for(const k of [1,5,64]){e['rb-k'].value=String(k);e['rb-k'].fire('input');a.match(e['rb-power'].attrs.viewBox,new RegExp(`^0 0 ${width} `));for(const n of e['rb-power'].children)for(const [key,value]of Object.entries(n.attrs)){a.doesNotMatch(value,/NaN|Infinity/);if(['x','cx','x1','x2'].includes(key))a.ok(Number(value)>=0&&Number(value)<=width,`${width}: ${key}=${value}`);if(['y','cy','y1','y2'].includes(key))a.ok(Number(value)>=0&&Number(value)<=300);}}
 }
});

test('download contains current scientific record with config, memberships and definitions',()=>{
 const {els:e,downloads,blobs,revoked}=setup();open(e,'rb-extension');e['rb-k-five'].fire('click');const r=expose(e);e['rb-download'].fire('click');a.equal(downloads.length,1);a.match(downloads[0].name,/seed-37-held_trajectories-K5\.json$/);a.equal(blobs[0].options.type,'application/json;charset=utf-8');a.deepEqual(JSON.parse(blobs[0].parts[0]),r);a.deepEqual(revoked,['blob:test']);a.match(r.metricDefinitions.lossDb,/no floor/);a.match(r.metricDefinitions.threshold,/not a communication outage/);a.match(r.assumptions.testAnchors,/not an untouched benchmark/);
});

test('native keyboard controls, truth labels, linear axes and version boundaries remain explicit',()=>{
 for(const id of ['rb-k','rb-sample','rb-protocol','rb-seed','rb-control'])a.ok(html.includes(`for="${id}"`));a.match(html,/<noscript>/);a.match(html,/<pre id="rb-raw" tabindex="0" role="region"/);a.match(html,/<svg id="rb-power" role="img"/);a.ok(!/<details[^>]*\bopen(?:\s|>)/.test(html));a.ok(!/requestAnimationFrame|setInterval|fetch\(/.test(script));a.match(css,/:focus-visible/);a.match(css,/@media\(max-width:680px\)/);a.match(css,/min-height:44px/);
 for(const phrase of ['波束编号，不是角度','线性 0–1','按评估真值挑选的教学样本','人为携带组别线索','也去掉环境特征','未被查看过的最终测试基准','70/20/10','70/30','Mulberry32 / Box–Muller','+∞ dB','没有下载 DeepSense'])a.ok(html.includes(phrase),phrase);
});
