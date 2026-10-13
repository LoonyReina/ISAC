/** Replay actual downloaded UI records with independent codec/hash audit and a
 * fresh actual Node Worker for every input. Never reads precomputed outputs as
 * the source of replay results. A Node replay is not a browser validation.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {GaussianWorkerClient} from '../../runtime/runtime.mjs';
import {Worker} from 'node:worker_threads';
import {audit,canonical,sha256,frozenRuntimeHashes} from './record-audit.mjs';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--manifest'||!path.isAbsolute(args[1]))throw Error('Usage: node replay-ui-records.mjs --manifest ABSOLUTE_UI_EXPORT_MANIFEST');
const manifestPath=path.resolve(args[1]),dir=path.dirname(manifestPath),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(manifest.schema,'gaussian-tradeoff-mounted-ui-exports-v1');
const runtime=path.resolve(fileURLToPath(new URL('../../runtime/',import.meta.url)));
for(const [name,expected] of Object.entries(frozenRuntimeHashes))assert.equal(sha256(fs.readFileSync(path.join(runtime,name))),expected,name);
const results=[],byInput=new Map();
for(const item of manifest.files){
 const file=path.resolve(dir,item.path);assert.equal(path.dirname(file),dir,'manifest files must be immediate children');const bytes=fs.readFileSync(file);assert.equal(bytes.length,item.bytes);assert.equal(sha256(bytes),item.sha256);
 const record=audit(bytes.toString('utf8'));assert.equal(record.inputHash,item.inputHash);assert.equal(record.mode,item.mode);
 const client=new GaussianWorkerClient(new Worker(new URL('../../runtime/worker.mjs',import.meta.url),{type:'module'}));
 try{
  assert.equal((await client.ready).ok,true);const event=await client.run(record.input).result;assert.equal(event.type,'complete');assert.equal(event.result.freshExecution,true);assert.equal(event.result.inputHash,record.inputHash);
  const resultHash=sha256(canonical(event.result.result));
  if(record.mode==='history')assert.equal(resultHash,record.historical.resultHash,'fresh replay must reproduce actual UI history exactly');
  if(byInput.has(record.inputHash))assert.equal(resultHash,byInput.get(record.inputHash),'paired raw/history replay must agree');byInput.set(record.inputHash,resultHash);
  results.push({path:item.path,mode:record.mode,inputHash:record.inputHash,resultHash,freshExecution:true,historyBitwiseEqual:record.mode==='history'?true:null});
  console.log(JSON.stringify(results.at(-1)));
 }finally{await client.dispose();}
}
const report={schema:'gaussian-tradeoff-ui-replay-v1',completedAtUtc:new Date().toISOString(),node:process.version,execution:'actual Node worker_threads, independently decoded actual mounted UI downloads; not a browser',manifestSha256:sha256(fs.readFileSync(manifestPath)),files:results};
const out=path.join(dir,'UI-REPLAY-REPORT.json');assert.equal(fs.existsSync(out),false,'Preserve prior replay reports; use a new export directory');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({replayed:results.length,report:out}));
