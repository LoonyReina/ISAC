'use strict';
// Authenticate current sources; only unrelated display/provenance is peeled for
// the unchanged timer leaf suite. The executed client always stays repaired.
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const F=require('./dual-array-browser-integration-preservation.cjs');
const records=require('./dual-array-record-portability-preservation.cjs');
const specifications=require('./dual-array-browser-timer-fixture.json'),spec=specifications.timer;
function prepare(root,name='timer'){
 a.ok(Object.hasOwn(specifications,name));const spec=specifications[name];
 const inputs=new Map();
 for(const row of spec.files){
  a.ok(!path.isAbsolute(row.path)&&path.posix.normalize(row.path)===row.path&&!row.path.startsWith('../')&&!row.path.includes('\\'));
  const candidates=[row.path,...(row.compatibility?[row.compatibility]:[])];
  const file=candidates.map(n=>path.join(root,n)).find(n=>fs.existsSync(n));a.ok(file,'timer fixture source '+row.path);a.ok(fs.lstatSync(file).isFile());
  let bytes=fs.readFileSync(file);
  if(row.path===spec.page){
   a.equal(F.sha(F.display.normalizePage(bytes.toString())),row.currentNormalizedSha256,'exact current page outside SITE regions');
   bytes=F.display.withoutPage(bytes);a.equal(F.sha(F.display.normalizePage(bytes.toString())),row.priorNormalizedSha256);
   bytes=Buffer.from(spec.rawPageBase64,'base64');
  }else{
   a.ok(F.identity(bytes,row.input),'exact current timer fixture input '+row.path);
   if(name==='timer'&&row.path===F.display.corrections[0].path)bytes=F.display.withoutCSS(bytes);
   if(name==='timer'&&F.repair.adaptedPaths.includes(row.path))bytes=F.repair.withoutAdapter(row.path,records.maybeWithoutFile(row.path,bytes));
  }
  a.ok(F.identity(bytes,row.output),'exact accepted timer fixture output '+row.path);inputs.set(row.path,bytes);
 }
 a.equal(inputs.size,spec.files.length,'unique exact timer fixture inventory');
 if(name==='timer')a.equal(F.sha(inputs.get(F.timer.correction.path)),F.timer.correction.after.sha256,'executed timer client must remain current');
 return inputs;
}
function createFixture(root,name='timer'){
 const spec=specifications[name],inputs=prepare(root,name),directory=fs.mkdtempSync(path.join(os.tmpdir(),'isac-dual-array-current-timer-'));
 const cleanup=()=>fs.rmSync(directory,{recursive:true,force:true});
 try{
  for(const[file,bytes]of inputs){const dest=path.join(directory,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);a.ok(F.identity(fs.readFileSync(dest),spec.files.find(r=>r.path===file).output));}
  a.deepEqual(fs.readdirSync(directory,{recursive:true}).filter(f=>fs.lstatSync(path.join(directory,f)).isFile()).sort(),[...inputs.keys()].sort());
  return Object.freeze({directory,suite:path.join(directory,spec.suite),cleanup});
 }catch(error){cleanup();throw error;}
}
module.exports={spec,specifications,prepare,createFixture};
