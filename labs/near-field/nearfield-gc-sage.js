/* Actual same-observation inverse lesson. No stored runs, network, or autoplay. */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.GCSAGELesson=api;if(root.document)api.boot(root.document,root);}
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='gc-sage-lesson/1.0.0',ALGORITHM='reduced-gc-sage-2d/0.2.0-all-channel-region',SIMULATOR='reduced-gc-sage-observations/1.0.0',HISTORY='gc-sage-compact-history/1.0.0';
  const MODES=['scattering','hybrid'],NAMES={scattering:'仅散射',hybrid:'散射＋反射'},KIND={scattering:'散射点',reflection:'反射线',unlocalized:'尚未得到有效几何'};
  const DEFAULTS={snrDb:15,aperture:1.49146747855,bandwidthHz:1e9,seed:260501162,scene:'normal',budget:'reference'};
  const OPTION_BASE={delay_grid:1024,initializer_sweeps:20,refinement_rounds:2,refinement_points:17,relative_tolerance:1e-6,stationary_sweeps:2,record_history:true};
  const clone=x=>ArrayBuffer.isView(x)?x.slice():Array.isArray(x)?x.map(clone):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,clone(v)])):x;
  const jsonSafe=x=>{if(ArrayBuffer.isView(x)||Array.isArray(x))return Array.from(x,jsonSafe);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,jsonSafe(v)]));if(typeof x==='number'&&!Number.isFinite(x))throw new Error('记录含非有限数值');return x;};
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(x,d=4)=>x===null||x===undefined?'未定义':Number.isFinite(x)?Number(x.toPrecision(d)).toString():'无效';
  const energy=y=>{let n=0;for(let i=0;i<y.real.length;i++)n+=y.real[i]**2+y.imag[i]**2;return n;};
  function optionsFor(budget){if(!['reference','reduced'].includes(budget))throw new Error('请选择已验证的计算预算');return {...OPTION_BASE,angle_grid:budget==='reference'?256:128,max_sweeps:budget==='reference'?12:6};}
  function readSettings(doc){
    const value=id=>doc.getElementById('gcs-'+id).value;
    const s={snrDb:Number(value('snr')),aperture:Number(value('aperture')),bandwidthHz:Number(value('bandwidth')),seed:Number(value('seed')),scene:value('scene'),budget:value('budget')};
    if(value('seed').trim()===''||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295)throw new Error('噪声种子须为 0…4294967295 的整数');
    if(![5,10,15,20].includes(s.snrDb)||![.05,.35,.75,1.49146747855].includes(s.aperture)||![20e6,100e6,250e6,500e6,1e9].includes(s.bandwidthHz)||!['normal','reference-blind'].includes(s.scene))throw new Error('采样参数不在已验证的可选范围内');
    optionsFor(s.budget);return s;
  }
  const configFor=s=>({snrDb:s.snrDb,aperture:s.aperture,bandwidthHz:s.bandwidthHz,seed:s.seed,scene:s.scene});
  const acquisitionKey=s=>JSON.stringify(configFor(s));
  function replayHistory(result,index){
    if(!result||!result.history||result.history.schema_version!==HISTORY)throw new Error('缺少对应版本的真实更新历史');
    if(!Number.isInteger(index)||index<0||index>=result.trace.length)throw new Error('历史索引越界');
    const states=clone(result.history.initial.states);
    for(const u of result.history.updates){if(u.trace_index>index)break;if(u.accepted)states[u.path]=clone(u.state);}
    return states;
  }
  function buildRecord(run){
    if(!run.complete||!run.results.scattering||!run.results.hybrid)throw new Error('两种方法完成后才能导出比较');
    const s=run.sample,receiverLedger={...s.ledger};delete receiverLedger.evaluation_only;delete receiverLedger.seed;
    return jsonSafe({schema_version:'gc-sage-comparison-record/1.0.0',lesson_version:VERSION,algorithm_version:ALGORITHM,history_schema_version:HISTORY,simulator_version:s.simulator_version,generator_version:s.ledger.generator_version,
      completed_at:run.completedAt,source:{paper:'https://arxiv.org/pdf/2605.01162v1',scope:'Independent reduced 2-D, one-bounce, known-L=2 synthetic inverse; not complete GC-SAGE or Figures 5–9 reproduction'},
      observations:{...s.observations,layout:'Tx-major Rx rows; columns are centered tone offsets; Float64 complex samples',observation_sha256:run.hash,hash_encoding:'SHA-256 of little-endian interleaved complex128'},
      receiver_input:{model:s.model,model_sha256:run.modelHash,options:run.options,ledger:receiverLedger},
      simulator:{seed:s.config.seed,config:s.config,generator_version:s.ledger.generator_version,acquisition_convention:s.ledger.aperture_convention,observations_reused_for_budget_only:run.reusedObservations},
      initialization:{shared_once_in_same_worker:true,private_runtime_provenance:'Both fit calls use the identical runtime-issued initialize() handle; public JSON is evidence, not an importable initializer',output:run.initialization},
      results:run.results,timing:{...run.times,scope:'Measured on this browser/device; sequential method order scattering then hybrid; includes history recording and variable runtime warm-up'},
      evaluation_only:{notice:'Simulation truth and evaluation only; never transmitted to worker or used to select estimator states',truth:s.truth,ledger:s.ledger.evaluation_only,metrics:run.metrics},
      limitations:['Independent complex gain per path and channel absorbs carrier phase','Reference delays are fixed after data-only initialization','Every modeled reflection bounce must lie inside V, even at zero gain','Left-anchored aperture also changes reference viewpoint and finite support','Candidate counts are not all FLOPs; sample energy is not calibrated physical energy','Truth association is partial delay-only with 0.5 ns gate; unavailable geometry remains null','Convergence and lower observed SSE do not prove geometry accuracy']});
  }
  function knownModel(s){const D=s.aperture;return {tx:[[1,0]],rx:Array.from({length:48},(_,q)=>[2+D*q/47,0]),region:[0,6.5,.05,6.5],reference_pair:23,path_count:2,max_delay_ns:55};}
  const text=(x,y,s,extra='')=>'<text x="'+x+'" y="'+y+'" '+extra+'>'+esc(s)+'</text>';
  function line(x1,y1,x2,y2,attrs=''){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" '+attrs+'/>';}
  function poly(points,attrs=''){return '<polyline points="'+points.map(p=>p.map(v=>Number(v.toFixed(3))).join(',')).join(' ')+'" fill="none" '+attrs+'/>';}
  function mapSVG(model,states,selectedPath,truth,core,id,frame){
    const min=-.5,max=7,span=max-min,left=58,top=25,size=500,x=v=>left+(v-min)/span*size,y=v=>top+(max-v)/span*size;
    const clip='gcs-clip-'+id;let out='<title>物理地图，x 与 y 均为米</title><desc>两图相同范围 −0.5 到 7 m，等比例；当前回看更新 '+frame+'</desc><defs><clipPath id="'+clip+'"><rect x="58" y="25" width="500" height="500"/></clipPath></defs><rect class="gcs-plot-bg" x="58" y="25" width="500" height="500"/>';
    for(let v=0;v<=6;v++){out+=line(x(v),top,x(v),top+size,'class="gcs-gridline"')+line(left,y(v),left+size,y(v),'class="gcs-gridline"')+text(x(v),550,v,'text-anchor="middle"')+text(45,y(v)+5,v,'text-anchor="end"');}
    out+='<rect x="'+x(0)+'" y="'+y(6.5)+'" width="'+(6.5/span*size)+'" height="'+(6.45/span*size)+'" fill="#eff5f5" fill-opacity=".45" stroke="#719399" stroke-dasharray="4 4"/>'+text(x(.08),y(6.3),'搜索区 V')+text(313,580,'x（m）','text-anchor="middle"')+text(16,280,'y（m）','transform="rotate(-90 16 280)" text-anchor="middle"');
    out+='<g clip-path="url(#'+clip+')">';
    if(states&&states[selectedPath]&&core){const ellipse=core.ellipsePoints(states[selectedPath].reference_delay,Array.from({length:181},(_,i)=>i*2*Math.PI/180),model).filter(p=>p.every(Number.isFinite));if(ellipse.length)out+=poly(ellipse.map(p=>[x(p[0]),y(p[1])]),'stroke="#929ea6" stroke-width="1.5" stroke-dasharray="3 5"');}
    model.rx.forEach((r,q)=>{out+='<circle cx="'+x(r[0])+'" cy="'+y(r[1])+'" r="'+(q===model.reference_pair?4:2)+'" fill="'+(q===model.reference_pair?'#c37225':'#334a5f')+'"/>';});
    model.tx.forEach(t=>{out+='<rect x="'+(x(t[0])-5)+'" y="'+(y(t[1])-5)+'" width="10" height="10" fill="#1b465c"/>';});
    if(states)states.forEach((s,i)=>{const color=['#147d79','#b95b37'][i];if(s.point===null)return;
      if(s.kind==='reflection'&&s.normal){const d=[-s.normal[1],s.normal[0]];out+=line(x(s.point[0]-20*d[0]),y(s.point[1]-20*d[1]),x(s.point[0]+20*d[0]),y(s.point[1]+20*d[1]),'stroke="'+color+'" stroke-opacity=".45" stroke-width="2" stroke-dasharray="9 5"');}
      if(s.bounce_points){const powers=Array.from(s.gains.real,(v,q)=>v*v+s.gains.imag[q]**2),peak=Math.max(...powers,1e-30);s.bounce_points.forEach((p,q)=>{out+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="'+(2+3*Math.sqrt(powers[q]/peak))+'" fill="'+color+'" fill-opacity="'+(.15+.65*powers[q]/peak)+'"/>';});}
      out+='<circle cx="'+x(s.point[0])+'" cy="'+y(s.point[1])+'" r="6" fill="'+(s.kind==='reflection'?'white':color)+'" stroke="'+color+'" stroke-width="2"/>'+text(x(s.point[0])+10,y(s.point[1])-10,(i+1)+' '+KIND[s.kind]);
    });
    if(truth){out+='<circle cx="'+x(truth.point[0])+'" cy="'+y(truth.point[1])+'" r="10" fill="none" stroke="#6b42b0" stroke-width="2"/>'+line(x(truth.surface_point[0]),y(truth.surface_point[1]),x(truth.surface_end[0]),y(truth.surface_end[1]),'stroke="#6b42b0" stroke-width="5" stroke-dasharray="3 3"')+text(x(truth.point[0])+12,y(truth.point[1])+20,'真值（紫色）');}
    out+='</g>'+text(x(1),y(0)+24,'Tx','text-anchor="middle"')+text(x(model.rx[23][0]),y(0)+24,'Rx（橙色为参考）','text-anchor="middle"');
    if(!states||states.every(s=>s.point===null))out+=text(310,300,states?'尚未得到有效几何':'等待实际估计','text-anchor="middle"');
    return out;
  }
  function graphSVG(series,{width=1000,height=250,xMin=0,xMax=1,yMin=0,yMax=1,xLabel='',yLabel='',markers=[]}={}){
    const L=75,R=25,T=24,B=52,w=width-L-R,h=height-T-B,dx=xMax-xMin||1,dy=yMax-yMin||1,x=v=>L+(v-xMin)/dx*w,y=v=>T+h-(v-yMin)/dy*h;
    let out='<rect class="gcs-plot-bg" x="0" y="0" width="'+width+'" height="'+height+'"/>';
    for(let i=0;i<=4;i++){let v=yMin+(yMax-yMin)*i/4;out+=line(L,y(v),width-R,y(v),'class="gcs-gridline"')+text(L-10,y(v)+4,fmt(v,3),'text-anchor="end"');v=xMin+(xMax-xMin)*i/4;out+=text(x(v),height-B+24,fmt(v,3),'text-anchor="middle"');}
    markers.forEach(m=>{out+=line(x(m.x),T,x(m.x),T+h,'stroke="'+(m.color||'#cbd4d8')+'" stroke-dasharray="3 4"');});
    series.forEach((s,i)=>{if(s.points.length)out+=poly(s.points.map(p=>[x(p[0]),y(p[1])]),'stroke="'+s.color+'" stroke-width="2.3" '+(s.dash?'stroke-dasharray="7 4"':''));out+=text(L+i*270,T-6,s.label,'fill="'+s.color+'"');});
    out+=text((L+width-R)/2,height-6,xLabel,'text-anchor="middle"')+text(16,T+h/2,yLabel,'transform="rotate(-90 16 '+(T+h/2)+')" text-anchor="middle"');
    if(!series.some(s=>s.points.length))out+=text(width/2,height/2,'等待实际计算','text-anchor="middle"');return out;
  }
  function boot(doc,win){
    if(!doc.getElementById('gcs-root'))return null;
    const $=id=>doc.getElementById('gcs-'+id),G=win.NearfieldGCSAGE,O=win.GCSAGEObservations,now=()=>win.performance&&win.performance.now?win.performance.now():Date.now();
    const state={token:0,worker:null,timer:null,run:null,cache:null,started:false,frames:{scattering:0,hybrid:0},disabled:false,settingsKey:null};
    let record=null;
    // Capture guard is registered before ExperimentRecord's download listener.
    $('download').addEventListener('click',event=>{let valid=false;try{valid=!!(state.run&&state.run.complete&&JSON.stringify(readSettings(doc))===state.settingsKey);}catch(_){}if(!valid){event.preventDefault();event.stopImmediatePropagation();invalidate('设置已改变：请重新计算后再导出');}},true);
    if(win.ExperimentRecord)record=win.ExperimentRecord.create({disclosure:$('record'),output:$('record-preview'),button:$('download'),status:$('record-status')});
    const setStatus=(message,error=false)=>{$('status').textContent=message;$('status').dataset.error=String(error);};
    function stopWorker(){if(state.worker){state.worker.terminate();state.worker=null;}if(state.timer!==null){win.clearTimeout(state.timer);state.timer=null;}}
    function setBusy(busy){$('run').disabled=state.disabled||busy;$('cancel').disabled=!busy;$('noise').disabled=state.disabled;}
    function currentModel(){if(state.run)return state.run.sample.model;try{return knownModel(readSettings(doc));}catch(_){return knownModel(DEFAULTS);}}
    function clearCanvas(){const c=$('delay'),ctx=c.getContext&&c.getContext('2d');if(ctx)ctx.clearRect(0,0,c.width,c.height);}
    function invalidate(message){
      stopWorker();state.token++;if(record)record.clear();$('download').disabled=true;state.run=null;state.settingsKey=null;state.frames={scattering:0,hybrid:0};setBusy(false);
      $('truth').checked=false;$('evaluation').hidden=true;$('truth-summary').textContent='';$('prediction-feedback').textContent='';$('metrics').innerHTML='';
      $('delay-summary').textContent='尚无本次观测数据';$('initial').textContent='';$('sample').textContent='尚无样本';$('common-cost').textContent='初始化仅计算一次。尚无本次计算资源数据。';clearCanvas();
      for(const mode of MODES){$('summary-'+mode).textContent='尚未估计';$('cost-'+mode).textContent='';}
      $('reference').innerHTML=graphSVG([],{width:700,height:230,xMax:55,yMin:-60,yMax:0,xLabel:'总延迟（ns）',yLabel:'匹配功率（dB）'});
      render();if(message)setStatus(message);
    }
    function fail(message,permanent=false){invalidate('本次计算未完成：'+message);setStatus('本次计算未完成：'+message,true);if(permanent){state.disabled=true;['run','noise','cancel','snr','aperture','bandwidth','seed','budget','scene','auto','truth','reset'].forEach(id=>$(id).disabled=true);}}
    function acquisitionSummary(){const m=currentModel();let s;try{s=readSettings(doc);}catch(_){$('acquisition').textContent='设置无效，请修正种子或采样参数';return;}
      $('acquisition').textContent='48×64 = 3072 个复观测；两方法各 96 个自由复增益。Rx x：2…'+fmt(2+s.aperture,12)+' m，间距 '+fmt(s.aperture/47,7)+' m；参考 q=23，x='+fmt(m.rx[23][0],8)+' m。频点间隔 '+fmt(s.bandwidthHz/63/1e6,6)+' MHz；1/B='+fmt(1e9/s.bandwidthHz)+' ns；时延混叠周期 '+fmt(63e9/s.bandwidthHz,6)+' ns > 55 ns。';
    }
    function resultStates(mode){const r=state.run&&state.run.results[mode];return r?replayHistory(r,Math.min(state.frames[mode],r.trace.length-1)):null;}
    function render(){
      const run=state.run,model=currentModel(),selected=Number($('path').value)||0,truth=run&&$('truth').checked?run.sample.truth:null;
      MODES.forEach(mode=>{$('map-'+mode).innerHTML=mapSVG(model,resultStates(mode),selected,truth,G,mode,state.frames[mode]);$('map-'+mode).setAttribute('data-history-index',state.frames[mode]);});
      acquisitionSummary();renderHistory();renderPlots();renderEvaluation();
    }
    function renderHistory(){const run=state.run,mode=$('method').value,r=run&&run.results[mode],i=r?Math.min(state.frames[mode],r.trace.length-1):0;
      $('history').max=r?r.trace.length-1:0;$('history').value=i;$('history').disabled=!r;$('history-out').textContent=i+' / '+(r?r.trace.length-1:0);$('prev').disabled=!r||i===0;$('next').disabled=!r||i===r.trace.length-1;$('final').disabled=!r||i===r.trace.length-1;
      if(!r){$('update').textContent='所选方法尚无已计算更新';return;}
      const tr=r.trace[i],u=i?r.history.updates[i-1]:null,budget=u?u.cumulative_budget:r.history.initial.cumulative_budget;
      $('update').textContent=NAMES[mode]+' · 更新 '+i+'，扫描轮 '+tr.sweep+'；SSE '+fmt(tr.sse,9)+(u?'；活跃路径 '+(u.path+1)+'；来源 '+u.chosen_source+'；'+(u.geometry_changed?'几何有变化':'几何未变')+'；'+(u.accepted?'接受计算状态':'拒绝并保留前态')+'。子问题 SSE：原状态增益重拟合 '+fmt(u.incumbent_subproblem_sse,8)+'，散射 '+fmt(tr.scattering_subproblem_sse,8)+'（'+tr.scattering_search_status+'），反射 '+fmt(tr.reflection_subproblem_sse,8)+'（'+tr.reflection_search_status+'）。':'；数据初始化，尚无几何。')+' 累计有效候选：散射 '+budget.scattering_candidates+'，反射 '+budget.reflection_candidates+'；累计候选投影 '+(budget.scattering_tone_products+budget.reflection_tone_products)+'，原状态重拟合 '+budget.incumbent_tone_products+' 个通道×频点乘积；到此耗时 '+fmt((u?u.elapsed_seconds:r.history.initial.elapsed_seconds)*1000,5)+' ms。';
    }
    function renderPlots(){
      const run=state.run,results=run?run.results:{},available=MODES.filter(m=>results[m]),path=Number($('path').value)||0;
      const colors={scattering:'#207b78',hybrid:'#784dae'},maxSteps=Math.max(1,...available.map(m=>results[m].trace.length-1)),maxSSE=Math.max(1,...available.flatMap(m=>results[m].trace.map(t=>t.sse)));
      const series=available.map(m=>({label:NAMES[m],color:colors[m],dash:m==='hybrid',points:results[m].trace.map((t,i)=>[i,t.sse])}));
      const markers=Array.from({length:Math.floor(maxSteps/2)},(_,i)=>({x:(i+1)*2}));if(results[$('method').value])markers.push({x:state.frames[$('method').value],color:'#be722d'});
      $('trace').innerHTML=graphSVG(series,{width:1000,height:270,xMax:maxSteps,yMax:maxSSE*1.04,xLabel:'已执行的逐路径更新（0=初始化）',yLabel:'观测 SSE',markers});
      $('trace-summary').textContent=available.length?available.map(m=>NAMES[m]+'：初始 '+fmt(results[m].trace[0].sse,8)+' → 最后 '+fmt(results[m].trace.at(-1).sse,8)+'；'+(results[m].trace.length-1)+' 次实际更新').join('；'):'没有已计算更新';
      const gains=available.map(m=>{const s=resultStates(m)[path];return {label:NAMES[m]+' · 更新 '+state.frames[m],color:colors[m],dash:m==='hybrid',points:Array.from(s.gains.real,(v,q)=>[run.sample.model.rx[q][0],v*v+s.gains.imag[q]**2])};});
      const model=currentModel(),maxGain=Math.max(.001,...gains.flatMap(s=>s.points.map(p=>p[1])));
      $('gains').innerHTML=graphSVG(gains,{width:1000,height:240,xMin:model.rx[0][0],xMax:model.rx.at(-1)[0],yMax:maxGain*1.06,xLabel:'接收位置 x（m）',yLabel:'|α|²（线性）'});
      $('values').textContent=available.length?available.map(m=>{const states=resultStates(m);return NAMES[m]+'，回看更新 '+state.frames[m]+'\n'+states.map((s,i)=>'路径 '+(i+1)+'：'+KIND[s.kind]+'，固定参考延迟 '+fmt(s.reference_delay*1e9,10)+' ns，点 '+(s.point?s.point.map(v=>fmt(v,9)).join(', ')+' m':'null（未定位）')+(s.normal?'，法向 '+s.normal.map(v=>fmt(v,8)).join(', '):'')).join('\n')+'\n全部实际 SSE：'+results[m].trace.map(t=>fmt(t.sse,10)).join(', ')+'\n所选路径逐接收位置功率（x m: |α|²）：\n'+gains.find(s=>s.label.startsWith(NAMES[m])).points.map(p=>fmt(p[0],8)+': '+fmt(p[1],8)).join('\n');}).join('\n\n'):'尚无估计结果';
    }
    function drawDelay(){const run=state.run;if(!run)return;const d=run.display,c=$('delay'),ctx=c.getContext&&c.getContext('2d');
      if(ctx){ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);const L=74,T=12,W=c.width-110,H=c.height-65;
        for(let q=0;q<d.power.rows;q++)for(let p=0;p<d.power.cols;p++){const v=(d.relative_power_db.values[q*d.power.cols+p]-d.floor_db)/(-d.floor_db);ctx.fillStyle='rgb('+Math.round(238-205*v)+','+Math.round(246-117*v)+','+Math.round(249-101*v)+')';ctx.fillRect(L+p/d.power.cols*W,T+(d.power.rows-1-q)/d.power.rows*H,W/d.power.cols+.5,H/d.power.rows+.5);}
        ctx.font='14px system-ui';ctx.fillStyle='#23414e';ctx.textAlign='center';for(let i=0;i<=5;i++)ctx.fillText(String(i*11),L+i/5*W,T+H+21);ctx.fillText('总延迟 τ（ns） · 浅色 −60 dB → 深色 0 dB',L+W/2,c.height-8);ctx.textAlign='right';ctx.fillText(fmt(run.sample.model.rx.at(-1)[0],5)+' m',L-8,T+13);ctx.fillText('2 m',L-8,T+H);ctx.fillText('Rx x',L-8,T+H/2);const refY=T+(48-23-.5)/48*H;ctx.strokeStyle='#e79e46';ctx.beginPath();ctx.moveTo(L,refY);ctx.lineTo(L+W,refY);ctx.stroke();}
      $('delay-summary').textContent='本次观测 SHA-256：'+run.hash+'。48×256 个显示格，单一整图功率参考 '+fmt(d.peak_power,7)+'；橙横线为 q=23。'+(ctx?'':'绘图不可用；下方参考切片与数值仍可读。');
      const markers=run.initialization?run.initialization.reference_delays_ns.map(v=>({x:v,color:'#b96929'})):[];
      $('reference').innerHTML=graphSVG([{label:'参考 q=23 的观测匹配',color:'#207b78',points:d.delays_ns.map((v,i)=>[v,d.reference_relative_power_db[i]])}],{width:700,height:230,xMax:55,yMin:-60,yMax:0,xLabel:'总延迟（ns）',yLabel:'相对匹配功率 dB',markers});
      sampleReadout();
    }
    function sampleReadout(){const run=state.run;if(!run)return;const q=Number($('sample-q').value),p=Number($('sample-p').value);if(!Number.isInteger(q)||q<0||q>=48||!Number.isInteger(p)||p<0||p>=64){$('sample').textContent='请输入有效的整数样本索引';return;}
      const k=q*64+p,y=run.sample.observations,m=run.sample.model;$('sample').textContent='Y['+q+','+p+'] = '+fmt(y.real[k],10)+' '+(y.imag[k]<0?'−':'+')+' j '+fmt(Math.abs(y.imag[k]),10)+'；Rx ('+fmt(m.rx[q][0],10)+', 0) m；ν='+fmt(m.frequencies[p]/1e6,9)+' MHz。参考响应 '+[0,10,20,30,40,55].map(t=>{const i=Math.round(t/55*(run.display.delays_ns.length-1));return fmt(run.display.delays_ns[i],4)+' ns: '+fmt(run.display.reference_relative_power_db[i],5)+' dB';}).join('；');
    }
    function resultSummary(mode){const run=state.run,r=run.results[mode],last=r.trace.at(-1),relative=10*Math.log10(Math.max(last.sse,1e-300)/energy(run.sample.observations)),b=r.budget;
      $('summary-'+mode).textContent='观测 SSE '+fmt(last.sse,9)+'；10 log₁₀(SSE/‖Y‖²)='+fmt(relative,6)+' dB；'+last.sweep+' 轮。'+(r.converged?'目标稳定（满足相对容差）':'达到扫描轮预算（未证明收敛）')+'。'+r.states.map((s,i)=>'路径 '+(i+1)+'：'+KIND[s.kind]).join('；');
      $('cost-'+mode).textContent='有效候选：散射 '+b.scattering_candidates+'，反射 '+b.reflection_candidates+'。候选投影 '+(b.scattering_tone_products+b.reflection_tone_products)+'；原状态重拟合 '+b.incumbent_tone_products+' 个通道×频点乘积。本机此方法实测 '+fmt(run.fitMs[mode],5)+' ms（核心记录 '+fmt(b.seconds*1000,5)+' ms）。';
    }
    function renderEvaluation(){const run=state.run,show=!!(run&&$('truth').checked);$('evaluation').hidden=!show;if(!show)return;
      const prediction=$('prediction-certain').checked?'你预测“残差低就一定更准”。':$('prediction-not-certain').checked?'你预测“不一定更准”。':'你选择先检查本次数据。';$('prediction-feedback').textContent=prediction+'更低 SSE 只表示更贴近本次带噪观测，不保证点位置、反射面和机制都更准。对照下面每项真值误差；不能只挑一个有利指标。';
      const truth=run.sample.truth,l=run.sample.ledger.evaluation_only;$('truth-summary').textContent='仅仿真真值：点 (1,1) m；有限反射段 (1.5,2)–(2,2) m。实际接收 SNR '+fmt(l.realized_received_snr_db,6)+' dB；反射在 '+l.reflection_visible_samples+'/48 个接收位置可见，参考位置'+(truth.visibility[1][23]?'可见':'不可见')+'。真值参考延迟 '+truth.delays.map(a=>fmt(a[23]*1e9,8)+' ns').join('、')+'。';
      if(!run.complete){$('metrics').textContent='完整比较完成后显示真值关联与精度；开关不会影响当前求解。';return;}
      $('metrics').innerHTML=MODES.map(mode=>{const m=run.metrics[mode];return '<article><h4>'+NAMES[mode]+' · 最终结果的仿真评估</h4><p>干净信道 NMSE '+fmt(m.clean_nmse_db,7)+' dB；无法关联的估计 '+(m.unmatched_estimate_indices.length?m.unmatched_estimate_indices.map(i=>i+1).join('、'):'无')+'。</p><ul>'+m.paths.map((p,i)=>'<li>真值路径 '+(i+1)+'（'+KIND[p.truth_kind]+'）：'+(!p.target_present?'本次不存在':!p.matched?'未关联；几何误差为空':('关联估计 '+(p.estimated_index+1)+'（'+KIND[p.estimated_kind]+'）；参考时延误差 '+fmt(p.reference_delay_error_ns,6)+' ns；可见交互点 RMS '+fmt(p.interaction_rmse_m,6)+' m；点误差 '+fmt(p.point_error_m,6)+' m；法向误差 '+fmt(p.normal_error_deg,6)+'°；线偏移误差 '+fmt(p.plane_distance_error_m,6)+' m'))+(p.geometry_null_reason?'。空值原因：'+esc(p.geometry_null_reason):'')+'</li>').join('')+'</ul><p>'+(m.mechanism_score_applicable?'延迟关联后的机制检查：'+(m.mechanisms_correct?'本次正确':'本次有错或无法关联'):'仅散射比较器没有反射标签，机制正确率不适用')+'。关联不用机制标签作为先验。</p></article>';}).join('');
    }
    function settingsMatch(){try{return state.settingsKey===JSON.stringify(readSettings(doc));}catch(_){return false;}}
    function start(){
      if(state.disabled)return;let settings;try{settings=readSettings(doc);}catch(e){fail(e.message);return;}
      invalidate();state.started=true;state.settingsKey=JSON.stringify(settings);const token=state.token,startTime=now();setBusy(true);setStatus('正在生成本次复观测…');
      try{
        const key=acquisitionKey(settings),reused=!!(state.cache&&state.cache.key===key&&state.cache.budget!==settings.budget),sample=reused?state.cache.sample:O.generate(configFor(settings));
        if(sample.simulator_version!==SIMULATOR||O.GEOMETRY_VERSION!==ALGORITHM)throw new Error('仿真器与估计模型版本不匹配');
        state.cache={key,sample,budget:settings.budget};const hash=G.observationHash(sample.observations),modelHash=G.modelHash(sample.model),options=optionsFor(settings.budget);
        state.run={sample,hash,modelHash,options,reusedObservations:reused,results:{},fitMs:{},metrics:null,complete:false,startTime,settings:clone(settings),display:O.matchedDelay(sample.observations,sample.model,{points:256,minDelayNs:0,maxDelayNs:55,floorDb:-60})};
        drawDelay();render();
        const worker=new win.Worker('nearfield-gc-sage-worker.js?v=gc-sage-live-20261012-1');state.worker=worker;
        worker.onerror=event=>{if(token!==state.token||worker!==state.worker)return;fail('Worker 执行失败：'+(event.message||'请检查核心/Worker 资源是否可加载'));};
        worker.onmessage=event=>{
          const data=event.data;if(token!==state.token||worker!==state.worker||!data||data.runId!==token)return;
          if(!settingsMatch()){invalidate('设置已改变，旧结果已清除，请重新估计');return;}
          try{
            const run=state.run;
            if(data.type==='error'){fail(data.message);return;}
            if(data.type==='phase'){setStatus(({initializing:'正在由参考位置数据初始化两条时延…',scattering:'正在拟合仅散射候选…',hybrid:'仅散射完成；正在拟合散射＋反射候选…'})[data.phase]||'正在计算…');return;}
            if(data.type==='initialized'){
              if(data.initialization.algorithm_version!==ALGORITHM||data.initialization.observation_sha256!==run.hash||data.initialization.model_sha256!==run.modelHash)throw new Error('初始化版本或输入哈希不一致');
              run.initialization=data.initialization;$('initial').textContent='数据估计的初始参考延迟：'+run.initialization.reference_delays_ns.map(v=>fmt(v,10)+' ns').join('、')+'；之后空间搜索保持这些时延。单参考初始化 SSE（不是全 Y）：'+run.initialization.delay_trace_sse.map(v=>fmt(v,7)).join(' → ')+'。';drawDelay();return;
            }
            if(data.type==='result'){
              const r=data.result;if(!MODES.includes(data.mode)||r.mode!==data.mode||r.algorithm_version!==ALGORITHM||r.observation_sha256!==run.hash||!r.history||r.history.schema_version!==HISTORY||!r.initialization||r.initialization.model_sha256!==run.modelHash)throw new Error('估计输出版本、历史或输入哈希不一致');
              if(!Array.isArray(r.trace)||!r.trace.length||!Array.isArray(r.states)||r.states.length!==2||!Array.isArray(r.history.updates)||r.history.updates.length!==r.trace.length-1||typeof r.converged!=='boolean'||!['relative objective tolerance','sweep budget reached'].includes(r.stopping_reason)||!Number.isFinite(data.fit_wall_ms)||data.fit_wall_ms<0)throw new Error('估计输出结构或终止状态无效');
              jsonSafe(r);
              const reconstructed=G.predict(replayHistory(r,r.trace.length-1),run.sample.model.frequencies),actualSSE=G.residualSSE(run.sample.observations,reconstructed),reported=r.trace.at(-1).sse;
              if(!Number.isFinite(reported)||Math.abs(actualSSE-reported)>1e-8*Math.max(1,reported)||G.residualSSE(reconstructed,r.prediction)>1e-16*Math.max(1,energy(r.prediction)))throw new Error('最终历史、预测与残差不一致');
              run.results[data.mode]=r;run.fitMs[data.mode]=data.fit_wall_ms;state.frames[data.mode]=r.trace.length-1;resultSummary(data.mode);render();return;
            }
            if(data.type==='complete'){
              if(data.algorithm_version!==ALGORITHM||data.observation_sha256!==run.hash||data.model_sha256!==run.modelHash||!data.shared_initialization||!run.initialization||MODES.some(m=>!run.results[m]))throw new Error('不完整或输入不一致的比较，不能导出');
              run.metrics=Object.fromEntries(MODES.map(m=>[m,O.evaluate(run.results[m],run.sample.observations,run.sample.model,run.sample.truth,{visibilityHeuristic:false})]));
              run.times={...data.times,end_to_end_ms:0,end_to_end_scope:'Sampling, worker startup, initialization, both fits, evaluation and completed-result render; excludes JSON serialization/download'};run.completedAt=new Date().toISOString();run.complete=true;render();run.times.end_to_end_ms=now()-run.startTime;
              const completedRecord=buildRecord(run);record.clear();record.update(completedRecord,'nearfield-gc-sage-'+run.sample.config.seed+'-'+run.hash.slice(0,12)+'.json');
              stopWorker();setBusy(false);$('common-cost').textContent='同一观测 '+run.hash.slice(0,16)+'…；同一运行时初始化一次，'+fmt(data.times.initialization_ms,5)+' ms；时延候选 '+run.initialization.budget.delay_candidates+'，时延投影 '+run.initialization.budget.delay_tone_products+'。两方法顺序数值阶段 '+fmt(data.times.worker_total_ms,5)+' ms；采样至完整比较 '+fmt(run.times.end_to_end_ms,5)+' ms（含完成图绘制，不含 JSON 序列化/下载）。'+(run.reusedObservations?'本次重用同配置原 Y（不是独立试验）。':'本次从所示种子新生成 Y。');
              setStatus('两种方法均已完成。'+(MODES.every(m=>run.results[m].converged)?'双方目标已稳定；':'至少一种达到预算上限；')+'可回看真实更新，再揭示真值。');render();return;
            }
          }catch(error){fail(error.message);}
        };
        // Structured clone without transfer: main-thread observations remain intact for evaluation/export.
        worker.postMessage({runId:token,observations:sample.observations,model:sample.model,options});
      }catch(error){fail(error.message);}
    }
    function schedule(){if(state.started&&$('auto').checked&&!state.disabled){state.timer=win.setTimeout(()=>{state.timer=null;start();},280);}}
    function edit(){invalidate('设置已改变，旧结果和下载已清除');schedule();}
    function applyDefaults(scene='normal'){const names={snr:'snrDb',aperture:'aperture',bandwidth:'bandwidthHz',seed:'seed',budget:'budget',scene:'scene'};Object.entries(names).forEach(([id,key])=>{$(id).value=key==='scene'?scene:String(DEFAULTS[key]);});}
    ['snr','aperture','bandwidth','seed','budget'].forEach(id=>{$(id).addEventListener('input',()=>invalidate('设置已编辑，旧结果和下载已清除'));$(id).addEventListener('change',edit);});
    $('scene').addEventListener('input',()=>invalidate('预设已改变，旧结果已清除'));$('scene').addEventListener('change',()=>{const scene=$('scene').value;applyDefaults(scene);edit();});
    $('auto').addEventListener('change',()=>{if(!$('auto').checked&&state.timer!==null){win.clearTimeout(state.timer);state.timer=null;}else if($('auto').checked&&state.started&&!state.run)schedule();});
    $('run').addEventListener('click',start);$('cancel').addEventListener('click',()=>invalidate('已终止本次 Worker。部分结果不可导出；可重新开始。'));
    $('reset').addEventListener('click',()=>{applyDefaults();$('auto').checked=true;$('method').value='hybrid';$('path').value='0';$('sample-q').value='23';$('sample-p').value='32';for(const choice of ['certain','not-certain','inspect'])$('prediction-'+choice).checked=choice==='inspect';state.started=false;state.cache=null;invalidate('已恢复默认，尚未采样。');});
    $('noise').addEventListener('click',()=>{let s;try{s=readSettings(doc);}catch(e){fail(e.message);return;}$('seed').value=String((s.seed+1)>>>0);start();});
    for(const choice of ['certain','not-certain','inspect'])$('prediction-'+choice).addEventListener('change',renderEvaluation);
    $('truth').addEventListener('change',render);$('path').addEventListener('change',render);$('method').addEventListener('change',render);
    $('history').addEventListener('input',()=>{state.frames[$('method').value]=Number($('history').value);render();});
    for(const [id,delta] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{const mode=$('method').value,r=state.run&&state.run.results[mode];if(r){state.frames[mode]=Math.max(0,Math.min(r.trace.length-1,state.frames[mode]+delta));render();}});
    $('final').addEventListener('click',()=>{const mode=$('method').value,r=state.run&&state.run.results[mode];if(r){state.frames[mode]=r.trace.length-1;render();}});
    ['sample-q','sample-p'].forEach(id=>$(id).addEventListener('input',sampleReadout));
    win.addEventListener('pagehide',()=>{stopWorker();if(record)record.clear();});
    invalidate();
    if(!G||!O||!record||typeof win.Worker!=='function')fail('需要可用的估计核心、观测模块、记录模块与 Web Worker。静态解释仍可阅读。',true);
    else if(G.VERSION!==ALGORITHM||G.HISTORY_SCHEMA_VERSION!==HISTORY||O.VERSION!==SIMULATOR||O.GEOMETRY_VERSION!==ALGORITHM)fail('模块版本不一致，请刷新后核对发布资源。',true);
    return {start,invalidate,state,render};
  }
  return Object.freeze({VERSION,ALGORITHM,SIMULATOR,HISTORY,DEFAULTS,optionsFor,readSettings,replayHistory,buildRecord,mapSVG,graphSVG,boot});
}));
