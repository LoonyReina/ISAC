/* Compact presentation adapter; no solver, observation, likelihood or CRB formulas here. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CrbReceiverUI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg',ink='#284942',teal='#087d78',orange='#bd7330',slate='#708593';
  const fmt=x=>typeof x==='number'&&Number.isFinite(x)?(Math.abs(x)>=100?x.toFixed(1):Math.abs(x)>=1?x.toFixed(2):x.toPrecision(3)):'—';
  function create(options={}){
    const win=options.window||window,doc=options.document||document,$=id=>doc.getElementById(id),core=options.core||win.CrbReceiverCore,lifecycle=options.lifecycle||win.CrbReceiverController;
    if(!$('crb-receiver'))return null;
    if(!core||!lifecycle){$('cr-state').textContent='接收机资源未能加载。上方优化器与原课程仍可独立使用。';return null;}
    let last=null,lastAnnounced=-Infinity,paintSerial=0,resizeTimer=null,disposed=false;
    const disposers=[],urls=new Set(),setText=(id,value)=>{$(id).textContent=String(value);};
    function on(target,event,fn){target.addEventListener(event,fn);disposers.push(()=>target.removeEventListener?.(event,fn));}
    function svgNode(tag,attrs={},text){const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;}
    function chart(id,yLabel){const svg=$(id),width=Math.max(280,svg.clientWidth||490),height=270,left=width<360?48:57,right=width-17,top=27,bottom=218;svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.append(svgNode('text',{x:left,y:13,'font-size':10,fill:slate},yLabel));return{svg,width,height,left,right,top,bottom};}
    function desc(c,title,description){c.svg.setAttribute('aria-label',title+'。'+description);c.svg.append(svgNode('title',{},title),svgNode('desc',{},description));}
    function empty(id,note){const c=chart(id,'');desc(c,note,'没有计算或展示预存结果');c.svg.append(svgNode('text',{x:c.width/2,y:126,'text-anchor':'middle','font-size':12,fill:slate},note));}
    function axis(c,xTicks,yTicks,x,y,xLabel){for(const v of yTicks)c.svg.append(svgNode('line',{x1:c.left,y1:y(v),x2:c.right,y2:y(v),stroke:'#dde5df'}),svgNode('text',{x:c.left-8,y:y(v)+4,'text-anchor':'end','font-size':10,fill:slate},fmt(v)));c.svg.append(svgNode('line',{x1:c.left,y1:c.bottom,x2:c.right,y2:c.bottom,stroke:'#99b4a8'}));for(const v of xTicks)c.svg.append(svgNode('line',{x1:x(v),y1:c.bottom,x2:x(v),y2:c.bottom+4,stroke:'#99b4a8'}),svgNode('text',{x:x(v),y:c.bottom+20,'text-anchor':x(v)===c.left?'start':x(v)===c.right?'end':'middle','font-size':10,fill:slate},String(v)));c.svg.append(svgNode('text',{x:(c.left+c.right)/2,y:257,'text-anchor':'middle','font-size':11,fill:slate},xLabel));}
    function profile(r){
      const p=r?.profile;if(!p){empty('cr-profile-chart','完成选定 SNR 的试验 0 后显示');setText('cr-profile-caption','固定展示试验 0，不挑选最好看的回波。');return;}
      const c=chart('cr-profile-chart','归一化剖面似然分数'),x=v=>c.left+(v+90)/180*(c.right-c.left),y=v=>c.bottom-v*(c.bottom-c.top);
      desc(c,`试验 0，雷达 SNR ${p.snrDb} dB`, `估计 ${fmt(p.estimateDegrees)} 度；评估真值 ${fmt(p.truthDegrees)} 度。曲线仅为显示抽取 ${p.points.length} 点，估计搜索全部 18001 点。`);
      axis(c,[-90,-45,0,45,90],[0,.5,1],x,y,'候选角度 / °');
      const segments=[];let segment=[];for(const v of p.points){if(v.normalizedScore===null){if(segment.length)segments.push(segment);segment=[];}else segment.push(v);}if(segment.length)segments.push(segment);
      for(const points of segments)c.svg.append(svgNode('polyline',{points:points.map(v=>`${x(v.angleDegrees).toFixed(2)},${y(v.normalizedScore).toFixed(2)}`).join(' '),fill:'none',stroke:teal,'stroke-width':1.8,'data-profile-vertices':points.length,'vector-effect':'non-scaling-stroke'}));
      for(const [value,color,dash,label] of [[p.truthDegrees,slate,'2 5','评估真值（只用于生成与评分）'],[p.estimateDegrees,orange,'7 4','全视场 ML 估计']]){const line=svgNode('line',{x1:x(value),y1:c.top,x2:x(value),y2:c.bottom,stroke:color,'stroke-width':1.6,'stroke-dasharray':dash});line.append(svgNode('title',{},`${label}：${fmt(value)}°`));c.svg.append(line);}
      setText('cr-profile-caption',`固定试验 0 · ${p.snrDb} dB · 估计 ${fmt(p.estimateDegrees)}° · 真值 ${fmt(p.truthDegrees)}°（仅评估器可见）。显示 ${p.points.length} 点；实际搜索 18,001 点。`);
    }
    function comparison(r){
      const conditions=r?.conditions||[],valid=conditions.filter(c=>c.status==='completed'&&c.denominators.valid===128),bounds=conditions.filter(c=>Number.isFinite(c.rootCrbDegrees)&&c.rootCrbDegrees>0);
      if(!valid.length&&!bounds.length){empty('cr-rmse-chart','运行后显示真实误差与对应下界');setText('cr-comparison-caption','先运行一个 SNR，或主动比较 4 个 SNR。');return;}
      const positive=[...bounds.map(c=>c.rootCrbDegrees),...valid.flatMap(c=>[c.rmseDegrees,...c.ci95Degrees])].filter(v=>v>0),lo=10**Math.floor(Math.log10(Math.min(...positive)*.8)),hi=10**Math.ceil(Math.log10(Math.max(...positive)*1.15));
      const c=chart('cr-rmse-chart','角度误差 / °（对数刻度）'),x=v=>c.left+(v+20)/30*(c.right-c.left),y=v=>c.bottom-(Math.log10(Math.max(lo,v))-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(c.bottom-c.top),ticks=[];
      for(let n=Math.log10(lo);n<=Math.log10(hi);n++)ticks.push(10**n);
      desc(c,'雷达 SNR 与角度误差',`${valid.length} 个条件有完整 128 次有效估计。绿色圆点是实测 RMSE，竖线是 95% bootstrap 区间，橙色菱形和虚线是相同接收 SNR 的理论根 CRB。缺失或未完成条件不补点。`);
      axis(c,[-20,-10,0,10],ticks,x,y,'雷达 SNR / dB');
      const sorted=[...bounds].sort((a,b)=>a.snrDb-b.snrDb);if(sorted.length>1)c.svg.append(svgNode('polyline',{points:sorted.map(b=>`${x(b.snrDb)},${y(b.rootCrbDegrees)}`).join(' '),fill:'none',stroke:orange,'stroke-width':1.5,'stroke-dasharray':'5 5','data-series':'theory'}));
      for(const b of sorted){const px=x(b.snrDb),py=y(b.rootCrbDegrees),mark=svgNode('path',{d:`M ${px} ${py-4} l 4 4 l -4 4 l -4 -4 Z`,fill:orange,'data-bound-snr':b.snrDb});mark.append(svgNode('title',{},`SNR ${b.snrDb} dB，√CRB ${fmt(b.rootCrbDegrees)}°`));c.svg.append(mark);}
      for(const v of valid){const px=x(v.snrDb),[lower,upper]=v.ci95Degrees;c.svg.append(svgNode('line',{x1:px,y1:y(lower),x2:px,y2:y(upper),stroke:teal,'stroke-width':1.5,'data-ci-snr':v.snrDb}),svgNode('line',{x1:px-4,y1:y(lower),x2:px+4,y2:y(lower),stroke:teal}),svgNode('line',{x1:px-4,y1:y(upper),x2:px+4,y2:y(upper),stroke:teal}));const point=svgNode('circle',{cx:px,cy:y(v.rmseDegrees),r:4.5,fill:teal,'data-measured-snr':v.snrDb});point.append(svgNode('title',{},`SNR ${v.snrDb} dB，RMSE ${fmt(v.rmseDegrees)}°，95% 区间 ${fmt(lower)}–${fmt(upper)}°，128/128 有效`));c.svg.append(point);}
      setText('cr-comparison-caption',`${valid.length}/${r.mode==='fourSNRsweep'?4:1} 个条件有完整误差统计。实测点不插值、不跨失败连线；缺失条件不补造。${valid.some(v=>v.rmseDegrees===0||v.ci95Degrees[0]===0)?'零值标在图底，数值仍为 0°。':''}`);
    }
    function summary(r){
      const cs=r?.conditions||[],selected=cs.find(c=>c.snrDb===r.selectedSnrDb)||cs.find(c=>c.status==='completed')||cs[0],d=selected?.denominators;
      setText('cr-summary-label',selected?`摘要：雷达 SNR ${selected.snrDb} dB`:'等待本次接收试验');
      setText('cr-rmse',selected?.rmseDegrees===null||!selected?'—':fmt(selected.rmseDegrees)+'°');
      setText('cr-ci',selected?.ci95Degrees?`${fmt(selected.ci95Degrees[0])}–${fmt(selected.ci95Degrees[1])}°`:'完整 128 次有效估计后显示');
      setText('cr-bound',selected?.rootCrbDegrees?fmt(selected.rootCrbDegrees)+'°':'—');
      setText('cr-large',selected?`${selected.largeErrorCount} / ${d.planned}`:'—');
      setText('cr-counts',d?`计划 ${d.planned} · 已启动 ${d.started} · 已完成 ${d.completed} · 有效 ${d.valid} · 数值失败 ${d.numericalFailures} · 未完成 ${d.incomplete} · 未启动 ${d.unstarted}`:'每个 SNR 固定计划 128 次；大误差也计入 RMSE。');
      if(!selected)setText('cr-insight','CRB 描述模型下的局部精度极限；真正的全视场接收机还可能选错峰。');
      else if(selected.rmseDegrees===null)setText('cr-insight','本条件尚无完整的无条件 RMSE。未完成和数值失败不会被当成零误差，也不会悄悄剔除。');
      else if(selected.largeErrorCount>0)setText('cr-insight',`本次有 ${selected.largeErrorCount}/128 个误差超过 5°，全部计入 RMSE。局部下界无法单独反映低 SNR 的选错峰风险。`);
      else setText('cr-insight','这 128 次没有超过 5° 的误差。有限样本 RMSE 与局部无偏下界含义不同；略低于下界也不会被截高。');
    }
    function paint(s){
      const changed=last?.summary!==s.summary;last=s;
      $('cr-run').disabled=!s.canRun;$('cr-sweep').disabled=!s.canRun;$('cr-cancel').disabled=!s.canCancel;$('cr-export').disabled=!s.canExport;
      $('crb-receiver').setAttribute('data-state',s.status);$('crb-receiver').setAttribute('aria-busy',String(s.status==='running'||s.status==='stopping'));
      setText('cr-state',s.reason);setText('cr-error',s.error);
      if(s.source){const a=s.source;setText('cr-source',`本次验收运行 ${a.sourceRunId} · Γ=${fmt(a.gammaDb)} dB · ${a.Nt} 发射 / ${a.Nr} 接收 · 2 用户 · L=30 · 已用 ${fmt(a.usedPowerMw)} / 1000 mW · 设计方向 ${a.truthDegrees}°`);}else setText('cr-source','只接收上方本会话的新验收波束；导入的历史结果不会启动接收机。');
      const p=s.progress,progress=p?`${({noise:'生成噪声',templates:'构造全视场模板',observations:'生成回波',scoring:'全视场评分',bootstrap:'统计区间'})[p.stage]||'接收试验'} · 已完成条件 ${p.conditionsCompleted}/${p.conditionsPlanned} · 完整试验 ${p.trialsCompleted}/${p.totalTrialsPlanned} · ${(p.elapsedMs/1000).toFixed(2)} 秒`:s.exporting?'正在准备完整证据下载…':'';setText('cr-progress',progress);
      const time=win.performance.now();if(!p||time-lastAnnounced>=1000){setText('cr-announcement',p?progress:s.reason);lastAnnounced=time;}
      if(changed||!s.summary){summary(s.summary);profile(s.summary);comparison(s.summary);}
      if(changed&&s.summary){const token=++paintSerial,received=win.performance.now();win.performance.mark?.('cr-receiver-result-received');const raf=win.requestAnimationFrame||((fn)=>win.setTimeout(fn,0));raf(()=>raf(()=>{if(disposed||token!==paintSerial||last?.summary!==s.summary)return;win.performance.mark?.('cr-receiver-result-painted');setText('cr-timing',`本机结果消息到双帧绘制确认：${(win.performance.now()-received).toFixed(1)} ms；这不是通用浏览器性能保证。`);}));}else if(!s.summary){paintSerial++;setText('cr-timing','');}
    }
    const controller=lifecycle.create({core,createWorker:()=>new win.Worker('crb-receiver/worker.js'),now:()=>win.performance.now(),setTimeout:win.setTimeout.bind(win),clearTimeout:win.clearTimeout.bind(win),onChange:paint,onExport:(text,id)=>{const blob=new win.Blob([text],{type:'application/json'}),url=win.URL.createObjectURL(blob);urls.add(url);const a=doc.createElement('a');a.href=url;a.download=`crb-point-receiver-${id}.json`;a.click();win.setTimeout(()=>{win.URL.revokeObjectURL(url);urls.delete(url);},0);}});
    function settings(mode){const snr=$('cr-snr-number').value.trim()===''?NaN:Number($('cr-snr-number').value),seedText=$('cr-seed').value.trim(),noiseSeed=seedText===''?NaN:Number(seedText);let chosen=snr;if(mode==='fourSNRsweep'&&![-20,-10,0,10].includes(chosen))chosen=10;setText('cr-sweep-note',mode==='fourSNRsweep'?`四点固定为 −20、−10、0、10 dB；似然图固定展示 ${chosen} dB 的试验 0。相同试验编号复用相同噪声。`:'');return{mode,snrDb:chosen,noiseSeed};}
    on($('cr-run'),'click',()=>controller.start(settings('singleSNR')));on($('cr-sweep'),'click',()=>controller.start(settings('fourSNRsweep')));on($('cr-cancel'),'click',()=>controller.cancel());on($('cr-export'),'click',()=>controller.exportRecord());
    for(const id of ['cr-snr','cr-snr-number'])on($(id),'input',()=>{const other=id==='cr-snr'?'cr-snr-number':'cr-snr';$(other).value=$(id).value;controller.edit();setText('cr-sweep-note','');});
    on($('cr-seed'),'input',()=>controller.edit());
    on(win,'pagehide',()=>{controller.invalidate('页面离开时接收试验已停止。返回后请重新求解。');for(const url of urls)win.URL.revokeObjectURL(url);urls.clear();});
    const resize=()=>{if(resizeTimer)win.clearTimeout(resizeTimer);resizeTimer=win.setTimeout(()=>{resizeTimer=null;if(!disposed){profile(last?.summary);comparison(last?.summary);}},120);};on(win,'resize',resize);
    function invalidate(reason){controller.invalidate(reason);setText('cr-sweep-note','');}
    function dispose(){disposed=true;controller.dispose();for(const off of disposers)off();if(resizeTimer)win.clearTimeout(resizeTimer);for(const url of urls)win.URL.revokeObjectURL(url);urls.clear();}
    return {accept:raw=>controller.accept(raw),invalidate,dispose};
  }
  return {create,fmt};
});
