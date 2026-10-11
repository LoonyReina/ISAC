/* Local deterministic teaching UI. Every plotted sample comes from GolayRadarCore.
 * No network, animation, frame-dependent noise, detection logic, or oracle windows. */
(()=>{'use strict';
const C=window.GolayRadarCore,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const colors={aa:'#ad551b',ab:'#087f78',first:'#245dc1',second:'#7451a8',truth:'#647987',grid:'#dfe7ec',axis:'#879aa7'};
const chartIds=['gr-range','gr-chips','gr-components','gr-weak','gr-doppler','gr-stress'];
const resultIds=['gr-budget','gr-story','gr-cancellation','gr-weak-result','gr-doppler-budget','gr-doppler-result','gr-stress-budget','gr-stress-result','gr-raw'];
const defaults={'gr-delay':'12','gr-mode':'AB','gr-phase':'real','gr-component':'real','gr-velocity':'50'};
const fmt=(x,n=5)=>x===0?'0':Math.abs(x)<1e-5?x.toExponential(3):x.toFixed(n);
const signed=(x,n=5)=>(x>0?'+':'')+fmt(x,n);
function node(tag,attrs={},content){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(content!==undefined)n.textContent=content;return n;}
function append(svg,tag,attrs,content){const n=node(tag,attrs,content);svg.append(n);return n;}
function plot(id,series,{min=0,max=1.2,lo=0,hi=127,ticks=[0,.4,.8,1.2],truth=[],yLabel='相关幅度 |z|',height=290}={}){
 const svg=$(id),width=Math.max(220,svg.clientWidth||600),left=45,right=13,top=29,bottom=height-53,w=width-left-right,h=bottom-top;
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 const x=i=>left+(i-lo)/(hi-lo)*w,y=v=>bottom-(Math.max(min,Math.min(max,v))-min)/(max-min)*h;
 append(svg,'text',{x:left,y:15,'font-weight':'600'},yLabel);
 for(const t of ticks){const yy=y(t);append(svg,'line',{x1:left,y1:yy,x2:width-right,y2:yy,stroke:colors.grid});append(svg,'text',{x:left-6,y:yy+4,'text-anchor':'end'},max<=.003?t.toFixed(3):String(t));}
 const count=width<430?3:5;
 for(let k=0;k<count;k++){const lag=lo+(hi-lo)*k/(count-1),xx=x(lag);append(svg,'line',{x1:xx,y1:bottom,x2:xx,y2:bottom+5,stroke:colors.axis});append(svg,'text',{x:xx,y:bottom+21,'text-anchor':k===0?'start':k===count-1?'end':'middle'},(lag*C.cfg.c/(2*C.cfg.fs)).toFixed(2));}
 append(svg,'text',{x:left+w/2,y:height-9,'text-anchor':'middle'},'候选单站距离 R / m');
 append(svg,'line',{x1:left,y1:bottom,x2:width-right,y2:bottom,stroke:colors.axis});
 for(const lag of truth)if(lag>=lo&&lag<=hi){const xx=x(lag);append(svg,'line',{x1:xx,y1:top,x2:xx,y2:bottom,stroke:colors.truth,'stroke-dasharray':'3 5'});append(svg,'text',{x:Math.min(width-right,Math.max(left,xx+4)),y:top+12,'text-anchor':lag>hi*.8?'end':'start'},`真值 d=${lag}`);}
 for(const s of series){let segment=[];const draw=()=>{if(segment.length){append(svg,'polyline',{points:segment.join(' '),fill:'none',stroke:s.color,'stroke-width':s.width||2,'stroke-dasharray':s.dash||'',opacity:s.opacity===undefined?1:s.opacity,'stroke-linejoin':'round','stroke-linecap':'round','data-series':s.id||''});segment=[];}};for(let i=lo;i<=hi;i++){const v=s.values[i];if(v===null||v===undefined){draw();continue;}if(!Number.isFinite(v))throw new RangeError('图中存在非有限值');segment.push(`${x(i).toFixed(4)},${y(v).toFixed(4)}`);}draw();}
}
function chips(r){const svg=$('gr-chips'),width=Math.max(220,svg.clientWidth||600),left=30,right=12,w=width-left-right;svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} 130`);for(const [seq,row,label]of [[r.a,0,'A'],[r.b,1,$('gr-mode').value==='AB'?'B':'A']]){const yy=24+row*40;append(svg,'text',{x:8,y:yy+16,'font-weight':'600'},label);seq.forEach((v,i)=>append(svg,'rect',{x:left+i*w/seq.length,y:yy,width:w/seq.length+.02,height:22,fill:v>0?colors.ab:colors.second,'data-chip':v}));}append(svg,'text',{x:left,y:113},'0');append(svg,'text',{x:width-right,y:113,'text-anchor':'end'},'127 · 芯片编号');}
const mag=r=>r.z.map(C.magnitude),maxOff=(r,d)=>Math.max(...r.z.filter((_,i)=>i!==d).map(C.magnitude));
function observation(mode,extra={}){return C.observe({mode,seed:8088,...extra});}
function pair(extra={}){return {AA:observation('AA',extra),AB:observation('AB',extra)};}
function series(r,mode,selected){return {id:mode,values:mag(r),color:colors[mode.toLowerCase()],dash:mode==='AA'?'6 4':'',width:mode===selected?2.7:1.7,opacity:mode===selected?1:.72};}
function render(){
 if(!C)throw new Error('缺少数值核心');
 const delay=Number($('gr-delay').value),mode=$('gr-mode').value,phase=$('gr-phase').value,component=$('gr-component').value,velocity=Number($('gr-velocity').value);
 if(!Number.isInteger(delay)||delay<0||delay>127||!['AA','AB'].includes(mode)||!['real','complex'].includes(phase)||!['real','imag'].includes(component)||!Number.isFinite(velocity)||velocity< -50||velocity>50)throw new RangeError('无效控件');
 const alpha=phase==='real'?[1,0]:[.6,.8],p=pair({targets:[{delay,alpha}]}),r=p[mode],res=r.resources,range=delay*C.cfg.c/(2*C.cfg.fs),ci=component==='real'?0:1;
 $('gr-delay-value').textContent=`${delay} 芯片 · ${range.toFixed(3)} m`;
 $('gr-velocity-value').textContent=`${velocity>0?'+':''}${velocity} m/s`;
 $('gr-budget').textContent=`共同预算：${r.activeChips} 个单位能量芯片（活跃 ${ (res.activeSeconds*1e9).toFixed(3)} ns）；两次起点间隔 ${(res.separationSeconds*1e9).toFixed(3)} ns；完整观测跨度 ${(res.observationSeconds*1e9).toFixed(3)} ns`;
 $('gr-wrong-legend').hidden=!$('gr-wrong').checked;
 const wrong=r.za.map((z,i)=>(C.magnitude(z)+C.magnitude(r.zb[i]))/2),mainSeries=[series(p.AA,'AA',mode),series(p.AB,'AB',mode)];
 if($('gr-wrong').checked)mainSeries.push({id:'wrong-order',values:wrong,color:colors.second,dash:'2 4',width:2});
 plot('gr-range',mainSeries,{truth:[delay]});chips(r);
 plot('gr-components',[{id:'first',values:r.za.map(z=>z[ci]),color:colors.first,width:1.8},{id:'second',values:r.zb.map(z=>z[ci]),color:colors.second,dash:'6 4',width:1.8},{id:'complex-sum',values:r.z.map(z=>z[ci]),color:colors.ab,width:2.5}],{min:-1.2,max:1.2,ticks:[-1,-.5,0,.5,1],truth:[delay],yLabel:component==='real'?'归一化相关 · 实部':'归一化相关 · 虚部'});
 $('gr-story').textContent=`时延 ${delay} 芯片 → 往返 ${(delay/C.cfg.fs*1e9).toFixed(3)} ns → 单站距离 ${range.toFixed(3)} m。两种方案在真值处的幅度均为 ${fmt(C.magnitude(p.AB.z[delay]),1)}；A+A 的最大其他位置幅度为 ${fmt(maxOff(p.AA,delay),7)}，A+B 为 ${fmt(maxOff(p.AB,delay),7)}。这些是相关输出，不是通过检测的目标。`;
 const offset=delay+21<=127?21:-21,k=delay+offset,za=r.za[k],zb=r.zb[k];
 $('gr-cancellation').textContent=`当前看 ${mode==='AB'?'A+B':'A+A'}，候选 ℓ=${k}（距真值 ${offset>0?'+':''}${offset} 芯片）：两条${component==='real'?'实部':'虚部'}为 ${signed(za[ci],7)}、${signed(zb[ci],7)}；复数先相加的幅度为 ${fmt(C.magnitude(r.z[k]),7)}，先取幅度的结果为 ${fmt(wrong[k],7)}。`;
 const noisy=$('gr-noise').checked,weak=pair({targets:[{delay:12,alpha:[1,0]},{delay:33,alpha:[.1,0]}],noiseVariance:noisy?.1:0});
 plot('gr-weak',[series(weak.AA,'AA','AB'),series(weak.AB,'AB','AB')],{lo:26,hi:40,min:0,max:.25,ticks:[0,.1,.2,.25],truth:[33]});
 const wa=weak.AA.z[33],wb=weak.AB.z[33];
 $('gr-weak-result').textContent=noisy?`固定噪声实现，d=33：A+A 的复结果为 (${signed(wa[0],6)}, ${signed(wa[1],6)}j)，幅度 ${fmt(C.magnitude(wa),6)}；A+B 为 (${signed(wb[0],6)}, ${signed(wb[1],6)}j)，幅度 ${fmt(C.magnitude(wb),6)}。不按此一次实现判断检出概率。`:`无噪声，d=33：A+A 的带符号结果为 ${fmt(wa[0],7)}（0.1−13/128），幅度 ${fmt(C.magnitude(wa),7)}；A+B 为 ${fmt(wb[0],7)}。这是刻意构造的相干相消练习。`;
 const physical=C.physical(velocity),moving=observation('AB',{omega:physical.omega}),sidelobe=maxOff(moving,12),phase128=physical.omega*127,phaseGap=physical.omega*256;
 $('gr-doppler-budget').textContent=`真实量级：60 GHz；D=256 芯片；总芯片能量 256；完整观测 ${(moving.resources.observationSeconds*1e9).toFixed(3)} ns。与首图同时间资源。`;
 $('gr-doppler-result').textContent=`v=${velocity>0?'+':''}${velocity} m/s → fD=${(physical.frequency/1000).toFixed(5)} kHz；第一至最后芯片相位变化 ${signed(phase128,6)} rad，两次起点相位差 ${signed(phaseGap,6)} rad。真值幅度 ${fmt(C.magnitude(moving.z[12]),8)}；最大其他位置幅度 ${fmt(sidelobe,8)}${sidelobe===0?'（静止时严格为零）':'。短间隔下变化很小'}。`;
 const residual=mag(moving);residual[12]=null;
 plot('gr-doppler',[{id:'static-zero',values:Array(128).fill(0),color:colors.truth,dash:'4 4'},{id:'samplewise-doppler',values:residual,color:colors.ab}],{min:0,max:.003,ticks:[0,.001,.002,.003],yLabel:'非真值位置 |z| · 放大',truth:[12]});
 const v50=C.physical(50),short=observation('AB',{omega:v50.omega}),stress=observation('AB',{omega:v50.omega,guard:43970-128});
 $('gr-stress-budget').textContent=`长间隔：G=${stress.guard}，D=${stress.separationChips} 芯片；能量仍为 ${stress.activeChips}；完整观测 ${stress.observationChips} 芯片 ≈ ${(stress.resources.observationSeconds*1e6).toFixed(3)} μs（短间隔约 ${(short.resources.observationSeconds*1e6).toFixed(3)} μs）。`;
 plot('gr-stress',[{id:'short-gap',values:mag(short),color:colors.ab,width:2.5},{id:'long-gap',values:mag(stress),color:colors.second,dash:'6 4',width:2}],{truth:[12]});
 $('gr-stress-result').textContent=`两次起点相位差 ${(v50.omega*stress.separationChips).toFixed(6)} rad，接近 π。d=12 的幅度由 ${fmt(C.magnitude(short.z[12]),8)} 降至 ${fmt(C.magnitude(stress.z[12]),8)}；长间隔最大其他位置幅度为 ${fmt(maxOff(stress,12),7)}。这里增加的是间隔，速度始终为 +50 m/s。`;
 $('gr-raw').textContent=JSON.stringify({model:'independent isolated Golay pair; complex sum before magnitude',delay,alpha,selectedMode:mode,resources:res,AA:{za:p.AA.za,zb:p.AA.zb,z:p.AA.z},AB:{za:p.AB.za,zb:p.AB.zb,z:p.AB.z}},null,2);
 $('gr-status').textContent=`已重算：时延 ${delay} 芯片，突出 ${mode==='AB'?'A+B':'A+A'}。接收机仍扫描全部 128 个候选位置。`;
}
function fail(){for(const id of chartIds)$(id).replaceChildren();for(const id of resultIds)$(id).textContent='';$('gr-status').textContent='数值计算未能完成，旧图和数值已清空。可尝试重置或重新载入；下方固定模型、原文与边界仍可阅读。';}
function safeRender(){try{render();}catch{fail();}}
for(const id of ['gr-mode','gr-phase','gr-component','gr-noise','gr-wrong'])$(id).addEventListener('change',safeRender);
for(const id of ['gr-delay','gr-velocity'])$(id).addEventListener('input',safeRender);
$('gr-reset').addEventListener('click',()=>{for(const [id,value]of Object.entries(defaults))$(id).value=value;for(const id of ['gr-noise','gr-wrong'])$(id).checked=false;safeRender();});
for(const d of document.querySelectorAll('details'))d.addEventListener('toggle',()=>{if(d.open)safeRender();});
window.addEventListener('resize',safeRender);safeRender();
})();
