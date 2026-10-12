// Actual UI script with controlled Worker delivery. This is not real-browser QA.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const M=require('../waveform-live-model.js'),html=fs.readFileSync(require.resolve('../waveform-design.html'),'utf8'),script=fs.readFileSync(require.resolve('../waveform-live.js'),'utf8');
function setup({width=600,workerUnavailable=false}={}){
 const downloads=[],blobs=[],timeouts=[],workers=[],events={};let ticks=0;
 class E{constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.events={};this.clientWidth=width;this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.focused=false;}
  setAttribute(k,v){this.attrs[k]=String(v);}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}addEventListener(t,f){(this.events[t]??=[]).push(f);}fire(t){for(const f of this.events[t]||[])f({target:this});}focus(){this.focused=true;}click(){if(this.tag==='a')downloads.push({href:this.href,download:this.download});else this.fire('click');}}
 const els={};for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new E();
 els['wfl-matrix-kind'].value='H';els['wfl-matrix-method'].value='optimal';
 class W{constructor(url){if(workerUnavailable)throw Error('unavailable');this.url=url;this.requests=[];this.terminated=false;workers.push(this);}postMessage(value){this.requests.push(JSON.parse(JSON.stringify(value)));}terminate(){this.terminated=true;}
  result(){const req=this.requests.at(-1),result=M.solve(req.inputs);result.inputHashStatus='verified';result.inputSha256=crypto.createHash('sha256').update(M.canonicalInputs(result.inputs)).digest('hex');return {type:'result',id:req.id,result};}
  deliver(message=this.result()){this.onmessage({data:message});}}
 const window={WaveformLiveModel:M,performance:{now:()=>++ticks},addEventListener:(t,f)=>events[t]=f};
 const context={window,document:{getElementById:id=>{assert.ok(els[id],id);return els[id];},createElement:tag=>new E(tag),createElementNS:(_,tag)=>new E(tag)},Worker:W,TextEncoder,Blob,Date,URL:{createObjectURL:blob=>{blobs.push(blob);return 'blob:'+blobs.length;},revokeObjectURL:()=>{}},setTimeout:fn=>{timeouts.push(fn);return timeouts.length;}};
 vm.runInNewContext(script,context);return {els,workers,events,downloads,blobs,timeouts,run(){els['wfl-run'].fire('click');return workers.at(-1);}};
}
const textRows=el=>el.children.map(row=>row.children.map(cell=>cell.textContent));
function assertClear(s){assert.equal(s.els['wfl-result'].hidden,true);assert.equal(s.els['wfl-download'].disabled,true);for(const id of ['wfl-pattern','wfl-symbols','wfl-metrics','wfl-rates','wfl-matrix'])assert.equal(s.els[id].children.length,0,id);}

