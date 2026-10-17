import {createTeachingEngine} from './otfs-core.mjs';
import fixture from './fixed-frame.mjs';
let engine;
self.onmessage=async({data})=>{
  try {
    if(!engine){self.postMessage({type:'progress',message:'正在建立 6,561 个候选模板…'});engine=createTeachingEngine(fixture);}
    self.postMessage({type:'progress',message:'正在用同一份 y 比较粗网格、细网格与局部细化…'});
    const start=performance.now(),result=engine.run(data.snrDb,data.seed);
    self.postMessage({type:'result',result,elapsedMs:performance.now()-start});
  } catch(error){self.postMessage({type:'error',message:error.message||String(error)});}
};
