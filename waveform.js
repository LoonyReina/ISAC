(()=>{'use strict';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',colors={reference:'#b96120',optimal:'#16727a',target:'#26334d'};
let data;
function node(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function chart(id,xmin,xmax,ymin,ymax,xlabel,ylabel){const svg=$(id);svg.replaceChildren();const width=Math.max(240,svg.clientWidth||600),left=48,right=width-18;svg.setAttribute('viewBox',`0 0 ${width} 300`);const x=v=>left+(v-xmin)/(xmax-xmin)*(right-left),y=v=>240-(v-ymin)/(ymax-ymin)*205;
 const ticks=width<450?2:4;for(let i=0;i<=ticks;i++){const xv=xmin+(xmax-xmin)*i/ticks,yv=ymin+(ymax-ymin)*i/ticks;svg.append(node('line',{x1:x(xv),x2:x(xv),y1:35,y2:240,stroke:'#e0e4eb'}),node('line',{x1:left,x2:right,y1:y(yv),y2:y(yv),stroke:'#e0e4eb'}),node('text',{x:x(xv),y:258,'text-anchor':'middle'},xv.toFixed(1)),node('text',{x:left-7,y:y(yv)+4,'text-anchor':'end'},yv.toFixed(1)));}
 svg.append(node('text',{x:width/2,y:284,'text-anchor':'middle'},xlabel),node('text',{x:left,y:19},ylabel));return {svg,x,y};}
function line(c,values,color,dash){const pts=values.map(p=>`${c.x(p[0])},${c.y(p[1])}`).join(' ');c.svg.append(node('polyline',{points:pts,fill:'none',stroke:color,'stroke-width':2.5,...(dash?{'stroke-dasharray':'7 5'}:{})}));}
function render(){if(!data)return;const st=data.states.find(s=>s.channel===$('wf-channel').value&&s.beta===Number($('wf-beta').value)&&s.angle===Number($('wf-angle').value));if(!st)throw Error('没有此预计算状态');
 const H=data.channels[st.channel],S=data.symbols,R=st.R,C=window.WaveformCore,ref=C.evaluate(H,S,R,st.reference,st.lowerBound),opt=C.evaluate(H,S,R,st.optimal,st.lowerBound);
 const p=chart('wf-pattern',-90,90,0,4,'θ / 度','aᴴRₓa / 功率（Pₜ=1）');line(p,ref.angles.map((a,i)=>[a,ref.pattern[i]]),colors.reference);line(p,opt.angles.map((a,i)=>[a,opt.pattern[i]]),colors.optimal,true);
 const user=Number($('wf-user').value),limit=3;const c=chart('wf-symbols',-limit,limit,-limit,limit,'I / 幅度','Q / 幅度');
 for(let m=0;m<data.dimensions.L;m++){const s=S[user][m];for(const [v,color,shape]of [[ref.Y[user][m],colors.reference,'circle'],[opt.Y[user][m],colors.optimal,'rect']]){c.svg.append(node('line',{x1:c.x(s[0]),y1:c.y(s[1]),x2:c.x(v[0]),y2:c.y(v[1]),stroke:color,'stroke-opacity':.4}));c.svg.append(shape==='circle'?node('circle',{cx:c.x(v[0]),cy:c.y(v[1]),r:4,fill:'none',stroke:color,'stroke-width':2}):node('rect',{x:c.x(v[0])-3,y:c.y(v[1])-3,width:6,height:6,fill:color}));}
 c.svg.append(node('path',{d:`M ${c.x(s[0])-5} ${c.y(s[1])} h 10 M ${c.x(s[0])} ${c.y(s[1])-5} v 10`,stroke:colors.target,'stroke-width':2}));}
 const t=chart('wf-time',0,7,-1.5,1.5,'样本 m（0–7）','Re X₀ₘ / 幅度');line(t,st.reference[0].map((z,i)=>[i,z[0]]),colors.reference);line(t,st.optimal[0].map((z,i)=>[i,z[0]]),colors.optimal,true);
 const fmt=v=>Math.abs(v)<1e-8?v.toExponential(2):v.toFixed(5);
 $('wf-metrics').replaceChildren();for(const [label,a,b]of [['符号误差 E/(KL)',ref.mse,opt.mse],['块能量 ||X||²',ref.energy,opt.energy],['协方差残差 ||Rₓ−R_d||',ref.covarianceResidual,opt.covarianceResidual],['目标值减全局下界 E−E*',ref.boundResidual,opt.boundResidual]]){const row=document.createElement('tr');for(const v of [label,fmt(a),fmt(b)]){const td=document.createElement('td');td.textContent=v;row.append(td);}$('wf-metrics').append(row);}
 $('wf-bound').textContent=`当前全局最小 E* = ${fmt(st.lowerBound)}；两法采用同一 H、S、R_d。横轴和纵轴均不随方法自动缩放。`;
 $('wf-matrix').textContent='H（每行是一位用户的线性通道）\n'+H.map(row=>row.map(z=>`${z[0].toFixed(3)}${z[1]<0?'−':'+'}${Math.abs(z[1]).toFixed(3)}j`).join('    ')).join('\n');
 $('wf-status').textContent=`已载入 ${st.id}。参考均方符号误差 ${ref.mse.toFixed(4)}，严格最优 ${opt.mse.toFixed(4)}；功率方向图重合。`;
}
function fail(){for(const id of ['wf-pattern','wf-symbols','wf-time','wf-metrics'])$(id).replaceChildren();$('wf-bound').textContent='';$('wf-matrix').textContent='';$('wf-status').textContent='数值数据未能载入或计算失败，图表已清空。请通过本地 HTTP 服务或站点重新打开页面；下方推导与原文链接仍可阅读。';}
function safeRender(){try{render();}catch{fail();}}
for(const id of ['wf-channel','wf-beta','wf-angle','wf-user'])$(id).addEventListener('change',safeRender);
$('wf-reset').addEventListener('click',()=>{for(const [id,value]of [['wf-channel','complex'],['wf-beta','0.8'],['wf-angle','0'],['wf-user','0']])$(id).value=value;safeRender();});
window.addEventListener('resize',safeRender);
fetch('data/waveform-states.json').then(r=>{if(!r.ok)throw Error('数据读取失败');return r.json();}).then(d=>{data=d;safeRender();}).catch(fail);
})();
