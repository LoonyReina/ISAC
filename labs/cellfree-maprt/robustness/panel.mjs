import {SEEDS,CONTRACT,StudySession,decodeStudy} from './model.mjs';
const labels={communication:'通信最小功率',isac:'ISAC',isacS:'ISAC+S',cap_saturated_communication:'放大通信（饱和拟合上限）'};
const n=x=>Number(x).toPrecision(6),percent=x=>(100*x).toFixed(2)+'%',interval=x=>'['+x.map(percent).join(', ')+']';
export function renderView(view){
 const header=`<p class="cf-robust-bound">新生成的离线设计绑定：seed ${view.seed} · 拟合 ${view.fitSamples} · holdout 512 · 固定3 dB / 每AP 1 W。下列检测条件于这些分配、同一固定几何与各自冻结门限；上方实时控件不会改变本研究。</p>`;
 const cards=view.families.map(f=>{
 const solver=f.solver,attempts=solver.restarts.map((r,i)=>`重启${i+1}：${r.accepted?'接受':'失败'}（${r.termination}）`).join('；');
 const solverText=solver.restarts.length?`选中重启：${solver.selectedRestart===null?'无':solver.selectedRestart+1}（原始索引${solver.selectedRestart??'无'}）。${attempts}`:'基线，无CCP重启';
 if(!f.available)return `<article><h3>${labels[f.name]}</h3><p><strong>不可用：所有重启失败</strong>，没有分配或Pd可比较，不记为0。</p><p>${solverText}</p></article>`;
 const a=f.allocation,ap=a.AP,fit=a.fitted,hold=a.holdout,cross=hold.nominalCrossings.communication.some(Boolean)||hold.nominalCrossings.perAP.some(Boolean);
 const rows=(prefix,xs,ys,limit)=>xs.map((x,i)=>`<tr><th>${prefix}${i+1}</th><td>${n(x)}</td><td>${n(ys[i])}</td><td>${limit}</td></tr>`).join('');
 return `<article><h3>${labels[f.name]}</h3><p><strong>${cross?'holdout存在名义越界':'holdout未见名义越界'}</strong><br>最小UE SINR（线性）：${n(Math.min(...fit.communication_sinr))} → ${n(Math.min(...hold.communication_sinr))}<br>最大AP期望功率：${n(Math.max(...fit.per_ap_power_w))} → ${n(Math.max(...hold.per_ap_power_w))} W</p><p>箭头：拟合 → 独立holdout；门槛分别为≥${n(CONTRACT.gammaLinear)}、≤1 W</p><p>条件Pd：${ap.detections}/1024 = ${percent(ap.pd)}<br>条件Pfa：${ap.falseAlarms}/1024 = ${percent(ap.pfa)}</p><details><summary>用能、全部约束、区间与重启</summary><p>源感知SINR代理（无量纲）：${n(fit.sensing_sinr)}<br>实际期望总功率（拟合 → holdout）：${n(fit.total_power_w)} → ${n(hold.total_power_w)} W<br>感知流幅度平方 ρ₀=p₀²：${n(a.p[0]**2)} W</p><div class="cf-robust-table" tabindex="0"><table><caption>设计矩与独立检验矩；SINR为线性值，功率为W</caption><thead><tr><th>对象</th><th>拟合</th><th>holdout</th><th>约束</th></tr></thead><tbody>${rows('UE',fit.communication_sinr,hold.communication_sinr,'≥ '+n(CONTRACT.gammaLinear))}${rows('AP',fit.per_ap_power_w,hold.per_ap_power_w,'≤ 1 W')}</tbody></table></div><p>固定门限：${n(ap.threshold.threshold)}（2048次H0校准，顺序统计量k=${ap.threshold.order_k}，判决≥门限）；目标Pfa=.05<br>校准未来尾概率Beta 95%区间：${interval(ap.threshold.calibration_tail_interval)}<br>评估Pfa Clopper–Pearson 95%区间：${interval(ap.pfaInterval)}<br>评估Pd Clopper–Pearson 95%区间：${interval(ap.pdInterval)}</p><p>${solverText}</p><p>max-prior常数log C₃=${n(ap.logC3)}；边缘化对数行列式比=${n(ap.logDetRatio)}，后者没有替代前者。</p></details></article>`;
 }).join('');
 return header+`<div class="cf-robust-cards">${cards}</div>`;
}
export function mount(root=document){
 const get=id=>root.getElementById(id),world=get('cf-robust-world');if(!world)return null;
 const fit=get('cf-robust-fit'),load=get('cf-robust-load'),cancel=get('cf-robust-cancel'),download=get('cf-robust-export'),status=get('cf-robust-status'),results=get('cf-robust-results');
 world.innerHTML=SEEDS.map((seed,i)=>`<option value="${seed}">世界${i+1} · ${seed}</option>`).join('');
 const session=new StudySession();let cached=null;
 async function select(){
  download.disabled=true;cancel.disabled=false;results.replaceChildren();status.textContent='正在读取并校验新生成的离线证据；没有运行仿真';
  try{
   const changed=await session.select(Number(world.value),Number(fit.value),async signal=>{
    if(cached)return cached;
    const response=await fetch(new URL('./study.json',import.meta.url),{signal});if(!response.ok)throw Error('离线证据读取失败');
    const data=await decodeStudy(await response.arrayBuffer());if(!signal.aborted)cached=data;return data;
   });
   if(!changed)return;
   results.innerHTML=renderView(session.view);status.textContent=`已校验：世界seed ${session.view.seed} / 拟合${session.view.fitSamples}，新生成的离线记录，非本次仿真`;
   download.disabled=false;cancel.disabled=true;
  }catch(e){status.textContent=e.message;cancel.disabled=true;download.disabled=true;}
 }
 load.addEventListener('click',select);world.addEventListener('change',select);fit.addEventListener('change',select);
 cancel.addEventListener('click',()=>{session.cancel();results.replaceChildren();download.disabled=true;cancel.disabled=true;status.textContent='读取已取消；没有当前有效结果';});
 download.addEventListener('click',()=>{
  const record=session.export();const blob=new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`maprt-offline-${record.seed}-fit${record.fitSamples}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 return session;
}
if(typeof document!=='undefined')mount();
