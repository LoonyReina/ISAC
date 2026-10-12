/* Known-geometry, five-position single-bounce illustration. SI units throughout.
 * No observations, receiver, amplitude model, fitting or object identification.
 * A reflecting line in this 2D cross-section is n . x = b. Both n and b are
 * normalized together. Invalid geometry is explicit; no invalid path has tau=0.
 */
(function(root){
'use strict';
const channel=typeof module!=='undefined'&&module.exports?require('./multipath-channel-core.js'):root&&root.MultipathChannelCore;
if(!channel||!Number.isFinite(channel.C)||channel.C<=0)throw new Error('ReflectionApertureCore requires MultipathChannelCore');
const C=channel.C;
const DEFAULTS=Object.freeze({centerX:6,apertureM:2,wallMode:'full'});
const CENTER_DOMAIN=Object.freeze([2,8]),APERTURE_DOMAIN=Object.freeze([0,4]);
const SAMPLE_OFFSETS=Object.freeze([-.5,-.25,0,.25,.5]);

function fail(reason){const error=new RangeError(reason);error.geometryReason=reason;throw error;}
function finite(value){if(typeof value!=='number'||!Number.isFinite(value))fail('nonfinite_input');return value;}
function vector(value){
  if(!Array.isArray(value)||value.length!==2||!Object.hasOwn(value,0)||!Object.hasOwn(value,1))fail('invalid_vector');
  return [finite(value[0]),finite(value[1])];
}
function options(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('invalid_options');
  for(const key of Reflect.ownKeys(value))if(!keys.includes(key))fail('unknown_parameter');
  return value;
}
function finiteResult(...values){if(values.some(value=>!Number.isFinite(value)))fail('numerical_range');}
function difference(a,b){const out=[a[0]-b[0],a[1]-b[1]];finiteResult(...out);return out;}
function dot(a,b){const out=a[0]*b[0]+a[1]*b[1];finiteResult(out);return out;}
function length(a,b){const out=Math.hypot(...difference(a,b));finiteResult(out);return out;}
function travelTime(pathLength){const delay=pathLength/C;if(!(delay>0)||!Number.isFinite(delay))fail('numerical_range');return delay;}
function signedDistance(position,normal,offset){const out=dot(position,normal)-offset;finiteResult(out);return out;}
function normalizePlane(inputNormal,inputOffset){
  const normal=vector(inputNormal),offset=finite(inputOffset),scale=Math.max(Math.abs(normal[0]),Math.abs(normal[1]));
  if(scale===0)fail('zero_normal');
  const scaled=[normal[0]/scale,normal[1]/scale],magnitude=Math.hypot(...scaled);
  const unit=scaled.map(value=>value/magnitude);
  // Avoid overflowing |n| for large normals, or forming its reciprocal for tiny ones.
  const b=scale>=1?(offset/scale)/magnitude:(offset/magnitude)/scale;
  finiteResult(...unit,b);
  if(normal.some((value,index)=>value!==0&&unit[index]===0))fail('numerical_range');
  if(offset!==0&&b===0)fail('numerical_range');
  return {normal:unit,offset:b};
}
function assertCoplanar(position,normal,offset){
  const residual=signedDistance(position,normal,offset);
  // This tolerance validates arithmetic in the plane equation only. It is NEVER
  // used for halfspace tests, wall membership, snapping Q, or replacing a delay.
  const arithmeticScale=Math.max(Math.abs(normal[0]*position[0]),Math.abs(normal[1]*position[1]),Math.abs(offset));
  const tolerance=8*Number.EPSILON*arithmeticScale;
  if(Math.abs(residual)>tolerance)fail('wall_not_on_plane');
}
function invalidPlane(reason){
  return {status:'invalid',reason,normal:null,offset:null,signedDistances:null,imageTransmitter:null,reflection:null,segmentParameter:null,lengthM:null,delayS:null,brokenLengthM:null,construction:null};
}
function invalidPoint(reason){return {status:'invalid',reason,point:null,lengthM:null,delayS:null};}
function invalidScenario(reason){return {status:'invalid',reason,centerX:null,apertureM:null,wallMode:null,transmitter:null,point:null,wall:null,samples:[]};}
function guarded(run,invalid){
  try{return run();}catch(error){if(error&&error.geometryReason)return invalid(error.geometryReason);throw error;}
}

function pointPath(input){
  return guarded(()=>{
    options(input,['transmitter','receiver','point']);
    const transmitter=vector(input.transmitter),receiver=vector(input.receiver),point=vector(input.point);
    const first=length(transmitter,point),second=length(point,receiver);
    if(first===0||second===0)fail('zero_length_leg');
    const lengthM=first+second;finiteResult(lengthM);
    return {status:'valid',reason:null,point,lengthM,delayS:travelTime(lengthM)};
  },invalidPoint);
}

function planePath(input){
  return guarded(()=>{
    options(input,['transmitter','receiver','normal','offset','wallStart','wallEnd']);
    const transmitter=vector(input.transmitter),receiver=vector(input.receiver);
    const {normal,offset}=normalizePlane(input.normal,input.offset);
    const start=vector(input.wallStart),end=vector(input.wallEnd),wallDelta=difference(end,start),wallLength=Math.hypot(...wallDelta);
    finiteResult(wallLength);
    if(wallLength===0)fail('zero_length_wall');
    assertCoplanar(start,normal,offset);assertCoplanar(end,normal,offset);
    const dT=signedDistance(transmitter,normal,offset),dR=signedDistance(receiver,normal,offset);
    if(dT===0||dR===0)fail('endpoint_on_plane');
    // Multiplying signed distances would underflow/overflow for otherwise valid geometry.
    if((dT>0)!==(dR>0))fail('opposite_halfspaces');
    const distanceScale=Math.max(Math.abs(dT),Math.abs(dR));
    const scaledT=Math.abs(dT)/distanceScale,scaledR=Math.abs(dR)/distanceScale,t=scaledT/(scaledT+scaledR);
    if(!(t>0&&t<1))fail('numerical_range');
    // Keep the factor two last so a zero normal component does not become 0*Infinity.
    const imageTransmitter=transmitter.map((value,index)=>value-2*(dT*normal[index]));
    finiteResult(...imageTransmitter);
    const unfolded=difference(receiver,imageTransmitter);
    const reflection=imageTransmitter.map((value,index)=>value+t*unfolded[index]);
    finiteResult(...reflection);
    const constructionLength=Math.hypot(...unfolded),brokenLength=length(transmitter,reflection)+length(reflection,receiver);
    finiteResult(constructionLength,brokenLength);
    if(!(constructionLength>0))fail('numerical_range');
    const construction={lengthM:constructionLength,delayS:travelTime(constructionLength),brokenLengthM:brokenLength};
    const wallUnit=wallDelta.map(value=>value/wallLength);
    const fromStart=dot(difference(reflection,start),wallUnit),fromEnd=dot(difference(reflection,end),wallUnit);
    const segmentParameter=fromStart/wallLength;finiteResult(segmentParameter);
    // Test BOTH signed endpoint projections. A quotient can round to 1 even when
    // Q is one representable step beyond B. There is no membership epsilon.
    const status=fromStart<0||fromEnd>0?'absent':fromStart===0||fromEnd===0?'edge':'interior';
    const supported=status!=='absent';
    return {
      status,reason:status==='absent'?'outside_finite_wall':status==='edge'?'edge_limit':null,
      normal,offset,signedDistances:{transmitter:dT,receiver:dR},imageTransmitter,reflection,segmentParameter,
      lengthM:supported?construction.lengthM:null,delayS:supported?construction.delayS:null,brokenLengthM:supported?construction.brokenLengthM:null,
      construction
    };
  },invalidPlane);
}

function scenario(input={}){
  return guarded(()=>{
    options(input,['centerX','apertureM','wallMode']);
    const config={...DEFAULTS,...input},centerX=finite(config.centerX),apertureM=finite(config.apertureM),wallMode=config.wallMode;
    if(centerX<CENTER_DOMAIN[0]||centerX>CENTER_DOMAIN[1])fail('center_outside_domain');
    if(apertureM<APERTURE_DOMAIN[0]||apertureM>APERTURE_DOMAIN[1])fail('aperture_outside_domain');
    if(wallMode!=='full'&&wallMode!=='short')fail('invalid_wall_mode');
    const transmitter=[0,2],point=[2,0],wall={normal:[0,1],offset:0,start:wallMode==='short'?[1.8,0]:[-2,0],end:wallMode==='short'?[2.2,0]:[10,0]};
    const samples=SAMPLE_OFFSETS.map((fraction,index)=>{
      const receiver=[centerX+fraction*apertureM,4];
      return {index,receiver,point:pointPath({transmitter,receiver,point}),plane:planePath({transmitter,receiver,normal:wall.normal,offset:wall.offset,wallStart:wall.start,wallEnd:wall.end})};
    });
    if(samples.some(sample=>sample.point.status==='invalid'||sample.plane.status==='invalid'))fail('numerical_range');
    return {status:'valid',reason:null,centerX,apertureM,wallMode,transmitter,point,wall,samples};
  },invalidScenario);
}

const api=Object.freeze({C,DEFAULTS,CENTER_DOMAIN,APERTURE_DOMAIN,SAMPLE_OFFSETS,pointPath,planePath,scenario});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.ReflectionApertureCore=api;
})(typeof window!=='undefined'?window:null);
