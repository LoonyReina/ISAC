#!/usr/bin/env node
'use strict';
// Source transport only: compatibility mappings and public downloads stay unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const specification=require('../build/chunked-evidence/manifest.json');
const identities=[
 {path:'assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz',bytes:96924176,sha256:'20185af2e4a58a24aa6bfd279f31bcad28fb2be60a8ec94bbe24da84dc21ddeb'},
 {path:'labs/joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip',bytes:13437937,sha256:'ee6981ef11b601be5d1af67f52a1e586501f3d08bfc6922974385baba0f738df'}
];
const CHUNK_BYTES=8*1024*1024;
function regular(root,relative,allowMissing=false){
 const parts=relative.split('/');let current=root;
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);const stat=fs.lstatSync(current,{throwIfNoEntry:false});
  // A missing ancestor has no descendants to inspect; validate existing ancestors first.
  if(allowMissing&&!stat)return path.join(root,relative);
  if(!stat)throw Error('Missing evidence path: '+relative);
  if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile():!stat.isDirectory()))throw Error('Unsafe evidence path: '+relative);
 }
 return current;
}
function createParents(root,relative){
 let current=root;
 for(const part of relative.split('/').slice(0,-1)){
  current=path.join(current,part);
  if(!fs.lstatSync(current,{throwIfNoEntry:false})){
   try{fs.mkdirSync(current);}catch(error){if(error.code!=='EEXIST')throw error;}
  }
  const stat=fs.lstatSync(current);
  if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Unsafe evidence path: '+relative);
 }
}
function digest(file,expected,output){
 const hash=crypto.createHash('sha256'),buffer=Buffer.alloc(1024*1024),fd=fs.openSync(file,'r');let size=0;
 try{let count;while((count=fs.readSync(fd,buffer,0,buffer.length,null))){hash.update(buffer.subarray(0,count));if(output!==undefined)fs.writeFileSync(output,buffer.subarray(0,count));size+=count;}}finally{fs.closeSync(fd);}
 if(size!==expected.bytes||hash.digest('hex')!==expected.sha256)throw Error('Evidence integrity mismatch: '+expected.path);
}
function restore(root=path.resolve(__dirname,'..')){
 root=fs.realpathSync(root);
 if(specification.schemaVersion!==2||specification.chunkBytes!==CHUNK_BYTES||!Array.isArray(specification.archives)||specification.archives.length!==identities.length)throw Error('Unexpected evidence manifest');
 const jobs=identities.map((identity,n)=>{
  const archive=specification.archives[n];
  if(!archive||!Object.keys(identity).every(k=>archive[k]===identity[k])||!Array.isArray(archive.chunks)||archive.chunks.length!==Math.ceil(identity.bytes/CHUNK_BYTES))throw Error('Unexpected evidence identity');
  const files=archive.chunks.map((chunk,i)=>{
   if(chunk.path!==`build/chunked-evidence/${path.basename(identity.path)}.part${String(i+1).padStart(3,'0')}`||chunk.bytes!==Math.min(CHUNK_BYTES,identity.bytes-i*CHUNK_BYTES)||!/^[a-f0-9]{64}$/.test(chunk.sha256))throw Error('Invalid evidence chunk');
   return regular(root,chunk.path);
  });
  return {archive,files,destination:regular(root,identity.path,true)};
 });
 // Validate every chunk and existing output before creating any archive.
 for(const {archive,files,destination} of jobs){
  for(let i=0;i<files.length;i++)digest(files[i],archive.chunks[i]);
  if(fs.existsSync(destination))digest(destination,archive);
 }
 return jobs.map(({archive,files,destination})=>{
  if(fs.existsSync(destination))return {...identities.find(x=>x.path===archive.path),reconstructed:false};
  // Only validated inputs may cause directory creation. Check each component, never follow symlinks.
  createParents(root,archive.path);
  regular(root,archive.path,true);
  const temporary=fs.mkdtempSync(path.join(path.dirname(destination),'.chunked-evidence-')),pending=path.join(temporary,'archive');
  try{
   const fd=fs.openSync(pending,'wx');
   try{for(let i=0;i<files.length;i++)digest(files[i],archive.chunks[i],fd);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   digest(pending,archive);
   // Refuse to replace anything created while reconstruction was in progress.
   regular(root,archive.path,true);
   fs.linkSync(pending,destination);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
  return {...identities.find(x=>x.path===archive.path),reconstructed:true};
 });
}
module.exports={restore,specification};
if(require.main===module)console.log(JSON.stringify(restore(),null,2));
