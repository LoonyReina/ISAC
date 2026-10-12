'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../reflection-aperture-core.js');
const oldCore=require('../multipath-channel-core.js');
const close=(actual,expected,tolerance=1e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const relative=(actual,expected,tolerance=2e-14)=>assert.ok(Math.abs(actual/expected-1)<=tolerance,`${actual} != ${expected}`);
const vclose=(actual,expected,tolerance=1e-12)=>actual.forEach((value,index)=>close(value,expected[index],tolerance));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const unit=(a,b)=>{const delta=[b[0]-a[0],b[1]-a[1]],norm=Math.hypot(...delta);return delta.map(value=>value/norm);};
const base={transmitter:[0,2],receiver:[6,4],normal:[0,1],offset:0,wallStart:[-2,0],wallEnd:[10,0]};
function invalid(result,reason){
  assert.equal(result.status,'invalid');
  if(reason)assert.equal(result.reason,reason);
  if('lengthM' in result){assert.equal(result.lengthM,null);assert.equal(result.delayS,null);}
  if('reflection' in result){assert.equal(result.reflection,null);assert.equal(result.imageTransmitter,null);assert.equal(result.construction,null);}
}
function checkReflection(result,transmitter,receiver,tolerance=3e-14){
  assert.equal(result.status,'interior');
  close(dot(result.normal,result.reflection),result.offset,tolerance);
  relative(result.brokenLengthM,result.lengthM,tolerance);
  relative(result.delayS*core.C,result.lengthM,tolerance);
  const incident=unit(transmitter,result.reflection),outgoing=unit(result.reflection,receiver),tangent=[result.normal[1],-result.normal[0]];
  close(dot(incident,tangent),dot(outgoing,tangent),tolerance);
  close(dot(incident,result.normal),-dot(outgoing,result.normal),tolerance);
}

test('five default positions agree with independent analytic hand fixtures in metres and nanoseconds',()=>{
  const scene=core.scenario();
  assert.equal(scene.status,'valid');assert.equal(scene.samples.length,5);
  assert.deepEqual(scene.transmitter,[0,2]);assert.deepEqual(scene.point,[2,0]);
  assert.deepEqual(scene.wall,{normal:[0,1],offset:0,start:[-2,0],end:[10,0]});
  const fixtures=[
    {index:0,x:5,q:1.666666666667,plane:7.810249675907,ns:26.052188664155,point:7.828427124746},
    {index:2,x:6,q:2,plane:8.485281374239,ns:28.303852040996,point:8.485281374239},
    {index:4,x:7,q:2.333333333333,plane:9.219544457293,ns:30.753090050360,point:9.231551362179}
  ];
  for(const row of fixtures){const sample=scene.samples[row.index];assert.equal(sample.index,row.index);assert.deepEqual(sample.receiver,[row.x,4]);assert.deepEqual(sample.point.point,[2,0]);close(sample.plane.reflection[0],row.q);close(sample.plane.reflection[1],0,0);close(sample.plane.lengthM,row.plane);close(sample.plane.delayS*1e9,row.ns);close(sample.point.lengthM,row.point);relative(sample.point.delayS*core.C,sample.point.lengthM);}
  for(const sample of scene.samples){relative(sample.plane.lengthM,Math.hypot(sample.receiver[0],6));relative(sample.point.lengthM,Math.sqrt(8)+Math.hypot(sample.receiver[0]-2,4));checkReflection(sample.plane,scene.transmitter,sample.receiver);}
});

test('center exactly retains the existing multipath geometry and one-way speed constant',()=>{
  assert.equal(core.C,oldCore.C);assert.equal(core.C,299792458);
  const center=core.scenario().samples[2],original=oldCore.geometry(4);
  assert.deepEqual(center.plane.reflection,original.reflection);
  assert.deepEqual(center.plane.imageTransmitter,original.imageTransmitter);
  assert.equal(center.plane.lengthM,original.reflectedLength);
  assert.equal(center.plane.delayS,original.reflectedDelay);
  assert.equal(center.plane.brokenLengthM,original.brokenLength);
  assert.deepEqual(center.point.point,center.plane.reflection);
  assert.equal(center.point.lengthM,center.plane.lengthM);
  assert.equal(center.point.delayS,center.plane.delayS);
});

test('isolated general helper also agrees with old core throughout its height domain',()=>{
  for(let step=0;step<=590;step++){
    const h=.1+step/100,old=oldCore.geometry(h),g=core.planePath({...base,receiver:[6,h]});
    assert.equal(g.status,'interior');vclose(g.reflection,old.reflection,2e-15);relative(g.lengthM,old.reflectedLength);relative(g.delayS,old.reflectedDelay);relative(g.brokenLengthM,old.brokenLength);
  }
});

test('the allowed aperture and center grid preserves plane and equal-angle laws, fixed S and point-length bound',()=>{
  for(let centerStep=0;centerStep<=60;centerStep++)for(let apertureStep=0;apertureStep<=40;apertureStep++){
    const centerX=2+centerStep/10,apertureM=apertureStep/10,scene=core.scenario({centerX,apertureM});
    assert.equal(scene.status,'valid');assert.equal(scene.samples.length,5);
    for(const sample of scene.samples){
      assert.deepEqual(sample.point.point,[2,0]);assert.equal(sample.point.status,'valid');
      assert.equal(sample.receiver[0],centerX+core.SAMPLE_OFFSETS[sample.index]*apertureM);
      close(sample.plane.reflection[0],sample.receiver[0]/3,9e-16);
      checkReflection(sample.plane,scene.transmitter,sample.receiver);
      assert.ok(sample.point.lengthM>=sample.plane.lengthM-4e-15);
      if(sample.receiver[0]===6)close(sample.point.lengthM,sample.plane.lengthM,0);
    }
  }
});

test('zero aperture has five coincident samples without inventing extra spatial separation',()=>{
  for(const centerX of [2,6,8])for(const wallMode of ['full','short']){
    const scene=core.scenario({centerX,apertureM:0,wallMode});assert.equal(scene.status,'valid');assert.equal(scene.samples.length,5);
    const first=scene.samples[0];
    for(const sample of scene.samples){assert.deepEqual(sample.receiver,first.receiver);assert.deepEqual(sample.point,first.point);assert.deepEqual(sample.plane,first.plane);}
  }
});

test('short wall keeps three interior rays and marks two absent without zero or fabricated physical delays',()=>{
  const scene=core.scenario({wallMode:'short'});
  assert.deepEqual(scene.samples.map(sample=>sample.plane.status),['absent','interior','interior','interior','absent']);
  for(const sample of scene.samples){
    assert.equal(sample.point.status,'valid');
    const g=sample.plane;assert.ok(g.construction.lengthM>0);assert.ok(g.construction.delayS>0);
    if(g.status==='absent'){assert.equal(g.reason,'outside_finite_wall');assert.equal(g.lengthM,null);assert.equal(g.delayS,null);assert.equal(g.brokenLengthM,null);assert.ok(g.reflection[0]<1.8||g.reflection[0]>2.2);}
    else {assert.ok(g.lengthM>0);assert.ok(g.delayS>0);}
  }
});

test('exact endpoints are edge limits, independent of wall endpoint ordering',()=>{
  for(const [wallStart,wallEnd,parameter] of [[[2,0],[4,0],0],[[0,0],[2,0],1],[[4,0],[2,0],1],[[2,0],[0,0],0]]){
    const g=core.planePath({...base,wallStart,wallEnd});assert.equal(g.status,'edge');assert.equal(g.reason,'edge_limit');assert.equal(g.segmentParameter,parameter);assert.deepEqual(g.reflection,[2,0]);assert.ok(g.lengthM>0);assert.ok(g.delayS>0);
  }
});

test('one-ULP interior/outside points are not snapped to a wall edge',()=>{
  const epsilon=Number.EPSILON;
  for(const [wallStart,wallEnd] of [[[2+2*epsilon,0],[4,0]],[[0,0],[2-epsilon,0]],[[4,0],[2+2*epsilon,0]],[[2-epsilon,0],[0,0]]]){
    const g=core.planePath({...base,wallStart,wallEnd});assert.equal(g.status,'absent');assert.equal(g.lengthM,null);assert.equal(g.delayS,null);assert.deepEqual(g.reflection,[2,0]);
  }
  for(const [wallStart,wallEnd] of [[[2-epsilon,0],[4,0]],[[0,0],[2+2*epsilon,0]]])assert.equal(core.planePath({...base,wallStart,wallEnd}).status,'interior');
  const roundedQuotient=core.planePath({...base,wallStart:[-1e16,0],wallEnd:[2-epsilon,0]});
  assert.equal(roundedQuotient.segmentParameter,1);assert.equal(roundedQuotient.status,'absent');assert.equal(roundedQuotient.delayS,null);
});

test('normal sign reversal and explicit normal/offset scaling preserve translated geometry',()=>{
  const translated={transmitter:[3,9],receiver:[9,11],normal:[0,1],offset:7,wallStart:[1,7],wallEnd:[13,7]},expected=core.planePath(translated);
  checkReflection(expected,translated.transmitter,translated.receiver);
  for(const scale of [1,-1,2,-2,5,-5,1e-200,-1e-200,1e200,-1e200]){
    const g=core.planePath({...translated,normal:[0,scale],offset:7*scale});assert.equal(g.status,'interior');vclose(g.reflection,[5,7],4e-15);vclose(g.imageTransmitter,[3,5],4e-15);relative(g.lengthM,expected.lengthM);relative(g.delayS,expected.delayS);close(g.offset,scale>0?7:-7,2e-15);close(Math.hypot(...g.normal),1,0);
  }
});

test('arbitrary rotated/translated planes retain reflection laws and normal-sign equivalence',()=>{
  for(const angle of [0,.1,Math.PI/6,Math.PI/4,Math.PI/2,2.6,Math.PI,4.1,5.9]){
    const cosine=Math.cos(angle),sine=Math.sin(angle),translate=[3,-7],transform=([x,y])=>[translate[0]+cosine*x-sine*y,translate[1]+sine*x+cosine*y],normal=[-sine,cosine],offset=dot(normal,translate);
    const input={transmitter:transform(base.transmitter),receiver:transform(base.receiver),normal,offset,wallStart:transform(base.wallStart),wallEnd:transform(base.wallEnd)},g=core.planePath(input);
    checkReflection(g,input.transmitter,input.receiver,5e-14);vclose(g.reflection,transform([2,0]),8e-15);relative(g.lengthM,Math.sqrt(72));
    for(const scale of [-1,3,-3,1e300,1e-300]){
      const scaled=core.planePath({...input,normal:normal.map(v=>v*scale),offset:offset*scale});assert.equal(scaled.status,'interior');vclose(scaled.reflection,g.reflection,9e-15);relative(scaled.lengthM,g.lengthM);
    }
  }
});

test('same-side negative distances work while opposite signs and exact on-plane endpoints fail',()=>{
  const below={...base,transmitter:[0,-2],receiver:[6,-4]},g=core.planePath(below);
  checkReflection(g,below.transmitter,below.receiver);assert.deepEqual(g.imageTransmitter,[0,2]);assert.deepEqual(g.reflection,[2,0]);relative(g.lengthM,Math.sqrt(72));assert.equal(g.signedDistances.transmitter,-2);assert.equal(g.signedDistances.receiver,-4);
  invalid(core.planePath({...base,transmitter:[0,0]}),'endpoint_on_plane');
  invalid(core.planePath({...base,receiver:[6,0]}),'endpoint_on_plane');
  invalid(core.planePath({...base,receiver:[6,-4]}),'opposite_halfspaces');
  invalid(core.planePath({...base,transmitter:[0,-2]}),'opposite_halfspaces');
});

test('strict same-halfspace checks do not multiply distances that can underflow or overflow',()=>{
  for(const magnitude of [1e-200,1e200]){
    const input={...base,transmitter:[0,magnitude],receiver:[1,2*magnitude]},g=core.planePath(input);
    assert.equal(g.status,'interior');assert.ok(g.lengthM>0);assert.ok(g.delayS>0);
    relative(g.lengthM,Math.hypot(1,3*magnitude));
    invalid(core.planePath({...input,receiver:[1,-2*magnitude]}),'opposite_halfspaces');
  }
});

test('wall endpoints must be on the same normalized plane and the wall must have nonzero extent',()=>{
  invalid(core.planePath({...base,wallStart:[0,.01]}),'wall_not_on_plane');
  invalid(core.planePath({...base,wallEnd:[10,.01]}),'wall_not_on_plane');
  invalid(core.planePath({...base,wallStart:[2,0],wallEnd:[2,0]}),'zero_length_wall');
  invalid(core.planePath({...base,normal:[0,0]}),'zero_normal');
  invalid(core.planePath({...base,normal:[0,2],offset:2}),'wall_not_on_plane');
  assert.equal(core.planePath({...base,wallStart:base.wallEnd,wallEnd:base.wallStart}).status,'interior');
});

test('plane inputs reject malformed, sparse, inherited-entry and nonfinite coordinate vectors',()=>{
  for(const input of [undefined,null,[],true,0,'plane'])invalid(core.planePath(input),'invalid_options');
  const inherited=Array(2);Object.setPrototypeOf(inherited,{0:0,1:2,__proto__:Array.prototype});
  for(const key of ['transmitter','receiver','normal','wallStart','wallEnd'])for(const value of [undefined,null,[],[0],[0,1,2],Array(2),inherited,[NaN,1],[0,Infinity],[0,-Infinity],[0,'1'],[false,1]])invalid(core.planePath({...base,[key]:value}));
  for(const offset of [undefined,null,NaN,Infinity,'0',false])invalid(core.planePath({...base,offset}),'nonfinite_input');
  for(const extra of [{typo:0},{[Symbol('offset')]:0}])invalid(core.planePath({...base,...extra}),'unknown_parameter');
});

test('point path is a fixed two-leg one-way path and rejects invalid/singular input',()=>{
  const input={transmitter:[0,2],receiver:[6,4],point:[2,0]},result=core.pointPath(input);
  assert.equal(result.status,'valid');assert.deepEqual(result.point,[2,0]);relative(result.lengthM,Math.sqrt(72));relative(result.delayS,result.lengthM/oldCore.C);
  for(const value of [undefined,null,[],true,'point'])invalid(core.pointPath(value),'invalid_options');
  for(const key of ['transmitter','receiver','point'])for(const value of [null,[],Array(2),[0,NaN],[Infinity,0],['0',1]])invalid(core.pointPath({...input,[key]:value}));
  invalid(core.pointPath({...input,point:input.transmitter}),'zero_length_leg');
  invalid(core.pointPath({...input,point:input.receiver}),'zero_length_leg');
  invalid(core.pointPath({...input,typo:1}),'unknown_parameter');
});

test('unrepresentable derived arithmetic is explicit invalid data rather than NaN/Infinity or zero travel time',()=>{
  invalid(core.planePath({...base,normal:[1e-300,1e300]}),'numerical_range');
  invalid(core.planePath({...base,normal:[0,Number.MIN_VALUE],offset:Number.MAX_VALUE}),'numerical_range');
  invalid(core.planePath({...base,normal:[0,Number.MAX_VALUE],offset:Number.MIN_VALUE}),'numerical_range');
  invalid(core.planePath({...base,transmitter:[0,Number.MAX_VALUE],receiver:[6,Number.MAX_VALUE]}),'numerical_range');
  invalid(core.planePath({...base,wallStart:[-Number.MAX_VALUE,0],wallEnd:[Number.MAX_VALUE,0]}),'numerical_range');
  invalid(core.pointPath({transmitter:[Number.MAX_VALUE,0],receiver:[0,1],point:[-Number.MAX_VALUE,0]}),'numerical_range');
  invalid(core.pointPath({transmitter:[0,0],receiver:[2*Number.MIN_VALUE,0],point:[Number.MIN_VALUE,0]}),'numerical_range');
});

test('scenario validates the exact supported controls with explicit empty invalid output',()=>{
  for(const input of [null,[],true,'scene',{centerX:NaN},{centerX:1.99},{centerX:8.01},{apertureM:-.01},{apertureM:4.01},{apertureM:Infinity},{centerX:'6'},{apertureM:undefined},{wallMode:'infinite'},{wallMode:null},{typo:1},{[Symbol('centerX')]:6}]){
    const scene=core.scenario(input);assert.equal(scene.status,'invalid');assert.ok(scene.reason);assert.deepEqual(scene.samples,[]);assert.equal(scene.wall,null);
  }
  for(const centerX of [2,8])for(const apertureM of [0,4])assert.equal(core.scenario({centerX,apertureM}).status,'valid');
});

test('pure helpers do not mutate input or leak mutable scene defaults across calls',()=>{
  const frozen=Object.freeze(Object.fromEntries(Object.entries(base).map(([key,value])=>[key,Array.isArray(value)?Object.freeze(value.slice()):value])));
  assert.equal(core.planePath(frozen).status,'interior');
  const result=core.planePath(base);result.reflection[0]=99;result.normal[1]=99;assert.deepEqual(base.normal,[0,1]);assert.deepEqual(core.planePath(base).reflection,[2,0]);
  const scene=core.scenario();scene.transmitter[0]=100;scene.point[0]=100;scene.wall.start[0]=100;scene.samples[0].receiver[0]=100;
  const next=core.scenario();assert.deepEqual(next.transmitter,[0,2]);assert.deepEqual(next.point,[2,0]);assert.deepEqual(next.wall.start,[-2,0]);assert.deepEqual(next.samples[0].receiver,[5,4]);
  assert.throws(()=>{core.DEFAULTS.centerX=0;},TypeError);assert.throws(()=>{core.SAMPLE_OFFSETS[0]=0;},TypeError);
});

test('browser export uses the existing core speed constant and has no receiver/measurement dependency',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../reflection-aperture-core.js'),'utf8'),channelSource=fs.readFileSync(path.join(__dirname,'../multipath-channel-core.js'),'utf8'),box={window:{}};
  vm.runInNewContext(channelSource,box);const before=box.window.MultipathChannelCore;
  vm.runInNewContext(source,box);assert.equal(box.window.MultipathChannelCore,before);assert.equal(box.window.ReflectionApertureCore.C,before.C);assert.equal(box.window.ReflectionApertureCore.scenario().status,'valid');
  assert.deepEqual(Object.keys(box.window.ReflectionApertureCore).sort(),['APERTURE_DOMAIN','C','CENTER_DOMAIN','DEFAULTS','SAMPLE_OFFSETS','planePath','pointPath','scenario']);
  assert.throws(()=>vm.runInNewContext(source,{window:{}}),/requires MultipathChannelCore/);
  const alternate={window:{MultipathChannelCore:{C:123}}};vm.runInNewContext(source,alternate);assert.equal(alternate.window.ReflectionApertureCore.C,123);close(alternate.window.ReflectionApertureCore.scenario().samples[2].point.delayS,Math.sqrt(72)/123);
});
