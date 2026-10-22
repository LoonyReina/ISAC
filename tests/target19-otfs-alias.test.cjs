'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{moduleDependencies}=require('../scripts/build/module-dependencies.cjs');
const file='otfs-receiver/statistics/otfs-core.mjs',source=require('./helpers/target19-layout.cjs').reader(root)('labs/'+file).toString(),sha=s=>crypto.createHash('sha256').update(s).digest('hex'),h=sha(source);
const c={public:file,sha256:h,runtimeEdges:[],runtimePolicy:'no-runtime-loads',unverifiedInputs:[]},contract={schemaVersion:1,modules:[c]},modules=[{file,source}],identities=[{file,sha256:h}];
test('explicit unchanged original OTFS statistics alias accepted',()=>{assert.equal(h,'20c887dec06148dc7b031b15d2c2aba64ba10776c523a6d28367e005e82fabe2');moduleDependencies(modules,contract,identities);});
test('unknown same-hash OTFS alias rejected',()=>{const unknown='otfs-receiver/unreviewed/otfs-core.mjs';assert.throws(()=>moduleDependencies([{file:unknown,source}],{...contract,modules:[{...c,public:unknown}]},[{file:unknown,sha256:h}]),/path mismatch/);});
test('changed-hash original alias rejected even when all claimed hashes change',()=>{const changed=source+'\n// changed\n',hash=sha(changed);assert.throws(()=>moduleDependencies([{file,source:changed}],{...contract,modules:[{...c,sha256:hash}]},[{file,sha256:hash}]),/frozen runtime source hash/);});
test('additional load on exact old alias rejected',()=>{const added={kind:'worker',url:'./extra.mjs',literal:"new Worker(new URL('./extra.mjs',import.meta.url),{type:'module'})"};assert.throws(()=>moduleDependencies(modules,{...contract,modules:[{...c,runtimePolicy:'literal-workers',runtimeEdges:[added]}]},identities),/runtime policy/);});
