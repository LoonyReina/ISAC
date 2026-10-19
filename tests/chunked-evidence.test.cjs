'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {restore,specification}=require('../scripts/restore-chunked-evidence.cjs'),root=path.resolve(__dirname,'..');
const archives=specification.archives,chunks=archives.flatMap(x=>x.chunks);
function fixture(run){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'isac-chunks-'));try{for(const c of chunks){const dest=path.join(temp,c.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,c.path),dest);}run(temp);}finally{fs.rmSync(temp,{recursive:true,force:true});}}
function rejected(mutate,pattern){fixture(temp=>{mutate(temp);assert.throws(()=>restore(temp),pattern);for(const a of archives){assert.equal(fs.existsSync(path.join(temp,a.path)),false);assert.equal(fs.existsSync(path.dirname(path.join(temp,a.path))),false);}});}
test('fourteen <=8 MiB chunks reconstruct both fixed accepted archives deterministically',()=>fixture(temp=>{assert.deepEqual(archives.map(x=>x.chunks.length),[12,2]);for(const a of archives)assert.equal(a.chunks.reduce((n,c)=>n+c.bytes,0),a.bytes);assert.ok(chunks.every(c=>c.bytes<=8*1024*1024));assert.ok(restore(temp).every(x=>x.reconstructed));assert.ok(restore(temp).every(x=>!x.reconstructed));for(const a of archives)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(temp,a.path))).digest('hex'),a.sha256);}));
test('each worst-case base64 JSON upload body is below 16 MiB',()=>{for(const c of chunks){const body=JSON.stringify({owner:'LoonyReina',repo:'ISAC',encoding:'base64',content:fs.readFileSync(path.join(root,c.path)).toString('base64')});assert.ok(Buffer.byteLength(body)<16*1024*1024);}});
for(const [n,a] of archives.entries()){
 test(`archive ${n+1}: missing chunk fails closed before either output`,()=>rejected(t=>fs.unlinkSync(path.join(t,a.chunks[1].path)),/Missing evidence/));
 test(`archive ${n+1}: swapped chunks fail closed`,()=>rejected(t=>{const x=path.join(t,a.chunks[0].path),y=path.join(t,a.chunks[1].path),bytes=fs.readFileSync(x);fs.copyFileSync(y,x);fs.writeFileSync(y,bytes);},/integrity mismatch/));
 test(`archive ${n+1}: truncated chunk fails closed`,()=>rejected(t=>fs.truncateSync(path.join(t,a.chunks.at(-1).path),10),/integrity mismatch/));
 test(`archive ${n+1}: same-length corruption fails closed`,()=>rejected(t=>{const f=path.join(t,a.chunks[0].path),fd=fs.openSync(f,'r+'),b=Buffer.alloc(1);fs.readSync(fd,b,0,1,0);b[0]^=1;fs.writeSync(fd,b,0,1,0);fs.closeSync(fd);},/integrity mismatch/));
 test(`archive ${n+1}: symlink chunk rejected`,()=>rejected(t=>{const f=path.join(t,a.chunks[0].path);fs.unlinkSync(f);fs.symlinkSync(path.join(root,a.chunks[0].path),f);},/Unsafe evidence path/));
 test(`archive ${n+1}: mismatched output never overwritten`,()=>fixture(t=>{const p=path.join(t,a.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'invalid');assert.throws(()=>restore(t),/integrity mismatch/);assert.equal(fs.readFileSync(p,'utf8'),'invalid');assert.equal(fs.existsSync(path.join(t,archives[1-n].path)),false);}));
 test(`archive ${n+1}: existing valid outputs cannot hide missing chunks`,()=>fixture(t=>{restore(t);fs.unlinkSync(path.join(t,a.chunks[1].path));assert.throws(()=>restore(t),/Missing evidence/);}));
}

test('true Git file-only checkout omits archive parents and CLI reconstructs both exact outputs',()=>fixture(t=>{
 const {spawnSync}=require('node:child_process');
 for(const f of ['build/chunked-evidence/manifest.json','scripts/restore-chunked-evidence.cjs']){const p=path.join(t,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,f),p);}
 function git(args){const r=spawnSync('git',['-C',t,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
 git(['init','--quiet']);git(['add','--','build/chunked-evidence','scripts/restore-chunked-evidence.cjs']);
 // The index stores files only. checkout-index creates a fresh directory exactly as Git does.
 const checkout=path.join(t,'checkout');fs.mkdirSync(checkout);git(['checkout-index','--all','--prefix='+checkout+'/']);
 for(const a of archives)assert.equal(fs.existsSync(path.dirname(path.join(checkout,a.path))),false);
 const result=spawnSync(process.execPath,[path.join(checkout,'scripts/restore-chunked-evidence.cjs')],{cwd:checkout,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 for(const a of archives){const bytes=fs.readFileSync(path.join(checkout,a.path));assert.equal(bytes.length,a.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);}
}));
for(const [n,a] of archives.entries()){
 test(`archive ${n+1}: destination ancestor symlink is rejected without writing through it`,()=>fixture(t=>{
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'isac-outside-'));try{
   const first=path.join(t,a.path.split('/')[0]);fs.symlinkSync(outside,first);
   assert.throws(()=>restore(t),/Unsafe evidence path/);assert.deepEqual(fs.readdirSync(outside),[]);
   assert.equal(fs.existsSync(path.join(t,archives[1-n].path)),false);
  }finally{fs.rmSync(outside,{recursive:true,force:true});}
 }));
 test(`archive ${n+1}: file ancestor is rejected before directory creation`,()=>fixture(t=>{
  fs.writeFileSync(path.join(t,a.path.split('/')[0]),'not a directory');assert.throws(()=>restore(t),/Unsafe evidence path/);
  assert.equal(fs.existsSync(path.join(t,archives[1-n].path)),false);
 }));
}
