/* Progressive lesson inside OFDM step 7. All diagrams share the actual A column
   produced by Course.ofdm, and candidate dots are checked against its D matrix. */
(()=>{
 'use strict';
 const C=window.Course,V=window.VelocityMatch,$=id=>document.getElementById(id);
 const panel=document.querySelector('[data-panel="6"]');if(!panel||!C||!V)return;
 const style=document.createElement('style');style.textContent=`
 #velocity-matching{margin:24px 0 34px;padding:clamp(14px,2.6vw,28px);border:2px solid #badbd6;border-radius:14px;background:#fff;scroll-margin-top:100px}
 #velocity-matching h4{font-size:1.17rem;margin:28px 0 12px;color:#183248}
 #velocity-matching .vm-lead{color:#087f78;font-weight:700}
 #velocity-matching .vm-controls{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:18px;background:#eef6f6;border-radius:10px;margin:18px 0}
 #velocity-matching label{display:block;font-weight:600}#velocity-matching select{max-width:100%;width:100%;padding:8px;background:white;border:1px solid #a7bcc7;border-radius:6px;font:inherit}
 #velocity-matching input[type=range]{width:100%}#velocity-matching .vm-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
 #velocity-matching button{padding:9px 12px;border:1px solid #9db8be;border-radius:6px;color:#183248;background:#fff;font:inherit;cursor:pointer}
 #velocity-matching button[aria-pressed=true]{background:#087f78;color:white}#velocity-matching button:disabled{opacity:.45;cursor:default}
 #velocity-matching .vm-canvases{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
 #velocity-matching canvas{width:100%;display:block;border:1px solid #dce5eb;border-radius:8px;background:#fbfdff}
 #velocity-matching .vm-metric{border-left:4px solid #bc671b;background:#fff8ec;padding:14px 18px;margin:14px 0;font-variant-numeric:tabular-nums}
 #velocity-matching .vm-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:16px 0}
 #velocity-matching .vm-grid button{padding:8px 3px;font-size:.85rem;line-height:1.5}#velocity-matching .vm-grid small{display:block;font-size:.72rem}
 #velocity-matching table{min-width:520px;font-variant-numeric:tabular-nums}#velocity-matching th,#velocity-matching td{padding:9px 11px}
 #velocity-matching .vm-warning{color:#86500a;font-weight:600}#velocity-matching .vm-formula{font-family:Georgia,'Times New Roman',serif;overflow:auto;padding:16px;background:#f0f5fb;border:1px solid #d5e1ef;border-radius:8px;margin:18px 0;font-size:1.08rem;line-height:2}
 #velocity-matching button:focus-visible,#velocity-matching input:focus-visible,#velocity-matching select:focus-visible{outline:3px solid #bc671b;outline-offset:3px}
 @media(max-width:650px){#velocity-matching .vm-controls,#velocity-matching .vm-canvases{grid-template-columns:1fr}#velocity-matching{padding:13px}#velocity-matching h4{font-size:1.05rem}}
 @media print{#velocity-matching{break-before:page}#velocity-matching .vm-canvases{grid-template-columns:1fr 1fr}}
 `;document.head.appendChild(style);
 const box=document.createElement('section');box.id='velocity-matching';
 box.innerHTML=`
 <p class="vm-lead">先别按 FFT：把“转得多快”变成一次能亲手完成的匹配</p>
 <p>你已理解“跨频率看距离，跨时间看速度”。缺的不是再讲一次多普勒，而是<strong>把未知转速从复数序列中算出来</strong>。前面只是说了会旋转，下面补上“怎么测”。</p>
 <h4>A · 先取哪一列？不是拿上一张功率图做运算</h4>
 <p>第 4 步固定的是<strong>子载波 k</strong>；现在第 6 步已将 k 变成<strong>候选距离格 r</strong>。先选一个 r，取出它在 16 次观察中的完整复数：z[m] = A[m,r]。二者都含慢时间旋转；区别在于距离处理先把不同距离的回波尽量分开。同一距离内还可能有多个速度，后面再分。</p>
 <div class="vm-controls"><div><label for="vm-range">选择要测速度的距离列</label><select id="vm-range"></select><button id="vm-energy">选平均功率最大的列</button><p class="small">按观测列的平均功率选择，不读取目标真值。</p></div><div><p id="vm-column" class="small"></p><p id="vm-warning" class="vm-warning"></p></div></div>
 <p><strong>先用两拍试一下。</strong>在单个匀速目标、两拍均有足够信号的理想情形，把第二拍乘以第一拍的共轭，可消掉共同初相位；得到相位增量，再除以经过的时间。这里只能读到一圈内的增量，仍有混叠范围。</p>
 <div class="vm-formula">Δφ = arg(z[1]z[0]*)　→　f̂<sub>D</sub> = Δφ/(2πT<sub>r</sub>)　→　v̂ = λΔφ/(4πT<sub>r</sub>)</div>
 <p id="vm-pair" class="readout"></p>
 <p>不一定非要 FFT 才能测速。这个两拍算法已经能给出一个答案，但它不是多目标分解：有噪声时只用了很少数据；同一距离混有多个转速时，“合成箭头转了一点”也不代表任意一辆车的真实速度。接下来改用全部 16 拍，逐个检验候选转速。</p>
 <h4>B · 猜一个速度，把它造成的旋转“倒回去”</h4>
 <p>默认例子相邻两拍差 0.5 ms。若猜 +7.5 m/s，就相当于猜每拍前进 45°：第 0、1、2、3 拍应分别倒转 0°、45°、90°、135°。<strong>不是每一拍都减同一个角度，而是第 m 拍减 m 倍的候选步长。</strong>猜对后，箭头朝向一致；猜错后，仍在旋转。</p>
 <div class="vm-controls"><div><label for="vm-guess">你猜的径向速度 <output id="vm-guess-value">0.00 m/s</output></label><input id="vm-guess" type="range" min="-30" max="26.25" step="0.25" value="0" aria-describedby="vm-guess-read"><div class="vm-buttons"><button data-vm-speed="0">猜 0</button><button data-vm-speed="3.75">猜 +3.75</button><button data-vm-speed="7.5">猜 +7.5</button></div><p class="small">改变的是候选值，不是上方模拟目标的真速度。</p></div><div><label for="vm-count">逐拍相加：已加入 <output id="vm-count-value">1 / 16 拍</output></label><input id="vm-count" type="range" min="1" max="16" step="1" value="1"><div class="vm-buttons"><button id="vm-add">再加一拍</button><button id="vm-play" aria-pressed="false">播放逐拍相加</button><button id="vm-all">看完整 16 拍</button></div></div></div>
 <p id="vm-guess-read" class="small"></p>
 <div class="vm-canvases"><div><p><b>蓝：取出的 16 个复数</b><br><span class="small">每个小圆是 I/Q 平面，向右是 I，向上是 Q；m 是观察编号。</span></p><canvas id="vm-before" role="img" aria-label="距离列的16个原始复向量"></canvas></div><div><p><b>绿：逐拍反转以后的复数</b><br><span class="small">和左图用同一长度刻度。淡色是尚未加入累加的样本。</span></p><canvas id="vm-after" role="img" aria-label="按候选速度补偿后的16个复向量"></canvas></div></div>
 <details><summary>对照前四拍的乘法与相位（相位按一圈显示）</summary><div class="table-scroll"><table><thead><tr><th>m / 时刻</th><th>原始 z[m]</th><th>补偿角 −mδ̂</th><th>剩余相位</th></tr></thead><tbody id="vm-table"></tbody></table></div></details>
 <div class="vm-formula">δ̂ = 2π(2v̂/λ)T<sub>r</sub>　；　b[m] = z[m]e<sup>−jmδ̂</sup><br>c(v̂) = (1/M)Σ<sub>m=0…M−1</sub> b[m]　；　得分 S(v̂) = |c(v̂)|²</div>
 <p>这里的复乘法是坐标运算，不是又发射了一道波。<strong>把绿箭头首尾相接，再取总箭头的长度平方。</strong>同向就加长，绕来绕去就抵消。除以 M 只是统一显示尺度，不影响哪个候选最高。猜对后仍可保留一个未知的共同初相位，不要求最终指向 +I 轴。</p>
 <canvas id="vm-sum" role="img" aria-label="补偿后复向量逐拍累加的首尾相接轨迹"></canvas>
 <p id="vm-score" class="vm-metric"></p>
 <h4>C · 多试几个速度，一条“匹配得分曲线”就出现了</h4>
 <p>下图对<strong>同一列的同一组观测</strong>反复执行上面的补偿与累加。横轴是候选速度，纵轴是相干匹配功率；不是车辆运动轨迹。绿线是较密候选的直接计算，蓝点是 16 点 FFT 的规则候选，橙点是你当前的猜测。</p>
 <canvas id="vm-scan" role="img" aria-label="同一距离列的候选速度和实际匹配功率曲线"></canvas>
 <div id="vm-grid" class="vm-grid" role="group" aria-label="逐个试16个FFT速度候选"></div>
 <p id="vm-fft-read" class="readout"></p>
 <h4>D · 到这里，才把批量匹配写成 FFT</h4>
 <p>我们不是因为函数叫 FFT 才得到速度。先规定候选转速 f<sub>d</sub> = d/(MT<sub>r</sub>)，将它代入刚才的反转因子，T<sub>r</sub> 恰好消掉，留下熟悉的 DFT 负指数：</p>
 <div class="vm-formula">D[d,r] = (1/M)Σ<sub>m=0…M−1</sub> A[m,r]e<sup>−j2πdm/M</sup><br>f<sub>d</sub> = d/(MT<sub>r</sub>)　；　v<sub>d</sub> = λd/(2MT<sub>r</sub>)</div>
 <p><strong>这就是 DFT；FFT 是快速算出这一组 DFT 值的算法。</strong>页面为便于验证，实际逐项求和，与同归一化的 FFT 数学结果一致。这里 16 拍、0.5 ms 间隔、6 cm 波长，让 d 每增加 1，候选频移增加 125 Hz，候选速度增加 3.75 m/s。默认最大峰 d=2，对应 +7.5 m/s。</p>
 <p>把这条速度剖面放回它所属的距离列，再对其余距离列重复，就是下面的二维图。<strong>r 决定横坐标，d 决定纵坐标，|D|² 决定颜色</strong>。不能先取 |A|² 再做速度匹配：理想单目标的模平方可能是常数，旋转信息已经被删掉了。</p>
 <details><summary>边界：候选格距、负速度和多目标，不要再混在一起</summary><p>d 取 −8…7；底层未移位的 FFT 索引 q 取 0…15，二者用 q=(d+16) mod 16 对应。因此负速度不表示“负数组下标”。此处不模糊速度区间选为 [−30,30) m/s；+30 与 −30 给出同一采样旋转。3.75 m/s 是本例未补零的 FFT 格距，也是矩形观察窗下常用的分辨率尺度，不是所有估计器的绝对精度极限。</p><p>非整格目标会泄漏到邻格；可更密评估或用其他估计器细化峰位，但不凭空增加观测信息。多个足够可分的转速可形成多个峰，不能保证任意近的目标都分开。相干同步、近似匀速、距离迁移小与已消除通信符号等假设仍然重要；这里尚未做 CFAR 检测。</p></details>
 <p class="sources">原文接力：<a href="#ref-S1">[S1]</a> PDF 第19页式(49)–(52)的 OFDM 两维处理；<a href="#ref-D1">[D1]</a> PDF 第36、38–40页的两拍测相位与多转速分解。本文沿用“接近为正”的符号，TI 的混频符号可能相反。补偿箭头、得分与下面热图来自同一数值模型。</p>
 `;
 const firstP=panel.querySelector('p');firstP.textContent='这一页先拆开“测速”操作，再生成二维图。先取一列复数、手动猜一个速度、反向旋转并累加，最后才把同一操作批量写成 FFT。';firstP.after(box);
 const p4=document.querySelector('[data-panel="3"]');const bridge=document.createElement('p');bridge.className='callout';bridge.textContent='到这里得到的是正向规律：速度决定相邻相位步长。怎样反过来估计未知速度、为什么会用 FFT，第7步会用“逐拍补偿—首尾相加—候选打分”完整演示。';p4.append(bridge);
 const p6=document.querySelector('[data-panel="5"]');const note=document.createElement('p');note.textContent='下一步将选择这张图中的一个距离列 r，取出其16个完整复数 A[m,r]，而不是取出16个亮度值。';p6.append(note);
 const {K,M,Tr,fc}=C.cfg,lambda=C.C/fc,dR=C.C/(2*K*C.cfg.df);
 for(let r=0;r<K;r++){const option=document.createElement('option');option.value=r;option.textContent=`r=${r} → ${(r*dR).toFixed(3)} m`;option.selected=r===4;$('vm-range').append(option);}
 let timer=0,count=1,cache=null,cacheKey='',observer;
 const fmt=(x,n=2)=>(Math.abs(x)<1e-10?0:x).toFixed(n),deg=x=>x*180/Math.PI;
 const phase=z=>C.power(z)>1e-20?`${fmt(deg(Math.atan2(z.im,z.re)),1)}°`:'幅度近零，未定义';
 function data(){const key=[$('o-r').value,$('o-v').value,$('o-remove').checked].join('|');if(key!==cacheKey){cacheKey=key;cache=C.ofdm(+$('o-r').value,+$('o-v').value,$('o-remove').checked);}return cache;}
 function prep(id,height){const el=$(id);if(!el.getClientRects().length)return null;const w=el.getBoundingClientRect().width,ratio=Math.min(devicePixelRatio||1,2);el.width=Math.round(w*ratio);el.height=Math.round(height*ratio);el.style.height=height+'px';const g=el.getContext('2d');g.setTransform(ratio,0,0,ratio,0,0);g.font='12px system-ui';g.textBaseline='middle';return {g,w,h:height};}
 const colors={blue:'#2b64be',teal:'#087f78',orange:'#bc671b',ink:'#183248',muted:'#556d80',line:'#dce5eb'};
 function label(g,t,x,y,c=colors.ink,size=12,align='left'){g.fillStyle=c;g.font=`${size}px system-ui`;g.textAlign=align;g.fillText(t,x,y);g.textAlign='left';}
 function path(g,p,c,width=2){g.beginPath();g.strokeStyle=c;g.lineWidth=width;p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
 function arrow(g,x,y,dx,dy,c){if(Math.hypot(dx,dy)<.2)return;path(g,[[x,y],[x+dx,y+dy]],c);const a=Math.atan2(dy,dx),l=5;path(g,[[x+dx-l*Math.cos(a-.45),y+dy-l*Math.sin(a-.45)],[x+dx,y+dy],[x+dx-l*Math.cos(a+.45),y+dy-l*Math.sin(a+.45)]],c);}
 function dots(id,z,n,max,c){const o=prep(id,290);if(!o)return;const {g,w}=o,cols=4,cw=(w-20)/cols,ch=65,r=Math.min(21,cw*.32);label(g,'共同长度刻度；每格右 I、上 Q',12,16,colors.muted,11);
  z.forEach((a,m)=>{const x=10+cw*(m%4+.5),y=42+ch*Math.floor(m/4);g.globalAlpha=m<n?1:.28;g.beginPath();g.arc(x,y,r,0,C.TAU);g.strokeStyle=colors.line;g.lineWidth=1;g.stroke();path(g,[[x-r,y],[x+r,y]],colors.line,1);arrow(g,x,y,a.re/max*r,-a.im/max*r,c);label(g,'m='+m,x,y+r+11,colors.muted,11,'center');});g.globalAlpha=1;}
 function sumChart(s,n,max){const o=prep('vm-sum',240);if(!o)return;const{g,w,h}=o,rad=76,x=w/2,y=127,scale=rad/max;label(g,'首尾相加（每项已除以 M=16）',14,18,colors.ink,w<400?12:14);path(g,[[x-rad-15,y],[x+rad+15,y]],colors.line,1);path(g,[[x,y-rad],[x,y+rad]],colors.line,1);label(g,'I',x+rad+18,y,colors.muted);label(g,'Q',x,y-rad-12,colors.muted);
  let last={re:0,im:0};s.partial.slice(0,n).forEach(a=>{arrow(g,x+last.re*scale,y-last.im*scale,(a.re-last.re)*scale,-(a.im-last.im)*scale,colors.teal);last=a;});arrow(g,x,y,last.re*scale,-last.im*scale,colors.orange);label(g,'绿：逐项相接　橙：从原点到终点的总和',w/2,h-14,colors.muted,w<400?10:12,'center');}
 let gridButtons=[];
 const dummy=Array.from({length:M},()=>({re:1,im:0}));
 V.grid(dummy,Tr,lambda).forEach(q=>{const b=document.createElement('button');b.type='button';b.dataset.v=String(q.v);b.innerHTML=`d=${q.d} / q=${q.q}<br>${q.v>0?'+':''}${fmt(q.v)} m/s<small></small>`;b.onclick=()=>{stop();$('vm-guess').value=q.v;$('vm-count').value=M;render();};$('vm-grid').append(b);gridButtons.push(b);});
 function scanChart(z,s,grid,v){const o=prep('vm-scan',280);if(!o)return;const{g,w,h}=o,L=50,R=20,T=40,B=45,lo=-lambda/(4*Tr),hi=lambda/(4*Tr),top=Math.max(.1,s.energy*1.1),xx=x=>L+(x-lo)/(hi-lo)*(w-L-R),yy=p=>h-B-p/top*(h-T-B);
  label(g,'同一列的速度匹配功率',14,18,colors.ink,13);[0,.5,1].forEach(t=>{let p=t*top;path(g,[[L,yy(p)],[w-R,yy(p)]],colors.line,1);label(g,fmt(p,2),L-7,yy(p),colors.muted,10,'right');});[-30,-15,0,15,30].forEach(x=>label(g,String(x),xx(x),h-B+17,colors.muted,11,'center'));
  path(g,Array.from({length:241},(_,i)=>{const v=lo+(hi-lo)*i/240;return [xx(v),yy(V.match(z,v,Tr,lambda).power)];}),colors.teal,2);
  function dot(v,p,c,r){g.beginPath();g.arc(xx(v),yy(p),r,0,C.TAU);g.fillStyle=c;g.fill();}grid.forEach(q=>dot(q.v,q.power,colors.blue,3));dot(v,s.power,colors.orange,5);label(g,'候选径向速度 / m/s（并非目标真值）',w/2,h-10,colors.muted,w<400?10:12,'center');
 }
 function render(){if(panel.hidden)return;const base=data(),r=+$('vm-range').value,z=base.A.map(row=>row[r]),v=+$('vm-guess').value,n=+$('vm-count').value,s=V.match(z,v,Tr,lambda),qs=V.grid(z,Tr,lambda),pair=V.adjacent(z,Tr,lambda);count=n;
  const max=Math.max(1e-10,...z.map(a=>Math.hypot(a.re,a.im)));const displayMax=s.energy<1e-20?1:max;
  $('vm-column').textContent=`取 A[m,${r}]：距离 ${fmt(r*dR,3)} m，共 ${M} 拍，相邻 ${Tr*1000} ms。平均功率 ${fmt(s.energy,6)}；两张箭头图用共同刻度，圆半径代表幅度 ${fmt(displayMax,3)}。`;
  $('vm-warning').textContent=!$('o-remove').checked?'通信符号未消除：当前匹配峰不能直接解释为正确目标。':s.energy<1e-20?'这一列几乎没有能量：不应给微小浮点残差强行估计速度。':'';
  $('vm-pair').textContent=pair?`从本列前两拍实际计算：Δφ=${fmt(deg(pair.phase),2)}°，除以360°得到 ${fmt(pair.phase/C.TAU,4)} 圈；再除以 ${Tr*1000} ms 得 ${fmt(pair.fd,2)} Hz；乘 λ/2 得 ${fmt(pair.v,2)} m/s。这是两拍相位法的候选，不是无条件可靠真值。`:'前两拍幅度近零，不报告相位差或速度。';
  $('vm-guess-value').textContent=fmt(v)+' m/s';$('vm-count-value').textContent=n+' / '+M+' 拍';$('vm-add').disabled=n===M;
  $('vm-guess-read').textContent=`候选 ${fmt(v)} m/s → 候选频移 ${fmt(s.fd,2)} Hz → 每拍候选步长 ${fmt(deg(s.step),2)}°；第 m 拍补偿 −m×(${fmt(deg(s.step),2)}°)。已加入第0至${n-1}拍。`;
  dots('vm-before',z,n,displayMax,colors.blue);dots('vm-after',s.rotated,n,displayMax,colors.teal);sumChart(s,n,displayMax);
  $('vm-table').innerHTML=z.slice(0,4).map((a,m)=>`<tr><td>${m} / ${fmt(m*Tr*1000,1)} ms</td><td>${fmt(a.re,3)} ${a.im<0?'−':'+'} j${fmt(Math.abs(a.im),3)}<br>${phase(a)}</td><td>${fmt(-m*deg(s.step),1)}°</td><td>${phase(s.rotated[m])}</td></tr>`).join('');
  const partial=s.partial[n-1];$('vm-score').textContent=`当前 ${n}/${M} 拍的归一化向量和 = ${fmt(partial.re,4)} ${partial.im<0?'−':'+'} j${fmt(Math.abs(partial.im),4)}；长度平方 ${fmt(C.power(partial),6)}。全部16拍的最终匹配功率 = ${fmt(s.power,6)}。${s.energy<1e-20?'本列无有效能量。':'总和大，表示这一候选能让本列观测相干叠加；不是信号被重新发射或噪声被自动删除。'}`;
  scanChart(z,s,qs,v);let maxErr=0,best=qs[0];qs.forEach((q,i)=>{if(q.power>best.power)best=q;const actual=base.D[q.q][r];maxErr=Math.max(maxErr,Math.hypot(q.sum.re-actual.re,q.sum.im-actual.im));gridButtons[i].setAttribute('aria-pressed',String(Math.abs(q.v-v)<1e-8));gridButtons[i].querySelector('small').textContent='功率 '+fmt(q.power,3);});
  $('vm-fft-read').textContent=`蓝点由这16次匹配得到，与原二维处理的 D[q,r=${r}] 逐个核对：最大复数差 ${maxErr.toExponential(1)}。${s.energy<1e-20?'本列无有效能量，不报告最大峰速度。':`本列最高规则候选 d=${best.d}（数组索引q=${best.q}），频移 ${fmt(best.fd,1)} Hz，速度 ${fmt(best.v,2)} m/s。`}注意：下方完整热图的橙框仍标整幅图的最大峰，不是你的手动候选。`;
 }
 function stop(){clearInterval(timer);timer=0;$('vm-play').textContent='播放逐拍相加';$('vm-play').setAttribute('aria-pressed','false');}
 box.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',()=>{stop();render();}));
 box.querySelectorAll('[data-vm-speed]').forEach(b=>b.onclick=()=>{stop();$('vm-guess').value=b.dataset.vmSpeed;render();});
 $('vm-add').onclick=()=>{stop();$('vm-count').value=Math.min(M,count+1);render();};$('vm-all').onclick=()=>{stop();$('vm-count').value=M;render();};
 $('vm-play').onclick=()=>{if(timer){stop();return;}if(count===M)$('vm-count').value=1;render();$('vm-play').textContent='暂停逐拍相加';$('vm-play').setAttribute('aria-pressed','true');timer=setInterval(()=>{const rect=box.getBoundingClientRect();if(document.hidden||panel.hidden||rect.bottom<0||rect.top>innerHeight){stop();return;}$('vm-count').value=Math.min(M,count+1);render();if(count===M)stop();},550);};
 $('vm-energy').onclick=()=>{stop();const a=data().A;let best=0,max=-1;for(let r=0;r<K;r++){const power=a.reduce((s,row)=>s+C.power(row[r]),0);if(power>max){max=power;best=r;}}$('vm-range').value=best;render();};
 ['o-r','o-v','o-remove'].forEach(id=>$(id).addEventListener('input',()=>{stop();render();}));
 $('o-default').addEventListener('click',()=>{stop();$('vm-range').value=4;$('vm-guess').value=0;$('vm-count').value=1;render();});
 observer=new MutationObserver(()=>{if(panel.hidden)stop();else render();});observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 let resizing;window.addEventListener('resize',()=>{clearTimeout(resizing);resizing=setTimeout(render,180);});window.addEventListener('beforeprint',()=>{stop();render();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 function go(){if(location.hash==='#velocity-matching'){window.ISACCourseUI.setStep(6);requestAnimationFrame(()=>{render();box.scrollIntoView({block:'start',behavior:'instant'});});}}
 window.addEventListener('hashchange',go);window.VelocityBridge={render,stop};go();render();
})();
