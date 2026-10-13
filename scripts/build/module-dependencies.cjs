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
 }]
]);
const reviewedHashPaths=new Map([...reviewedProfiles].map(([file,profile])=>[profile.sha256,file]));
const reviewedPolicies=new Set(['reviewed-factory-endpoints','reviewed-enumerated-imports']);
function reviewedProfileEdges(file,source,c,profile){
 if(c.sha256!==profile.sha256)throw Error('Unreviewed frozen runtime source hash: '+file);
 if(c.runtimeEdges.length!==profile.runtimeEdges.length)throw Error('Reviewed runtime endpoint set mismatch: '+file);
 for(let i=0;i<profile.runtimeEdges.length;i++){
  const expected=profile.runtimeEdges[i],actual=c.runtimeEdges[i];
  fields(actual,Object.keys(expected),'reviewed runtime edge');
  if(Object.keys(expected).some(key=>actual[key]!==expected[key]))throw Error('Reviewed runtime endpoint mismatch: '+file);
 }
 for(const literal of new Set([...profile.sourceLiterals,...profile.runtimeEdges.map(e=>e.literal)]))if(source.split(literal).length!==2)throw Error('Reviewed runtime source shape mismatch: '+file);
 return profile.runtimeEdges.map(e=>({from:file,url:e.url,kind:profile.edgeKind}));
}
function moduleDependencies(modules,contract){
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
