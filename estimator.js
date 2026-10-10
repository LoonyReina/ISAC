/* Progressive, independent enhancement: never changes existing CRB/rate controls. */
(()=>{
  'use strict';const C=window.Estimator,$=id=>document.getElementById('estimator-'+id);if(!C||!$('mode'))return;
  const fmt=v=>{if(!Number.isFinite(v))throw new RangeError('nonfinite display');return Math.abs(v)!==0&&(Math.abs(v)<.0001||Math.abs(v)>=10000)?v.toExponential(5):v.toFixed(6);};
  let current=null;
  function node(tag,attrs={},label){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(label!==undefined)n.textContent=label;return n;}
  function plot(family){const svg=$(family),f=current[family],W=Math.max(200,svg.clientWidth||500),H=270,L=W<330?61:69,R=15,top=23,bottom=H-47,w=W-L-R,h=bottom-top,x=b=>L+(b-1)/(current.B-1)*w,y=v=>bottom-v/f.axisMax*h;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.replaceChildren();
    svg.append(node('title',{},`${family==='gaussian'?'高斯':'BPSK'}；${current.mode==='fixed'?'长虚线同时表示条件 CRB 与解析 MSE':'长虚线平均条件 CRB，点线解析 MSE'}；纵轴最大 ${fmt(f.axisMax)}`));
    for(let k=0;k<4;k++){const v=f.axisMax*k/3,yy=y(v);svg.append(node('line',{x1:L,y1:yy,x2:W-R,y2:yy,stroke:'#e0e5e3'}),node('text',{x:L-5,y:yy+4,'text-anchor':'end'},v===0?'0':v.toPrecision(2)));}
    for(const b of [1,Math.round(current.B/2),current.B])svg.append(node('text',{x:x(b),y:bottom+20,'text-anchor':b===1?'start':b===current.B?'end':'middle'},String(b)));
    svg.append(node('text',{x:L,y:14},'增益²'),node('text',{x:W-R,y:H-5,'text-anchor':'end'},'累计试验 b'));
    function line(points,color,dash){svg.append(node('polyline',{points:points.map(p=>`${x(p.b)},${y(p.value)}`).join(' '),fill:'none',stroke:color,'stroke-width':2,...(dash?{'stroke-dasharray':dash}:{})}));}
    if(current.mode==='fresh')line([{b:1,value:f.reference.mse},{b:current.B,value:f.reference.mse}],'#7350a1','2 5');
    line(f.checkpoints.map(p=>({b:p.b,value:p.meanCrb})),'#925224','8 5');line(f.checkpoints.map(p=>({b:p.b,value:p.mse})),'#126c76');
  }
  function tableRow(values){const row=document.createElement('tr');for(const v of values){const cell=document.createElement('td');cell.textContent=String(v);row.append(cell);}return row;}
  function render(){for(const family of ['gaussian','bpsk'])plot(family);
    const measures=[['实际试验数','trials'],['平均实现能量','meanEnergy'],['经验偏差 mean(θ̂−1)','bias'],['实际经验 MSE / 增益²','mse'],['平均条件 CRB / 增益²','meanCrb'],[current.mode==='fixed'?'解析条件 MSE（同 CRB）':'解析无条件 MSE','analyticMse'],['最小实现能量','minEnergy'],['最大单次平方误差 / 增益²','maxSquaredError']];
    $('summary').replaceChildren(...measures.map(([label,key])=>tableRow([label,...['gaussian','bpsk'].map(f=>key==='trials'?current[f].summary[key]:fmt(current[f].summary[key]))])));
    const rows=[],points=[];for(const family of ['gaussian','bpsk']){const f=current[family],name=family==='gaussian'?'高斯':'BPSK';for(const r of f.rows.slice(0,16))rows.push(tableRow([name,r.b,fmt(r.energy),fmt(r.thetaHat),fmt(r.squaredError),fmt(r.crb)]));for(const p of f.checkpoints)points.push(tableRow([name,p.b,fmt(p.mse),fmt(p.meanCrb)]));}
    $('rows').replaceChildren(...rows);$('checkpoints').replaceChildren(...points);
    $('diagnostic').textContent=`本次 mean(E·e²)：高斯 ${fmt(current.gaussian.summary.meanStandardizedSquared)}，BPSK ${fmt(current.bpsk.summary.meanStandardizedSquared)}；这不是 MSE。`;
    $('result').textContent=`${current.mode==='fixed'?'固定发射块，只换噪声':'每次重抽发射块和噪声'}；T=${current.T}，B=${current.B}，种子=${current.seed}。高斯实际 MSE=${fmt(current.gaussian.summary.mse)}；BPSK 实际 MSE=${fmt(current.bpsk.summary.mse)}。全部试验保留。`;
    $('warning').textContent=current.mode==='fresh'&&current.T<=4?'重抽高斯块：平均 MSE 有限，但单次平方误差的方差无穷大（不是误差 e 的方差）。低能量块会造成大跳动；不画普通正态标准误或均值置信区间。换种子、增加试验数都不保证短模拟稳定。':current.mode==='fixed'?'固定非零 x：平方误差的条件方差为 2/E²，有限；这也适用于 T=3、4。条件 CRB 与解析条件 MSE 共用长虚线。':'本次平方误差方差有限，有限模拟仍会波动。经验 MSE 低于 CRB 并不违反期望下界；这里不画置信区间。';
    $('mode-note').textContent=current.mode==='fixed'?'当前只对噪声平均；两块信号各自固定，能量可能不同。不要把一块偶然较强的高斯信号当作一般优胜者。':'当前同时对发射块与噪声平均；解析 MSE：高斯 1/(T−2)，BPSK 1/T。每次估计仍只用 T 个观测，不合并为 TB 样本估计。';
  }
  function settings(){const raw=$('seed').value.trim();if(!/^\d+$/.test(raw))throw new RangeError('种子须填写 0–4294967295 的整数');return {mode:$('mode').value,T:Number($('length').value),B:Number($('count').value),seed:C.seedValue(Number(raw))};}
  function clearFailure(error){current=null;for(const id of ['gaussian','bpsk','summary','rows','checkpoints'])$(id).replaceChildren();$('result').textContent=`本次运行失败：${error.message}。未丢弃试验或替换能量，请修正设置后重算。`;$('warning').textContent='失败状态：没有可用模拟结果。';$('diagnostic').textContent='本次运行失败，无诊断值。';$('mode-note').textContent='';}
  function run(){try{current=C.experiment(settings());render();}catch(error){clearFailure(error);}}
  for(const id of ['mode','length','count','seed'])$(id).addEventListener('change',run);
  $('rerun').addEventListener('click',run);
  $('resample').addEventListener('click',()=>{try{const s=settings();$('seed').value=String((s.seed+1)>>>0);run();}catch(e){clearFailure(e);}});
  $('reset').addEventListener('click',()=>{$('mode').value='fixed';$('length').value='8';$('count').value='1000';$('seed').value='2026';run();});
  window.addEventListener('resize',()=>{if(current)for(const family of ['gaussian','bpsk'])plot(family);});run();
})();
