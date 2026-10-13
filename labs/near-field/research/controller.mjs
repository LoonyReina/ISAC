import {Experiment} from './runtime/src/experiment.mjs';
import {createSolverClient,createReceiverClient} from './runtime/src/worker-client.mjs';
import {clone,validateDesign,validateScene,validateReceiver,validateSolverOptions,LIMITS} from './runtime/src/contract.mjs';
import {defaultSpec} from './defaults.mjs';

export const MAX_RECORD_BYTES = LIMITS.maxJsonBytes;
const GROUPS = ['design','scene','receiver'];
const deg = x => x*180/Math.PI;
const complex = (m,p) => [m*Math.cos(p),m*Math.sin(p)];
const numerical = (v,name) => {if(v==='' || v===null || v===undefined || !Number.isFinite(Number(v)))throw Error(`${name} 必须是有限数值`);return Number(v);};

export function fieldsFromSpec(spec) {
 const d=spec.designInput,r=d.resources,g=d.geometry,s=spec.scene,o=spec.receiver.options;
 return {design:{range:g.targetRangeM,angle:deg(g.targetAngleRad),power:r.powerW,commNoise:r.commNoiseW,sensingNoise:r.sensingNoiseW,gainMagnitude:Math.hypot(r.targetGain.re,r.targetGain.im),gainPhase:Math.atan2(r.targetGain.im,r.targetGain.re),rate0:d.ratesBpsHz[0],rate1:d.ratesBpsHz[1],rate2:d.ratesBpsHz[2],rate3:d.ratesBpsHz[3],maxIterations:spec.solverOptions.maxIterations??240,solverWallMs:spec.solverOptions.maxWallMs??30000,channels:JSON.stringify(d.channels,null,2)},
 scene:{truthX:s.truthXY[0],truthY:s.truthXY[1],betaMagnitude:Math.hypot(...s.beta),betaPhase:Math.atan2(s.beta[1],s.beta[0]),noiseVariance:s.noiseVariance,seed:s.seed},
 receiver:{stepM:spec.receiver.domain.stepM,refine:o?.refine??false,maxRefineIterations:o?.maxRefineIterations??120,maxEigenSweeps:o?.maxEigenSweeps??40,maximaLimit:o?.maximaLimit??32,receiverWallMs:o?.maxWallMs??10000}};
}

// Patch only edited fields. In particular, imported raw channels and complex gains are
// not silently round-tripped through decimal/polar widgets when another field changes.
export function applyFields(spec,group,fields,changed=Object.keys(fields)) {
 if(!GROUPS.includes(group))throw Error('Unknown input group');
 const next=clone(spec),allowed=fieldsFromSpec(spec)[group],n=k=>numerical(fields[k],k),has=k=>changed.includes(k);
 for(const k of changed)if(!Object.hasOwn(allowed,k))throw Error(`Unknown ${group} field ${k}`);
 if(group==='design'){
  const d=next.designInput,r=d.resources,g=d.geometry;
  if(has('range'))g.targetRangeM=n('range');if(has('angle'))g.targetAngleRad=n('angle')*Math.PI/180;
  for(const [f,k]of [['power','powerW'],['commNoise','commNoiseW'],['sensingNoise','sensingNoiseW']])if(has(f))r[k]=n(f);
  if(has('gainMagnitude')||has('gainPhase')){const magnitude=n('gainMagnitude');if(magnitude<1e-8||magnitude>.01)throw Error('设计增益幅度超出范围');const v=complex(magnitude,n('gainPhase'));r.targetGain={re:v[0],im:v[1]};}
  for(let i=0;i<4;i++)if(has(`rate${i}`))d.ratesBpsHz[i]=n(`rate${i}`);
  if(has('maxIterations'))next.solverOptions.maxIterations=n('maxIterations');if(has('solverWallMs'))next.solverOptions.maxWallMs=n('solverWallMs');
  if(has('channels')){if(typeof fields.channels!=='string'||fields.channels.length>65536)throw Error('信道 JSON 超出 65536 字符上限');d.channels=JSON.parse(fields.channels);d.provenance={channelSource:'Explicit raw-channel override; prior user-position/seed descriptions are not authoritative'};d.caseId='interactive_raw_channel_override';}
  validateDesign(d);validateSolverOptions(next.solverOptions);
 }else if(group==='scene'){
  const s=next.scene;if(has('truthX'))s.truthXY[0]=n('truthX');if(has('truthY'))s.truthXY[1]=n('truthY');
  if(has('betaMagnitude')||has('betaPhase')){const magnitude=n('betaMagnitude');if(magnitude<0)throw Error('实际增益幅度不能为负');s.beta=complex(magnitude,n('betaPhase'));}
  if(has('noiseVariance'))s.noiseVariance=n('noiseVariance');if(has('seed'))s.seed=n('seed');validateScene(s);
 }else{
  const r=next.receiver;r.options??={};if(has('stepM'))r.domain.stepM=n('stepM');if(has('refine')){if(typeof fields.refine!=='boolean')throw Error('refine must be Boolean');r.options.refine=fields.refine;}
  for(const k of ['maxRefineIterations','maxEigenSweeps','maximaLimit'])if(has(k))r.options[k]=n(k);
  if(has('receiverWallMs'))r.options.maxWallMs=n('receiverWallMs');r.options.returnSpectrum=true;validateReceiver(r);
 }
 return next;
}

