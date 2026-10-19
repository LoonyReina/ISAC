'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {recoveryDependencies,requiredFiles,requiredModules,requiredMounts}=require('../scripts/build/recovery-dependencies.cjs');
const root=path.resolve(__dirname,'..'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
// Explicit fixture loader supports authoritative source and isolated legacy stage.
// This never relaxes the production validator or invents the missing old fixture.
const fixtureAliases={
  "otfs-receiver/joint/joint-core.mjs": [
    "labs/otfs-receiver/joint/joint-core.mjs"
  ],
  "otfs-receiver/joint/simulation.mjs": [
    "labs/otfs-receiver/joint/simulation.mjs"
  ],
  "otfs-receiver/joint/lesson.mjs": [
    "labs/otfs-receiver/joint/lesson.mjs"
  ],
  "otfs-receiver/joint/worker.mjs": [
    "labs/otfs-receiver/joint/worker.mjs"
  ],
  "otfs-receiver/joint/waveform.json": [
    "labs/otfs-receiver/joint/waveform.json"
  ],
  "otfs-receiver/joint/lesson-fragment.html": [
    "labs/otfs-receiver/joint/lesson-fragment.html"
  ],
  "otfs-receiver/joint/joint.css": [
    "labs/otfs-receiver/joint/joint.css"
  ],
  "otfs-receiver/joint/scenes.json": [
    "labs/otfs-receiver/joint/scenes.json"
  ],
  "otfs-receiver/joint/session.mjs": [
    "labs/otfs-receiver/joint/session.mjs"
  ],
  "otfs-receiver/joint/new-offline-summary.json": [
    "labs/otfs-receiver/joint/new-offline-summary.json"
  ],
  "joint-beamforming/ssp/ssp-core.mjs": [
    "labs/joint-beamforming/ssp/ssp-core.mjs"
  ],
  "joint-beamforming/ssp/ssp-ui.mjs": [
    "labs/joint-beamforming/ssp/ssp-ui.mjs"
  ],
  "joint-beamforming/ssp/ssp.css": [
    "labs/joint-beamforming/ssp/ssp.css"
  ],
  "joint-beamforming/ssp/SOURCE-AUDIT.md": [
    "labs/joint-beamforming/ssp/SOURCE-AUDIT.md"
  ],
  "joint-beamforming/ssp/ssp-data.json": [
    "labs/joint-beamforming/ssp/ssp-data.json"
  ],
  "joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip": [
    "labs/joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip"
  ],
  "otfs-receiver/mppsi/mppsi-worker.mjs": [
    "labs/otfs-receiver/mppsi/mppsi-worker.mjs"
  ],
  "otfs-receiver/mppsi/mppsi.css": [
    "labs/otfs-receiver/mppsi/mppsi.css"
  ],
  "otfs-receiver/mppsi/offline-summary.json": [
    "labs/otfs-receiver/mppsi/offline-summary.json"
  ],
  "otfs-receiver/mppsi/SOURCE-CONTRACT.md": [
    "labs/otfs-receiver/mppsi/SOURCE-CONTRACT.md"
  ],
  "otfs-receiver/mppsi/mppsi-ui.mjs": [
    "labs/otfs-receiver/mppsi/mppsi-ui.mjs"
  ],
  "otfs-receiver/mppsi/mppsi-kernel.mjs": [
    "labs/otfs-receiver/mppsi/mppsi-kernel.mjs"
  ],
  "otfs-receiver/mppsi/accepted-kernel.mjs": [
    "labs/otfs-receiver/mppsi/accepted-kernel.mjs"
  ],
  "otfs-receiver/mppsi/revalidation/README.md": [
    "labs/otfs-receiver/mppsi/revalidation/README.md"
  ],
  "otfs-receiver/mppsi/revalidation/recovery-report.json": [
    "labs/otfs-receiver/mppsi/revalidation/recovery-report.json"
  ],
  "otfs-receiver/mppsi/revalidation/numerical-report.json": [
    "labs/otfs-receiver/mppsi/revalidation/numerical-report.json"
  ],
  "otfs-receiver/mppsi/revalidation/lifecycle-report.json": [
    "labs/otfs-receiver/mppsi/revalidation/lifecycle-report.json"
  ],
  "joint-beamforming/ssp/ssp-model.mjs": [
    "labs/joint-beamforming/ssp/ssp-model.mjs"
  ],
  "joint-beamforming/ssp/ssp-worker.mjs": [
    "labs/joint-beamforming/ssp/ssp-worker.mjs"
  ],
  "joint-beamforming/ssp/user-load-data.json": [
    "labs/joint-beamforming/ssp/user-load-data.json"
  ],
  "joint-beamforming/ssp/teaching-pins.mjs": [
    "labs/joint-beamforming/ssp/teaching-pins.mjs"
  ],
  "joint-beamforming/ssp/USER-LOAD-SOURCE-AUDIT.md": [
    "labs/joint-beamforming/ssp/USER-LOAD-SOURCE-AUDIT.md"
  ],
  "joint-beamforming/ssp/evidence/user-load-final-review.json": [
    "labs/joint-beamforming/ssp/evidence/user-load-final-review.json"
  ],
  "joint-beamforming/ssp/evidence/REVIEW.md": [
    "labs/joint-beamforming/ssp/evidence/REVIEW.md"
  ],
  "joint-beamforming/ssp/evidence/REAL-MAPPING-REVIEW.json": [
    "labs/joint-beamforming/ssp/evidence/REAL-MAPPING-REVIEW.json"
  ],
  "pilot-patterns.html": [
    "content/pages/pilot-patterns.html"
  ],
  "cellfree-maprt.html": [
    "content/pages/cellfree-maprt.html"
  ],
  "otfs-receiver.html": [
    "content/pages/otfs-receiver.html"
  ],
  "joint-beamforming.html": [
    "content/pages/joint-beamforming.html"
  ],
  "crb-beamforming.html": [
    "content/pages/crb-beamforming.html"
  ]
};
function readPublic(file){const candidates=[file,...(fixtureAliases[file]||[])];const actual=candidates.find(candidate=>fs.existsSync(path.join(root,candidate)));assert.ok(actual,'missing explicit fixture input '+file+'; checked '+candidates.join(', '));return fs.readFileSync(path.join(root,actual));}
function fixture(){return {identities:Object.keys(requiredFiles).map(file=>({file,sha256:sha(readPublic(file))})),modules:Object.keys(requiredModules).map(file=>({file,source:readPublic(file).toString()})),contract:JSON.parse(fs.readFileSync(path.join(root,'scripts/build/module-runtime-contracts.json'))),pages:Object.keys(requiredMounts).map(file=>({file,source:readPublic(file).toString()}))};}
function rejects(f,pattern=/Recovery production boundary/){assert.throws(()=>recoveryDependencies(f),pattern);}
test('NEW recovery full required asset and contract inventory accepts current exact bytes',()=>{const edges=recoveryDependencies(fixture());assert.ok(edges.some(e=>e.kind==='recovery-classic-worker'));assert.equal(edges.filter(e=>e.kind==='recovery-importScripts').length,3);assert.ok(edges.some(e=>e.from.endsWith('/prototype/index.html')&&e.url==='app.js'));assert.ok(edges.some(e=>e.from==='labs/pilot-pattern/runtime/calibration.mjs'&&e.url==='./processing.mjs'));});
test('production rejects removing every recovery asset and contract together',()=>{const f=fixture();f.identities=[];f.modules=[];f.contract.modules=[];f.pages=[];rejects(f,/required asset/);});
for(const [name,predicate]of [
 ['pilot',f=>f.startsWith('labs/pilot-pattern/')||f.includes('new-calibrated-detection')],
 ['MAPRT',f=>f.startsWith('labs/cellfree-maprt/robustness/')||f.includes('new-robustness-evidence')],
 ['OTFS',f=>f.startsWith('otfs-receiver/joint/')||f.includes('new-joint-evidence')],
 ['MPΨ',f=>f.startsWith('otfs-receiver/mppsi/')],
 ['uniform user-load',f=>f.includes('user-load-uniform-recomputation-20261018-full.tar.xz')||f.startsWith('joint-beamforming/ssp/')&&(/(?:user-load|teaching-pins|ssp-model|ssp-worker|USER-LOAD|evidence\/)/).test(f)],
 ['SSP',f=>f.startsWith('joint-beamforming/ssp/')],
 ['extended CRB',f=>f.startsWith('labs/crb-beamforming/extended-lab/')||f.includes('new-extended-crb-evidence')]
])test('production rejects whole '+name+' removal even with matching contract deletion',()=>{const f=fixture();f.identities=f.identities.filter(e=>!predicate(e.file));f.modules=f.modules.filter(e=>!predicate(e.file));f.contract.modules=f.contract.modules.filter(e=>!predicate(e.public));rejects(f,/required asset/);});
test('every required asset and every required contract are individually mandatory',()=>{const original=fixture();for(const file of Object.keys(requiredFiles)){const f=structuredClone(original);f.identities=f.identities.filter(e=>e.file!==file);rejects(f,/required asset/);}for(const file of Object.keys(requiredModules)){const f=structuredClone(original);f.contract.modules=f.contract.modules.filter(e=>e.public!==file);rejects(f,/required contract/);}});
test('each runtime edge rejects omitted changed reordered and policy-downgraded contracts',()=>{const original=fixture();for(const [file,expected]of Object.entries(requiredModules).filter(([,p])=>p.runtimeEdges.length)){for(const mutate of [c=>c.runtimeEdges.pop(),c=>c.runtimeEdges[0].url='./wrong.json',c=>c.runtimeEdges[0].kind='worker-not-data',c=>{c.runtimePolicy='no-runtime-loads';c.runtimeEdges=[];},c=>c.unverifiedInputs.push('escape')]){const f=structuredClone(original);mutate(f.contract.modules.find(c=>c.public===file));rejects(f);}if(expected.runtimeEdges.length>1){const f=structuredClone(original);f.contract.modules.find(c=>c.public===file).runtimeEdges.reverse();rejects(f,/endpoint inventory/);}}});
test('source mutation cannot pass by refreshing mutable JSON contract and identity hashes',()=>{const original=fixture();for(const file of Object.keys(requiredModules)){const f=structuredClone(original),m=f.modules.find(m=>m.file===file);m.source+='\n// unreviewed';const hash=sha(m.source);f.identities.find(e=>e.file===file).sha256=hash;f.contract.modules.find(e=>e.public===file).sha256=hash;rejects(f,/required asset/);}});
test('all required page mount anchors assets and download links must survive, comments do not count',()=>{const original=fixture();for(const [file,attrs]of Object.entries(requiredMounts))for(const [attribute,values]of Object.entries(attrs))for(const value of values){const f=structuredClone(original),page=f.pages.find(p=>p.file===file);page.source=page.source.split(value).join('removed');page.source+='<!-- <div '+attribute+'="'+value+'"> -->';rejects(f,/missing mounted/);}});
test('classic CRB worker/core/nested HTML and data/archive bytes are hash-bound',()=>{const original=fixture();for(const file of Object.keys(requiredFiles).filter(f=>!f.endsWith('.mjs'))){const f=structuredClone(original);f.identities.find(e=>e.file===file).sha256='0'.repeat(64);rejects(f,/required asset/);}});
test('legacy generic empty/partial-fixture semantics remain separate from unconditional production release boundary',()=>{const {moduleDependencies}=require('../scripts/build/module-dependencies.cjs');assert.deepEqual(moduleDependencies([],{schemaVersion:1,modules:[]},[]),[]);rejects({identities:[],modules:[],contract:{schemaVersion:1,modules:[]},pages:[]},/required asset/);});

test('closed recovered feature namespaces reject undeclared assets even with matching mutable contracts',()=>{for(const prefix of ['labs/cellfree-maprt/robustness/','otfs-receiver/joint/','otfs-receiver/mppsi/','joint-beamforming/ssp/','labs/crb-beamforming/extended-lab/']){const f=fixture(),file=prefix+'unreviewed.mjs',source='export{};',hash=sha(source);f.identities.push({file,sha256:hash});f.modules.push({file,source});f.contract.modules.push({public:file,sha256:hash,runtimePolicy:'no-runtime-loads',runtimeEdges:[],unverifiedInputs:[]});rejects(f,/unreviewed feature asset/);}});

test('mounts require actual module scripts and stylesheets, not data attributes or disabled script types',()=>{for(const change of [s=>s.replace('src="otfs-receiver/joint/lesson.mjs"','data-src="otfs-receiver/joint/lesson.mjs"'),s=>s.replace('<script type="module" src="otfs-receiver/joint/lesson.mjs"','<script type="text/plain" src="otfs-receiver/joint/lesson.mjs"'),s=>s.replace('rel="stylesheet" href="otfs-receiver/joint/joint.css"','rel="alternate" href="otfs-receiver/joint/joint.css"')]){const f=fixture(),page=f.pages.find(p=>p.file==='otfs-receiver.html');page.source=change(page.source);rejects(f,/missing mounted/);}});

test('full user-load evidence is optional download only, never a runtime startup dependency',()=>{const archive='assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz',edges=recoveryDependencies(fixture());assert.deepEqual(edges.filter(e=>e.url===archive),[{from:'joint-beamforming.html',url:archive,kind:'recovery-mount'}]);assert.ok(!Object.values(requiredModules).some(m=>m.runtimeEdges.some(e=>e.url.includes('full.tar.xz'))));});
