import {experiment} from './subset-adapter.mjs';
import {createScheduler} from './request-scheduler.mjs';
import {createController} from './controller.mjs';
import {PRESETS} from './presets.mjs';
const root=document.getElementById("cl-question");
const $=id=>root.querySelector("#cl-"+id);
for(const [key,p] of Object.entries(PRESETS)){const o=document.createElement('option');o.value=key;o.textContent=p.label;$('geometry').append(o);}
let oracle=null, config=null;
const fmt=x=>x===null?'暂无':Number.isFinite(x)?(Math.abs(x)>0&&Math.abs(x)<1e-5?x.toExponential(5):x.toLocaleString('en-US',{maximumSignificantDigits:7})):'未定义';
const logFmt=x=>x===-Infinity?'−∞（概率恰为 0）':fmt(x);
const probability=(p,log,positive)=>p===0&&positive?`正值 · ln(p)=${fmt(log)}`:p===1&&Number.isFinite(log)&&log<0?`≈100% · ln(p)=${fmt(log)}`:`${fmt(100*p)}%`;
function metric(label,value,note=''){return `<div class="cl-metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;}
const controller=createController(createScheduler,render);
function render(state){
 const s=state.snapshot, live=state.phase==='running';
 $('single').disabled=!s||!['ready','complete'].includes(state.phase)||s.remaining<1;
 $('run').disabled=!s||!['ready','complete'].includes(state.phase)||s.remaining<Number($('batch').value);
 $('cancel').disabled=!live;$('download').disabled=state.phase!=='complete'||!s?.total;
 const phases={ready:'等待抽样',running:'计算中',complete:'本轮完成',partial:'已取消 · 部分结果',invalid:'输入无效',error:'计算中断'};
 $('status').textContent=`${phases[state.phase]??state.phase} · generation ${state.generation}${s?` · 累计 ${s.total.toLocaleString()} 次`:''}${state.error?' · '+state.error:''}`;
 if(!s||!oracle){$('metrics').textContent='输入有效参数后重新计算';$('diagram').replaceChildren();$('station-list').replaceChildren();$('request').textContent='尚无有效实验';$('matrix').textContent='尚无有效实验';return;}
 $('metrics').innerHTML=metric('单站精确接纳概率 κ',(oracle.load.acceptance===1&&oracle.load.rejectionPositive?'≈100%':probability(oracle.load.acceptance,Math.log(oracle.load.acceptance),true)),`拒绝概率 ln(p)=${logFmt(oracle.load.logRejection)}`)+
 metric('精确不可辨识概率',probability(s.exactOutage,s.exactLogOutage,s.exactPositiveOutage),s.exactPositiveOutage?'数学上严格为正':'数学上为零')+
 metric('经验失败 / 全部尝试',s.total?`${s.outages.toLocaleString()} / ${s.total.toLocaleString()}`:'尚未抽样',s.total?`经验失败率 ${fmt(100*s.empiricalOutage)}%`:'每个失败都计入分母')+
 metric('条件均值 · 理论逆迹界',s.conditionalStatus==='finite'?fmt(s.conditionalInverseMean):'不可用',`样本分母 ${s.successes}；排除不可辨识 ${s.outages} 次`)+
 metric('精确条件均值',s.exactConditionalStatus==='finite'?fmt(s.exactConditionalInverseMean):'不可用','仅条件于可辨识子集；不是 inverse(mean F)')+
 metric('扩展无条件界',s.unconditionalStatus==='finite'?fmt(s.unconditionalInverseTrace):'∞',s.unconditionalStatus==='finite'?'零失败概率，固定完整几何可辨识':'含不可辨识结果，不能替换为有限均值');
 const last=s.last;
 $('request').textContent=last?`第 ${last.requestIndex} 次 · 接纳 ${last.acceptedCount}/${s.stationCount} 站 · 秩 ${last.rank} · ${last.rank===2?'可辨识':'不可辨识（保留为失败）'}`:'尚未抽样 · 站点显示候选布局';
 const row=last?oracle.subsets[last.acceptedMask]:null;
 $('matrix').textContent=row?`F = [[${row.fim[0]}, ${row.fim[1]}], [${row.fim[1]}, ${row.fim[2]}]]\nrank = ${row.rank}\ntrace(F⁻¹) = ${row.inverseTrace??'不可用：奇异矩阵'}`:'尚未抽样';
 const rational=a=>a[0]/a[1],points=s.geometry.map(([ux,uy,w])=>{const r=1/Math.sqrt(rational(w));return [-r*rational(ux),-r*rational(uy)];});
 const max=Math.max(...points.flat().map(Math.abs),1),scale=145/max;
 let svg='<line x1="30" y1="200" x2="470" y2="200" stroke="#26394d"/><line x1="250" y1="25" x2="250" y2="375" stroke="#26394d"/><text x="475" y="192">x</text><text x="260" y="25">y</text><circle cx="250" cy="200" r="100" fill="none" stroke="#23384d" stroke-dasharray="2 7"/>';
 let lines='';points.forEach(([x,y],i)=>{const px=250+x*scale,py=200-y*scale,accepted=last?Boolean(last.acceptedMask&(1<<i)):null,color=accepted===true?'#67d5dc':accepted===false?'#718397':'#8eaccb';svg+=`<line x1="250" y1="200" x2="${px}" y2="${py}" stroke="${color}" stroke-width="2" ${accepted===false?'stroke-dasharray="5 7"':''}/><circle cx="${px}" cy="${py}" r="13" fill="#112438" stroke="${color}" stroke-width="2"/><text x="${px}" y="${py+5}" text-anchor="middle">${i+1}</text><text x="${px}" y="${py-22}" text-anchor="middle">${accepted===null?'候选':accepted?'接纳':'拒绝'}</text>`;
 lines+=`<div class="cl-station"><span>站 ${i+1} · ${accepted===null?'候选':accepted?'接纳':'拒绝'}</span><span>${last?`K=${last.otherCounts[i]} · 名次 ${last.uniformRanks[i]}/${last.otherCounts[i]+1} · ψ=${s.psi}`:'等待目标请求'}</span></div>`;});
 svg+='<circle cx="250" cy="200" r="9" fill="#f2b369"/><text x="250" y="228" text-anchor="middle">目标请求</text>';$('diagram').innerHTML=svg;$('station-list').innerHTML=lines;
}
function configure(){oracle=null;const rawM=$('load').value,rawPsi=$('capacity').value,rawSeed=$('seed').value;
 config={stations:PRESETS[$('geometry').value].stations,m:rawM.trim()?Number(rawM):NaN,psi:rawPsi.trim()?Number(rawPsi):NaN,seed:rawSeed.trim()?Number(rawSeed):NaN};
 // Invalidate prior generation before validation, including incomplete input.
 controller.configure(config);
 if(controller.state().snapshot){oracle=experiment(config.stations,config.m,config.psi);render(controller.state());}
}
for(const id of ['geometry','load','capacity','seed'])$(id).addEventListener('input',configure);
$('batch').addEventListener('change',()=>render(controller.state()));
$('reset').addEventListener('click',configure);
async function run(n){try{await controller.run(n);}catch(e){$('status').textContent=e.message;}}
$('single').onclick=()=>run(1);$('run').onclick=()=>run(Number($('batch').value));$('cancel').onclick=()=>controller.cancel();
function safeJSON(value){return JSON.stringify(value,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?{status:v===-Infinity?'negative_infinity':v===Infinity?'positive_infinity':'invalid',value:null}:v,2);}
$('download').onclick=()=>{const state=controller.state();if(state.phase!=='complete'||!state.snapshot.total)return;const data={schema:'cooperative-load-export-v1',uiVersion:'integrated-lesson-v1',runStatus:'complete',generation:state.generation,createdAt:new Date().toISOString(),displayGeometry:{beta:2,q:1,position:'-u * w^(-1/2)',preset:$('geometry').value},source:{url:'https://arxiv.org/pdf/2403.20228v3',sha256:'9c8fc76d85b3fdaedbcfd7a2bb97560c7bfe4afa5323d852c570f99ffd870acd'},snapshot:state.snapshot,oracle};const url=URL.createObjectURL(new Blob([safeJSON(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`cooperative-load-seed-${state.snapshot.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
configure();
window.addEventListener('pagehide',()=>controller.cancel());
