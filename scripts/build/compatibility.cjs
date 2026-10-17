'use strict';
// Reconstruct legacy paths from the editable source map; publish only mapped files.
// Frozen migration fingerprints live in migration-audit.cjs, outside normal builds.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const {moduleDependencies,isModuleFile,staticModuleDependencies}=require('./module-dependencies.cjs');
const {classicDependencies}=require('./classic-dependencies.cjs');
const {receiverDependencies}=require('./crb-receiver-dependencies.cjs');
const {cooperativeDependencies}=require('./cooperative-clusters-dependencies.cjs');
const {causalDependencies}=require('./causal-capacity-dependencies.cjs');
const compare=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;
function insist(ok,message){if(!ok)throw new Error(message);}
function exactFields(value,fields,label){insist(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...fields].sort().join(','),'Invalid '+label+' fields');}
function safePath(value,label){
 insist(typeof value==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(value)&&!value.split('/').some(p=>p==='.'||p==='..'||p.toLowerCase()==='node_modules'||p.endsWith('.')||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)||(p.startsWith('.')&&!['.nojekyll','.gitignore'].includes(p))),`Unsafe ${label}: ${String(value)}`);return value;
}
function uniquePaths(values,label){const seen=new Set();for(const value of values){safePath(value,label);const key=value.toLowerCase();insist(!seen.has(key),`Duplicate ${label}: ${value}`);seen.add(key);}for(const value of seen){const parts=value.split('/');parts.pop();while(parts.length){insist(!seen.has(parts.join('/')),`File/directory collision in ${label}: ${value}`);parts.pop();}}}
function regularFile(root,relative){
 let current=root;
 for(const part of relative.split('/')){current=path.join(current,part);let stat;try{stat=fs.lstatSync(current);}catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')throw Error('Missing source: '+relative);throw error;}insist(!stat.isSymbolicLink(),'Symlink source is not allowed: '+relative);}
 insist(fs.statSync(current).isFile(),'Source is not a regular file: '+relative);return current;
}
function validateManifest(manifest,root){
 exactFields(manifest,['schemaVersion','owners','entries'],'manifest');insist(manifest.schemaVersion===2,'Invalid manifest version');
 insist(Array.isArray(manifest.owners)&&manifest.owners.length>0&&Array.isArray(manifest.entries)&&manifest.entries.length>0,'Invalid manifest lists');
 const owners=new Set();
 for(const o of manifest.owners){exactFields(o,['id','directory','description'],'owner');safePath(o.id,'owner');if(o.directory!=='.')safePath(o.directory,'owner directory');insist(typeof o.description==='string'&&o.description.trim()&&!owners.has(o.id.toLowerCase()),'Invalid or duplicate owner');owners.add(o.id.toLowerCase());}
 for(const e of manifest.entries){
  exactFields(e,['source','compatibility','public','owner','role'],'manifest entry');safePath(e.compatibility,'compatibility');if(e.role==='generated')insist(e.source===null&&generatedPath(e.compatibility),'Generated outputs require a null source and supported output path');else safePath(e.source,'source');if(e.public!==null)safePath(e.public,'public path');
  insist(['source','generated','baseline-metadata'].includes(e.role),'Invalid source role');insist(manifest.owners.some(o=>o.id===e.owner),'Unknown source owner: '+e.owner);
 }
 for(const key of ['source','compatibility'])uniquePaths(manifest.entries.filter(e=>e[key]!==null).map(e=>e[key]),key);uniquePaths(manifest.entries.filter(e=>e.public!==null).map(e=>e.public),'public path');
 const compatibility=new Set(manifest.entries.map(e=>e.compatibility));
 for(const required of ['scripts/generate-site.cjs','scripts/generate-waveform.py','scripts/render-research-directory.cjs','scripts/research-guides.cjs','scripts/paper-comparison-groups.cjs','scripts/learning-entry.cjs','scripts/notebook-topics.cjs','scripts/knowledge-map.cjs','site/registry.json','.nojekyll'])insist(compatibility.has(required),'Missing build input: '+required);
 for(const e of manifest.entries)if(e.source!==null)regularFile(root,e.source);
 return manifest;
}
function copyFile(source,dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}
function listFiles(root,prefix=''){
 const result=[];for(const name of fs.readdirSync(path.join(root,prefix)).sort()){const rel=prefix?prefix+'/'+name:name,stat=fs.lstatSync(path.join(root,rel));insist(!stat.isSymbolicLink(),'Unexpected output symlink: '+rel);if(stat.isDirectory())result.push(...listFiles(root,rel));else{insist(stat.isFile(),'Unexpected output object: '+rel);result.push(rel);}}return result.sort();
}
function treeRecords(root){return listFiles(root).map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}));}
function treeHash(root){return sha(JSON.stringify(treeRecords(root)));}
function assertTree(root,expected){assertPaths(root,expected.map(e=>e.path));const actual=treeRecords(root);insist(JSON.stringify(actual)===JSON.stringify([...expected].sort(compare)),'Compatibility output changed, missing, or unexpected file: '+root);}
function assertPaths(root,expected){
 const wanted=[...expected].sort();insist(JSON.stringify(listFiles(root))===JSON.stringify(wanted),'Output file set changed, missing, or unexpected file: '+root);
 // Refuse even unmapped empty directories; a directory is not a disposal marker.
 const directories=new Set();for(const file of wanted){const parts=file.split('/');parts.pop();while(parts.length){directories.add(parts.join('/'));parts.pop();}}
 function visit(prefix=''){for(const name of fs.readdirSync(path.join(root,prefix))){const rel=prefix?prefix+'/'+name:name;if(fs.lstatSync(path.join(root,rel)).isDirectory()){insist(directories.has(rel),'Unexpected output directory: '+rel);visit(rel);}}}visit();
}
function checkDependencies(root,manifest){
 const all=new Map(manifest.entries.filter(e=>e.public!==null).map(e=>[e.public,e])),edges=[],identities=[];
 const local=(from,raw,kind)=>{
  if(!raw||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw))return;
  insist(!raw.startsWith('/')&&!/[\u0000-\u0020\u007f\\]/.test(raw),'Invalid project-relative local URL: '+from+' → '+raw);
  const url=new URL(raw.replace(/&amp;/g,'&'),'https://compatibility.invalid/ISAC/'+from);insist(url.origin==='https://compatibility.invalid'&&url.pathname.startsWith('/ISAC/'),'Local URL escapes project prefix: '+from+' → '+raw);
  let target;try{target=decodeURIComponent(url.pathname.slice('/ISAC/'.length));}catch{throw Error('Invalid encoded local URL: '+from+' → '+raw);}
  if(!target)target='index.html';insist(all.has(target),'Unmapped public dependency: '+from+' → '+raw);insist(fs.existsSync(path.join(root,target)),'Missing public dependency: '+target);
  if(url.hash&&target.endsWith('.html')){let fragment;try{fragment=decodeURIComponent(url.hash.slice(1));}catch{throw Error('Invalid local fragment: '+raw);}const text=fs.readFileSync(path.join(root,target),'utf8');insist(text.includes('id="'+fragment+'"')||text.includes("id='"+fragment+"'"),'Missing public fragment: '+from+' → '+raw);}
  edges.push({from,to:target,kind});
 };
 for(const [name]of all){const data=fs.readFileSync(path.join(root,name)),text=data.toString('utf8');identities.push({file:name,sha256:sha(data)});
  if((!name.includes('/')||['labs/ofdm-ici/false-alarm/index.html','labs/waveform-design/cmc/index.html'].includes(name))&&name.endsWith('.html'))for(const m of text.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/g))local(name,m[2],m[1]);
  if(name.endsWith('.md')){const prose=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`\n]*`/g,'');for(const m of prose.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g))if(/^(?:https?:|#|\.{1,2}\/)|\.(?:md|json|txt|log|sha256|js|cjs|mjs|html|css|py|pdf)(?:[?#]|$)/i.test(m[1]))local(name,m[1],'documentation');}
  if(name.endsWith('.css'))for(const m of text.matchAll(/(?:url\(\s*["']?([^"')\s]+)|@import\s+["']([^"']+))/g))local(name,m[1]||m[2],'css');
  // Preserve the historical .js literal fetch/require check as legacy behavior.
  if(name.endsWith('.js'))for(const m of text.matchAll(/\b(?:fetch|require(?:\.resolve)?)\(\s*['"]([^'"]+)['"]/g))if(m[1].startsWith('.')||m[1].includes('/'))local(name,m[1],'runtime');
 }
 const modules=[...all.keys()].filter(name=>isModuleFile(name)).map(file=>({file,source:fs.readFileSync(path.join(root,file),'utf8')}));
 for(const edge of moduleDependencies(modules,JSON.parse(fs.readFileSync(path.join(root,'scripts/build/module-runtime-contracts.json'),'utf8')),identities))local(edge.from,edge.url,edge.kind);
 const fullDuplex=modules.filter(m=>m.file.startsWith('full-duplex/'));
 const fullDuplexPages=[{file:'full-duplex-cancellation.html',source:fs.readFileSync(path.join(root,'full-duplex-cancellation.html'),'utf8')}];
 for(const edge of require('./full-duplex-dependencies.cjs').fullDuplexDependencies(fullDuplex,identities,fullDuplexPages,staticModuleDependencies))local(edge.from,edge.url,edge.kind);
 const multipath=modules.filter(m=>m.file.startsWith('multipath-information'));
 const multipathPages=[{file:'multipath-channel.html',source:fs.readFileSync(path.join(root,'multipath-channel.html'),'utf8')}];
 for(const edge of require('./multipath-information-dependencies.cjs').multipathDependencies(multipath,identities,multipathPages,staticModuleDependencies))local(edge.from,edge.url,edge.kind);
 const classic=[...all.keys()].filter(name=>['labs/ofdm-ici/','labs/80211ad/','labs/networked-sync/','labs/gaussian-tradeoff/'].some(prefix=>name.startsWith(prefix))&&name.endsWith('.js')).map(file=>({file,source:fs.readFileSync(path.join(root,file),'utf8')}));
 for(const edge of classicDependencies(classic,JSON.parse(fs.readFileSync(path.join(root,'scripts/build/classic-runtime-contracts.json'),'utf8')),identities))local(edge.from,edge.url,edge.kind);
 // Receiver checks bind the final current assets and exact document/Worker edges.
 // Existing module/classic scanners above still inspect their current artifacts.
 const receiver=[...all.keys()].filter(name=>name.toLowerCase().startsWith('crb-receiver/')&&name.endsWith('.js')).map(file=>({file,source:fs.readFileSync(path.join(root,file),'utf8')}));
 const receiverPages=[{file:'crb-beamforming.html',source:fs.readFileSync(path.join(root,'crb-beamforming.html'),'utf8')}];
 for(const edge of receiverDependencies(receiver,JSON.parse(fs.readFileSync(path.join(root,'scripts/build/crb-receiver-runtime-contracts.json'),'utf8')),identities,receiverPages))local(edge.from,edge.url,edge.kind);
 const cooperative=modules.filter(m=>m.file.startsWith('cooperative-fim-')||m.file.startsWith('cooperative-load/'));
 const cooperativePages=[{file:'cooperative-clusters.html',source:fs.readFileSync(path.join(root,'cooperative-clusters.html'),'utf8')}];
 for(const edge of cooperativeDependencies(cooperative,JSON.parse(fs.readFileSync(path.join(root,'scripts/build/cooperative-clusters-runtime-contracts.json'),'utf8')),identities,cooperativePages,staticModuleDependencies))local(edge.from,edge.url,edge.kind);
 const causal=modules.filter(m=>m.file.startsWith('causal-capacity-'));
 const causalPages=[{file:'causal-state-capacity.html',source:fs.readFileSync(path.join(root,'causal-state-capacity.html'),'utf8')}];
 for(const edge of causalDependencies(causal,JSON.parse(fs.readFileSync(path.join(root,'scripts/build/causal-capacity-runtime-contracts.json'),'utf8')),identities,causalPages,staticModuleDependencies))local(edge.from,edge.url,edge.kind);
 // This script constructs URLs from currentScript.src; the literal sequence is
 // checked before adding its dependencies, rather than guessed from filenames.
 const course=fs.readFileSync(path.join(root,'course.js'),'utf8');
 insist(/document\.currentScript\.src/.test(course),'Course loader contract changed');
 for(const file of ['course-ui.js','velocity-core.js','velocity-bridge.js']){insist(course.includes("'"+file+"'"),'Unmapped dynamic course dependency: '+file);local('course.js',file,'dynamic-runtime');}
 return edges.sort((a,b)=>(a.from+'\0'+a.to+'\0'+a.kind).localeCompare(b.from+'\0'+b.to+'\0'+b.kind,'en'));
}
function run(command,args,cwd){const env={...process.env};delete env.NODE_TEST_CONTEXT;const result=cp.spawnSync(command,args,{cwd,env,encoding:'utf8',maxBuffer:32*1024*1024});if(result.error)throw result.error;insist(result.status===0,`Command failed: ${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);return result.stdout;}
function generatedPath(file){return /^[^/]+\.html$/.test(file)||file==='legacy-routes.js';}
function stage(manifest,root,directory,runTests){
 fs.mkdirSync(directory,{recursive:true});const inputs=[];
 for(const e of manifest.entries.filter(e=>e.source!==null)){const source=regularFile(root,e.source),bytes=fs.readFileSync(source);inputs.push({path:e.compatibility,sha256:sha(bytes)});fs.mkdirSync(path.dirname(path.join(directory,e.compatibility)),{recursive:true});fs.writeFileSync(path.join(directory,e.compatibility),bytes);}
 inputs.sort(compare);assertTree(directory,inputs);
 run(process.execPath,['scripts/generate-site.cjs'],directory);
 assertPaths(directory,manifest.entries.map(e=>e.compatibility));
 const generated=treeRecords(directory),initial=new Map(inputs.map(e=>[e.path,e.sha256]));
 for(const e of generated)insist(generatedPath(e.path)||e.sha256===initial.get(e.path),'Generator mutated a protected source: '+e.path);
 run(process.execPath,['scripts/generate-site.cjs','--check'],directory);assertTree(directory,generated);
 // --check preserves canonical NumPy/BLAS bytes while recomputing invariants;
 // ordinary regeneration can change otherwise equivalent SVD signs.
 run('python3',['scripts/generate-waveform.py','--check'],directory);assertTree(directory,generated);
 let tests=null;
 if(runTests){const files=manifest.entries.map(e=>e.compatibility).filter(f=>/^tests\/[^/]+\.test\.cjs$/.test(f)).sort();insist(files.length>0,'No compatibility tests');tests=run(process.execPath,['--test',...files],directory);assertTree(directory,generated);}
 return {inputs,generated,tests};
}
function guardOutput(root,manifest,destination){
 for(let current=destination;;current=path.dirname(current)){
  let stat;try{stat=fs.lstatSync(current);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(stat)insist(!stat.isSymbolicLink(),'Output path must not contain symlinks');if(path.dirname(current)===current)break;
 }
 insist(destination!==root&&!root.startsWith(destination+path.sep),'Output cannot contain the source tree');
 for(const e of manifest.entries.filter(e=>e.source!==null)){const source=path.resolve(root,e.source);insist(source!==destination&&!source.startsWith(destination+path.sep),'Output overlaps a source input');}
}
function publish(distribution,destination,expected){
 const parent=path.dirname(destination);fs.mkdirSync(parent,{recursive:true});insist(fs.realpathSync(parent)===parent,'Output parent must not contain symlinks');
 const pending=fs.mkdtempSync(path.join(parent,'.isac-dist-'));let backup=null;
 try{
  for(const record of expected)copyFile(path.join(distribution,record.path),path.join(pending,record.path));assertTree(pending,expected);
  if(fs.existsSync(destination)){
   insist(fs.lstatSync(destination).isDirectory()&&!fs.lstatSync(destination).isSymbolicLink(),'Output must be a directory');assertPaths(destination,expected.map(e=>e.path));
   // Keep the complete old tree until the complete new tree has been published.
   // Rename rollback avoids partial file-by-file updates on publication failure.
   backup=fs.mkdtempSync(path.join(parent,'.isac-previous-'));fs.rmdirSync(backup);fs.renameSync(destination,backup);
  }
  try{fs.renameSync(pending,destination);}catch(error){if(backup){fs.renameSync(backup,destination);backup=null;}throw error;}
  if(backup){fs.rmSync(backup,{recursive:true});backup=null;}
 }finally{fs.rmSync(pending,{recursive:true,force:true});}
}
function build({root,manifest,output,runTests=false,reproducible=false,check=false,auditMigration=false}){
 root=fs.realpathSync(root);validateManifest(manifest,root);const destination=path.resolve(output);guardOutput(root,manifest,destination);
 const publicPaths=manifest.entries.filter(e=>e.public!==null).map(e=>e.public);
 if(fs.existsSync(destination)){insist(fs.lstatSync(destination).isDirectory()&&!fs.lstatSync(destination).isSymbolicLink(),'Output must be a directory');assertPaths(destination,publicPaths);}else insist(!check,'Output does not exist for --check');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'isac-compatibility-'));
 try{
  const compatible=path.join(temporary,'compatibility'),first=stage(manifest,root,compatible,runTests);
  if(reproducible){const second=path.join(temporary,'independent-build');stage(manifest,root,second,false);insist(treeHash(compatible)===treeHash(second),'Independent clean builds differ');}
  const distribution=path.join(temporary,'dist');fs.mkdirSync(distribution);
  for(const e of manifest.entries)if(e.public!==null)copyFile(path.join(compatible,e.compatibility),path.join(distribution,e.public));
  assertPaths(distribution,publicPaths);const publicExpected=treeRecords(distribution),dependencies=checkDependencies(distribution,manifest);
  let migrationAudit=null;
  if(auditMigration){
   const {auditMigration:verify}=require('./migration-audit.cjs');
   const read=name=>JSON.parse(fs.readFileSync(regularFile(root,'build/'+name),'utf8'));
   migrationAudit=verify({manifest,baseline:read('migration-baseline.json'),deltas:read('migration-maintainer-deltas.json'),buildDeltas:read('migration-build-deltas.json'),inputs:first.inputs,generated:first.generated,publicRecords:publicExpected});
  }
  // Recheck the destination after subprocesses, before any reads or publication.
  guardOutput(root,manifest,destination);
  if(fs.existsSync(destination)){insist(fs.lstatSync(destination).isDirectory(),'Output must be a directory');assertPaths(destination,publicPaths);}else insist(!check,'Output does not exist for --check');
  if(check)assertTree(destination,publicExpected);else if(!fs.existsSync(destination)||treeHash(destination)!==treeHash(distribution))publish(distribution,destination,publicExpected);
  return {compatibilityFiles:manifest.entries.length,publicFiles:publicExpected.length,htmlPages:publicExpected.filter(e=>!e.path.includes('/')&&e.path.endsWith('.html')).length,dependencyEdges:dependencies.length,compatibilityTreeSha256:treeHash(compatible),publicTreeSha256:treeHash(distribution),reproducible,migrationAudit,tests:first.tests};
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
module.exports={sha,safePath,exactFields,uniquePaths,validateManifest,treeRecords,treeHash,assertTree,checkDependencies,build};
