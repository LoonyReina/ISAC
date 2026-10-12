/* Original synthetic lesson. Prediction is frozen before evaluation; no network. */
(()=>{'use strict';
const C=window.RadarBeamDecisionCore,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const modes=['interleaved_frames','held_trajectories','held_scene'];
const names={interleaved_frames:'交错帧',held_trajectories:'保留整条轨迹',held_scene:'保留整个场景'};
const colors={candidate:'#087f78',other:'#bac9d2',label:'#7048a5',probed:'#bc5b0f',grid:'#dfe7ec'};
const resultIds=['rb-current','rb-observed','rb-predicted','rb-candidates','rb-truth','rb-hit','rb-hit-note','rb-loss','rb-cost','rb-cost-note','rb-conclusion','rb-batch-result','rb-control-note','rb-membership','rb-raw'];
let cache=new Map(),dataKey='',sampleKey='',current=null,exampleNote='';
const records=window.ExperimentRecord?window.ExperimentRecord.create({disclosure:$('rb-export'),output:$('rb-raw'),button:$('rb-download'),status:$('rb-download-status')}):null;
const pct=x=>(100*x).toFixed(2)+'%',signed=x=>(x>=0?'+':'')+x.toFixed(4);
const db=x=>x===Infinity?'+∞ dB':(x===0?'0':x<.001?x.toExponential(3):x.toFixed(3))+' dB';
const power=x=>x===0?'0':x<.0001?x.toExponential(4):x.toFixed(6);
function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;return n;}
function append(svg,tag,attrs,text){const n=el(tag,attrs,text);svg.append(n);return n;}
function readControls(){
 if(!C||!records)throw new Error('Numerical core or record helper unavailable');
 for(const id of ['rb-k','rb-sample','rb-seed'])if(!$(id).value.trim())throw new RangeError('Empty control');
 const k=Number($('rb-k').value),sample=Number($('rb-sample').value),seed=Number($('rb-seed').value),mode=$('rb-protocol').value,control=$('rb-control').value;
 if(!Number.isInteger(k)||k<1||k>64||!Number.isInteger(sample)||sample<0||sample>=64||!Number.isInteger(seed)||seed<0||seed>99999||!modes.includes(mode)||!['shifted','zero-shift','neutral'].includes(control))throw new RangeError('Invalid controls');
 const cfg={seed,sceneShift:control==='shifted'?.12:0,runShift:control==='shifted'?.04:0,contextWeight:control==='neutral'?0:.18};
 return {k,sample,seed,mode,control,cfg};
}
function getRun(settings,mode=settings.mode){if(!cache.has(mode))cache.set(mode,C.run(settings.cfg,mode));return cache.get(mode);}
function plot(row,evaluation){
 const svg=$('rb-power'),width=Math.max(220,svg.clientWidth||600),height=300,left=40,right=12,top=25,bottom=248,w=width-left-right,h=bottom-top,cw=w/64;
 const x=j=>left+(j+.5)*cw,y=p=>bottom-p*h;
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 for(const p of [0,.5,1]){append(svg,'line',{x1:left,y1:y(p),x2:width-right,y2:y(p),stroke:colors.grid});append(svg,'text',{x:left-7,y:y(p)+4,'text-anchor':'end'},String(p));}
 append(svg,'text',{x:left,y:14},'相对线性功率');
 const selected=new Set(evaluation.candidates);
 row.power.forEach((p,j)=>append(svg,'rect',{x:left+j*cw+.25,y:y(p),width:Math.max(.1,cw-.5),height:p*h,fill:selected.has(j)?colors.candidate:colors.other,'data-beam':j,'data-power':p,'data-candidate':selected.has(j)?'yes':'no'}));
 append(svg,'rect',{x:x(row.label)-4,y:y(row.power[row.label])-4,width:8,height:8,fill:'white',stroke:colors.label,'stroke-width':2,'data-marker':'label'});
 append(svg,'circle',{cx:x(evaluation.bestProbedBeam),cy:y(evaluation.achievedPower),r:3,fill:colors.probed,stroke:'white','stroke-width':.7,'data-marker':'best-probed'});
 for(const j of (width<400?[0,32,63]:[0,16,32,48,63]))append(svg,'text',{x:x(j),y:bottom+20,'text-anchor':j===0?'start':j===63?'end':'middle'},String(j));
 append(svg,'text',{x:left+w/2,y:height-8,'text-anchor':'middle'},'通信波束编号（不是角度）');
}
function populateSamples(run){
 const key=run.test.join(',');if(sampleKey===key)return;const select=$('rb-sample'),value=select.value;select.replaceChildren();
 run.test.forEach((index,i)=>{const row=run.dataset.rows[index],option=document.createElement('option');option.value=String(i);option.textContent=`${i+1}. 样本 ${row.id} · 轨迹 ${row.run} / 帧 ${row.frame}`;select.append(option);});
 select.value=value;sampleKey=key;
}
function table(settings){
 const tbody=$('rb-comparison');tbody.replaceChildren();const comparisons=[];
 if(!$('rb-extension').open){$('rb-membership').textContent='';return comparisons;}
 for(const mode of modes){const run=getRun(settings,mode),m=C.metrics(run,settings.k),s=run.splitSummary,tr=document.createElement('tr');
 for(const text of [names[mode],pct(m.topKHitRate),db(m.meanLossDb),pct(m.lossAboveThresholdRate),String(s.overlappingRuns),String(s.nearbyAnchorCount)]){const td=document.createElement('td');td.textContent=text;tr.append(td);}tbody.append(tr);
 comparisons.push({mode,trainIds:run.train.map(i=>run.dataset.rows[i].id),testIds:run.test.map(i=>run.dataset.rows[i].id),splitSummary:s,predictions:run.predictions,metrics:m});}
 $('rb-membership').textContent=`测试组始终为场景 2 的轨迹 8、9、10、11，帧号 2、6、…、62。当前主协议：${names[settings.mode]}。全部 ${current.dataset.rows.length} 条合成数据；训练池分别有 ${comparisons.map(x=>x.splitSummary.eligibleCount).join(' / ')} 条，每组均只抽取 512 条；完整成员编号见下载的完整 JSON。`;
 return comparisons;
}
function record(run,settings,metrics,comparisons){
 return {identity:'original synthetic sensing-assisted communication teaching model; no DeepSense data, paper CNN, or reproduced paper scores',rng:C.RNG_DESCRIPTION,config:run.config,mode:run.mode,control:settings.control,k:settings.k,selectedTestIndex:settings.sample,selectedSampleId:run.dataset.rows[run.test[settings.sample]].id,
  metricDefinitions:{topKHitRate:'fraction whose tolerance-tied label belongs to frozen top-K prefix',lossDb:'10*(log10(actual maximum power)-log10(best perfectly probed candidate power)); no floor; exact zero candidate power yields Infinity',probeFraction:'K/64 equal-cost probes only; excludes sensing/inference/training/switching/fallback cost',p95:'linear interpolation at .95*(n-1) on sorted sample losses',threshold:'strictly greater than 3 dB; not a communication outage definition'},
  assumptions:{testAnchors:'same 64 correlated frames from scene2/runs8-11; interactive exploration, not an untouched benchmark',channel:'unit-gain single-path half-wavelength 16-element ULA; unchanged channel while perfectly probing candidates',tie:'at each rank choose lowest remaining beam within absolute1e-12 of remaining maximum; loss uses actual max',groupContext:'fabricated stable group-informative sensor context; metadata exclusion does not remove that information'},
  codebookU:run.dataset.beamU,splitSummary:run.splitSummary,trainIds:run.train.map(i=>run.dataset.rows[i].id),testIds:run.test.map(i=>run.dataset.rows[i].id),training:run.train.map(i=>{const r=run.dataset.rows[i];return {id:r.id,x:r.x,label:r.label};}),
  predictionInputs:run.test.map(i=>({id:run.dataset.rows[i].id,x:run.dataset.rows[i].x})),frozenPredictions:run.predictions,
  evaluationOnly:run.test.map(i=>{const r=run.dataset.rows[i];return {id:r.id,scene:r.scene,run:r.run,frame:r.frame,trueU:r.trueU,label:r.label,power:r.power};}),metrics,protocolComparisons:comparisons};
}
function render(){
 const settings=readControls(),key=JSON.stringify(settings.cfg);
 if(dataKey!==key){cache=new Map();dataKey=key;exampleNote='';}
 current=getRun(settings);populateSamples(current);
 const row=current.dataset.rows[current.test[settings.sample]],prediction=current.predictions[settings.sample],m=C.metrics(current,settings.k),e=m.perSample[settings.sample];
 $('rb-k-value').textContent=`${settings.k} / 64`;
 $('rb-current').textContent=`原创合成数据 · ${names[settings.mode]} · 种子 ${settings.seed} · 512 条训练 / 64 条评估；评估样本来自 4 条测试轨迹（是否与训练重叠见延伸） · 正在查看样本 ${row.id}`;
 $('rb-observed').textContent=`方向读数 ${signed(row.x[0])}；两项加权环境特征 ${signed(row.x[1])}、${signed(row.x[2])}。均无单位。`;
 $('rb-predicted').textContent=`从 7 个训练邻居得到 û=${signed(prediction.estimatedU)}；排名第一的波束编号 ${prediction.ranking[0]}。`;
 const prefix=e.candidates.slice(0,8);$('rb-candidates').textContent=`本次前 ${settings.k} 个候选：${prefix.join(' → ')}${settings.k>8?' → …（完整顺序见下载记录）':''}`;
 plot(row,e);
 $('rb-truth').textContent=`评估真值 u=${signed(row.trueU)}；最优标签 ${row.label}，标签功率 ${power(row.power[row.label])}；实际全局最高功率 ${power(e.bestPower)}。前 ${settings.k} 个中实际最高者为波束 ${e.bestProbedBeam}，功率 ${power(e.achievedPower)}。`;
 $('rb-hit').textContent=e.hit?'命中':'未命中';$('rb-hit-note').textContent=`最优标签 ${row.label}${e.hit?'在':'不在'}前 ${settings.k} 个候选中`;
 $('rb-loss').textContent=db(e.lossDb);$('rb-cost').textContent=`${settings.k} / 64`;$('rb-cost-note').textContent=`用了 ${pct(e.probeFraction)} 的遍历次数；理想少试 ${64-settings.k} 个`;
 let conclusion=settings.k===64?'所有波束都试过：必然包含最优标签，功率损失为零，探测次数也回到了全部遍历。':!e.hit&&e.lossDb<.5?'标签没猜中，但功率仍很接近最优。第一名与第二名的差距很小时，错标签不等于通信功率损失很大。':e.hit?'候选包含最优标签；探测后可以取得接近全局最高的功率。继续增加 K 会花更多探测，但不会让候选内最佳功率变差。':'当前候选没有包含最优标签。增加 K 看能否找回足够强的波束，同时留意右侧增加的探测次数。';
 $('rb-conclusion').textContent=(exampleNote?exampleNote+' ':'')+conclusion;
 $('rb-batch-result').textContent=`当前 K=${settings.k}：精确标签命中 ${pct(m.topKHitRate)}，错标签 ${pct(m.beamMissRate)}；候选内最佳功率的平均损失 ${db(m.meanLossDb)}，95% 分位数 ${db(m.p95LossDb)}；损失严格大于 3 dB 的比例 ${pct(m.lossAboveThresholdRate)}。每条信道仍各需 ${settings.k} 次探测，占全部遍历的 ${pct(m.probeFraction)}。`;
 $('rb-control-note').textContent=`当前对照：场景偏移尺度 ${settings.cfg.sceneShift}，轨迹偏移范围 ±${settings.cfg.runShift}，环境特征权重 ${settings.cfg.contextWeight}；相关噪声 σ=0.006 保持不变。${settings.control==='zero-shift'?'偏移为零，但稳定环境特征仍存在。':settings.control==='neutral'?'两类偏移和两项环境特征都为零；相关噪声仍在。':'稳定环境特征刻意携带场景/轨迹线索。'}`;
 const comparisons=table(settings);records.update(record(current,settings,m,comparisons),`radar-beam-decision-seed-${settings.seed}-${settings.mode}-K${settings.k}.json`);
 $('rb-status').textContent=`已计算种子 ${settings.seed} 的${names[settings.mode]}实验。预测与评估分开；控件只在本机计算。`;
}
function fail(){if(records)records.clear();cache=new Map();dataKey='';current=null;exampleNote='';$('rb-power').replaceChildren();$('rb-comparison').replaceChildren();for(const id of resultIds)$(id).textContent='';$('rb-k-value').textContent='';$('rb-download').disabled=true;$('rb-status').textContent='计算未能完成，旧图、结果和导出已清空。请检查种子与控件，或重置整个实验。静态模型与原文仍可阅读。';}
function safeRender(){try{render();}catch{fail();}}
function reset(){
 if(records)records.clear();
 $('rb-k').value='1';$('rb-sample').value='0';$('rb-protocol').value='held_trajectories';$('rb-seed').value='37';$('rb-control').value='shifted';for(const id of ['rb-batch','rb-extension','rb-export'])$(id).open=false;
 cache=new Map();dataKey='';current=null;exampleNote='';safeRender();
}
$('rb-k').addEventListener('input',safeRender);
for(const id of ['rb-sample','rb-protocol','rb-seed','rb-control'])$(id).addEventListener('change',()=>{exampleNote='';safeRender();});
for(const [id,k]of [['rb-k-one',1],['rb-k-five',5],['rb-k-all',64]])$(id).addEventListener('click',()=>{$('rb-k').value=String(k);safeRender();});
$('rb-example').addEventListener('click',()=>{try{const settings=readControls();if(!current)throw new Error('No model');const m=C.metrics(current,1),misses=m.perSample.map((e,i)=>({e,i})).filter(x=>!x.e.hit).sort((a,b)=>a.e.lossDb-b.e.lossDb||a.i-b.i);if(misses.length){$('rb-k').value='1';$('rb-sample').value=String(misses[0].i);exampleNote=`按评估真值挑选的教学样本：这份评估集 K=1 错标签样本中损失最小的一条（${db(misses[0].e.lossDb)}）。${misses[0].e.lossDb>=.5?'本次没有低于 0.5 dB 的错标签例子。':''}`;}else exampleNote='本次 K=1 的全部标签都命中，没有错标签例子；不人为制造一个。';safeRender();}catch{fail();}});
$('rb-reset').addEventListener('click',reset);
$('rb-extension').addEventListener('toggle',safeRender);
window.addEventListener('resize',safeRender);safeRender();
})();
