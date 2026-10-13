import {Worker} from 'node:worker_threads';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {SensingOtfsClient} from '../worker/client.js';
import {decode,sha256} from '../js/codec.js';
const client=new SensingOtfsClient(new Worker(new URL('../worker/receiver-worker.js',import.meta.url),{type:'module'}));const checks=[];
try{
 await client.ready;
 for(const seed of [0,1,918273]){
  const job=client.run({shape:[4,7],physicalSupport:[[0,0],[1,-1]],priorPowers:[0,0],pilotIndex:[1,3],seed,maxIterations:5});
  const complete=await job.result;assert.equal(complete.type,'complete');const raw=complete.result.frames[0].trueGainsEvaluationOnly;
  const exported=(await client.exportResult(job.id).result).result;assert.equal(exported.sha256,await sha256(exported.text));const decoded=decode(exported.text);
  assert.deepEqual(decoded,complete.result,'Export must preserve every raw IEEE-754 value, including signed zeros');
  for(let i=0;i<raw.length;i++)assert.ok(Object.is(raw[i],decoded.frames[0].trueGainsEvaluationOnly[i]));
  checks.push({seed,pass:true,negativeZeros:Array.from(raw).filter(v=>Object.is(v,-0)).length,roundTripExact:true});
 }
 assert.ok(checks.some(x=>x.negativeZeros>0),'Fixture must actually exercise a signed zero');
 fs.writeFileSync(new URL('../reports/signed-zero-worker-tests.json',import.meta.url),JSON.stringify({allPassed:true,codec:'sensing-otfs-finite-typed-json-v2',total:checks.length,checks},null,2)+'\n');console.log(`${checks.length} all-zero-population actual-Worker exact export round trips passed`);
}finally{await client.dispose();}
