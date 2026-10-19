// Reconstructed from available agent history; original module byte identity UNVERIFIED.
// NEW independently accepted evidence; old study hash is not used as current provenance.
export const DATA_SHA256='7493d6c738e2ceef7a78d5e48c2a612f271c86b3eb8e8900c38dd359876b9b0e';
export const FAMILIES=['communication','isac','isacS','cap_saturated_communication'];
export const SEEDS=Array.from({length:16},(_,i)=>2026101801+104729*i);
export const CONTRACT=Object.freeze({detector:'AP max-prior MAPRT',geometry:'fixed 4 TX / 2 RX / 2 antennas / 2 UE',rcsDbsm:0,clutterScale:1,gammaDb:3,gammaLinear:10**.3,perAPCapW:1,holdoutSamples:512,calibrationTrials:2048,evaluationH0Trials:1024,evaluationH1Trials:1024,split:'separate calibration / H0 evaluation / H1 evaluation pseudorandom streams',interpretation:'conditional finite experiment, not population feasibility or full-paper reproduction'});
const copy=x=>JSON.parse(JSON.stringify(x));
export async function decodeStudy(bytes){
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==DATA_SHA256)throw Error('离线证据校验失败；未显示结果');
 const d=JSON.parse(new TextDecoder().decode(bytes));
 if(d.schema!=='cellfree-maprt-robustness-teaching-v1'||d.worlds.length!==32||d.provenance?.originalArchiveRecovered!==false)throw Error('不支持的研究格式');
 return d;
}
export function selectStudy(data,seed,fitSamples){
 if(!SEEDS.includes(seed)||![64,512].includes(fitSamples))throw Error('请选择冻结的世界与拟合数');
 const world=data.worlds.find(w=>w.seed===seed&&w.fitSamples===fitSamples);
 if(!world)throw Error('缺少设计，不能补造结果');
 return {key:`${seed}/${fitSamples}`,seed,fitSamples,contract:copy(CONTRACT),provenance:copy(data.provenance),families:FAMILIES.map(name=>{
 const a=world.allocations.find(a=>a.name===name),solver=world.solver[name];
 return {name,available:!!a,solver:copy(solver||{accepted:!!a,selectedRestart:null,restarts:[],termination:'scaled_communication_baseline'}),allocation:a?copy(a):null};
 }),aggregate:copy(data.aggregate),mode:'offline-record-selection'};
}
export function exportSelection(view){return {schema:'cellfree-maprt-robustness-selection-v1',studySha256:DATA_SHA256,source:'arXiv:2305.12523v2',...copy(view),warning:'NEW regenerated evidence, not recovered old archive. Offline selection only. No new CCP, MAPRT scores, calibration or Monte Carlo was run by selecting. Not compatible with legacy live AP/SP replay.'};}
export class StudySession{
 constructor(){this.version=0;this.view=null;this.controller=null;this.state='idle';}
 cancel(){this.version++;this.controller?.abort();this.controller=null;this.view=null;this.state='cancelled';}
 async select(seed,fit,loader){
  this.cancel();const version=this.version;this.state='loading';this.controller=new AbortController();
  try{const data=await loader(this.controller.signal);if(version!==this.version)return false;this.view=selectStudy(data,seed,fit);this.state='ready';return true;}
  catch(error){if(version!==this.version)return false;this.state='error';throw error;}
  finally{if(version===this.version)this.controller=null;}
 }
 export(){if(this.state!=='ready'||!this.view)throw Error('当前选择尚无有效结果');return exportSelection(this.view);}
}
