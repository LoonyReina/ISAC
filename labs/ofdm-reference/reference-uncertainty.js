/* Same observation, three reference conditions. No network, storage, simulation loop or truth-assisted peak selection. */
(()=>{'use strict';
const $=id=>document.getElementById(id),C=window.ReferenceUncertaintyCore,R=window.ReferenceUncertaintyRecord,NS='http://www.w3.org/2000/svg';
const branches=['oracle','pilot','stress'],labels={oracle:'全符号（额外真值参考）',pilot:'仅导频（四格真参考）',stress:'受扰参考（按已知处理）'},colors={oracle:'#087f78',pilot:'#7952a3',stress:'#ba5f19'},dashes={oracle:'',pilot:'7 5',stress:'10 4 2 4'};
const controlled=['ru-physics','ru-reference-controls','ru-presets','ru-reveal'];
let noiseSeed=2026,referenceSeed=2026,revealed=false,frame=null,physicalKey='',current=null,record=null,recordKey='',pendingSettings=false;
function clearRecord(message=''){recordKey='';if(record)record.clear();$('ru-record-download').disabled=true;$('ru-record-status').textContent=message;}
function settingsKey(){return JSON.stringify([options(),readReference()]);}
function liveRecordKey(){return JSON.stringify([settingsKey(),selectedIndex(),$('ru-branch').value,$('ru-show-truth').checked,$('ru-show-errors').checked]);}
function recordIsCurrent(){try{return Boolean(recordKey&&!pendingSettings&&current&&revealed&&recordKey===liveRecordKey());}catch{return false;}}
function commitRecord(){
 clearRecord();if(!record||!R){$('ru-record-status').textContent='本地导出组件未能加载；当前计算仍可阅读。';return;}
 if(!current||!revealed)return;if(pendingSettings){clearRecord('显示仍为上次计算；当前输入尚未提交，不可下载。');return;}
 if(settingsKey()!==current.settingsKey){pendingSettings=true;clearRecord('控件已改变，请提交输入并重新计算后再下载。');return;}
 const snapshot=R.makeRecord({generatorConfig:current.generatorConfig,referenceConfig:{...current.referenceConfig,stressMetadata:current.stressMetadata},frame:current.frame,inputs:current.inputs,results:current.results,selectedInspection:current.selectedInspection});
 record.update(snapshot,'reference-uncertainty-record.json');recordKey=liveRecordKey();
}
function selectionChanged(){clearRecord();renderSelection();commitRecord();}
// This listener must run before the shared shell can emit a Blob. It only checks
// committed settings; downloading never regenerates data or reruns the receiver.
$('ru-record-download').addEventListener('click',()=>{if(!recordIsCurrent())clearRecord('当前没有可下载的已提交计算，请先计算并揭示。');});
if(R&&window.ExperimentRecord)record=window.ExperimentRecord.create({disclosure:$('ru-record-details'),output:$('ru-record-preview'),button:$('ru-record-download'),status:$('ru-record-status')});
function node(parent,tag,attrs={},value=''){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));e.textContent=String(value);parent.append(e);return e;}
function html(parent,tag,value='',className=''){const e=document.createElement(tag);e.textContent=String(value);if(className)e.className=className;parent.append(e);return e;}
function num(id){const s=$(id).value;if(typeof s!=='string'||!s.trim()||!Number.isFinite(Number(s)))throw new Error('请填写有效数值：'+id);return Number(s);}
const fmt=(v,d=4)=>Math.abs(v)<1e-12?'0':Number(v.toFixed(d)).toString();
const complex=z=>fmt(z[0],5)+(z[1]<0?' − ':' + ')+fmt(Math.abs(z[1]),5)+'i';
function fail(error){clearRecord('本次失败未生成记录；旧记录已清除。');current=null;$('ru-results').hidden=true;$('ru-awaiting').hidden=false;for(const id of ['ru-curves','ru-phasors','ru-estimates','ru-budget-cards','ru-symbols','ru-contributions'])$(id).replaceChildren();$('ru-status').textContent='当前输入或计算失败，已清除旧结果：'+error.message;}
function safely(fn){try{fn();}catch(error){fail(error);}}
function options(){const value=$('ru-snr').value;if(!['none','-10','0','10','20'].includes(value))throw new Error('请选择已声明的 SNR 条件');return {truthRangeM:num('ru-range'),snrDb:value==='none'?null:Number(value),noiseSeed};}
function controls(){
 const comb=$('ru-pilots').value==='comb',structured=$('ru-mode').value!=='random';
 $('ru-mode-rotate').disabled=!comb;$('ru-mode-ramp').disabled=!comb;
 $('ru-error-count').disabled=structured;$('ru-reference-seed').disabled=structured;
 $('ru-error-label').textContent=$('ru-error-count').value+' / 12 个数据符号；全帧 '+$('ru-error-count').value+' / 16';
 $('ru-reference-id').textContent='参考错误种子 '+referenceSeed+'；改变参考不重新发射。';
}
function readReference(){return {pilotMode:$('ru-pilots').value,errorMode:$('ru-mode').value,errorCount:num('ru-error-count'),referenceSeed};}
function recompute(){
 clearRecord();controls();if(!revealed){$('ru-status').textContent='先预测，点击揭示后再看实际计算。';$('ru-observation-id').textContent='待揭示；噪声种子 '+noiseSeed;return;}
 const o=options(),key=JSON.stringify(o);
 if(!frame||key!==physicalKey){frame=C.generate(o);physicalKey=key;}
 const referenceConfig=readReference(),r=C.reference(referenceConfig),inputs=C.assemble(frame.observation,r.reference,$('ru-pilots').value),results={};
 for(const branch of branches)results[branch]=C.receive(inputs[branch]);
 current={generatorConfig:o,referenceConfig,frame,settingsKey:settingsKey(),inputs,results,reference:r.reference,stressMetadata:r.stressMetadata,pilotMode:$('ru-pilots').value,errorMode:$('ru-mode').value};
 $('ru-results').hidden=false;$('ru-awaiting').hidden=true;$('ru-status').textContent='已计算同一份 y 的三种信息条件；这里没有解调或半盲迭代。';
 $('ru-observation-id').textContent='观测标识：R='+fmt(o.truthRangeM)+' m / SNR='+(o.snrDb===null?'无噪声':o.snrDb+' dB')+' / 噪声种子 '+noiseSeed;
 const predictions={undecided:'先不确定，比较条件再判断',discard:'只用真导频也许更可靠',trust:'更多参考格也许仍有帮助',structure:'相同错误数，排列结构可能更重要'};
 $('ru-prediction-note').textContent='你的预测：'+(predictions[$('ru-prediction').value]||predictions.undecided)+'。先核对信息账本，再回看这次例子；不按预测计分。';
 renderBudget();renderEstimates();renderSymbols();renderSelection();
 const means=branches.map(b=>labels[b]+' '+fmt(frame.noiseMetadata.sigma2/results[b].referenceEnergy,5));
 $('ru-noise-means').textContent='固定候选的理论纯噪声均值 σ²/Eₛ：'+means.join('；')+'。不是本次实测地板，也不是门限。';
 const falseRange=(frame.truth.rangeM+37.5)%150;
 $('ru-structure-note').textContent=current.errorMode==='ramp'?'相位斜坡的无噪声等价距离是 (R₀+37.5) mod 150 = '+fmt(falseRange)+' m。它解释的是同一个目标的回波，不是发现了第二个目标。若真值离格，有限候选峰可能无法取得精确零残差。':current.pilotMode==='comb'?'梳状导频具有37.5 m结构周期；同一固定噪声下仍有重复等峰，噪声可以改变每组峰的位置。切换“整体数据旋转”和“伪距离斜坡”比较同样12个错误的结构。':'不规则导频避开这个37.5 m的精确周期，不等于保证没有强旁瓣或错误峰。增加错误数也不保证曲线或误差单调变化。';
 pendingSettings=false;commitRecord();
}
function renderBudget(){const host=$('ru-budget-cards');host.replaceChildren();for(const b of branches){const r=current.results[b],card=html(host,'div','','ru-budget-card');html(card,'h4',labels[b]);html(card,'p','已知真符号：'+(b==='oracle'?16:4)+' 格；处理：'+r.sampleCount+' 格');html(card,'p','参考有用格能量 Eₛ = '+fmt(r.referenceEnergy));html(card,'p','复匹配项：'+r.matchingTerms+'（600×'+r.sampleCount+'）');if(b==='stress')html(card,'p','其余12格只是受扰参考，不保证正确。');}}
function renderEstimates(){const host=$('ru-estimates');host.replaceChildren();for(const b of branches){const r=current.results[b],card=html(host,'article','','ru-estimate');html(card,'h4',labels[b]);html(card,'p',r.tieCount>1?'歧义未解决：'+r.tieCount+' 个数值并列候选。':'本次有限网格有一个最高候选；这不是正确性或目标检测证明。');html(card,'p','按最小候选约定选取 '+fmt(r.estimateM)+' m；Q='+fmt(r.selectedScore,6)+'；相对教学真值误差 '+fmt(r.estimateM-frame.truth.rangeM)+' m');html(card,'p','该候选拟合残差 SSE='+fmt(r.residualEnergy,6)+'（仅 '+r.sampleCount+' 格）；平局容差 '+r.tieTolerance.toExponential(3));const detail=html(card,'details'),summary=html(detail,'summary','列出全部 '+r.tieCount+' 个并列候选 / m');summary.setAttribute('aria-label',labels[b]+'：列出全部并列候选');html(detail,'p',r.tiedCandidatesM.map(v=>fmt(v)).join('、'),'ru-ties');if(r.maxScore===0)html(card,'p','全零匹配不提供距离信息，不能称为近距离目标。');}}
function plot(id,height,title,description){const svg=$(id),w=Math.max(260,Math.min(1050,svg.clientWidth||760));svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' '+height);svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('style','aspect-ratio:'+w+'/'+height+';height:auto');node(svg,'title',{},title);node(svg,'desc',{},description);return {svg,w,h:height};}
function selectedIndex(){const i=num('ru-candidate');if(!Number.isInteger(i)||i<0||i>=C.CANDIDATES.length)throw new Error('候选必须来自固定600点表');return i;}
function drawCurves(index){
 const {svg,w,h}=plot('ru-curves',330,'同一份回波的三种参考匹配曲线','横轴候选距离，纵轴共同线性Q。圆点为全部数值等峰，竖线为当前候选。'),left=48,right=w-14,top=24,bottom=h-42;
 const ymax=Math.max(1,...branches.map(b=>current.results[b].maxScore))*1.1,x=r=>left+(right-left)*r/150,y=q=>bottom-(bottom-top)*q/ymax;
 svg.setAttribute('data-y-max',ymax);svg.setAttribute('data-candidate-m',C.CANDIDATES[index]);
 for(let i=0;i<=4;i++){const q=ymax*i/4,py=y(q);node(svg,'line',{x1:left,y1:py,x2:right,y2:py,stroke:'#e2eaed'});node(svg,'text',{x:left-7,y:py+4,'text-anchor':'end',fill:'#506a78'},fmt(q,2));}
 for(const r of [0,37.5,75,112.5,150]){node(svg,'line',{x1:x(r),y1:bottom,x2:x(r),y2:bottom+4,stroke:'#7b929d'});node(svg,'text',{x:x(r),y:bottom+19,'text-anchor':r===150?'end':r===0?'start':'middle',fill:'#506a78'},r);}
 node(svg,'line',{x1:left,y1:top,x2:left,y2:bottom,stroke:'#7b929d'});node(svg,'line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#7b929d'});node(svg,'text',{x:left,y:14,fill:'#203747'},'Q');node(svg,'text',{x:right,y:h-4,'text-anchor':'end',fill:'#203747'},'候选 r / m');
 if($('ru-show-truth').checked){node(svg,'line',{x1:x(frame.truth.rangeM),x2:x(frame.truth.rangeM),y1:top,y2:bottom,stroke:'#89989f','stroke-dasharray':'3 4','data-truth-m':frame.truth.rangeM});}
 for(const b of branches){const r=current.results[b];node(svg,'polyline',{points:r.scores.map((q,j)=>x(C.CANDIDATES[j])+','+y(q)).join(' '),fill:'none',stroke:colors[b],'stroke-width':2.2,'stroke-dasharray':dashes[b],'data-series':b});for(const j of r.tiedIndices)node(svg,'circle',{cx:x(C.CANDIDATES[j]),cy:y(r.scores[j]),r:3.1,fill:'#fff',stroke:colors[b],'stroke-width':1.4,'data-tie':b,'data-range-m':C.CANDIDATES[j]});}
 node(svg,'line',{x1:x(C.CANDIDATES[index]),x2:x(C.CANDIDATES[index]),y1:top,y2:bottom,stroke:'#233b50','stroke-width':1.4,'data-candidate-line':'true'});
 for(const b of branches)node(svg,'circle',{cx:x(C.CANDIDATES[index]),cy:y(current.results[b].scores[index]),r:4,fill:colors[b],'data-selected':b});
}
function arrow(svg,x1,y1,x2,y2,color,width,attrs={}){node(svg,'line',{x1,y1,x2,y2,stroke:color,'stroke-width':width,...attrs});const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<1e-9)return;const a=Math.atan2(dy,dx),size=Math.min(7,len*.3);node(svg,'path',{d:'M '+(x2-size*Math.cos(a-.45))+' '+(y2-size*Math.sin(a-.45))+' L '+x2+' '+y2+' L '+(x2-size*Math.cos(a+.45))+' '+(y2-size*Math.sin(a+.45)),fill:'none',stroke:color,'stroke-width':width});}
function drawPhasors(index){
 const b=$('ru-branch').value;if(!branches.includes(b))throw new Error('请选择一个已实现分支');const value=C.candidateAt(current.inputs[b],index),points=value.contributions,chain=[[0,0]];
 for(const z of points){const last=chain.at(-1);chain.push([last[0]+z[0],last[1]+z[1]]);}
 const limit=Math.max(.05,...[...points,...chain,value.fittedGain].flatMap(z=>z.map(Math.abs)))*1.15;
 const {svg,w,h}=plot('ru-phasors',400,labels[b]+'：候选 '+fmt(value.candidateM)+' m的复贡献','两轴相同比例，细箭头为单格贡献，虚线为首尾相接的求和路径，粗箭头为复增益。'),cx=w/2,cy=h/2,scale=(Math.min(w,h)-66)/(2*limit),x=re=>cx+scale*re,y=im=>cy-scale*im;
 svg.setAttribute('data-scale',scale);svg.setAttribute('data-branch',b);svg.setAttribute('data-candidate-m',value.candidateM);svg.setAttribute('data-q',value.score);
 node(svg,'line',{x1:x(-limit),y1:cy,x2:x(limit),y2:cy,stroke:'#9ab0b8'});node(svg,'line',{x1:cx,y1:y(-limit),x2:cx,y2:y(limit),stroke:'#9ab0b8'});
 for(const n of [-limit,0,limit]){node(svg,'text',{x:x(n),y:cy+17,'text-anchor':'middle',fill:'#526e7b'},fmt(n,2));if(n)node(svg,'text',{x:cx+7,y:y(n)+4,fill:'#526e7b'},fmt(n,2));}
 node(svg,'text',{x:x(limit),y:cy-8,'text-anchor':'end',fill:'#203747'},'实部');node(svg,'text',{x:cx+10,y:y(limit)-8,fill:'#203747'},'虚部');
 node(svg,'polyline',{points:chain.map(z=>x(z[0])+','+y(z[1])).join(' '),fill:'none',stroke:'#abbcc3','stroke-width':1.1,'stroke-dasharray':'3 4','data-sum-chain':'true'});
 points.forEach((z,k)=>arrow(svg,cx,cy,x(z[0]),y(z[1]),colors[b],1.2,{'data-contribution':k,'data-real':z[0],'data-imag':z[1]}));
 arrow(svg,cx,cy,x(value.fittedGain[0]),y(value.fittedGain[1]),'#173849',3,{'data-resultant':'true','data-real':value.fittedGain[0],'data-imag':value.fittedGain[1]});node(svg,'circle',{cx:x(value.fittedGain[0]),cy:y(value.fittedGain[1]),r:4,fill:'#173849'});
 const phase=value.score<1e-24?'未定义（数值零向量）':fmt(Math.atan2(value.fittedGain[1],value.fittedGain[0]),4)+' rad';
 $('ru-phasor-value').textContent=labels[b]+'，r='+fmt(value.candidateM)+' m：α̂='+complex(value.fittedGain)+'；相位 '+phase+'；|α̂|²='+fmt(value.score,6)+' = 此处曲线 Q。候选残差 '+fmt(value.residualEnergy,6)+'，仅用 '+value.sampleCount+' 格。';
 const rows=$('ru-contributions');rows.replaceChildren();points.forEach((z,k)=>{const tr=html(rows,'tr');html(tr,'td',current.inputs[b].frequencyOffsetsHz[k]/C.cfg.df);html(tr,'td',fmt(z[0],8));html(tr,'td',fmt(z[1],8));});
 current.selectedInspection={branch:b,value,truthMarkerShown:$('ru-show-truth').checked,injectionMarksShown:$('ru-show-errors').checked};
}
function renderSelection(){if(!current){if(revealed)recompute();return;}const index=selectedIndex();$('ru-candidate-value').textContent='候选 '+fmt(C.CANDIDATES[index])+' m；计算格距0.25 m，非物理分辨率';drawCurves(index);drawPhasors(index);}
function symbol(z){const choices=['+1','+i','−1','−i'],q=[[.25,0],[0,.25],[-.25,0],[0,-.25]];let best=0;for(let i=1;i<4;i++)if(Math.hypot(z[0]-q[i][0],z[1]-q[i][1])<Math.hypot(z[0]-q[best][0],z[1]-q[best][1]))best=i;return choices[best];}
function renderSymbols(){if(!current)return;const host=$('ru-symbols');host.replaceChildren();const pilots=C.PILOTS[current.pilotMode],show=$('ru-show-errors').checked;for(let k=0;k<16;k++){const tr=html(host,'tr'),pilot=pilots.includes(k),wrong=current.stressMetadata.errorIndices.includes(k);html(tr,'td',k+' / '+(pilot?'P':'D'));html(tr,'td',symbol(frame.truth.transmitSymbols[k]));html(tr,'td',pilot?symbol(frame.truth.transmitSymbols[k]):'未知 · 未使用');const cell=html(tr,'td',symbol(current.reference[k])+(show&&wrong?' · 注入错误':''),show&&wrong?'ru-symbol-error':'');cell.setAttribute('data-stress-symbol',k);html(tr,'td',complex(frame.observation[k]));}}
function reset(){clearRecord();pendingSettings=false;$('ru-record-details').open=false;noiseSeed=2026;referenceSeed=2026;revealed=false;frame=null;physicalKey='';current=null;$('ru-range').value='43.7';$('ru-snr').value='none';$('ru-pilots').value='irregular';$('ru-mode').value='random';$('ru-error-count').value='0';$('ru-preset').value='baseline';$('ru-prediction').value='undecided';$('ru-candidate').value='175';$('ru-branch').value='stress';$('ru-show-truth').checked=true;$('ru-show-errors').checked=false;$('ru-phasor-details').open=false;$('ru-symbol-details').open=false;$('ru-results').hidden=true;$('ru-awaiting').hidden=false;for(const id of ['ru-curves','ru-phasors','ru-estimates','ru-budget-cards','ru-symbols','ru-contributions'])$(id).replaceChildren();controls();recompute();}
function preset(){const presets={baseline:['43.7','none','irregular','random','0','175'],noisy:['43.7','0','irregular','random','4','175'],aliases:['25','none','comb','random','0','100'],structure:['25','none','comb','rotate','12','100']},p=presets[$('ru-preset').value];if(!p)throw new Error('未知预设');for(const [i,id]of ['ru-range','ru-snr','ru-pilots','ru-mode','ru-error-count','ru-candidate'].entries())$(id).value=p[i];recompute();}
if(!C){clearRecord('数值核心未能加载，未生成计算记录。');for(const id of controlled)$(id).disabled=true;$('ru-status').textContent='数值核心未能加载；计算控件保持禁用，请继续阅读下方模型、解析例与来源。';return;}
for(const id of controlled)$(id).disabled=false;
for(const id of ['ru-range','ru-snr','ru-pilots','ru-mode','ru-error-count'])$(id).addEventListener('input',()=>{pendingSettings=true;clearRecord('显示仍为上次计算；当前输入尚未提交，不可下载。');});
$('ru-reveal').addEventListener('click',()=>safely(()=>{revealed=true;recompute();}));
for(const id of ['ru-range','ru-snr'])$(id).addEventListener('change',()=>safely(recompute));
$('ru-error-count').addEventListener('input',()=>safely(recompute));
$('ru-pilots').addEventListener('change',()=>safely(()=>{const switched=$('ru-pilots').value==='irregular'&&$('ru-mode').value!=='random';if(switched)$('ru-mode').value='random';recompute();if(switched)$('ru-status').textContent+=' 不规则导频下已切回逐个注入模式；错误数保留。';}));
$('ru-mode').addEventListener('change',()=>safely(()=>{if(['rotate','ramp'].includes($('ru-mode').value))$('ru-error-count').value='12';recompute();}));
$('ru-noise').addEventListener('click',()=>safely(()=>{noiseSeed=(noiseSeed+1)>>>0;recompute();}));
$('ru-reference-seed').addEventListener('click',()=>safely(()=>{if($('ru-mode').value!=='random')return;referenceSeed=(referenceSeed+1)>>>0;recompute();}));
$('ru-apply-preset').addEventListener('click',()=>safely(preset));$('ru-reset').addEventListener('click',()=>safely(reset));
$('ru-candidate').addEventListener('input',()=>safely(selectionChanged));$('ru-branch').addEventListener('change',()=>safely(selectionChanged));$('ru-show-truth').addEventListener('change',()=>safely(selectionChanged));$('ru-show-errors').addEventListener('change',()=>safely(()=>{clearRecord();renderSymbols();if(current)current.selectedInspection.injectionMarksShown=$('ru-show-errors').checked;commitRecord();}));
$('ru-curves').addEventListener('click',event=>safely(()=>{if(!current)return;const rect=$('ru-curves').getBoundingClientRect();if(!rect.width)return;const w=Math.max(260,Math.min(1050,$('ru-curves').clientWidth||760)),px=(event.clientX-rect.left)*w/rect.width,r=Math.max(0,Math.min(149.75,(px-48)/(w-62)*150));$('ru-candidate').value=String(Math.round(r/.25));selectionChanged();}));
window.addEventListener('resize',()=>safely(()=>{if(current)renderSelection();}));
reset();
})();
