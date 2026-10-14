import {renderNode} from './phase-diagram.mjs';
import {validate,objective} from './cmc-core.mjs';
const $=id=>document.getElementById(id),canvas=$('bounds'),ctx=canvas.getContext('2d');let worker=null,epoch=0,record=null,history=[];
function clear(){clearNodes();ctx.clearRect(0,0,canvas.width,canvas.height);$('result').textContent='';$('baseline').textContent='';}
function clearNodes(){
 $('phaseDiagram').replaceChildren();$('nodeDetails').textContent='';$('nodeCaption').textContent='尚无可查看的节点。完成一次运行后会显示真实数据。';
 for(const id of ['nodeSelect','antennaSelect']){$(id).replaceChildren(new Option('等待完整计算',''));$(id).disabled=true;}
}
function drawNode(){if(record)renderNode($('phaseDiagram'),$('nodeDetails'),$('nodeCaption'),record.result,Number($('nodeSelect').value),Number($('antennaSelect').value));}
function bindNodes(result){
 $('nodeSelect').replaceChildren(...result.ledger.map(n=>new Option(`节点 ${n.id} · ${n.parent===null?'根':'父 '+n.parent}`,String(n.id))));
 $('antennaSelect').replaceChildren(...result.input.referencePhase.map((_,i)=>new Option(`天线 ${i+1}`,String(i))));
 $('nodeSelect').disabled=false;$('antennaSelect').disabled=false;drawNode();
}
$('nodeSelect').addEventListener('change',drawNode);$('antennaSelect').addEventListener('change',drawNode);
function stop(label){epoch++;worker?.terminate();worker=null;record=null;history=[];$('cancel').disabled=true;$('run').disabled=false;$('download').disabled=true;clear();$('status').textContent=label;}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);if(!history.length)return;const W=canvas.width,H=canvas.height,max=Math.max(1e-12,...history.map(x=>x.upper)),nodes=Math.max(1,history.at(-1).nodes);ctx.fillStyle='#183149';ctx.font='16px system-ui';ctx.fillText('误差目标值 / 分支节点数',40,24);ctx.fillText('0',12,H-25);ctx.fillText(nodes.toString(),W-60,H-5);for(const [key,color] of [['upper','#145991'],['lower','#c36e08']]){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();history.forEach((p,i)=>{const x=45+p.nodes/nodes*(W-80),y=H-35-p[key]/max*(H-75);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}}
for(const id of ['epsilon','power','branch','nodes','tolerance','data'])$(id).addEventListener('input',()=>{stop('参数已改变，旧结果已失效');$('epsilonValue').textContent=Number($('epsilon').value).toFixed(2);});
$('run').onclick=()=>{
 stop('校验输入…');let input;
 try{input=validate({...JSON.parse($('data').value),power:Number($('power').value),epsilon:Number($('epsilon').value),tolerance:Number($('tolerance').value),maxNodes:Number($('nodes').value),branch:$('branch').value,relaxationIterations:500,upperIterations:100});}catch(e){$('status').textContent=String(e);return;}
 const id=String(epoch),current=new Worker(new URL('./cmc-worker.mjs',import.meta.url),{type:'module'});worker=current;$('run').disabled=true;$('cancel').disabled=false;$('status').textContent='真实算法计算中…';
 current.onmessage=({data})=>{if(worker!==current||data.runId!==id)return;
  if(data.type==='checkpoint'){history.push(data.checkpoint);draw();$('status').textContent=`节点 ${data.checkpoint.nodes}；gap ${data.checkpoint.gap.toExponential(3)}`;return;}
  if(data.type==='result'){
   record={schema:'isac-cmc-teaching-prototype-record-v1',result:data.result,elapsedMs:data.elapsedMs};history=data.result.history;draw();bindNodes(data.result);
   const r=data.result;$('status').textContent=r.status==='gap_satisfied'?'浮点 gap 达标（非严格区间证书）':'节点／数值细分限制：仍未解决';
   $('result').textContent=`下界 ${r.lower.toPrecision(8)}\n可行上界 ${r.upper.toPrecision(8)}\ngap ${r.gap.toExponential(4)}\n恒模残差 ${r.modulusResidual.toExponential(3)}\n最大偏离 ${r.similarity.toPrecision(6)} / ε=${input.epsilon}\n功率 ${r.energy.toPrecision(6)}`;
   const amp=Math.sqrt(input.power/input.referencePhase.length),A=input.H.map(row=>row.map(z=>z.map(v=>v*amp))),x0=input.referencePhase.map(t=>[Math.cos(t),Math.sin(t)]);$('baseline').textContent=`同功率参考目标值：${objective(A,input.s,x0).toPrecision(8)}`;$('download').disabled=false;
  }else{record=null;$('download').disabled=true;clear();$('status').textContent=data.type==='timeout'?'达到 5 秒上限，没有完整可用结果':data.type==='cancelled'?'已取消':data.error||'运行异常';}
  current.terminate();worker=null;$('run').disabled=false;$('cancel').disabled=true;
 };
 current.onerror=e=>{if(worker===current)stop('Worker 错误：'+e.message);};current.postMessage({type:'run',runId:id,input});
};
$('cancel').onclick=()=>stop('已取消，当前图和结果已清空');
$('download').onclick=()=>{if(!record)return;const text=JSON.stringify(record,(k,v)=>typeof v==='number'&&Object.is(v,-0)?{$number:'-0'}:v,2),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='cmc-prototype-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
addEventListener('pagehide',()=>stop('页面已离开'));
addEventListener('pageshow',event=>{if(event.persisted)stop('页面已恢复，请重新运行');});
