/* Canonical-page controller. The frozen Eq.(33) solver runs only in its Worker.
 * No saved solver outputs, automatic solves, or numerical-core modifications. */
(function () {
  'use strict';
  const M = window.CrbMultiuserModel, D = window.CrbMultiuserData;
  const $ = id => document.getElementById(id);
  if (!$('multiuser')) return;
  if (!M || !D) { $('cm-state').textContent = '计算资源未能加载；原单用户课程仍可阅读。'; return; }
  const clone = M.clone, ns = 'http://www.w3.org/2000/svg';
  const MAX_MS = 30000, CANCEL_MS = 250;
  let input = clone(D.DEFAULT_INPUT), runSerial = 0, editSerial = 0, importSerial = 0, active = null;
  let history = [], records = [], lastRecord = null, current = null, queue = null, discarded = false;
  let seed = 290102, seedKind = 'reference input; raw H is authoritative';
  const retiring = new Set();
  const getTime = () => performance.now();
  const number = value => M.fmt(value);
  const plots = ['cm-sinr-chart', 'cm-information-chart', 'cm-tradeoff-chart'];
  // The receiver instance and its accepted source stay private to this controller.
  const receiver = window.CrbReceiverUI?.create({window,document}) || null;
  function text(id, value) { $(id).textContent = value; }
  function node(tag, attrs, value) { const n = document.createElementNS(ns, tag); for (const [k,v] of Object.entries(attrs || {})) n.setAttribute(k,String(v)); if (value !== undefined) n.textContent = String(value); return n; }
  function table(id, rows) { const body = $(id); body.replaceChildren(); for (const row of rows) { const tr = document.createElement('tr'); for (const value of row) { const td = document.createElement('td'); td.textContent = String(value); tr.append(td); } body.append(tr); } }
  function message(value, error = false) { text(error ? 'cm-error' : 'cm-state', value); }
  function clearError() { text('cm-error',''); }
  function chart(id, xmin, xmax, ymin, ymax, ylabel) {
    const svg = $(id), width = Math.max(240,svg.clientWidth || 540), height = 290;
    const left = width < 360 ? 73 : 90, right = width - 20, top = 25, bottom = 229;
    svg.replaceChildren(); svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const x = value => left+(value-xmin)/(xmax-xmin)*(right-left);
    const y = value => bottom-(value-ymin)/(ymax-ymin)*(bottom-top);
    svg.append(node('line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#b9c8cc'}));
    if (ylabel) svg.append(node('text',{x:8,y:14,'font-size':11,fill:'#415a65'},ylabel));
    return {svg,width,height,left,right,top,bottom,x,y,xmin,xmax,ymin,ymax};
  }
  function yAxis(c) { for (const tick of M.axisTicks(c.ymin,c.ymax,5)) { c.svg.append(node('line',{x1:c.left,y1:c.y(tick.value),x2:c.right,y2:c.y(tick.value),stroke:'#e1e9eb'})); c.svg.append(node('text',{x:c.left-8,y:c.y(tick.value)+4,'text-anchor':'end','font-size':10,fill:'#415a65'},tick.label)); } }
  function xAxis(c, ticks, label) { for (const tick of ticks) { c.svg.append(node('line',{x1:c.x(tick.value),y1:c.bottom,x2:c.x(tick.value),y2:c.bottom+4,stroke:'#a0b0b4'})); c.svg.append(node('text',{x:c.x(tick.value),y:c.bottom+19,'text-anchor':Math.abs(c.x(tick.value)-c.right)<1?'end':Math.abs(c.x(tick.value)-c.left)<1?'start':'middle','font-size':10,fill:'#415a65'},tick.label)); } c.svg.append(node('text',{x:(c.left+c.right)/2,y:277,'text-anchor':'middle','font-size':11,fill:'#415a65'},label)); }
  function emptyPlot(id, note) { const c = chart(id,0,1,0,1,''); c.svg.append(node('text',{x:c.width/2,y:133,'text-anchor':'middle','font-size':12,fill:'#62747c'},note)); $(id).setAttribute('aria-label',note); }
  function clearCurrent() {
    receiver?.invalidate('当前设计已清除。请重新求解并取得验收波束。');
    current = null;
    for (const id of ['cm-root-crb','cm-power','cm-gap']) text(id,'—');
    table('cm-users',[]);
    emptyPlot('cm-sinr-chart','重新求解后显示每位用户的 SINR');
    emptyPlot('cm-information-chart','重新求解后显示同一波束的角度信息');
  }
  function updateButtons() {
    $('cm-cancel').disabled = !active;
    $('cm-run').disabled = false;
    $('cm-sweep').disabled = !!active;
    $('cm-export').disabled = !lastRecord;
  }
  function ledger() {
    text('cm-ledger',`${input.Nt} 发射 / ${input.Nr} 接收 · 2 位用户 · L=30 · P=1000 mW · LP=30000 mW·快照 · 两种噪声各 1 mW · θ₀=${input.thetaDegrees}° · α=1（对估计器未知）`);
    text('cm-channel-norms',`H 的行范数：${M.rowNorms(input.H).map(number).join('、')}。不做归一化；每格是复数幅度，不是功率或用户方向。`);
  }
  function setGamma(value) { $('cm-gamma').value = String(value); $('cm-gamma-number').value = String(value); }
  function syncControls() { $('cm-nt').value=String(input.Nt); $('cm-theta').value=String(input.thetaDegrees); setGamma(input.gammaDb); $('cm-seed').value=String(seed); ledger(); }
  function editor() {
    const host = $('cm-channel-editor'); host.replaceChildren();
    const t = document.createElement('table'), head = document.createElement('thead'), hr = document.createElement('tr');
    const first = document.createElement('th'); first.textContent='H 的行'; hr.append(first);
    for (let m=0;m<input.Nt;m++) { const th=document.createElement('th'); th.textContent=`天线 ${m+1}`; hr.append(th); }
    head.append(hr); t.append(head); const body=document.createElement('tbody');
    for (let k=0;k<2;k++) {
      const row=document.createElement('tr'), heading=document.createElement('th'); heading.textContent=`用户 ${k+1}`; row.append(heading);
      for (let m=0;m<input.Nt;m++) {
        const td=document.createElement('td');
        for (const part of ['real','imag']) {
          const label=document.createElement('label'); label.textContent=part==='real'?'实部':'虚部';
          const field=document.createElement('input'); field.type='number'; field.step='any'; field.value=String(input.H[part][k][m]); field.id=`cm-h-${part}-${k}-${m}`;
          field.setAttribute('aria-label',`用户 ${k+1} 天线 ${m+1} ${part==='real'?'实部':'虚部'}`);
          field.addEventListener('input',()=>{ const v=field.value.trim()===''?NaN:Number(field.value); input.H[part][k][m]=v; seedKind='custom H; displayed seed is not its generator'; dirty(true); try { const valid=M.validateInput(input); input=valid; ledger(); clearError(); } catch(e) { text('cm-channel-norms','当前 H 不合法，范数尚未重新计算。');message(e.message,true); } });
          label.append(field); td.append(label);
        }
        row.append(td);
      }
      body.append(row);
    }
    t.append(body); host.append(t);
  }
  function remember(record) { lastRecord=record; records.push(record); if(records.length>3)records.shift(); text('cm-details',JSON.stringify(record,null,2)); $('cm-export').disabled=false; }
  function cancelWork(reason, keepQueue=false) {
    if(!keepQueue)queue=null;
    const old=active; active=null;
    if(!old){updateButtons();return;}
    clearTimeout(old.timer); old.cancelled=true; old.reason=reason; retiring.add(old);
    const label=reason==='resource limit'?'资源上限（未判定可行性）':'已停止（无新验收结果）';
    history.push({id:old.id,input:clone(old.input),label,accepted:false,rootCrbDegrees:null,powerMw:null});if(history.length>12)history.shift();renderHistory();
    try { old.worker.postMessage({type:'cancel',id:old.id}); } catch (_) { /* Termination below is the fallback. */ }
    old.cancelTimer=setTimeout(()=>{ old.worker.terminate(); retiring.delete(old); },CANCEL_MS);
    updateButtons();
  }
  function dirty(scenarioChanged) {
    editSerial++; cancelWork('input changed'); clearCurrent(); clearError();
    if(scenarioChanged){history=[];renderHistory();}
    message('参数已改变，请重新求解。最近一次下载记录仍保留原来的输入。');
    text('cm-current-label','尚未求解当前输入'); text('cm-progress',''); updateButtons();
  }
  function renderResult(result,runInput,id,sourceSeed,sourceTimingMs) {
    const cls=M.classify(result); clearCurrent();
    text('cm-current-label',`运行 ${id} · Γ=${number(runInput.gammaDb)} dB · ${cls.label}`);
    if(!cls.accepted) {
      const detail=result.physicalGate?.failures?.join('、') || (typeof result.failureReason==='string'?result.failureReason:'');
      message(`${cls.label}${detail?'：'+detail:''}。没有新的验收通过波束。`);
      return;
    }
    current={result,input:runInput,id};
    receiver?.accept({sourceRunId:id,input:clone(runInput),result:clone(result),sourceSeed:sourceSeed??null,sourceTimingMs});
    text('cm-root-crb',number(result.metrics.radar.rootCrbDegrees)+'°');
    text('cm-power',number(result.metrics.powerMw)+' / 1000 mW');
    text('cm-gap',number(result.certificate.relativeRecoveredGap));
    table('cm-users',result.metrics.users.map((u,k)=>[k+1,number(u.desiredMw),number(u.interferenceMw),'1',number(runInput.gammaDb),number(u.sinrDb),number(u.ratioToThreshold-1)]));
    message('恢复波束、每位用户 SINR、总功率与对偶界通过声明的数值容差检查。√CRB 是理论下界，不是实测误差。');
    renderCurrentCharts();
  }
  function renderCurrentCharts() {
    if(!current)return;
    const r=current.result,i=current.input,values=r.metrics.users.map(u=>u.sinrDb);
    const xmin=Math.min(0,...values)-2,xmax=Math.max(i.gammaDb,...values)+3;
    const c=chart('cm-sinr-chart',xmin,xmax,0,3,'每位用户的实际 SINR / dB');
    xAxis(c,M.axisTicks(xmin,xmax,5),'用户 SINR / dB');
    c.svg.append(node('line',{x1:c.x(i.gammaDb),y1:c.top,x2:c.x(i.gammaDb),y2:c.bottom,stroke:'#b97835','stroke-dasharray':'5 4'}));
    values.forEach((v,k)=>{const y=c.y(2-k);c.svg.append(node('text',{x:c.left-8,y:y+4,'text-anchor':'end','font-size':11},`用户 ${k+1}`));c.svg.append(node('line',{x1:c.left,y1:y,x2:c.x(v),y2:y,stroke:'#cee6e3','stroke-width':10}));const p=node('circle',{cx:c.x(v),cy:y,r:6,fill:'#087e80','data-value':v});p.append(node('title',{},`用户 ${k+1}：实际 ${number(v)} dB，要求 ${number(i.gammaDb)} dB`));c.svg.append(p);});
    $('cm-sinr-chart').setAttribute('aria-label',`共同要求 ${number(i.gammaDb)} dB；`+values.map((v,k)=>`用户${k+1}实际${number(v)} dB`).join('；'));
    const info=M.informationDecomposition(r,i);
    const vals=[info.knownAlphaInformation,info.fisherScale*info.nuisanceLoss,info.unknownAlphaInformation];
    const ic=chart('cm-information-chart',-.65,2.65,0,Math.max(...vals)*1.14,'角度 Fisher 信息 / rad⁻²');yAxis(ic);
    const labels=['假设 α 已知','未知 α 损失','剩余有效信息'],shortLabels=['已知 α','混淆损失','有效信息'],colors=['#708b9a','#bf7e3f','#087e80'];
    vals.forEach((v,k)=>{const w=(ic.right-ic.left)/5.5;ic.svg.append(node('rect',{x:ic.x(k)-w/2,y:ic.y(v),width:w,height:ic.bottom-ic.y(v),fill:colors[k],'data-value':v}));ic.svg.append(node('text',{x:ic.x(k),y:ic.y(v)-6,'text-anchor':'middle','font-size':10},number(v)));ic.svg.append(node('text',{x:ic.x(k),y:ic.bottom+20,'text-anchor':'middle','font-size':10},ic.width<360?shortLabels[k]:labels[k]));});
    $('cm-information-chart').setAttribute('aria-label',labels.map((label,k)=>`${label} ${number(vals[k])} rad⁻²`).join('；'));
  }
  function renderHistory() {
    table('cm-tradeoff-table',history.map(h=>[number(h.input.gammaDb),h.label,h.accepted?number(h.rootCrbDegrees):'—',h.accepted?number(h.powerMw):'—',h.id]));
    const valid=history.filter(h=>h.accepted);
    if(!history.length){emptyPlot('cm-tradeoff-chart','尚未运行同一信道的门槛比较');return;}
    const ymin=valid.length?Math.max(0,Math.min(...valid.map(h=>h.rootCrbDegrees))*.94):0;
    const ymax=valid.length?Math.max(...valid.map(h=>h.rootCrbDegrees))*1.06:1;
    const c=chart('cm-tradeoff-chart',0,20,ymin,ymax,'角度标准差下界 / °');yAxis(c);xAxis(c,[0,5,10,15,20].map(value=>({value,label:String(value)})),'共同最低 SINR / dB');
    for(const h of history) {
      const mark=h.accepted?node('circle',{cx:c.x(h.input.gammaDb),cy:c.y(h.rootCrbDegrees),r:5,fill:'#087e80','data-run':h.id}):node('text',{x:c.x(h.input.gammaDb),y:c.bottom-5,'text-anchor':'middle',fill:'#a4652c','font-size':17,'data-run':h.id},'×');
      mark.append(node('title',{},`运行${h.id} Γ=${h.input.gammaDb} dB：${h.label}${h.accepted?'，√CRB='+number(h.rootCrbDegrees)+'°':''}`));c.svg.append(mark);
    }
    $('cm-tradeoff-chart').setAttribute('aria-label',`${history.length}次同信道门槛运行，${valid.length}次通过；离散点，没有插值或跨失败连线。`);
  }
  function saveResult(result,job,uiMs) {
    const safe=M.validateResult(result,job.input);
    const record=M.buildRecord({input:job.input,result:safe,seed:job.seed,runId:job.id,uiTimingMs:uiMs});
    remember(record);
    const cls=M.classify(safe);
    history.push({id:job.id,input:clone(job.input),label:cls.label,accepted:cls.accepted,rootCrbDegrees:cls.accepted?safe.metrics.radar.rootCrbDegrees:null,powerMw:cls.accepted?safe.metrics.powerMw:null});
    if(history.length>12)history.shift();renderHistory();return safe;
  }
  function startRun(nextInput,remaining) {
    receiver?.invalidate('已开始新的波束求解。旧接收结果失效。');
    clearError();
    let checked;
    try { checked=M.validateInput(nextInput); } catch(e){message(e.message,true);return;}
    if(typeof window.Worker!=='function'){message('当前环境无法启动 Worker；没有改用预存答案。原课程和推导仍可阅读。',true);return;}
    cancelWork('replaced by a newer run',true);for(const old of retiring){clearTimeout(old.cancelTimer);old.worker.terminate();}retiring.clear();clearCurrent();
    input=checked;syncControls();const id=++runSerial;
    queue=remaining||null;
    const job={id,input:clone(checked),seed:/generated|seeded/.test(seedKind)?seed:null,edit:editSerial,start:getTime(),cancelled:false};
    try { job.worker=new window.Worker('crb-multiuser/worker.js'); } catch(e){queue=null;message('无法创建求解 Worker：'+e.message,true);text('cm-current-label','Worker 未能启动');updateButtons();return;}
    active=job;discarded=false;message(`正在求解运行 ${id}；尚未得到验收结果。`);text('cm-current-label',`运行 ${id} · Γ=${input.gammaDb} dB · 求解中`);text('cm-progress','初始化实际 Eq. (33) 优化器…');updateButtons();
    job.timer=setTimeout(()=>{
      if(active!==job)return;queue=null;cancelWork('resource limit');clearCurrent();message('达到 30 秒运行上限，本次尚未获得验收结果；这不证明要求不可行。');text('cm-current-label',`运行 ${id} · 资源上限`);text('cm-progress','已请求停止');
    },MAX_MS);
    job.worker.onmessage=event=>{
      const msg=event.data||{};
      if(msg.id!==job.id)return;
      if(job.cancelled) {
        if(msg.type==='cancelled'){
          clearTimeout(job.cancelTimer);job.worker.terminate();retiring.delete(job);
          // A genuine cancelled result can be retained as history, but never
          // overwrite a newer run or an imported/current result.
          if(!active&&job.id===runSerial&&job.edit===editSerial&&msg.result){try{remember(M.buildRecord({input:job.input,result:M.validateResult(msg.result,job.input),seed:job.seed,runId:job.id,uiTimingMs:getTime()-job.start}));}catch(_){}}
        }
        return;
      }
      if(active!==job||job.edit!==editSerial)return;
      if(msg.type==='progress'){
        const p=msg.progress;
        if(p&&Number.isFinite(p.iterations)&&Number.isFinite(p.elapsedMs))text('cm-progress',`已迭代 ${p.iterations} 次，内核已用 ${(p.elapsedMs/1000).toFixed(2)} 秒；进度不是最优性证明`);
        return;
      }
      if(!['result','error','cancelled'].includes(msg.type))return;
      clearTimeout(job.timer);active=null;job.worker.terminate();
      if(msg.type!=='result'){
        queue=null;clearCurrent();text('cm-current-label',`运行 ${id} · 未完成`);message(msg.type==='error'?'求解未完成：'+String(msg.error):'已停止；本次没有新的验收结果。',msg.type==='error');updateButtons();return;
      }
      try{
        const end=getTime(),r=saveResult(msg.result,job,end-job.start);renderResult(r,job.input,job.id,job.seed,end-job.start);
        text('cm-progress',`本机本次：内核 ${(r.kernelWallMs/1000).toFixed(3)} 秒；启动到结果消息 ${((end-job.start)/1000).toFixed(3)} 秒（不含后续绘制完成测量）`);
        if(queue&&queue.length){const next=queue.shift();const rest=queue;startRun({...clone(job.input),gammaDb:next},rest);}
        else queue=null;
      }catch(e){queue=null;clearCurrent();text('cm-current-label',`运行 ${id} · 结果复核未通过`);message('结果未能通过输入/格式/物理复核：'+e.message,true);}
      updateButtons();
    };
    job.worker.onerror=event=>{if(active!==job||job.cancelled)return;clearTimeout(job.timer);active=null;queue=null;job.worker.terminate();clearCurrent();text('cm-current-label',`运行 ${id} · Worker 执行失败`);message('Worker 执行失败：'+String(event.message||'无法读取计算资源'),true);updateButtons();};
    try { job.worker.postMessage({type:'run',id,input:clone(job.input),options:M.optionsFor(job.input)}); } catch(e){clearTimeout(job.timer);job.worker.terminate();active=null;queue=null;text('cm-current-label',`运行 ${id} · 输入提交失败`);message('无法提交求解输入：'+e.message,true);updateButtons();}
  }
  function gammaEdited(source) { const value=source.value.trim()===''?NaN:Number(source.value); input.gammaDb=value; if(Number.isFinite(value))setGamma(value);dirty(false);try{M.validateInput(input);}catch(e){message(e.message,true);} }
  $('cm-gamma').addEventListener('input',()=>gammaEdited($('cm-gamma')));
  $('cm-gamma-number').addEventListener('input',()=>gammaEdited($('cm-gamma-number')));
  $('cm-nt').addEventListener('change',()=>{
    const nt=Number($('cm-nt').value);try{const next=M.createInput({Nt:nt,gammaDb:input.gammaDb,thetaDegrees:input.thetaDegrees,H:M.seededH(nt,seed)});dirty(true);input=next;seedKind='seeded channel for changed dimensions';editor();syncControls();message('阵列孔径和信道维度已改变。新场景尚未求解，不能与之前视作同资源比较。');}catch(e){message(e.message,true);}
  });
  $('cm-theta').addEventListener('change',()=>{input.thetaDegrees=Number($('cm-theta').value);dirty(true);ledger();});
  function generateChannel(value) {
    if(!Number.isSafeInteger(value)||value<0||value>4294967295)throw Error('信道种子必须是 0–4294967295 的整数');
    seed=value;input.H=M.seededH(input.Nt,seed);seedKind='generated channel';dirty(true);editor();syncControls();message('已按种子生成新复数信道；重新求解后才能比较这个场景。');
  }
  $('cm-fresh').addEventListener('click',()=>{try{const supplied=$('cm-seed').value.trim()===''?NaN:Number($('cm-seed').value);if(!Number.isSafeInteger(supplied)||supplied<0||supplied>4294967295)throw Error('信道种子必须是 0–4294967295 的整数');generateChannel((supplied+1)>>>0);}catch(e){message(e.message,true);}});
  $('cm-seed').addEventListener('change',()=>{try{generateChannel($('cm-seed').value.trim()===''?NaN:Number($('cm-seed').value));}catch(e){message(e.message,true);}});
  $('cm-run').addEventListener('click',()=>startRun(input,null));
  $('cm-sweep').addEventListener('click',()=>{try{M.validateInput(input);history=[];renderHistory();startRun({...clone(input),gammaDb:0},[10,20]);}catch(e){message(e.message,true);}});
  $('cm-cancel').addEventListener('click',()=>{if(!active)return;cancelWork('user cancelled');clearCurrent();message('已请求停止；本次没有新的验收结果。迟到结果不会变成成功。');text('cm-current-label','当前运行已停止');text('cm-progress','');});
  $('cm-reset').addEventListener('click',()=>{editSerial++;cancelWork('reset');input=clone(D.DEFAULT_INPUT);seed=290102;seedKind='reference input; raw H is authoritative';history=[];clearCurrent();renderHistory();syncControls();editor();clearError();text('cm-progress','');text('cm-current-label','默认输入已恢复，尚未运行');message('默认输入已恢复。按“重新求解”运行实际优化器。');updateButtons();});
  $('cm-export').addEventListener('click',()=>{try{if(!lastRecord)throw Error('尚无运行记录可导出');const serialized=M.exportRecord(lastRecord),blob=new Blob([serialized],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='crb-point-run-'+(lastRecord.run?.id||runSerial)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);message('已导出最近一次实际运行记录，文件内保留那次运行的原始输入与状态。');}catch(e){message(e.message,true);}});
  $('cm-import').addEventListener('change',async event=>{
    const file=event.target.files&&event.target.files[0];if(!file)return;
    receiver?.invalidate('正在载入外部输入。历史结果不能作为新验收波束。');
    // File selection is a lifecycle boundary, before asynchronous file reading.
    if(active){cancelWork('import started');text('cm-current-label','导入开始，先前求解已停止');text('cm-progress','');}
    const requestEdit=editSerial,requestRun=runSerial,requestImport=++importSerial;let applied=false;
    try{
      if(file.size>2*1024*1024)throw Error('文件超过 2 MiB 上限');const raw=await file.text();
      if(requestImport!==importSerial||requestEdit!==editSerial||requestRun!==runSerial)return;const parsed=M.parseImport(raw);
      applied=true;dirty(true);input=clone(parsed.input);seedKind='imported H; raw values are authoritative';syncControls();editor();text('cm-current-label','导入输入待重新求解');
      // Imported solver claims never replace the most recent actual-run diagnostics.
      message('已载入并校验输入。导入文件中的结果只是历史记录；按“重新求解”才能得到当前验收结果。');
    }catch(e){if(!applied&&(requestImport!==importSerial||requestEdit!==editSerial||requestRun!==runSerial))return;message('导入未完成：'+e.message,true);}finally{event.target.value='';}
  });
  window.addEventListener('resize',()=>{renderCurrentCharts();renderHistory();});
  window.addEventListener('pagehide',()=>{discarded=true;editSerial++;cancelWork('page hidden');for(const job of retiring){clearTimeout(job.cancelTimer);job.worker.terminate();}retiring.clear();clearCurrent();text('cm-current-label','页面离开时已停止，返回后请重新求解');});
  window.addEventListener('pageshow',()=>{if(discarded){message('先前运行已停止；当前输入需要重新求解。');updateButtons();}});
  syncControls();editor();clearCurrent();renderHistory();updateButtons();
  text('cm-current-label','默认输入已准备，尚未运行');text('cm-progress','');
  message('按“重新求解”执行实际多用户 Eq. (33)；页面不会自动运行。');
})();
