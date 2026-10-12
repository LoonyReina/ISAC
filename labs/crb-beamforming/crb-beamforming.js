/* DOM/SVG rendering only; all scientific outputs come from the numerical core. */
(()=>{
  'use strict';
  const C=window.CrbBeamformingCore,$=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
  const colors={current:'#16727a',radar:'#647b96',user:'#bb692b'},plots=['crb-frontier','crb-pattern','crb-information-chart','crb-companion-pattern','crb-companion-info'];
  const outputs=['crb-regime','crb-bound','crb-required','crb-actual','crb-g','crb-explanation','crb-transition','crb-resources','crb-information','crb-companion-summary','crb-data','crb-companion-data','crb-rho-value','crb-threshold-value','crb-kappa-value'];
  const number=(v,d=4)=>v===null?'—':v.toFixed(d),db=(v,linear)=>linear===0?'0（线性；−∞ dB）':v===null?'—':v.toFixed(2)+' dB';
  const regime=r=>r.status==='infeasible'?'③ 超出通信能力':r.status==='singular'?'通信可行 · 目标零陷':r.regime==='plateau'?'① 还有余量':'② 开始取舍';
  const bound=r=>r.status==='infeasible'?'无可行设计':r.status==='singular'?'常规 CRB 不可用':number(r.rootCrbDeg,4)+'°';
  function node(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=String(text);return n;}
  function chart(id,xmin,xmax,ymin,ymax,xlabel,ylabel,xticks,yticks){
    const svg=$(id);svg.replaceChildren();const width=Math.max(220,svg.clientWidth||600),left=43,right=width-15,top=36,bottom=231;
    svg.setAttribute('viewBox',`0 0 ${width} 286`);const x=v=>left+(v-xmin)/(xmax-xmin)*(right-left),y=v=>bottom-(v-ymin)/(ymax-ymin)*(bottom-top);
    for(const v of yticks){svg.append(node('line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:'#e0e5e9'}),node('text',{x:left-6,y:y(v)+4,'text-anchor':'end'},number(v,ymax===1?1:0)));}
    for(const v of xticks)svg.append(node('text',{x:x(v),y:251,'text-anchor':'middle'},v));
    svg.append(node('text',{x:left,y:18},ylabel),node('text',{x:(left+right)/2,y:278,'text-anchor':'middle'},xlabel));
    return {svg,x,y,width,left,right,top,bottom};
  }
  function line(c,xs,ys,color,dash,name){
    if(ys.some(v=>v===null||!Number.isFinite(v)))throw Error('曲线包含不可用值');
    c.svg.append(node('polyline',{points:ys.map((v,i)=>`${c.x(xs[i])},${c.y(v)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.6,...(dash?{'stroke-dasharray':dash}:{}),'data-series':name}));
  }
  function rows(id,data){const body=$(id);body.replaceChildren();for(const row of data){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}body.append(tr);}}
  function informationChart(id,metrics){
    const c=chart(id,0,4,0,16000,'同一发射设计','信息量 / rad⁻²',[],[0,8000,16000]);
    if(!metrics||metrics.status!=='regular'){c.svg.append(node('text',{x:(c.left+c.right)/2,y:132,'text-anchor':'middle'},metrics?'零陷：常规 CRB 不可用':'没有可行的当前设计'));return;}
    const labels=['已知 α','混淆损失','有效'],vals=[metrics.known,metrics.loss,metrics.effective],palette=[colors.radar,colors.user,colors.current],bw=Math.min(45,(c.right-c.left)/7);
    vals.forEach((v,i)=>{const x=c.x(i+1);c.svg.append(node('rect',{x:x-bw/2,y:c.y(v),width:bw,height:c.bottom-c.y(v),fill:palette[i],'data-value':v}),node('text',{x,y:251,'text-anchor':'middle'},labels[i]));});
  }
  function render(){
    const rho=Number($('crb-rho').value),threshold=Number($('crb-threshold').value),none=$('crb-none').checked,kappa=Number($('crb-kappa').value);
    const r=C.main(rho,threshold,none),comp=C.companion(kappa),independent=C.companion(0),coherent=C.companion(1),angles=C.angles(),{u}=C.modes();
    $('crb-threshold').disabled=none;$('crb-rho-value').textContent=rho.toFixed(2);$('crb-threshold-value').textContent=none?'无最低要求':threshold.toFixed(1)+' dB';$('crb-kappa-value').textContent=kappa.toFixed(2);
    $('crb-regime').textContent=regime(r);$('crb-bound').textContent=bound(r);$('crb-required').textContent=none?'无最低要求':number(threshold,2)+' dB';$('crb-actual').textContent=db(r.actualDb,r.actualSnr);$('crb-g').textContent=r.g===null?'—':number(r.g,4);
    $('crb-regime').setAttribute('data-regime',r.status==='regular'?r.regime:r.status);
    const explanation=r.status==='infeasible'?'所需 SNR 超过 20 dB。由 |hᴴw|² ≤ ‖h‖²‖w‖² ≤ 1，任何满足总功率预算的单流波束都做不到；当前最优波束与 CRB 已清空。参考波束仍可看。':r.status==='singular'?'通信达到 20 dB，但目标正前方恰为零陷。未知反射系数的 Fisher 矩阵奇异，不能给出有限的常规角度 CRB；从可辨识的内部趋近时，下界发散。':r.regime==='plateau'?'仅雷达波束已经满足用户的最低要求，最优设计暂时不用改变。实际 SNR 可以高于要求；此时收紧门槛还没有感知代价。':'通信要求已经起作用，最优波束需向用户信道多分一点空间权重。实际 SNR 达到门槛，有效角度信息减少，最小可达标准差下界上升。';
    $('crb-explanation').textContent=explanation;
    const transition=rho===0?'ρ=0：无要求时 g=1；一旦要求正 SNR，就开始取舍。':rho===1?'ρ=1：两任务完全重合，所有可行门槛都在平台上。':`平台结束于 ${r.transitionDb.toFixed(4)} dB（线性 SNR=${r.transitionSnr.toFixed(2)}）。`;
    $('crb-transition').textContent=transition+' 通信上限固定为 20 dB。'+(none?'无最低要求对应线性门槛 0，不能放在有限的 dB 横轴上；此时不画当前点。':r.transitionDb!==null&&r.transitionDb<0?'平台转折在当前 0–22 dB 图窗左侧。':'');
    $('crb-resources').textContent=`共享资源：发射 8 / 接收 12 阵元，半波长间距，L=64，P=1，块能量 LP=64；通信噪声 0.01，雷达噪声 100。${r.metrics?'当前实际总功率 '+r.metrics.power.toFixed(8)+'。':'当前无可行设计。'} 改变 ρ 是切换信道场景；不是固定信道内的优化增益。`;
    const f=chart('crb-frontier',0,22,0,1,'最低 SNR / dB','归一化有效信息 g',[0,10,20],[0,.5,1]);
    if(r.transitionDb!==null&&r.transitionDb>0){const end=Math.min(20,r.transitionDb);f.svg.append(node('rect',{x:f.x(0),y:f.top,width:f.x(end)-f.x(0),height:f.bottom-f.top,fill:'#16727a',opacity:.055,'data-region':'plateau'}));}
    f.svg.append(node('rect',{x:f.x(20),y:f.top,width:f.x(22)-f.x(20),height:f.bottom-f.top,fill:'#bb692b',opacity:.13,'data-region':'infeasible'}));
    const frontier=C.frontier(rho).filter(p=>p.g!==null);line(f,frontier.map(p=>p.db),frontier.map(p=>p.g),colors.current,null,'frontier');
    if(r.transitionDb!==null&&r.transitionDb>=0&&r.transitionDb<=20)f.svg.append(node('line',{x1:f.x(r.transitionDb),x2:f.x(r.transitionDb),y1:f.top,y2:f.bottom,stroke:colors.radar,'stroke-dasharray':'4 4','data-marker':'transition'}));
    f.svg.append(node('line',{x1:f.x(20),x2:f.x(20),y1:f.top,y2:f.bottom,stroke:colors.user,'stroke-dasharray':'3 4','data-marker':'ceiling'}));
    if(!none&&r.status!=='infeasible')f.svg.append(node('circle',{cx:f.x(threshold),cy:f.y(r.g),r:5,fill:r.status==='singular'?'white':colors.current,stroke:colors.current,'stroke-width':2,'data-marker':'current'}));
    if(!none&&r.status==='infeasible')f.svg.append(node('line',{x1:f.x(threshold),x2:f.x(threshold),y1:f.top,y2:f.bottom,stroke:colors.user,'stroke-width':2,'data-marker':'infeasible-request'}));
    const radarPattern=C.modalPattern([[1,0]],angles),userPattern=C.modalPattern(r.channelModalFactors,angles),currentPattern=r.modalFactors?C.modalPattern(r.modalFactors,angles):null;
    const p=chart('crb-pattern',-90,90,0,8,'观察角 ψ / 度','原始功率 |a(ψ)ᴴw|²',[-90,0,90],[0,4,8]);
    line(p,angles,radarPattern,colors.radar,'8 5','radar');line(p,angles,userPattern,colors.user,'3 4','user');if(currentPattern)line(p,angles,currentPattern,colors.current,null,'current');
    p.svg.append(node('line',{x1:p.x(0),x2:p.x(0),y1:p.top,y2:p.bottom,stroke:'#b0b8bd','stroke-dasharray':'2 4','data-marker':'target'}));
    const samples=[0,10,18,20,22,threshold,...(r.transitionDb!==null&&r.transitionDb>=0?[r.transitionDb]:[])].sort((a,b)=>a-b).filter((v,i,vs)=>i===0||Math.abs(v-vs[i-1])>1e-8);
    const records=[{label:'无最低要求',data:C.solve(rho,0)},...samples.map(d=>({label:d.toFixed(4)+' dB',data:C.main(rho,d)}))];
    rows('crb-frontier-table',records.map(({label,data:x})=>[label,regime(x),number(x.g),bound(x),db(x.actualDb,x.actualSnr)]));
    rows('crb-pattern-table',[-90,-60,-30,-15,0,15,30,60,90].map(d=>{const i=Math.round((d+90)*4);return [d+'°',number(radarPattern[i]),number(userPattern[i]),currentPattern?number(currentPattern[i]):'无可行设计'];}));
    $('crb-information').textContent=r.status==='infeasible'?'没有可行的当前波束，故不显示当前角度信息。':r.status==='singular'?'目标零陷时不能消去未知 α 的奇异块。即使假设 α 已知的信息量有限，也不能把它冒充这里的未知 α CRB。':`同一波束：假设 α 已知 ${number(r.metrics.known,2)}；与未知 α 混淆 ${number(r.metrics.loss,2)}；有效 ${number(r.metrics.effective,2)} rad⁻²。CRB/CRB₀=${number(r.ratio,4)}；平方根下界才是上方以度显示的数。`;
    informationChart('crb-information-chart',r.metrics);
    const cp=chart('crb-companion-pattern',-90,90,0,8,'观察角 ψ / 度','两流总原始功率',[-90,0,90],[0,4,8]);
    // The coincident current curve can obscure references: the table quantifies this equality.
    line(cp,angles,C.modalPattern(independent.modalFactors,angles),colors.radar,'8 5','independent');line(cp,angles,C.modalPattern(coherent.modalFactors,angles),colors.user,'3 4','coherent');line(cp,angles,C.modalPattern(comp.modalFactors,angles),colors.current,null,'current');
    const ci=chart('crb-companion-info',0,1,0,16000,'模态相干度 κ','有效角度信息 / rad⁻²',[0,.5,1],[0,8000,16000]);
    const sweep=Array.from({length:51},(_,i)=>C.companion(i/50));line(ci,sweep.map(x=>x.kappa),sweep.map(x=>x.metrics.effective),colors.current,null,'companion-information');ci.svg.append(node('circle',{cx:ci.x(kappa),cy:ci.y(comp.metrics.effective),r:5,fill:colors.current,'data-marker':'current'}));
    rows('crb-companion-table',[independent,comp,coherent].map((x,i)=>[i===1?`当前 ${x.kappa.toFixed(2)}`:x.kappa.toFixed(2),number(x.dataPower),number(x.probingPower),x.sinrDb.toFixed(4)+' dB',number(x.metrics.effective,2),number(x.rootCrbDeg,6)+'°']));
    $('crb-companion-summary').textContent=`另一个信道 h=u、另一个两流设计家族：κ=${kappa.toFixed(2)} 时，总功率 ${comp.power.toFixed(8)}=数据 ${comp.dataPower.toFixed(4)}+探测 ${comp.probingPower.toFixed(4)}；用户 SINR ${comp.sinrDb.toFixed(4)} dB，辅助干扰 ${comp.interference<1e-24?'0（数值舍入内）':number(comp.interference)}。标准差下界 ${comp.rootCrbDeg.toFixed(6)}°。两端方向图与 SINR 相同，但 κ=0 相对 κ=1 的方差下界低 ${(100*(1-independent.metrics.crbRad2/coherent.metrics.crbRad2)).toFixed(2)}%，标准差下界低 ${(100*(1-independent.rootCrbDeg/coherent.rootCrbDeg)).toFixed(2)}%。`;
    $('crb-data').textContent=JSON.stringify({configuration:C.cfg,main:r},null,2);$('crb-companion-data').textContent=JSON.stringify({configuration:C.cfg,companion:comp},null,2);
    $('crb-frontier').setAttribute('aria-label',`门槛与有效信息的最优关系。${transition} 当前 ${regime(r)}，g=${number(r.g)}。`);
    $('crb-pattern').setAttribute('aria-label',`共同 0 至 8 功率尺度；目标在 0 度。${r.w?'显示当前最优波束与两条参考。':'仅显示两条参考，无可行当前波束。'}`);
    $('crb-status').textContent=`ρ=${rho.toFixed(2)}；${regime(r)}。要求 ${none?'无最低要求':threshold.toFixed(1)+' dB'}，实际 ${db(r.actualDb,r.actualSnr)}；角度标准差下界 ${bound(r)}。`;
  }
  function fail(){for(const id of [...plots,'crb-frontier-table','crb-pattern-table','crb-companion-table'])$(id).replaceChildren();for(const id of outputs)$(id).textContent='';$('crb-regime').setAttribute('data-regime','error');for(const id of plots)$(id).setAttribute('aria-label','计算未完成，旧图已清空');$('crb-status').textContent='数值计算未能完成，旧图和结果已清空。请按重置；静态说明、条件与原文链接仍可阅读。';}
  function safeRender(){try{render();}catch{fail();}}
  for(const id of ['crb-rho','crb-threshold','crb-kappa'])$(id).addEventListener('input',safeRender);$('crb-none').addEventListener('change',safeRender);
  for(const [id,v]of [['crb-rho-zero','0'],['crb-rho-half','0.5'],['crb-rho-one','1']])$(id).addEventListener('click',()=>{$('crb-rho').value=v;safeRender();});
  $('crb-reset').addEventListener('click',()=>{$('crb-rho').value='0.5';$('crb-threshold').value='18';$('crb-none').checked=false;$('crb-kappa').value='1';safeRender();});
  window.addEventListener('resize',safeRender);
  // A chart first drawn in a closed details element has no layout width.
  // Re-render on native disclosure opening to use its actual narrow-screen width.
  for(const disclosure of document.querySelectorAll('details'))disclosure.addEventListener('toggle',()=>{if(disclosure.open)safeRender();});
  safeRender();
})();
