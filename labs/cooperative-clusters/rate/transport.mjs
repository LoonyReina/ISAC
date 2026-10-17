import {matches} from './controller.mjs';
export function executeWorker(envelope,{signal,onProgress}){
  return new Promise((resolve,reject)=>{
    let worker;
    const cleanup=()=>{worker?.terminate();signal.removeEventListener('abort',cancel);};
    const cancel=()=>{worker?.postMessage({type:'cancel'});cleanup();reject(new DOMException('Cancelled','AbortError'));};
    if(signal.aborted){cancel();return;}
    try{worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});}catch(error){reject(error);return;}
    signal.addEventListener('abort',cancel,{once:true});
    worker.onerror=()=>{cleanup();reject(new Error('Worker could not run'));};
    worker.onmessageerror=()=>{cleanup();reject(new Error('Worker response unreadable'));};
    worker.onmessage=({data})=>{
      if(!matches(data,envelope)||signal.aborted)return;
      if(data.type==='progress')onProgress(data);
      if(data.type==='result'){cleanup();resolve(data);}
      if(data.type==='error'){cleanup();reject(new Error(data.error));}
    };
    worker.postMessage({type:'run',envelope});
  });
}
