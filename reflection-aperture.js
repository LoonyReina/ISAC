/* Independent known-geometry illustration. No channel observations, receiver or export calls. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),C=window.ReflectionApertureCore;
 const plots=[$('ra-point'),$('ra-plane')],buttons=Array.from({length:5},(_,i)=>$('ra-sample-'+i));
 let revealed=false,selected=2,wallMode='full',current=null;
 const text=(id,value)=>{$(id).textContent=value;},f=(x,n=6)=>Number(x).toFixed(n),coord=p=>'('+f(p[0],3)+', '+f(p[1],3)+') m';
 const node=(tag,attrs={},value)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(value!==undefined)e.textContent=value;return e;};
 const scale=34,x=v=>42+(v+3)*scale,y=v=>20+(6-v)*scale;
 const label=(svg,p,value,attrs={})=>svg.append(node('text',{x:x(p[0])+6,y:y(p[1])-8,...attrs},value));
 const line=(svg,a,b,attrs={})=>svg.append(node('line',{x1:x(a[0]),y1:y(a[1]),x2:x(b[0]),y2:y(b[1]),...attrs}));
 const dot=(svg,p,attrs={})=>svg.append(node('circle',{cx:x(p[0]),cy:y(p[1]),r:4,...attrs}));
 function clear(){current=null;for(const svg of plots)svg.replaceChildren();for(const id of ['ra-point-readout','ra-plane-readout','ra-comparison','ra-prediction-feedback'])text(id,'');$('ra-table').replaceChildren();$('ra-results').hidden=true;}
 function fail(message){clear();text('ra-status','图解无法计算：'+message+'。旧图与数字已清空；原信道实验不受影响。');$('ra-awaiting').hidden=false;}
 function options(){const center=$('ra-center').value,aperture=$('ra-aperture').value;if(!center.trim()||!aperture.trim())throw Error('中心和孔径必须为有限数');return {centerX:Number(center),apertureM:Number(aperture),wallMode};}
 function controls(){for(const [id,out]of [['ra-center','ra-center-value'],['ra-aperture','ra-aperture-value']]){const raw=$(id).value,v=Number(raw);text(out,raw.trim()&&Number.isFinite(v)?f(v,1)+' m':'无效输入');}$('ra-wall').setAttribute('aria-pressed',wallMode==='short');text('ra-wall-note',wallMode==='short'?'当前墙段：x∈[1.8,2.2] m。有限面片支撑，未增加遮挡或绕射模型。':'当前墙段：x∈[−2,10] m。此控件只改本节指定的面片范围。');}
 function frame(svg,kind){svg.replaceChildren();svg.setAttribute('viewBox','0 0 560 360');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('data-metres-pixel-scale',scale);svg.setAttribute('data-world-bounds','-3,11,-3,6');svg.append(node('title',{},kind==='point'?'五个位置经过同一固定点':'五个位置在同一平面上的镜面构造'));svg.append(node('desc',{},'已知几何，米制等比例坐标。数字替代见下方五样本表。粗线只表示选中位置。'));
  for(const v of [0,2,4,6,8,10]){line(svg,[v,-2.5],[v,5],{stroke:'#edf1f3'});svg.append(node('text',{x:x(v),y:344,'text-anchor':'middle'},String(v)));}for(const v of [-2,0,2,4]){line(svg,[-2.5,v],[10.5,v],{stroke:'#edf1f3'});svg.append(node('text',{x:8,y:y(v)+4},String(v)));}
  svg.append(node('text',{x:506,y:344},'x / m'));svg.append(node('text',{x:8,y:16},'y / m'));
  line(svg,current.wall.start,current.wall.end,{stroke:'#526477','stroke-width':5,'data-wall':'true'});
  dot(svg,current.transmitter,{fill:'#253b51','data-object':'transmitter'});label(svg,current.transmitter,'T');
 }
 function renderPanel(kind){const svg=kind==='point'?plots[0]:plots[1];frame(svg,kind);
  for(const sample of current.samples){const active=sample.index===selected,plane=sample.plane,point=kind==='point'?current.point:plane.reflection,color=kind==='point'?'#2467bd':'#b86218';
   if(kind==='point'||plane.status==='interior'||plane.status==='edge')svg.append(node('polyline',{points:[current.transmitter,point,sample.receiver].map(p=>x(p[0])+','+y(p[1])).join(' '),fill:'none',stroke:color,'stroke-width':active?3:1.2,'stroke-dasharray':kind==='plane'&&plane.status==='edge'?'4 4':'none','data-ray':kind,'data-sample':sample.index,'data-status':kind==='point'?'valid':plane.status}));
   dot(svg,sample.receiver,{fill:active?color:'#566c80',r:active?5:3,'data-receiver':sample.index});
   if(active)label(svg,sample.receiver,'R'+(sample.index+1),{'text-anchor':'middle',x:x(sample.receiver[0]),y:y(sample.receiver[1])-12});
   if(kind==='plane'&&plane.status!=='absent')dot(svg,point,{fill:color,r:active?4:2,'data-interaction':sample.index});
  }
  const s=current.samples[selected];if(kind==='point'){dot(svg,current.point,{fill:'#2467bd','data-object':'point'});label(svg,current.point,'S · 固定');}
  else{const p=s.plane,im=p.imageTransmitter;dot(svg,im,{fill:'white',stroke:'#657080','stroke-dasharray':'2 2','data-object':'image'});label(svg,im,'T′ · 计算构造');
   line(svg,im,s.receiver,{stroke:'#657080','stroke-width':1.3,'stroke-dasharray':'5 5','data-construction':'image-ray'});
   line(svg,p.reflection,[p.reflection[0]+p.normal[0],p.reflection[1]+p.normal[1]],{stroke:'#526477','stroke-width':1.4,'stroke-dasharray':'3 3','data-construction':'normal'});
   if(p.status==='absent'){dot(svg,p.reflection,{fill:'white',stroke:'#657080','data-object':'outside-construction'});label(svg,p.reflection,'Q∞ · 面片外');}else label(svg,p.reflection,'Q'+(selected+1)+(p.status==='edge'?' · 边缘':''));
  }
 }
 const statusLabel=p=>({interior:'严格内部',edge:'边缘极限',absent:'面片外，无镜面路径'})[p.status];
 function feedback(){const labels={unsure:'先看构造',fixed:'两个交互点都固定',different:'固定点不动，平面交互点会动',moving:'两个交互点都会动'};text('ra-prediction-feedback','你的预测：'+(labels[$('ra-prediction').value]||labels.unsure)+'。对照要点：S 固定；在本例中，不同接收位置对应不同的无限平面构造 Qₙ。D=0 时所有位置和 Qₙ 都重合；短墙还要检查 Qₙ 是否位于面片内。');}
 function render(){feedback();for(const kind of ['point','plane'])renderPanel(kind);const s=current.samples[selected],p=s.plane;
  for(const [i,b]of buttons.entries())b.setAttribute('aria-pressed',i===selected);
  text('ra-point-readout','R'+(selected+1)+'='+coord(s.receiver)+'；S='+coord(current.point)+'\nL='+f(s.point.lengthM)+' m；τ='+f(s.point.delayS*1e9)+' ns');
  text('ra-plane-readout','R'+(selected+1)+'='+coord(s.receiver)+'；Q'+(p.status==='absent'?'∞':'')+'='+coord(p.reflection)+'\n'+statusLabel(p)+(p.status==='absent'?'；该有限面片内无镜面路径，L / τ 不适用。':'；'+(p.status==='edge'?'几何极限 ':'')+'L='+f(p.lengthM)+' m；τ='+f(p.delayS*1e9)+' ns'));
  text('ra-comparison',current.apertureM===0?'D=0：五个样本重合于同一位置；没有增加独立空间约束。':p.status==='absent'?'当前平面的无限延长构造落在面片外；固定点模型仍有指定的 T→S→R 路径。':p.lengthM===s.point.lengthM?'当前样本两条路长相同；这不足以识别同一种物体。':'当前样本固定点路长比平面几何'+(p.status==='edge'?'极限':'路径')+'长 '+f(s.point.lengthM-p.lengthM)+' m。这是指定几何的差，不是估计误差。');
  $('ra-table').replaceChildren();for(const sample of current.samples){const tr=document.createElement('tr'),p=sample.plane;tr.setAttribute('data-selected',sample.index===selected);tr.setAttribute('data-sample',sample.index);tr.setAttribute('data-plane-status',p.status);tr.setAttribute('data-point-length',sample.point.lengthM);if(p.lengthM!==null)tr.setAttribute('data-plane-length',p.lengthM);for(const value of ['R'+(sample.index+1)+' / '+f(sample.receiver[0],3),f(sample.point.lengthM)+' / '+f(sample.point.delayS*1e9),f(p.reflection[0]),statusLabel(p),p.status==='absent'?'不适用':f(p.lengthM)+' / '+f(p.delayS*1e9)+(p.status==='edge'?'（极限）':'')]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('ra-table').append(tr);}
  $('ra-results').hidden=false;$('ra-awaiting').hidden=true;
 }
 function calculate(announce=false){controls();if(!revealed)return;try{const result=C.scenario(options());if(result.status!=='valid'||result.samples.length!==5||result.samples.some(s=>s.plane.status==='invalid'||s.point.status!=='valid'))throw Error(result.reason||'几何条件不成立');current=result;render();text('ra-status',announce?'已显示五个已知位置的几何对照；未生成观测或估计。':'');}catch(error){fail(error.message);}}
 if(!C||typeof C.scenario!=='function'){fail('几何脚本未能加载，可继续阅读默认手算');for(const id of ['ra-reveal','ra-center','ra-aperture','ra-wall','ra-reset','ra-prediction',...buttons.map(b=>b.id)])$(id).disabled=true;return;}
 for(const id of ['ra-center','ra-aperture']){ $(id).addEventListener('input',()=>calculate(false));$(id).addEventListener('change',()=>calculate(true));}
 $('ra-prediction').addEventListener('change',()=>{if(current)feedback();});
 $('ra-reveal').addEventListener('click',()=>{revealed=true;calculate(true);});
 $('ra-wall').addEventListener('click',()=>{wallMode=wallMode==='full'?'short':'full';calculate(true);});
 for(const [i,b]of buttons.entries())b.addEventListener('click',()=>{selected=i;if(current)render();});
 $('ra-reset').addEventListener('click',()=>{$('ra-center').value='6';$('ra-aperture').value='2';$('ra-prediction').value='unsure';wallMode='full';selected=2;revealed=false;clear();controls();for(const [i,b]of buttons.entries())b.setAttribute('aria-pressed',i===selected);$('ra-explain').open=false;$('ra-static').open=false;$('ra-awaiting').hidden=false;text('ra-status','已恢复图解默认值；再次预测或揭示。');});
 controls();
})();
