import {Worker} from 'node:worker_threads';
import {randomInt} from 'node:crypto';
import fs from 'node:fs';
import {SensingOtfsClient} from '../worker/client.js';
const seed=process.argv[2]===undefined?randomInt(0,4294967296):Number(process.argv[2]);
const config={shape:[13,15],physicalSupport:[[0,0],[3,-4],[-6,8]],predictedSupport:[[0,0],[3,-4],[-5,8]],priorPowers:[.63,.29,.08],pilotIndex:[6,7],pilotPhase:1.13,pilotPowerRatio:37,dataEnergy:.83,N0:.027,seed,frames:2,normalizations:['source_per_data','equal_total_frame'],maxIterations:40,damping:.43,tolerance:1e-7};
const client=new SensingOtfsClient(new Worker(new URL('../worker/receiver-worker.js',import.meta.url),{type:'module'}));try{await client.ready;const job=client.run(config),done=await job.result;if(done.type!=='complete')throw new Error('Worker incomplete');const exported=(await client.exportResult(job.id).result).result;fs.writeFileSync(new URL('../reports/actual-worker-export.json',import.meta.url),JSON.stringify(exported,null,2)+'\n');console.log(JSON.stringify({seed,sha256:exported.sha256,bytes:exported.bytes,records:done.result.summary.receiverRecords}));}finally{await client.dispose();}
