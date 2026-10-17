import {makeData,runAsync} from './kernel.mjs';
import {validateConfig} from './controller.mjs';
export async function compute(message,emit,{make=makeData,run=runAsync}={}){
 const id=message?.id;
 try{if(message?.type!=='run'||!Number.isInteger(id))throw Error('invalid worker request');const config=validateConfig(message.config);const start=performance.now();const data=make(config.preset,config.seed);const result=await run(data,{budgetMs:8,onProgress:p=>emit({id,type:'progress',phase:p.phase})});emit({id,type:'result',result,elapsedMs:performance.now()-start});}
 catch(e){emit({id,type:'error',message:e.message});}
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=e=>compute(e.data,m=>self.postMessage(m));
