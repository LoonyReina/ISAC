'use strict';
// Node's public parser supplies static ESM specifiers without linking or executing
// a module. Runtime edges are reviewed facts bound to complete source hashes;
// this intentionally makes no generic JavaScript runtime-discovery claim.
const cp=require('node:child_process'),crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const parserProgram=String.raw`
'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const inputs=JSON.parse(fs.readFileSync(0,'utf8'));
const result=inputs.map(({file,source})=>({file,specifiers:[...new vm.SourceTextModule(source,{identifier:file}).dependencySpecifiers]}));
process.stdout.write(JSON.stringify(result));
`;
function staticModuleDependencies(modules){
 const result=cp.spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings','-e',parserProgram],{input:JSON.stringify(modules),encoding:'utf8',maxBuffer:32*1024*1024,timeout:30000});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Parse-only ESM dependency inspection failed: '+result.stderr);
 return JSON.parse(result.stdout);
}
function fields(x,expected,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==[...expected].sort().join(','))throw Error('Invalid '+label+' fields');}

// These are two explicitly reviewed frozen source profiles, not patterns for
// discovering arbitrary factories, dynamic imports, or directory contents. The
// code-owned hashes also prevent weakening a profile by only editing its JSON.
// The exported generic createModuleWorker(relative) is NOT an unrestricted edge:
// only these two fixed public endpoint calls are covered by this guarantee.
const factory="export async function createModuleWorker(relative){const url=new URL(relative,import.meta.url);if(typeof Worker!=='undefined')return new Worker(url,{type:'module'});const {Worker:NodeWorker}=await import('node:worker_threads');return new NodeWorker(url,{type:'module'});}";
const solverLoop="for(const name of ['linalg','hermitian','numerics','model','optimizer','metrics','core'])await import(`../vendor/solver/${name}.js`)";
const reviewedProfiles=new Map([
 ['labs/near-field/research/runtime/src/worker-client.mjs',{
  sha256:'ebd7e69157c05099e89c576e6959364b915f950f365f1c22a76847f41d7dea4d',
  runtimePolicy:'reviewed-factory-endpoints',sourceLiterals:[factory],edgeKind:'reviewed-worker',
  runtimeEdges:[
   {kind:'worker',url:'./solver-worker.mjs',factory:'createModuleWorker',endpoint:'createSolverClient',literal:"export async function createSolverClient(){return new JobWorker(await createModuleWorker('./solver-worker.mjs'));}"},
   {kind:'worker',url:'./receiver-worker.mjs',factory:'createModuleWorker',endpoint:'createReceiverClient',literal:"export async function createReceiverClient(){return new JobWorker(await createModuleWorker('./receiver-worker.mjs'));}"}
  ]
 }],
 ['labs/near-field/research/runtime/src/solver-loader.mjs',{
  sha256:'7e734d0e81d4988bfcabf517673b1d6d12f7b9fb07a0c7b2ac70f32ee4fbd250',
  runtimePolicy:'reviewed-enumerated-imports',
  sourceLiterals:["if(typeof process!=='undefined'&&process.versions?.node){kernel=(await import('../vendor/solver/core.js')).default;}",solverLoop],
  edgeKind:'reviewed-module',
  runtimeEdges:['linalg','hermitian','numerics','model','optimizer','metrics','core'].map(name=>({kind:'module',url:'../vendor/solver/'+name+'.js',literal:solverLoop}))
 }],
 // Gaussian paths, complete source hashes and browser/Node fallback shapes were
 // reviewed together; none of these declarations is generic dynamic inference.
 // Only the default createWorkerClient endpoint is covered. Caller-injected
 // createWorker callbacks are external transports, not inferred dependencies.
 [
   "labs/gaussian-tradeoff/runtime/codec.mjs",
   {
     "sha256": "cd210349a1755aba09af3c8bcf0ebb046a935ca8acd3f1839a56b8a9c4f033aa",
     "runtimePolicy": "reviewed-gaussian-runtime",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": [
       {
         "kind": "node-builtin",
         "url": "node:crypto",
         "literal": "if(!subtle&&typeof process==='object'&&process.versions?.node)subtle=(await import('node:crypto')).webcrypto.subtle;"
       }
     ]
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/kernel.mjs",
   {
     "sha256": "0f2dc07dc891593cfe2190d09d395a6be4b7343a43c52f45dd6b1b9a6d176310",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/math.mjs",
   {
     "sha256": "930bedc07777ea6c078bc742dbc4b64938cf963b8f44c35902f80967f47fd79d",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/presets.mjs",
   {
     "sha256": "9a9633235b4a86aa8c084c915394d9ef004c1ca5062a8507c44ff016e22851ae",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/runtime.mjs",
   {
     "sha256": "94352d73c3921f7a83b6313ccdf31d2f0aa3e311c5de342f9cf18f002e1b6758",
     "runtimePolicy": "reviewed-gaussian-runtime",
     "sourceLiterals": [
       "const factory=ownedOptions.createWorker??(async()=>{",
       "const worker=await factory();"
     ],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": [
       {
         "kind": "worker",
         "url": "./worker.mjs",
         "literal": "if(typeof Worker==='function')return new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});"
       },
       {
         "kind": "node-builtin",
         "url": "node:worker_threads",
         "literal": "const {Worker:NodeWorker}=await import('node:worker_threads');return new NodeWorker(new URL('./worker.mjs',import.meta.url),{type:'module'});"
       }
     ]
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/worker.mjs",
   {
     "sha256": "acd716f63099a6e3e773c29e51b23d5ff8f8babbfb442830bdcf55559bb9727c",
     "runtimePolicy": "reviewed-gaussian-runtime",
     "sourceLiterals": [
       "if(typeof self==='object'&&typeof self.postMessage==='function'){",
       "}else if(typeof process==='object'&&process.versions?.node){"
     ],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": [
       {
         "kind": "node-builtin",
         "url": "node:worker_threads",
         "literal": "const {parentPort}=await import('node:worker_threads');"
       }
     ]
   }
 ],
 [
   "labs/gaussian-tradeoff/lesson/controller.mjs",
   {
     "sha256": "0ec5f2562224a61fc065a59da21d56532d51ba9eba0c26e0d4a7fb96a015ba03",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/lesson/view.mjs",
   {
     "sha256": "aa6f5749b16fd48cb3c2a0983b96cde7d343931e10cd028b0d33221160885d64",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/lesson/lesson.mjs",
   {
     "sha256": "31b7eda801a49ffb167af53c02faefaab43feb5b29aa84c66d068c33b5af2cfb",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ]
]);
const reviewedHashPaths=new Map([...reviewedProfiles].map(([file,profile])=>[profile.sha256,file]));
const reviewedPolicies=new Set(['reviewed-factory-endpoints','reviewed-enumerated-imports','reviewed-gaussian-runtime']);
function reviewedProfileEdges(file,source,c,profile){
 if(c.sha256!==profile.sha256)throw Error('Unreviewed frozen runtime source hash: '+file);
 if(c.runtimeEdges.length!==profile.runtimeEdges.length)throw Error('Reviewed runtime endpoint set mismatch: '+file);
 for(let i=0;i<profile.runtimeEdges.length;i++){
  const expected=profile.runtimeEdges[i],actual=c.runtimeEdges[i];
  fields(actual,Object.keys(expected),'reviewed runtime edge');
  if(Object.keys(expected).some(key=>actual[key]!==expected[key]))throw Error('Reviewed runtime endpoint mismatch: '+file);
 }
 for(const literal of new Set([...profile.sourceLiterals,...profile.runtimeEdges.map(e=>e.literal)]))if(source.split(literal).length!==2)throw Error('Reviewed runtime source shape mismatch: '+file);
 return profile.runtimeEdges.map(e=>({from:file,url:e.url,kind:e.kind==='node-builtin'?'reviewed-node-builtin':e.kind==='worker'?'reviewed-worker':profile.edgeKind}));
}
function moduleDependencies(modules,contract,identities){
 fields(contract,['schemaVersion','modules'],'module runtime contract');if(contract.schemaVersion!==1||!Array.isArray(contract.modules))throw Error('Invalid module runtime contract');
 const declared=new Map(),actual=new Map();
 for(const c of contract.modules){
  fields(c,['public','sha256','runtimeEdges','runtimePolicy','unverifiedInputs'],'module contract entry');
  if(typeof c.public!=='string'||!c.public.endsWith('.mjs')||declared.has(c.public)||!/^[a-f0-9]{64}$/.test(c.sha256)||!Array.isArray(c.runtimeEdges))throw Error('Invalid or duplicate module contract entry');
  const hasRuntimeEdges=c.runtimePolicy==='literal-workers'||reviewedPolicies.has(c.runtimePolicy);
  if(!['literal-workers','no-runtime-loads','command-line-inputs-unverified',...reviewedPolicies].includes(c.runtimePolicy)||!Array.isArray(c.unverifiedInputs)||c.unverifiedInputs.some(x=>typeof x!=='string'||!x)||(hasRuntimeEdges!==(c.runtimeEdges.length>0))||((c.runtimePolicy==='command-line-inputs-unverified')!==(c.unverifiedInputs.length>0)))throw Error('Invalid module runtime boundary');
  const expectedPath=reviewedHashPaths.get(c.sha256);
  if(expectedPath&&c.public!==expectedPath)throw Error('Reviewed frozen runtime path mismatch: '+c.public);
  const profile=reviewedProfiles.get(c.public);
  if((profile&&c.runtimePolicy!==profile.runtimePolicy)||(!profile&&reviewedPolicies.has(c.runtimePolicy)))throw Error('Unreviewed module runtime policy: '+c.public);
  declared.set(c.public,c);
 }
 for(const m of modules){fields(m,['file','source'],'module input');if(typeof m.file!=='string'||typeof m.source!=='string'||actual.has(m.file))throw Error('Invalid or duplicate module input');actual.set(m.file,m);}
 if(!Array.isArray(identities))throw Error('Missing complete public module identities');
 const seenIdentities=new Map();
 for(const identity of identities){
  fields(identity,['file','sha256'],'public module identity');
  if(typeof identity.file!=='string'||!/^[a-f0-9]{64}$/.test(identity.sha256)||seenIdentities.has(identity.file))throw Error('Invalid or duplicate public module identity');
  const expectedPath=reviewedHashPaths.get(identity.sha256);
  if(expectedPath&&identity.file!==expectedPath)throw Error('Reviewed frozen runtime path mismatch: '+identity.file);
  seenIdentities.set(identity.file,identity.sha256);
 }
 for(const {file,source}of modules)if(seenIdentities.get(file)!==sha(source))throw Error('Missing or changed public module identity: '+file);
 if(declared.size!==actual.size||[...declared.keys()].some(f=>!actual.has(f)))throw Error('Unreviewed or missing module source in runtime contract');
 const edges=[];
 for(const {file,source}of modules){
  const c=declared.get(file);if(!c||sha(source)!==c.sha256)throw Error('Unreviewed module source hash: '+file);
  const profile=reviewedProfiles.get(file);
  if(profile){edges.push(...reviewedProfileEdges(file,source,c,profile));continue;}
  // Keep the existing literal-workers policy's exact constructor contract.
  const targets=new Set();
  for(const e of c.runtimeEdges){fields(e,['kind','url','literal'],'reviewed runtime edge');if(e.kind!=='worker'||typeof e.url!=='string'||!e.url.startsWith('./')||!e.url.endsWith('.mjs')||typeof e.literal!=='string'||!e.literal||targets.has(e.url))throw Error('Invalid or duplicate reviewed runtime edge');targets.add(e.url);const expected="new Worker(new URL('"+e.url+"',import.meta.url),{type:'module'})";if(e.literal!==expected||source.split(e.literal).length!==2)throw Error('Reviewed runtime constructor mismatch: '+file);edges.push({from:file,url:e.url,kind:'reviewed-worker'});}
 }
 for(const {file,specifiers}of staticModuleDependencies(modules))for(const url of specifiers)edges.push({from:file,url,kind:'static-module'});
 return edges;
}
module.exports={staticModuleDependencies,moduleDependencies};
