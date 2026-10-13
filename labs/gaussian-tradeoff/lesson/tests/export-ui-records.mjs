/** Capture genuine mounted production UI downloads. No synthetic export records.
 * Actual Node worker_threads + lightweight DOM events; not browser execution.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {mounted,configureFresh,freshRun,setFields,freshQ,fileOf,pagePath,root,runtime} from './test-support.mjs';
import {audit,canonical,sha256,frozenRuntimeHashes} from './record-audit.mjs';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--out'||!path.isAbsolute(args[1]))throw Error('Usage: node export-ui-records.mjs --out ABSOLUTE_NEW_OUTPUT_DIRECTORY');
const out=path.resolve(args[1]),manifestPath=path.join(out,'UI-EXPORT-MANIFEST.json');
if(fs.existsSync(manifestPath))throw Error('Preserve existing manifest; choose a new explicit output directory');
for(const [name,expected] of Object.entries(frozenRuntimeHashes))assert.equal(sha256(fs.readFileSync(path.join(runtime,name))),expected,name);
const sourcePaths=['controller.mjs','view.mjs','lesson.mjs','lesson.css'].map(name=>path.join(root,'labs/gaussian-tradeoff/lesson',name));sourcePaths.push(pagePath());
const sourceFiles=sourcePaths.map(file=>{const data=fs.readFileSync(file);return {path:path.relative(root,file),bytes:data.length,sha256:sha256(data)};});
const manifest={schema:'gaussian-tradeoff-mounted-ui-exports-v1',createdAtUtc:new Date().toISOString(),node:process.version,execution:'production mounted DOM controls and download callbacks; actual Node worker_threads; no browser',sourceFilesAtModuleLoad:sourceFiles,frozenRuntimeHashes,cases:[],files:[]};
fs.mkdirSync(out,{recursive:true});const persist=()=>fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');persist();
const maxH={re:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?.8+.08*i:.025*Math.cos((i+1)*(j+2)))),im:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>.07*Math.sin((i+2)*(j+1))))};
const cases=[
 {name:'fresh-complex-continuous',async perform(h){await freshRun(h,{kappa:3.14159});}},
 {name:'fresh-complex-custom-q',async perform(h){await configureFresh(h,{'custom-q':true,covariance:JSON.stringify(freshQ()),kappa:.0037});await h.get('gt-run').fire('click');}},
 {name:'reshaped-three-port',async perform(h){await freshRun(h,{channel:JSON.stringify({re:[[.7,.2,-.1]],im:[[.1,-.3,.4]]}),t:5,ns:1,power:1.7,snoise:.5,cnoise:.8,prior:2.3,kappa:42.125,landmarks:false});}},
 {name:'short-block-unrealizable-stiefel',async perform(h){await freshRun(h,{t:1,kappa:0,landmarks:false});}},
 ...['gaussian','stiefel'].map(law=>({name:'held-posterior-'+law,async perform(h){await freshRun(h);await setFields(h,{law,'held-noise':.42,'held-prior':2.2});await h.get('gt-held').fire('click');}})),
 {name:'finite-wishart-structural-zeros',async perform(h){await setFields(h,{wm:4,wt:2,wns:2,wq:.9,wn:.7,wp:1.6});await h.get('gt-wishart').fire('click');}},
 {name:'finite-rank-one-sphere',async perform(h){await setFields(h,{st:3,ssnr:3.14159});await h.get('gt-sphere').fire('click');}},
 {name:'maximum-ui-dimensions-blocks',async perform(h){await freshRun(h,{channel:JSON.stringify(maxH),t:32,ns:6,blocks:512,kappa:3.14159,landmarks:true});assert.equal(h.app.controller.result.input.model.m,6);assert.equal(h.app.controller.result.input.H.re.length,6);assert.equal(h.app.controller.result.input.kappas.length,6);}}
];
for(const item of cases){
 const h=await mounted(),started=performance.now(),record={name:item.name,files:[]},rssStart=process.memoryUsage().rss;let rssObserved=rssStart;const sampleRss=()=>{rssObserved=Math.max(rssObserved,process.memoryUsage().rss);};const sampler=setInterval(sampleRss,10);
 try{
  await item.perform(h);record.initialMountedRunElapsedMs=performance.now()-started;sampleRss();assert.equal(h.app.controller.state,'complete',h.app.controller.error??h.get('gt-error').textContent);const current=h.app.controller.result;assert.equal(current.freshExecution,true);
  record.operation=current.input.operation;record.inputHash=current.inputHash;record.resultHash=sha256(canonical(current.result));record.input=structuredClone(current.input);
  if(current.input.operation==='tradeoff')record.summary={selectedKappa:current.result.shapes[current.input.selectedIndex].kappa,shape:current.input.model,stiefel:current.result.shapes[current.input.selectedIndex].stiefel.status,firstSampleHash:{gaussian:await h.app.controller.sampleHash('gaussian'),stiefel:await h.app.controller.sampleHash('stiefel')}};
  for(const mode of ['raw','history']){
   const n=h.downloads.length;await h.get('gt-export-'+mode).fire('click');assert.equal(h.downloads.length,n+1);const downloaded=h.downloads.at(-1),decoded=audit(downloaded.text);assert.equal(decoded.mode,mode);assert.equal(decoded.inputHash,current.inputHash);if(mode==='history')assert.equal(decoded.historical.resultHash,record.resultHash);
   const filename=item.name+'-'+mode+'.json',destination=path.join(out,filename);assert.equal(fs.existsSync(destination),false,'Refuse to overwrite evidence');fs.writeFileSync(destination,downloaded.text);
   manifest.files.push({case:item.name,mode,path:filename,downloadName:downloaded.name,bytes:Buffer.byteLength(downloaded.text),sha256:sha256(downloaded.text),inputHash:decoded.inputHash,resultHash:mode==='history'?decoded.historical.resultHash:null});record.files.push(filename);
  }
  // Actual UI import and replay must retain provenance and reproduce the arrays.
  const history=h.downloads.at(-1);const before=h.sent.length;h.get('gt-import').files=[fileOf(history.text)];await h.get('gt-import').fire('change');assert.equal(h.app.controller.state,'imported');assert.equal(h.app.controller.result,null);assert.equal(h.sent.length,before);assert.equal(h.app.controller.historical.historical.freshExecution,false);await h.get('gt-replay').fire('click');assert.equal(h.app.controller.result.freshExecution,true);assert.equal(sha256(canonical(h.app.controller.result.result)),record.resultHash);record.mountedImportReplayBitwiseEqual=true;record.status='complete';
 }catch(error){record.status='error';record.error={name:error.name,message:error.message};process.exitCode=1;}
 finally{sampleRss();clearInterval(sampler);record.nodeMemory={scope:'whole Node process including Worker threads, sampled every 10 ms during case; no browser claim',rssStartBytes:rssStart,observedHighWaterRssBytes:rssObserved,observedRiseBytes:rssObserved-rssStart,processCumulativeMaxRssKiB:process.resourceUsage().maxRSS};record.nodeElapsedMs=performance.now()-started;record.workerRuns=h.sent.filter(m=>m.type==='run').map(m=>({id:m.id,operation:m.input.operation}));manifest.cases.push(record);persist();await h.dispose();console.log(JSON.stringify({case:record.name,status:record.status,files:record.files.length,nodeElapsedMs:Math.round(record.nodeElapsedMs),error:record.error}));}
}
manifest.completedAtUtc=new Date().toISOString();manifest.totalBytes=manifest.files.reduce((sum,item)=>sum+item.bytes,0);manifest.sourceFilesUnchangedAfterModuleLoad=sourceFiles.every(item=>sha256(fs.readFileSync(path.join(root,item.path)))===item.sha256);persist();assert.equal(manifest.sourceFilesUnchangedAfterModuleLoad,true,'Production source changed during evidence generation; repeat in a new output directory');assert.equal(manifest.cases.every(item=>item.status==='complete'),true,'One or more UI cases failed');console.log(JSON.stringify({cases:manifest.cases.length,files:manifest.files.length,totalBytes:manifest.totalBytes,manifest:manifestPath}));
