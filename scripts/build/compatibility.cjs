'use strict';
// Phase-one URL-preserving build. No source moves, rewriting or deployment actions.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process');
const BASELINE=Object.freeze({revision:'2c9ef008c3e1d9d3f723ac54e8e55236ee7adb36',compatibilityFiles:368,publicFiles:367,htmlPages:27,compatibilityDigest:"66111ff75d5ec72a615e91e22f7bcbebfd4e7a6b7d2088c84abea30ddab0940f",publicDigest:'bd9fa937430be35d8f005ba53ada219d3985da17a62523915475e47eac2dd6db'});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function insist(ok,message){if(!ok)throw new Error(message);}
function safePath(value,label){insist(typeof value==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(value)&&!value.split('/').some(p=>p==='.'||p==='..'||p==='node_modules'||(p.startsWith('.')&&!['.nojekyll','.gitignore'].includes(p))),`Unsafe ${label}: ${String(value)}`);return value;}
function uniquePaths(values,label){const seen=new Set();for(const value of values){safePath(value,label);const key=value.toLowerCase();insist(!seen.has(key),`Duplicate ${label}: ${value}`);seen.add(key);}for(const value of seen){const parts=value.split('/');parts.pop();while(parts.length){insist(!seen.has(parts.join('/')),`File/directory collision in ${label}: ${value}`);parts.pop();}}}
function regularFile(root,relative){let current=root;for(const part of relative.split('/')){current=path.join(current,part);insist(fs.existsSync(current),`Missing source: ${relative}`);insist(!fs.lstatSync(current).isSymbolicLink(),`Symlink source is not allowed: ${relative}`);}insist(fs.statSync(current).isFile(),`Source is not a regular file: ${relative}`);return current;}
function validateManifest(manifest,root){
 insist(manifest&&manifest.schemaVersion===1&&/^[a-f0-9]{40}$/.test(manifest.baselineRevision),'Invalid manifest version/revision');
 insist(Array.isArray(manifest.owners)&&manifest.owners.length>0&&Array.isArray(manifest.entries)&&manifest.entries.length>0,'Invalid manifest lists');
 const owners=new Set();for(const o of manifest.owners){safePath(o.id,'owner');if(o.plannedDirectory!=='.')safePath(o.plannedDirectory,'planned owner directory');insist(typeof o.description==='string'&&o.description.trim()&&!owners.has(o.id),'Invalid or duplicate owner');owners.add(o.id);}
 for(const e of manifest.entries){insist(e&&Object.keys(e).sort().join(',')==='compatibility,owner,plannedSource,public,role,sha256,source','Invalid manifest entry fields');for(const key of ['source','compatibility','plannedSource'])safePath(e[key],key);if(e.public!==null)safePath(e.public,'public path');insist(['source','generated-compatibility-seed','baseline-metadata'].includes(e.role),'Invalid source role');insist(owners.has(e.owner),'Unknown source owner: '+e.owner);insist(/^[a-f0-9]{64}$/.test(e.sha256),'Invalid source fingerprint: '+e.source);const file=regularFile(root,e.source);insist(sha(fs.readFileSync(file))===e.sha256,'Source baseline differs: '+e.source);}
 for(const key of ['source','compatibility','plannedSource'])uniquePaths(manifest.entries.map(e=>e[key]),key);uniquePaths(manifest.entries.filter(e=>e.public!==null).map(e=>e.public),'public path');
 const compatibility=new Set(manifest.entries.map(e=>e.compatibility));for(const required of ['scripts/generate-site.cjs','scripts/generate-waveform.py','site/registry.json','.nojekyll'])insist(compatibility.has(required),'Missing build input: '+required);
 const records=key=>manifest.entries.filter(e=>e[key]!==null).map(e=>({path:e[key],sha256:e.sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 insist(manifest.baselineRevision===BASELINE.revision&&manifest.entries.length===BASELINE.compatibilityFiles,'Approved compatibility baseline coverage changed');
 insist(records('public').length===BASELINE.publicFiles&&records('public').filter(e=>!e.path.includes('/')&&e.path.endsWith('.html')).length===BASELINE.htmlPages,'Approved public baseline coverage changed');
 insist(sha(JSON.stringify(records('compatibility')))===BASELINE.compatibilityDigest&&sha(JSON.stringify(records('public')))===BASELINE.publicDigest,'Approved baseline path/byte inventory changed');
 return manifest;
}
function copyFile(source,dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}
function listFiles(root,prefix=''){const result=[];for(const name of fs.readdirSync(path.join(root,prefix)).sort()){const rel=prefix?prefix+'/'+name:name,stat=fs.lstatSync(path.join(root,rel));insist(!stat.isSymbolicLink(),'Unexpected output symlink: '+rel);if(stat.isDirectory())result.push(...listFiles(root,rel));else{insist(stat.isFile(),'Unexpected output object: '+rel);result.push(rel);}}return result.sort();}
function treeRecords(root){return listFiles(root).map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}));}
function treeHash(root){return sha(JSON.stringify(treeRecords(root)));}
function assertTree(root,expected){const actual=treeRecords(root);insist(JSON.stringify(actual)===JSON.stringify([...expected].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)),'Compatibility output changed, missing, or unexpected file: '+root);}
function checkDependencies(root,manifest){
 const all=new Map(manifest.entries.filter(e=>e.public!==null).map(e=>[e.public,e])),edges=[];
 const local=(from,raw,kind)=>{
  if(!raw||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw))return;
  const url=new URL(raw.replace(/&amp;/g,'&'),'https://compatibility.invalid/'+from);insist(url.origin==='https://compatibility.invalid','Unexpected URL origin');
  let target;try{target=decodeURIComponent(url.pathname.slice(1));}catch{throw Error('Invalid encoded local URL: '+from+' → '+raw);}
  if(!target)target='index.html';insist(all.has(target),'Unmapped public dependency: '+from+' → '+raw);insist(fs.existsSync(path.join(root,target)),'Missing public dependency: '+target);
  if(url.hash&&target.endsWith('.html')){let fragment;try{fragment=decodeURIComponent(url.hash.slice(1));}catch{throw Error('Invalid local fragment: '+raw);}const text=fs.readFileSync(path.join(root,target),'utf8');insist(text.includes('id="'+fragment+'"')||text.includes("id='"+fragment+"'"),'Missing public fragment: '+from+' → '+raw);}
  edges.push({from,to:target,kind});
 };
 for(const [name]of all){const text=fs.readFileSync(path.join(root,name),'utf8');
  if(!name.includes('/')&&name.endsWith('.html'))for(const m of text.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/g))local(name,m[2],m[1]);
  if(name.endsWith('.md')){const prose=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`\n]*`/g,'');for(const m of prose.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g))if(/^(?:https?:|#|\.{1,2}\/)|\.(?:md|json|txt|log|sha256|js|cjs|mjs|html|css|py|pdf)(?:[?#]|$)/i.test(m[1]))local(name,m[1],'documentation');}
  if(name.endsWith('.css'))for(const m of text.matchAll(/(?:url\(\s*["']?([^"')\s]+)|@import\s+["']([^"']+))/g))local(name,m[1]||m[2],'css');
  if(name.endsWith('.js'))for(const m of text.matchAll(/\b(?:fetch|require(?:\.resolve)?)\(\s*['"]([^'"]+)['"]/g))if(m[1].startsWith('.')||m[1].includes('/'))local(name,m[1],'runtime');
 }
 // This script constructs URLs from currentScript.src; the literal sequence is
 // checked before adding its dependencies, rather than guessed from filenames.
 const course=fs.readFileSync(path.join(root,'course.js'),'utf8');
 insist(/document\.currentScript\.src/.test(course),'Course loader contract changed');
 for(const file of ['course-ui.js','velocity-core.js','velocity-bridge.js']){insist(course.includes("'"+file+"'"),'Unmapped dynamic course dependency: '+file);local('course.js',file,'dynamic-runtime');}
 return edges.sort((a,b)=>(a.from+'\0'+a.to+'\0'+a.kind).localeCompare(b.from+'\0'+b.to+'\0'+b.kind,'en'));
}
function run(command,args,cwd){const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});if(result.error)throw result.error;insist(result.status===0,`Command failed: ${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);return result.stdout;}
function stage(manifest,root,directory,runTests){
 fs.mkdirSync(directory,{recursive:true});for(const e of manifest.entries)copyFile(path.join(root,e.source),path.join(directory,e.compatibility));
 const expected=manifest.entries.map(e=>({path:e.compatibility,sha256:e.sha256}));assertTree(directory,expected);
 run(process.execPath,['scripts/generate-site.cjs'],directory);run(process.execPath,['scripts/generate-site.cjs','--check'],directory);
 // --check preserves the canonical NumPy/BLAS artifact bytes while independently
 // recomputing its numerical invariants; normal regeneration can change SVD signs.
 run('python3',['scripts/generate-waveform.py','--check'],directory);assertTree(directory,expected);
 const dependencies=checkDependencies(directory,manifest);let tests=null;
 if(runTests){const files=manifest.entries.map(e=>e.compatibility).filter(f=>/^tests\/[^/]+\.test\.cjs$/.test(f)).sort();insist(files.length>0,'No compatibility tests');tests=run(process.execPath,['--test',...files],directory);assertTree(directory,expected);}
 return {dependencies,tests};
}
function build({root,manifest,output,runTests=false,reproducible=false,check=false}){
 root=fs.realpathSync(root);validateManifest(manifest,root);const destination=path.resolve(output);for(let current=destination;;current=path.dirname(current)){if(fs.existsSync(current))insist(!fs.lstatSync(current).isSymbolicLink(),'Output path must not contain symlinks');if(path.dirname(current)===current)break;}insist(destination!==root&&!root.startsWith(destination+path.sep),'Output cannot contain the source tree');
 for(const e of manifest.entries)insist(path.resolve(root,e.source)!==destination&&!path.resolve(root,e.source).startsWith(destination+path.sep),'Output overlaps a source input');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'isac-compatibility-'));try{
  const compatible=path.join(temporary,'compatibility'),first=stage(manifest,root,compatible,runTests);
  if(reproducible){const second=path.join(temporary,'independent-build');stage(manifest,root,second,false);insist(treeHash(compatible)===treeHash(second),'Independent clean builds differ');}
  const distribution=path.join(temporary,'dist');fs.mkdirSync(distribution);for(const e of manifest.entries)if(e.public!==null)copyFile(path.join(compatible,e.compatibility),path.join(distribution,e.public));
  const publicExpected=manifest.entries.filter(e=>e.public!==null).map(e=>({path:e.public,sha256:e.sha256}));assertTree(distribution,publicExpected);
  if(fs.existsSync(destination)){insist(fs.lstatSync(destination).isDirectory()&&!fs.lstatSync(destination).isSymbolicLink(),'Output must be a directory');assertTree(destination,publicExpected);}else{insist(!check,'Output does not exist for --check');const parent=path.dirname(destination);fs.mkdirSync(parent,{recursive:true});insist(fs.realpathSync(parent)===parent,'Output parent must not contain symlinks');const pending=fs.mkdtempSync(path.join(parent,'.isac-dist-'));try{for(const record of treeRecords(distribution))copyFile(path.join(distribution,record.path),path.join(pending,record.path));assertTree(pending,publicExpected);fs.renameSync(pending,destination);}finally{fs.rmSync(pending,{recursive:true,force:true});}}
  return {baselineRevision:manifest.baselineRevision,compatibilityFiles:manifest.entries.length,publicFiles:publicExpected.length,htmlPages:publicExpected.filter(e=>!e.path.includes('/')&&e.path.endsWith('.html')).length,dependencyEdges:first.dependencies.length,compatibilityTreeSha256:treeHash(compatible),publicTreeSha256:treeHash(distribution),reproducible,tests:first.tests};
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
module.exports={BASELINE,safePath,validateManifest,treeRecords,treeHash,assertTree,checkDependencies,build};
