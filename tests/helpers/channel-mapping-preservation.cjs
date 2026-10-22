'use strict';
// Test-only exact inverses. Runtime/generator/scientific inputs never import this.
const a=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),delta=require('./channel-mapping-endpoints.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const same=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
const resetUi=require('./reset-ui-preservation.cjs');
function rowFor(file){const matches=delta.files.filter(r=>r.path===file||r.compatibility===file);a.ok(matches.length<=1,'Unique mapping inverse endpoint');return matches[0];}
function reverseFile(file,input){const row=rowFor(file),bytes=Buffer.from(input);if(!row)return bytes;a.ok(same(bytes,row.after),'Exact integrated mapping endpoint required: '+file);const prior=Buffer.from(row.beforeBase64,'base64');a.ok(same(prior,row.before),'Exact frozen predecessor required: '+file);return prior;}
function forHistoricalChain(file,input){const row=rowFor(file),bytes=Buffer.from(input);if(!row)return bytes;if(same(bytes,row.before))return bytes;return reverseFile(file,bytes);}
function jsonForHistoricalChain(file,input){return JSON.parse(forHistoricalChain(file,Buffer.from(JSON.stringify(input,null,2)+'\n')));}
const mappingPaths=['content/data/registry.json','content/data/research-guides.json','scripts/build/module-runtime-contracts.json','build/compatibility-manifest.json','index.html','reading.html'];
const hookPaths=["tests/otfs-statistical-preservation.test.cjs","tests/full-duplex-preservation.test.cjs","tests/recovery-baseline-projection.test.cjs","tests/accepted-publication-workflow.test.cjs","tests/pilot-pattern-dependencies.test.cjs","tests/otfs-receiver-integration.test.cjs","tests/nearfield-research-integration.test.cjs","tests/gaussian-tradeoff-integration.test.cjs","tests/networked-sync-integration.test.cjs","tests/80211ad-integration.test.cjs","tests/ofdm-ici-integration.test.cjs","tests/dual-array-dependencies.test.cjs","tests/sensing-assisted-otfs-dependencies.test.cjs","tests/sensing-assisted-otfs-navigation-integration.test.cjs","tests/perceptive-bsbl-dependencies.test.cjs","tests/nearfield-multitarget-dependencies.test.cjs","tests/cellfree-maprt-dependencies.test.cjs","tests/gaussian-tradeoff-dependencies.test.cjs","tests/dual-array-browser-integration.test.cjs","tests/dual-array-record-portability-integration.test.cjs","tests/desktop-layout-integration.test.cjs","tests/lesson-narrow-layout-integration.test.cjs","tests/otfs-diagnostics-integration.test.cjs","tests/otfs-portability-integration.test.cjs","tests/perceptive-bsbl-responsive-integration.test.cjs","tests/teaching-heading-maintenance.test.cjs","tests/two-section-navigation-preservation.test.cjs","tests/crb-receiver-preservation.test.cjs","tests/waveform-cmc-preservation.test.cjs","tests/cooperative-rate-integration.test.cjs","tests/cooperative-load-build.test.cjs","tests/multipath-information-build.test.cjs","tests/causal-capacity-build.test.cjs","tests/cooperative-clusters-build.test.cjs","tests/map-progression-preservation.test.cjs","tests/multipath-channel-integration.test.cjs","tests/research-guides.test.cjs","tests/dual-array-integration.test.cjs","tests/pilot-pattern-integration.test.cjs","tests/perceptive-bsbl-integration.test.cjs","tests/nearfield-multitarget-integration.test.cjs","tests/cellfree-maprt-integration.test.cjs","tests/sensing-assisted-otfs-integration.test.cjs","tests/golay-radar-integration.test.cjs","tests/ofdm-interpolation-integration.test.cjs","tests/waveform-live-reading.test.cjs","tests/atomic-receiver-integration.test.cjs","tests/nearfield-gc-sage-integration.test.cjs","tests/combined-paper-solvers-integration.test.cjs","tests/reference-uncertainty-integration.test.cjs","tests/reflection-aperture-reading.test.cjs","tests/capacity-execution-reading.test.cjs","tests/crb-point-integration.test.cjs","tests/distributed-detection-integration.test.cjs","tests/offgrid-range-integration.test.cjs","tests/perceptive-clutter-integration.test.cjs","tests/radar-beam-decision-integration.test.cjs","tests/shared-array-integration.test.cjs","tests/frontier-evidence.test.cjs","tests/knowledge-map.test.cjs","tests/notebook-topics.test.cjs","tests/paper-comparison.test.cjs","tests/research-integration.test.cjs","tests/research-navigation.test.cjs","tests/causal-capacity-integration.test.cjs","tests/multipath-information-integration.test.cjs","tests/research-tree.test.cjs","tests/compatibility-build.test.cjs","tests/build-fixture-lifetime.test.cjs"];
const sourceOnlyPaths=new Set(["build/compatibility-manifest.json","tests/recovery-baseline-projection.test.cjs","tests/accepted-publication-workflow.test.cjs","tests/pilot-pattern-dependencies.test.cjs","tests/dual-array-dependencies.test.cjs","tests/sensing-assisted-otfs-dependencies.test.cjs","tests/sensing-assisted-otfs-navigation-integration.test.cjs","tests/perceptive-bsbl-dependencies.test.cjs","tests/nearfield-multitarget-dependencies.test.cjs","tests/cellfree-maprt-dependencies.test.cjs","tests/gaussian-tradeoff-dependencies.test.cjs","tests/dual-array-browser-integration.test.cjs","tests/desktop-layout-integration.test.cjs","tests/lesson-narrow-layout-integration.test.cjs","tests/otfs-diagnostics-integration.test.cjs","tests/otfs-portability-integration.test.cjs","tests/perceptive-bsbl-responsive-integration.test.cjs","tests/multipath-information-build.test.cjs","tests/compatibility-build.test.cjs","tests/build-fixture-lifetime.test.cjs"]);
const compatibilityNames={"content/data/registry.json":"site/registry.json","content/data/research-guides.json":"site/research-guides.json","tests/dual-array-record-portability-integration.test.cjs":"tests/owned/dual-array-record-portability-integration.test.cjs","tests/crb-receiver-preservation.test.cjs":"tests/build/crb-receiver-preservation.test.cjs","tests/waveform-cmc-preservation.test.cjs":"tests/build/waveform-cmc-preservation.test.cjs","tests/cooperative-load-build.test.cjs":"tests/build/cooperative-load-build.test.cjs","tests/causal-capacity-build.test.cjs":"tests/build/causal-capacity-build.test.cjs","tests/cooperative-clusters-build.test.cjs":"tests/build/cooperative-clusters-build.test.cjs"};
function validateCurrentTable(spec=delta){
 a.equal(spec.schemaVersion,17,'Versioned raw-read endpoint table');
 a.deepEqual(spec.files.map(r=>r.path),mappingPaths,'Exactly four source and two generated mapping endpoints');
 a.ok(Array.isArray(spec.hookFiles),'Separate exact read-hook endpoint table');
 a.deepEqual(spec.hookFiles.map(r=>r.path),hookPaths,'Exactly 69 versioned core mixed and source-only read hooks');
 const aliases=new Map();
 for(const row of [...spec.files,...spec.hookFiles]){
  a.ok(row&&typeof row.path==='string'&&typeof row.compatibility==='string','Explicit source and compatibility identities');
  a.equal(row.compatibility,compatibilityNames[row.path]||row.path,'Exact declared compatibility alias');
  a.equal(row.generated===true,['index.html','reading.html'].includes(row.path),'Exact generated endpoint scope');
  a.equal(row.sourceOnly===true,sourceOnlyPaths.has(row.path),'Exact source-only endpoint scope');
  for(const name of new Set([row.path,row.compatibility])){
   a.ok(name&&!path.posix.isAbsolute(name)&&path.posix.normalize(name)===name&&!name.startsWith('../')&&!name.includes('\\'),'Exact relative endpoint');
   a.ok(!aliases.has(name),'No duplicate or colliding endpoint alias: '+name);aliases.set(name,row);
  }
  for(const side of ['before','after'])a.ok(Number.isSafeInteger(row[side]?.bytes)&&row[side].bytes>=0&&/^[a-f0-9]{64}$/.test(row[side].sha256),'Full endpoint identity');
  a.ok(same(Buffer.from(row.beforeBase64,'base64'),row.before),'Exact retained predecessor: '+row.path);
 }
 a.equal(new Set(spec.hookFiles.map(r=>r.path)).size,spec.hookFiles.length,'Unique hook endpoint');
 for(const row of spec.hookFiles)a.ok(row.path.startsWith('tests/')&&!mappingPaths.includes(row.path),'Hook table is separate and test-only');
 return aliases;
}
function assertCurrentReadClosure(root){
 root=path.resolve(root);resetUi.assertCurrentClosure(root);const aliases=validateCurrentTable();
 const sourceLayout=fs.existsSync(path.join(root,'content/data/registry.json'));
 for(const row of [...delta.files,...delta.hookFiles]){
  if(sourceLayout&&row.generated===true||!sourceLayout&&row.sourceOnly===true)continue;
  const relative=sourceLayout?row.path:row.compatibility;let file=root;
  a.ok(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'Regular root');
  for(const part of relative.split('/')){file=path.join(file,part);a.ok(!fs.lstatSync(file).isSymbolicLink(),'No endpoint symlink ancestor: '+relative);}
  const stat=fs.lstatSync(file);
  a.ok(stat.isFile()&&!stat.isSymbolicLink(),'Regular live current endpoint: '+row.path);
  a.ok(same(resetUi.forHistoricalChain(relative,fs.readFileSync(file)),row.after),'Exact live current closure: '+row.path);
 }
 return {root,sourceLayout,aliases};
}
function readCurrentForHistory(file,input,{root}={}){
 a.equal(typeof root,'string','Explicit live source root required');
 const {aliases,sourceLayout}=assertCurrentReadClosure(root),bytes=Buffer.from(input),row=aliases.get(file);
 a.ok(typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&path.posix.normalize(file)===file&&!file.startsWith('../')&&!file.includes('\\'),'Exact real-read path required');
 const relative=row?(sourceLayout?row.path:row.compatibility):file;let actual=path.resolve(root);
 for(const part of relative.split('/')){actual=path.join(actual,part);a.ok(!fs.lstatSync(actual).isSymbolicLink(),'No real-read symlink: '+relative);}
 a.ok(fs.lstatSync(actual).isFile(),'Actual real-read file required: '+relative);
 const raw=fs.readFileSync(actual);
 // Unchanged files retain their original guard, but an absent/forged input is never a current read.
 if(!row){a.ok(bytes.equals(raw),'Actual unscoped raw bytes required; path='+file+' inputBytes='+bytes.length+' inputSha256='+sha(bytes)+' actualBytes='+raw.length+' actualSha256='+sha(raw));return resetUi.forHistoricalChain(file,bytes);}
 a.ok(bytes.equals(raw),'Strict raw current after required: '+file+'; inputBytes='+bytes.length+' inputSha256='+sha(bytes)+' actualBytes='+raw.length+' actualSha256='+sha(raw));
 a.ok(same(resetUi.forHistoricalChain(file,raw),row.after),'Exact scoped real-read after required: '+file);
 a.ok(same(resetUi.forHistoricalChain(file,bytes),row.after),'Strict raw current after required: '+file);
 const prior=Buffer.from(row.beforeBase64,'base64');a.ok(same(prior,row.before),'Exact canonical predecessor required: '+file);return prior;
}

// Separate CURRENT layout resolution. Never returns historical bytes or removes a live page.
const currentMappingResources=Object.freeze([{"public":"channel-mapping/styles.css","compatibility":"labs/channel-mapping/styles.css","bytes":9363,"sha256":"6488365a3cf3205dd396d060348ab9a983a2ee090302f8f4630f6a13c7464a52"},{"public":"channel-mapping/src/app.mjs","compatibility":"labs/channel-mapping/src/app.mjs","bytes":21108,"sha256":"69c2d03d4a6883e65073b360b8ce93cba1f106b23eec7c51dd7ec6e8a1c6f205"},{"public":"channel-mapping/src/config.mjs","compatibility":"labs/channel-mapping/src/config.mjs","bytes":1913,"sha256":"7ee140f1217d67136b5ac2c462dc3592309459353aff5ed72e824d6840ce013d"},{"public":"channel-mapping/src/evaluation.mjs","compatibility":"labs/channel-mapping/src/evaluation.mjs","bytes":6456,"sha256":"61f6e5fbc06a89191cfc669595af1b855b60256ee7bf6e0931d6069f0210b27b"},{"public":"channel-mapping/src/experiment.mjs","compatibility":"labs/channel-mapping/src/experiment.mjs","bytes":1058,"sha256":"648bfad6bf4b1f53ef95d0278372785c6b908986202f02c4cc11fc1228c9c253"},{"public":"channel-mapping/src/generator.mjs","compatibility":"labs/channel-mapping/src/generator.mjs","bytes":3470,"sha256":"7e0abe4259ee12656b4640e48577ab4efc055d070a40105663a8ebb539e29889"},{"public":"channel-mapping/src/geometry.mjs","compatibility":"labs/channel-mapping/src/geometry.mjs","bytes":550,"sha256":"03c1c1662aecfbb58a572069ad4b5cd89e9ef23d755915a5e7018266c627ac35"},{"public":"channel-mapping/src/inference.mjs","compatibility":"labs/channel-mapping/src/inference.mjs","bytes":7313,"sha256":"ebe13c06237f7236479b63aff5d0a0da03f4ef7fd2100712dd846797174bea60"},{"public":"channel-mapping/src/worker.mjs","compatibility":"labs/channel-mapping/src/worker.mjs","bytes":418,"sha256":"03524e7d28aa1b131b0a03519dc6385975d06071cb591478a2a0b07dddef3e73"},{"public":"channel-mapping/site-integration.css","compatibility":"labs/channel-mapping/site-integration.css","bytes":1180,"sha256":"1f6286aec930c1ea58d33d26fde052893daef0a9600af2818c81884a9010e1ec"}].map(Object.freeze));
function resolveCurrentStagingResource(file,options={}){
 a.deepEqual(Object.keys(options),['root'],'Only explicit current root is accepted');
 const root=path.resolve(options.root);a.equal(typeof options.root,'string','Explicit current resource root');
 a.ok(typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&path.posix.normalize(file)===file&&!file.startsWith('../')&&!file.includes('\\')&&!/[?#]/.test(file),'Exact current public resource path');
 const row=currentMappingResources.find(r=>r.public===file);
 if(file==='channel-mapping'||file.startsWith('channel-mapping/')||file.startsWith('labs/channel-mapping/'))a.ok(row,'Unknown mapping resource rejected: '+file);
 if(row)assertCurrentReadClosure(root);
 const relative=row?row.compatibility:require('./otfs-staging-resources.cjs')(file);
 a.ok(!path.posix.isAbsolute(relative)&&path.posix.normalize(relative)===relative&&!relative.startsWith('../')&&!relative.includes('\\'),'Safe actual compatibility resource');
 a.ok(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'Regular current resource root');
 let actual=root;for(const part of relative.split('/')){actual=path.join(actual,part);a.ok(!fs.lstatSync(actual).isSymbolicLink(),'No current resource symlink: '+relative);}
 a.ok(fs.lstatSync(actual).isFile(),'Actual regular current resource required: '+relative);
 if(row)a.ok(same(fs.readFileSync(actual),row),'Exact current mapping resource identity: '+file);
 return relative;
}

module.exports={currentMappingResources,resolveCurrentStagingResource,delta,sha,same,rowFor,reverseFile,forHistoricalChain,jsonForHistoricalChain,validateCurrentTable,assertCurrentReadClosure,readCurrentForHistory};