test('initial example has actual inputs but no stored or auto-fabricated result',()=>{
 const s=setup();assert.equal(s.workers.length,0);assert.match(s.els['wfl-status'].textContent,/尚未求解/);assertClear(s);const input=JSON.parse(s.els['wfl-input'].value);assert.ok(input.H&&input.S&&input.R);assert.equal(input.X,undefined);
});
test('Run sends fresh actual matrices to a Worker and renders its returned result',()=>{
 const s=setup(),w=s.run();assert.equal(w.url,'waveform-live-worker.js');assert.equal(s.els['wfl-cancel'].disabled,false);assertClear(s);const packet=w.result();w.deliver(packet);
 assert.equal(w.terminated,true);assert.equal(s.els['wfl-result'].hidden,false);assert.equal(s.els['wfl-download'].disabled,false);assert.equal(textRows(s.els['wfl-metrics']).length,7);
 assert.match(s.els['wfl-status'].textContent,/浮点检查通过/);assert.match(s.els['wfl-rank'].textContent,/数值秩.*阈值/);assert.match(s.els['wfl-budget'].textContent,/N=4，K=2，L=8/);
});
test('editing any input immediately invalidates old X and clears plots/exports',()=>{
 for(const id of ['wfl-seed','wfl-beta','wfl-n','wfl-pt']){const s=setup();s.run().deliver();s.els[id].value=id==='wfl-beta'?'0.4':id==='wfl-n'?'3':id==='wfl-pt'?'2':'55';s.els[id].fire('input');assertClear(s);assert.match(s.els['wfl-status'].textContent,/改变/);}
 const s=setup();s.run().deliver();s.els['wfl-input'].value=JSON.stringify(JSON.parse(s.els['wfl-input'].value));s.els['wfl-input'].fire('input');assertClear(s);
});
test('an edited input cancels old Worker and late old result cannot return',()=>{
 const s=setup(),old=s.run(),reply=old.result();s.els['wfl-beta'].value='0.4';s.els['wfl-beta'].fire('input');assert.equal(old.terminated,true);old.deliver(reply);assertClear(s);
 const next=s.run();next.deliver();assert.equal(s.els['wfl-result'].hidden,false);const status=s.els['wfl-status'].textContent;old.deliver(reply);assert.equal(s.els['wfl-status'].textContent,status);
});
test('double Run, Cancel and Reset terminate work and reject stale or wrong-ID replies',()=>{
 const s=setup(),first=s.run(),firstResult=first.result(),second=s.run();assert.equal(first.terminated,true);first.deliver(firstResult);assertClear(s);
 const wrong=second.result();wrong.id+=99;second.deliver(wrong);assertClear(s);s.els['wfl-cancel'].fire('click');assert.equal(second.terminated,true);second.deliver();assertClear(s);assert.match(s.els['wfl-status'].textContent,/已取消/);
 const third=s.run(),reply=third.result();s.els['wfl-reset'].fire('click');third.deliver(reply);assertClear(s);assert.equal(s.els['wfl-beta'].value,'0.8');
});
test('invalid JSON is visible, cleared, and recoverable without reloading',()=>{
 const s=setup();s.run().deliver();const valid=s.els['wfl-input'].value;s.els['wfl-input'].value='{not json';s.els['wfl-input'].fire('input');s.els['wfl-apply'].fire('click');assertClear(s);assert.match(s.els['wfl-error'].textContent,/JSON/);assert.equal(s.els['wfl-error'].focused,true);
 s.els['wfl-input'].value=valid;s.els['wfl-input'].fire('input');s.els['wfl-apply'].fire('click');s.workers.at(-1).deliver();assert.equal(s.els['wfl-result'].hidden,false);
});
test('manual H/S/R changes execute new solves and any supplied X is ignored',()=>{
 const s=setup();const input=JSON.parse(s.els['wfl-input'].value);input.H[0][0][0]+=.2;input.S[0][0]=[.5,-.4];input.R[0][0][0]+=.1;input.X='do not use';input.record={optimal:{X:'do not use'}};
 s.els['wfl-input'].value=JSON.stringify(input);s.els['wfl-input'].fire('input');s.els['wfl-apply'].fire('click');const w=s.workers.at(-1),sent=w.requests[0].inputs;
 assert.deepEqual(sent.H,input.H);assert.deepEqual(sent.S,input.S);assert.deepEqual(sent.R,input.R);assert.equal(sent.X,undefined);assert.equal(sent.record,undefined);w.deliver();assert.match(s.els['wfl-budget'].textContent,/自定义矩阵/);
});
test('core errors, Worker loading failure and malformed reply cannot look successful',()=>{
 const s=setup(),w=s.run();w.deliver({type:'error',id:w.requests[0].id,error:'R 必须严格正定'});assertClear(s);assert.match(s.els['wfl-error'].textContent,/正定/);
 const no=setup({workerUnavailable:true});no.run();assertClear(no);assert.match(no.els['wfl-error'].textContent,/求解资源/);
 const broken=setup(),b=broken.run();b.deliver({type:'result',id:b.requests[0].id,result:{status:'bad'}});assertClear(broken);
 const net=setup(),n=net.run();n.onerror();assertClear(net);assert.match(net.els['wfl-error'].textContent,/Worker/);
});
test('SNR and view changes do not call solver and display real per-user diagnostics',()=>{
 const s=setup();s.run().deliver();const count=s.workers.length;s.els['wfl-snr'].value='12';s.els['wfl-snr'].fire('input');assert.equal(s.workers.length,count);assert.match(s.els['wfl-rate-status'].textContent,/X未改变/);assert.equal(textRows(s.els['wfl-rates']).length,2);
 s.els['wfl-user'].value='1';s.els['wfl-user'].fire('change');s.els['wfl-antenna'].value='3';s.els['wfl-antenna'].fire('change');assert.equal(s.workers.length,count);
});
test('matrix panel exposes every actual input/output and both methods',()=>{
 const s=setup();s.run().deliver();for(const kind of ['H','S','R','X','Y','cov'])for(const method of ['optimal','reference']){s.els['wfl-matrix-kind'].value=kind;s.els['wfl-matrix-method'].value=method;s.els['wfl-matrix-kind'].fire('change');assert.equal(s.els['wfl-matrix'].children.length,1);assert.match(s.els['wfl-matrix'].children[0].children[0].textContent,new RegExp('^'+kind+':|^'+kind+'：'));}
});
test('paper parameter and zero-H examples require new solves and show true budgets',()=>{
 const s=setup();s.els['wfl-paper'].fire('click');assertClear(s);s.run().deliver();assert.match(s.els['wfl-rank'].textContent,/至少 12 个/);assert.match(s.els['wfl-budget'].textContent,/N=16，K=4，L=20/);
 s.els['wfl-zero'].fire('click');assertClear(s);const w=s.run(),r=w.result();assert.ok(r.result.inputs.H.flat().every(z=>z[0]===0&&z[1]===0));w.deliver(r);assert.match(s.els['wfl-rank'].textContent,/数值秩 0/);
});
test('export contains current full H/S/R/X/provenance and cannot export stale results',async()=>{
 const s=setup();s.run().deliver();s.els['wfl-download'].fire('click');assert.equal(s.downloads.length,1);const record=JSON.parse(await s.blobs[0].text());assert.ok(record.H&&record.S&&record.R&&record.record.optimal.X);assert.equal(record.record.coreSha256,M.CORE_SHA256);assert.equal(record.record.inputHashStatus,'verified');assert.ok(record.record.endToEndMs>=0);assert.equal(record.record.endToEndScope,"已准备输入至 Worker 结果接收并核对，含 Worker 启动；不含输入生成/解析、绘图、下载");assert.match(s.els['wfl-diagnostics'].textContent,/Worker响应耗时ms/);assert.doesNotMatch(s.els['wfl-diagnostics'].textContent,/端到端实测/);
 s.els['wfl-beta'].value='0.3';s.els['wfl-beta'].fire('input');s.els['wfl-download'].fire('click');assert.equal(s.downloads.length,1);assertClear(s);
});
test('pagehide cancels running work, while finished result stays usable on return',()=>{
 const s=setup(),w=s.run(),reply=w.result();s.events.pagehide();w.deliver(reply);assertClear(s);assert.match(s.els['wfl-status'].textContent,/页面已离开/);
 s.run().deliver();s.events.pagehide();assert.equal(s.els['wfl-result'].hidden,false);assert.equal(s.els['wfl-download'].disabled,false);
});
test('narrow and wide SVG plots contain finite bounded coordinates after resize',()=>{
 for(const width of [240,293,323,388,600,950]){const s=setup({width});s.run().deliver();s.events.resize();for(const id of ['wfl-symbols','wfl-pattern','wfl-time-i','wfl-time-q']){const svg=s.els[id];assert.equal(svg.attrs.viewBox,`0 0 ${width} 300`);for(const node of svg.children){assert.ok(!/NaN|Infinity/.test(JSON.stringify(node.attrs)));if(node.attrs.points)for(const point of node.attrs.points.split(' ')){const [x,y]=point.split(',').map(Number);assert.ok(x>=0&&x<=width&&y>=0&&y<=300,point);}}}}
});
test('live and historical evidence are visibly separate and every control has a label',()=>{
 assert.match(html,/id="experiment"/);assert.match(html,/id="offline-history"/);assert.match(html,/离线历史：原有27组已求解对照/);assert.match(html,/不进行新优化/);assert.match(html,/不是当前输入的输出/);
 for(const id of ['wfl-n','wfl-k','wfl-l','wfl-seed','wfl-pt','wfl-beta','wfl-angle','wfl-input','wfl-user','wfl-antenna','wfl-snr','wfl-matrix-kind','wfl-matrix-method'])assert.match(html,new RegExp(`for="${id}"`));
 assert.ok(!/fetch\(|Math.random|setInterval|requestAnimationFrame/.test(script));
});
