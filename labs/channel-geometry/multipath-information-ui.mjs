import * as core from './multipath-information-core/multipath-fisher-core.mjs';
import {createLessonController} from './multipath-information-controller.mjs';
import {number,statusText,sweepPlot,sweepGaps,pulsePlot,ellipsePlot,emptyPlot,conclusion,gainBars,diagnosticText} from './multipath-information-views.mjs';

export function mountLesson(root) {
  const $ = id => root.querySelector(`#mpi-${id}`);
  let view='bound', latestState=null, lastAnnouncement='', lastRecord=null, lastSweep=null;
  let inputStarted=performance.now(), importSerial=0, lastExtent=null;
  const phaseHistory=new Map();
  const workerFactory=typeof Worker==='function'?()=>new Worker(new URL('./multipath-information-core/multipath-fisher-worker.mjs',import.meta.url),{type:'module'}):null;
  const controller=createLessonController({core,workerFactory,onState:render});
  root.querySelectorAll('button,input,select').forEach(el=>{el.disabled=false;});
  function readInput(){return {heightM:Number($('height').value),phaseRad:Number(root.querySelector('input[name="mpi-phase"]:checked').value),noiseMode:$('noise').value};}
  function syncControls(input){
    if(core.HEIGHTS.includes(input.heightM))$('height').value=String(input.heightM);
    root.querySelectorAll('input[name="mpi-phase"]').forEach(el=>{el.checked=Number(el.value)===input.phaseRad;});
    if(['white','colored'].includes(input.noiseMode))$('noise').value=input.noiseMode;
    if(input.heightM>1)$('near').checked=false;
  }
  function select(input=readInput()){
    importSerial++; inputStarted=performance.now(); syncControls(input); $('import-message').textContent='';
    controller.select(input);
  }
  function announce(message){if(message!==lastAnnouncement){$('status').textContent=message;lastAnnouncement=message;}}
  function render(state){
    latestState=state;
    const r=state.current;
    root.dataset.mpiState=state.status; root.dataset.mpiGeneration=state.generation;
    root.dataset.mpiRecordId=r?.recordId||''; root.dataset.mpiSweepId=state.sweep?.recordId||'';
    $('download-scene').disabled=!r?.validatedDomain||['pending','cancelled'].includes(state.status);
    $('download-sweep').disabled=state.sweepStatus!=='complete'||!state.sweep||state.sweep.partial;
    $('cancel').disabled=state.status!=='pending'&&state.sweepStatus!=='pending'&&state.sweepStatus!=='replaying';
    $('retry').disabled=state.status==='pending';
    $('scene-label').textContent=`h=${number(state.input.heightM)} m · φ=${number(state.input.phaseRad)} rad · ${state.input.noiseMode==='colored'?'固定 PDP':'白噪声'}`;
    $('separation').textContent=r?.geometry?`${number(r.geometry.delaySeparationNs/r.resource.pulseDurationNs)} × Tp`:'—';
    $('exact-peb').textContent=r?.exact.status==='finite'?`${number(r.exact.pebM)} m`:'—';
    $('approx-peb').textContent=r?.approximate.status==='finite'?`${number(r.approximate.pebM)} m`:'—';
    $('branch-message').textContent=statusText(r?.exact||state.status);
    $('colored-note').hidden=state.input.noiseMode!=='colored';
    $('coincident-note').hidden=!(r?.input.heightM===0&&r.approximate.status==='finite');
    $('conclusion').textContent=conclusion(r);
    if(!r&&!$('prediction-answer').hidden)$('prediction-answer').textContent='正在重算；旧预测读数已清空。';
    $('gain-bars').innerHTML=gainBars(r);
    $('clock-message').textContent=r?`同一记录的时钟未知诊断：${statusText(r.unknownClock)}。两条时延不足以同时确定 x、y 与公共时钟。`:'两条时延不足以同时确定二维位置与一个独立公共时钟；不能给出有限二维 PEB。';
    $('diagnostics').textContent=diagnosticText(r)+(state.error?`\n界面错误：${state.error}`:'');
    renderPlots();
    if(state.status==='pending')announce('正在重算；旧结果已清空');
    else if(r)announce(`${statusText(r.exact)}。${r.exact.reason?`原因：${r.exact.reason}。`:''}`);
    else announce(statusText(state.status));
    if(r && r.recordId!==lastRecord){
      lastRecord=r.recordId; syncControls(state.input);
      if(r.validatedDomain)phaseHistory.set(`${r.input.heightM}|${r.input.noiseMode}|${r.input.phaseRad}`,r);
      renderPrediction();
      const recordId=r.recordId, generation=state.generation;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(latestState?.current?.recordId!==recordId||latestState.generation!==generation)return;
        root.dataset.mpiSelectedPaintMs=(performance.now()-inputStarted).toFixed(2);
        root.dispatchEvent(new CustomEvent('mpi:painted',{detail:{recordId,input:r.input,elapsedMs:Number(root.dataset.mpiSelectedPaintMs)}}));
      }));
    }
    if(state.sweep?.recordId!==lastSweep && state.sweepStatus==='complete'){
      lastSweep=state.sweep.recordId;
      root.dispatchEvent(new CustomEvent('mpi:sweep',{detail:{recordId:lastSweep,status:state.sweepStatus,completed:state.sweep.completed}}));
    }
  }
  function renderPlots(){
    const s=latestState;if(!s)return;
    const r=s.current;
    const width=Math.max(280,Math.min(620,$('main-plot').clientWidth||620));
    const records=s.sweep?.records||s.progress;
    const computed=records.filter(Boolean).filter(r=>r.status!=='cancelled').length;
    root.querySelectorAll('[data-mpi-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mpiView===view)));
    $('bound-options').hidden=view!=='bound';$('pulse-options').hidden=view!=='pulse';
    $('gap-status').hidden=view!=='bound';$('sweep-progress').hidden=view!=='bound';
    if(view==='bound'){
      $('plot-guide').textContent='横轴是真实高度 h，纵轴是米单位 PEB（对数刻度）。实线：完整采样模型；虚线：非重叠近似。小点可选择指定场景，折线仅辅助读数，不计算离网插值。';
      $('main-plot').innerHTML=sweepPlot(records,{heightM:r?.validatedDomain?r.input.heightM:null,near:$('near').checked,pending:s.sweepStatus==='pending',width});
      $('gap-status').innerHTML=sweepGaps(records);
      $('sweep-progress').textContent=s.sweepStatus==='complete'?`10 个指定场景 · 已计算 ${computed} / 10；保留所有失败状态`:
        s.sweepStatus==='pending'||s.sweepStatus==='replaying'?`扫描尚未完成 · 已计算 ${computed} / 10 个场景`:
        s.sweepStatus==='cancelled'?'扫描已取消；没有完整结果':`10 个指定场景 · 尚未完成（已计算 ${computed} / 10）`;
    }else{
      const iq=$('iq').checked;
      $('plot-guide').textContent=iq?'蓝色 I（实部），橙色 Q（虚部）：当前复数均值 μ=Sα。不是噪声实现、功率或分开的接收机输出。':'蓝色直达、橙色反射：实际采样 RRC 实基模板，未乘路径复增益。不是观测功率或分开的接收机输出；只改相位不移动这两条模板。';
      $('main-plot').innerHTML=r?pulsePlot(r,iq,width):emptyPlot('正在重算；旧模板已清空',width);
    }
    const ellipse=ellipsePlot(r);$('ellipse').innerHTML=ellipse.html;
    $('ellipse-scale').textContent=ellipse.extent?`当前两轴共用 ±${number(ellipse.extent)} m。${lastExtent!==null&&lastExtent!==ellipse.extent?'刻度已随场景改变。':'刻度随场景统一调整。'}仅画有限分支。`:'当前无有限的二维椭圆；不沿用旧结果。';
    if(ellipse.extent)lastExtent=ellipse.extent;
  }
  function renderPrediction(){
    if($('prediction-answer').hidden)return;
    const r=latestState?.current;
    if(!r?.geometry){$('prediction-answer').textContent='等待当前场景重新计算。';return;}
    const prompt=$('prompt').value;
    if(prompt==='phase'){
      const comparisons=[0,.3,Math.PI/2,Math.PI].map(phi=>phaseHistory.get(`${r.input.heightM}|${r.input.noiseMode}|${phi}`)).filter(Boolean);
      $('prediction-answer').textContent=`当前两时延为 ${r.geometry.tauNs.map(t=>number(t,6)+' ns').join('、')}。只改相位时它们与模板不变；近似只用增益模长。${comparisons.length>1?'本次实际重算：'+comparisons.map(c=>`φ=${number(c.input.phaseRad)} rad，完整 PEB ${c.exact.status==='finite'?number(c.exact.pebM)+' m':statusText(c.exact)}`).join('；')+'。':'切换上方相位，比较同一高度下实际重算的完整 PEB。'}`;
    }else if(prompt==='overlap'){
      $('prediction-answer').textContent=`当前 Δτ/Tp=${number(r.geometry.delaySeparationNs/r.resource.pulseDurationNs)}。${conclusion(r)} 非重叠近似舍弃交叉项与增益耦合；这不推出重叠总是有害。可切到“脉冲”看实际模板。`;
    }else $('prediction-answer').textContent=conclusion(r);
  }
  $('height').addEventListener('change',()=>select());
  $('noise').addEventListener('change',()=>select());
  root.querySelectorAll('[name="mpi-phase"]').forEach(el=>el.addEventListener('change',()=>select()));
  root.querySelectorAll('[data-mpi-preset]').forEach(el=>el.addEventListener('click',()=>select({...readInput(),heightM:Number(el.dataset.mpiPreset)})));
  $('coincident').addEventListener('click',()=>select({...readInput(),heightM:0}));
  $('reset').addEventListener('click',()=>{view='bound';$('near').checked=true;$('iq').checked=false;$('prompt').value='ordering';$('prediction-answer').hidden=true;select({...core.DEFAULT_INPUT});});
  $('retry').addEventListener('click',()=>select());$('cancel').addEventListener('click',()=>{importSerial++;controller.cancel();});
  root.querySelectorAll('[data-mpi-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.mpiView;renderPlots();}));
  $('near').addEventListener('change',renderPlots);$('iq').addEventListener('change',renderPlots);
  $('main-plot').addEventListener('click',event=>{const target=event.target.closest('[data-mpi-height]');if(target)select({...readInput(),heightM:Number(target.dataset.mpiHeight)});});
  $('main-plot').addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-mpi-height]');if(target){event.preventDefault();select({...readInput(),heightM:Number(target.dataset.mpiHeight)});}});
  $('prompt').addEventListener('change',()=>{$('prediction-answer').hidden=true;select({...core.DEFAULT_INPUT,heightM:$('prompt').value==='ordering'?.5:.1});});
  $('reveal').addEventListener('click',()=>{$('prediction-answer').hidden=false;renderPrediction();});
  function download(record,suffix){
    if(!record)return;
    const blob=new Blob([core.exportRecord(record)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`multipath-information-${suffix}-${record.recordId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('download-scene').addEventListener('click',()=>download(latestState.current,'scene'));
  $('download-sweep').addEventListener('click',()=>{if(latestState.sweepStatus==='complete')download(latestState.sweep,'sweep');});
  $('import').addEventListener('change',async()=>{
    const file=$('import').files[0];if(!file)return;
    const serial=++importSerial;controller.cancel();inputStarted=performance.now();
    $('import-message').textContent='正在读取本地 JSON；随后重新计算。';
    if(file.size>16*1024*1024){$('import-message').textContent='文件超过 16 MiB，请选择本实验导出的完整 JSON。';$('import').value='';return;}
    try{
      const json=await file.text();if(serial!==importSerial)return;
      const record=await controller.replay(json);if(serial!==importSerial)return;
      $('import-message').textContent=record?.status==='invalid-input'?`导入被拒绝：${record.reason}。仅支持指定高度、四相位、固定噪声与匹配版本。`:
        record?`已重新计算 ${record.replayOf||'导入记录'}；没有直接采用保存的结果。`:'导入已被新请求替代。';
    }catch(error){if(serial===importSerial)$('import-message').textContent=`无法读取文件：${error.message}`;}
    finally{if(serial===importSerial)$('import').value='';}
  });
  // Native page lifecycle: prevent work surviving a page that is actually left.
  let resizeTimer;
  const resize=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderPlots,80);};
  const pagehide=()=>{importSerial++;controller.cancel();};
  const pageshow=event=>{if(event.persisted)select(readInput());};
  window.addEventListener('resize',resize);window.addEventListener('pagehide',pagehide);
  window.addEventListener('pageshow',pageshow);
  select({...core.DEFAULT_INPUT});
  return {controller,dispose(){importSerial++;clearTimeout(resizeTimer);controller.dispose();window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);window.removeEventListener('resize',resize);}};
}
if(typeof document!=='undefined'){
  const root=document.getElementById('position-information');
  if(root)mountLesson(root);
}
