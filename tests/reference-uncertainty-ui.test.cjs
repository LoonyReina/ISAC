'use strict';
// Actual numerical core in a simulated DOM; not a browser-layout certification.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),html=read('reference-uncertainty.html'),css=read('reference-uncertainty.css'),script=read('reference-uncertainty.js');
const normal=x=>JSON.parse(JSON.stringify(x));
function setup({width=760,missing=false,missingRecord=false,missingSerializer=false,missingShell=false,override='',exportOverride=''}={}){
 class E{
  constructor(id=''){this.id=id;this.children=[];this.attrs={};this.events={};this.clientWidth=width;this.value='';this.open=false;this.hidden=false;this.disabled=false;this.checked=false;this._text='';this.className='';}
  set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(_){throw new Error('unsafe HTML sink');}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;this._text='';}addEventListener(t,f){(this.events[t]??=[]).push(f);}
  fire(t,extra={}){a.ok(this.events[t],this.id+'/'+t);for(const f of this.events[t])f({target:this,...extra});}
  getBoundingClientRect(){return {left:0,width:this.clientWidth,height:330};}
 }
 const els={},events={},blobs=[],downloads=[],urls=[],revoked=[],timers=[],fault={};for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new E(id);els['ru-results'].hidden=true;
 const trap=()=>{throw new Error('Forbidden side effect');};
 const context=vm.createContext({document:{getElementById:id=>{a.ok(els[id],id);return els[id];},body:{append(){}},createElement:tag=>{const e=new E();if(tag==='a'){e.click=()=>{if(fault.click)throw Error('blocked click');downloads.push({href:e.href,name:e.download});};e.remove=()=>{};}return e;},createElementNS:()=>new E()},addEventListener:(t,f)=>(events[t]??=[]).push(f),fetch:trap,setInterval:trap,requestAnimationFrame:trap,Blob:class{constructor(parts,options){if(fault.blob)throw Error('blocked Blob');this.parts=parts;this.options=options;blobs.push(this);}},URL:{createObjectURL(){if(fault.url)throw Error('blocked URL');const u='blob:reference-'+urls.length;urls.push(u);return u;},revokeObjectURL:u=>revoked.push(u)},setTimeout:fn=>timers.push(fn),sessionStorage:new Proxy({},{get:trap}),indexedDB:new Proxy({},{get:trap}),localStorage:new Proxy({},{get:trap})});
 vm.runInContext('window=globalThis;',context);
 if(!missing){vm.runInContext(read('offgrid-range-core.js'),context);vm.runInContext(read('reference-uncertainty-core.js'),context);vm.runInContext(`const realCore=ReferenceUncertaintyCore;globalThis.calls={generate:[],receive:[],candidate:[]};globalThis.failReceive=false;ReferenceUncertaintyCore={...realCore,generate(o){const result=realCore.generate(o);calls.generate.push({options:o,result});return result;},receive(input){calls.receive.push(input);if(failReceive)throw new Error('intentional numerical failure');return realCore.receive(input);},candidateAt(input,index){const result=realCore.candidateAt(input,index);calls.candidate.push({input,index,result});return result;}};`,context);if(override)vm.runInContext(override,context);}
 if(!missing&&!missingRecord){if(!missingSerializer)vm.runInContext(read('reference-uncertainty-record.js'),context);if(!missingShell)vm.runInContext(read('experiment-record.js'),context);if(exportOverride)vm.runInContext(exportOverride,context);}
 vm.runInContext(script,context);
 return {els,context,events,blobs,downloads,urls,revoked,timers,fault,change(id,value,type='change'){els[id].value=String(value);els[id].fire(type);},click(id){els[id].fire('click');},resize(){for(const f of events.resize||[])f();},run(code){return vm.runInContext(code,context);}};
}
const near=(x,y,t=1e-10)=>a.ok(Number.isFinite(x)&&Math.abs(x-y)<=t,`${x} != ${y}`),series=(s,b)=>s.els['ru-curves'].children.find(e=>e.attrs['data-series']===b),points=e=>e.attrs.points.split(' ').map(p=>p.split(',').map(Number));
function apply(s,name){s.els['ru-preset'].value=name;s.click('ru-apply-preset');}
function reveal(s){s.click('ru-reveal');a.equal(s.els['ru-results'].hidden,false,s.els['ru-status'].textContent);}
function observation(s){return normal(s.context.calls.generate.at(-1).result.observation);}
function recentInputs(s){return normal(s.context.calls.receive.slice(-3));}

