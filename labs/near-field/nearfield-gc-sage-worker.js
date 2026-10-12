/* One isolated numerical runtime, one private initializer, two same-data fits.
 * No simulator, seed, geometry truth, mechanism labels or support mask enters here. */
'use strict';
let loadError=null;
try { importScripts('nearfield-gc-sage-core.js?v=gc-sage-live-20261012-1'); }
catch(error) { loadError=error; }
self.onmessage=function(event) {
  const input=event.data||{},runId=input.runId;
  const send=(type,payload={})=>self.postMessage({type,runId,...payload});
  try {
    if(loadError)throw new Error('估计核心加载失败：'+loadError.message);
    if(!self.NearfieldGCSAGE||self.NearfieldGCSAGE.VERSION!=='reduced-gc-sage-2d/0.2.0-all-channel-region')throw new Error('估计核心版本不匹配');
    if(Object.keys(input).some(key=>!['runId','observations','model','options'].includes(key)))throw new Error('Worker 只接受观测、接收机模型与数值预算');
    if(!Number.isSafeInteger(runId)||runId<1)throw new Error('无效 runId');
    const G=self.NearfieldGCSAGE,start=performance.now(),times={};
    const options={...input.options,record_history:true};
    send('phase',{phase:'initializing'});
    let t=performance.now();
    const initial=G.initialize(input.observations,input.model,options);
    times.initialization_ms=performance.now()-t;
    send('initialized',{initialization:initial});
    for(const mode of ['scattering','hybrid']) {
      send('phase',{phase:mode});t=performance.now();
      const result=G.fit(input.observations,input.model,mode,options,initial);
      times[mode+'_ms']=performance.now()-t;
      send('result',{mode,result,fit_wall_ms:times[mode+'_ms']});
    }
    times.worker_total_ms=performance.now()-start;
    send('complete',{algorithm_version:G.VERSION,observation_sha256:initial.observation_sha256,model_sha256:initial.model_sha256,times,shared_initialization:true});
  } catch(error) { send('error',{message:error&&error.message?error.message:String(error)}); }
};
