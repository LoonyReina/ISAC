'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {staticModuleDependencies:parse,moduleDependencies:edges}=require('../scripts/build/module-dependencies.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),entry=(file,source,runtimeEdges=[])=>({public:file,sha256:sha(source),runtimeEdges,runtimePolicy:runtimeEdges.length?'literal-workers':'no-runtime-loads',unverifiedInputs:[]}),contract=modules=>({schemaVersion:1,modules});
test('Node parse-only API authoritatively recognizes static imports/reexports and does not execute source',()=>{
 const marker='/tmp/isac-module-parse-must-not-execute-'+process.pid;const source=`import fs from 'node:fs';import {'}' as x} from './a.mjs';export{x as '}'};export*from './b.mjs';fs.writeFileSync('${marker}','executed');throw Error('never execute');const t=\`x\${await import('./dynamic.mjs')}\`;`;
 const r=parse([{file:'example.mjs',source}]);a.deepEqual(r,[{file:'example.mjs',specifiers:['node:fs','./a.mjs','./b.mjs']}]);a.equal(fs.existsSync(marker),false);
});
test('parser handles ASI, regular expressions, strings and templates without fabricated static edges',()=>{
 const source=`import './real.mjs';'use strict'\n{} /import('ghost.mjs')/.test(x);const x=true?{}:{}/2;const y=\`\${(()=>{if(x)/}/.test(x);return 1})()}\`;const text="export * from './ghost.mjs'"; // import './fake.mjs'\n`;
 a.deepEqual(parse([{file:'example.mjs',source}])[0].specifiers,['./real.mjs']);a.throws(()=>parse([{file:'bad.mjs',source:"import './broken"}]),/Parse-only/);
});
test('runtime edge requires exact complete source, reviewed literal and explicit per-file contract',()=>{
 const literal="new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})",source="import './core.mjs';const worker="+literal+';',modules=[{file:'lesson.mjs',source},{file:'worker.mjs',source:'export{};'},{file:'core.mjs',source:'export{};'}];
 const c=contract(modules.map(m=>entry(m.file,m.source,m.file==='lesson.mjs'?[{kind:'worker',url:'./worker.mjs',literal}]:[])));
 a.deepEqual(edges(modules,c),[{from:'lesson.mjs',url:'./worker.mjs',kind:'reviewed-worker'},{from:'lesson.mjs',url:'./core.mjs',kind:'static-module'}]);
 const changed=structuredClone(modules);changed[0].source+=' // source changed, literal still identical';a.throws(()=>edges(changed,c),/Unreviewed module source hash/);
 for(const mutate of [d=>d.modules.pop(),d=>d.modules.push(d.modules[0]),d=>d.modules[0].sha256='0'.repeat(64),d=>d.modules[0].runtimeEdges[0].literal='comment',d=>d.modules[0].runtimeEdges[0].url='./missing.mjs']){const d=structuredClone(c);mutate(d);a.throws(()=>edges(modules,d));}
 a.throws(()=>edges([...modules,{file:'new.mjs',source:'export{};'}],c),/Unreviewed or missing/);
 const comments=structuredClone(modules);comments[0].source='// '+literal;a.throws(()=>edges(comments,c),/Unreviewed module source hash/);
});
test('production OTFS runtime contract explicitly freezes every public module and both actual Workers',()=>{
 const c=require('../scripts/build/module-runtime-contracts.json');a.equal(c.schemaVersion,1);a.equal(new Set(c.modules.map(x=>x.public)).size,c.modules.length);const runtime=c.modules.flatMap(x=>x.runtimeEdges.map(e=>({from:x.public,...e})));a.equal(runtime.length,2);a.ok(runtime.every(e=>e.from==='otfs-receiver/otfs-receiver.mjs'));a.deepEqual(runtime.map(x=>x.url),['./sensing/browser-worker.mjs','./communication/browser-worker.mjs']);a.ok(c.modules.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));a.ok(!c.modules.some(x=>x.public.endsWith('node-worker.mjs')));a.equal(c.modules.length,16);a.equal(c.modules.filter(x=>x.public.startsWith('otfs-receiver/')).length,14);a.equal(c.modules.filter(x=>x.runtimePolicy==='command-line-inputs-unverified').length,2);
});
