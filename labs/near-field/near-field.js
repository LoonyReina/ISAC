(function(){'use strict';const C=window.NearField,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
function node(tag,attrs={},value){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(value!==undefined)n.textContent=value;return n;}
function text(svg,x,y,value,attrs={}){svg.append(node('text',{x,y,...attrs},value));}
function frame(id,height,title,desc){const svg=$(id),width=Math.max(240,svg.clientWidth||720);svg.replaceChildren(node('title',{id:id+'-title'},title),node('desc',{id:id+'-desc'},desc));svg.setAttribute('viewBox',`0 0 ${width} ${height}`);return {svg,width};}
function table(id,rows){const tbody=$(id);tbody.replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}tbody.append(tr);}}
function line(svg,points,color,dash){svg.append(node('polyline',{points:points.map(p=>p.map(v=>v.toFixed(3)).join(',')).join(' '),fill:'none',stroke:color,'stroke-width':2.5,...(dash?{'stroke-dasharray':dash}:{})}));}
function response(s){const {svg,width}=frame('nf-response',310,'同角不同距的归一化空间匹配',`N=${s.N}，真值${s.range} m。球面/球面真值匹配1；球面/平面恒为${s.planeMatch.toFixed(8)}；平面/平面恒为1。`),left=44,right=width-16,top=32,bottom=254,x=r=>left+(r-2)/78*(right-left),y=c=>bottom-c*(bottom-top);
text(svg,left,18,'归一化匹配 C');for(const v of [0,.25,.5,.75,1]){svg.append(node('line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:'#e0e6ea'}));text(svg,left-7,y(v)+5,String(v),{'text-anchor':'end'});}for(const r of width<500?[2,40,80]:[2,20,40,60,80])text(svg,x(r),275,String(r),{'text-anchor':r===2?'start':r===80?'end':'middle'});text(svg,(left+right)/2,300,'候选距离 r（m）',{'text-anchor':'middle'});
svg.append(node('line',{x1:x(s.range),x2:x(s.range),y1:top,y2:bottom,stroke:'#6a7780','stroke-dasharray':'3 5'}));
// Draw the reference curves first, with distinct dash patterns; none is peak-normalized.
line(svg,s.curves.map(p=>[x(p.r),y(p.ff)]),'#7153a1','2 5');line(svg,s.curves.map(p=>[x(p.r),y(p.nf)]),'#ad4d12','8 5');line(svg,s.curves.map(p=>[x(p.r),y(p.nn)]),'#087e82');svg.append(node('circle',{cx:x(s.range),cy:y(1),r:4,fill:'#087e82'}));
}
function phase(s){const {svg,width}=frame('nf-phase',280,'阵元位置与球面残余相位',`孔径${s.D} m；中心相位0，两端相位${s.truth[0].phase.toFixed(8)} rad。`),left=54,right=width-16,top=34,bottom=224,min=Math.min(-.01,s.truth[0].phase*1.12),x=v=>left+(v+s.D/2)/s.D*(right-left),y=v=>top+v/min*(bottom-top);
text(svg,left,18,'残余相位（rad）');for(const v of [0,min/2,min]){svg.append(node('line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:'#e0e6ea'}));text(svg,left-7,y(v)+5,v===0?'0':v.toFixed(2),{'text-anchor':'end'});}for(const v of [-s.D/2,0,s.D/2])text(svg,x(v),247,v===0?'0':v.toFixed(2),{'text-anchor':v<0?'start':v>0?'end':'middle'});text(svg,(left+right)/2,272,'阵元位置 xₙ（m）',{'text-anchor':'middle'});line(svg,[[left,y(0)],[right,y(0)]],'#ad4d12','8 5');line(svg,s.truth.map(p=>[x(p.x),y(p.phase)]),'#087e82');
}
function update(){const s=C.experiment({N:Number($('nf-n').value),range:Number($('nf-range').value)});$('nf-range-out').textContent=`${s.range} m`;$('nf-range').setAttribute('aria-valuetext',`真实距离 ${s.range} 米`);
$('nf-result').textContent=`N=${s.N}；孔径 D=${s.D.toFixed(2)} m（间距固定 0.005 m）；r₀=${s.range} m。Rayleigh 参考 ${s.rayleigh.toFixed(2)} m；球面/平面匹配 ${s.planeMatch.toFixed(8)}；κᵣ=${s.kappa.toExponential(6)} m⁻²（局部几何敏感度，不是 CRB）。`;
$('nf-response-caption').textContent=`灰竖线是真值 ${s.range} m，球面/球面在此 C=1。橙虚线恒为 ${s.planeMatch.toFixed(8)}，紫点线恒为 1；两者均不能选出候选距离。扫描窗固定 2–80 m。`;
$('nf-phase-caption').textContent=`N=${s.N}，实际孔径 ${s.D.toFixed(2)} m；中心相位 0，边缘相位 ${s.truth[0].phase.toFixed(8)} rad。纵轴随当前幅度变化，请结合刻度和数值比较，不只看曲线形状。`;
table('nf-metrics',[['孔径 D',`${s.D.toFixed(2)} m`,'N 改变时孔径也改变'],['2D²/λ',`${s.rayleigh.toFixed(2)} m`,'平面波近似参考，不保证有限焦深'],['r₀/D',s.rangeToAperture.toFixed(6),'真实距离 / 孔径'],['球面 / 平面',s.planeMatch.toFixed(10),'候选距离无关'],['κᵣ',`${s.kappa.toExponential(9)} m⁻²`,'局部几何敏感度，不是 CRB / MSE']]);
const ranges=[...new Set([2,4,8,20,40,80,s.range,2*s.range])].sort((a,b)=>a-b),plane=C.steering(s.N,s.range,{plane:true});table('nf-samples',ranges.map(r=>[r,C.coherence(C.steering(s.N,r),s.truth).toFixed(10),C.coherence(plane,s.truth).toFixed(10),C.coherence(plane,plane).toFixed(10)]));
table('nf-phases',[0,(s.N-1)/4,(s.N-1)/2,3*(s.N-1)/4,s.N-1].map(i=>{const p=s.truth[i];return [p.x.toFixed(3),C.pathDifference(p.x,s.range).toExponential(9),p.phase.toFixed(9)];}));response(s);phase(s);
}
$('nf-n').addEventListener('change',update);$('nf-range').addEventListener('input',update);$('nf-reset').addEventListener('click',()=>{$('nf-n').value='129';$('nf-range').value='4';update();});window.addEventListener('resize',update);update();
})();
