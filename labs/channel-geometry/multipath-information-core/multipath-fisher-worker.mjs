/* ES module Worker adapter. Each new request replaces prior computation. Parent
 * UI must clear stale output synchronously before posting and check requestId. */
import {computeSceneAsync,computeSweep,replayRecord} from './multipath-fisher-core.mjs';
let generation=0,active=null;
self.addEventListener('message',async({data})=>{
  if(!data||typeof data!=='object')return;
  if(data.type==='cancel'){active?.abort();generation++;return;}
  if(!['scene','sweep','replay'].includes(data.type))return;
  active?.abort();const token=++generation;active=new AbortController();
  const signal=active.signal,requestId=String(data.requestId??`worker-${token}`);
  const options={requestId,signal,shouldCancel:()=>token!==generation,onProgress:progress=>{
    if(token===generation&&!signal.aborted)self.postMessage({type:'progress',requestId,progress});
  }};
  const record=await (data.type==='scene'?computeSceneAsync(data.input,options):data.type==='sweep'?computeSweep(data.input,options):replayRecord(data.record,options));
  // Cancelled receipts retain all sweep points and must be ignored by result UI.
  if(token!==generation||signal.aborted)self.postMessage({type:'cancelled-receipt',requestId,record});
  else self.postMessage({type:'result',requestId,record});
});
