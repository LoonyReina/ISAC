import {DEFAULTS,caseConfig} from './config.mjs';
const $=id=>document.getElementById(id);
const form=$('parameters');
const branchNames={coordinate:'坐标重建',paired_range:'共享组双站距离',zero_angle:'零角度消融'};
const sceneNotes={separated:'三个可见物体。观察离散角度与时延量化如何影响重建。',delay_ambiguous:'A/B 的真实双站时延相同。不同位置不保证通信时延可区分。',sensing_missing:'B 在两站感知中缺失，但通信路径和评价分母仍保留。'};
let revision=0,requestCounter=0,active=null,timer=null,current=null,selectedGroup=null;
const downloads=new Set();
function setStatus(text,state='idle'){$('status').textContent=text;$('status').dataset.state=state;}
function configFromForm(){
  if(!form.checkValidity())throw new RangeError('请先修正标记的输入：整数种子、K 和所有参数范围必须有效。');
  const values={};for(const name of Object.keys(DEFAULTS)){const control=form.elements.namedItem(name);values[name]=name==='scene'?control.value:control.valueAsNumber;}
  return caseConfig(values);
}
function invalidate(message='参数已修改，旧结果已清除。'){
  revision++;clearTimeout(timer);timer=null;
  if(active){active.worker.terminate();active=null;}
  current=null;selectedGroup=null;$('results').hidden=true;$('empty-state').hidden=false;$('export').disabled=true;$('export-status').textContent='';
  $('scene-note').textContent=sceneNotes[$('scene').value]||'';setStatus(message);
}
function startCalculation(){
  let config;
  try{config=configFromForm();}catch(error){setStatus(error.message,'error');return;}
  const thisRevision=revision,requestId=++requestCounter;
  setStatus(`第 ${requestId} 次本地重算：正在生成扫描并执行完整推断…`,'running');
  let worker;
  try{worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});}catch(error){setStatus(`无法启动本地 Worker：${error.message}。请通过同源 HTTP 页面打开，不能将未运行视为成功。`,'error');return;}
  active={worker,requestId,revision:thisRevision};
  const isCurrent=()=>active?.worker===worker&&active.requestId===requestId&&revision===thisRevision;
  worker.onmessage=event=>{
    if(!isCurrent())return;
    const message=event.data;
    if(message?.requestId!==requestId||message.revision!==thisRevision)return;
    if(message.type==='error'){
      worker.terminate();active=null;current=null;$('export').disabled=true;setStatus(`本次计算失败：${message.message}。没有可导出的当前结果。`,'error');return;
    }
    if(message.type!=='result')return;
    worker.terminate();active=null;current=message.result;selectedGroup=current.inference.groups[0]?.id??null;
    $('empty-state').hidden=true;$('results').hidden=false;$('export').disabled=false;
    renderAll();setStatus(`本地重算完成 · ${message.elapsed_ms.toFixed(1)} ms · ${current.inference.detections.length} 个峰 / ${current.inference.groups.length} 个组。此运行不代表已通过独立验收。`,'done');
  };
  worker.onerror=event=>{
    if(!isCurrent())return;
    event.preventDefault();worker.terminate();active=null;current=null;$('results').hidden=true;$('empty-state').hidden=false;$('export').disabled=true;
    setStatus('Worker 加载或执行失败。旧结果已清除；请检查同源本地服务与模块支持，当前没有计算结果。','error');
  };
  try{worker.postMessage({requestId,revision:thisRevision,config});}catch(error){worker.terminate();active=null;setStatus(`无法提交本地计算：${error.message}`,'error');}
}
function queueCalculation(){
  invalidate();
  try{configFromForm();}catch(error){setStatus(error.message,'error');return;}
  if(globalThis.ISACGuidedManual === true){setStatus('输入有效，等待点击立即重算。');return;}setStatus('输入有效，稍候自动重新计算…');timer=setTimeout(()=>{timer=null;startCalculation();},220);
}
form.addEventListener('input',queueCalculation);
form.addEventListener('submit',event=>{event.preventDefault();invalidate('准备重算…');if(!form.reportValidity()){setStatus('输入尚未有效，未开始计算。','error');return;}startCalculation();});
form.addEventListener('reset',event=>{event.preventDefault();for(const [name,value] of Object.entries(DEFAULTS))form.elements.namedItem(name).value=String(value);invalidate('已恢复默认，旧任务已取消。');if(!(globalThis.ISACGuidedManual === true))startCalculation();});
$('cancel').addEventListener('click',()=>invalidate('已停止并清除结果。修改参数或点击“立即重算”可重新开始。'));
$('branch').addEventListener('change',()=>{if(current)renderAssociations();});
$('reveal-truth').addEventListener('change',()=>{if(current){renderMap();renderGroupDetail();renderAssociations();}});
$('show-detections').addEventListener('change',()=>{if(current)renderMap();});
$('selected-group').addEventListener('change',()=>{selectedGroup=$('selected-group').value;renderLinked();});
window.addEventListener('pagehide',()=>{invalidate('页面已离开，旧任务已终止。');for(const url of downloads)URL.revokeObjectURL(url);downloads.clear();});
window.addEventListener('pageshow',event=>{if(event.persisted){invalidate('重新进入页面，等待重新计算。');if(!(globalThis.ISACGuidedManual === true))startCalculation();}});
const number=(value,digits=3)=>value===null||value===undefined?'—':Number(value).toFixed(digits);
const pct=value=>value===null?'未定义':`${(100*value).toFixed(1)}%`;
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function renderAll(){
  $('run-identity').textContent=`${current.provenance.generator_version} · ${current.config.scene} · seed ${current.config.seed} · noise ${current.config.noise}`;
  $('peak-count').textContent=`${current.inference.detections.length} 个保留峰`;
  $('group-count').textContent=`${current.inference.groups.length} 个匿名组`;
  const counts=current.inference.scan_trace.map(station=>{const total=key=>station.row_counts.reduce((s,r)=>s+r[key],0);return `Mono${station.station_id}：局部极大 ${total('local_maxima')} → 高度 ${total('above_height')} → 间隔 ${total('after_separation')} → 距离 ${total('after_range')} → Top-K ${total('kept')}`;});
  $('scan-summary').textContent=counts.join('；');
  const select=$('selected-group');select.replaceChildren();
  if(!current.inference.groups.length)select.append(element('option','没有可选物体'));
  for(const group of current.inference.groups){const option=element('option',`${group.id} · ${group.member_count} 个峰 · ${group.station_count} 站`);option.value=group.id;select.append(option);}
  select.disabled=!current.inference.groups.length;if(selectedGroup)select.value=selectedGroup;
  renderLinked();renderAssociations();renderMetrics();
}
function renderLinked(){renderMap();renderScans();renderGroupDetail();}
function selectGroup(id){selectedGroup=id;$('selected-group').value=id;renderLinked();}
function svgElement(tag,attributes={},text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attributes))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;return node;}
function renderMap(){
  const svg=$('map');svg.replaceChildren();
  const groups=current.inference.groups,detections=current.inference.detections,truth=$('reveal-truth').checked;
  const points=[...current.observations.stations.map(s=>s.position_m),...groups.map(g=>g.point_m),...($('show-detections').checked?detections.map(d=>d.point_m):[]),...(truth?current.truth.objects.map(o=>[o.x,o.y]):[])];
  let minX=Math.min(-.5,...points.map(p=>p[0]))-.25,maxX=Math.max(4.5,...points.map(p=>p[0]))+.25,minY=Math.min(-1.8,...points.map(p=>p[1]))-.35,maxY=Math.max(2.9,...points.map(p=>p[1]))+.35;
  const W=650,H=360,pad={l:55,r:22,t:25,b:40};
  // Equal axis scale prevents distorting distance/angle interpretation.
  const scale=Math.min((W-pad.l-pad.r)/(maxX-minX),(H-pad.t-pad.b)/(maxY-minY));
  const x0=pad.l+((W-pad.l-pad.r)-scale*(maxX-minX))/2,y0=H-pad.b-((H-pad.t-pad.b)-scale*(maxY-minY))/2;
  const x=v=>x0+(v-minX)*scale,y=v=>y0-(v-minY)*scale;
  for(let v=Math.ceil(minX);v<=maxX;v++){svg.append(svgElement('line',{x1:x(v),x2:x(v),y1:y(minY),y2:y(maxY),stroke:'#e2e7dd'}));svg.append(svgElement('text',{x:x(v),y:H-14,'text-anchor':'middle'},String(v)));}
  for(let v=Math.ceil(minY);v<=maxY;v++){svg.append(svgElement('line',{x1:x(minX),x2:x(maxX),y1:y(v),y2:y(v),stroke:'#e2e7dd'}));svg.append(svgElement('text',{x:34,y:y(v)+4,'text-anchor':'end'},String(v)));}
  svg.append(svgElement('text',{x:W-22,y:H-14,'text-anchor':'end'},'x / m'));svg.append(svgElement('text',{x:12,y:17},'y / m'));
  if($('show-detections').checked)for(const detection of detections){const group=groups.find(g=>g.member_ids.includes(detection.id));svg.append(svgElement('circle',{cx:x(detection.point_m[0]),cy:y(detection.point_m[1]),r:group?.id===selectedGroup?3.1:2.1,fill:detection.station_id===1?'#247266':'#bc6b31',opacity:.45}));}
  for(const station of current.observations.stations){svg.append(svgElement('rect',{x:x(station.position_m[0])-6,y:y(station.position_m[1])-6,width:12,height:12,rx:2,fill:station.id===1?'#247266':'#bc6b31'}));svg.append(svgElement('text',{x:x(station.position_m[0]),y:y(station.position_m[1])+25,'text-anchor':'middle'},`Mono${station.id}`));}
  if(truth)for(const object of current.truth.objects){const px=x(object.x),py=y(object.y);svg.append(svgElement('path',{d:`M ${px-7} ${py} H ${px+7} M ${px} ${py-7} V ${py+7}`,stroke:object.sensing_visible?'#37464e':'#b13e46','stroke-width':2,fill:'none'}));svg.append(svgElement('text',{x:px+10,y:py-8},`${object.id}${object.sensing_visible?'':' · 感知缺失'}`));}
  for(const group of groups){const g=svgElement('g',{class:'map-hit',role:'button',tabindex:0,'aria-label':`选择 ${group.id}`});const px=x(group.point_m[0]),py=y(group.point_m[1]);g.append(svgElement('circle',{cx:px,cy:py,r:group.id===selectedGroup?12:9,fill:'#fff',stroke:group.id===selectedGroup?'#e55791':'#5943a5','stroke-width':2}));g.append(svgElement('path',{d:`M ${px} ${py-5} L ${px+5} ${py} L ${px} ${py+5} L ${px-5} ${py} Z`,fill:'#5943a5'}));g.append(svgElement('text',{x:px+14,y:py+4},group.id));g.addEventListener('click',()=>selectGroup(group.id));g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectGroup(group.id);}});svg.append(g);}
}
const colorStops=[[20,29,53],[60,86,143],[88,177,169],[237,207,120]];
function powerColor(db){const u=Math.max(0,Math.min(1,(db+85)/50))*3,i=Math.min(2,Math.floor(u)),t=u-i;return `rgb(${colorStops[i].map((v,k)=>Math.round(v+(colorStops[i+1][k]-v)*t)).join(',')})`;}
const plot={W:480,H:320,l:48,r:14,t:12,b:42};
function renderScans(){
  for(const station of current.observations.stations){
    const canvas=$(`scan${station.id}`),ctx=canvas.getContext('2d');
    const dpr=window.devicePixelRatio||1;canvas.width=plot.W*dpr;canvas.height=plot.H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,plot.W,plot.H);
    const width=plot.W-plot.l-plot.r,height=plot.H-plot.t-plot.b,cw=width/station.delays_ns.length,ch=height/station.angles_deg.length;
    station.power_db.forEach((row,r)=>row.forEach((power,b)=>{ctx.fillStyle=powerColor(power);ctx.fillRect(plot.l+b*cw,plot.t+r*ch,cw+.2,ch+.2);}));
    const selected=new Set(current.inference.groups.find(g=>g.id===selectedGroup)?.member_ids||[]);
    for(const peak of current.inference.detections.filter(p=>p.station_id===station.id)){ctx.strokeStyle=selected.has(peak.id)?'#ff85bc':'#ffffff';ctx.lineWidth=selected.has(peak.id)?2.2:1;ctx.strokeRect(plot.l+peak.bin_index*cw-1,plot.t+peak.row_index*ch-1,Math.max(cw+2,4),ch+2);}
    ctx.fillStyle='#617179';ctx.font='12px system-ui';ctx.textAlign='center';
    for(const ns of [0,10,20,30,40]){const b=station.delays_ns.indexOf(ns);if(b>=0)ctx.fillText(String(ns),plot.l+(b+.5)*cw,plot.H-23);}
    ctx.fillText('绝对往返时延 / ns',plot.l+width/2,plot.H-5);ctx.textAlign='right';for(const angle of [-60,-30,0,30,60]){const r=station.angles_deg.indexOf(angle);if(r>=0)ctx.fillText(`${angle}°`,plot.l-7,plot.t+(r+.5)*ch+4);}
    canvas.setAttribute('aria-label',`Mono${station.id}，${station.angles_deg.length} 个角度、${station.delays_ns.length} 个时延 bin，${current.inference.detections.filter(p=>p.station_id===station.id).length} 个保留峰。用物体选择框查看完整数值。`);
  }
}
for(const stationId of [1,2])$(`scan${stationId}`).addEventListener('click',event=>{
  if(!current)return;
  const canvas=event.currentTarget,rect=canvas.getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width*plot.W,py=(event.clientY-rect.top)/rect.height*plot.H;
  const station=current.observations.stations[stationId-1],cw=(plot.W-plot.l-plot.r)/station.delays_ns.length,ch=(plot.H-plot.t-plot.b)/station.angles_deg.length;
  let best=null,bestDistance=18;
  for(const peak of current.inference.detections.filter(p=>p.station_id===stationId)){const d=Math.hypot(px-(plot.l+(peak.bin_index+.5)*cw),py-(plot.t+(peak.row_index+.5)*ch));if(d<bestDistance){best=peak;bestDistance=d;}}
  if(best){const group=current.inference.groups.find(g=>g.member_ids.includes(best.id));if(group)selectGroup(group.id);}
});
function renderGroupDetail(){
  const target=$('group-detail');target.replaceChildren();const group=current.inference.groups.find(g=>g.id===selectedGroup);
  if(!group){target.append(element('p','没有重建物体。可能是门限过高、K=0 或当前观测不支持检测；这不是定位成功。'));return;}
  target.append(element('strong',`${group.id} · 坐标 (${number(group.point_m[0])}, ${number(group.point_m[1])}) m · ${group.member_count} 个峰`));
  const list=element('ul');for(const rep of group.representatives){list.append(element('li',`Mono${rep.station_id} 最强代表：row ${rep.row_index} / bin ${rep.bin_index}，θ=${rep.angle_deg}°，τ=${number(rep.delay_ns,2)} ns，R=${number(rep.range_m,4)} m，P=${number(rep.power_db,2)} dB。`));}target.append(list);
  target.append(element('p','行和 bin 从 0 计数。代表按功率选取，站间等权平均；不是把真值坐标当作输入。','field-note'));
  if($('reveal-truth').checked){const match=current.evaluation.matches.find(m=>m.group_id===group.id);target.append(element('p',match?`仅评价：对应真值 ${match.object_id}，位置误差 ${number(match.localization_error_m,4)} m。`:'仅评价：在 0.6 m 真值匹配门内没有对应物体。','field-note'));}
}
function renderAssociations(){
  const name=$('branch').value,branch=current.inference.branches[name],container=$('association-list');container.replaceChildren();
  const notes={coordinate:'使用感知重建坐标，在两个通信端点间计算绕行路径。输入是估计位置，不是物理真值。',paired_range:'公平基线：与坐标分支共享扫描、角度派生的分组及每站最强峰。它并非完全不使用角度的独立距离算法；缺一站时不预测。',zero_angle:'破坏性消融，不是公平对照：保留同组代表，但把两站角度全部改为 0，再做几何反投影。'};
  const formulas={coordinate:'Δτ = (‖m − p₁‖ + ‖m − p₂‖ − 4 m) / c',paired_range:'Δτ = (R₁ + R₂ − 4 m) / c',zero_angle:'θ₁ = θ₂ = 0 → 平均代表坐标 → Eq.3'};
  $('branch-note').textContent=notes[name];$('formula').textContent=formulas[name];
  for(const association of branch.associations){
    const row=element('div',undefined,'mpc');row.append(element('div',`${association.mpc_id} · ${number(association.observed_ns,4)} ns`,'mpc-head'));
    row.append(element('span',{unique:'唯一候选',ambiguous:'歧义 · 拒绝唯一关联',unmatched:'无候选 · 拒配'}[association.status],`decision ${association.status}`));
    const candidates=association.candidates.map(c=>`${c.group_id} ${number(c.predicted_ns,4)} ns (差 ${number(c.residual_ns,4)} ns)`);
    row.append(element('p',candidates.length?`候选：${candidates.join('；')}`:`当前 ±${current.config.associationGateNs} ns 门内没有候选。`,'mpc-sub'));
    if($('reveal-truth').checked){const detail=current.evaluation.metrics[name].association_details.find(d=>d.mpc_id===association.mpc_id);row.append(element('p',`仅评价：${detail.object_id===null?'杂波，无物理物体':`物体 ${detail.object_id}${detail.identifiable?'':'，本征时延不可辨识'}`}；${{correct_unique:'正确唯一关联',false_unique:'错误或无充分依据的唯一关联',ambiguous:'歧义保留',unmatched:'无匹配'}[detail.outcome]}`,'mpc-sub'));}
    container.append(row);
  }
  const unavailable=branch.predictions.filter(p=>p.excess_ns===null);if(unavailable.length)container.append(element('p',`${unavailable.length} 个组缺少双站代表，当前分支无法预测，未将缺失值替换成 0。`,'field-note'));
}
function renderMetrics(){
  const metrics=current.evaluation.metrics,c=metrics.coordinate,p=metrics.paired_range;
  const matchedIds=new Set(current.evaluation.matches.map(m=>m.group_id));
  const support=name=>current.inference.branches[name].predictions.filter(v=>v.excess_ns!==null&&matchedIds.has(v.group_id)).map(v=>v.group_id).sort();
  const equalSupport=JSON.stringify(support('coordinate'))===JSON.stringify(support('paired_range'));
  let comparison;
  if(!equalSupport)comparison='两条公平分支的可预测物体支持集不同，条件时延 RMSE 不能直接排名。请同时查看缺失数量与预测覆盖，不能据此宣称任一分支更优。';
  else if(c.delay_rmse_ns===null||p.delay_rmse_ns===null)comparison='当前缺少可比较的匹配物体预测，不能宣称任一公平分支更好。';
  else if(Math.abs(c.delay_rmse_ns-p.delay_rmse_ns)<=1e-12)comparison='当前单次输入：两条公平分支的时延 RMSE 相同。';
  else comparison=`当前单次输入：${c.delay_rmse_ns<p.delay_rmse_ns?'坐标重建':'共享组双站距离基线'}的时延 RMSE 较低。`;
  const decisions=name=>JSON.stringify(current.inference.branches[name].associations.map(a=>[a.status,a.assigned_group_id,a.candidates.map(c=>c.group_id)]));
  comparison+=decisions('coordinate')===decisions('paired_range')?' 两者的关联决策一致。':' 两者的关联决策不同，请结合候选残差检查。';
  comparison+=' 这不是跨场景性能结论，也没有强制坐标方法获胜。';$('comparison').textContent=comparison;
  const container=$('metrics');container.replaceChildren();
  for(const name of ['coordinate','paired_range','zero_angle']){const m=metrics[name],card=element('article',undefined,'metric-card');card.append(element('h3',branchNames[name]));const main=element('p',`${number(m.delay_rmse_ns,4)} ns`,'metric-main');main.append(element('small','已匹配且可预测物体的时延 RMSE'));card.append(main);const dl=element('dl');
    const rows=[['匹配 / 漏失 / 多余',`${m.matched_objects} / ${m.missed_truth_objects} / ${m.extra_estimates}`],['正确 / 错误唯一',`${m.correct_unique} / ${m.false_unique}`],['歧义 / 无匹配',`${m.ambiguous_abstentions} / ${m.unmatched_abstentions}`],['物理路径召回率',pct(m.recall)],['唯一关联错误率',pct(m.false_association_rate)],['已匹配预测覆盖',pct(m.prediction_coverage_among_matched_objects)]];
    for(const [term,value]of rows){const row=element('div');row.append(element('dt',term),element('dd',value));dl.append(row);}card.append(dl);container.append(card);}
  $('metric-footnote').textContent=`共享物体位置 RMSE：${number(c.shared_group_localization_rmse_m,4)} m；真值匹配门 0.6 m。召回率分母保留全部 ${c.true_communication_observations} 条物理路径（包括缺失与歧义），不含杂波。预测覆盖仅对已匹配物体计分，不等于找回全部物体。没有唯一关联时，错误率为“未定义”，不是 0。`;
}
$('export').addEventListener('click',()=>{
  if(!current){$('export-status').textContent='当前没有有效结果，未创建导出。';return;}
  try{
    const json=JSON.stringify(current,null,2)+'\n',blob=new Blob([json],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=element('a');downloads.add(url);anchor.href=url;anchor.download=`channel-mapping-portable-v2-${current.config.scene}-seed${current.config.seed}.json`;document.body.append(anchor);anchor.click();anchor.remove();
    $('export-status').textContent=`已生成 ${blob.size.toLocaleString()} 字节 JSON 并发起本地下载。尚未验证文件已保存；请在浏览器下载记录中确认。`;
    setTimeout(()=>{URL.revokeObjectURL(url);downloads.delete(url);},15000);
  }catch(error){$('export-status').textContent=`导出未完成：${error.message}。没有确认文件已保存。`;}
});
invalidate('正在准备默认参数…');if(!(globalThis.ISACGuidedManual === true))startCalculation();
