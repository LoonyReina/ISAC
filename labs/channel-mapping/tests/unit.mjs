import assert from 'node:assert/strict';
import {DEFAULTS,caseConfig,inferenceConfig,C} from '../src/config.mjs';
import {generateCase,createNamedStream,nearestDelayBin,fnv1a32} from '../src/generator.mjs';
import {infer,localMaxima,detectPeaks,groupDetections,associate} from '../src/inference.mjs';
import {backproject,rangeFromNs,excessDelayNs} from '../src/geometry.mjs';
import {evaluate,matchGroups} from '../src/evaluation.mjs';
import {solveCaptured} from '../src/experiment.mjs';
let checks=0;
function test(name,fn){fn();checks++;console.log(`PASS ${name}`);}
const approx=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`);
const clone=value=>structuredClone(value);
test('plateau leftmost / endpoints excluded',()=>assert.deepEqual(localMaxima([3,0,2,2,0,1,0,3]),[2,5]));
test('all-flat has no peak',()=>assert.deepEqual(localMaxima([2,2,2,2]),[]));
test('nearest exact midpoint chooses earlier',()=>assert.equal(nearestDelayBin([0,.25,.5],.125),0));
test('roundtrip range units',()=>approx(rangeFromNs(10),C*5e-9));
test('opposite-facing station geometry',()=>{const a=backproject(1,[0,0],30,2),b=backproject(2,[4,0],30,2);approx(a[0],Math.sqrt(3));approx(a[1],-1);approx(b[0],4-Math.sqrt(3));approx(b[1],-1);});
test('LoS segment has zero excess delay',()=>approx(excessDelayNs([1,0],[0,0],[4,0]),0));
test('zero gate retains exact equality',()=>assert.equal(associate([{id:'m',excess_ns:1}],[{group_id:'g',excess_ns:1}],0)[0].status,'unique'));
test('multiple candidates abstain',()=>assert.equal(associate([{id:'m',excess_ns:1}],[{group_id:'g',excess_ns:1},{group_id:'h',excess_ns:1}],0)[0].status,'ambiguous'));
test('unavailable predictions not coerced to zero',()=>assert.equal(associate([{id:'m',excess_ns:0}],[{group_id:'g',excess_ns:null}],1)[0].status,'unmatched'));
const sampleStation={id:1,position_m:[0,0],angles_deg:[0],delays_ns:[0,1,2,3,4,5,6],power_db:[[-80,-20,-80,-40,-80,-45,-80]]};
test('separation then range then K explicit order',()=>{const out=detectPeaks(sampleStation,{...inferenceConfig(),minSeparationNs:2.2,minRangeM:.4});assert.deepEqual(out.peaks.map(p=>p.bin_index),[5]);});
test('K zero yields no detections',()=>assert.equal(detectPeaks(sampleStation,{...inferenceConfig(),maxPeaksPerAngle:0}).peaks.length,0));
const point=(id,x,station=1,power=-40,row=0)=>({id,station_id:station,row_index:row,bin_index:0,power_db:power,point_m:[x,0],range_m:x,angle_deg:0,delay_ns:1});
test('connected-component chaining is transitive',()=>assert.equal(groupDetections([point('a',0),point('b',.4),point('c',.8)],.45).length,1));
test('strongest station representatives equally averaged',()=>{const g=groupDetections([point('a',0,1,-35),point('b',.1,1,-45),point('c',.2,2,-50)],.45)[0];assert.equal(g.representatives.length,2);approx(g.point_m[0],.1);});
test('zero-radius equal-coordinate grouping',()=>assert.equal(groupDetections([point('a',1),point('b',1,2),point('c',1.1)],0).length,2));
test('integer seed enforcement',()=>assert.throws(()=>generateCase({seed:1.5})));
test('finite noise enforcement',()=>assert.throws(()=>generateCase({noise:NaN})));
test('noise range enforcement',()=>assert.throws(()=>generateCase({noise:3.1})));
test('K integer enforcement',()=>assert.throws(()=>caseConfig({maxPeaksPerAngle:1.5})));
test('FNV uint32 arithmetic independently uses BigInt',()=>{let state=2166136261n;for(const b of new TextEncoder().encode('hello'))state=((state^BigInt(b))*16777619n)&0xffffffffn;assert.equal(fnv1a32('hello'),Number(state));});
test('named streams repeat independently',()=>{const a=createNamedStream(101,'separated','communication-time/C'),first=[a.nextUint32(),a.nextUint32()];createNamedStream(101,'separated','floor/station-1').nextUint32();const b=createNamedStream(101,'separated','communication-time/C');assert.deepEqual(first,[b.nextUint32(),b.nextUint32()]);});
const generated=generateCase(DEFAULTS),inference=infer(generated.observations,DEFAULTS);
test('generator shape and explicit origins',()=>{assert.equal(generated.observations.stations.length,2);assert.equal(generated.observations.stations[0].power_db.length,25);assert.equal(generated.observations.stations[0].power_db[0].length,161);assert.equal(generated.observations.communication.length,4);});
test('deterministic repeat full observations',()=>assert.deepEqual(generateCase(DEFAULTS),generated));
test('truth is not an inference parameter',()=>{const mutated=clone(generated);mutated.truth.objects.reverse();mutated.truth.communication.forEach(m=>{m.object_id=null;});assert.deepEqual(infer(mutated.observations,DEFAULTS),inference);});
test('unknown physical identity fields ignored by inference',()=>{const obs=clone(generated.observations);obs.truth={objects:[{id:'fabricated',x:999,y:999}]};assert.deepEqual(infer(obs,DEFAULTS),inference);});
test('ambiguous input delay origin rejected',()=>{const obs=clone(generated.observations);obs.delay_origin='strongest-path-normalized';assert.throws(()=>infer(obs));});
test('missing station representative baseline unavailable',()=>{const obs=clone(generated.observations);obs.stations[1].power_db.forEach(row=>row.fill(-85));const r=infer(obs);assert.ok(r.groups.length>0);assert.ok(r.branches.paired_range.predictions.every(p=>p.excess_ns===null));assert.ok(r.branches.coordinate.predictions.every(p=>Number.isFinite(p.excess_ns)));});
test('empty inference reports null errors, not success',()=>{const result=infer(generated.observations,{maxPeaksPerAngle:0}),e=evaluate(result,generated.truth);assert.equal(e.metrics.coordinate.delay_rmse_ns,null);assert.equal(e.metrics.coordinate.recall,0);assert.equal(e.metrics.coordinate.false_association_rate,null);assert.equal(e.metrics.coordinate.missed_truth_objects,3);});
test('captured observations are not regenerated',()=>{const obs=clone(generated.observations);obs.communication[0].excess_ns=123;const r=solveCaptured(obs,{},generated.truth);assert.equal(r.observations.communication[0].excess_ns,123);assert.equal(r.provenance.source,'captured-observations-no-regeneration');});
const malformed=[
 ['duplicate truth MPC ID',t=>{t.communication[1].id=t.communication[0].id;}],
 ['extra truth MPC',t=>{t.communication.push({id:'extra',object_id:'A',identifiable:true});}],
 ['missing truth MPC',t=>{t.communication.pop();}],
 ['wrong truth MPC ID',t=>{t.communication[0].id='wrong';}],
 ['unknown truth object reference',t=>{t.communication[0].object_id='unknown';}],
 ['nonboolean MPC identifiable',t=>{t.communication[0].identifiable=1;}],
 ['missing MPC identifiable',t=>{delete t.communication[0].identifiable;}],
 ['duplicate truth object ID',t=>{t.objects[1].id=t.objects[0].id;}],
 ['nonboolean object identifiable',t=>{t.objects[0].identifiable='yes';}],
 ['invalid object position',t=>{t.objects[0].x=NaN;}],
 ['invalid object time',t=>{t.objects[0].true_excess_ns=Infinity;}],
 ['inconsistent identifiability',t=>{t.communication[0].identifiable=false;}],
 ['identifiable clutter',t=>{t.communication[3].identifiable=true;}],
 ['null truth object',t=>{t.objects[0]=null;}],
 ['null truth MPC',t=>{t.communication[0]=null;}]
];
for(const [name,mutate]of malformed)test(`malformed captured rejected: ${name}`,()=>{const t=clone(generated.truth);mutate(t);assert.throws(()=>evaluate(inference,t));});
test('truth row order cannot change denominators',()=>{const t=clone(generated.truth);t.communication.reverse();t.objects.reverse();assert.deepEqual(evaluate(inference,t).metrics,evaluate(inference,generated.truth).metrics);});
test('truth matching prioritizes cardinality over local greedy',()=>{const objects=[{id:'A',x:0,y:0,true_excess_ns:0},{id:'B',x:1,y:0,true_excess_ns:0}];const groups=[{id:'g1',point_m:[.4,0]},{id:'g2',point_m:[0,0]}];const matched=matchGroups(groups,objects,.6);assert.equal(matched.length,2);assert.equal(matched.find(m=>m.group_id==='g1').object_id,'B');});

test('nonidentifiable hidden-ID hits and clutter remain false unique',()=>{
  const objects=[{id:'A',x:0,y:0,true_excess_ns:1,sensing_visible:true,identifiable:true},{id:'B',x:1,y:1,true_excess_ns:2,sensing_visible:true,identifiable:false},{id:'C',x:2,y:2,true_excess_ns:2,sensing_visible:true,identifiable:false}];
  const groups=objects.map(o=>({id:`g${o.id}`,point_m:[o.x,o.y]}));
  const predictions=objects.map(o=>({group_id:`g${o.id}`,point_m:[o.x,o.y],excess_ns:o.true_excess_ns}));
  const associations=[{mpc_id:'m0',status:'unique',assigned_group_id:'gA'},{mpc_id:'m1',status:'unique',assigned_group_id:'gB'},{mpc_id:'m2',status:'ambiguous',assigned_group_id:null},{mpc_id:'m3',status:'unique',assigned_group_id:'gA'}];
  const truth={objects,communication:[{id:'m0',object_id:'A',identifiable:true},{id:'m1',object_id:'B',identifiable:false},{id:'m2',object_id:'C',identifiable:false},{id:'m3',object_id:null,identifiable:false}]};
  const metrics=evaluate({groups,branches:{coordinate:{predictions,associations}}},truth).metrics.coordinate;
  assert.equal(metrics.correct_unique,1);assert.equal(metrics.false_unique,2);assert.equal(metrics.nonidentifiable_unique,1);approx(metrics.recall,1/3);approx(metrics.false_association_rate,2/3);
});
test('missing prediction changes coverage and is excluded from RMSE',()=>{
  const objects=[{id:'A',x:1,y:1,true_excess_ns:1,sensing_visible:true,identifiable:true},{id:'B',x:3,y:1,true_excess_ns:3,sensing_visible:true,identifiable:true}];
  const groups=objects.map(o=>({id:`g${o.id}`,point_m:[o.x,o.y]})),associations=objects.map((o,i)=>({mpc_id:`m${i}`,status:'unmatched',assigned_group_id:null}));
  const coordinate={associations,predictions:objects.map(o=>({group_id:`g${o.id}`,point_m:[o.x,o.y],excess_ns:o.true_excess_ns}))};
  const paired_range={associations,predictions:[{group_id:'gA',point_m:null,excess_ns:2},{group_id:'gB',point_m:null,excess_ns:null}]};
  const truth={objects,communication:objects.map((o,i)=>({id:`m${i}`,object_id:o.id,identifiable:true}))};
  const metrics=evaluate({groups,branches:{coordinate,paired_range}},truth).metrics;
  assert.equal(metrics.coordinate.prediction_coverage_among_matched_objects,1);assert.equal(metrics.paired_range.prediction_coverage_among_matched_objects,.5);assert.equal(metrics.paired_range.available_matched_predictions,1);assert.equal(metrics.paired_range.delay_rmse_ns,1);
});
console.log(JSON.stringify({status:'PASS',checks,scope:'self-authored focused units; not independent oracle, representative batch or browser evidence'}));
