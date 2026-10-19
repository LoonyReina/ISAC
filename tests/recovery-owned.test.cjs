'use strict';
// Fresh current-runtime regression entrypoint. Historical published assertions stay unchanged.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir='scripts/validation/recovery-abc/';
function run(args,env){const childEnv={...process.env,...env};delete childEnv.NODE_TEST_CONTEXT;const p=spawnSync(process.execPath,args,{cwd:root,env:childEnv,encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,(p.stdout||'')+(p.stderr||''));return p.stdout;}
function temp(t){const out=fs.mkdtempSync(path.join(os.tmpdir(),'isac-recovery-tests-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));return out;}
test('NEW MAPRT and OTFS source lifecycle/current records',{timeout:120000},()=>{run(['--test','--test-concurrency=1',dir+'maprt-teaching/robustness.test.mjs',dir+'otfs-joint-teaching/session.test.mjs',dir+'otfs-joint-teaching/pagehide-race.test.mjs']);});
test('NEW pilot calibrated source, binding and mounted lifecycle',{timeout:120000},t=>{const out=temp(t),env={PILOT_TEST_SITE_ROOT:root,PILOT_TEST_OUTPUT:out};for(const [name,...args]of [['author.mjs'],['independent-binding.mjs','drift'],['independent-binding.mjs','fail'],['calibrated-ui.mjs'],['independent-ui.mjs']])run([dir+'pilot-calibrated-teaching/'+name,...args],env);});
test('NEW OTFS independent finite-grid oracle',{timeout:120000},t=>{run([dir+'otfs-joint-teaching/independent-joint-grid.test.mjs'],{ISAC_TEST_OUTPUT:path.join(temp(t),'result.json')});});
test('NEW uniform user-load current imports, Worker and full ledger',{timeout:120000},()=>{run(['--test','--test-concurrency=1',...['contracts.test.mjs','independent-lifecycle.test.mjs','real-inputs.test.mjs','ledger.test.cjs'].map(n=>dir+'user-load/'+n)],{USERLOAD_DATA:path.join(root,'labs/joint-beamforming/ssp/user-load-data.json')});});
test('NEW CRB UI and actual Worker bridge',{timeout:180000},()=>{for(const name of ['ui-races.test.cjs','recovery-lifecycle.test.cjs'])run(['labs/crb-beamforming/extended-lab/prototype/'+name]);});
test('NEW bounded MP-Psi paired/numerical/lifecycle; not historical1000-frame acceptance',{timeout:120000},t=>{const out=temp(t),env={...process.env,ISAC_MPPSI_FIXTURES:path.join(out,'fixtures.json'),ISAC_MPPSI_REPORT:path.join(out,'result.json')};run([dir+'mppsi/produce-fixtures.mjs'],env);run([dir+'mppsi/lifecycle-check.mjs'],env);const p=spawnSync('python3',[dir+'mppsi/independent-check.py'],{cwd:root,env,encoding:'utf8'});assert.equal(p.status,0,(p.stdout||'')+(p.stderr||''));});
test('Exact comparator alias preserves both reviewed paths and rejects a third path',()=>{const crypto=require('node:crypto'),D=require('../scripts/build/module-dependencies.cjs');const names=['otfs-receiver/communication/kernel.mjs','otfs-receiver/mppsi/accepted-kernel.mjs'],modules=names.map(file=>({file,source:fs.readFileSync(path.join(root,'labs',file),'utf8')})),entries=JSON.parse(fs.readFileSync(path.join(root,'scripts/build/module-runtime-contracts.json'))).modules.filter(e=>names.includes(e.public)),identities=modules.map(m=>({file:m.file,sha256:crypto.createHash('sha256').update(m.source).digest('hex')}));assert.equal(identities[0].sha256,identities[1].sha256);D.moduleDependencies(modules,{schemaVersion:1,modules:entries},identities);const bad=structuredClone(entries);bad[0].public='unreviewed-copy.mjs';assert.throws(()=>D.moduleDependencies(modules,{schemaVersion:1,modules:bad},identities),/runtime path mismatch/);});
test('Opt-in subprocess logs preserve default success and failure output',t=>{
 const vm=require('node:vm'),cp=require('node:child_process'),text=fs.readFileSync(path.join(root,'scripts/build/compatibility.cjs'),'utf8');
 const functionText=text.slice(text.indexOf('function run(command,args,cwd){'),text.indexOf('function generatedPath('));
 const out=temp(t);function runner(logs){const context={fs,path,cp,process:{env:{...process.env,ISAC_BUILD_LOG_DIR:logs||''},stderr:{write(){} }},insist(ok,message){if(!ok)throw Error(message);}};vm.createContext(context);vm.runInContext(functionText,context);return context.run;}
 const plain=runner(),logged=runner(out),success=['-e',"process.stdout.write('success\\n');process.stderr.write('warning\\n')"],failure=['-e',"process.stdout.write('partial\\n');process.stderr.write('failure\\n');process.exit(7)"];
 assert.equal(logged(process.execPath,success,root),plain(process.execPath,success,root));
 const error=fn=>{try{fn(process.execPath,failure,root);assert.fail('expected failure');}catch(e){return e.message;}};assert.equal(error(logged),error(plain));
 const records=fs.readdirSync(out).map(d=>{const p=path.join(out,d);return {result:JSON.parse(fs.readFileSync(path.join(p,'result.json'))),stdout:fs.readFileSync(path.join(p,'stdout.log'),'utf8'),stderr:fs.readFileSync(path.join(p,'stderr.log'),'utf8')};});
 assert.equal(records.length,2);assert.deepEqual(records.map(r=>r.result.status).sort((a,b)=>a-b),[0,7]);assert.ok(records.some(r=>r.stdout==='success\n'&&r.stderr==='warning\n'));assert.ok(records.some(r=>r.stdout==='partial\n'&&r.stderr==='failure\n'));
});

test('Opt-in subprocess logs retain spawn errors and signal failures',t=>{
 const vm=require('node:vm'),cp=require('node:child_process'),text=fs.readFileSync(path.join(root,'scripts/build/compatibility.cjs'),'utf8'),out=temp(t);
 const source=text.slice(text.indexOf('function run(command,args,cwd){'),text.indexOf('function generatedPath('));
 function run(log){const c={fs,path,cp,process:{env:{...process.env,ISAC_BUILD_LOG_DIR:log},stderr:{write(){}}},insist(ok,message){if(!ok)throw Error(message);}};vm.createContext(c);vm.runInContext(source,c);return c.run;}
 for(const [command,args]of [[path.join(out,'missing-program'),[]],[process.execPath,['-e',"process.kill(process.pid,'SIGTERM')"]]]){let errors=[];for(const log of ['',out]){try{run(log)(command,args,root);assert.fail('expected failure');}catch(e){errors.push({message:e.message,code:e.code});}}assert.deepEqual(errors[1],errors[0]);}
 const results=fs.readdirSync(out).filter(d=>d.startsWith('command-')).map(d=>JSON.parse(fs.readFileSync(path.join(out,d,'result.json'))));assert.ok(results.some(r=>r.signal==='SIGTERM'&&r.status===null));assert.ok(results.some(r=>r.error&&r.error.includes('ENOENT')));
});
test('Selective lesson presentation retains the two-section constellation and current evidence counts',()=>{
 function read(source,staged){return fs.readFileSync(path.join(root,fs.existsSync(path.join(root,source))?source:staged),'utf8');}
 const r=JSON.parse(read('content/data/registry.json','site/registry.json')),page=read('content/pages/joint-beamforming.html','joint-beamforming.html'),tree=read('features/research-reading/research-tree.js','research-tree.js'),generator=read('scripts/site/generate-site.cjs','scripts/generate-site.cjs'),data=JSON.parse(read('labs/joint-beamforming/ssp/user-load-data.json','labs/joint-beamforming/ssp/user-load-data.json'));
 assert.deepEqual(r.stages.map(s=>s.id),['foundations','reading']);assert.equal(r.pages.find(p=>p.path==='joint-beamforming.html').title,'联合发射波束成形');assert.equal(r.units.find(p=>p.id==='joint-beamforming').title,'联合发射波束成形');assert.equal(r.cases.find(p=>p.id==='case-joint-beamforming').title,'同一阵列，为什么还要加独立雷达流？');
 // Exact baseline constellation code, with only the explicit short-label substitution.
 assert.equal(require('node:crypto').createHash('sha256').update(tree.replaceAll('"联合发射波束成形"','"联合发射波束"')).digest('hex'),'7a49627c2c026d9fb892b71f62bbdc5a8b7817a24312e96c0f9a560ddc16230d');
 assert.ok(generator.includes("link('joint-beamforming.html#ssp-extension','SSP：2 / 4 / 6 用户')"));for(const id of ['users','power','noise','run','status','model','experiment','evidence'])assert.equal((page.match(new RegExp('id="ssp-'+id+'"','g'))||[]).length,1);
 assert.match(page,/<fieldset class="ssp-controls"><legend>物理场景/);assert.match(page,/<fieldset class="ssp-controls"><legend>数值求解/);assert.match(page,new RegExp(`${data.rows.length} 条方法结果、${data.attempts.optimizer.length+data.attempts.phaseI.length} 条尝试/证书记录`));assert.ok(!page.includes('1158次尝试'));assert.match(page,/不是完整原始轨迹归档/);
 const css=read('labs/joint-beamforming/ssp/ssp.css','labs/joint-beamforming/ssp/ssp.css');for(const rule of ['min-height:44px','max-height:min(32rem,65vh)','position:sticky',':focus-visible'])assert.ok(css.includes(rule));
});

test('Current numerical inputs retain every published identity except two separately reviewed recovery leaves',()=>{
 const sha=b=>require('node:crypto').createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(path.join(root,'scripts/validation/recovery-abc/current-numerical-inputs.json'));
 assert.equal(sha(bytes),'548804e19308567dbffcbdfe144dc8fafebcbef51d480308a2ad53928b9db2bf');const inventory=JSON.parse(bytes);assert.equal(inventory.baseline,'ba68a519430bc39b12d2507276df1e9ab60a6ab5');assert.equal(inventory.files.length,790);
 assert.deepEqual(inventory.files.filter(e=>e.reviewedRecoveryLeaf).map(e=>e.source),['labs/pilot-pattern/lesson.mjs','labs/pilot-pattern/runtime/records.mjs']);
 for(const entry of inventory.files){const file=fs.existsSync(path.join(root,entry.source))?entry.source:entry.compatibility;assert.equal(sha(fs.readFileSync(path.join(root,file))),entry.currentSha256,entry.source);if(!entry.reviewedRecoveryLeaf)assert.equal(entry.currentSha256,entry.publishedSha256,entry.source);}
});
test('Shared reading scope recognizes delivered bounded SSP while preserving whole-paper gaps',()=>{
 const read=(source,staged)=>JSON.parse(fs.readFileSync(path.join(root,fs.existsSync(path.join(root,source))?source:staged)));
 const registry=read('content/data/registry.json','site/registry.json'),directory=read('content/data/research-directory.json','site/research-directory.json'),papers=Array.isArray(directory)?directory:Object.values(directory).find(v=>Array.isArray(v)&&v.some(x=>x.id==='joint_beamforming'));
 const backlog=read('docs/PAPER-EXECUTION-BACKLOG.json','docs/PAPER-EXECUTION-BACKLOG.json');assert.equal(backlog.papers.length,35);assert.deepEqual(backlog.papers.reduce((counts,p)=>(counts[p.stages.fullPaper]=(counts[p.stages.fullPaper]||0)+1,counts),{}),{'not-reproduced':32,partial:3});const paper=papers.find(p=>p.id==='joint_beamforming'),c=registry.cases.find(c=>c.id==='case-joint-beamforming');assert.equal(c.paperComparison.comparisonStatus,'partial');assert.equal(paper.executionStatus.status,'validated-algorithm-core');
 for(const text of [paper.evidenceBoundary,c.fields['结论边界'],c.paperComparison.siteArtifactType]){assert.match(text,/SSP/);assert.match(text,/K=2\/4\/6/);assert.match(text,/有界/);assert.ok(!/K=4\/6、SSP.*仍开放/.test(text));}
 assert.match(paper.evidenceBoundary,/1000信道全规模/);assert.match(paper.evidenceBoundary,/驻点不保证硬QoS/);assert.match(c.fields['结论边界'],/条件子集/);assert.match(c.paperComparison.verificationNote,/202\/5000/);
 assert.ok(!papers.some(p=>p.executionStatus?.status==='complete-paper-reproduction'));
});
