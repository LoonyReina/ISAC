/* Regression for independent review of v1. Real Node module Worker; only the
 * newer request's transport is held so the older completion becomes deferred. */
import {Worker} from 'node:worker_threads';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {SensingOtfsClient} from '../worker/client.js';
const url=new URL('../worker/receiver-worker.js',import.meta.url),sleep=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
for(const action of ['cancel','supersede','release','dispose','transport_failure','restart']){
 const real=new Worker(url,{type:'module'}),relay=new EventEmitter(),queued=[],notified=[];
 relay.postMessage=x=>{if(x.id==='newer')queued.push(x);else real.postMessage(x);};relay.terminate=()=>real.terminate();
 real.on('message',e=>relay.emit('message',e));real.on('error',e=>relay.emit('error',e));real.on('exit',e=>relay.emit('exit',e));
 const client=new SensingOtfsClient(relay,{onEvent:e=>notified.push(e),createWorker:()=>new Worker(url,{type:'module'})});
 try{
  await client.ready;const config={shape:[2,3],physicalSupport:[[0,0]],priorPowers:[1],maxIterations:1};
  const old=client.run(config,{id:'older'}),newer=client.run(config,{id:'newer'});
  // Attach error handlers before a transport-failure experiment to avoid an
  // unhandled rejection while independently checking both request outcomes.
  const oldResult=old.result.then(value=>({value}),error=>({error}));const newResult=newer.result.then(value=>({value}),error=>({error}));
  const until=Date.now()+3000;while(!client.pending.get('older')?.deferred){assert.ok(Date.now()<until,'Expected deferred completion');await sleep(1);}
  const expected=client.pending.get('older').deferred.result;assert.equal(expected.frames[0].records.length,4);
  const noticesBefore=notified.length;
  // A completed old request must never overwrite the newer request's UI cache.
  const sentinel={currentRequest:'newer'};client.lastPartial=sentinel;
  if(action==='cancel')old.cancel();
  else if(action==='supersede')real.postMessage(queued.shift());
  else if(action==='release')await client.release().result;
  else if(action==='dispose')await client.dispose();
  else if(action==='transport_failure')await real.terminate();
  else await client.restart();
  const settled=await oldResult,terminal=settled.value??settled.error;
  assert.ok(terminal.partial,'Old request retains evidence');assert.deepEqual(terminal.partial,expected,'Preserve full completed probabilities/history/raw frame, not an earlier partial');
  assert.equal(terminal.partial.frames[0].records.length,4);assert.equal(terminal.partial.status,'complete');
  assert.ok(!notified.slice(noticesBefore).some(e=>e.id==='older'&&['complete','cancelled','superseded'].includes(e.type)),'Older terminal must not update current UI');
  if(action==='cancel'){assert.equal(terminal.type,'cancelled');assert.equal(client.lastPartial,sentinel);real.postMessage(queued.shift());}
  if(action==='supersede')assert.equal(terminal.type,'superseded');
  if(action==='release'){assert.equal(terminal.type,'cancelled');real.postMessage(queued.shift());}
  if(action==='dispose'||action==='restart')assert.equal(terminal.type,'cancelled');
  if(action==='transport_failure')assert.equal(terminal.code,'WORKER_EXITED');
  await newResult;
  if(action==='restart'){await client.ready;assert.equal((await client.run(config).result).type,'complete');}
  checks.push({action,pass:true,retainedRecords:4,retainedStatus:'complete',oldResultNotNotifiedAsCurrent:true});
 }finally{await client.dispose();}
}
fs.writeFileSync(new URL('../reports/deferred-client-tests.json',import.meta.url),JSON.stringify({allPassed:true,transport:'Actual Node module Worker; newer transport selectively held',checks,total:checks.length},null,2)+'\n');console.log(`${checks.length} deferred-completion evidence/fencing regressions passed`);