export class ResearchController {
 constructor({spec=defaultSpec(),onChange=()=>{},factory=s=>new Experiment(s),importer=text=>Experiment.import(text)}={}){
  this.factory=factory;this.importer=importer;this.onChange=onChange;this.experiment=factory(spec);this.epoch=0;this.disposed=false;this.busy=null;this.error=null;this.status='尚未计算：先检查独立的设计先验、实际场景与接收机设置';this.progress=[];this.invalidGroups=new Map();this.draftChanges=new Map();this.identity={design:0,observation:0,receiver:0};this.closing=[];this.stageSequence=0;this.recoveries=new WeakMap();this.recoveryTasks=new Set();this.closePromise=null;
  this.watchClients(this.experiment);
 }
 watchClients(e){for(const key of ['solverClientPromise','receiverClientPromise']){const p=e[key];Promise.resolve(p).catch(error=>{if(!this.disposed&&e===this.experiment&&e[key]===p){this.error=String(error.message??error);this.status='Worker 启动失败；修复环境后可重新求解或重试';this.notify();}});}}
 snapshot(){return {experiment:this.experiment,status:this.status,busy:this.busy,error:this.error,progress:this.progress,identity:{...this.identity},invalidGroups:[...this.invalidGroups.keys()]};}
 notify(){if(!this.disposed)this.onChange(this.snapshot());}
 retire(e){const p=Promise.resolve().then(()=>e.close()).catch(()=>{});this.closing.push(p);p.finally(()=>{this.closing=this.closing.filter(x=>x!==p);});}
 halt(reason='superseded'){this.epoch++;this.experiment.cancel(reason);this.busy=null;return this.epoch;}
 assertReady(){if(this.disposed)throw Error('Controller closed');if(this.invalidGroups.size)throw Error('请先修正未通过校验的输入');}
 get hasRaw(){const e=this.experiment;return !!(e.realization&&e.observation || e.importedRaw&&e.importedObservationValid);}
 get hasWaveform(){const e=this.experiment;return !!(e.realization||e.importedRaw);}
 edit(group,fields,changed=Object.keys(fields)){
  if(this.disposed)return false;if(!GROUPS.includes(group))throw Error('Unknown input group');
  const keepSolve=group==='receiver'&&this.busy==='solve';
  if(!keepSolve)this.halt();this.error=null;if(!keepSolve)this.progress=[];let next;
  const pending=this.draftChanges.get(group)??new Set();for(const key of changed)pending.add(key);this.draftChanges.set(group,pending);
  try{next=applyFields(this.experiment.spec,group,fields,[...pending]);this.invalidGroups.delete(group);this.draftChanges.delete(group);}catch(error){next=clone(this.experiment.spec);this.invalidGroups.set(group,String(error.message??error));this.error=String(error.message??error);}
  const e=this.experiment;
  if(group==='design'){e.updateDesign(next.designInput,next.solverOptions);this.identity.design++;this.identity.observation=0;this.identity.receiver=0;}
  if(group==='scene'){e.updateScene(next.scene);this.identity.observation=0;this.identity.receiver=0;}
  if(group==='receiver'){e.updateReceiver(next.receiver);this.identity.receiver=0;}
  this.status=this.error?'输入未通过校验；依赖结果已失效，不能运行或导出':keepSolve?'接收机设置已改变；发射设计继续求解，完成后再用新设置推断':group==='design'?'设计输入已改变：须重新求解，再构造 X 与 Y':group==='scene'?'实际场景已改变：保留波束；须显式生成新的 Y':'接收机已改变：原始 Y 逐字节保留；须重新运行 MUSIC';this.notify();return !this.error;
 }
 async ensureWorkers(e){
  // Single-flight repair per Experiment/client. A replacement is owned by the
  // original Experiment before awaiting its factory, so close() sees it. No stale
  // recovery can overwrite a newer promise or leave an unowned Worker alive.
  let repairs=this.recoveries.get(e);if(!repairs){repairs=new Map();this.recoveries.set(e,repairs);}
  for(const [key,make]of [['solverClientPromise',createSolverClient],['receiverClientPromise',createReceiverClient]]){
   if(e!==this.experiment||this.disposed)return;
   const old=e[key];let client;try{client=await old;}catch{}
   if(!client||client.closed){
    let repair=repairs.get(key);
    if(!repair){
     repair=(async()=>{
      try{await client?.terminate();}catch{}
      if(e!==this.experiment||this.disposed)return;
      if(e[key]!==old){await e[key];return;}
      const next=make();e[key]=next;
      const replacement=await next;
      if(e!==this.experiment||this.disposed||e[key]!==next){await replacement.terminate();return;}
     })();
     repairs.set(key,repair);this.recoveryTasks.add(repair);
     const finish=()=>{if(repairs.get(key)===repair)repairs.delete(key);this.recoveryTasks.delete(repair);};
     repair.then(finish,finish);
    }
    await repair;
   }
  }
 }

