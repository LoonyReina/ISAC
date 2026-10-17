const $=id=>document.getElementById(id),form=$('stats-form');
if(form){
 let worker=null,result=null,active=false;
 const status=(text,error=false)=>{$('stats-status').textContent=text;$('stats-status').classList.toggle('stats-error',error);};
 const terminate=()=>{worker?.terminate();worker=null;active=false;$('stats-cancel').disabled=true;$('stats-run').disabled=false;};
 const invalidate=()=>{terminate();result=null;$('stats-live-result').hidden=true;status('输入已更改，旧结果已废弃。请按“重算”生成当前观测。');};
 $('stats-snr').addEventListener('input',()=>{$('stats-snr-value').textContent=`${$('stats-snr').value} dB`;invalidate();});
 $('stats-seed').addEventListener('input',invalidate);
 $('stats-cancel').addEventListener('click',()=>{terminate();result=null;$('stats-live-result').hidden=true;status('已取消。没有把部分搜索显示为完成结果。');});
 $('stats-next').addEventListener('click',()=>{const seed=Number($('stats-seed').value);$('stats-seed').value=Number.isInteger(seed)&&seed>=1&&seed<4294967295?seed+1:1;invalidate();form.requestSubmit();});
 $('stats-zoom').addEventListener('change',()=>{if(result)draw(result);});
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const seed=Number($('stats-seed').value),snrDb=Number($('stats-snr').value);
  if(!Number.isInteger(seed)||seed<1||seed>4294967295){status('种子须为 1–4294967295 的整数。',true);return;}
  terminate();result=null;$('stats-live-result').hidden=true;active=true;$('stats-cancel').disabled=false;$('stats-run').disabled=true;status('正在准备实时计算；可以取消，或更改输入。');
  try{worker=new Worker(new URL('./browser-worker.mjs',import.meta.url),{type:'module'});}catch(error){terminate();status(`无法启动计算：${error.message}`,true);return;}
  const current=worker;
  worker.onmessage=({data})=>{if(worker!==current||!active)return;if(data.type==='progress'){status(data.message);return;}if(data.type==='error'){terminate();status(`本次计算未完成：${data.message}`,true);return;}if(data.type==='result'){result=data.result;terminate();render(result);status(`已完成：种子 ${seed}，SNR ${snrDb} dB。121 / 6,561 个网格候选均已计算；局部细化没有全局保证。`);}};
  worker.onerror=event=>{if(worker!==current)return;terminate();status(`计算中断：${event.message||'Worker 未能加载'}`,true);};
  worker.postMessage({snrDb,seed});
 });
 function render(r){
  const truth=Array.isArray(r.truth)?r.truth:(r.truth.qa||[r.truth.q,r.truth.a]);
  result={...r,truth};$('stats-live-result').hidden=false;
  const container=$('stats-estimates');container.replaceChildren();
  for(const [key,title,mark]of [['coarse','粗网格 · 121 候选','□'],['fine','细网格 · 6,561 候选','◇'],['local','开单元局部细化 · 扩展','＋']]){
   const e=r[key],card=document.createElement('div');card.className='stats-estimate';
   const heading=document.createElement('strong');heading.textContent=`${mark} ${title}`;card.append(heading);
   const score=document.createElement('span');score.className='stats-score';score.textContent=`分数 ${e.score.toFixed(3)}`;card.append(score);
   const coordinates=document.createElement('span');coordinates.className='stats-coordinates';coordinates.textContent=`q ${e.q.toFixed(5)}　a ${e.a.toFixed(5)}\n误差 Δq ${(e.q-truth[0]).toFixed(5)}　Δa ${(e.a-truth[1]).toFixed(5)}`;coordinates.style.whiteSpace='pre-line';card.append(coordinates);container.append(card);
  }
  $('stats-crb').textContent=r.crb.ok?`延迟 ${r.crb.std[0].toFixed(5)} bin　多普勒 ${r.crb.std[1].toFixed(5)} bin`:`未提供普通 CRB：${r.crb.reason||'FIM 不满足正定/条件数要求'}`;
  const attempts=Array.isArray(r.statuses)?r.statuses:[],failed=attempts.filter(a=>a.success===false).length;
  $('stats-solver').textContent=`实时有界模式搜索：${attempts.length} 次局部尝试，${failed} 次未满足停止准则。最终保留${r.local.origin==='grid'?'网格候选':'局部候选'}${r.local.solver_success===false?'（未收敛状态，按可行性与分数保留）':''}。整数延迟分界只作为网格候选，不跨单元求导。`;
  draw(result);
 }
 function draw(r){
  const canvas=$('stats-map'),ctx=canvas.getContext('2d'),W=820,H=620,p={x:80,y:32,w:680,h:510};
  const zoom=$('stats-zoom').checked,t=r.truth,qmin=zoom?Math.max(0,t[0]-.2):0,qmax=zoom?t[0]+.2:2,amin=zoom?t[1]-.2:-1,amax=zoom?t[1]+.2:1;
  const X=q=>p.x+(q-qmin)/(qmax-qmin)*p.w,Y=a=>p.y+(amax-a)/(amax-amin)*p.h;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#f5f8f8';ctx.fillRect(0,0,W,H);
  let max=0;for(const s of r.heatmap)max=Math.max(max,s);
  ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();
  for(let qi=0;qi<81;qi++)for(let ai=0;ai<81;ai++){
   const q=qi*.025,a=-1+ai*.025;if(q+.0125<qmin||q-.0125>qmax||a+.0125<amin||a-.0125>amax)continue;
   const v=max>0?Math.pow(Math.max(0,r.heatmap[qi*81+ai]/max),.6):0;
   ctx.fillStyle=`rgb(${Math.round(240-213*v)},${Math.round(247-136*v)},${Math.round(244-140*v)})`;
   ctx.fillRect(X(q-.0125),Y(a+.0125),.025/(qmax-qmin)*p.w+1,.025/(amax-amin)*p.h+1);
  }
  // Cholesky image of a unit circle: covariance scale, explicitly not coverage probability.
  if(r.crb.ok){const c=r.crb.covariance,l11=Math.sqrt(c[0][0]),l21=c[1][0]/l11,l22=Math.sqrt(Math.max(0,c[1][1]-l21*l21));ctx.beginPath();for(let k=0;k<=128;k++){const z=k/128*2*Math.PI,x=X(t[0]+l11*Math.cos(z)),y=Y(t[1]+l21*Math.cos(z)+l22*Math.sin(z));if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle='#9b682a';ctx.lineWidth=2.5;ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([]);}
  for(const [key,color,shape]of [['coarse','#444b61','square'],['fine','#275cab','diamond'],['local','#d74e2a','plus'],['truth','#111e28','circle']]){
   const v=key==='truth'?{q:t[0],a:t[1]}:r[key],x=X(v.q),y=Y(v.a);ctx.strokeStyle='white';ctx.lineWidth=7;ctx.beginPath();const path=()=>{if(shape==='square')ctx.rect(x-7,y-7,14,14);else if(shape==='diamond'){ctx.moveTo(x,y-9);ctx.lineTo(x+9,y);ctx.lineTo(x,y+9);ctx.lineTo(x-9,y);ctx.closePath();}else if(shape==='plus'){ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.moveTo(x,y-10);ctx.lineTo(x,y+10);}else ctx.arc(x,y,5,0,Math.PI*2);};path();ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
  }
  ctx.restore();ctx.strokeStyle='#aebfc3';ctx.lineWidth=1;ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.font='17px system-ui';ctx.fillStyle='#4a6672';ctx.textAlign='center';
  for(let i=0;i<=4;i++){let q=qmin+(qmax-qmin)*i/4,a=amin+(amax-amin)*i/4;ctx.fillText(q.toFixed(2),X(q),p.y+p.h+29);ctx.textAlign='right';ctx.fillText(a.toFixed(2),p.x-12,Y(a)+6);ctx.textAlign='center';}
  ctx.fillText('延迟 q / bin',p.x+p.w/2,H-19);ctx.save();ctx.translate(22,p.y+p.h/2);ctx.rotate(-Math.PI/2);ctx.fillText('多普勒 a / bin',0,0);ctx.restore();
  canvas.setAttribute('aria-label',`${zoom?'真值附近放大':'全搜索域'}匹配分数。粗网格 q=${r.coarse.q.toFixed(5)}, a=${r.coarse.a.toFixed(5)}；细网格 q=${r.fine.q.toFixed(5)}, a=${r.fine.a.toFixed(5)}；局部细化 q=${r.local.q.toFixed(5)}, a=${r.local.a.toFixed(5)}。虚线是局部 CRB 精度尺度，不是置信区域。`);
 }
}
