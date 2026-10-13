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
function fields(x,expected,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==expected.sort().join(','))throw Error('Invalid '+label+' fields');}
function moduleDependencies(modules,contract){
 fields(contract,['schemaVersion','modules'],'module runtime contract');if(contract.schemaVersion!==1||!Array.isArray(contract.modules))throw Error('Invalid module runtime contract');
 const declared=new Map(),actual=new Map();
 for(const c of contract.modules){fields(c,['public','sha256','runtimeEdges','runtimePolicy','unverifiedInputs'],'module contract entry');if(typeof c.public!=='string'||!c.public.endsWith('.mjs')||declared.has(c.public)||!/^[a-f0-9]{64}$/.test(c.sha256)||!Array.isArray(c.runtimeEdges))throw Error('Invalid or duplicate module contract entry');if(!['literal-workers','no-runtime-loads','command-line-inputs-unverified'].includes(c.runtimePolicy)||!Array.isArray(c.unverifiedInputs)||c.unverifiedInputs.some(x=>typeof x!=='string'||!x)||((c.runtimePolicy==='literal-workers')!==(c.runtimeEdges.length>0))||((c.runtimePolicy==='command-line-inputs-unverified')!==(c.unverifiedInputs.length>0)))throw Error('Invalid module runtime boundary');declared.set(c.public,c);}
 for(const m of modules){fields(m,['file','source'],'module input');if(typeof m.file!=='string'||typeof m.source!=='string'||actual.has(m.file))throw Error('Invalid or duplicate module input');actual.set(m.file,m);}
 if(declared.size!==actual.size||[...declared.keys()].some(f=>!actual.has(f)))throw Error('Unreviewed or missing module source in runtime contract');
 const edges=[];
 for(const {file,source}of modules){const c=declared.get(file);if(!c||sha(source)!==c.sha256)throw Error('Unreviewed module source hash: '+file);const targets=new Set();
  for(const e of c.runtimeEdges){fields(e,['kind','url','literal'],'reviewed runtime edge');if(e.kind!=='worker'||typeof e.url!=='string'||!e.url.startsWith('./')||!e.url.endsWith('.mjs')||typeof e.literal!=='string'||!e.literal||targets.has(e.url))throw Error('Invalid or duplicate reviewed runtime edge');targets.add(e.url);const expected="new Worker(new URL('"+e.url+"',import.meta.url),{type:'module'})";if(e.literal!==expected||source.split(e.literal).length!==2)throw Error('Reviewed runtime constructor mismatch: '+file);edges.push({from:file,url:e.url,kind:'reviewed-worker'});}
 }
 for(const {file,specifiers}of staticModuleDependencies(modules))for(const url of specifiers)edges.push({from:file,url,kind:'static-module'});
 return edges;
}
module.exports={staticModuleDependencies,moduleDependencies};