test('prediction precedes reveal; default has no plots or generation until explicit action',()=>{
 const s=setup();a.equal(s.els['ru-results'].hidden,true);a.equal(s.els['ru-awaiting'].hidden,false);a.equal(s.els['ru-curves'].children.length,0);a.equal(s.context.calls.generate.length,0);a.equal(s.els['ru-reveal'].disabled,false);
 a.ok(html.indexOf('id="experiment"')<html.indexOf('id="ru-prediction"'));a.ok(html.indexOf('id="ru-prediction"')<html.indexOf('id="ru-results"'));
 s.els['ru-prediction'].value='discard';reveal(s);a.match(s.els['ru-prediction-note'].textContent,/只用真导频/);a.equal(s.context.calls.generate.length,1);a.equal(s.els['ru-phasor-details'].open,false);a.equal(s.els['ru-symbol-details'].open,false);a.equal(s.els['ru-awaiting'].hidden,true);
 a.deepEqual(recentInputs(s).map(i=>i.ySelected.length),[16,4,16]);a.ok(s.els['ru-budget-cards'].textContent.includes('9600'));a.ok(s.els['ru-budget-cards'].textContent.includes('2400'));
});
test('all 1800 curve samples come from real scores on a shared linear Q axis with every peak marked',()=>{
 const s=setup({width:300});reveal(s);const r=s.run('calls.receive.slice(-3).map(i=>realCore.receive(i))'),ymax=Number(s.els['ru-curves'].attrs['data-y-max']);
 for(const [b,i]of [['oracle',0],['pilot',1],['stress',2]]){const ps=points(series(s,b));a.equal(ps.length,600);for(let j=0;j<600;j++){near(ps[j][0],48+(300-62)*(j/4)/150);near(ps[j][1],288-264*r[i].scores[j]/ymax);}a.equal(s.els['ru-curves'].children.filter(e=>e.attrs['data-tie']===b).length,r[i].tieCount);}
 a.equal(series(s,'oracle').attrs.points,series(s,'stress').attrs.points);a.equal(s.els['ru-curves'].attrs.viewBox,'0 0 300 330');a.equal(s.els['ru-curves'].attrs.preserveAspectRatio,'xMidYMid meet');
});
test('reference controls and candidate inspection preserve the identical physical observation and oracle/pilot inputs',()=>{
 const s=setup();reveal(s);const y=observation(s),base=recentInputs(s),draws=s.context.calls.generate.length;
 for(let h=0;h<=12;h++){s.change('ru-error-count',h,'input');a.deepEqual(observation(s),y);const next=recentInputs(s);a.deepEqual(next[0],base[0]);a.deepEqual(next[1],base[1]);a.equal(s.context.calls.generate.length,draws);}
 s.click('ru-reference-seed');a.deepEqual(observation(s),y);a.equal(s.context.calls.generate.length,draws);
 const scans=s.context.calls.receive.length;s.change('ru-candidate',250,'input');s.change('ru-branch','pilot');s.els['ru-show-truth'].checked=false;s.els['ru-show-truth'].fire('change');s.resize();a.equal(s.context.calls.generate.length,draws);a.equal(s.context.calls.receive.length,scans);a.deepEqual(observation(s),y);
});
test('physics changes and explicit noise changes produce reproducible observations while reference seeds are separate',()=>{
 const s=setup();apply(s,'noisy');reveal(s);const old=observation(s);s.click('ru-reference-seed');a.deepEqual(observation(s),old);s.click('ru-noise');a.notDeepEqual(observation(s),old);a.equal(s.context.calls.generate.at(-1).options.noiseSeed,2027);
 s.change('ru-range',120);a.equal(s.context.calls.generate.at(-1).options.truthRangeM,120);s.change('ru-snr',20);a.equal(s.context.calls.generate.at(-1).options.noiseSeed,2027);a.match(s.els['ru-observation-id'].textContent,/R=120 m.*20 dB.*2027/);
 s.click('ru-reset');apply(s,'noisy');reveal(s);a.deepEqual(observation(s),old);
});
test('same-count structured modes change only references and reproduce analytic values including modulo150',()=>{
 const s=setup();apply(s,'structure');reveal(s);const y=observation(s),draws=s.context.calls.generate.length;near(Number(s.els['ru-phasors'].attrs['data-q']),.625);a.equal(s.els['ru-error-count'].disabled,true);a.equal(s.els['ru-reference-seed'].disabled,true);
 s.change('ru-mode','ramp');a.deepEqual(observation(s),y);a.equal(s.context.calls.generate.length,draws);near(Number(s.els['ru-phasors'].attrs['data-q']),0);a.match(s.els['ru-phasor-value'].textContent,/未定义/);
 s.change('ru-candidate',250,'input');near(Number(s.els['ru-phasors'].attrs['data-q']),1);a.match(s.els['ru-estimates'].textContent,/62.5 m/);a.match(s.els['ru-structure-note'].textContent,/mod 150 = 62.5 m/);
 s.change('ru-range',120);a.match(s.els['ru-structure-note'].textContent,/mod 150 = 7.5 m/);const last=s.run('realCore.receive(calls.receive.at(-1))');a.deepEqual(normal(last.tiedCandidatesM),[7.5]);
 s.change('ru-pilots','irregular');a.equal(s.els['ru-mode'].value,'random');a.equal(s.els['ru-mode-ramp'].disabled,true);a.match(s.els['ru-status'].textContent,/已切回逐个注入/);
});
test('comb ambiguity and all-zero ties are fully listed without truth-based choice or success claims',()=>{
 const s=setup();apply(s,'aliases');reveal(s);const texts=s.els['ru-estimates'].children.map(e=>e.textContent);a.match(texts[1],/歧义未解决：4/);a.match(texts[1],/25、62.5、100、137.5/);
 const z=setup({override:'ReferenceUncertaintyCore.generate=o=>{const r=realCore.generate(o);r.observation=r.observation.map(()=>[0,0]);calls.generate.push({options:o,result:r});return r;};'});reveal(z);a.equal(z.els['ru-curves'].children.filter(e=>e.attrs['data-tie']).length,1800);a.ok(z.els['ru-estimates'].children.every(e=>/歧义未解决：600/.test(e.textContent)));a.match(z.els['ru-estimates'].textContent,/149.75/);a.match(z.els['ru-estimates'].textContent,/全零匹配不提供距离信息/);a.match(z.els['ru-phasor-value'].textContent,/未定义/);
});
test('phasor arrows, coherent path and equal axis scale are bound to the selected candidate and branch',()=>{
 const s=setup({width:920});apply(s,'structure');reveal(s);s.change('ru-candidate',133,'input');
 for(const branch of ['oracle','pilot','stress']){s.change('ru-branch',branch);const v=s.context.calls.candidate.at(-1).result,svg=s.els['ru-phasors'],scale=Number(svg.attrs['data-scale']),arrows=svg.children.filter(e=>e.attrs['data-contribution']!==undefined);a.equal(svg.attrs['data-candidate-m'],'33.25');a.equal(arrows.length,branch==='pilot'?4:16);
  for(let i=0;i<arrows.length;i++){const attrs=arrows[i].attrs;near(Number(attrs.x2)-Number(attrs.x1),v.contributions[i][0]*scale);near(Number(attrs.y2)-Number(attrs.y1),-v.contributions[i][1]*scale);}
  const total=svg.children.find(e=>e.attrs['data-resultant']);near(Number(total.attrs['data-real']),v.fittedGain[0]);near(Number(total.attrs['data-imag']),v.fittedGain[1]);near(Number(svg.attrs['data-q']),v.fittedGain[0]**2+v.fittedGain[1]**2);a.equal(s.els['ru-contributions'].children.length,v.sampleCount);
 }
});
test('injection markers are withheld until explicitly revealed and pilot cells stay true',()=>{
 const s=setup();apply(s,'structure');reveal(s);a.equal(s.els['ru-symbols'].children.length,16);a.doesNotMatch(s.els['ru-symbols'].textContent,/注入错误/);a.match(s.els['ru-symbols'].textContent,/未知 · 未使用/);
 const draws=s.context.calls.generate.length;s.els['ru-show-errors'].checked=true;s.els['ru-show-errors'].fire('change');a.equal(s.els['ru-symbols'].children.filter(r=>r.children[3].className==='ru-symbol-error').length,12);for(const k of [0,4,8,12])a.equal(s.els['ru-symbols'].children[k].children[1].textContent,s.els['ru-symbols'].children[k].children[3].textContent);a.equal(s.context.calls.generate.length,draws);
});
test('errors after success clear stale plots/results and a valid correction recovers cleanly',()=>{
 const s=setup();reveal(s);s.run('failReceive=true');s.change('ru-error-count',1,'input');a.equal(s.els['ru-results'].hidden,true);a.match(s.els['ru-status'].textContent,/失败.*清除旧结果/);for(const id of ['ru-curves','ru-phasors','ru-estimates','ru-budget-cards','ru-symbols','ru-contributions'])a.equal(s.els[id].children.length,0);
 s.run('failReceive=false');s.change('ru-error-count',0,'input');a.equal(s.els['ru-results'].hidden,false);a.equal(points(series(s,'oracle')).length,600);
 for(const [id,value,type]of [['ru-range','','change'],['ru-range',121,'change'],['ru-snr','unknown','change'],['ru-error-count',1.5,'input'],['ru-candidate',600,'input'],['ru-branch','unknown','change']]){s.click('ru-reset');reveal(s);s.change(id,value,type);a.equal(s.els['ru-results'].hidden,true,id);a.equal(s.els['ru-curves'].children.length,0,id);a.match(s.els['ru-status'].textContent,/失败/);}
});
test('reset restores unrevealed defaults and repeated reveal/candidate actions do not create random redraws',()=>{
 const s=setup();apply(s,'structure');reveal(s);s.els['ru-phasor-details'].open=true;s.els['ru-symbol-details'].open=true;s.els['ru-show-errors'].checked=true;
 for(let n=0;n<3;n++){s.click('ru-reset');a.equal(s.els['ru-results'].hidden,true);a.equal(s.els['ru-phasor-details'].open,false);a.equal(s.els['ru-symbol-details'].open,false);a.equal(s.els['ru-show-errors'].checked,false);a.equal(s.els['ru-range'].value,'43.7');a.equal(s.els['ru-mode'].value,'random');a.equal(s.els['ru-error-count'].value,'0');}
 reveal(s);const draws=s.context.calls.generate.length;reveal(s);reveal(s);a.equal(s.context.calls.generate.length,draws);
 s.els['ru-curves'].fire('click',{clientX:48+(760-62)*62.5/150});a.equal(s.els['ru-candidate'].value,'250');a.match(s.els['ru-candidate-value'].textContent,/62.5 m/);s.resize();a.equal(s.context.calls.generate.length,draws);
});
test('missing numerical bundle leaves disabled computation and readable static model/source fallback',()=>{
 const s=setup({missing:true});for(const id of ['ru-reveal','ru-physics','ru-reference-controls','ru-presets'])a.equal(s.els[id].disabled,true);a.equal(s.els['ru-results'].hidden,true);a.match(s.els['ru-status'].textContent,/未能加载/);a.ok(html.includes('<noscript>'));a.ok(html.includes('id="model"'));a.ok(html.includes('id="sources"'));
});
test('controls, plots and source boundaries are accessible and use no remote or automatic actions',()=>{
 for(const id of ['ru-prediction','ru-range','ru-snr','ru-pilots','ru-mode','ru-error-count','ru-preset','ru-candidate','ru-branch'])a.ok(html.includes('for="'+id+'"'),id);
 for(const id of ['ru-curves','ru-phasors'])a.ok(html.includes('id="'+id+'" role="img" aria-labelledby="'+id+'-caption"'));
 for(const term of ['有用格归一化能量','总突发归一化能量为 2','不是本次实测地板','两轴等比例','测试器真值','不是算法排行榜','(R₀+37.5 m) 对 150 m 取模','两端是不同观测'])a.ok((html+script).includes(term),term);
 a.match(css,/:focus-visible/);a.match(css,/@media\(max-width:850px\)/);a.match(css,/min-height:44px/);a.doesNotMatch(script,/innerHTML|fetch\(|Math\.random|setInterval|requestAnimationFrame|\.focus\(|localStorage|sessionStorage|history\.|scrollIntoView/);
});

function downloaded(s){s.click('ru-record-download');a.ok(s.downloads.length,'download was requested');return JSON.parse(s.blobs.at(-1).parts[0]);}
test('computed export stays disabled before reveal and downloads actual full arrays without rerunning the model',()=>{
 const s=setup();a.equal(s.els['ru-record-download'].disabled,true);s.click('ru-record-download');a.equal(s.blobs.length,0);
 reveal(s);const calls=normal(s.context.calls),r=downloaded(s);a.equal(s.els['ru-record-download'].disabled,false);
 a.equal(r.kind,'computed-mechanism-record');a.equal(r.schema,'reference-uncertainty-record-v1');a.deepEqual(r.observation,observation(s));
 for(const [i,b]of ['oracle','pilot','stress'].entries()){const input=recentInputs(s)[i],expected=s.run('realCore.receive(calls.receive.slice(-3)['+i+'])');a.deepEqual(r.receiverInputs[b].referenceSelected,input.referenceSelected);a.deepEqual(r.branchResults[b].scores,normal(expected.scores));a.equal(r.branchResults[b].scores.length,600);a.deepEqual(r.branchResults[b].tiedIndices,normal(expected.tiedIndices));}
 a.deepEqual(r.selectedInspection.value,normal(s.context.calls.candidate.at(-1).result));a.deepEqual(normal(s.context.calls),calls,'download never invokes core calculations');
 a.equal(r.provenance.sourceRevision,null);a.equal(r.provenance.monteCarlo,false);a.equal(r.provenance.paperReproduction,false);a.equal(r.provenance.observationCount,1);
 a.match(s.els['ru-record-status'].textContent,/已请求浏览器下载/);a.doesNotMatch(s.els['ru-record-status'].textContent,/已保存/);
 s.els['ru-record-details'].open=true;s.els['ru-record-details'].fire('toggle');const p=JSON.parse(s.els['ru-record-preview'].textContent);a.equal(p.previewInfo.completeRecord,false);a.ok(s.els['ru-record-preview'].textContent.length<=12000);a.notDeepEqual(p,r);
});
test('uncommitted physical inputs invalidate immediately and selection, marker or resize cannot revive an old record',()=>{
 const s=setup();reveal(s);downloaded(s);const count=s.blobs.length,draws=s.context.calls.generate.length;
 s.change('ru-range',25,'input');a.equal(s.els['ru-record-download'].disabled,true);a.match(s.els['ru-record-status'].textContent,/尚未提交/);s.click('ru-record-download');a.equal(s.blobs.length,count);
 s.change('ru-candidate',100,'input');s.els['ru-show-truth'].checked=false;s.els['ru-show-truth'].fire('change');s.els['ru-show-errors'].checked=true;s.els['ru-show-errors'].fire('change');s.resize();s.click('ru-record-download');a.equal(s.blobs.length,count);a.equal(s.context.calls.generate.length,draws);
 s.change('ru-range',25);const r=downloaded(s);a.equal(r.generatorConfig.truthRangeM,25);a.equal(r.selectedInspection.value.candidateM,25);a.equal(r.selectedInspection.truthMarkerShown,false);a.equal(r.selectedInspection.injectionMarksShown,true);
 // Returning to the old value through input still requires a committed calculation.
 s.change('ru-range',43.7,'input');s.change('ru-range',25,'input');s.change('ru-branch','pilot');a.equal(s.els['ru-record-download'].disabled,true);
});
test('the click guard runs before the Blob shell even when programmatic edits dispatch no input event',()=>{
 for(const [id,value]of [['ru-range','999'],['ru-snr','20'],['ru-pilots','comb'],['ru-mode','ramp'],['ru-error-count','3'],['ru-candidate','1'],['ru-branch','oracle']]){
  const s=setup();reveal(s);s.els[id].value=value;s.click('ru-record-download');a.equal(s.blobs.length,0,id);a.equal(s.els['ru-record-download'].disabled,true,id);
 }
 for(const id of ['ru-show-truth','ru-show-errors']){const s=setup();reveal(s);s.els[id].checked=!s.els[id].checked;s.click('ru-record-download');a.equal(s.blobs.length,0,id);}
});
test('selection and reference changes update only their actual snapshot; resize and unrelated draft controls preserve bytes',()=>{
 const s=setup();apply(s,'noisy');reveal(s);const first=downloaded(s),text=s.blobs.at(-1).parts[0],y=first.observation,draws=s.context.calls.generate.length;
 s.resize();s.els['ru-prediction'].value='discard';s.els['ru-preset'].value='structure';downloaded(s);a.equal(s.blobs.at(-1).parts[0],text);
 s.change('ru-candidate',250,'input');s.change('ru-branch','pilot');s.els['ru-show-truth'].checked=false;s.els['ru-show-truth'].fire('change');const next=downloaded(s);a.deepEqual(next.observation,y);a.equal(next.selectedInspection.branch,'pilot');a.equal(next.selectedInspection.value.candidateM,62.5);a.equal(next.selectedInspection.truthMarkerShown,false);a.equal(s.context.calls.generate.length,draws);
 a.deepEqual(next.evaluationTruth,first.evaluationTruth);a.deepEqual(next.branchResults,first.branchResults);
 s.click('ru-reference-seed');const reference=downloaded(s);a.deepEqual(reference.observation,y);a.equal(reference.referenceConfig.referenceSeed,2027);a.equal(s.context.calls.generate.length,draws);
 s.click('ru-noise');const noise=downloaded(s);a.notDeepEqual(noise.observation,y);a.equal(noise.generatorConfig.noiseSeed,2027);
});
test('all ties and structured metadata survive local download, including the wrapped ramp distance',()=>{
 const s=setup();apply(s,'aliases');reveal(s);let r=downloaded(s);a.deepEqual(r.branchResults.pilot.tiedCandidatesM,[25,62.5,100,137.5]);
 apply(s,'structure');s.change('ru-mode','ramp');s.change('ru-range',120);r=downloaded(s);a.deepEqual(r.branchResults.stress.tiedCandidatesM,[7.5]);a.equal(r.referenceConfig.referenceSeedAffectsSymbols,false);a.equal(r.referenceConfig.stressMetadata.errorIndices.length,12);
 const z=setup({override:'ReferenceUncertaintyCore.generate=o=>{const r=realCore.generate(o);r.observation=r.observation.map(()=>[0,0]);calls.generate.push({options:o,result:r});return r;};'});reveal(z);const zero=downloaded(z);for(const b of ['oracle','pilot','stress']){a.equal(zero.branchResults[b].tieCount,600);a.equal(zero.branchResults[b].tiedIndices.length,600);a.equal(zero.branchResults[b].tiedCandidatesM.at(-1),149.75);}
});
test('reset, numerical failure and serialization failure clear previously downloadable content',()=>{
 const s=setup({exportOverride:'const goodRecord=ReferenceUncertaintyRecord;globalThis.failRecord=false;ReferenceUncertaintyRecord={...goodRecord,makeRecord(...args){if(failRecord)throw Error("intentional record failure");return goodRecord.makeRecord(...args);}};'});reveal(s);downloaded(s);s.els['ru-record-details'].open=true;s.els['ru-record-details'].fire('toggle');s.run('failRecord=true');s.change('ru-candidate',200,'input');a.equal(s.els['ru-record-download'].disabled,true);a.equal(s.els['ru-record-preview'].textContent,'');const n=s.blobs.length;s.click('ru-record-download');a.equal(s.blobs.length,n);
 s.run('failRecord=false');reveal(s);downloaded(s);s.run('failReceive=true');s.change('ru-range',25);a.equal(s.els['ru-record-download'].disabled,true);s.click('ru-record-download');a.equal(s.blobs.length,n+1);
 s.run('failReceive=false');reveal(s);downloaded(s);s.click('ru-reset');a.equal(s.els['ru-record-download'].disabled,true);a.equal(s.els['ru-record-details'].open,false);a.equal(s.els['ru-record-preview'].textContent,'');s.click('ru-record-download');a.equal(s.blobs.length,n+2);
});
test('download failures preserve computed plots, make no saved claim, and revoke temporary URLs',()=>{
 for(const kind of ['blob','url','click']){const s=setup();reveal(s);const curve=series(s,'oracle').attrs.points;s.fault[kind]=true;s.click('ru-record-download');a.equal(s.downloads.length,0);a.equal(s.els['ru-results'].hidden,false);a.equal(series(s,'oracle').attrs.points,curve);a.match(s.els['ru-record-status'].textContent,/未能启动/);delete s.fault[kind];downloaded(s);s.click('ru-reset');a.deepEqual(s.revoked,s.urls);}
});
test('missing export bundle keeps actual computation readable with no downloadable or automatic-storage fallback',()=>{
 const s=setup({missingRecord:true});reveal(s);a.equal(s.els['ru-record-download'].disabled,true);a.match(s.els['ru-record-status'].textContent,/导出组件未能加载/);a.ok(series(s,'oracle'));s.click('ru-record-download');a.equal(s.blobs.length,0);
 const missing=setup({missing:true});a.equal(missing.els['ru-record-download'].disabled,true);missing.click('ru-record-download');a.equal(missing.blobs.length,0);
 for(const token of ['reference-uncertainty-record.js?v=reference-record-v1','experiment-record.js?v=record-preview-v1','reference-uncertainty.js?v=reference-record-v1','reference-uncertainty.css?v=reference-record-v1','文件始终包含教学真值','不是物理采集时间','限长预览','手动填写证据文件位置'])a.ok(html.includes(token),token);
 a.ok(html.indexOf('reference-uncertainty-core.js')<html.indexOf('reference-uncertainty-record.js'));a.ok(html.indexOf('experiment-record.js')<html.indexOf('reference-uncertainty.js?v='));
 a.doesNotMatch(script,/LearnerNotebook|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|postMessage/);
});


test('missing individual export dependencies keep calculations readable and serialized-update failures cannot retain old text',()=>{
 for(const absent of [{missingSerializer:true},{missingShell:true}]){const s=setup(absent);reveal(s);a.equal(s.els['ru-record-download'].disabled,true);s.click('ru-record-download');a.equal(s.blobs.length,0);a.ok(series(s,'oracle'));}
 const s=setup({exportOverride:'const realShell=ExperimentRecord;globalThis.failSerialization=false;ExperimentRecord={...realShell,create(config){const r=realShell.create(config);return {...r,update(...args){if(failSerialization)throw Error("intentional serialization failure");return r.update(...args);}};}};'});
 reveal(s);downloaded(s);s.run('failSerialization=true');s.change('ru-candidate',100,'input');a.equal(s.els['ru-record-download'].disabled,true);a.equal(s.els['ru-record-preview'].textContent,'');s.click('ru-record-download');a.equal(s.blobs.length,1);a.match(s.els['ru-status'].textContent,/serialization failure/);
 s.run('failSerialization=false');reveal(s);downloaded(s);a.equal(s.blobs.length,2);
});
test('export shell additions preserve all prior scientific HTML, immutable core and shared download behavior',()=>{
 const hash=x=>require('node:crypto').createHash('sha256').update(x).digest('hex');
 function priorHtml(h){
  const widget=/\n<section class="ru-record"[\s\S]*?<\/section>/g;a.equal([...h.matchAll(widget)].length,1);
  a.match(h,/<p id="ru-structure-note" class="ru-note"><\/p>\n<section class="ru-record"/);
  for(const tag of ['<script defer src="reference-uncertainty-record.js?v=reference-record-v1"></script>','<script defer src="experiment-record.js?v=record-preview-v1"></script>']){a.equal(h.split(tag).length,2);h=h.replace(tag,'');}
  for(const asset of ['reference-uncertainty.css','reference-uncertainty.js']){a.equal(h.split(asset+'?v=reference-record-v1').length,2);h=h.replace(asset+'?v=reference-record-v1',asset+'?v=reference-uncertainty-v1');}
  return h.replace(widget,'');
 }
 const historicalHtml=require('./helpers/two-section-navigation-preservation.cjs').withoutFile('reference-uncertainty.html',Buffer.from(html)).toString();
 const old='a183720e65adbc16e64504466dfa3213a5d09e1eca871ff593f7a4af28702245';a.equal(hash(priorHtml(historicalHtml)),old);
 a.notEqual(hash(priorHtml(historicalHtml.replace('相位斜坡在 62.5 m 给出 Q=1','相位斜坡在 62.5 m 给出 Q=2'))),old);
 a.equal(hash(read('reference-uncertainty-core.js')),'fffc85f8ea37b2cf365ce05464bcffcbe1337ba67150dd8bf1e690ce805c4551');
 a.equal(hash(read('experiment-record.js')),'cb9f4bc1c330db98d013922287ae4625f5b9d788b74860d86fe22eec40f6bb8f');
 a.equal(hash(css.split('\n.ru-record{')[0]),'8f4675dc66557f69ec7fdf14419ea1bb28b59a69baeb08cef07a9b5ab97e22ea');
 a.match(css,/\.ru-record pre\{[^}]*max-height:360px[^}]*overflow:auto/);
});
