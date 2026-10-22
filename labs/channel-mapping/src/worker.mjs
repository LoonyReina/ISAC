import {solveCase} from './experiment.mjs';
self.onmessage=event=>{
  const {requestId,revision,config}=event.data||{};
  const start=performance.now();
  try{const result=solveCase(config);self.postMessage({type:'result',requestId,revision,result,elapsed_ms:performance.now()-start});}
  catch(error){self.postMessage({type:'error',requestId,revision,message:error instanceof Error?error.message:String(error)});}
};
