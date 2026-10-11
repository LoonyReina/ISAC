'use strict';
// Formatter and DOM text contracts only; no browser layout or deployment claim.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(require.resolve(`../${file}`),'utf8');
const script=read('distributed-detection.js'),html=read('distributed-detection.html');

function setup(values={},width=600){
  class Element{
    constructor(){this.value='';this.textContent='';this.clientWidth=width;this.children=[];this.events={};this.attrs={};}
    setAttribute(key,value){this.attrs[key]=String(value);}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    addEventListener(type,listener){this.events[type]=listener;}
  }
  const els={};
  for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=new Element();
  const defaults={'dd-rho':3,'dd-kappa':.75,'dd-pfa':.05,'dd-i1':Math.SQRT2,'dd-q1':0,'dd-i2':Math.SQRT2,'dd-q2':0,'dd-blocks':10,'dd-model-reals':0,'dd-model-updates':0,'dd-template':'once'};
  for(const [id,value]of Object.entries({...defaults,...values}))els[id].value=String(value);
  let record=null;
  const context=vm.createContext({window:{addEventListener(){},ExperimentRecord:{create:()=>({update:value=>{record=value;},clear:()=>{record=null;}})}},document:{getElementById:id=>{assert.ok(els[id],id);return els[id];},createElementNS:()=>new Element()}});
  vm.runInContext(read('distributed-detection-core.js'),context);
  // Expose the production closure's formatter only inside this test context.
  assert.match(script,/\}\)\(\);\s*$/);
  vm.runInContext(script.replace(/\}\)\(\);\s*$/,'window.testPercent=pct;})();'),context);
  assert.equal(els['dd-status'].textContent,'');
  assert.ok(record);
  return {format:context.window.testPercent,text:els['dd-performance'].textContent,record,els};
}

test('subunit probabilities never format as exact 100 percent',()=>{
  const {format}=setup();
  const probabilities=[0,Number.MIN_VALUE,1e-12,.05,.5,.99,.999999,.9999999,.99999995,.99999999,.999999999999,1-Number.EPSILON/2];
  for(let i=0;i<1000;i++)probabilities.push(i/1000);
  for(const p of probabilities){assert.ok(p<1);assert.notEqual(format(p),'100%',String(p));}
  for(const p of [.99999999,.999999999999,1-Number.EPSILON/2])assert.equal(format(p),'<100%');
});

test('exact one needs no qualifier only when there is no positive stable miss',()=>{
  const {format}=setup();
  assert.equal(format(1),'100%');
  assert.equal(format(1,0),'100%');
  for(const miss of [Number.MIN_VALUE,1e-20,Number.EPSILON/2])assert.equal(format(1,miss),'<100%');
  assert.equal(format(0),'0%');
  assert.equal(format(.05),'5%');
  assert.equal(format(.5),'50%');
  assert.equal(format(.999999),'99.9999%');
});

test('near-one Pfa and unrounded Pd readouts both retain their strict bound',()=>{
  const {text,record}=setup({'dd-rho':0,'dd-pfa':.999999999999});
  assert.ok(record.model.pfa<1);
  assert.ok(record.detector.calibration.jointPd<1);
  assert.ok(record.detector.calibration.energySumPd<1);
  assert.match(text,/Pfa=<100%/);
  assert.equal((text.match(/Pd=<100%/g)||[]).length,2);
  assert.doesNotMatch(text,/(?:Pfa|Pd)=100%/);
});

test('stable positive miss remains visible when numeric Pd rounds to exactly one',()=>{
  const {text,record}=setup({'dd-rho':10000,'dd-kappa':0,'dd-pfa':.999999999999});
  const cal=record.detector.calibration;
  for(const [pd,miss]of [[cal.jointPd,cal.jointMiss],[cal.energySumPd,cal.energySumMiss]]){
    assert.equal(pd,1);
    assert.ok(miss>0&&miss<1e-18);
    const stable=Number(miss.toPrecision(10)).toString();
    assert.ok(text.includes(`Pd=<100%；漏检率=${stable}`),text);
  }
  assert.equal((text.match(/Pd=<100%/g)||[]).length,2);
  assert.doesNotMatch(text,/(?:Pfa|Pd)=100%/);
  assert.match(record.boundaries.numeric,/Stable miss is computed separately/);
});

test('endpoint tick labels stay inside the plot and clear the y-axis labels at narrow widths',()=>{
  for(const width of [230,323,391,640]){
    const {els}=setup({},width);
    for(const [id,firstLabel,lastLabel,title]of [['dd-pd','-15','20','每站平均 SNR / dB'],['dd-roc','10⁻⁴','0.5','Pfa · 对数刻度']]){
      const children=els[id].children;
      const first=children.find(e=>e.textContent===firstLabel),last=children.find(e=>e.textContent===lastLabel&&e.attrs.y===first.attrs.y);
      const zero=children.find(e=>e.textContent==='0'&&e.attrs['text-anchor']==='end');
      assert.equal(first.attrs['text-anchor'],'start');
      assert.equal(last.attrs['text-anchor'],'end');
      assert.equal(Number(first.attrs.x)-Number(zero.attrs.x),8);
      assert.ok(Number(first.attrs.y)>Number(zero.attrs.y));
      assert.ok(Math.abs(Number(last.attrs.x)-(width-17))<1e-10);
      const axisTitle=children.find(e=>e.textContent===title);
      assert.equal(axisTitle.attrs['text-anchor'],'middle');
      assert.equal(Number(axisTitle.attrs.x),width/2);
      assert.equal(Number(axisTitle.attrs.y),293);
      for(const tick of children.filter(e=>e.attrs.y===first.attrs.y&&e!==first&&e!==last))assert.equal(tick.attrs['text-anchor'],'middle');
    }
  }
});
