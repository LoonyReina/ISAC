'use strict';
// Publication/metadata preservation contracts. This suite does not operate a browser.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function readForHistory(file){return require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root});}
const historyRegistry=JSON.parse(readForHistory(fs.existsSync(path.join(root,'content/data/registry.json'))?'content/data/registry.json':'site/registry.json'));
const bytes=(...names)=>{for(const n of names)if(fs.existsSync(path.join(root,n)))return fs.readFileSync(path.join(root,n));throw Error('Missing '+names.join(' or '));};
const read=(...names)=>bytes(...names).toString('utf8'),json=(...names)=>JSON.parse(read(...names)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const registry=json('site/registry.json','content/data/registry.json'),catalog=json('site/research-directory.json','content/data/research-directory.json'),backlog=json('docs/PAPER-EXECUTION-BACKLOG.json'),preserve=require('./helpers/crb-point-preservation.cjs');
const baseline={
  "anchors": [
    "site-main",
    "crb-title",
    "intuition",
    "crb-intuition-title",
    "experiment",
    "crb-experiment-title",
    "crb-threshold-value",
    "crb-threshold",
    "crb-none",
    "crb-threshold-help",
    "crb-rho-value",
    "crb-rho",
    "crb-rho-zero",
    "crb-rho-half",
    "crb-rho-one",
    "crb-rho-help",
    "crb-reset",
    "crb-regime",
    "crb-bound",
    "crb-required",
    "crb-actual",
    "crb-g",
    "crb-explanation",
    "crb-status",
    "crb-frontier",
    "crb-transition",
    "crb-pattern",
    "crb-resources",
    "crb-frontier-table",
    "crb-pattern-table",
    "crb-data",
    "understand",
    "crb-understand-title",
    "nuisance",
    "crb-unknown-alpha",
    "crb-information-chart",
    "crb-information",
    "solution",
    "model",
    "companion",
    "crb-companion-title",
    "crb-companion-section",
    "crb-kappa-value",
    "crb-kappa",
    "crb-kappa-help",
    "crb-companion-summary",
    "crb-companion-pattern",
    "crb-companion-info",
    "crb-companion-table",
    "crb-companion-data",
    "paper",
    "crb-paper-title",
    "limits",
    "crb-limits-title",
    "reproduce",
    "crb-reproduce-title"
  ],
  "old": {
    "content/data/registry.json": "d0f70acd37026f803ef68b06b8e7874e0c2ab1f40cc9522774b91274be1eb37f",
    "content/data/research-directory.json": "017a28f77567e7a7d95fa3a62d80d57a11cb6445e69fe436c389f6ebc899de77"
  }
};
const exactEvidence=[
  {
    "source": "assets/data/crb-multiuser-kernel-evidence.json",
    "public": "data/crb-multiuser-kernel-evidence.json",
    "bytes": 6121,
    "sha256": "20ddf8ff5ce02cf57410038e2fb339b03bce4e177035a56251da3b91eb1160a0"
  },
  {
    "source": "docs/CRB-MULTIUSER-KERNEL-VALIDATION.md",
    "public": "docs/CRB-MULTIUSER-KERNEL-VALIDATION.md",
    "bytes": 2386,
    "sha256": "bfd7ca02bea6e11f7ed6ce3a756861482d0296d039369bd86900abc712d89337"
  },
  {
    "source": "assets/data/crb-point-kernel-v0.4-manifest.json",
    "public": "data/crb-point-kernel-v0.4-manifest.json",
    "bytes": 42064,
    "sha256": "87789d9b2624065ade89d566e786975bdb954f0f2f86733d9f61cf070c9271d8"
  },
  {
    "source": "assets/data/crb-point-kernel-v0.4.zip",
    "public": "data/crb-point-kernel-v0.4.zip",
    "bytes": 1116412,
    "sha256": "2ebbe91bb5dac5007cdd236bea4a00ac7b8cbeee09862c2a09549f39f58997e1"
  },
  {
    "source": "assets/data/crb-beamforming-reference-v1.zip",
    "public": "data/crb-beamforming-reference-v1.zip",
    "bytes": 1889258,
    "sha256": "9541a85656523452aeba326d3f328893b032ecdd7f79a86d98e720f59e3c4e0d"
  },
  {
    "source": "assets/data/crb-beamforming-reference-v1-manifest.json",
    "public": "data/crb-beamforming-reference-v1-manifest.json",
    "bytes": 33420,
    "sha256": "3bf244d298ea2b5688e3086ade04036aeadcda84c57e0630800ead8b6cc1acae"
  },
  {
    "source": "labs/crb-beamforming/multiuser/hermitian.js",
    "public": "crb-multiuser/hermitian.js",
    "bytes": 3658,
    "sha256": "da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a"
  },
  {
    "source": "labs/crb-beamforming/multiuser/linalg.js",
    "public": "crb-multiuser/linalg.js",
    "bytes": 3688,
    "sha256": "11b0de23151c48a4cedcad17405bf26a610739b22db37378b2d77828af560d0d"
  },
  {
    "source": "labs/crb-beamforming/multiuser/core.js",
    "public": "crb-multiuser/core.js",
    "bytes": 18012,
    "sha256": "208f4d91db12d5c24d8bff921a1f31806cea846cb3f1a3a6101f7520f2e335c1"
  },
  {
    "source": "labs/crb-beamforming/multiuser/worker.js",
    "public": "crb-multiuser/worker.js",
    "bytes": 1469,
    "sha256": "cdf0412a332c79c6e7ff6d5340285b78a434838aa6c560c9b35762ec4775520b"
  },
  {
    "source": "scripts/validation/crb-export-checker/check_export.py",
    "public": "validation/crb-export-checker/check_export.py",
    "bytes": 28536,
    "sha256": "06a73ea4825613dfe6af32ffe5a8e6dac12b9d22ef0556c7e8de49f541a4c66f"
  },
  {
    "source": "scripts/validation/crb-export-checker/requirements.txt",
    "public": "validation/crb-export-checker/requirements.txt",
    "bytes": 13,
    "sha256": "7bd6b8946940b79948c548c8048e545684b91c8edc9444d8dfc0c8f76a97c0a7"
  },
  {
    "source": "scripts/validation/crb-export-checker/README.md",
    "public": "validation/crb-export-checker/README.md",
    "bytes": 6217,
    "sha256": "2c718daac9271bf2d9aec4c073f0903bbfab5f94de15c527a39a7b6c005a2458"
  },
  {
    "source": "docs/CRB-MULTIUSER-EXPORT-VALIDATION.md",
    "public": "docs/CRB-MULTIUSER-EXPORT-VALIDATION.md",
    "bytes": 2736,
    "sha256": "14c7df94952b9c13be7a6a4ec63e598dec1214bd724aad0b0103719120667f2a"
  },
  {
    "source": "docs/CRB-EXPORT-CHECKER-REVIEW.md",
    "public": "docs/CRB-EXPORT-CHECKER-REVIEW.md",
    "bytes": 8968,
    "sha256": "a76240e5840b7277723bfe8fc37607ad3d2ccc255e67d469a8231306f431189e"
  },
  {
    "source": "assets/data/crb-export-checker-tests.json",
    "public": "data/crb-export-checker-tests.json",
    "bytes": 16723,
    "sha256": "1ea97214c5ec5923f6c4b34532e93a860961bfc0167595d5ab997659d8c8d46f"
  },
  {
    "source": "assets/data/crb-export-checker-node-integration-replay.json",
    "public": "data/crb-export-checker-node-integration-replay.json",
    "bytes": 4823,
    "sha256": "795099bd178e2d36b2240a97eab7c19a5caf606213f906a34476cad1480769df"
  },
  {
    "source": "assets/data/crb-export-checker-v1-manifest.json",
    "public": "data/crb-export-checker-v1-manifest.json",
    "bytes": 14744,
    "sha256": "b09a72560297f4cafa2aba3b4b854bf0c7621517c807852184b82dee3e20c18c"
  },
  {
    "source": "assets/data/crb-beamforming-export-checker-v1.zip",
    "public": "data/crb-beamforming-export-checker-v1.zip",
    "bytes": 224856,
    "sha256": "a84817a0ef5548444506e291927c0a3495932f762bff8fea962bdbf45e2dd13d"
  }
];
test('CRB lesson preserves canonical URL, every previous anchor and old K1 numerical/controller bytes',()=>{
 const h=read('crb-beamforming.html','content/pages/crb-beamforming.html'),ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);a.equal(new Set(ids).size,ids.length);for(const id of baseline.anchors)a.ok(ids.includes(id),id);
 a.equal(sha(bytes('crb-beamforming-core.js','labs/crb-beamforming/crb-beamforming-core.js')),'d5105b56c4a45ce9ed69443ee519dd9d8594db30c5488134f2926c1d6041fce8');
 a.equal(sha(bytes('crb-beamforming.js','labs/crb-beamforming/crb-beamforming.js')),'e2fa2f03938197eab129935d6f1c16263eaac8f170ebd4bdf638634d0f146e6d');
 const c=registry.cases.filter(c=>c.id==='case-crb-beamforming');a.equal(c.length,1);a.equal(c[0].unit,'crb-beamforming');a.equal(c[0].learningEntry,'crb-beamforming.html#intuition');a.equal(registry.units.find(x=>x.id===c[0].unit).href,'crb-beamforming.html#experiment');
});
test('independently accepted immutable point runtime and optional evidence retain exact bytes',()=>{for(const e of exactEvidence){const b=bytes(e.public,e.source);a.equal(b.length,e.bytes,e.public);a.equal(sha(b),e.sha256,e.public);}const e=json('data/crb-multiuser-kernel-evidence.json','assets/data/crb-multiuser-kernel-evidence.json');a.equal(e.pointGate.independentAssertions,194);a.equal(e.pointGate.independentExecutions,32);a.equal(e.pointGate.freshPythonOracleChecks,3);a.equal(e.timing.actualBrowserMeasurements,null);a.equal(e.source.pdfRedistributed,false);});
test('optional reference archives and manifests are never startup assets',()=>{
 const h=read('crb-beamforming.html','content/pages/crb-beamforming.html');for(const tag of h.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g))a.doesNotMatch(tag[1],/(?:\.zip|manifest\.json|kernel-evidence\.json)/);
 for(const name of ['crb-multiuser-data.js','crb-multiuser-model.js','crb-multiuser.js']){const s=read(name,'labs/crb-beamforming/'+name);a.doesNotMatch(s,/(?:fetch|importScripts)\([^)]*(?:\.zip|manifest|kernel-evidence)/);}
 for(const name of ['core','linalg','hermitian','worker'])a.doesNotMatch(read('crb-multiuser/'+name+'.js','labs/crb-beamforming/multiuser/'+name+'.js'),/(?:fetch|importScripts)\([^)]*(?:\.zip|manifest|kernel-evidence)/);
 a.ok(h.includes('data/crb-point-kernel-v0.4.zip'));a.ok(h.includes('data/crb-beamforming-reference-v1.zip'));
});
test('metadata adapters restore exact previous source hashes and reject every edited-leaf mutation',()=>{
 for(const [kind,original,fn,file]of [['registry',historyRegistry,preserve.withoutCrbPointRegistry,'content/data/registry.json'],['catalog',catalog,preserve.withoutCrbPointCatalog,'content/data/research-directory.json']]){
  a.equal(sha(JSON.stringify(fn(original),null,2)+'\n'),baseline.old[file]);
  for(const entry of preserve.changes[kind])for(const ch of entry.changes){const bad=structuredClone(original);let p=preserve.collection(bad,entry.collection).find(x=>x[entry.idKey]===entry.id);for(const k of ch.path.slice(0,-1))p=p[k];p[ch.path.at(-1)]='unreviewed mutation';a.throws(()=>fn(bad));}
 }
 const changed=structuredClone(catalog);changed.cards.find(c=>c.id==='crb').metrics.unrelated='preserve';a.equal(preserve.withoutCrbPointCatalog(changed).cards.find(c=>c.id==='crb').metrics.unrelated,'preserve');
});
test('point UI, original-size reference, extended failures, ML and hosted gates are independently recorded',()=>{
 const p=backlog.papers.find(x=>x.id==='crb'),c=registry.cases.find(x=>x.id==='case-crb-beamforming');a.equal(p.stages.fullPaper,'not-reproduced');a.equal(p.stages.latency,'not-measured');a.equal(p.realtime.measuredLatencyMs,null);a.equal(p.implementation.details.pointCore.browserAccepted,false);a.match(p.stageEvidence.latency,/Node.*not browser/);a.match(JSON.stringify(c),/K1/);a.match(JSON.stringify(c),/式\(33\)/);a.match(JSON.stringify(c),/不是实际 RMSE/);a.match(JSON.stringify(c),/满列秩/);
 const point=p.branchGates.find(g=>g.branch==='bounded multiuser point-target Eq33');a.equal(point.browser,'hosted-acceptance-pending');
 const extended=p.branchGates.find(g=>g.branch==='extended-target Eq46–49');a.deepEqual([extended.accepted,extended.attempted,extended.powerBudgetInfeasible,extended.feasibleButNumericallyRejected],[10,16,3,3]);a.match(extended.execution,/offline-only/);
 const ml=p.branchGates.find(g=>g.branch==='actual ML experiments');a.equal(ml.execution,'offline-only');a.deepEqual([ml.pointChannels,ml.pointTrialsPerCondition,ml.extendedTrials],[1,256,1024]);a.equal(ml.sourceBaselines,'not-implemented');
 a.equal(backlog.scope.fullPaperReproductionsEstablished,0);a.ok(backlog.sequence.activeStages.some(x=>x.paperId==='crb'&&x.stage==='browser-validation'&&x.status==='pending'));
 const card=catalog.cards.find(c=>c.id==='crb');a.equal(card.metrics.snapshotDate,'2026-10-10');a.deepEqual([card.metrics.openAlex.count,card.metrics.semanticScholar.count,card.metrics.completedYear.count],[773,855,245]);
});

