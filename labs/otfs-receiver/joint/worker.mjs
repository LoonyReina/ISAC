import {fitGrid} from './joint-core.mjs';
self.onmessage=async({data:{id,input}})=>{try{const result=await fitGrid(input,progress=>self.postMessage({id,progress}));self.postMessage({id,result});}catch(e){self.postMessage({id,error:e.message});}};
