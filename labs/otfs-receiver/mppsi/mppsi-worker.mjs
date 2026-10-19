import {runPaired,replayPaired} from './mppsi-kernel.mjs';
self.onmessage=({data})=>{try{const result=Object.hasOwn(data,'record')?replayPaired(data.record):runPaired(data.config);self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:String(error.message||error)});}};
