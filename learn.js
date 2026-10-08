/* Responsive, local-only renderers for the models in lab-core.js. */
(() => {
  'use strict';
  const K=window.ISAC, $=id=>document.getElementById(id), val=id=>+$ (id).value;
  const C={bg:'#0a192c',grid:'#27405a',text:'#dceaff',muted:'#a5bbd2',blue:'#83b6ff',teal:'#60dfc4',orange:'#ffc084',red:'#ff9ca5'};
  const running={d:false,m:false,c:false,b:false};let raf=0,last=0,mt=14,ct=48,bt=0,seed=19;
  function label(c,s,x,y,color=C.text,align='left',size=13){c.fillStyle=color;c.font=`${size}px system-ui, sans-serif`;c.textAlign=align;c.fillText(s,x,y);}
  function line(c,x,y,u,v,color=C.grid,dash=[]){c.strokeStyle=color;c.lineWidth=1;c.setLineDash(dash);c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();c.setLineDash([]);}
  function circle(c,x,y,r,color,fill=false){c.beginPath();c.arc(x,y,r,0,K.TAU);c.strokeStyle=color;c.lineWidth=1.4;if(fill){c.fillStyle=color;c.fill();}else c.stroke();}
  function arrow(c,x,y,u,v,color){line(c,x,y,u,v,color);const a=Math.atan2(v-y,u-x);line(c,u,v,u-7*Math.cos(a-.45),v-7*Math.sin(a-.45),color);line(c,u,v,u-7*Math.cos(a+.45),v-7*Math.sin(a+.45),color);}
  function setup(id,hd,hs=hd){const el=$(id),W=Math.round(el.clientWidth)||700,H=typeof hd==='function'?hd(W):(W<540?hs:hd),dpr=Math.min(window.devicePixelRatio||1,2);el.width=W*dpr;el.height=H*dpr;el.style.height=H+'px';const c=el.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=C.bg;c.fillRect(0,0,W,H);return{c,W,H};}
  function read(id,items){$(id).innerHTML=items.map(([s,v])=>`<span>${s} <b>${v}</b></span>`).join('');}
  function axes(c,x,y,w,h,xmax,ymax,xname){for(let j=0;j<=4;j++){const yy=y+h-j*h/4;line(c,x,yy,x+w,yy);label(c,(ymax*j/4).toFixed(ymax<3?1:0),x-7,yy+4,C.muted,'right');}for(let j=0;j<=4;j++){const xx=x+j*w/4;label(c,Math.round(xmax*j/4),xx,y+h+19,C.muted,'center');}label(c,xname,x+w,y+h+40,C.muted,'right');}
  function path(c,values,x,y,w,h,xmax,ymax,color,dash=[]){c.beginPath();let open=false;values.forEach((v,i)=>{if(!Number.isFinite(v)){open=false;return;}const xx=x+i/xmax*w,yy=y+h-v/ymax*h;if(!open)c.moveTo(xx,yy);else c.lineTo(xx,yy);open=true;});c.strokeStyle=color;c.lineWidth=2;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
  function doppler(){const {c,W,H}=setup('dopplerCanvas',340,285),b=val('dv'),v=130*b,x0=b<0?440:160;
    const max=b<0?Math.min(6,(x0-55)/-v):6;$('dt').max=max.toFixed(3);if(val('dt')>max)$('dt').value=max;
    const t=val('dt'),sx=W/840,cy=(H-65)/2,source=(x0+v*t)*sx,rx=660*sx;
    $('dvOut').textContent=(b>=0?'+':'')+b.toFixed(2);$('dtOut').textContent=t.toFixed(2)+' s';
    label(c,'每圈波的圆心固定在发射位置',16,25,C.muted);
    c.save();c.beginPath();c.rect(0,38,W,H-125);c.clip();
    for(let e=0;e<=t+1e-8;e+=.5){const r=130*(t-e)*sx;circle(c,(x0+v*e)*sx,cy,Math.max(.1,r),C.blue);circle(c,(x0+v*e)*sx,cy,2,C.muted,true);}c.restore();
    line(c,15,cy,W-15,cy,C.grid,[3,5]);circle(c,source,cy,7,C.teal,true);
    if(Math.abs(v)>1)arrow(c,source,cy+27,source+Math.sign(v)*27,cy+27,C.teal);
    label(c,'波源',Math.min(W-42,Math.max(12,source-15)),cy+55,C.teal);
    let flash=false;const first=(660-x0)/130,period=.5*(1-b);
    for(let i=0;i<20;i++)if(Math.abs(t-(first+i*period))<.055)flash=true;
    circle(c,rx,cy,flash?14:9,flash?C.orange:C.text,flash);label(c,'接收点',Math.min(W-60,rx-25),cy-27,C.text);
    const left=55,right=W-18,tx=z=>left+(right-left)*z/max;
    for(const [yy,name] of [[H-53,'发射'],[H-22,'到达']]){line(c,left,yy,right,yy,C.grid);label(c,name,11,yy+4,C.muted);}
    for(let i=0;i*.5<=max;i++){const e=i*.5,a=first+i*period;line(c,tx(e),H-59,tx(e),H-47,e<=t?C.teal:C.grid);if(a<=max)line(c,tx(a),H-28,tx(a),H-16,a<=t?C.orange:C.grid);}
    line(c,tx(t),H-70,tx(t),H-8,C.text);read('dResult',[['发射', '2.00 Hz'],['接收',(2/(1-b)).toFixed(2)+' Hz'],['到达间隔',period.toFixed(3)+' s']]);
  }
  function matched(){const a=K.matched($('mWave').value,$('mWrong').checked,val('mNoise'),$('mSecond').checked),lag=val('mLag');
    const {c,W}=setup('matchedCanvas',420,410),x=48,w=W-67,xx=n=>x+n*w/95,top=110,scale=45/Math.max(1,Math.max(...a.y.map(Math.abs))/1.5);
    $('mNoiseOut').textContent=val('mNoise').toFixed(2);$('mLagOut').textContent=lag;
    label(c,'回波（实线）与滑动模板（虚线）',14,25);line(c,x,top,W-18,top,C.grid);label(c,'0',x-9,top+4,C.muted,'right');
    const wave=(s,start,color,dash=[])=>{c.beginPath();s.forEach((v,j)=>{const px=xx(start+j),py=top-v*scale;if(j===0)c.moveTo(px,py);else c.lineTo(px,py);c.lineTo(xx(start+j+1),py);});c.lineWidth=1.8;c.strokeStyle=color;c.setLineDash(dash);c.stroke();c.setLineDash([]);};
    wave(a.y,0,C.blue);wave(a.template,lag,C.orange,[6,3]);
    for(let i=0;i<=90;i+=15)label(c,i,xx(i),188,C.muted,'center');label(c,'采样 n',W-18,209,C.muted,'right');
    const y=253,h=112,max=Math.max(1.1,...a.z.map(z=>Math.abs(z)*1.05));axes(c,x,y,w,h,95,max,'候选延迟 ℓ（采样）');
    label(c,'相关得分幅度 |z[ℓ]|',14,237);path(c,a.z.map(Math.abs),x,y,w,h,95,max,C.teal);
    line(c,xx(a.delay),y,xx(a.delay),y+h,C.blue,[3,4]);if($('mSecond').checked)line(c,xx(33),y,xx(33),y+h,C.blue,[3,4]);
    line(c,xx(lag),45,xx(lag),165,C.orange,[2,4]);line(c,xx(lag),y,xx(lag),y+h,C.orange);circle(c,xx(lag),y+h-Math.abs(a.z[lag])/max*h,4,C.orange,true);
    read('mResult',[['当前 |z|',Math.abs(a.z[lag]).toFixed(3)],['最大峰位置',a.peak],['真实延迟处 |z|',Math.abs(a.z[25]).toFixed(3)]]);
  }
  let ofdmCache='',ofdmValue=null;
  function ofdm(){const key=[val('oRange'),val('oSpeed'),$('oRemove').checked].join();if(key!==ofdmCache){ofdmValue=K.ofdm(val('oRange'),val('oSpeed'),$('oRemove').checked);ofdmCache=key;}const a=ofdmValue;
    const {c,W}=setup('ofdmCanvas',width=>width<540?2*(width-83)+198:(width-137)/2+147),small=W<540,p=small?W-83:(W-137)/2;
    const blocks=small?[[53,43],[53,43+p+99]]:[[45,43],[W/2+34,43]];
    for(let i=0;i<2;i++){const[x,y]=blocks[i];label(c,i===0?($('oRemove').checked?'相位：已消除数据':'相位：数据尚未消除'):'距离–多普勒功率',x,y-17,C.text);
      for(let m=0;m<32;m++)for(let k=0;k<32;k++){if(i===0){const ph=Math.atan2(a.im[m][k],a.re[m][k]);c.fillStyle=`hsl(${(ph+Math.PI)/K.TAU*360},70%,57%)`;}else{const db=Math.max(-40,10*Math.log10(Math.max(1e-12,a.power[m][k]/a.peak.p)));c.fillStyle=`hsl(167,65%,${8+(db+40)/40*77}%)`;}c.fillRect(x+k*p/32,y+m*p/32,p/32+.3,p/32+.3);}
      for(const k of [0,16,31])label(c,i===0?k:(k*a.rangeResolution).toFixed(0),x+(k+.5)*p/32,y+p+18,C.muted,'center');
      for(const m of [0,15,31])label(c,i===0?m:((15-m)*a.velocityResolution).toFixed(1),x-7,y+(m+.6)*p/32+4,C.muted,'right');
      label(c,i===0?'子载波 k →':'距离 R / m →',x+p,y+p+38,C.muted,'right');
      label(c,i===0?'m ↓':'v ↑',x-9,y-4,C.muted,'right');
      for(let q=0;q<p;q++){c.fillStyle=i===0?`hsl(${q/p*360},70%,57%)`:`hsl(167,65%,${8+q/p*77}%)`;c.fillRect(x+q,y+p+52,1.1,8);}label(c,i===0?'−π':'−40 dB',x,y+p+79,C.muted);label(c,i===0?'+π':'0 dB',x+p,y+p+79,C.muted,'right');
      if(i===1){c.strokeStyle=C.orange;c.lineWidth=1.5;c.strokeRect(x+a.peak.r*p/32,y+(15-a.peak.d)*p/32,p/32,p/32);}
    }
    $('oRangeOut').textContent=(val('oRange')*a.rangeResolution).toFixed(2)+' m';$('oSpeedOut').textContent=(val('oSpeed')*a.velocityResolution).toFixed(2)+' m/s';
    read('oResult',[['最大峰距离',(a.peak.r*a.rangeResolution).toFixed(2)+' m'],['最大峰速度',(a.peak.d*a.velocityResolution).toFixed(2)+' m/s'],['数据消除',$('oRemove').checked?'已开启':'关闭：峰不应当作估计']]);
  }
  function cfar(){const half=val('cTrain'),guard=val('cGuard'),p=val('cPfa'),mu=val('cNoise'),margin=half+guard;
    $('cCut').min=margin;$('cCut').max=95-margin;const cut=Math.max(margin,Math.min(95-margin,val('cCut')));$('cCut').value=cut;
    const data=K.cfarData(mu,$('cScene').value,seed),t=K.caThresholds(data,half,guard,p),fixed=-Math.log(p),alpha=K.caFactor(2*half,p);
    const{c,W}=setup('cfarCanvas',405,370),x=45,w=W-64,y=76,h=W<540?220:253,ymax=1.15*Math.max(fixed,...data,...t.filter(Number.isFinite)),xx=i=>x+(i+.5)*w/96;
    label(c,'功率 / 线性单位',14,23);label(c,'实线：CA   虚线：固定',14,45,C.muted);
    const band=(a,b,color,name)=>{const left=x+a*w/96,width=(b-a+1)*w/96;c.fillStyle=color;c.globalAlpha=.18;c.fillRect(left,60,width,h+16);c.globalAlpha=1;label(c,name,left+width/2,72,C.text,'center',11);};
    band(cut-guard-half,cut-guard-1,C.teal,'T');band(cut+guard+1,cut+guard+half,C.teal,'T');if(guard){band(cut-guard,cut-1,C.orange,'G');band(cut+1,cut+guard,C.orange,'G');}band(cut,cut,C.blue,'');label(c,'CUT',xx(cut),56,C.blue,'center',12);
    axes(c,x,y,w,h,96,ymax,'距离单元索引');
    for(let i=0;i<96;i++){c.fillStyle=i===cut?C.orange:C.blue;c.fillRect(x+i*w/96+.5,y+h-data[i]/ymax*h,Math.max(.7,w/96-1),data[i]/ymax*h);if(Number.isFinite(t[i])&&data[i]>t[i])circle(c,xx(i),y+h-data[i]/ymax*h-5,2.7,C.teal,true);}
    // Thresholds live at bin centers, same as the bars.
    path(c,t,x+w/192,y,w*95/96,h,95,ymax,C.teal);line(c,x,y+h-fixed/ymax*h,x+w,y+h-fixed/ymax*h,C.orange,[6,5]);
    for(const id of ['cTrain','cGuard','cCut'])$(id+'Out').textContent=val(id);$('cNoiseOut').textContent=mu.toFixed(2);
    read('cResult',[['CUT 功率',data[cut].toFixed(2)],['局部均值',(t[cut]/alpha).toFixed(2)],['α / 门限',alpha.toFixed(2)+' / '+t[cut].toFixed(2)],['判决',data[cut]>t[cut]?'报警':'不报警']]);
  }
  function beam(){const n=val('bN'),steer=val('bSteer'),step=Math.PI*(Math.sin(25*Math.PI/180)-Math.sin(steer*Math.PI/180)),small=$('beamCanvas').clientWidth<540;
    const{c,W}=setup('beamCanvas',410,600),left=small?W:W*.44,cols=4,spacing=(left-32)/cols;
    label(c,'目标 +25°：补偿后的相位',15,25);
    for(let i=0;i<n;i++){const x=18+spacing*(i%cols+.5),y=70+Math.floor(i/cols)*58,r=Math.min(19,spacing*.34),ph=i*step+bt;circle(c,x,y,r,C.grid);arrow(c,x,y,x+r*Math.cos(ph),y-r*Math.sin(ph),C.teal);label(c,'n='+i,x,y+r+15,C.muted,'center',11);}
    const gain=K.arrayGain(n,steer,25),ug=K.arrayGain(n,steer,-25),norm=Math.sqrt(gain);label(c,'相干合成幅度 |Σ|/N = '+norm.toFixed(3),15,322,C.teal);
    const x=small?43:left+39,y=small?377:77,w=W-x-19,h=small?157:233;
    label(c,'归一化方向图 / dB',x,y-29);for(const db of [-40,-20,0]){const yy=y-db/40*h;line(c,x,yy,x+w,yy);label(c,db,x-6,yy+4,C.muted,'right');}
    const dbs=Array.from({length:361},(_,i)=>Math.max(-40,10*Math.log10(Math.max(1e-10,K.arrayGain(n,steer,-90+i*.5)))));
    c.beginPath();dbs.forEach((db,i)=>{const xx=x+i/360*w,yy=y-db/40*h;if(i)c.lineTo(xx,yy);else c.moveTo(xx,yy);});c.lineWidth=2;c.strokeStyle=C.teal;c.stroke();
    for(const angle of [-90,0,90])label(c,angle+'°',x+(angle+90)/180*w,y+h+20,C.muted,'center');
    for(const [angle,g,col]of [[25,gain,C.blue],[-25,ug,C.orange]]){const xx=x+(angle+90)/180*w,yy=y-Math.max(-40,10*Math.log10(Math.max(g,1e-10)))/40*h;line(c,xx,y,xx,y+h,col,[3,5]);circle(c,xx,yy,4,col,true);}
    label(c,'−25° 用户 / +25° 目标',x+w/2,y+h+44,C.muted,'center');$('bSteerOut').textContent=steer+'°';$('bNOut').textContent=n;
    const db=g=>(10*Math.log10(Math.max(1e-12,g))).toFixed(1)+' dB';read('bResult',[['目标相对增益',db(gain)],['用户相对增益',db(ug)],['阵元间距','λ/2']]);
  }
  function visible(id){const r=$(id).getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}
  function frame(now){raf=0;const elapsed=last?Math.min((now-last)/1000,.06):0;last=now;
    if(running.d&&visible('dopplerCanvas')){$('dt').value=(val('dt')+elapsed)%(+$('dt').max);doppler();}
    if(running.m&&visible('matchedCanvas')){mt=(mt+elapsed*9)%70;$('mLag').value=Math.floor(mt);matched();}
    if(running.c&&visible('cfarCanvas')){ct+=elapsed*8;if(ct>+$('cCut').max)ct=+$('cCut').min;$('cCut').value=Math.floor(ct);cfar();}
    if(running.b&&visible('beamCanvas')){bt+=elapsed*1.5;beam();}
    if(Object.values(running).some(Boolean)&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  function toggle(k,id,start,readId){running[k]=!running[k];$(id).textContent=running[k]?'暂停':start;$(id).setAttribute('aria-pressed',String(running[k]));$(readId).setAttribute('aria-live',running[k]?'off':'polite');if(!raf){last=0;raf=requestAnimationFrame(frame);}}
  const configs=[['d','dPlay','播放','dResult'],['m','mPlay','自动滑动模板','mResult'],['c','cPlay','滑窗扫描','cResult'],['b','bPlay','播放相位旋转','bResult']];
  configs.forEach(([k,id,start,r])=>{$(id).setAttribute('aria-pressed','false');$(id).onclick=()=>{if(k==='m')mt=val('mLag');if(k==='c')ct=val('cCut');toggle(k,id,start,r);};});
  function bind(ids,f){ids.forEach(id=>$(id).addEventListener('input',f));}
  bind(['dv','dt'],doppler);bind(['mWave','mWrong','mSecond','mNoise','mLag'],()=>{mt=val('mLag');matched();});bind(['oRange','oSpeed','oRemove'],ofdm);bind(['cScene','cNoise','cPfa','cTrain','cGuard','cCut'],()=>{cfar();ct=val('cCut');});bind(['bSteer','bN'],beam);
  $('dReset').onclick=()=>{$('dt').value=0;doppler();};$('dStill').onclick=()=>{$('dv').value=0;doppler();};$('oGrid').onclick=()=>{$('oRange').value=10;$('oSpeed').value=3;ofdm();};$('cSeed').onclick=()=>{seed++;cfar();};$('cCenter').onclick=()=>{$('cCut').value=48;ct=48;cfar();};$('bTarget').onclick=()=>{$('bSteer').value=25;beam();};$('bUser').onclick=()=>{$('bSteer').value=-25;beam();};
  $('cMonte').onclick=()=>{const btn=$('cMonte'),p=val('cPfa'),n=2*val('cTrain'),trials=p>=.01?30000:p>=.001?100000:200000;btn.disabled=true;$('cMonteResult').textContent='正在生成独立纯噪声试验…';
    setTimeout(()=>{try{const rows=[.25,1,4].map((mu,i)=>{const r=K.falseAlarmTrials(n,p,trials,mu,135+i*773);return `μ=${mu}：${r.count}/${trials}，实测 ${(r.rate*100).toFixed(4)}%；95% 区间 [${(r.interval[0]*100).toFixed(4)}%, ${(r.interval[1]*100).toFixed(4)}%]`;});$('cMonteResult').textContent=`设计 PFA=${p}；N=${n}。\n`+rows.join('\n')+'\n各噪声水平使用不同固定随机种子；有限样本不保证实测值完全相等。';$('cMonteResult').style.whiteSpace='pre-line';}catch(e){$('cMonteResult').textContent='试验未完成：'+e.message;}finally{btn.disabled=false;}},25);
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)configs.forEach(([k,id,start,r])=>{if(running[k])toggle(k,id,start,r);});});
  const drawAll=()=>{doppler();matched();ofdm();cfar();beam();};let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawAll,100);});drawAll();
  // Preserve incoming links to the original overview's unchanged sections.
  if(['#history','#lab','#methods','#reading','#roadmap'].includes(location.hash))location.replace('overview.html'+location.hash);
})();
