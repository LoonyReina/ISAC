/* Bounded lifecycle only. All observation, estimator and CRB mathematics live in core.js. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CrbReceiverController=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TERMINAL=new Set(['completed','cancelled','budget_exhausted','numerical_failure']);
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const uint=x=>Number.isSafeInteger(x)&&x>=0;
  function validateSummary(r,request){
    if(!r||r.jobDigest!==request.jobDigest||!TERMINAL.has(r.status)||!Array.isArray(r.conditions)||r.conditions.length<1||r.conditions.length>4)throw Error('接收机结果标识或状态不合法');
    const expected=request.mode==='fourSNRsweep'?[-20,-10,0,10]:[request.snrDb];
    // selectedSnrDb is the stable request field in the numerical contract.
    if(request.mode!=='fourSNRsweep'&&!finite(expected[0]))expected[0]=request.selectedSnrDb;
    if(r.mode!==request.mode||r.noiseSeed!==request.noiseSeed||r.selectedSnrDb!==request.selectedSnrDb||r.conditions.length!==expected.length)throw Error('接收机参数与请求不一致');
    if(!r.source||['sourceRunId','inputDigest','scenarioDigest','WcDigest'].some(k=>r.source[k]!==request.source[k]))throw Error('接收机结果与源波束不一致');
    const seen=new Set();
    for(const c of r.conditions){
      if(!finite(c.snrDb)||seen.has(c.snrDb)||!expected.includes(c.snrDb))throw Error('接收机条件与请求不一致');seen.add(c.snrDb);
      const d=c.denominators;if(!d||d.planned!==128||!['started','completed','valid','numericalFailures','unstarted','incomplete'].every(k=>uint(d[k])&&d[k]<=128)||d.valid+d.numericalFailures!==d.completed||d.started+d.unstarted!==128||d.completed+d.incomplete!==d.started)throw Error('接收机试验计数不完整');
      if(!uint(c.largeErrorCount)||c.largeErrorCount>d.valid||!uint(c.boundaryHits)||c.boundaryHits>d.valid||!uint(c.tieTrials)||c.tieTrials>d.valid)throw Error('接收机误差计数不合法');
      if(c.rootCrbDegrees!==null&&(!finite(c.rootCrbDegrees)||c.rootCrbDegrees<=0))throw Error('接收机下界不合法');
      const complete=c.status==='completed'&&d.valid===128&&d.completed===128;
      if(complete){if(!finite(c.rmseDegrees)||c.rmseDegrees<0||!Array.isArray(c.ci95Degrees)||c.ci95Degrees.length!==2||!c.ci95Degrees.every(finite)||c.ci95Degrees[0]<0||c.ci95Degrees[0]>c.ci95Degrees[1])throw Error('接收机完整统计量不合法');}
      else if(c.rmseDegrees!==null||c.ci95Degrees!==null)throw Error('未完成的试验不能显示最终 RMSE');
    }
    if(r.status==='completed'&&(seen.size!==expected.length||r.conditions.some(c=>c.status!=='completed'||c.denominators.completed!==128)))throw Error('接收机完成状态与分母不一致');
    if(r.profile!==null){const p=r.profile;if(!p||p.trial!==0||p.snrDb!==request.selectedSnrDb||!finite(p.estimateDegrees)||p.estimateDegrees< -90||p.estimateDegrees>90||!finite(p.truthDegrees)||p.truthDegrees!==r.source.truthDegrees||!Array.isArray(p.points)||p.points.length<2||p.points.length>721)throw Error('接收机显示曲线不合法');let previous=-Infinity;for(const point of p.points){if(!finite(point.angleDegrees)||point.angleDegrees< -90||point.angleDegrees>90||point.angleDegrees<=previous||(point.normalizedScore!==null&&(!finite(point.normalizedScore)||point.normalizedScore<0||point.normalizedScore>1+1e-12)))throw Error('接收机显示曲线越界');previous=point.angleDegrees;}}
    return r;
  }
  function create(options){
    const core=options.core,spawn=options.createWorker,emit=options.onChange||(()=>{}),download=options.onExport||(()=>{});
    const now=options.now||(()=>performance.now()),later=options.setTimeout||setTimeout,clear=options.clearTimeout||clearTimeout;
    let source=null,sourceInfo=null,job=null,serial=0,destroyed=false,state={status:'idle',summary:null,progress:null,error:'',reason:'请先运行上方优化器，取得本次验收通过的波束。',exporting:false};
    function snapshot(){return {...state,source:sourceInfo,canRun:!!source&&!destroyed,canCancel:!!job&&job.phase==='running',canExport:!!job&&job.phase==='terminal'&&!!state.summary&&!state.exporting};}
    function change(patch){state={...state,...patch};emit(snapshot());}
    function timers(j){for(const key of ['totalTimer','conditionTimer','cancelTimer','exportTimer'])if(j[key]){clear(j[key]);j[key]=null;}}
    function retire(){if(!job)return;const j=job;job=null;timers(j);try{j.worker.terminate();}catch(_){};}
    function invalidate(reason){retire();source=null;sourceInfo=null;change({status:'idle',summary:null,progress:null,error:'',reason:reason||'输入已改变，请重新求解后再运行接收机。',exporting:false});}
    function accept(raw){
      invalidate('正在复核接收机的波束来源。');
      try{if(destroyed)throw Error('页面已离开，请重新求解');source=core.createSource(raw);sourceInfo={sourceRunId:raw.sourceRunId,Nt:raw.input.Nt,Nr:raw.input.Nr,K:2,L:raw.input.L,powerMw:raw.input.powerMw??raw.input.P,usedPowerMw:raw.result.metrics.powerMw,gammaDb:raw.input.gammaDb,truthDegrees:raw.input.thetaDegrees};change({status:'ready',reason:'本次波束已验收。选择雷达 SNR，再生成真正的带噪回波。'});return true;}
      catch(e){source=null;sourceInfo=null;change({status:'error',error:e.message,reason:'波束来源复核失败，接收机未启动。'});return false;}
    }
    function cancel(reason='user'){
      if(!job||job.phase!=='running')return;const j=job;timers(j);j.phase='stopping';j.stopReason=reason;
      change({status:'stopping',reason:reason==='watchdog'?'运行达到时间上限，正在停止。':'已请求停止；不会把未搜索完的试验算作角度估计。',exporting:false});
      try{j.worker.postMessage({type:'cancel',id:j.id,jobDigest:j.digest});}catch(_){}
      j.cancelTimer=later(()=>{if(job!==j||j.phase!=='stopping')return;retire();change({status:reason==='watchdog'?'budget_exhausted':'cancelled',summary:null,progress:null,reason:'已停止 Worker；未收到完整审计记录，不能导出或显示最终误差。'});},250);
    }
    function rearmCondition(j){if(j.conditionTimer)clear(j.conditionTimer);j.conditionTimer=later(()=>{if(job===j&&j.phase==='running')cancel('watchdog');},30000);}
    function start(settings){
      if(!source||destroyed){change({error:'请先取得当前输入的一次新验收结果。'});return false;}
      retire();let request;try{request=core.createRequest({source,...settings});if(!request||typeof request.jobDigest!=='string'||!request.jobDigest)throw Error('缺少接收机请求标识');}catch(e){change({status:'ready',summary:null,progress:null,error:e.message,exporting:false});return false;}
      const j={id:++serial,digest:request.jobDigest,request,phase:'running',started:now(),lastProgress:-Infinity,conditionsCompleted:0};
      try{j.worker=spawn();}catch(e){change({status:'error',summary:null,progress:null,error:'无法启动接收机 Worker：'+e.message,exporting:false});return false;}
      job=j;change({status:'running',summary:null,progress:null,error:'',reason:'正在生成复数回波并搜索整个视场。',exporting:false});
      j.totalTimer=later(()=>{if(job===j&&j.phase==='running')cancel('watchdog');},120000);rearmCondition(j);
      j.worker.onmessage=event=>{
        const m=event.data||{};if(job!==j||m.id!==j.id||m.jobDigest!==j.digest)return;
        if(m.type==='export'){
          if(j.phase!=='terminal'||!state.exporting)return;
          if(j.exportTimer){clear(j.exportTimer);j.exportTimer=null;}
          if(typeof m.text!=='string'||new TextEncoder().encode(m.text).byteLength>8*1024*1024){change({exporting:false,error:'导出记录为空或超过 8 MiB 上限；没有截断证据。'});return;}
          change({exporting:false});download(m.text,j.id);return;
        }
        if(m.type==='error'&&m.operation==='export'){if(j.phase==='terminal'){if(j.exportTimer){clear(j.exportTimer);j.exportTimer=null;}change({exporting:false,error:'导出失败：'+String(m.error)});}return;}
        if(j.phase==='terminal')return;
        if(m.type==='progress'){
          if(j.phase!=='running')return;const p=m.progress;
          if(!p||!uint(p.conditionsCompleted)||!uint(p.conditionsPlanned)||p.conditionsPlanned<1||p.conditionsPlanned>4||p.conditionsCompleted>p.conditionsPlanned||!uint(p.trialsCompleted)||!uint(p.totalTrialsPlanned)||p.totalTrialsPlanned!==p.conditionsPlanned*128||p.trialsCompleted>p.totalTrialsPlanned||!uint(p.conditionTrialsCompleted)||p.conditionTrialsCompleted>128||!finite(p.elapsedMs)||p.elapsedMs<0)return;
          if(p.conditionsCompleted>j.conditionsCompleted){j.conditionsCompleted=p.conditionsCompleted;rearmCondition(j);}
          const time=now();if(time-j.lastProgress<120)return;j.lastProgress=time;change({progress:{...p}});return;
        }
        if(j.phase==='stopping'&&m.type!=='cancelled')return;
        if(!['result','cancelled','error'].includes(m.type))return;
        timers(j);
        if(j.phase==='stopping'&&m.type==='cancelled'&&m.result?.status==='completed'){retire();change({status:'cancelled',summary:null,progress:null,reason:'已停止；迟到的完成结果未被采用。可以重新运行。',exporting:false});return;}
        if(m.type==='error'){retire();change({status:'error',error:'接收机未完成：'+String(m.error),reason:'没有使用预存误差或补造试验。',exporting:false});return;}
        try{const r=validateSummary(m.result,request);j.phase='terminal';change({status:r.status,summary:r,progress:null,error:'',reason:r.status==='completed'?'实际回波接收试验完成。':'本次运行不完整；仅保留已完成条件和真实计数。',exporting:false});}
        catch(e){retire();change({status:'error',summary:null,progress:null,error:e.message,reason:'结果复核未通过，没有显示最终误差。',exporting:false});}
      };
      function workerFailure(event){if(job!==j)return;const terminal=j.phase==='terminal';retire();if(terminal)change({error:'完整证据 Worker 已中断：'+String(event.message||'消息无法读取')+'。已完成的摘要保留；重新运行后可再次导出。',exporting:false});else change({status:'error',summary:null,progress:null,error:'接收机 Worker 执行失败：'+String(event.message||'消息无法读取'),exporting:false});}
      j.worker.onerror=workerFailure;j.worker.onmessageerror=workerFailure;
      try{j.worker.postMessage({type:'run',id:j.id,jobDigest:j.digest,request});}catch(e){retire();change({status:'error',error:'无法提交接收机输入：'+e.message,exporting:false});return false;}return true;
    }
    function edit(){retire();change({status:source?'ready':'idle',summary:null,progress:null,error:'',reason:source?'接收机参数已改变。波束不变，重新运行才会得到新回波与误差。':'请先取得上方的新验收结果。',exporting:false});}
    function exportRecord(){if(!job||job.phase!=='terminal'||!state.summary||state.exporting)return false;const j=job;change({exporting:true,error:''});j.exportTimer=later(()=>{if(job!==j||!state.exporting)return;retire();change({exporting:false,error:'完整证据导出超过 10 秒，已停止等待。摘要保留；重新运行后可再次导出。'});},10000);try{j.worker.postMessage({type:'export',id:j.id,jobDigest:j.digest});}catch(e){retire();change({exporting:false,error:'无法导出：'+e.message+'。已完成的摘要仍保留。'});return false;}return true;}
    function dispose(){destroyed=true;invalidate('页面已离开。返回后请重新求解和运行。');}
    emit(snapshot());return {accept,invalidate,start,cancel,edit,exportRecord,dispose,snapshot};
  }
  return {create,validateSummary};
});
