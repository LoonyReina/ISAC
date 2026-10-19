import {simulate} from './simulation.mjs';
import {createSession} from './session.mjs';
const $=id=>document.getElementById(id),format=v=>Number(v).toPrecision(5);let generation=null,active=true;const loading=new AbortController();
function text(id,value){$(id).textContent=value;}
function line(parent,value){const p=document.createElement('p');p.textContent=value;parent.append(p);}
const session=createSession(()=>new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'}),state=>{
 $('joint-cancel').disabled=state.status!=='running';$('joint-export').disabled=state.status!=='completed';
 const labels={idle:'等待运行',running:`正在计算：已检查 ${state.progress||0} 个联合支持集`,stale:'输入已变更，旧输出已失效；请重新计算',cancelled:'已取消；没有可导出的当前结果',error:`计算失败：${state.error}`,completed:'网格搜索完成；有限网格估计，不是连续收敛或恢复认证'};text('joint-status',labels[state.status]);
 $('joint-result').replaceChildren();$('joint-diagnostics').replaceChildren();if(state.status!=='completed')return;
 const r=state.result,b=r.best;line($('joint-result'),`已知 P=${state.input.P}；检查 ${r.supportCount} 个支持集；拒绝 ${Object.values(r.failures).reduce((a,b)=>a+b,0)} 个。`);
 if(b){line($('joint-result'),`联合网格残差 ${format(b.residual)}；单径 ${format(r.baselines.single.residual)}；顺序消去 ${format(r.baselines.sequential.residual)}（同一 y）`);line($('joint-result'),`估计 (q,a)：${b.theta.map(t=>`(${t.map(format).join(', ')})`).join('；')}`);line($('joint-result'),`联合复增益：${b.h.map(t=>`${format(t[0])} ${t[1]<0?'−':'+'} ${format(Math.abs(t[1]))}i`).join('；')}`);line($('joint-result'),`数值状态 ${b.status}；条件数 ${format(b.condition)}；缩放正规方程缺陷 ${format(b.scaled_normal_defect)}`);}
 else line($('joint-result'),'没有通过数值门限的支持集');
 line($('joint-diagnostics'),`拒绝计数：${JSON.stringify(r.failures)}；优化器状态：${r.optimizerStatus}（实时未运行连续细化）`);r.starts.forEach((s,i)=>line($('joint-diagnostics'),`初始化 ${i+1}：${JSON.stringify(s.theta)}；残差 ${format(s.residual)}；离线细化可用单元边界 ${JSON.stringify(s.cellBounds)}`));
});
window.addEventListener('pagehide',()=>{active=false;loading.abort();session.dispose();generation=null;$('joint-run').disabled=true;$('joint-export').disabled=true;$('joint-cancel').disabled=true;text('joint-status','页面已停止；返回后请刷新以重新计算');});
for(const id of ['joint-scene','joint-snr','joint-seed'])$(id).addEventListener('input',()=>{generation=null;session.invalidate();});
$('joint-cancel').addEventListener('click',()=>session.cancel());
$('joint-export').addEventListener('click',()=>{try{const record=JSON.parse(session.export());record.generation=generation.generation;record.evaluationTruth=generation.truth;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='otfs-joint-grid.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){text('joint-status',e.message);}});
try{const [x,scenes]=await Promise.all(['waveform.json','scenes.json'].map(async path=>{const response=await fetch(new URL(path,import.meta.url),{signal:loading.signal});if(!response.ok)throw new Error(`数据加载 ${response.status}`);return response.json();}));const run=()=>{if(!active)return;try{generation=simulate(x,scenes[Number($('joint-scene').value)],Number($('joint-snr').value),Number($('joint-seed').value));session.run(generation.receiver);}catch(e){session.invalidate();text('joint-status',e.message);}};if(active){$('joint-run').addEventListener('click',run);run();}}catch(e){if(active){text('joint-status',`无法准备实验：${e.message}`);$('joint-run').disabled=true;}}

