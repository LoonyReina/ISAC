/* Visual bridges: every plotted sample comes from IntuitionModel.
   Defer-load after the model and before course.js. The course owns a single
   play/pause loop and dispatches slider redraws to these three entry points. */
(()=>{
 'use strict';
 const B=window.IntuitionModel,$=id=>document.getElementById(id),TAU=B.TAU;
 const ink='#183248',muted='#526879',teal='#087f78',blue='#2b64be',orange='#af541a',line='#dce5eb',gray='#81919c';
 const n=id=>Number($(id).value),fmt=(x,d=3)=>Math.abs(x)<1e-10?(0).toFixed(d):x.toFixed(d);
 const sign=(x,d=2)=>(x>1e-10?'+':'')+fmt(x,d),deg=x=>x*180/Math.PI;
 const textOut=(id,s)=>{$(id).textContent=s;};
 function prep(id,h=null){const e=$(id);if(!e||!e.getClientRects().length)return null;const w=e.getBoundingClientRect().width;h=h||Number(e.dataset.h);const d=Math.min(devicePixelRatio||1,2);e.width=Math.round(w*d);e.height=Math.round(h*d);e.style.height=h+'px';const g=e.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.textBaseline='middle';return{g,w,h};}
 function text(g,s,x,y,c=ink,size=13,align='left'){g.font=`${size}px system-ui,sans-serif`;g.fillStyle=c;g.textAlign=align;g.fillText(s,x,y);g.textAlign='left';}
 function path(g,points,c=teal,width=2,dash=[]){g.beginPath();g.strokeStyle=c;g.lineWidth=width;g.setLineDash(dash);points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.setLineDash([]);}
 function dot(g,x,y,r=4,c=teal){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=c;g.fill();}
 function arrow(g,x,y,dx,dy,c=teal,width=2){path(g,[[x,y],[x+dx,y+dy]],c,width);if(Math.hypot(dx,dy)<1)return;const a=Math.atan2(dy,dx),b=7;path(g,[[x+dx-b*Math.cos(a-.45),y+dy-b*Math.sin(a-.45)],[x+dx,y+dy],[x+dx-b*Math.cos(a+.45),y+dy-b*Math.sin(a+.45)]],c,width);}
 function plotBands(id,samples,bands,cursor,limits=2){const o=prep(id);if(!o)return;const{g,w,h}=o,L=w<450?43:59,R=20,T=12,bottom=37,bh=(h-T-bottom)/bands.length,x=u=>L+u/2*(w-L-R);
  bands.forEach((b,row)=>{const yTop=T+row*bh,yBottom=yTop+bh-16,mid=(yTop+28+yBottom)/2,scale=(yBottom-yTop-28)/2/limits,y=v=>mid-v*scale;
   text(g,b.label,12,yTop+10,b.color, w<450?12:14);
   [-limits,0,limits].forEach(v=>{path(g,[[L,y(v)],[w-R,y(v)]],line,1);text(g,fmt(v,limits>2?1:0),L-7,y(v),muted,10,'right');});
   [0,.5,1,1.5,2].forEach(t=>path(g,[[x(t),yTop+27],[x(t),yBottom]],line,.7));
   path(g,samples.map(s=>[x(s.theta/TAU),y(s[b.key])]),b.color,2,b.dash||[]);
   if(b.mean!==undefined)path(g,[[L,y(b.mean)],[w-R,y(b.mean)]],orange,2,[7,4]);
   if(cursor!==null){path(g,[[x(cursor/TAU),yTop+24],[x(cursor/TAU),yBottom]],gray,1,[3,3]);const value=b.evaluate(cursor);dot(g,x(cursor/TAU),y(value),4,b.color);}
  });
  [0,.5,1,1.5,2].forEach(t=>text(g,String(t),x(t),h-27,muted,11,'center'));
  text(g,'载波周期数 θ / 2π（时间从左到右）',(L+w-R)/2,h-10,muted,w<450?11:12,'center');
 }
 function circle(g,w,h,title,phase,amp=1,reference=true,rotation=null){const cx=w/2,cy=h/2+8,r=Math.min(w*.27,78),scale=r/1.45;
  text(g,title,13,19,ink,w<450?12:14);path(g,[[cx-r-17,cy],[cx+r+17,cy]],line,1);path(g,[[cx,cy-r-17],[cx,cy+r+17]],line,1);
  g.beginPath();g.arc(cx,cy,scale,0,TAU);g.strokeStyle='#c6d5de';g.lineWidth=1;g.stroke();text(g,'I / 实轴',cx+r+13,cy+19,muted,11,'center');text(g,'Q / 虚轴',cx,cy-r-28,muted,11,'center');
  if(reference)arrow(g,cx,cy,scale,0,gray,2);
  if(phase!==null){arrow(g,cx,cy,scale*amp*Math.cos(phase),-scale*amp*Math.sin(phase),rotation===null?orange:teal,3);
   if(rotation!==null){const p=phase+rotation,xx=cx+scale*amp*Math.cos(p),yy=cy-scale*amp*Math.sin(p);arrow(g,cx,cy,xx-cx,yy-cy,orange,3);path(g,[[xx,yy],[xx,cy]],orange,1.3,[4,3]);dot(g,xx,cy,4,orange);}
  }else dot(g,cx,cy,4,gray);
  return {cx,cy,scale,r};
 }
 function drawIQ(){if(!$('quad-i'))return;const i=n('quad-i'),q=n('quad-q'),theta=n('quad-clock')*Math.PI/180,delta=n('quad-lo')*Math.PI/180,s=B.quadrature(i,q,delta);
  textOut('quad-i-value',fmt(i,3));textOut('quad-q-value',fmt(q,3));textOut('quad-clock-value',fmt(n('quad-clock'),0)+'°');textOut('quad-lo-value',sign(n('quad-lo'),0)+'°');
  const first=i*Math.cos(theta),second=-q*Math.sin(theta),total=first+second;
  [['quad-i-node',i],['quad-q-node',q],['quad-first-node',first],['quad-second-node',second],['quad-total-node',total]].forEach(([id,v])=>textOut(id,fmt(v,3)));
  const samples=[...s.samples,{theta:2*TAU,first:i,second:0,s:i,mixedI:2*i*Math.cos(delta),mixedQ:-2*i*Math.sin(delta)}];
  plotBands('quad-wave',samples,[{key:'first',label:'① I 路：I cos θ（实电压）',color:teal,evaluate:t=>i*Math.cos(t)},{key:'second',label:'② Q 路：−Q sin θ（实电压）',color:blue,dash:[6,3],evaluate:t=>-q*Math.sin(t)},{key:'s',label:'③ 天线端口：两路之和 s(t)',color:orange,evaluate:t=>B.rf(i,q,t)}],theta,2);
  textOut('quad-tx-read',`θ=${fmt(deg(theta),0)}° 时：${fmt(first,3)} + (${fmt(second,3)}) = ${fmt(total,3)}。这是一个实数电压。${s.amplitude<1e-12?'两路都为零，所以整条波形为零。':Math.abs(i)<1e-10&&Math.abs(q)>1e-10?'虽然 I=0，Q 分支仍产生真实的正弦波；只在部分时刻电压经过零。':'同一对 I、Q 决定整段波形，而不是每个时刻都在发送两个独立电压。'}`);
  textOut('quad-rxi','Î = '+fmt(s.recoveredI));textOut('quad-rxq','Q̂ = '+fmt(s.recoveredQ));
  plotBands('quad-mix',samples,[{key:'mixedI',label:'乘 2cos 后：快摆动 ＋ 平均',color:teal,mean:s.recoveredI},{key:'mixedQ',label:'乘 −2sin 后：快摆动 ＋ 平均',color:blue,dash:[5,3],mean:s.recoveredQ}],null,3);
  textOut('quad-rx-read',`对两整个载波周期的 512 个样本求平均：Î=${fmt(s.recoveredI,4)}，Q̂=${fmt(s.recoveredQ,4)}。${Math.abs(delta)<1e-10?'参考对准，恢复出的正是上方发送的 I、Q。':'本振超前 '+sign(deg(delta),0)+'°，接收坐标相对于发送坐标转过 '+sign(-deg(delta),0)+'°；信号本身没有因此改变。'}${Math.abs(i)<1e-10&&Math.abs(q)>1e-10&&Math.abs(delta)<1e-10?' 此时只看 I 路会得到 0，但 Q 路明确不为 0。':''}`);
  const o=prep('quad-plane');if(o){circle(o.g,o.w,o.h,'绿：符号 z；橙：乘载波后的向量',s.phase,s.amplitude,false,theta);text(o.g,'橙点的水平坐标 = 当前真实电压',o.w/2,o.h-29,orange,o.w<450?11:13,'center');text(o.g,`s(t) = ${fmt(total,3)}`,o.w/2,o.h-11,orange,13,'center');}
  textOut('quad-polar-read',`z=${fmt(i,3)} ${q<0?'−':'+'} j${fmt(Math.abs(q),3)}；A=${fmt(s.amplitude,3)}，${s.phase===null?'相位未定义（零向量）':'φ='+fmt(deg(s.phase),1)+'°'}。复包络 |z|²=${fmt(s.envelopePower,3)}；图中真实射频跨整周期的平均 s²=${fmt(s.meanRFPower,3)}。两者按本页约定相差系数 2。`);
  document.querySelectorAll('[data-quad-symbol]').forEach(b=>{const z=B.symbols[b.dataset.quadSymbol];b.setAttribute('aria-pressed',String(Math.abs(z.i-i)<1e-9&&Math.abs(z.q-q)<1e-9));});
 }
 function drawMotion(){const v=n('motion-v'),t=n('motion-t')/1000,s=B.pathState(v,t);textOut('motion-v-value',sign(v,2)+' m/s');textOut('motion-t-value',fmt(t*1000,2)+' ms');
  textOut('motion-dr',sign(s.deltaR*1000,2)+' mm');textOut('motion-dl',sign(s.deltaL*1000,2)+' mm');textOut('motion-cycles',sign(s.turns,3)+' 圈');textOut('motion-angle',sign(deg(s.phaseChange),1)+'°');$('motion-next').disabled=t>=.008-1e-12;
  let o=prep('motion-path');if(o){const{g,w,h}=o,left=44,right=w-58; text(g,'两段路一起变化（宏观连接图不按比例）',13,20,ink,w<450?11:14);
   g.fillStyle='#e1edf5';g.fillRect(left-18,65,36,82);text(g,'基站',left,174,blue,12,'center');text(g,'Tx / Rx',left,191,muted,10,'center');
   g.fillStyle='#f7e5d5';g.fillRect(right-22,99,44,24);dot(g,right-13,127,5,orange);dot(g,right+13,127,5,orange);text(g,'目标',right,155,orange,12,'center');
   arrow(g,left+24,79,right-left-55,0,blue,2);arrow(g,right-27,141,-(right-left-51),0,teal,2);
   text(g,'去程 R(t)',(left+right)/2,57,blue,12,'center');text(g,'回程 R(t)',(left+right)/2,165,teal,12,'center');
   text(g,`${fmt(s.R,5)} m`,(left+right)/2,112,ink,w<450?12:15,'center');
   if(v!==0)arrow(g,right+(v>0?13:-13),181,v>0?-26:26,0,orange,2);
   const x=a=>44+(a+120)/240*(w-80),y=243;path(g,[[x(-120),y],[x(120),y]],gray,1);
   [-120,-60,0,60,120].forEach(a=>{path(g,[[x(a),y-5],[x(a),y+5]],gray,1);text(g,String(a),x(a),y+20,muted,10,'center');});
   path(g,[[x(0),216],[x(0),y+7]],gray,1,[3,3]);dot(g,x(s.deltaR*1000),y,6,orange);path(g,[[x(0),y-11],[x(s.deltaR*1000),y-11]],orange,3);
   text(g,'毫米放大尺：负值为接近',13,213,ink,12);text(g,'ΔR / mm（相对第一位置）',w/2,h-13,muted,11,'center');
  }
  o=prep('motion-ruler');if(o){const{g,w,h}=o,L=40,R=25,x=c=>L+(c+4)/8*(w-L-R);text(g,'总路径少走的长度 / λ',13,20,ink,w<450?12:14);
   for(let j=-4;j<4;j++){g.fillStyle=j%2?'#edf3f6':'#e2ecef';g.fillRect(x(j),57,x(j+1)-x(j),24);}
   const x0=x(0),x1=x(s.turns);g.fillStyle=s.turns>=0?'#f4bf94':'#aec9ec';g.fillRect(Math.min(x0,x1),57,Math.abs(x1-x0),24);path(g,[[x0,43],[x0,87]],ink,1.3);dot(g,x1,69,5,orange);
   for(let j=-4;j<=4;j++){path(g,[[x(j),81],[x(j),88]],gray,1);if(w>450||j%2===0)text(g,String(j),x(j),102,muted,11,'center');}
   text(g,'左：多走了路　　0　　右：少走了路',w/2,h-16,muted,w<450?10:12,'center');
  }
  o=prep('motion-vector');if(o){const c=circle(o.g,o.w,o.h,'相对第一拍：路短 → 正向旋转',s.phase,1,true);const p=Math.sign(s.phaseChange)*Math.min(Math.abs(s.phaseChange),TAU);if(Math.abs(p)>1e-8){o.g.beginPath();o.g.arc(c.cx,c.cy,c.scale+12,0,-p,p>0);o.g.strokeStyle=orange;o.g.lineWidth=2;o.g.stroke();}text(o.g,`圈内角 ${sign(deg(B.wrap(s.phaseChange)),1)}°；累计 ${sign(s.turns,3)} 圈`,o.w/2,o.h-16,orange,o.w<450?11:13,'center');}
  o=prep('motion-iq');if(o){const{g,w,h}=o,L=43,R=18,T=48,bot=45,x=ms=>L+ms/8*(w-L-R),y=a=>T+(1.3-a)/2.6*(h-T-bot);
   text(g,'绿：I 实线　蓝：Q 虚线　灰：|z|²',12,21,ink,w<450?11:14);[-1,0,1].forEach(a=>{path(g,[[L,y(a)],[w-R,y(a)]],line,1);text(g,String(a),L-9,y(a),muted,11,'right');});
   [0,2,4,6,8].forEach(ms=>{text(g,String(ms),x(ms),h-27,muted,11,'center');path(g,[[x(ms),T],[x(ms),h-bot]],line,.7);});
   const ss=Array.from({length:321},(_,j)=>B.pathState(v,j*.008/320));path(g,ss.map(a=>[x(a.t*1000),y(a.z.re)]),teal,2);path(g,ss.map(a=>[x(a.t*1000),y(a.z.im)]),blue,2,[6,3]);path(g,[[L,y(1)],[w-R,y(1)]],gray,1.6,[2,3]);path(g,[[x(t*1000),T],[x(t*1000),h-bot]],orange,1.2);dot(g,x(t*1000),y(s.z.re),4,teal);dot(g,x(t*1000),y(s.z.im),4,blue);text(g,'观察时间 t / ms',w/2,h-10,muted,12,'center');
  }
  textOut('motion-read',`t=${fmt(t*1000,2)} ms：R=${fmt(s.R,5)} m，往返路径相对起点改变 ${sign(s.deltaL*1000,2)} mm。箭头累计转 ${sign(s.turns,3)} 圈，当前 I=${fmt(s.z.re,3)}、Q=${fmt(s.z.im,3)}。转速 f_D=${sign(s.fd,1)} Hz；归一化功率始终为 1。${v===0?'车静止，路径和相位不再变化。':v>0?'接近使去程、回程都缩短。':'远离使路径增长，旋转方向反过来。'}`);
 }
 function drawSlow(){if(!$('dop-tr'))return;const v=n('dop-v'),Tr=n('dop-tr'),m=n('dop-m'),s=B.slowTime(v,Tr),p=B.probeSnapshot(v,Tr,m),current=s.samples[m];textOut('dop-v-value',sign(v,2)+' m/s');textOut('dop-m-value',String(m));textOut('dop-snapshot-value',`z[${m}] = ${fmt(p.z.re,3)} ${p.z.im<0?'−':'+'} j${fmt(Math.abs(p.z.im),3)}`);
  let o=prep('dop-timeline',245);if(o){const{g,w,h}=o,L=38,R=21,x=k=>L+k/15*(w-L-R);text(g,'毫秒尺：每一条是一拍的起点',12,20,ink,w<450?12:14);
   path(g,[[L,90],[w-R,90]],gray,1);for(let j=0;j<16;j++){path(g,[[x(j),j===m?43:56],[x(j),90]],j===m?orange:teal,j===m?5:3);if([0,4,8,12,15].includes(j)){text(g,'m='+j,x(j),107,muted,10,'center');text(g,fmt(j*Tr*1000,Tr<.001?1:0),x(j),124,muted,10,'center');}}
   text(g,`下面放大 m=${m}：起点 ${fmt(m*Tr*1000,2)} ms`,12,148,ink,w<450?11:13);
   const xus=u=>L+u/2*(w-L-R);g.fillStyle='#e9edf1';g.fillRect(xus(0),169,xus(1)-xus(0),24);g.fillStyle='#e0f0eb';g.fillRect(xus(1),169,xus(2)-xus(1),24);text(g,'保护 1 μs',xus(.5),181,muted,10,'center');
   for(let j=0;j<16;j++)dot(g,xus(1+j/16),181,2.5,teal);
   [0,1,2].forEach(u=>text(g,String(u)+' μs',xus(u),210,muted,11,'center'));text(g,'局部快时间：有效段 n=0…15',w/2,232,muted,11,'center');
  }
  o=prep('dop-probe');if(o){const{g,w,h}=o,L=43,R=18,T=43,bot=44,x=j=>L+j/15*(w-L-R),y=a=>T+(1.2-a)/2.4*(h-T-bot);text(g,'蓝虚线：Re x[n]　绿实线：Re y[n]',12,20,ink,w<450?11:13);
   [-1,0,1].forEach(a=>{path(g,[[L,y(a)],[w-R,y(a)]],line,1);text(g,String(a),L-8,y(a),muted,11,'right');});[0,5,10,15].forEach(j=>text(g,String(j),x(j),h-27,muted,11,'center'));
   path(g,p.x.map((z,j)=>[x(j),y(z.re)]),blue,2,[5,3]);path(g,p.y.map((z,j)=>[x(j),y(z.re)]),teal,2);p.y.forEach((z,j)=>dot(g,x(j),y(z.re),2.5,teal));text(g,'同一拍内的快时间采样 n',w/2,h-10,muted,11,'center');
  }
  const width=$('dop-c').getBoundingClientRect().width,cols=width<450?4:8,rows=16/cols;o=prep('dop-c',rows*88+32);
  if(o){const{g,w,h}=o,cw=(w-20)/cols,ch=88,r=22;text(g,'每拍一个 z[m]；橙底 = 当前拍',12,17,ink,w<450?11:13);s.samples.forEach((a,j)=>{const cx=10+cw*(j%cols+.5),cy=32+ch*(Math.floor(j/cols)+.4);if(j===m){g.fillStyle='#fff0d9';g.fillRect(cx-cw*.46,cy-31,cw*.92,77);}g.beginPath();g.arc(cx,cy,r,0,TAU);g.strokeStyle='#c2d4dc';g.lineWidth=1;g.stroke();path(g,[[cx-r,cy],[cx+r,cy]],line,1);arrow(g,cx,cy,r*a.z.re,-r*a.z.im,j===m?orange:teal,2);text(g,'m='+j,cx,cy+36,muted,11,'center');});}
  textOut('dop-read',`每拍相隔 ${fmt(Tr*1000,2)} ms，物理相位步长 ${sign(deg(s.phaseStep),1)}°。第 ${m} 拍在 t=${fmt(m*Tr*1000,2)} ms，图②实际相关得到 z[${m}]=${fmt(p.z.re,3)} ${p.z.im<0?'−':'+'} j${fmt(Math.abs(p.z.im),3)}。这对数成为图③的一个箭头；不是 ADC 只采了一个点。`);
  const atBoundary=Math.abs(Math.abs(s.shortStep)-Math.PI)<1e-8;
  textOut('dop-alias-read',s.ambiguous?`混叠提醒：实际每拍转 ${sign(deg(s.phaseStep),1)}°，但两个箭头仅显示模 360° 的差。${atBoundary?'现在恰在半圈边界，正转半圈与反转半圈不可分。':`若只按最短角 ${sign(deg(s.shortStep),1)}° 解释，会得到表观 ${sign(s.apparentFd,1)} Hz、${sign(s.apparentV,2)} m/s；这不是车的真实速度。`} 当前中心不模糊区间是 |v| < ${fmt(s.speedBound,2)} m/s。`:`在当前模型及 |v| < ${fmt(s.speedBound,2)} m/s 的中心区间先验内，每拍小于半圈，可由相邻相位差恢复 ${sign(current.fd,1)} Hz、${sign(v,2)} m/s。相位的整圈歧义并未凭空消失，是先验范围限制了候选。`);
  $('dop-alias-read').dataset.warning=String(s.ambiguous);
 }
 function stop(){window.ISACCourseUI?.stop?.();}
 function set(id,value){$(id).value=String(value);}
 function refresh(ids){stop();ids.forEach(id=>$(id).dispatchEvent(new Event('input',{bubbles:true})));}
 document.querySelectorAll('[data-quad-preset]').forEach(b=>b.addEventListener('click',()=>{const kind=b.dataset.quadPreset;set('quad-i',kind==='i'?1:0);set('quad-q',kind==='q'?1:0);refresh(['quad-i']);}));
 document.querySelectorAll('[data-quad-symbol]').forEach(b=>b.addEventListener('click',()=>{const s=B.symbols[b.dataset.quadSymbol];set('quad-i',s.i);set('quad-q',s.q);refresh(['quad-i']);}));
 $('quad-lo-reset').onclick=()=>{set('quad-lo',0);refresh(['quad-lo']);};$('quad-lo-45').onclick=()=>{set('quad-lo',45);refresh(['quad-lo']);};$('quad-i-blind').onclick=()=>{set('quad-i',0);set('quad-q',1);set('quad-lo',0);refresh(['quad-lo']);};
 $('motion-next').onclick=()=>{set('motion-t',Math.min(8,n('motion-t')+.5));refresh(['motion-t']);};document.querySelectorAll('[data-motion-preset]').forEach(b=>b.onclick=()=>{const kind=b.dataset.motionPreset;set('motion-v',kind==='still'?0:kind==='away'?-7.5:7.5);if(kind==='one')set('motion-t',4);refresh(['motion-v']);});
 $('dop-import').onclick=()=>{set('dop-v',n('motion-v'));set('dop-tr',.0005);set('dop-m',Math.min(15,Math.round(n('motion-t')/.5)));refresh(['dop-v']);};$('dop-alias').onclick=()=>{set('dop-v',7.5);set('dop-tr',.004);set('dop-m',1);refresh(['dop-tr']);};$('dop-restore').onclick=()=>{set('dop-v',7.5);set('dop-tr',.0005);set('dop-m',1);refresh(['dop-tr']);};
 window.Intuition={drawIQ,drawMotion,drawSlow};
})();
