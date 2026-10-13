'use strict';
// A passing regression means this known native record remains rejected.
// It is deliberately separate from scientific acceptance and native browser QA.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),relative='assets/data/sensing-assisted-otfs/parity-boundary',bundle=path.join(root,relative),oracle=path.join(root,'labs/otfs-sensing-assisted/lesson/tests/record-oracle.py'),reference=path.join(root,'scripts/validation/sensing-assisted-otfs/prototype-v3/reference-copy/reference.py');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const manifestSha='e83a8d57a103130735c59b3f566751889ec177baad649dd1eefbf10dcfd37214';
function invoke(overrides={}){const env={...process.env,PYTHONDONTWRITEBYTECODE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'};delete env.NODE_TEST_CONTEXT;const r=cp.spawnSync('python3',[path.join(root,'scripts/validation/sensing-assisted-otfs/parity-boundary-v3/check-boundary-v3.py'),'--bundle',overrides.bundle||bundle,'--oracle',overrides.oracle||oracle,'--reference',overrides.reference||reference],{cwd:os.tmpdir(),env,encoding:'utf8',timeout:180000,maxBuffer:1024*1024});if(r.error)throw r.error;return r;}

test('OTFS parity disclosure binds original failed bytes, independent accepted control and unchanged scientific dependencies',()=>{
 const m=json(path.join(bundle,'MANIFEST.json'));a.equal(sha(read(path.join(bundle,'MANIFEST.json'))),manifestSha);a.equal(m.scientificParityGate,'FAILED_UNCHANGED');a.equal(m.sourceDeployment.tree,'806bead153aafad6b43d00e52432abf3802283a5');
 a.deepEqual(fs.readdirSync(bundle).sort(),[...m.files.map(x=>x.file),'MANIFEST.json'].sort());for(const r of m.files){const b=read(path.join(bundle,r.file));a.equal(b.length,r.bytes);a.equal(sha(b),r.sha256);}
 for(const r of m.immutableDependencies)a.equal(sha(read(path.join(root,r.file))),r.sha256);
 const original=json(path.join(bundle,'native-original.json')),repeat=json(path.join(bundle,'native-rerun.json'));a.deepEqual(original.input,repeat.input);a.deepEqual(original.payload,repeat.payload);a.deepEqual(original.counts,repeat.counts);a.equal(original.counts.completedReceiverRecords,16);a.equal(repeat.parentRunId,original.runId);
 const p=json(path.join(bundle,'PRECOMPUTED.json'));a.equal(p.scientificParityGate,'FAILED_UNCHANGED');a.equal(p.baselineReceiverCensus.numericValues,28528);a.equal(p.baselineReceiverCensus.violations.length,11);a.equal(p.receivers.length,16);a.deepEqual(p.receivers.filter(x=>x.strictViolations).map(x=>[x.frame,x.mode,x.strictViolations]),[[2,'literal_operational',10],[3,'literal_operational',1]]);
 const runtime=json(path.join(root,'labs/otfs-sensing-assisted/runtime/RUNTIME-MANIFEST.json'));for(const r of runtime.files.filter(x=>/^(js|worker)\//.test(x.path)))a.equal(sha(read(path.join(root,'labs/otfs-sensing-assisted/runtime',r.path))),r.sha256);
});

test('OTFS parity disclosure keeps completion, native repeatability and independent parity distinct in static Chinese teaching text',()=>{
 const authored=path.join(root,'content/pages/otfs-sensing-assisted.html'),html=read(fs.existsSync(authored)?authored:path.join(root,'otfs-sensing-assisted.html')).toString();
 a.equal((html.match(/id="numerical-boundary"/g)||[]).length,1);a.match(html,/运行完成表示请求的输出已保存/);a.match(html,/同实现自洽核对通过，也不代表独立数值验证通过/);a.match(html,/以下是离线预计算证据，不随上方控件重算/);a.match(html,/先前逐项通过的记录仍按各自范围保留/);a.match(html,/并非所有达到迭代上限的记录都已证明敏感/);a.match(html,/独立一致性门保持FAILED/);a.match(html,/尚未定位到公式或索引实现错误/);
 for(const f of ['REPORT.md','native-original.json','PRECOMPUTED.json','MANIFEST.json'])a.ok(html.includes('href="'+relative+'/'+f+'"'));
 a.doesNotMatch(html,/<script[^>]+src="[^"]*parity-boundary/);a.doesNotMatch(html,/<(?:button|input|select)[^>]+(?:sensitivity|precision|parity-boundary)/);
 for(const f of ['REPORT.md','PRECOMPUTED.json','MANIFEST.json'])a.doesNotMatch(read(path.join(bundle,f)).toString(),/\/workspace\/|\/user_notes\/|agent_notes|dream_notes|(?:source|paper)\.pdf|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9]+/);
});

test('OTFS preserved native failure is rejected by the unchanged checker and full census retains exactly eleven original violations',{timeout:190000},()=>{
 const r=invoke();a.equal(r.status,0,r.stdout+'\n'+r.stderr);a.equal(r.stderr,'');const report=JSON.parse(r.stdout);a.equal(report.expectedRejectionRegression,'passed');a.equal(report.scientificParityGate,'FAILED_UNCHANGED');a.equal(report.acceptedControlParity,true);a.deepEqual(report.checkerRuns.map(x=>[x.checkerExit,x.numericalParity]),[[1,false],[1,false],[0,true]]);a.equal(report.census.strictViolations,11);a.equal(report.census.receiverRecords,16);a.equal(report.census.rawBitsIncludingSignedZeroExact,true);a.equal(report.census.hardDecisionsStatusesMetricsUnchanged,true);
});

test('OTFS expected-rejection gate fails closed on changed evidence, omitted evidence, checker or reference bytes',{timeout:20000},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'isac-otfs-boundary-negative-'));try{
 const copy=path.join(dir,'evidence');fs.cpSync(bundle,copy,{recursive:true});
 const file=path.join(copy,'native-original.json'),original=read(file);fs.appendFileSync(file,'\n');let r=invoke({bundle:copy});a.equal(r.status,1);a.match(JSON.parse(r.stdout).error,/Artifact bytes changed: native-original/);fs.writeFileSync(file,original);
 fs.renameSync(path.join(copy,'native-rerun.json'),path.join(dir,'omitted.json'));r=invoke({bundle:copy});a.equal(r.status,1);a.match(JSON.parse(r.stdout).error,/Missing\/unsafe artifact/);
 for(const[key,source]of [['oracle',oracle],['reference',reference]]){const changed=path.join(dir,key+'.py');fs.writeFileSync(changed,Buffer.concat([read(source),Buffer.from('\n# changed bytes\n')]));r=invoke({[key]:changed});a.equal(r.status,1);a.match(JSON.parse(r.stdout).error,/Unchanged (checker|reference) identity required/);}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
