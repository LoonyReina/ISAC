'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib');
const F=require('./helpers/feedback-current-epoch.cjs'),T=require('./helpers/target19-source-identity.cjs'),root=path.resolve(__dirname,'..');
test('feedback epoch authenticates actual current bytes without rebasing frozen teaching tables',()=>{
 a.equal(F.assertCurrentClosure(root),true);a.equal(T.assertCurrentClosure(root),true);
 a.equal(F.sha(fs.readFileSync(path.join(__dirname,'helpers/teaching-current-epoch.json'))),'3f1faf58a49371d26b55f2cbc4fb0b62e2f168ab1ca6cb38b4717966eee669ef');
 a.equal(F.sha(fs.readFileSync(path.join(__dirname,'helpers/target19-source-delta.json'))),'b3886f1d89b7b20e86933979f5f1623f023031cd49712c133fba62cf78597d70');
 const source=F.sourceLayout(root);for(const r of F.delta.files){if(source&&r.stagedOnly||!source&&r.sourceOnly)continue;const file=source?r.path:r.compatibility,raw=fs.readFileSync(path.join(root,file)),prior=F.before(file,raw);if(r.predecessor){a.ok(F.same(prior,r.predecessor));a.ok(F.before(file,prior).equals(prior));}else a.ok(prior.equals(raw));}
});
test('feedback current closure rejects altered missing renamed symlink and stale endpoints',t=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'feedback-identity-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 if(F.sourceLayout(root)){fs.mkdirSync(path.join(out,'content/data'),{recursive:true});fs.copyFileSync(path.join(root,'content/data/registry.json'),path.join(out,'content/data/registry.json'));}F.copyCurrentFixture(root,out);a.ok(F.assertCurrentClosure(out));
 const r=F.delta.files.find(r=>r.path==='features/teaching19/engine.js'),p=path.join(out,r.path),raw=fs.readFileSync(p);
 for(const wrong of [Buffer.concat([raw,Buffer.from(' ')]),zlib.inflateRawSync(Buffer.from(r.predecessorDeflateBase64,'base64'))]){fs.writeFileSync(p,wrong);a.throws(()=>F.assertCurrentClosure(out));}fs.writeFileSync(p,raw);
 fs.renameSync(p,p+'.saved');a.throws(()=>F.assertCurrentClosure(out));fs.symlinkSync(p+'.saved',p);a.throws(()=>F.assertCurrentClosure(out),/symlink/);fs.unlinkSync(p);fs.renameSync(p+'.saved',p);a.ok(F.assertCurrentClosure(out));
 a.ok(F.before('unreviewed/engine.js',raw).equals(raw));
});
test('feedback table rejects wildcard duplicate omitted or forged predecessors',()=>{
 for(const mutate of [s=>s.files.pop(),s=>s.files.push(s.files[0]),s=>s.files[0].path='features/*',s=>s.files.find(r=>r.predecessor).predecessorDeflateBase64='Zm9yZ2Vk',s=>s.files.find(r=>r.predecessor).predecessor.bytes++,s=>s.files.find(r=>r.predecessor).predecessor.sha256='0'.repeat(64)]){const d=structuredClone(F.delta);mutate(d);a.throws(()=>F.validateTable(d));}
});

// Reconstruction belongs to restore-chunked-evidence, after the CI source gates.
// A source identity check must not require its unchanged untracked outputs.
test('feedback closure excludes existing chunk-restored archives and passes before reconstruction',t=>{
 const outputs=['assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz','labs/joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip'];
 a.deepEqual(F.reconstructedEvidenceOutputs,outputs);
 for(const file of outputs)a.ok(!F.delta.files.some(r=>r.path===file||r.compatibility===file),'No invented added feedback identity '+file);
 if(F.sourceLayout(root)){
  a.equal(F.sha(fs.readFileSync(path.join(root,'build/chunked-evidence/manifest.json'))),'017691171898eadc6e6caea7a0350ad63433105a5d0c822fa3d4ed1d84c02799');
  a.equal(F.sha(fs.readFileSync(path.join(root,'scripts/restore-chunked-evidence.cjs'))),'eb665759fd57d7ea2bb6dce931ca264ba87a5a9d214b2f6301beb945db73b62d');
 }
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'feedback-pre-restore-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 T.copyCurrentFixture(root,out);
 for(const file of outputs)a.equal(fs.existsSync(path.join(out,file)),false,'Identity fixture contains no reconstruction output');
 a.equal(F.assertCurrentClosure(out),true);a.equal(T.assertCurrentClosure(out),true);
});