 async action(kind){
  this.assertReady();if(!['solve','receive','regenerate','audit'].includes(kind))throw Error('Unknown action');
  if(kind==='receive'&&!this.hasRaw)throw Error('先生成或导入有效的原始 Y');if(kind==='regenerate'&&!this.hasWaveform)throw Error('先求解或导入完整波束记录');
  const e=this.experiment,token=++this.epoch;if(this.busy)e.cancel('superseded');this.busy=kind;this.error=null;this.progress=[];
  this.status={solve:'正在重新求解：SDR → Eq.21 → 有限 X → 带噪 Y',receive:'正在保持原始 Y，仅重算 MUSIC',regenerate:'正在用当前波束与实际场景构造 Y',audit:'正在同步复核原始矩阵；这不验证历史优化器最优性'}[kind];this.notify();
  try{
   // Yield one event turn before the explicitly synchronous adapter/audit. This is not
   // an assertion that those bounded computations are interruptible in a browser.
   await new Promise(r=>setTimeout(r,0));if(token!==this.epoch||e!==this.experiment)return {status:'superseded'};
   await this.ensureWorkers(e);if(token!==this.epoch||e!==this.experiment)return {status:'superseded'};
   const progress=p=>{if(token===this.epoch&&e===this.experiment&&!this.disposed){this.progress.push(clone(p));this.notify();}};
   const result=kind==='solve'?await e.solveAndObserve(progress):kind==='receive'?await e.receive(progress):kind==='regenerate'?e.regenerateObservation():e.auditRaw();
   if(token!==this.epoch||e!==this.experiment||this.disposed)return {status:'superseded'};
   if(kind==='solve'){this.identity.design=++this.stageSequence;this.identity.observation=this.hasRaw?++this.stageSequence:0;this.identity.receiver=0;}
   if(kind==='regenerate'){this.identity.observation=++this.stageSequence;this.identity.receiver=0;}
   if(kind==='receive')this.identity.receiver=++this.stageSequence;
   this.status=kind==='solve'?(result.status==='observation_ready'?'发射设计与有限 X 检查通过，新的带噪 Y 已生成；尚未运行接收机':`发射设计未接受：${result.status}；下游未计算`):kind==='receive'?`接收机结束：${result.status}；数值完成不等于定位正确`:kind==='regenerate'?'新的 Y 已生成，旧估计已失效；可只用 Y 定位':`原始数据复核：${result.passed?'通过':'未通过'}；历史优化器状态仍不因此获得认证`;
   return result;
  }catch(error){if(token===this.epoch&&e===this.experiment&&!this.disposed){this.error=String(error.message??error);this.status=`本次操作失败：${this.error}；失败结果不能作为已接受证据`;}return {status:token===this.epoch?'error':'superseded',error:String(error.message??error)};
  }finally{if(token===this.epoch&&e===this.experiment&&!this.disposed){this.busy=null;this.notify();}}
 }
 cancel(){if(this.disposed)return;this.halt('cancelled');this.status='已请求取消；晚到结果不会成为当前结果。不可中断的计算片段仍需返回';this.notify();}
 reset(){if(this.disposed)return;this.halt();const old=this.experiment;this.experiment=this.factory(defaultSpec());this.watchClients(this.experiment);this.retire(old);this.invalidGroups.clear();this.draftChanges.clear();this.error=null;this.progress=[];this.identity={design:0,observation:0,receiver:0};this.status='已恢复默认输入；没有自动求解，没有历史结果冒充当前结果';this.notify();}
 async importFile(file){
  if(this.disposed)return {status:'closed'};const token=this.halt();this.busy='import';this.error=null;this.status='正在读取记录；导入的优化器与接收机结论均需重新验证';this.notify();
  try{if(!file||!Number.isFinite(file.size)||file.size>MAX_RECORD_BYTES)throw Error('记录超过 16 MiB UTF-8 上限');const text=await file.text();if(token!==this.epoch||this.disposed)return {status:'superseded'};return this.importText(text,token);}
  catch(error){if(token===this.epoch&&!this.disposed){this.error=String(error.message??error);this.status=`导入失败：${this.error}`;this.busy=null;this.notify();}return {status:token===this.epoch&&!this.disposed?'error':'superseded',error:String(error.message??error)};}
 }
 importText(text,pendingToken=null){
  if(this.disposed)throw Error('Controller closed');const token=pendingToken??this.halt();if(token!==this.epoch)return {status:'superseded'};
  try{if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_RECORD_BYTES)throw Error('记录超过 16 MiB UTF-8 上限');const next=this.importer(text);
   if(token!==this.epoch||this.disposed){this.retire(next);return {status:'superseded'};}
   const old=this.experiment;this.experiment=next;this.watchClients(next);this.retire(old);this.invalidGroups.clear();this.draftChanges.clear();this.error=null;this.progress=[];this.busy=null;this.identity={design:0,observation:0,receiver:0};
   this.status=this.hasRaw?'已导入完整原始记录：X/Z/Y 是复核输入；历史优化器及估计结论尚未验证':'已导入诊断记录：只有输入与历史诊断，没有 X/Z/Y；须显式重新求解';this.notify();return {status:'imported',complete:this.hasRaw};
  }catch(error){this.error=String(error.message??error);this.status=`导入失败：${this.error}`;this.busy=null;this.notify();return {status:'error',error:this.error};}
 }
 export(kind){this.assertReady();if(this.busy)throw Error('先等待本次操作结束，或取消后导出');if(kind==='full')return this.experiment.export();if(kind==='diagnostic')return this.experiment.exportDiagnostic();throw Error('Unknown record kind');}
 async close(){if(this.closePromise)return this.closePromise;if(this.disposed)return;this.halt();this.disposed=true;this.retire(this.experiment);this.closePromise=Promise.allSettled([...this.closing,...this.recoveryTasks]);await this.closePromise;}
}
