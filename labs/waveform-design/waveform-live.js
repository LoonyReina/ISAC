(()=>{'use strict';
 const $=id=>document.getElementById(id),M=window.WaveformLiveModel;
 if(!M){$('wfl-status').textContent='求解资源未能载入。当前没有计算结果；推导和离线历史仍可阅读。';return;}
 const controls=['wfl-n','wfl-k','wfl-l','wfl-seed','wfl-pt','wfl-beta','wfl-angle'];
 const defaults={N:4,K:2,L:8,seed:171105220,Pt:1,beta:.8,angle:0};
 const fieldNames={N:'wfl-n',K:'wfl-k',L:'wfl-l',seed:'wfl-seed',Pt:'wfl-pt',beta:'wfl-beta',angle:'wfl-angle'};
 const colors={reference:'#b96120',optimal:'#16727a',target:'#26334d'},ns='http://www.w3.org/2000/svg';
 const now=()=>window.performance?window.performance.now():Date.now();
 let epoch=0,worker=null,last=null,lastEpoch=null,mode='generated',completed=0;
 function format(v){return v===0?'0':Math.abs(v)<1e-4||Math.abs(v)>=1e5?v.toExponential(4):v.toPrecision(6);}
 function stopWorker(){if(worker){worker.terminate();worker=null;}$('wfl-cancel').disabled=true;}
 function clearResult(){last=null;lastEpoch=null;$('wfl-result').hidden=true;$('wfl-download').disabled=true;
  for(const id of ['wfl-symbols','wfl-pattern','wfl-time-i','wfl-time-q','wfl-metrics','wfl-rates','wfl-matrix'])$(id).replaceChildren();
  for(const id of ['wfl-budget','wfl-rank','wfl-certificate','wfl-rate-status','wfl-rate-total','wfl-diagnostics'])$(id).textContent='';
 }
 function invalidate(message){epoch++;stopWorker();clearResult();$('wfl-error').hidden=true;$('wfl-error').textContent='';$('wfl-status').textContent=message;}
 function error(message,focus=true){stopWorker();clearResult();$('wfl-error').textContent=message;$('wfl-error').hidden=false;$('wfl-status').textContent='本次没有可用结果；请修正输入后重新求解。';if(focus&&$('wfl-error').focus)$('wfl-error').focus();}
 function settings(){const out={};for(const [key,id]of Object.entries(fieldNames))out[key]=Number($(id).value);return out;}
 function setSettings(value){for(const [key,id]of Object.entries(fieldNames))$(id).value=String(value[key]);}
 function fillGenerated(message){mode='generated';invalidate(message);try{const input=M.generated(settings());$('wfl-input').value=JSON.stringify({H:input.H,S:input.S,R:input.R},null,2);}catch(e){$('wfl-input').value='';error(M.friendlyError(e),false);}}
 function readInputs(){if(mode==='generated')return M.generated(settings());
  const text=$('wfl-input').value;if(new TextEncoder().encode(text).length>1048576)throw new Error('粘贴的 JSON 超过1 MiB，请仅保留本次 H、S、R。');
  let value;try{value=JSON.parse(text);}catch{throw new Error('无法读取矩阵。请使用包含 H、S、R 的 JSON；每个复数写成 [实部, 虚部]。');}
  const input={H:value&&value.H,S:value&&value.S,R:value&&value.R,origin:{kind:'manual',modelVersion:M.VERSION,generator:null}};M.inputBounds(input);return input;
 }
 function element(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);if(text!==undefined)n.textContent=String(text);return n;}
 function tick(value){return value===0?'0':Math.abs(value)>=10000||Math.abs(value)<.001?value.toExponential(1):value.toFixed(1);}
 function chart(id,xmin,xmax,ymin,ymax,xlabel,ylabel){const svg=$(id);svg.replaceChildren();const width=Math.max(240,svg.clientWidth||600),left=66,right=width-18;
  if(![xmin,xmax,ymin,ymax].every(Number.isFinite)||!(xmax>xmin)||!(ymax>ymin))throw new Error('图形坐标超出可表示范围，未显示旧图。');
  svg.setAttribute('viewBox',`0 0 ${width} 300`);const x=v=>left+(v-xmin)/(xmax-xmin)*(right-left),y=v=>240-(v-ymin)/(ymax-ymin)*205,ticks=width<450?2:4;
  for(let i=0;i<=ticks;i++){const xv=xmin+(xmax-xmin)*i/ticks,yv=ymin+(ymax-ymin)*i/ticks;
   svg.append(element('line',{x1:x(xv),x2:x(xv),y1:35,y2:240,stroke:'#e0e4eb'}),element('line',{x1:left,x2:right,y1:y(yv),y2:y(yv),stroke:'#e0e4eb'}),element('text',{x:x(xv),y:258,'text-anchor':'middle'},tick(xv)),element('text',{x:left-7,y:y(yv)+4,'text-anchor':'end'},tick(yv)));
  }
  svg.append(element('text',{x:width/2,y:284,'text-anchor':'middle'},xlabel),element('text',{x:left,y:19},ylabel));return {svg,x,y};
 }
 function line(plot,values,color,dashed=false){plot.svg.append(element('polyline',{points:values.map(p=>`${plot.x(p[0])},${plot.y(p[1])}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5,...(dashed?{'stroke-dasharray':'7 5'}:{})}));}
 function row(target,values){const tr=document.createElement('tr');for(const value of values){const cell=document.createElement('td');cell.textContent=String(value);tr.append(cell);}$(target).append(tr);}
 function options(id,count){const target=$(id),prior=Number(target.value)||0;target.replaceChildren();for(let i=0;i<count;i++){const option=document.createElement('option');option.value=String(i);option.textContent=String(i+1);target.append(option);}target.value=String(Math.min(prior,count-1));}
 function renderLedger(){const r=last,{N,K,L}=r.dimensions,opt=r.optimal.metrics,ref=r.reference,trace=r.inputs.R.reduce((v,row,i)=>v+row[i][0],0);
  const origin=r.origin.kind==='generated'?`种子 ${r.origin.settings.seed}；复高斯 H / QPSK S`:'自定义矩阵；未重新归一化 H、S、R';
  $('wfl-budget').textContent=`${origin}。N=${N}，K=${K}，L=${L}；Pₜ=tr(R)=${format(trace)}，要求块能量 LPₜ=${format(opt.requiredEnergy)}。以下误差累计全部 ${K*L} 个复数样本。`;
  const rank=r.rank;$('wfl-rank').textContent=`数值秩 ${rank.numerical}/${N}（显示阈值 τ=${format(rank.tolerance)}）。${rank.guaranteedNullDirections>0?`由 K=${K}<N=${N} 可严格推出 rank(C)≤${K}，至少 ${rank.guaranteedNullDirections} 个零方向需要补齐。`:'这里不能仅由 K、N 保证秩亏；数值小不等于严格为零。'} 数值秩本身不能证明非唯一；仍要检查实际返回的协方差与能量。`;
  $('wfl-metrics').replaceChildren();
  for(const [label,a,b]of [['总符号误差 E',ref.error,opt.objective],['每个复数样本平均误差 E/(KL)',ref.mse,opt.mse],['实际块能量',ref.energy,opt.energy],['与要求能量之差',ref.energy-opt.requiredEnergy,opt.energyResidual],['协方差相对残差',ref.covarianceResidualRelative,opt.covarianceResidualRelative],['协方差绝对残差',ref.covarianceResidual,opt.covarianceResidual],['目标减全局下界 E−E*',ref.boundResidual,opt.signedObjectiveGap]])row('wfl-metrics',[label,format(a),format(b)]);
  $('wfl-certificate').textContent=`本次浮点数值检查通过：E*=${format(r.optimal.globalObjectiveBound)}；目标差容差 ${format(r.optimal.diagnostics.objectiveCertificateTolerance)}；协方差相对容差 2×10⁻¹⁰；Q行正交残差 ${format(r.optimal.diagnostics.whitenedRowIsometryResidual)}。保留带符号的舍入差；全局性来自解析证明，不来自测试次数。`;
  const details={数值秩:r.rank.numerical,数值秩阈值:r.rank.tolerance,全部奇异值:r.optimal.singularValues,数值检查:r.optimal.diagnostics,最优核心耗时ms:r.optimal.elapsedComputeMs,含参考和图数据计算ms:r.totalComputeMs,Worker响应耗时ms:r.endToEndMs,计时范围:r.endToEndScope,输入SHA256:r.inputSha256,输入散列状态:r.inputHashStatus,核心SHA256:r.coreSha256};
  $('wfl-diagnostics').textContent=JSON.stringify(details,null,2);
 }
 function renderPlots(){if(!last)return;const r=last,{N,K,L}=r.dimensions,user=Math.min(K-1,Number($('wfl-user').value)||0),antenna=Math.min(N-1,Number($('wfl-antenna').value)||0),S=r.inputs.S,ref=r.reference,opt=r.evaluated;
  let limit=1;for(const values of [S[user],ref.Y[user],opt.Y[user]])for(const z of values)limit=Math.max(limit,Math.abs(z[0])*1.1,Math.abs(z[1])*1.1);
  const c=chart('wfl-symbols',-limit,limit,-limit,limit,'I / 幅度','Q / 幅度');
  for(let m=0;m<L;m++){const target=S[user][m];for(const [value,color,shape]of [[ref.Y[user][m],colors.reference,'circle'],[opt.Y[user][m],colors.optimal,'rect']]){
   c.svg.append(element('line',{x1:c.x(target[0]),y1:c.y(target[1]),x2:c.x(value[0]),y2:c.y(value[1]),stroke:color,'stroke-opacity':.4}));
   c.svg.append(shape==='circle'?element('circle',{cx:c.x(value[0]),cy:c.y(value[1]),r:4,fill:'none',stroke:color,'stroke-width':2}):element('rect',{x:c.x(value[0])-3,y:c.y(value[1])-3,width:6,height:6,fill:color}));}
   c.svg.append(element('path',{d:`M ${c.x(target[0])-5} ${c.y(target[1])} h 10 M ${c.x(target[0])} ${c.y(target[1])-5} v 10`,stroke:colors.target,'stroke-width':2}));
  }
  const Pt=r.inputs.R.reduce((v,row,i)=>v+row[i][0],0),p=chart('wfl-pattern',-90,90,0,Math.max(1e-12,N*Pt),'θ / 度','原始空间功率');
  line(p,ref.angles.map((v,i)=>[v,ref.pattern[i]]),colors.reference);line(p,opt.angles.map((v,i)=>[v,opt.pattern[i]]),colors.optimal,true);
  let amplitude=1e-6;for(const values of [ref.X[antenna],r.optimal.X[antenna]])for(const z of values)amplitude=Math.max(amplitude,Math.abs(z[0])*1.1,Math.abs(z[1])*1.1);
  for(const [component,id,label]of [[0,'wfl-time-i','I / 幅度'],[1,'wfl-time-q','Q / 幅度']]){const plot=chart(id,0,Math.max(1,L-1),-amplitude,amplitude,'快拍 ℓ',label);line(plot,ref.X[antenna].map((z,i)=>[i,z[component]]),colors.reference);line(plot,r.optimal.X[antenna].map((z,i)=>[i,z[component]]),colors.optimal,true);}
 }
 function renderRate(changed=false){if(!last)return;const snr=Number($('wfl-snr').value),ref=M.rateMetric(last.inputs,last.reference.X,snr),opt=M.rateMetric(last.inputs,last.optimal.X,snr);$('wfl-rates').replaceChildren();
  for(let i=0;i<ref.users.length;i++)row('wfl-rates',[`${i+1} / ${format(ref.users[i].signalPower)}`,`${format(ref.users[i].mui)} / ${format(ref.users[i].logRate)}`,`${format(opt.users[i].mui)} / ${format(opt.users[i].logRate)}`]);
  $('wfl-rate-status').textContent=`SNR=${snr} dB，N₀=${format(opt.noisePower)}。${changed?'仅重算诊断；X未改变，也没有再次调用优化器。':'这只是当前波形的诊断，不参与严格协方差求解。'}`;
  $('wfl-rate-total').textContent=`高斯对数诊断之和：参考 ${format(ref.sumLogRate)}；本次严格解 ${format(opt.sumLogRate)}。优化目标仍是总 MUI，不能把更小 MUI 当作任意情况下更大和速率的证明。`;
  last.rateView={snrDb:snr,reference:ref,optimal:opt};
 }
 function renderMatrix(){if(!last)return;const kind=$('wfl-matrix-kind').value,method=$('wfl-matrix-method').value,selected=method==='reference'?last.reference:last.evaluated;
  const data=kind==='X'?(method==='reference'?last.reference.X:last.optimal.X):kind==='Y'?selected.Y:kind==='cov'?selected.cov:last.inputs[kind];if(!data)return;
  const container=$('wfl-matrix');container.replaceChildren();const table=document.createElement('table');table.className='wf-table';const caption=document.createElement('caption');caption.textContent=`${kind}：${data.length}×${data[0].length} 个复数；索引从0开始`;table.append(caption);
  const head=document.createElement('tr');for(const text of ['行 / 列',...data[0].map((_,j)=>j)]){const th=document.createElement('th');th.textContent=String(text);head.append(th);}table.append(head);
  data.forEach((values,i)=>{const tr=document.createElement('tr'),th=document.createElement('th');th.textContent=String(i);tr.append(th);for(const z of values){const td=document.createElement('td');td.textContent=`${z[0].toPrecision(4)}${z[1]<0?'−':'+'}${Math.abs(z[1]).toPrecision(4)}j`;tr.append(td);}table.append(tr);});container.append(table);
 }
 function render(){if(!last)return;$('wfl-result').hidden=false;options('wfl-user',last.dimensions.K);options('wfl-antenna',last.dimensions.N);renderLedger();renderPlots();renderRate();renderMatrix();}
 function run(){let input;invalidate('正在准备当前输入…');try{input=readInputs();M.inputBounds(input);}catch(e){error(M.friendlyError(e));return;}
  const id=++epoch,snapshot=M.canonicalInputs(input),started=now();$('wfl-status').textContent='正在求解当前 H、S、R，并核对协方差与全局下界…';
  try{worker=new Worker('waveform-live-worker.js');}catch{error('求解资源未能载入。当前没有计算结果；推导和离线历史仍可阅读。');return;}
  const active=worker;$('wfl-cancel').disabled=false;
  active.onmessage=event=>{const message=event.data||{};if(id!==epoch||worker!==active||message.id!==id)return;
   if(message.type==='error'){error(message.error||'本次求解失败，未显示旧结果。');return;}
   if(message.type!=='result')return;
   try{const result=message.result;if(!result||result.status!=='certified'||result.optimal.status!=='certified'||M.canonicalInputs(result.inputs)!==snapshot)throw new Error('返回结果与当前输入不一致，已清空结果。');
    result.endToEndMs=now()-started;result.endToEndScope="已准备输入至 Worker 结果接收并核对，含 Worker 启动；不含输入生成/解析、绘图、下载";stopWorker();last=result;lastEpoch=epoch;completed++;render();$('wfl-download').disabled=false;$('wfl-error').hidden=true;
    $('wfl-status').textContent=`第${completed}次问题求解完成，浮点检查通过。参考 E=${format(last.reference.error)}；本次解 E=${format(last.optimal.metrics.objective)}；协方差相对残差=${format(last.optimal.metrics.covarianceResidualRelative)}。`;
   }catch(e){error(M.friendlyError(e));}
  };
  active.onerror=()=>{if(id===epoch&&worker===active)error('求解资源未能载入或 Worker 执行失败。没有新的结果；推导和离线历史仍可阅读。');};
  active.onmessageerror=active.onerror;
  active.postMessage({type:'solve',id,mode:'manual',inputs:input});
 }
 controls.forEach(id=>$(id).addEventListener('input',()=>fillGenerated('生成参数已改变，上次结果已清除。请重新求解。')));
 $('wfl-input').addEventListener('input',()=>{mode='manual';invalidate('矩阵输入已改变，上次结果已清除。请应用矩阵并重新求解。');});
 $('wfl-run').addEventListener('click',run);$('wfl-apply').addEventListener('click',()=>{mode='manual';run();});
 $('wfl-cancel').addEventListener('click',()=>invalidate('本次求解已取消，没有新的结果。'));
 function reset(){setSettings(defaults);$('wfl-snr').value='10';fillGenerated('入门输入已准备好，尚未求解。点击“求解当前输入”现场计算 X。');}
 $('wfl-reset').addEventListener('click',reset);$('wfl-small').addEventListener('click',reset);
 $('wfl-paper').addEventListener('click',()=>{setSettings({...defaults,N:16,K:4,L:20,beta:0});fillGenerated('已填入原文全向参数 N=16、K=4、L=20。尚未求解；一个随机块不是原图复现。');});
 $('wfl-new-seed').addEventListener('click',()=>{const wasManual=mode==='manual';$('wfl-seed').value=String(((Number($('wfl-seed').value)||0)+1)>>>0);fillGenerated(wasManual?'已按生成控件替换自定义输入并换种子，请核对 H、S、R 后求解。':'已生成新的 H、S；当前协方差参数保持不变。请重新求解。');});
 $('wfl-zero').addEventListener('click',()=>{try{const input=readInputs();input.H=input.H.map(row=>row.map(()=>[0,0]));mode='manual';invalidate('已令 H=0，保留 S 和 R。预测：HX=0，但发射能量仍应为 LPₜ。请重新求解。');$('wfl-input').value=JSON.stringify({H:input.H,S:input.S,R:input.R},null,2);}catch(e){error(M.friendlyError(e));}});
 for(const id of ['wfl-user','wfl-antenna'])$(id).addEventListener('change',()=>{try{renderPlots();}catch(e){error(M.friendlyError(e));}});
 for(const id of ['wfl-matrix-kind','wfl-matrix-method'])$(id).addEventListener('change',renderMatrix);
 $('wfl-snr').addEventListener('input',()=>{try{renderRate(true);}catch(e){error(M.friendlyError(e));}});
 $('wfl-download').addEventListener('click',()=>{if(!last||worker||lastEpoch!==epoch)return;try{if(M.canonicalInputs(readInputs())!==M.canonicalInputs(last.inputs)){invalidate('输入与上次结果不一致，已取消导出。请重新求解。');return;}
   const output={...last.inputs,record:{...last,exportedAt:new Date().toISOString(),successfulRequestId:lastEpoch}};
   const blob=new Blob([JSON.stringify(output,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='waveform-live-record.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){error(M.friendlyError(e));}});
 window.addEventListener('resize',()=>{try{renderPlots();}catch(e){error(M.friendlyError(e));}});
 window.addEventListener('pagehide',()=>{if(worker)invalidate('页面已离开，本次未完成求解已取消。返回后请重新运行。');});
 reset();
})();
