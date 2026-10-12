(function(){'use strict';const C=window.SBFD,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const colors={sense1:'#087e82',sense2:'#7153a1',comm:'#ad4d12',null:'#dce2e7'},names={sense1:'感知节点1',sense2:'感知节点2',comm:'通信节点3',null:'全局空格'};
function node(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function text(svg,x,y,s,attrs={}){svg.append(node('text',{x,y,...attrs},s));}
function frame(id,height,title,desc){const svg=$(id),width=Math.max(240,svg.clientWidth||720);svg.replaceChildren(node('title',{id:id+'-title'},title),node('desc',{id:id+'-desc'},desc));svg.setAttribute('viewBox',`0 0 ${width} ${height}`);return {svg,width};}
function table(id,rows){const target=$(id);target.replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}target.append(tr);}}
function allocation(K){const blocks=C.allocation(K),{svg,width}=frame('sb-allocation',335,'当前子带分配',`K=${K}，通信${1794-2*K}格，精确分块见表。`),left=18,right=width-18,w=right-left;
const rows=['sense1','sense2','comm','aggregate','receiver'];rows.forEach((kind,i)=>{const y=35+i*56;text(svg,left,y-9,kind==='aggregate'?'合计占用':kind==='receiver'?'接收：完整模型带宽':names[kind]);svg.append(node('rect',{x:left,y,width:w,height:19,fill:'#fff',stroke:'#8798a3'}));if(kind==='receiver'){svg.append(node('rect',{x:left,y,width:w,height:19,fill:'#edf3f5',stroke:'#34495a','stroke-dasharray':'4 3'}));return;}for(const b of blocks)if(b.kind==='null'||kind==='aggregate'||b.kind===kind)svg.append(node('rect',{x:left+(b.start-1)/2048*w,y,width:b.count/2048*w,height:19,fill:colors[b.kind]}));});
text(svg,left,326,'1');text(svg,(left+right)/2,326,'频格索引',{'text-anchor':'middle'});text(svg,right,326,'2048',{'text-anchor':'end'});table('sb-blocks',blocks.map(b=>[names[b.kind],b.start,b.end,b.count]));
}
function plot(id,kind,count,extent,firstNull,reference){const {svg,width}=frame(id,270,kind==='range'?'距离偏移功率切片':'速度偏移功率切片',`当前${kind==='range'?'K':'M'}=${count}，首零点${firstNull}，数字替代见表。`),left=42,right=width-14,top=24,bottom=218,x=v=>left+(v+extent)/(2*extent)*(right-left),y=v=>top-v/60*(bottom-top);
for(const d of [0,-20,-40,-60]){svg.append(node('line',{x1:left,x2:right,y1:y(d),y2:y(d),stroke:'#e0e6ea'}));text(svg,left-6,y(d)+4,String(d),{'text-anchor':'end'});}text(svg,left,14,'归一化功率 dB');
svg.append(node('line',{x1:left,x2:right,y1:bottom,y2:bottom,stroke:'#657e8e'}));for(const v of [-extent,0,extent]){text(svg,x(v),237,String(v),{'text-anchor':v===-extent?'start':v===extent?'end':'middle'});}text(svg,(left+right)/2,260,kind==='range'?'距离偏移 ΔR（m）':'速度偏移 Δv（m/s）',{'text-anchor':'middle'});
const path=(n,color,dash)=>{const values=C.cut(kind,n,extent,1201),d=values.map((p,i)=>(i?'L':'M')+x(p.x).toFixed(3)+','+y(p.db).toFixed(3)).join(' ');svg.append(node('path',{d,fill:'none',stroke:color,'stroke-width':2,...(dash?{'stroke-dasharray':'5 4'}:{})}));};if(reference)path(2048,'#7153a1',true);path(count,'#087e82',false);
// Exact null guides complement the sampled curve, whose samples may not land on nulls.
if(firstNull<=extent)for(const sign of [-1,1])svg.append(node('line',{x1:x(sign*firstNull),x2:x(sign*firstNull),y1:top,y2:bottom,stroke:'#495d68','stroke-width':1,'stroke-dasharray':'2 5'}));
}
function update(){const K=Number($('sb-k').value),M=Number($('sb-m').value),s=C.metrics(K,M);$('sb-k-out').textContent=String(K);$('sb-m-out').textContent=String(M);
$('sb-k').setAttribute('aria-valuetext',`${K} 格，通信剩余 ${s.Kc} 格`);$('sb-m').setAttribute('aria-valuetext',`${M} 个符号，观察 ${s.cpi.toFixed(6)} 秒`);
$('sb-result').textContent=`当前独立模型：${K}+${K}+${s.Kc}+254=2048 格。感知宽度 ${(s.width/1e6).toFixed(8)} MHz；距离首零点 ${s.rangeNull.toFixed(8)} m；CPI ${s.cpi.toFixed(6)} s；速度首零点 ${s.velocityNull.toFixed(9)} m/s。`;
$('sb-allocation-caption').textContent=`K=${K}；两感知节点各 ${K} 格，通信 ${s.Kc} 格；全局占用 1794、空格 254。合计 2048，互不重叠。`;
$('sb-range-caption').textContent=`K=${K}：峰到首零点 ${s.rangeNull.toFixed(8)} m，完整主瓣宽 ${(2*s.rangeNull).toFixed(8)} m。假想全格参考首零点 ${(C.cfg.c/(2*C.cfg.Fs)).toFixed(8)} m；竖点线标出当前精确首零点。`;
$('sb-velocity-caption').textContent=`M=${M}，CPI=${s.cpi.toFixed(6)} s：峰到首零点 ${s.velocityNull.toFixed(9)} m/s，完整主瓣宽 ${(2*s.velocityNull).toFixed(9)} m/s。${s.velocityNull>1?'首零点超出 ±1 m/s 图域；不是没有零点。':'竖点线标出当前精确首零点。'}K=${K} 不进入此理想速度公式。`;
$('sb-metrics').textContent=`K=${K}，M=${M}，通信 K꜀=${s.Kc}。网格宽度 KΔf=${(s.width/1e6).toFixed(8)} MHz；最外频格中心间距 (K−1)Δf=${(s.span/1e6).toFixed(8)} MHz。距离首零点 ${s.rangeNull.toFixed(8)} m；CPI ${s.cpi.toFixed(6)} s；速度首零点 ${s.velocityNull.toFixed(9)} m/s。`;
const samples=[];for(const [kind,values,count,unit,fn]of [['距离',[0,10,25,50,s.rangeNull],K,'m',C.rangePower],['速度',[0,.05,.1,.2,s.velocityNull],M,'m/s',C.velocityPower]])values.forEach((v,i)=>{const p=fn(v,count);samples.push([kind+(i===4?' · 精确首零点':''),`${v.toFixed(9)} ${unit}`,p.toExponential(6),C.db(p).toFixed(3)]);});table('sb-samples',samples);
allocation(K);plot('sb-range','range',K,150,s.rangeNull,true);plot('sb-velocity','velocity',M,1,s.velocityNull,false);
}
for(const id of ['sb-k','sb-m'])$(id).addEventListener('input',update);$('sb-reset').addEventListener('click',()=>{$('sb-k').value='598';$('sb-m').value='1216';update();});window.addEventListener('resize',update);update();
})();
