import {LessonController} from './controller.mjs';
import {executeWorker} from './transport.mjs';
const $=id=>document.getElementById(id);
for(const [id,name,values] of [['l-options','L',[1,2,3,5]],['k-options','kappa',[0,.25,.5,.75,1]]]){
  for(const value of values){const label=document.createElement('label'),radio=document.createElement('input'),text=document.createElement('span');radio.type='radio';radio.name=name;radio.value=value;text.textContent=name==='L'?value:`${value*100}%`;label.append(radio,text);$(id).append(label);}
}
let started=0,lastAnnouncement='';
const labels={idle:'尚未运行 · 等待手动计算',dirty:'参数已修改，请重新计算',running:'计算中 · 本设备本次积分',complete:'完成 · 本设备本次重算 · 数值检查通过',cancelled:'已取消 · 本次未完成，未生成当前参数结果',timeout:'已超时 · 本次未完成，未生成当前参数结果',failed:'计算未通过 · 未生成结果，请重试或重置参数'};
function render(state){
  for(const radio of document.querySelectorAll('input[name="L"]'))radio.checked=Number(radio.value)===state.input.L;
  for(const radio of document.querySelectorAll('input[name="kappa"]'))radio.checked=Number(radio.value)===state.input.kappa;
  $('k-field').disabled=state.input.L===1;
  $('k-note').textContent=state.input.L===1?'没有额外候选站，κ 不影响结果。保留的 κ 选项不用于本次比较。':'最近站始终服务；其他候选站独立接受。';
  const running=state.status==='running',complete=state.status==='complete';
  $('comparison').setAttribute('aria-busy',String(running));$('run').disabled=running;$('reset').disabled=false;$('cancel').hidden=!running;$('download').disabled=!complete;$('chart').hidden=!complete;$('empty').hidden=complete;
  $('empty').querySelector('p').textContent=state.status==='idle'?'尚未运行':'等待当前参数结果';
  $('empty').querySelector('small').textContent=running?'正在执行粗、细两级积分与复核':'按计算按钮，执行本设备本次积分';
  const status=labels[state.status];if(status!==lastAnnouncement){$('status').textContent=status;lastAnnouncement=status;}
  if(!running)$('elapsed').textContent='';
  $('diagnostics').replaceChildren();
  if(!complete){$('diagnostics').textContent=state.status==='failed'?`本次未通过：${state.error}。没有可下载的成功记录。`:'尚无当前参数的成功记录。';return;}
  const r=state.result,a=r.baseline.refined,b=r.selected.refined,top=Math.ceil(Math.max(a,b)*1.15*2)/2;
  $('a-value').textContent=a.toFixed(3);$('b-value').textContent=b.toFixed(3);$('a-bar').style.width=`${100*a/top}%`;$('b-bar').style.width=`${100*b/top}%`;$('axis-max').textContent=top.toFixed(1);
  $('b-label').textContent=`B · L = ${r.input.L}${r.input.L===1?'，κ 不适用':`，κ = ${r.input.kappa}`}`;
  $('difference').textContent=r.equivalentToBaseline?'理论增益 = 0':`B − A = ${r.difference.toFixed(3)} nats / 信道使用`;
  $('conclusion').textContent=r.equivalentToBaseline?'理论上与基线完全相同；原始数值差异仅为积分诊断，见下方复核。':'接受站从干扰集合转到信号集合；该结果尚未计入协调代价。';
  const append=text=>{const p=document.createElement('p');p.textContent=text;$('diagnostics').append(p);};
  append(`输入：L=${r.input.L}，κ=${r.executionKappa==='not-applicable'?'不适用（L=1）':r.input.kappa}；α=4，K=3，pc=0.5。单位：nats / 信道使用。`);
  append(`经验两级求积差：A ${r.refinement.baseline.toExponential(3)}；B ${r.refinement.selected.toExponential(3)}。声明门槛 1e−6，检查通过。`);
  for(const [key,label] of [['baseline','A'],['selected','B']]){const t=r.analyticTruncation[key];append(`${label} 解析截断上界：low-z ${t.low_z.toExponential(3)}；high-z ${t.high_z.toExponential(3)}；small-v ${t.small_v.toExponential(3)}；合计 ${t.sum.toExponential(3)}。不包含区域内求积误差。`);}
  append(`原始 B−A：${r.difference.toExponential(6)}${r.equivalentToBaseline?'；理论精确等价，不解释为收益':''}。`);
  append(`本次等待与计算耗时 ${(r.endToEndMs/1000).toFixed(2)} 秒（含 Worker 启动及传输，不含之后的绘制）。内核 ${(r.elapsedMs/1000).toFixed(2)} 秒；最长计算块 ${r.maxChunkMs.toFixed(2)} ms。`);
  append(`内核 ${r.kernelVersion}；请求 ${r.envelope.requestId}。完整配置与计算身份保存在下载记录中。`);
  $('elapsed').textContent=`本次 ${(r.endToEndMs/1000).toFixed(2)} 秒`;
}
const controller=new LessonController({execute:executeWorker,onChange:render});render(controller.state);
$('controls').addEventListener('change',()=>controller.edit({L:Number(document.querySelector('[name="L"]:checked').value),kappa:Number(document.querySelector('[name="kappa"]:checked').value)}));
$('controls').addEventListener('submit',e=>{e.preventDefault();started=performance.now();controller.run();});
$('cancel').addEventListener('click',()=>controller.cancel());$('reset').addEventListener('click',()=>controller.reset());
const timer=setInterval(()=>{if(controller.state.status==='running'){const p=controller.state.progress;$('elapsed').textContent=`${p?`${p.target==='baseline'?'基线':'候选簇'} · ${p.phase==='coarse'?'粗积分':'细积分'} · `:''}${((performance.now()-started)/1000).toFixed(1)} 秒`;}},100);
$('download').addEventListener('click',()=>{const r=controller.exportRecord();if(!r)return;const payload={...r,device:{userAgent:navigator.userAgent,language:navigator.language},generatedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`cooperative-rate-L${r.input.L}-request${r.envelope.requestId}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
addEventListener('pagehide',()=>{controller.dispose();clearInterval(timer);});
addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
