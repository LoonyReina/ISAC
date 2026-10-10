// Dependency-free DOM execution. This does not certify a real browser, layout, or keyboard.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../joint-beamforming-core.js');
const html=fs.readFileSync(require.resolve('../joint-beamforming.html'),'utf8'),script=fs.readFileSync(require.resolve('../joint-beamforming.js'),'utf8'),css=fs.readFileSync(require.resolve('../joint-beamforming.css'),'utf8');
function setup(width=600){class E{constructor(){this.children=[];this.attrs={};this.events={};this.clientWidth=width;this.value='';this.textContent='';}setAttribute(k,v){this.attrs[k]=String(v);}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}addEventListener(t,f){this.events[t]=f;}fire(t){a.ok(this.events[t]);this.events[t]({target:this});}}
 const els={},events={};for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new E();for(const [id,value]of [['jb-recipe','A'],['jb-eta','0.8'],['jb-noise','0.01'],['jb-qos','12']])els[id].value=value;
 vm.runInNewContext(script,{window:{JointBeamformingCore:C,addEventListener:(t,f)=>events[t]=f},document:{getElementById:id=>{a.ok(els[id],id);return els[id];},createElement:()=>new E(),createElementNS:()=>new E()}});return {els,events};}
const rows=e=>e['jb-metrics'].children.map(n=>n.children.map(n=>n.textContent));
const fmt=v=>v===0?'0':Math.abs(v)<1e-5?v.toExponential(2):v.toFixed(5);
const charts=['jb-pattern','jb-eigen','jb-correlation','jb-powers'];
test('native controls update all six model rows and selected recipe over channel/noise/QoS combinations',()=>{
 const {els:e}=setup();
 for(const eta of [0,.01,.5,.8,1])for(const noise of [.001,.01,.1])for(const qos of [4,12,16]){
  e['jb-eta'].value=String(eta);e['jb-noise'].value=String(noise);e['jb-qos'].value=String(qos);const s=C.compute(eta,noise,qos);
  for(const id of ['A','B','C']){e['jb-recipe'].value=id;e['jb-recipe'].fire('change');a.match(e['jb-status'].textContent,new RegExp(`已计算 ${id}`));const actual=rows(e);a.equal(actual.length,6);
   s.recipes.forEach((r,k)=>r.users.forEach((u,j)=>{const row=actual[k*2+j];a.deepEqual(row,[`${r.id} / 用户 ${j+1}`,fmt(u.desired),fmt(u.interuser),fmt(u.radar),fmt(u.noise),`${fmt(u.sinr)} / ${u.db===-Infinity?'−∞':u.db.toFixed(2)} dB`,u.pass?'满足此构造门槛':'不满足此构造门槛']);a.equal(e['jb-metrics'].children[k*2+j].attrs.class,r.id===id?'jb-selected':undefined);}));
   const matrices=JSON.parse(e['jb-matrices'].textContent);a.equal(matrices.recipe,id);a.equal(matrices.eta,eta);a.equal(JSON.stringify(matrices.H),JSON.stringify(s.H));a.equal(JSON.stringify(matrices.Wc),JSON.stringify(s.recipes.find(r=>r.id===id).Wc));
  }
 }
});
test('eta input, noise and threshold events recompute; reset and resize preserve repeatable default output',()=>{
 const {els:e,events}=setup(),initial=rows(e),status=e['jb-status'].textContent;
 e['jb-eta'].value='0';e['jb-eta'].fire('input');a.equal(rows(e)[2][5],'0 / −∞ dB');e['jb-noise'].value='0.1';e['jb-noise'].fire('change');a.equal(rows(e)[0][4],'0.10000');
 e['jb-qos'].value='16';e['jb-qos'].fire('change');a.ok(rows(e).every(row=>row[6]==='不满足此构造门槛'));
 for(let i=0;i<3;i++){e['jb-reset'].fire('click');a.deepEqual(rows(e),initial);a.equal(e['jb-status'].textContent,status);a.equal(e['jb-recipe'].value,'A');a.equal(e['jb-eta'].value,'0.8');a.equal(e['jb-noise'].value,'0.01');a.equal(e['jb-qos'].value,'12');events.resize();a.deepEqual(rows(e),initial);}
});
test('fixed-scale SVG geometry stays finite and bounded, with B/C overlapping on the full angular grid',()=>{
 for(const width of [240,270,323,388,600,950]){const {els:e}=setup(width);for(const id of ['A','B','C']){e['jb-recipe'].value=id;e['jb-recipe'].fire('change');for(const name of charts){const svg=e[name];a.equal(svg.attrs.viewBox,`0 0 ${width} 300`);for(const n of svg.children){a.ok(!/NaN|Infinity/.test(JSON.stringify(n.attrs)));for(const key of ['x','x1','x2'])if(key in n.attrs)a.ok(+n.attrs[key]>=0&&+n.attrs[key]<=width);for(const key of ['y','y1','y2'])if(key in n.attrs)a.ok(+n.attrs[key]>=0&&+n.attrs[key]<=300);if(n.attrs.points)for(const point of n.attrs.points.split(' ')){const [x,y]=point.split(',').map(Number);a.ok(x>=0&&x<=width&&y>=0&&y<=300);}}}
  const curves=e['jb-pattern'].children.filter(n=>n.attrs.points);a.equal(curves.length,2);a.equal(curves[0].attrs.points.split(' ').length,1801);a.equal(curves[1].attrs['stroke-dasharray'],'7 5');if(id!=='A'){const p=curves.map(c=>c.attrs.points.split(' ').map(x=>x.split(',').map(Number)));p[0].forEach(([x,y],i)=>{a.ok(Math.abs(x-p[1][i][0])<1e-9);a.ok(Math.abs(y-p[1][i][1])<1e-9);});}
 }}
});
test('invalid states clear old charts, matrices and numerical results; reset recovers',()=>{
 for(const [id,value,event]of [['jb-recipe','bad','change'],['jb-eta','-1','input'],['jb-noise','0','change'],['jb-qos','bad','change']]){const {els:e}=setup();e[id].value=value;e[id].fire(event);a.match(e['jb-status'].textContent,/旧图和结果已清空/);for(const id of [...charts,'jb-metrics'])a.equal(e[id].children.length,0);for(const id of ['jb-matrices','jb-invariants','jb-bound'])a.equal(e[id].textContent,'');e['jb-reset'].fire('click');a.equal(rows(e).length,6);a.match(e['jb-status'].textContent,/已计算 A/);}
});
test('controls, plots, live status and static fallback have accessible labels with no autoplay or external requests',()=>{
 for(const id of ['jb-recipe','jb-eta','jb-noise','jb-qos'])a.match(html,new RegExp(`for="${id}"`));for(const id of charts)a.match(html,new RegExp(`<svg id="${id}"[^>]*aria-label="[^"]+"`));
 a.match(html,/id="jb-status" role="status" aria-live="polite"/);a.match(html,/<noscript>/);a.match(html,/type="button" id="jb-reset"/);a.match(html,/id="jb-eta"[^>]*min="0" max="1" step="0.01"/);a.ok(!/setInterval|requestAnimationFrame|Math.random|fetch\(/.test(script));
});
test('the physical signal flow and plot-reading guide precede the first model equation',()=>{
 const model=html.match(/<section class="chapter" id="model">([\s\S]*?)<\/section>/)[1];
 const intro=model.match(/<div class="jb-model-intro">([\s\S]*?)<\/div>/);
 a.ok(intro);a.ok(model.indexOf(intro[0])<model.indexOf('<div class="equation">'));
 a.match(intro[1],/用户数据和雷达符号先进入发射机/);a.match(intro[1],/预编码给每根天线分配复数权重/);a.match(intro[1],/八根天线把这些信号叠加发出/);
 a.match(intro[1],/自己的数据/);a.match(intro[1],/三个功率峰不一定需要三路独立信号/);
 a.match(intro[1],/href="#jb-correlation"/);a.match(intro[1],/href="#jb-powers"/);a.match(intro[1],/A → B/);a.match(intro[1],/B → C/);
 a.doesNotMatch(intro[1],/<(?:svg|canvas|script|input|select)\b/);
});
test('six symbol definitions use a closed native disclosure with scoped visible focus styles',()=>{
 const model=html.match(/<section class="chapter" id="model">([\s\S]*?)<\/section>/)[1];
 const glossary=model.match(/<details([^>]*\bclass="jb-glossary"[^>]*)>([\s\S]*?)<\/details>/);
 a.ok(glossary);a.doesNotMatch(glossary[1],/\b(?:open|hidden|role|tabindex)\b/);
 a.match(glossary[2],/^\s*<summary>读公式前：这几个符号在做什么<\/summary>/);
 a.ok(model.indexOf(glossary[0])>model.indexOf('class="jb-model-intro"'));a.ok(model.indexOf(glossary[0])<model.indexOf('<div class="equation">'));
 const terms=Array.from(glossary[2].matchAll(/<dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd>/g),m=>[m[1],m[2]]);
 a.deepEqual(terms.map(([term])=>term),['信号流 c、s','预编码 Wc、Wr','协方差 R','期望 E 与上标 ᴴ','秩','SINR']);
 a.match(terms[0][1],/不是一个方向或一个目标/);a.match(terms[0][1],/两路通信流/);a.match(terms[0][1],/一路有效雷达流/);
 a.match(terms[1][1],/一列对应一路信号，一行对应一根天线/);a.match(terms[1][1],/8×2/);a.match(terms[1][1],/8×8/);a.match(terms[1][1],/其余补零/);
 a.match(terms[2][1],/对角线是每根天线的平均功率/);a.match(terms[2][1],/非对角元素描述相关性/);a.match(terms[2][1],/不是估计误差的协方差/);
 a.match(terms[3][1],/发射符号/);a.match(terms[3][1],/共轭转置/);a.match(terms[3][1],/通信信道矩阵 H/);
 a.match(terms[4][1],/独立空间分量/);a.match(terms[4][1],/不是角度功率峰/);
 a.match(terms[5][1],/自己的数据功率/);a.match(terms[5][1],/其他用户数据功率、未知雷达信号功率和噪声功率之和/);a.match(terms[5][1],/总空间协方差相同/);
 a.doesNotMatch(glossary[2],/<(?:script|button|input|select)\b|\b(?:hidden|onclick|aria-hidden)=/);
 a.match(css,/\.jb-glossary>summary:focus-visible,\.jb-model-intro a:focus-visible\{[^}]*outline:3px solid[^}]*outline-offset:3px/);
 a.match(css,/\.jb-glossary dd\{[^}]*margin:\.3rem 0 0/);a.match(css,/\.jb-glossary\{[^}]*overflow-wrap:anywhere/);
 a.match(html,/href="joint-beamforming\.css\?v=signal-flow-v1"/);
});
test('explanatory additions preserve scientific equations, section anchors, controls and computed-output targets',()=>{
 const equations=Array.from(html.matchAll(/<div class="equation">([\s\S]*?)<\/div>/g),m=>m[1]);
 a.deepEqual(equations,[
  'x[n]=Wc c[n]+Wr s[n]；R=E[xxᴴ]=WcWcᴴ+WrWrᴴ<br>E[ccᴴ]=I，E[ssᴴ]=I，E[scᴴ]=0；Rₘₘ=Pₜ/M=1/8',
  'y(θ)=a(θ)ᴴx；aₘ(θ)=exp(iπm sinθ)，m=0,…,7<br>P(θ)=aᴴRa；Pc(θ₁,θ₂)=E[y(θ₁)* y(θ₂)]=a(θ₂)ᴴRa(θ₁)',
  'Fc=HWc，Fr=HWr；H 第 k 行为 hₖᴴ<br>Dₖ=|Fcₖₖ|²；Iuₖ=Σⱼ≠ₖ|Fcₖⱼ|²；Irₖ=Σⱼ|Frₖⱼ|²<br>γₖ=Dₖ/(Iuₖ+Irₖ+σ²) ≥ Γ；Γ=10^(ΓdB/10)',
  'uⱼ[m]=exp(i2πjm/8)/√8；u₋=u₋₂，u₀=u₀，u₊=u₂<br>h=√η u₋−i√(1−η)u₊；q=√η u₊−i√(1−η)u₋<br>H=[hᴴ；u₀ᴴ]，0≤η≤1；R★=(u₋u₋ᴴ+u₀u₀ᴴ+u₊u₊ᴴ)/3',
  'A：Wc=[(u₋−i u₊)/√3，u₀/√3]，Wr=0<br>B：Wc=[u₋/√3，u₀/√3]，Wr=[u₊/√3，0,…,0]<br>C：Wc=[h/√3，u₀/√3]，Wr=[q/√3，0,…,0]',
  'A：γ₁=(√η+√(1−η))²/(3σ²)<br>B：γ₁=η/(1−η+3σ²)<br>C：γ₁=1/(3σ²)；三者 γ₂=1/(3σ²)'
 ]);
 a.deepEqual(Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]),['site-main','intuition','model','experiment','jb-recipe','jb-eta-value','jb-eta','jb-noise','jb-qos','jb-reset','jb-status','jb-story',...charts,'jb-metrics','jb-invariants','jb-bound','jb-matrices','solution','paper','limits','reproduce']);
 for(const id of charts)a.match(html,new RegExp(`<svg id="${id}"[^>]*><\\/svg>`));
 a.match(html,/<tbody id="jb-metrics"><\/tbody>/);a.match(html,/<pre id="jb-matrices"><\/pre>/);
 a.match(html,/<select id="jb-recipe"><option value="A">/);a.match(html,/id="jb-eta"[^>]*value="0\.8"/);
 a.match(html,/<select id="jb-noise">[^]*?<option value="0\.01" selected>/);a.match(html,/<select id="jb-qos">[^]*?<option value="12" selected>/);
 a.deepEqual(Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g),m=>m[1]),['joint-beamforming-core.js','joint-beamforming.js']);
 a.match(html,/三者都不是数值优化器输出/);a.match(html,/本站不运行 SDR/);a.match(html,/没有实现算法2或原文最优 ZF/);
});
