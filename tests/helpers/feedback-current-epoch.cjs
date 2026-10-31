'use strict';
// TEST ONLY. Authenticate the current feedback revision, then explicitly replay
// its exact pre-feedback predecessor. This is not scientific equivalence.
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),same=(b,r)=>!!r&&b.length===r.bytes&&sha(b)===r.sha256;
const bytes=fs.readFileSync(path.join(__dirname,'feedback-current-epoch.json'));
a.equal(sha(bytes),'e152867cc1cc69e2cc99dd7ae456541845811b0eff9f950dcfd5224120dcc01b','Exact feedback epoch table');
const delta=JSON.parse(bytes),safe=f=>typeof f==='string'&&f&&!path.posix.isAbsolute(f)&&path.posix.normalize(f)===f&&!f.startsWith('../')&&!/[\\*?#]/.test(f);
const reconstructedEvidenceOutputs=["assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz", "labs/joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip"];
function validateTable(spec=delta){
 a.deepEqual(spec,delta,'Exact code-owned feedback epoch');a.equal(spec.schemaVersion,1);
 a.equal(spec.predecessorCommit,'949fe9ed334b0506b886d80c4f98d019b31f5273');
 for(const r of spec.files)a.ok(!reconstructedEvidenceOutputs.includes(r.path)&&!reconstructedEvidenceOutputs.includes(r.compatibility),'Existing chunk-restored evidence is not a feedback endpoint');
 for(const source of [true,false]){const seen=new Set();for(const r of spec.files){if(source&&r.stagedOnly||!source&&r.sourceOnly)continue;for(const f of new Set([r.path,r.compatibility])){a.ok(safe(f),'Exact feedback path');a.ok(!seen.has(f),'Unique feedback endpoint in each layout');seen.add(f);}}}
 for(const r of spec.files){a.ok(Number.isSafeInteger(r.current.bytes)&&r.current.bytes>=0&&/^[a-f0-9]{64}$/.test(r.current.sha256));if(r.predecessor)a.ok(same(zlib.inflateRawSync(Buffer.from(r.predecessorDeflateBase64,'base64')),r.predecessor),'Exact retained feedback predecessor '+r.path);else a.equal(r.predecessorDeflateBase64,undefined,'No invented predecessor');}return spec;
}
validateTable();
const sourceLayout=root=>fs.existsSync(path.join(root,'content/data/registry.json'));
function regular(root,file){a.ok(safe(file));let p=path.resolve(root);a.ok(fs.lstatSync(p).isDirectory()&&!fs.lstatSync(p).isSymbolicLink());for(const part of file.split('/')){p=path.join(p,part);a.ok(!fs.lstatSync(p).isSymbolicLink(),'No feedback endpoint symlink '+file);}a.ok(fs.lstatSync(p).isFile());return p;}
function rowFor(file,source){const rows=delta.files.filter(r=>(r.path===file||r.compatibility===file)&&!(source?r.stagedOnly:r.sourceOnly));a.ok(rows.length<=1);return rows[0];}
function before(file,input){const b=Buffer.from(input),rows=delta.files.filter(r=>(r.path===file||r.compatibility===file)&&same(b,r.current));if(!rows.length)return b;const values=rows.filter(r=>r.predecessor).map(r=>zlib.inflateRawSync(Buffer.from(r.predecessorDeflateBase64,'base64')));if(!values.length)return b;a.ok(values.every(v=>v.equals(values[0])),'Unambiguous feedback predecessor');return values[0];}
function assertCurrentClosure(root){const source=sourceLayout(root);for(const r of delta.files){if(source&&r.stagedOnly||!source&&r.sourceOnly)continue;const f=source?r.path:r.compatibility;a.ok(same(fs.readFileSync(regular(root,f)),r.current),'Exact current feedback endpoint '+f);}return true;}
function copyCurrentFixture(from,to){const source=sourceLayout(from);for(const r of delta.files){if(source&&r.stagedOnly||!source&&r.sourceOnly)continue;const f=source?r.path:r.compatibility,dest=path.join(to,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(regular(from,f),dest);}}
module.exports={reconstructedEvidenceOutputs,delta,sha,same,validateTable,regular,sourceLayout,rowFor,before,assertCurrentClosure,copyCurrentFixture};
