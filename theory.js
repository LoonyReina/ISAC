(function(){
  'use strict';
  const C=window.Theory,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const state={mode:'sensing',delay:5,bit:1,sigma:0,seed:7,candidate:5};
  function node(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
  function chart(id,series,xvalues,xlabel,ylabel,compact=false){
    const svg=$(id);svg.replaceChildren();svg.append(node('title',{},`${ylabel}；${xlabel}`));
    // Match the viewBox to the actual CSS width: 13px labels stay legible on phones.
    const W=Math.max(240,Math.min(720,svg.clientWidth||720)),small=W<500,H=285,L=small?60:66,R=small?25:22,T=small?48:28,B=53;
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const values=series.flatMap(s=>s.values),lo=Math.min(0,...values),hi=Math.max(0,...values),pad=Math.max(compact?1e-9:.15,(hi-lo)*.13),ymin=lo-pad,ymax=hi+pad;
    const x=v=>L+(v-xvalues[0])/(xvalues.at(-1)-xvalues[0])*(W-L-R),y=v=>T+(ymax-v)/(ymax-ymin)*(H-T-B);
    for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,yy=y(v);svg.append(node('line',{x1:L,y1:yy,x2:W-R,y2:yy,stroke:'#e4ecef'}),node('text',{x:L-8,y:yy+4,'text-anchor':'end'},compact?Number(v.toPrecision(3)).toString():v.toFixed(1)));}
    svg.append(node('line',{x1:L,y1:y(0),x2:W-R,y2:y(0),class:'axis'}));
    const ticks=xvalues.length<=3?xvalues:xvalues.filter((_,i)=>i%Math.ceil((xvalues.length-1)/(small?3:5))===0||i===xvalues.length-1);
    for(const v of ticks)svg.append(node('text',{x:x(v),y:H-29,'text-anchor':'middle'},String(v)));
    const heading=node('text',{x:small?12:L,y:17});
    const limit=Math.floor((W-24)/13),parts=small&&ylabel.length>limit?[ylabel.slice(0,limit),ylabel.slice(limit)]:[ylabel];
    parts.forEach((part,i)=>heading.append(node('tspan',{x:small?12:L,dy:i?17:0},part)));
    svg.append(heading,node('text',{x:W/2,y:H-8,'text-anchor':'middle'},xlabel));
    for(const s of series){svg.append(node('polyline',{points:s.values.map((v,i)=>`${x(xvalues[i])},${y(v)}`).join(' '),class:s.class}));if(s.dots)for(let i=0;i<s.values.length;i++)svg.append(node('circle',{cx:x(xvalues[i]),cy:y(s.values[i]),r:4,fill:'#087e82'}));}
  }
  function render(){
    const sense=state.mode==='sensing',s=C.experiment(state);$('theory-delay-out').textContent=`${state.delay} 样本 = ${state.delay*C.cfg.TsNs} ns`;$('theory-noise-out').textContent=state.sigma.toFixed(1);
    $('theory-bit-wrap').hidden=sense;$('theory-candidate-delay-wrap').hidden=!sense;$('theory-candidate-bit-wrap').hidden=sense;
    $('theory-known').textContent=sense?'已知整段发射 s；不把真值延迟交给估计器':'已知波形 s、延迟 d 与增益 α=1';
    $('theory-unknown').textContent=sense?'未知延迟 d 与实增益 α；本实验只搜索整数延迟':'未知比特 b∈{−1,+1}；两候选等先验';
    $('theory-search').textContent=sense?'13 个延迟模板；每个模板分别拟合增益':'2 个符号模板；比较与观测的平方误差';
    $('theory-decision').textContent=sense?'最大得分 → 延迟估计 → 单站距离':'最大得分 → 符号判决';
    const candidate=sense?+$('theory-candidate-delay').value:+$('theory-candidate-bit').value,selected=s.scores.find(v=>v.candidate===candidate);
    $('theory-candidate-out').textContent=`${candidate} 样本 = ${candidate*C.cfg.TsNs} ns`;
    chart('theory-wave',[{values:s.y,class:'observed'},{values:selected.template,class:'candidate'}],s.y.map((_,i)=>i*C.cfg.TsNs),'接收采样时刻 nTs（ns）','归一化实基带幅度');
    chart('theory-scores',[{values:s.scores.map(v=>v.score),class:'observed',dots:true}],s.scores.map(v=>sense?v.candidate*C.cfg.TsNs:v.candidate),sense?'候选延迟 dTs（ns）':'候选符号 b（无量纲）',sense?'投影得分 |sᵀy|² / E²（无量纲）':'负残差 −‖y−bsd‖² / E（无量纲）');
    $('theory-result').textContent=sense?`估计 d̂=${s.best.candidate}，τ̂=${s.tauNs} ns，R̂=${s.rangeM.toFixed(2)} m；估计增益 α̂=${s.best.gain.toFixed(3)}。生成真值为 ${state.delay} 样本（${(state.delay*1.5).toFixed(2)} m），本次误差 ${(Math.abs(s.best.candidate-state.delay)*1.5).toFixed(2)} m。`:`判决 b̂=${s.best.candidate>0?'+1':'−1'}，生成真值 b=${state.bit>0?'+1':'−1'}；本次${s.best.candidate===state.bit?'判对':'判错'}。这一次结果不是误码率。`;
    $('theory-selected').textContent=`当前模板候选 ${candidate}，得分 ${selected.score.toFixed(4)}${sense?`，拟合增益 ${selected.gain.toFixed(4)}`:''}。虚线显示单位幅度模板，未乘拟合增益。噪声种子 ${state.seed}；改变 σ 只缩放同一噪声样本。`;
    const body=$('theory-score-body');body.replaceChildren();for(const row of s.scores){const tr=document.createElement('tr');for(const value of [sense?`${row.candidate} / ${row.candidate*10} ns`:String(row.candidate),row.score.toFixed(5),sense?row.gain.toFixed(5):'固定为 1',row.candidate===s.best.candidate?'最大得分':'']){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
  }
  document.querySelectorAll('input[name=theory-mode]').forEach(el=>el.addEventListener('change',()=>{state.mode=el.value;render();}));
  for(const [id,key]of [['theory-delay','delay'],['theory-noise','sigma'],['theory-bit','bit']])$(id).addEventListener('input',e=>{state[key]=+e.target.value;render();});
  for(const id of ['theory-candidate-delay','theory-candidate-bit'])$(id).addEventListener('input',render);
  $('theory-resample').addEventListener('click',()=>{state.seed=(state.seed+1)>>>0;render();});
  $('theory-reset').addEventListener('click',()=>{Object.assign(state,{mode:'sensing',delay:5,bit:1,sigma:0,seed:7});$('theory-mode-sensing').checked=true;for(const [id,v]of [['theory-delay',5],['theory-noise',0],['theory-bit',1],['theory-candidate-delay',5],['theory-candidate-bit',1]])$(id).value=v;render();});
  const crbState={T:8,blocks:2000,seed:2026};
  const format=v=>Number(v.toPrecision(6)).toString();
  function fillTable(id,rows){
    const body=$(id);body.replaceChildren();
    for(const values of rows){const tr=document.createElement('tr');values.forEach((v,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.setAttribute('scope','row');cell.textContent=String(v);tr.append(cell);});body.append(tr);}
  }
  function renderCrb(){
    const s=C.crbExperiment(crbState),first=s.rows.slice(0,64),stride=Math.ceil((s.blocks-1)/159);
    const checks=s.running.filter((r,i)=>i%stride===0||i===s.blocks-1);
    chart('crb-energy',[{values:first.map(r=>r.energy),class:'observed'},{values:first.map(()=>s.T*s.P),class:'candidate'}],first.map(r=>r.block),'发射块编号（无量纲）','块能量 Σxᵢ²（归一化）',true);
    chart('crb-average',[{values:checks.map(r=>r.meanCrb),class:'observed'},{values:checks.map(()=>s.theory.fixed),class:'candidate'},{values:checks.map(()=>s.theory.gaussian),class:'reference'}],checks.map(r=>r.block),'累计块数 b（无量纲）','平均条件 CRB（增益²）',true);
    $('crb-result').textContent=`T=${s.T}，B=${s.blocks}，种子=${s.seed}。两类理论 E[J]=${format(s.theory.meanInformation)}；本次高斯平均 CRB=${format(s.meanCrb)}，理论值=${format(s.theory.gaussian)}，BPSK=${format(s.theory.fixed)}。本次 1/平均 J=${format(s.inverseMeanInformation)}，不要把它当成平均 CRB。`;
    $('crb-uncertainty').textContent=s.meanStandardError===null?
      '重尾警告：当前 T≤4，CRB 的理论方差发散；不显示普通标准误。有限样本均值可能大幅跳动，增加 B 不保证每次更靠近理论值。T≤2 时连理论均值也发散（本控件不模拟该区间）。':
      `按独立块解析方差计算，本次 B 下高斯平均 CRB 的理论标准误为 ${format(s.meanStandardError)}（增益²）。这是抽样波动尺度，不是本次误差上界或正态置信区间；有限样本及重尾会影响数值吻合，增加 B 不保证单次更接近。`;
    fillTable('crb-summary-body',[
      ['平均块能量 / 归一化',format(s.T*s.P),format(s.meanEnergy),format(s.T*s.P)],
      ['平均 J / 增益⁻²',format(s.theory.meanInformation),format(s.meanInformation),format(s.theory.meanInformation)],
      ['平均 CRB / 增益²',format(s.theory.fixed),format(s.meanCrb),format(s.theory.gaussian)],
      ['1 / 平均 J / 增益²',format(s.theory.fixed),format(s.inverseMeanInformation),format(s.theory.fixed)],
      ['块 CRB 5% / 50% / 95% 分位数',format(s.theory.fixed),[s.q05,s.q50,s.q95].map(format).join(' / '),'未计算'],
      ['最小块能量 / 归一化',format(s.T*s.P),format(s.minEnergy),'分布下确界 0'],
      ['最大块 CRB / 增益²',format(s.theory.fixed),format(s.maxCrb),'无有限分布上界']
    ]);
    fillTable('crb-energy-body',first.map(r=>[r.block,format(r.energy),format(r.crb)]));
    fillTable('crb-running-body',checks.map(r=>[r.block,format(r.meanCrb)]));
  }
  for(const [id,key]of [['crb-length','T'],['crb-blocks','blocks']])$(id).addEventListener('change',e=>{crbState[key]=+e.target.value;renderCrb();});
  $('crb-resample').addEventListener('click',()=>{crbState.seed=(crbState.seed+1)>>>0;renderCrb();});
  $('crb-reset').addEventListener('click',()=>{Object.assign(crbState,{T:8,blocks:2000,seed:2026});$('crb-length').value=8;$('crb-blocks').value=2000;renderCrb();});
  const rateState={gamma:1,T:8};
  function renderRate(){
    const s=C.rateCrbComparison(rateState),svg=$('rate-plane');svg.replaceChildren();
    const W=Math.max(240,Math.min(720,svg.clientWidth||720)),H=285,L=58,R=22,top=35,bottom=68;
    const x=v=>L+v/3.5*(W-L-R),y=v=>H-bottom-v/1.05*(H-top-bottom);
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.append(node('title',{},'BPSK 圆点和高斯方点；横轴互信息，纵轴平均条件 CRB'));
    for(const v of [0,.25,.5,.75,1])svg.append(node('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:'#e4ecef'}),node('text',{x:L-8,y:y(v)+4,'text-anchor':'end'},v.toString()));
    svg.append(node('line',{x1:L,x2:W-R,y1:y(0),y2:y(0),class:'axis'}));
    for(const v of [0,1,2,3])svg.append(node('text',{x:x(v),y:H-bottom+20,'text-anchor':'middle'},String(v)));
    svg.append(node('text',{x:12,y:18},'D：平均条件 CRB / 增益²'),node('text',{x:W/2,y:H-25,'text-anchor':'middle'},'I：互信息（向右更高）'),node('text',{x:W/2,y:H-7,'text-anchor':'middle'},'bit / 实信道使用'));
    for(const [i,p]of s.points.entries()){
      const marker=i===0?node('circle',{cx:x(p.information),cy:y(p.averageCrb),r:5,fill:'#aa4d1b'}):node('rect',{x:x(p.information)-5,y:y(p.averageCrb)-5,width:10,height:10,fill:'#087e82'});
      marker.append(node('title',{},`${p.name}: I=${p.information.toFixed(6)}, D=${p.averageCrb.toFixed(6)}`));svg.append(marker);
    }
    $('rate-snr-out').textContent=`${Math.round(10*Math.log10(s.gamma))} dB；γ=${format(s.gamma)}；σ꜀²=${format(s.communicationNoiseVariance)}`;
    $('rate-result').textContent=`T=${s.T}，σₛ²=1。BPSK：I=${s.points[0].information.toFixed(6)}，D=${s.points[0].averageCrb.toFixed(6)}；高斯：I=${s.points[1].information.toFixed(6)}，D=${s.points[1].averageCrb.toFixed(6)}。仅两个设计点，无连线。`;
    fillTable('rate-table-body',s.points.map(p=>[p.name==='Gaussian'?'高斯 N(0,1)':'等概率 BPSK ±1',p.information.toFixed(9),p.averageCrb.toFixed(6),s.T]));
  }
  $('rate-snr').addEventListener('input',e=>{rateState.gamma=10**(+e.target.value/10);renderRate();});
  $('rate-length').addEventListener('change',e=>{rateState.T=+e.target.value;renderRate();});
  $('rate-reset').addEventListener('click',()=>{Object.assign(rateState,{gamma:1,T:8});$('rate-snr').value=0;$('rate-length').value=8;renderRate();});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{render();renderCrb();renderRate();},100);});
  render();renderCrb();renderRate();
})();
