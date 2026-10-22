import {runAll} from './source-objective.mjs';
self.onmessage=async e=>{const {id,input}=e.data;try{self.postMessage({id,result:await runAll(input,progress=>self.postMessage({id,progress}))});}catch(error){self.postMessage({id,error:error.message});}};
