(function(){
  'use strict';
  const C=window.Pilot,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const names={comb:'梳状',full:'全连续',block:'等数量连续'},colors={comb:'#087e82',full:'#aa4d1b',block:'#66559a'},dashes={comb:'',full:'7 4',block:'2 4'};
  function node(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
  function table(id,rows){const body=$(id);body.replaceChildren();for(const values of rows){const tr=document.createElement('tr');for(const v of values){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}body.append(tr);}}
  function base(id,title,height=290){const svg=$(id),W=Math.max(220,svg.clientWidth||720),L=43,R=20,T=38,B=54;svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${W} ${height}`);svg.append(node('title',{},title));return {svg,W,L,R,T,B,H:height};}
  function mask(s,keys){const b=base('pilot-mask','已知导频位置',240),{svg,W,L,R,H}=b,x=k=>L+k/63*(W-L-R);
    keys.forEach((key,i)=>{const yy=50+i*52;svg.append(node('text',{x:9,y:yy-12},names[key]),node('line',{x1:L,y1:yy+5,x2:W-R,y2:yy+5,stroke:'#dbe5e8'}));for(const k of s.rows[key].pilots)svg.append(node('line',{x1:x(k),y1:yy,x2:x(k),y2:yy+20,stroke:colors[key],'stroke-width':2,'stroke-dasharray':dashes[key]}));});
    for(const k of (W<500?[0,32,63]:[0,16,32,48,63]))svg.append(node('text',{x:x(k),y:H-27,'text-anchor':'middle'},k));svg.append(node('text',{x:W/2,y:H-7,'text-anchor':'middle'},'子载波 k（无量纲）'));
  }
  function response(s,keys){const {svg,W,L,R,H,T,B}=base('pilot-response','候选距离与归一化匹配功率'),x=v=>L+v/150*(W-L-R),y=v=>H-B-v/1.08*(H-B-T);
    svg.append(node('text',{x:10,y:20},'得分 S（无量纲）'));
    for(const v of [0,.5,1])svg.append(node('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),stroke:'#e0e9ec'}),node('text',{x:L-8,y:y(v)+5,'text-anchor':'end'},v.toFixed(1)));
    for(const v of (W<500?[0,75,150]:[0,30,60,90,120,150]))svg.append(node('text',{x:x(v),y:H-29,'text-anchor':'middle'},v));
    svg.append(node('text',{x:W/2,y:H-7,'text-anchor':'middle'},'候选距离 R′（m）'),node('line',{x1:x(s.candidate),x2:x(s.candidate),y1:T,y2:H-B,stroke:'#233746','stroke-width':1,'stroke-dasharray':'3 3'}));
    // Draw reference curves first so the selected comb remains visible where curves coincide.
    for(const key of [...keys].reverse()){svg.append(node('polyline',{points:s.grid.map((r,i)=>`${x(r)},${y(s.rows[key].scores[i])}`).join(' '),fill:'none',stroke:colors[key],'stroke-width':2,'stroke-dasharray':dashes[key]}),node('circle',{cx:x(s.candidate),cy:y(s.rows[key].selected.score),r:4,fill:colors[key]}));}
  }
  function render(){const s=C.experiment({q:+$('pilot-q').value,offset:+$('pilot-offset').value,phase:+$('pilot-phase').value,range:+$('pilot-range').value,step:+$('pilot-step').value,candidate:+$('pilot-candidate').value}),keys=['comb'];if($('pilot-show-full').checked)keys.push('full');if($('pilot-show-block').checked)keys.push('block');
    $('pilot-range-out').textContent=`${s.range} m`;$('pilot-candidate-out').textContent=`${s.candidate} m`;
    $('pilot-resources').textContent=`固定 64 格、Δf=1 MHz。梳状与等数量连续各 ${s.rows.comb.count} 个导频；全连续 64 个。单位导频能量相同，三条曲线各除以自身 K²。不是等总能量比较，也未加入噪声。`;
    $('pilot-result').textContent=`梳状重复周期 ${s.rows.comb.period.toFixed(2)} m；真值 ${s.range} m 在 [0,150) m 内的全部精确同高解释：${s.aliases.map(r=>Number(r.toFixed(4))).join('、')} m。格距 ${s.step} m 不改变这些别名。`;
    const m=s.rows.comb.selected;$('pilot-selected').textContent=`手选 ${s.candidate} m：梳状 S=${m.score.toFixed(6)}；拟合 â=${m.re.toFixed(4)} ${m.im<0?'−':'+'} j${Math.abs(m.im).toFixed(4)}。â 可吸收共同相位，S 只取其模平方。真值是生成器提供的参考，不是接收机已知的位置。`;
    mask(s,keys);response(s,keys);
    table('pilot-summary',Object.entries(s.rows).map(([key,r])=>[names[key],r.count,r.spanMHz.toFixed(0),r.period.toFixed(2),r.firstNull.toFixed(5),r.selected.score.toFixed(6)]));
    table('pilot-data',s.rows.comb.data.map(h=>[h.k,h.k,h.re.toFixed(6),h.im.toFixed(6)]));
    table('pilot-scores',s.grid.map((r,i)=>[r.toFixed(2),...Object.values(s.rows).map(row=>row.scores[i].toFixed(6))]));
  }
  function offsets(){const q=+$('pilot-q').value,select=$('pilot-offset'),old=+select.value;select.replaceChildren();for(let i=0;i<q;i++){const o=document.createElement('option');o.value=String(i);o.textContent=String(i);select.append(o);}select.value=String(Math.min(old,q-1));}
  $('pilot-q').addEventListener('change',()=>{offsets();render();});
  for(const id of ['pilot-offset','pilot-phase','pilot-step','pilot-show-full','pilot-show-block'])$(id).addEventListener('change',render);
  for(const id of ['pilot-range','pilot-candidate'])$(id).addEventListener('input',render);
  $('pilot-reset').addEventListener('click',()=>{for(const [id,v]of [['pilot-q',4],['pilot-offset',0],['pilot-phase',0],['pilot-range',40],['pilot-step',.25],['pilot-candidate',2.5]])$(id).value=String(v);offsets();$('pilot-show-full').checked=true;$('pilot-show-block').checked=true;render();});
  let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(render,100);});render();
})();
