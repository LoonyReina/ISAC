// Display-only binding to a completed solve ledger. No solver or worker logic.
export function nodeView(result, nodeId, antenna) {
 const node=result.ledger.find(n=>n.id===Number(nodeId));
 if(!node || !Number.isInteger(antenna) || antenna<0 || antenna>=node.lo.length) throw Error('Unknown node or antenna');
 const lo=node.lo[antenna],hi=node.hi[antenna];
 return {nodeId:node.id,parent:node.parent,antenna,lo,hi,width:hi-lo,
  z:[...node.relaxation.z[antenna]],x:[...node.physical.x[antenna]],
  reference:[Math.cos(result.input.referencePhase[antenna]),Math.sin(result.input.referencePhase[antenna])],
  lower:node.lower,upper:node.upper,raw:node.bound.raw,allowance:node.bound.allowance,
  tangentObjective:node.bound.tangentObjective,linearSupport:node.bound.linearSupport,
  amplitude:Math.sqrt(result.input.power/node.lo.length),
  terminalActive:result.activeNodeIds.includes(node.id),
  split:result.ledger.some(n=>n.parent===node.id)};
}
const point=t=>[Math.cos(t),Math.sin(t)];
export function arcGeometry(lo,hi) {
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi<lo||hi-lo>2*Math.PI+1e-12)throw Error('Invalid arc');
 // Two SVG arc segments preserve full-circle and >pi intervals without angle wrapping.
 const [a,b,c]=[lo,(lo+hi)/2,hi].map(point);
 const xy=p=>`${(210+160*p[0]).toFixed(6)},${(210-160*p[1]).toFixed(6)}`;
 const start=`M ${xy(a)}`;
 const arc=hi===lo?start:`${start} A 160 160 0 0 0 ${xy(b)} A 160 160 0 0 0 ${xy(c)}`;
 return {arc,hull:arc+' Z',start:a,end:c};
}
const fmt=n=>Number(n).toPrecision(7),complex=z=>`${fmt(z[0])} ${z[1]<0?'−':'+'} ${fmt(Math.abs(z[1]))}i`;
export function renderNode(svg,details,caption,result,nodeId,antenna) {
 const v=nodeView(result,nodeId,antenna),g=arcGeometry(v.lo,v.hi);
 const dot=(p,color,shape,label)=>{const x=210+160*p[0],y=210-160*p[1];return shape==='square'?`<rect x="${x-5}" y="${y-5}" width="10" height="10" fill="${color}"><title>${label}</title></rect>`:`<circle cx="${x}" cy="${y}" r="${shape==='ring'?8:5}" fill="${shape==='ring'?'white':color}" stroke="${color}" stroke-width="2"><title>${label}</title></circle>`;};
 svg.innerHTML=`<title>节点 ${v.nodeId}，天线 ${antenna+1}：允许圆弧、凸包、松弛点与可行点</title><desc>横轴实部，纵轴虚部，单位圆。文字区提供完整数值。</desc><line x1="20" y1="210" x2="402" y2="210" stroke="#acb9c7"/><line x1="210" y1="20" x2="210" y2="402" stroke="#acb9c7"/><circle cx="210" cy="210" r="160" fill="none" stroke="#b2bfcd" stroke-dasharray="4 4"/><path d="${g.hull}" fill="#dcecf9" stroke="#7396b3" stroke-width="1.5"/><path d="${g.arc}" fill="none" stroke="#166c8a" stroke-width="6"/>${dot(v.reference,'#6c7785','ring','原始参考点 x₀；子节点不一定包含它')}${dot(v.x,'#286b35','ring','该节点完整可行候选的当前坐标 x')}${dot(v.z,'#a83f12','square','该节点松弛迭代点 z')}<text x="375" y="235">Re</text><text x="220" y="28">Im</text><text x="374" y="201">1</text><text x="213" y="47">1</text><text x="37" y="233">−1</text><text x="215" y="390">−1</text>`;
 details.textContent=`节点 ${v.nodeId} · ${v.parent===null?'根节点':'父节点 '+v.parent} · ${v.split?'已细分（历史节点）':v.terminalActive?'结束时仍在候选集合':'结束时不在候选集合'}\n天线 ${antenna+1}：相位 [${fmt(v.lo)}, ${fmt(v.hi)}] rad；宽度 ${fmt(v.width)} rad\nz = ${complex(v.z)}；|z| = ${fmt(Math.hypot(...v.z))}\nx = ${complex(v.x)}；|x| = ${fmt(Math.hypot(...v.x))}\n该坐标差距 |x−z| = ${fmt(Math.hypot(v.x[0]-v.z[0],v.x[1]-v.z[1]))}\n实际发射幅度 √(P/N) = ${fmt(v.amplitude)}\n\n该节点整体目标（所有天线共同计算）：\nf(z) = ${fmt(v.tangentObjective)}\n切平面最小增量 = ${fmt(v.linearSupport)}\n浮点余量 = ${v.allowance.toExponential(4)}\n下界 L = max(0, f(z) + 增量 − 余量) = ${fmt(v.lower)}\n可行候选目标 U = f(x) = ${fmt(v.upper)}\n该节点 U−L = ${fmt(v.upper-v.lower)}`;
 caption.textContent='粗青圆弧才是当前坐标允许的恒模相位；浅蓝区域是其凸包，弦是新增的边界。橙色方点 z 来自实际松弛迭代，可能落在圆内；绿色空心圆 x 来自投影后相位优化的实际可行候选，并非逐坐标简单归一化。灰色空心圆是原始参考点，可能不在这个子节点内。重合时标记会叠在一起。';
 return v;
}
