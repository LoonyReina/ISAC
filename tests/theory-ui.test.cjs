// Dependency-free DOM smoke tests. No browser rendering/accessibility claims.
const {test}=require('node:test');const a=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const C=require('../theory-core.js');
function setup(width=720){
  class Element{
    constructor(){this.children=[];this.attrs={};this.events={};this.clientWidth=width;this.value='';this.textContent='';}
    setAttribute(k,v){this.attrs[k]=String(v);}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
    addEventListener(type,fn){this.events[type]=fn;}fire(type){this.events[type]({target:this});}
  }
  const html=fs.readFileSync(require.resolve('../theory.html'),'utf8'),els={};
  for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new Element();
  Object.entries({'theory-candidate-delay':5,'theory-candidate-bit':1,'theory-bit':1,'theory-delay':5,'theory-noise':0,'crb-length':8,'crb-blocks':2000,'rate-snr':0,'rate-length':8}).forEach(([id,v])=>els[id].value=String(v));
  const radios=['sensing','communication'].map(value=>Object.assign(new Element(),{value}));
  const window={Theory:C,addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../theory.js'),'utf8'),{window,document:{getElementById:id=>{a.ok(els[id],id);return els[id];},createElement:()=>new Element(),createElementNS:()=>new Element(),querySelectorAll:()=>radios},setTimeout,clearTimeout});
  return {els,radios};
}
test('DOM smoke: CRB defaults, resampling, low-T warnings, count changes, and reset',()=>{
  const {els}=setup(),initial=els['crb-result'].textContent;
  a.match(initial,/T=8，B=2000，种子=2026/);a.equal(els['crb-summary-body'].children.length,7);a.equal(els['crb-energy-body'].children.length,64);a.ok(els['crb-running-body'].children.length<=160);
  els['crb-resample'].fire('click');a.match(els['crb-result'].textContent,/种子=2027/);a.notEqual(els['crb-result'].textContent,initial);
  els['crb-length'].value='3';els['crb-length'].fire('change');a.match(els['crb-uncertainty'].textContent,/方差发散/);
  els['crb-blocks'].value='10000';els['crb-blocks'].fire('change');a.match(els['crb-result'].textContent,/T=3，B=10000/);
  els['crb-reset'].fire('click');a.equal(els['crb-result'].textContent,initial);a.equal(+els['crb-length'].value,8);a.equal(+els['crb-blocks'].value,2000);
  els['crb-reset'].fire('click');a.equal(els['crb-result'].textContent,initial);
});
test('DOM smoke: responsive charts keep native-scale labels and finite points',()=>{
  for(const width of [255,280,310,323,388,720]){const {els}=setup(width);for(const id of ['theory-wave','theory-scores','crb-energy','crb-average','rate-plane']){
    const svg=els[id];a.equal(svg.attrs.viewBox,`0 0 ${width} 285`);
    for(const n of svg.children){a.ok(!/NaN|Infinity/.test(JSON.stringify(n.attrs)));if(n.attrs.points)for(const pair of n.attrs.points.split(' ')){const [x,y]=pair.split(',').map(Number);a.ok(x>=0&&x<=width);a.ok(y>=0&&y<=285);}}
  }}
});
test('DOM smoke: original shared-model controls still operate independently',()=>{
  const {els,radios}=setup(310),crb=els['crb-result'].textContent;
  a.match(els['theory-result'].textContent,/R̂=7.50 m/);els['theory-candidate-delay'].value='4';els['theory-candidate-delay'].fire('input');a.match(els['theory-selected'].textContent,/得分 0.0000/);a.match(els['theory-result'].textContent,/R̂=7.50 m/);
  radios[1].fire('change');els['theory-bit'].value='-1';els['theory-bit'].fire('input');a.match(els['theory-result'].textContent,/判决 b̂=−1/);a.equal(els['theory-score-body'].children.length,2);
  els['theory-reset'].fire('click');a.match(els['theory-result'].textContent,/R̂=7.50 m/);a.equal(els['theory-score-body'].children.length,13);a.equal(els['crb-result'].textContent,crb);
});

test('DOM smoke: rate bridge SNR/T/reset and earlier controls remain independent',()=>{
  const {els}=setup(255),initial=els['rate-result'].textContent,crb=els['crb-result'].textContent;
  a.match(initial,/I=0.485944，D=0.125000/);a.match(initial,/I=0.500000，D=0.166667/);a.equal(els['rate-table-body'].children.length,2);
  els['rate-snr'].value='10';els['rate-snr'].fire('input');a.match(els['rate-result'].textContent,/I=0.996756，D=0.125000/);a.match(els['rate-result'].textContent,/I=1.729716/);
  els['rate-length'].value='3';els['rate-length'].fire('change');a.match(els['rate-result'].textContent,/I=0.996756，D=0.333333/);a.match(els['rate-result'].textContent,/I=1.729716，D=1.000000/);a.equal(els['crb-result'].textContent,crb);
  for(const db of [-20,20]){els['rate-snr'].value=String(db);els['rate-snr'].fire('input');a.ok(!/NaN|Infinity/.test(els['rate-result'].textContent));}
  els['rate-reset'].fire('click');els['rate-reset'].fire('click');a.equal(els['rate-result'].textContent,initial);a.equal(+els['rate-snr'].value,0);a.equal(+els['rate-length'].value,8);
  els['crb-resample'].fire('click');a.equal(els['rate-result'].textContent,initial);
});
test('DOM smoke: rate axes stay in view and exactly two unconnected markers render',()=>{
  for(const width of [240,255,310,388,720]){const {els}=setup(width),svg=els['rate-plane'];
    a.equal(svg.children.filter(n=>n.attrs.points).length,0);
    const markers=svg.children.filter(n=>n.attrs.fill);a.equal(markers.length,2);
    for(const n of svg.children){for(const key of ['x','x1','x2','cx'])if(n.attrs[key]!==undefined)a.ok(+n.attrs[key]>=0&&+n.attrs[key]<=width);for(const key of ['y','y1','y2','cy'])if(n.attrs[key]!==undefined)a.ok(+n.attrs[key]>=0&&+n.attrs[key]<=285);}
  }
});
