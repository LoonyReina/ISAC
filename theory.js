(function(){
  'use strict';
  const C=window.Theory,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const state={mode:'sensing',delay:5,bit:1,sigma:0,seed:7,candidate:5};
  function node(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
  function chart(id,series,xvalues,xlabel,ylabel){
    const svg=$(id);svg.replaceChildren();svg.append(node('title',{},`${ylabel}；${xlabel}`));
    const W=720,H=285,L=66,R=22,T=28,B=53;
    const values=series.flatMap(s=>s.values),lo=Math.min(0,...values),hi=Math.max(0,...values),pad=Math.max(.15,(hi-lo)*.13),ymin=lo-pad,ymax=hi+pad;
    const x=v=>L+(v-xvalues[0])/(xvalues.at(-1)-xvalues[0])*(W-L-R),y=v=>T+(ymax-v)/(ymax-ymin)*(H-T-B);
    for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,yy=y(v);svg.append(node('line',{x1:L,y1:yy,x2:W-R,y2:yy,stroke:'#e4ecef'}),node('text',{x:L-8,y:yy+4,'text-anchor':'end'},v.toFixed(1)));}
    svg.append(node('line',{x1:L,y1:y(0),x2:W-R,y2:y(0),class:'axis'}));
    const ticks=xvalues.length<=3?xvalues:xvalues.filter((_,i)=>i%Math.ceil((xvalues.length-1)/5)===0||i===xvalues.length-1);
    for(const v of ticks)svg.append(node('text',{x:x(v),y:H-29,'text-anchor':'middle'},String(v)));
    svg.append(node('text',{x:L,y:17},ylabel),node('text',{x:(W+L-R)/2,y:H-8,'text-anchor':'middle'},xlabel));
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
  render();
})();
