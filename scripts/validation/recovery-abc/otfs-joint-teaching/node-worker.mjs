import {parentPort} from 'node:worker_threads';
import {fitGrid} from '../../../../labs/otfs-receiver/joint/joint-core.mjs';
parentPort.on('message',async({id,input})=>{try{parentPort.postMessage({id,result:await fitGrid(input,progress=>parentPort.postMessage({id,progress}))});}catch(e){parentPort.postMessage({id,error:e.message});}});
