/* A manual-first teaching view over the actual general finite-alphabet solver.
 * Workers are local, superseded work is terminated, and exports are atomic snapshots. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), C = window.CapacityDistortion;
  if (!$('capacity-distortion')) return;
  const NS = 'http://www.w3.org/2000/svg', VERSION = 'capacity-distortion-lesson-1.0.0';
  const source = {url:'https://arxiv.org/pdf/1805.05713v1',version:'arXiv:1805.05713v1',date:'2018-05-15',algorithm:'Eqs. (22)–(25)',experiment:'Fig. 2, q=0.4',pdfSha256:'4520ae9d50e55abb1d634f3396d07dfa96315266e4b40c07e46e6a8ed0d94ba2'};
  const inputIds = ['cd-q','cd-mu','cd-model','cd-noise','cd-cost','cd-budget','cd-feedback','cd-cap','cd-tolerance','cd-dual','cd-inner-cap'];
  const graphics = ['cd-pmf','cd-frontier','cd-objective','cd-gap'];
  const cleared = [...graphics,'cd-metrics','cd-step-cards','cd-posterior-body','cd-bayes-body','cd-trace-body','cd-frontier-body'];
  const textOutputs = ['cd-model-note','cd-prediction-note','cd-pmf-note','cd-frontier-note','cd-overlay-note','cd-model-data','cd-model-tensor-note'];
  const statusNames = {converged:'已认证收敛',max_iterations:'达到外迭代上限 · 未收敛',inner_not_converged:'内循环未收敛',numerical_failure:'数值失败',infeasible_cost:'成本预算不可行'};
  const predictionNames = {undecided:'先不确定，观察后再判断',one:'二元无成本模型会多发 X=1',uniform:'仍然等概率发 0 和 1',constraints:'有成本约束时，要先看可行集合'};
  const ternary = {
    ps:[.65,.35], wy:[[[.85,.1,.05],[.15,.7,.15],[.05,.1,.85]],[[.7,.25,.05],[.05,.75,.2],[.1,.15,.75]]],
    vz:[[[.6,.4],[.8,.2],[.95,.05]],[[.55,.45],[.25,.75],[.05,.95]]], loss:[[0,1],[1,0]],costs:[0,1,2]
  };
  let revealed = false, current = null, worker = null, generation = 0, timer = null, record = null, recordKey = '', pending = false;
  let lastInputAt = 0;
  const ready = Boolean(C && typeof Worker === 'function');
  const now = () => performance.now();
  const fmt = (v,d=6) => v == null ? '无 / 未认证' : !Number.isFinite(v) ? '非有限（拒绝）' : v === 0 ? '0' : Math.abs(v)<1e-5 ? v.toExponential(3) : Number(v.toFixed(d)).toString();
  const vector = p => '['+p.map(v=>fmt(v)).join(', ')+']';
  function element(parent,tag,text='',attrs={}) { const n=document.createElement(tag); n.textContent=String(text); for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v)); parent.append(n); return n; }
  function svgNode(parent,tag,attrs={},text='') { const n=document.createElementNS(NS,tag); for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v)); n.textContent=String(text); parent.append(n); return n; }
  function finiteTree(value) { if(typeof value==='number'&&!Number.isFinite(value))throw Error('结果含非有限数，禁止绘图和导出'); if(value&&typeof value==='object')Object.values(value).forEach(finiteTree); }
  function number(id,min,max,integer=false) { const raw=$(id).value,n=Number(raw); if(typeof raw!=='string'||!raw.trim()||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error('请检查参数 '+id+' 的范围'+(integer?'与整数要求':'')); return n; }
  function readInputs() {
    const mode=$('cd-model').value;
    if(!['paper','binary-extension','ternary'].includes(mode))throw Error('未知模型');
    const q=number('cd-q',0,.5),mu=number('cd-mu',0,24),noise=mode==='binary-extension'?number('cd-noise',0,.5):0;
    const costEnabled=mode==='ternary'||(mode==='binary-extension'&&$('cd-cost').checked);
    const budget=costEnabled?number('cd-budget',-.1,mode==='ternary'?2:1):0;
    const alpha=mode==='ternary'?number('cd-feedback',0,1):1;
    const tolerance=number('cd-tolerance',1e-11,1e-7);
    if(![1e-7,1e-9,1e-11].includes(tolerance))throw Error('未知容差');
    const dualStrategy=$('cd-dual').value;
    if(!['projected-gradient','bisection'].includes(dualStrategy))throw Error('未知内循环策略');
    return {mode,q:mode==='ternary'?.35:q,mu,noise,costEnabled,budget,alpha,settings:{mu,tolerance,costTolerance:1e-12,maxIterations:number('cd-cap',0,10000,true),maxInnerIterations:number('cd-inner-cap',1,10000,true),dualStrategy,innerFallback:true}};
  }
  function inputKey() { return JSON.stringify(readInputs()); }
  function isCurrent() { try{return Boolean(current&&!pending&&current.inputKey===inputKey());}catch{return false;} }
  function clearRecord(message='') {recordKey='';if(record)record.clear();$('cd-record-download').disabled=true;$('cd-record-status').textContent=message;}
  function clearResults() {
    current=null;clearRecord();$('cd-results').hidden=true;$('cd-awaiting').hidden=false;
    for(const id of cleared)$(id).replaceChildren();for(const id of textOutputs)$(id).textContent='';
    $('cd-step').disabled=true;$('cd-step').value='0';$('cd-step').max='0';$('cd-step-out').textContent='0';
  }
  function stopWork() {generation++;if(timer!==null){clearTimeout(timer);timer=null;}if(worker){worker.terminate();worker=null;}$('cd-cancel').disabled=true;}
  function fail(error) {stopWork();pending=false;clearResults();$('cd-status').textContent='本次计算失败，已清除旧图与记录：'+(error.message||String(error));clearRecord('失败结果不可下载。');}
  function safe(fn) {try{fn();}catch(error){fail(error);}}
  function refreshControls() {
    const mode=$('cd-model').value,isTernary=mode==='ternary',extension=mode==='binary-extension';
    $('cd-q').disabled=!ready||isTernary;$('cd-noise').disabled=!ready||!extension;$('cd-cost').disabled=!ready||!extension;
    $('cd-budget').disabled=!ready||!(isTernary||(extension&&$('cd-cost').checked));$('cd-budget').max=isTernary?'2':'1';$('cd-feedback').disabled=!ready||!isTernary;
    $('cd-q-out').textContent=isTernary?'0.35（固定三输入先验）':Number.isFinite(Number($('cd-q').value))?Number($('cd-q').value).toFixed(2):'无效';
    $('cd-mu-out').textContent=Number.isFinite(Number($('cd-mu').value))?Number($('cd-mu').value).toFixed(2):'无效';
  }
  function makeModel(inputs) {
    if(inputs.mode==='ternary')return C.createModel({...ternary,vz:ternary.vz.map(s=>s.map(row=>row.map(v=>inputs.alpha*v+(1-inputs.alpha)*.5))),budget:inputs.budget});
    return C.binaryModel({q:inputs.q,noise:inputs.noise,costs:inputs.costEnabled?[0,1]:[0,0],budget:inputs.budget});
  }
  function invalidate() {
    lastInputAt=now();stopWork();pending=true;clearResults();refreshControls();
    if(!ready)return;
    // Validation happens before scheduling, but obsolete charts disappear first.
    readInputs();$('cd-status').textContent=revealed?'输入已改变，旧结果已清除；即将按当前模型重新计算。':'尚未运行。先作预测，再点击“运行并揭示”。';
    if(revealed)timer=setTimeout(()=>{timer=null;safe(()=>run(false));},240);
  }
  function run(manual=true) {
    if(!ready)return;
    if(manual)lastInputAt=now();stopWork();clearResults();pending=true;revealed=true;
    const inputs=readInputs(),key=JSON.stringify(inputs),model=makeModel(inputs),token=generation;
    const overlay=inputs.mode!=='ternary'&&inputs.noise===0&&!inputs.costEnabled;
    $('cd-status').textContent='正在运行所选 μ 与实际 BA 前沿扫描…';$('cd-cancel').disabled=false;
    const instance=new Worker('capacity-distortion-worker.js?v=finite-ba-v1');worker=instance;
    instance.onmessage=event=>{
      if(worker!==instance||generation!==token)return;
      const message=event.data||{};if(message.token!==token)return;
      try{if(inputKey()!==key){safe(invalidate);return;}}catch(error){fail(error);return;}
      if(message.type==='progress'){$('cd-status').textContent='正在实算前沿：'+message.completed+' / '+message.total+' 个 μ；旧结果不会混入。';return;}
      if(message.type==='error'){fail(Error(message.message||'Worker 返回错误'));return;}
      if(message.type!=='result')return;
      safe(()=>{
        finiteTree(message.result);validateResult(message.result,model,inputs.settings);
        const result=message.result;
        instance.terminate();worker=null;pending=false;$('cd-cancel').disabled=true;
        current={...result,inputs,inputKey:key,paperOverlay:overlay,computedAt:new Date().toISOString(),controlToResultMs:now()-lastInputAt};
        $('cd-step').max=String(Math.max(0,result.selected.trace.length-1));$('cd-step').value=String(Math.max(0,result.selected.trace.length-1));
        $('cd-step').disabled=!result.selected.trace.length;
        render();commitRecord();
      });
    };
    instance.onerror=event=>{if(worker===instance&&generation===token)fail(Error('本地 Worker 未能完成：'+(event.message||'请检查脚本加载与浏览器支持')));};
    instance.postMessage({type:'solve',token,model,settings:inputs.settings,paperOverlay:overlay});
  }
  function validateResult(result,model,settings) {
    if(!result||!result.selected||!Array.isArray(result.frontier)||!result.risk)throw Error('求解结果结构不完整');
    if(JSON.stringify(result.model)!==JSON.stringify(model))throw Error('返回模型与当前输入不一致');
    const r=result.selected;
    if(result.algorithmVersion!==C.VERSION||r.version!==C.VERSION)throw Error('主页面与 Worker 的算法版本不一致，请重新加载页面');
    if(!Object.hasOwn(statusNames,r.status)||!Array.isArray(r.trace))throw Error('未知求解状态');
    if(r.status==='numerical_failure')throw Error(r.reason||'数值证书失败');
    if(r.status==='infeasible_cost'){if(r.p!==null||r.trace.length)throw Error('不可行结果不应带有已求解分布');return;}
    if(!r.p||r.p.length!==model.dimensions.inputs||r.trace.length!==r.iterations+1)throw Error('实际迭代轨迹不完整');
    if(JSON.stringify(r.settings)!==JSON.stringify({...r.settings,...settings}))throw Error('返回求解设置与当前输入不一致');
    for(const row of [r,...r.trace,...result.frontier]) {
      if(!row.p||row.p.some(v=>v<0)||Math.abs(row.p.reduce((a,b)=>a+b,0)-1)>1e-8||!['rateBits','distortion','cost','objectiveNats'].every(k=>typeof row[k]==='number'))throw Error('结果指标或概率无效');
      if(row.converged&&(!row.feasible||row.gapNats==null||row.gapNats>settings.tolerance))throw Error('结果错误地声称收敛');
    }
  }
  function statusText(r) {return statusNames[r.status]||r.status;}
  function metrics() {
    const r=current.selected,host=$('cd-metrics');host.replaceChildren();
    const values=[['通信 I',fmt(r.rateBits)+' bit/使用'],['实际失真 D',fmt(r.distortion)],['输入成本',fmt(r.cost)],['证书间隙',fmt(r.gapNats)+' nat']];
    for(const [label,value]of values){const box=element(host,'div','',{class:'cd-metric'});element(box,'span',label);element(box,'b',value);}
  }
  function render() {
    const r=current.selected,inputs=current.inputs;
    $('cd-results').hidden=false;$('cd-awaiting').hidden=true;metrics();
    $('cd-model-note').textContent=inputs.mode==='paper'?(inputs.q===.4?'论文 Fig. 2 固定 q=0.4 配置':'论文二元模型的 q 参数变化（不是原图固定配置）'):inputs.mode==='ternary'?'独立三输入验证扩展；并非论文 Fig. 2/3':'噪声 / 输入成本扩展；并非论文 Fig. 2 原设定';
    updatePrediction();
    const fallbackCount=r.trace.filter(t=>t.innerFallback).length;
    $('cd-status').textContent=statusText(r)+'；外迭代 '+r.iterations+' 次；从本次控件提交到结果 '+fmt(current.controlToResultMs,1)+' ms（本机本次测量，包含合并输入等待与 Worker 启动/扫描）。'+(fallbackCount?' 所选轨迹有 '+fallbackCount+' 步使用二分回退。':'')+(r.exactCostBoundary?(r.support.length<current.model.dimensions.inputs?' 精确最低成本支持已缩减（'+r.support.length+'/'+current.model.dimensions.inputs+' 个符号）。':' 全部输入符号均为最低成本；支持未缩减。'):'');
    $('cd-oracle').disabled=!current.paperOverlay;
    $('cd-overlay-note').textContent=current.paperOverlay?'青虚线：独立解析对照；棕点划线：论文分时线 (0,0)→(q,q)，通信阶段不用反馈感知；淡青水平虚线：允许失真预算的松弛平台，不是新的实际扫描点。方框端点是退化输入直接计算。':'解析二元对照、论文分时线与其预算平台仅对无噪声、无额外输入成本的二元模型有效，当前扩展不显示。';
    $('cd-model-data').textContent=JSON.stringify({ps:current.model.ps,wy:current.model.wy,vz:current.model.vz,loss:current.model.loss,costs:current.model.costs,budget:current.model.budget},null,2);
    $('cd-model-tensor-note').textContent=inputs.mode==='ternary'?'wy[s][x][y]、vz[s][x][z] 为边缘信道；本夹具的联合分布是两者相乘（条件独立）。α='+fmt(inputs.alpha)+'。':'wy[s][x][y] 与 vz[s][x][z] 相同，联合分布只在 z=y 时取 wy 的概率；不是独立抽取两次噪声。';
    renderTables();
    if(r.status==='infeasible_cost'){
      $('cd-pmf-note').textContent='B='+fmt(inputs.budget)+' 小于最小输入成本 '+fmt(r.minimumCost)+'；没有可行分布，没有前沿或收敛轨迹。';
      $('cd-frontier-note').textContent='请将 B 调回可行范围。此记录只说明不可行，不含伪造的成功点。';return;
    }
    drawPmf();renderStep();drawFrontier();drawTraces();
    $('cd-pmf-note').textContent='最终返回 p̄ = '+vector(r.p)+'；c = '+vector(current.risk.costs)+'. '+(inputs.q===0&&inputs.mode!=='ternary'?'q=0：I=D=0，最优分布不唯一；本次返回值不是唯一答案。':'')+(r.exactCostBoundary?(r.support.length<current.model.dimensions.inputs?' 初始支持已限制在最低成本符号。':' 初始支持保留全部输入符号。'):'');
    const certified=current.frontier.filter(p=>p.converged&&p.feasible).length;
    $('cd-frontier-note').textContent=certified+' / '+current.frontier.length+' 个实际 μ 扫描点已认证；未认证点不用于连接最优前沿。扫描 μ = '+current.muGrid.join(', ')+'。有限扫描不是连续区域的穷尽证明。';
  }
  function updatePrediction() {if(!current)return;$('cd-prediction-note').textContent='你的预测：'+(predictionNames[$('cd-prediction').value]||predictionNames.undecided)+'。先核对模型与约束，再判断此次结果，不按预测计分。';}
  function axes(svg,{xmin=0,xmax=1,ymin=0,ymax=1,height=275,xlabel='',ylabel='',yformat=fmt,showXTicks=true}) {
    svg.replaceChildren();const width=Math.max(280,Math.min(900,svg.clientWidth||560)),left=58,right=17,top=28,bottom=48;
    svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    for(const[k,v]of Object.entries({'data-x-min':xmin,'data-x-max':xmax,'data-y-min':ymin,'data-y-max':ymax}))svg.setAttribute(k,v);
    const x=v=>left+(width-left-right)*(v-xmin)/(xmax-xmin),y=v=>height-bottom-(height-top-bottom)*(v-ymin)/(ymax-ymin);
    for(let i=0;i<=4;i++){const xv=xmin+(xmax-xmin)*i/4,yv=ymin+(ymax-ymin)*i/4;svgNode(svg,'line',{x1:left,x2:width-right,y1:y(yv),y2:y(yv),class:'cd-grid'});svgNode(svg,'text',{x:left-7,y:y(yv)+4,'text-anchor':'end'},yformat(yv,3));if(showXTicks)svgNode(svg,'text',{x:x(xv),y:height-bottom+19,'text-anchor':'middle'},fmt(xv,3));}
    svgNode(svg,'line',{x1:left,x2:width-right,y1:y(ymin),y2:y(ymin),class:'cd-axis'});svgNode(svg,'line',{x1:left,x2:left,y1:top,y2:height-bottom,class:'cd-axis'});
    svgNode(svg,'text',{x:left,y:16},ylabel);svgNode(svg,'text',{x:(left+width-right)/2,y:height-8,'text-anchor':'middle'},xlabel);return {x,y,width,height,left,right,top,bottom};
  }
  function line(svg,points,color,attrs={}) {if(points.length<2)return;svgNode(svg,'polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':2,...attrs});}
  function marker(svg,x,y,attrs={},title='') {const n=svgNode(svg,'circle',{cx:x,cy:y,r:3,...attrs});if(title)svgNode(n,'title',{},title);return n;}
  function drawPmf() {
    const result=current.selected,r=result.trace[stepIndex()],svg=$('cd-pmf'),n=r.p.length,plot=axes(svg,{xmax:n,ymax:1,xlabel:'输入符号 x',ylabel:'当前 k='+r.iteration+' 的概率 p̄(x)',showXTicks:false}),slot=(plot.width-plot.left-plot.right)/n;
    // Replace only generic fractional x tick labels with explicit input labels.
    for(let x=0;x<n;x++){
      const cx=plot.x(x+.5),bw=slot*.46;
      svgNode(svg,'rect',{x:cx-bw/2,y:plot.y(r.p[x]),width:bw,height:plot.y(0)-plot.y(r.p[x]),fill:'#70489c','data-input':x,'data-probability':r.p[x]});
      const initial=result.trace[0].p[x];svgNode(svg,'rect',{x:cx-bw/2,y:plot.y(initial),width:bw,height:plot.y(0)-plot.y(initial),fill:'none',stroke:'#61796e','stroke-dasharray':'3 3','data-initial':initial});
      svgNode(svg,'text',{x:cx,y:Math.max(22,plot.y(r.p[x])-7),'text-anchor':'middle'},fmt(r.p[x],4));svgNode(svg,'text',{x:cx,y:plot.height-27,'text-anchor':'middle'},'X='+x);
    }
  }
  function drawFrontier() {
    if(!isCurrent()||!current.selected.p)return;
    const svg=$('cd-frontier'),r=current.selected,q=current.inputs.q;
    const maxD=Math.max(.01,...current.risk.costs,current.paperOverlay?q:0),maxI=Math.max(.01,...current.frontier.map(p=>p.rateBits),...r.trace.map(p=>p.rateBits),current.paperOverlay?q:0)*1.1;
    const p=axes(svg,{xmax:maxD,ymax:maxI,xlabel:'实际 D（对照平台仅表示允许预算）',ylabel:'I(X;Y|S) / bit 每信道使用'});
    if(current.paperOverlay&&$('cd-oracle').checked){
      if(q>0){
        const oracle=Array.from({length:81},(_,i)=>{const v=C.binaryOracle({q,distortionBudget:q*i/160});return [p.x(v.distortion),p.y(v.rateBits)];});
        line(svg,oracle,'#4d9c97',{'stroke-dasharray':'5 5','data-series':'analytic-oracle'});
        line(svg,[[p.x(q/2),p.y(q)],[p.x(q),p.y(q)]],'#7aaba5',{'stroke-dasharray':'3 5','data-series':'budget-plateau'});
        line(svg,[[p.x(0),p.y(0)],[p.x(q),p.y(q)]],'#996a46',{'stroke-dasharray':'9 4 2 4','data-series':'paper-separation'});
        svgNode(svg,'text',{x:p.x(q*.74),y:p.y(q)-7,'text-anchor':'middle'},'预算松弛平台');
      }
    }
    let segment=[];
    const flush=()=>{line(svg,segment,'#087f78',{'data-series':'certified-frontier'});segment=[];};
    for(const point of current.frontier){
      const certified=point.converged&&point.feasible;
      if(certified)segment.push([p.x(point.distortion),p.y(point.rateBits)]);else flush();
      marker(svg,p.x(point.distortion),p.y(point.rateBits),{r:3.6,fill:certified?'#087f78':'#fff',stroke:certified?'#087f78':'#a74613','stroke-width':1.7,'data-mu':point.mu,'data-certified':certified,'data-distortion':point.distortion,'data-rate':point.rateBits},'μ='+point.mu+'；'+statusText(point)+'；D='+fmt(point.distortion)+'；I='+fmt(point.rateBits));
    }flush();
    line(svg,r.trace.map(t=>[p.x(t.distortion),p.y(t.rateBits)]),'#8c9596',{'stroke-width':1.3,'data-series':'selected-iterate-path'});
    if(current.exactEndpoint){const e=current.exactEndpoint;svgNode(svg,'rect',{x:p.x(e.distortion)-4,y:p.y(e.rateBits)-4,width:8,height:8,fill:'#fff',stroke:'#173849','stroke-width':1.5,'data-series':'exact-endpoint'});}
    const step=r.trace[stepIndex()];marker(svg,p.x(step.distortion),p.y(step.rateBits),{r:5.5,fill:'#70489c',stroke:'#fff','stroke-width':1.5,'data-series':'selected-step','data-iteration':step.iteration},'当前查看 k='+step.iteration);
  }
  function stepIndex() {return number('cd-step',0,Math.max(0,current.selected.trace.length-1),true);}
  function renderStep() {
    if(!current.selected.trace.length)return;
    const k=stepIndex(),r=current.selected.trace[k],previous=current.selected.trace[Math.max(0,k-1)],Q=C.posterior(current.model,previous.p),host=$('cd-step-cards');
    $('cd-step-out').textContent=k+' / '+(current.selected.trace.length-1);host.replaceChildren();
    const texts=[['1 · 后验 Q',k?'由 p̄'+(k-1)+'='+vector(previous.p)+'，更新 Q(x|y,s)。':'初始化 p̄₀='+vector(r.p)+'，尚未进行输入更新。'],['2 · 输入 PMF 更新',k?'p̄'+k+'='+vector(r.p)+'；按 exp(E[ln Q]−μc−λb) 归一化。':'从均匀可行支持出发；完整概率见柱图。'],['3 · λ 与成本','输入更新 λ='+fmt(r.updateLambda)+'；成本='+fmt(r.cost)+'，B='+fmt(current.model.budget)+'；内策略 '+(r.innerStrategy||'尚无更新')+(r.innerFallback?'（已二分回退）':'')+'。'],['4 · 指标与证书','I='+fmt(r.rateBits)+' bit，D='+fmt(r.distortion)+'，Fμ='+fmt(r.objectiveNats)+' nat；gap='+fmt(r.gapNats)+' nat；'+(r.feasible?'可行':'初始成本不可行')+'。']];
    for(const [title,text]of texts){const card=element(host,'article');element(card,'h4',title);element(card,'p',text);}
    const body=$('cd-posterior-body');body.replaceChildren();
    for(let s=0;s<Q.q.length;s++)for(let y=0;y<Q.outputProbability[s].length;y++){const row=element(body,'tr');for(const value of [s,y,Q.reachable[s][y]?'可达':'不可达',Q.reachable[s][y]?vector(Q.q[s].map(x=>x[y])):'零概率列；占位为 0，不作除法'])element(row,'td',value);}
  }
  function drawTraces() {
    if(!isCurrent()||!current.selected.trace.length)return;
    const trace=current.selected.trace,k=stepIndex(),xmax=Math.max(1,trace.length-1),values=trace.map(t=>t.objectiveNats),lo=Math.min(...values),hi=Math.max(...values),pad=Math.max(.01,(hi-lo)*.1);
    const svg=$('cd-objective'),p=axes(svg,{xmax,ymin:lo-pad,ymax:hi+pad,height:250,xlabel:'外迭代 k',ylabel:'目标 Fμ / nat'});
    line(svg,trace.map(t=>[p.x(t.iteration),p.y(t.objectiveNats)]),'#087f78',{'data-series':'objective'});marker(svg,p.x(k),p.y(trace[k].objectiveNats),{r:4.5,fill:'#70489c','data-value':trace[k].objectiveNats});
    const gapSvg=$('cd-gap'),positive=trace.map(t=>t.gapNats).filter(v=>v!=null&&v>0),tolerance=current.inputs.settings.tolerance;
    const floor=Math.floor(Math.log10(Math.min(tolerance/10,...positive))),ceiling=Math.max(floor+1,Math.ceil(Math.log10(Math.max(tolerance,...positive))));
    const g=axes(gapSvg,{xmax,ymin:floor,ymax:ceiling,height:250,xlabel:'外迭代 k',ylabel:'证书间隙 / nat（log₁₀）',yformat:v=>'10^'+fmt(v,1)});
    const yy=v=>v===0?g.y(floor):g.y(Math.max(floor,Math.log10(v)));let points=[];
    for(const row of trace){if(row.gapNats==null){line(gapSvg,points,'#a74613',{'data-series':'gap'});points=[];continue;}points.push([g.x(row.iteration),yy(row.gapNats)]);if(row.gapNats===0)marker(gapSvg,g.x(row.iteration),yy(0),{r:2,fill:'#a74613','data-zero-gap':'true'},'报告的数值间隙为 0');}
    line(gapSvg,points,'#a74613',{'data-series':'gap'});
    line(gapSvg,[[g.x(0),yy(tolerance)],[g.x(xmax),yy(tolerance)]],'#889891',{'stroke-dasharray':'4 4','data-series':'tolerance'});
    if(trace[k].gapNats!=null)marker(gapSvg,g.x(k),yy(trace[k].gapNats),{r:4.5,fill:'#70489c','data-value':trace[k].gapNats},trace[k].gapNats===0?'间隙 0':'间隙 '+fmt(trace[k].gapNats));
    if(trace.some(t=>t.gapNats===0))svgNode(gapSvg,'text',{x:g.left+5,y:g.height-g.bottom-6},'0 间隙点落底');
  }
  function renderTables() {
    const bayes=$('cd-bayes-body');bayes.replaceChildren();const risk=current.risk;
    risk.costs.forEach((c,x)=>risk.estimator[x].forEach((h,z)=>{const row=element(bayes,'tr');for(const v of [x,z,fmt(risk.observationProbability[x][z]),risk.observationProbability[x][z]===0?'不可达（任意重建）':h,risk.conditionalRisk[x][z]===null?'不定义':fmt(risk.conditionalRisk[x][z]),fmt(c)])element(row,'td',v);}));
    const trace=$('cd-trace-body');trace.replaceChildren();
    const all=current.selected.trace,limit=200,k=all.length?stepIndex():0,start=Math.max(0,Math.min(k-Math.floor(limit/2),all.length-limit)),visible=all.slice(start,start+limit);
    $('cd-trace-coverage').textContent=all.length?'所选 μ：当前显示 k='+start+'–'+(start+visible.length-1)+'（共 '+all.length+' 行）；随查看步骤移动，最多 200 行；完整轨迹见 JSON':'无可行迭代轨迹';
    if($('cd-trace-details').open)for(const t of visible){const row=element(trace,'tr');for(const v of [t.iteration,vector(t.p),fmt(t.rateBits),fmt(t.distortion),fmt(t.cost),fmt(t.objectiveNats),fmt(t.gapNats),fmt(t.updateLambda),t.innerIterations+' / '+(t.innerFallback?'是':'否')])element(row,'td',v);}
    const frontier=$('cd-frontier-body');frontier.replaceChildren();for(const t of current.frontier){const row=element(frontier,'tr');for(const v of [t.mu,fmt(t.distortion),fmt(t.rateBits),vector(t.p),fmt(t.gapNats),t.iterations,statusText(t)])element(row,'td',v);}
  }
  function liveRecordKey() {return JSON.stringify([inputKey(),$('cd-step').value,$('cd-oracle').checked,$('cd-prediction').value]);}
  function commitRecord() {
    clearRecord();if(!record){clearRecord('本地导出组件未能加载；当前计算仍可阅读。');return;}if(!isCurrent())return;
    const snapshot={kind:'computed-paper-algorithm-record',schema:VERSION,computedAt:current.computedAt,source,algorithmVersion:current.algorithmVersion,
      model:{...current.model,jointConvention:current.inputs.mode==='ternary'?'wy times vz given s,x (conditionally independent)':'z=y; joint mass equals wy only when z=y'},controls:current.inputs,settings:current.selected.settings,
      bayesPreprocessing:current.risk,selectedResult:current.selected,frontier:current.frontier,muGrid:current.muGrid,exactSensingEndpoint:current.exactEndpoint,
      inspection:{iteration:current.selected.trace.length?stepIndex():null,prediction:$('cd-prediction').value,validBinaryOverlayShown:current.paperOverlay&&$('cd-oracle').checked},
      timing:{workerElapsedMs:current.workerElapsedMs,controlToResultMs:current.controlToResultMs,includesDebounceAndWorkerStartup:true,universalLatencyClaim:false},
      coverage:{finiteAlphabetAlgorithm:true,binaryFigure2Preset:current.inputs.mode==='paper'&&current.inputs.q===.4,completePaper:false,gaussianFigure3:false,finiteBlockCode:false,extensionsAreNotPaperExperiments:current.inputs.mode!=='paper'},
      conventions:{logarithm:'natural',rate:'bits/channel use',distortion:'achieved expected Hamming loss, not requested budget',randomness:'none; deterministic algorithm',frontier:'actual mu solves; only certified adjacent points connected',paperSeparation:'(0,0) to (q,q); communication-only phase ignores feedback for sensing',plateau:'allowed distortion budget slack above q/2; achieved distortion remains q/2'}};
    finiteTree(snapshot);record.update(snapshot,'capacity-distortion-record.json');recordKey=liveRecordKey();
  }
  // Register before the shared shell's click listener. Even a silent control
  // mutation cannot export a stale result or a record from an obsolete worker.
  $('cd-record-download').addEventListener('click',()=>{let valid=false;try{valid=isCurrent()&&recordKey===liveRecordKey();}catch{}if(!valid)clearRecord('当前没有与控件一致的记录，请重新计算。');});
  if(window.ExperimentRecord){try{record=window.ExperimentRecord.create({disclosure:$('cd-record-details'),output:$('cd-record-preview'),button:$('cd-record-download'),status:$('cd-record-status')});}catch{clearRecord('本地导出组件未能初始化。');}}
  for(const id of inputIds){$(id).addEventListener('input',()=>safe(invalidate));$(id).addEventListener('change',()=>safe(invalidate));}
  $('cd-run').addEventListener('click',()=>safe(()=>run(true)));
  $('cd-trace-details').addEventListener('toggle',()=>safe(()=>{if(isCurrent())renderTables();}));
  $('cd-cancel').addEventListener('click',()=>{stopWork();pending=false;clearResults();$('cd-status').textContent='本次计算已取消，旧结果与记录已清除。点击运行可按当前输入重试。';});
  $('cd-step').addEventListener('input',()=>safe(()=>{if(!isCurrent()){clearResults();return;}renderStep();drawPmf();drawFrontier();drawTraces();if($('cd-trace-details').open)renderTables();commitRecord();}));
  $('cd-oracle').addEventListener('change',()=>safe(()=>{if(!isCurrent()){clearResults();return;}drawFrontier();commitRecord();}));
  $('cd-prediction').addEventListener('change',()=>safe(()=>{if(isCurrent()){updatePrediction();commitRecord();}}));
  function reset() {
    stopWork();revealed=false;pending=false;clearResults();
    for(const [id,value]of Object.entries({'cd-q':'.4','cd-mu':'2','cd-model':'paper','cd-noise':'.1','cd-budget':'.7','cd-feedback':'1','cd-cap':'2000','cd-tolerance':'1e-9','cd-dual':'projected-gradient','cd-inner-cap':'1000','cd-prediction':'undecided'}))$(id).value=value;
    $('cd-cost').checked=false;$('cd-oracle').checked=true;
    for(const id of ['cd-advanced','cd-trace-details','cd-model-details','cd-record-details'])$(id).open=false;
    refreshControls();$('cd-status').textContent='尚未运行。先作预测，再点击“运行并揭示”。';
    if(!ready){$('cd-primary-controls').disabled=true;$('cd-advanced-controls').disabled=true;$('cd-run').disabled=true;$('cd-status').textContent=!C?'数值核心未能加载；交互已停用，仍可阅读模型、原文和静态校验点。':'此浏览器没有可用的 Web Worker；交互已停用，仍可阅读模型与静态校验点。';}
    if(!record)clearRecord('本地导出组件未能加载；计算可用时仍可阅读结果。');
  }
  $('cd-reset').addEventListener('click',reset);
  window.addEventListener('resize',()=>safe(()=>{if(isCurrent()&&current.selected.p){drawPmf();drawFrontier();drawTraces();}}));
  window.addEventListener('pagehide',()=>{stopWork();clearRecord();});
  reset();
})();