test('independent checker retains incomplete cancels and rejects poisoned raw certificates without browser claims',()=>{
 const r=json('data/crb-export-checker-node-integration-replay.json','assets/data/crb-export-checker-node-integration-replay.json'),s=json('data/crb-multiuser-live-review.json','assets/data/crb-multiuser-live-review.json'),t=json('data/crb-export-checker-tests.json','assets/data/crb-export-checker-tests.json');
 a.equal(r.checkerSha256,'06a73ea4825613dfe6af32ffe5a8e6dac12b9d22ef0556c7e8de49f541a4c66f');a.equal(r.results.filter(x=>x.file.startsWith('actual-')).length,10);a.equal(r.results.filter(x=>x.passed&&x.physicalAccepted).length,5);a.equal(r.results.filter(x=>x.passed&&!x.physicalAccepted).length,3);const cancelled=r.results.filter(x=>x.status==='cancelled');a.equal(cancelled.length,2);a.ok(cancelled.every(x=>!x.passed&&!x.physicalAccepted&&/incomplete/.test(x.issues.join(' '))));const probes=r.results.filter(x=>x.file.startsWith('probe-'));a.equal(probes.length,6);a.ok(probes.every(x=>!x.passed&&!x.physicalAccepted));
 a.equal(s.independentReview.groupsPassed,16);a.equal(s.independentReview.explicitChecks,427);a.equal(s.browserExecuted,false);a.equal(s.browserAcceptance,'open');a.equal(s.rawCertificateParsingIsNotIndependentAuthentication,true);a.equal(s.fixedDomainExcludesSubnormalAlphaNoise,true);a.equal(t.checks,78);a.equal(t.passed,true);
 const doc=read('docs/CRB-MULTIUSER-LIVE-VALIDATION.md');a.match(doc,/Subnormal/);a.match(doc,/does not independently reconstruct/);a.match(doc,/before validation\/paint/);a.doesNotMatch(doc,/\/(?:workspace|tmp)\//);
});
