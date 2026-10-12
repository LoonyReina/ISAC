'use strict';
// Source/registration/evidence integration only. These checks are not a browser acceptance.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const bytes=(...files)=>{for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))return fs.readFileSync(p);}throw Error('Missing input '+files.join(' or '));};
const read=(...files)=>bytes(...files).toString('utf8'),json=(...files)=>JSON.parse(read(...files)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const registry=json('site/registry.json','content/data/registry.json'),catalog=json('site/research-directory.json','content/data/research-directory.json'),backlog=json('docs/PAPER-EXECUTION-BACKLOG.json');
const preserve=require('./helpers/combined-paper-solvers-preservation.cjs');
const anchors={
  "joint-beamforming.html": [
    "site-main",
    "intuition",
    "model",
    "experiment",
    "jb-recipe",
    "jb-eta-value",
    "jb-eta",
    "jb-noise",
    "jb-qos",
    "jb-reset",
    "jb-status",
    "jb-story",
    "jb-pattern",
    "jb-eigen",
    "jb-correlation",
    "jb-powers",
    "jb-metrics",
    "jb-invariants",
    "jb-bound",
    "jb-matrices",
    "solution",
    "paper",
    "limits",
    "reproduce"
  ],
  "waveform-design.html": [
    "site-main",
    "intuition",
    "model",
    "experiment",
    "wfl-small",
    "wfl-paper",
    "wfl-zero",
    "wfl-n",
    "wfl-k",
    "wfl-l",
    "wfl-seed",
    "wfl-pt",
    "wfl-beta",
    "wfl-angle",
    "wfl-new-seed",
    "wfl-run",
    "wfl-cancel",
    "wfl-reset",
    "wfl-download",
    "wfl-status",
    "wfl-error",
    "wfl-input-help",
    "wfl-input",
    "wfl-apply",
    "wfl-result",
    "wfl-budget",
    "wfl-rank",
    "wfl-metrics",
    "wfl-certificate",
    "wfl-user",
    "wfl-antenna",
    "wfl-symbols",
    "wfl-pattern",
    "wfl-time-i",
    "wfl-time-q",
    "wfl-snr",
    "wfl-rate-status",
    "wfl-rates",
    "wfl-rate-total",
    "wfl-matrix-kind",
    "wfl-matrix-method",
    "wfl-matrix",
    "wfl-diagnostics",
    "offline-history",
    "wf-channel",
    "wf-beta",
    "wf-angle",
    "wf-user",
    "wf-reset",
    "wf-status",
    "wf-pattern",
    "wf-symbols",
    "wf-time",
    "wf-metrics",
    "wf-bound",
    "wf-matrix",
    "solution",
    "paper",
    "limits",
    "reproduce"
  ]
};
test('both existing lesson URLs keep every original anchor and unique IDs',()=>{
 for(const [file,ids] of Object.entries(anchors)){const h=read(file,'content/pages/'+file),current=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);a.equal(new Set(current).size,current.length,file+' duplicate IDs');for(const id of ids)a.ok(current.includes(id),file+'#'+id);}
 for(const [id,unit] of [['case-waveform','waveform-design'],['case-joint-beamforming','joint-beamforming']]){const c=registry.cases.filter(c=>c.id===id);a.equal(c.length,1);a.equal(c[0].unit,unit);a.equal(c[0].learningEntry,unit+'.html#intuition');a.equal(registry.units.find(x=>x.id===unit).href,unit+'.html#experiment');}
});
test('approved numerical runtime bytes and original prerequisite cores are unchanged',()=>{
 const entries=[
 [['weighted-core.js','labs/waveform-design/weighted-core.js'],'70f720a7f67f95b139f31171370d86e9e348bf9a91b4a0d0c38717a66cf5a6a3'],
 [['procrustes-core.js','labs/waveform-design/procrustes-core.js'],'a844089a501bec61002fe8562f54314c04bc4f27b622033c3995052770b050c6'],
 [['joint-beamforming-optimizer/core.js','labs/joint-beamforming/optimizer/core.js'],'a6de335f1a57d144cc8aebee1c33ec80397c3c948a9d93c38c1fafbcd1cf262b'],
 [['joint-beamforming-optimizer/hermitian.js','labs/joint-beamforming/optimizer/hermitian.js'],'da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a'],
 [['joint-beamforming-optimizer/worker.js','labs/joint-beamforming/optimizer/worker.js'],'7c0ebef89c8c005e62af9725b0f333633d1f6657aae6096e503399a976afefde'],
 [['joint-beamforming-core.js','labs/joint-beamforming/joint-beamforming-core.js'],'1e09b1aa8908b649cad38142f9b035dce355dedf2ffd177d4b2ccbd510ef8882'],
 [['joint-beamforming.js','labs/joint-beamforming/joint-beamforming.js'],'e0200afb9beb6d80e273ccc5f4c37d8d37d35a22f2d32827212abd77e18c9890']];
 for(const [files,hash]of entries)a.equal(sha(bytes(...files)),hash,files[0]);
});
test('published scope distinguishes numerical algorithms, changed constraints and missing paper/browser gates',()=>{
 const w=registry.cases.find(c=>c.id==='case-waveform'),j=registry.cases.find(c=>c.id==='case-joint-beamforming');
 a.match(w.fields['交互机制'],/严格协方差解 X₀/);a.match(w.fields['交互机制'],/放松协方差等式/);a.match(w.fields['结论边界'],/原图3加权曲线仍未吻合/);a.match(JSON.stringify(w),/radar-closest/);
 a.match(j.fields['交互机制'],/式\(15\).*SDR式\(32\).*ZF式\(40\)/);a.match(j.fields['结论边界'],/迭代上限只表示未解决/);a.match(JSON.stringify(j),/1000/);
 for(const id of ['joint_beamforming','optimal_waveform']){a.equal(catalog.cards.filter(c=>c.id===id).length,1);const p=backlog.papers.find(p=>p.id===id);a.equal(p.stages.fullPaper,'not-reproduced');a.notEqual(p.stages.liveExecution,'validated');a.match(JSON.stringify(p.blockers),/browser/i);}
 const wRecord=backlog.papers.find(p=>p.id==='optimal_waveform');a.equal(wRecord.branchGates.find(g=>g.branch==='Section IV weighted equality-energy').latency,'not-measured');a.match(wRecord.stageEvidence.latency,/earlier strict-only/);
 a.equal(backlog.scope.fullPaperReproductionsEstablished,0);
});
test('all exact metadata adapters reject tampering and retain unrelated scientific/citation changes',()=>{
 for(const [kind,original,fn]of [['registry',registry,preserve.withoutCombinedRegistry],['catalog',catalog,preserve.withoutCombinedCatalog]]){
  const prior=fn(original);a.notDeepEqual(prior,original);
  for(const entry of preserve.changes[kind])for(const ch of entry.changes){const bad=structuredClone(original);let p=preserve.collection(bad,entry.collection).find(x=>x[entry.idKey]===entry.id);for(const k of ch.path.slice(0,-1))p=p[k];p[ch.path.at(-1)]='unreviewed mutation';a.throws(()=>fn(bad));}
 }
 const c=structuredClone(catalog);c.cards.find(x=>x.id==='joint_beamforming').metrics.unrelated='preserve';a.equal(preserve.withoutCombinedCatalog(c).cards.find(x=>x.id==='joint_beamforming').metrics.unrelated,'preserve');
});
test('complete joint reference is three exact optional raw parts, never a nonexistent single ZIP',()=>{
 const prefix=fs.existsSync(path.join(root,'validation'))?'validation/':'labs/joint-beamforming/validation/';
 const parts=[['01',9000000,'2d40fab63f5f43c06fbdb3a517523830c3fd0a2612b0e2f438264615fe722eaa'],['02',9000000,'c8357ca4735d4d1beae6ab3f7a49dafd9ae11dc386064c07eb26d1b558f6cd50'],['03',7845796,'87b936960755fe0efcf0e640a17930d09f380b3b2e4c1bf86ef4d2de08b5517f']];
 const all=[];for(const [n,size,hash]of parts){const b=bytes(prefix+'joint-beamforming-reference-v1.zip.part'+n);a.equal(b.length,size);a.equal(sha(b),hash);all.push(b);}a.equal(sha(Buffer.concat(all)),'3baff9d3e29cec528442fc2c4b9ab8dc34aceb7076803ca4e0c1f6783b4a59b2');
 a.equal(fs.existsSync(path.join(root,prefix+'joint-beamforming-reference-v1.zip')),false);
 const page=read('joint-beamforming.html','content/pages/joint-beamforming.html');a.doesNotMatch(page,/href="[^"]*joint-beamforming-reference-v1\.zip"/);
 for(const f of ['joint-beamforming-optimizer-model.js','joint-beamforming-optimizer-data.js','joint-beamforming-optimizer.js']){const js=read(f,'labs/joint-beamforming/'+f);a.doesNotMatch(js,/(?:fetch|importScripts)\([^)]*(?:numerical-reference|zip\.part|export-checker|OPTIONAL-REFERENCE)/);}
});
