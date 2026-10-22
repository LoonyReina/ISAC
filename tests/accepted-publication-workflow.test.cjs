'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('./helpers/accepted-publication-preservation.cjs'),root=path.resolve(__dirname,'..');
const readCurrent=file=>require('./helpers/channel-mapping-preservation.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root});
test('visibility workflow changes are exact and preserve full scientific validation before projection',()=>{
 const file='.github/workflows/pages.yml',current=require('./helpers/target19-source-identity.cjs').readCurrentForHistory(file,fs.readFileSync(path.join(root,file)),{root}),prior=P.reverseFile(file,current).toString(),s=current.toString();
 const block='      - name: Project accepted deployed lessons\n        run: |\n          node --test tests/accepted-publication-workflow.test.cjs\n          python scripts/publish-accepted.py --input dist --output published\n          python scripts/test-publication.py --input dist --output published\n';
 a.equal(s.split(block).length,2);a.equal(s.replace(block,'').replace('          path: published\n','          path: dist\n'),prior);
 a.ok(s.indexOf('build-compatibility.cjs --check')<s.indexOf(block));a.ok(s.indexOf('git diff --exit-code')<s.indexOf(block));a.ok(s.indexOf(block)<s.indexOf('Upload verified Pages artifact'));
 a.match(s,/--test --reproducible/);a.match(s,/permissions: \{\}/);a.match(s,/persist-credentials: false/);
});
test('publication adapter binds all four exact edits and rejects unknown or duplicate endpoints',()=>{
 a.deepEqual(P.delta.files.map(r=>r.path),['.github/workflows/pages.yml','tests/helpers/recovery-published-baseline-projection.cjs','tests/recovery-baseline-projection.test.cjs','build/compatibility-manifest.json']);
 for(const row of P.delta.files){const bytes=readCurrent(row.path),prior=P.reverseFile(row.path,bytes);a.ok(P.identity(prior,row.before));a.deepEqual(P.forHistoricalChain(row.path,bytes),prior);a.deepEqual(P.forHistoricalChain(row.path,prior),prior);
 for(const bad of [bytes.subarray(1),Buffer.concat([bytes,Buffer.from('tamper')]),prior])a.throws(()=>P.reverseFile(row.path,bad));
 a.throws(()=>P.reverseFile(row.path,bytes,[row,row]));for(const side of ['before','after']){const bad=structuredClone(row);bad[side].sha256='0'.repeat(64);a.throws(()=>P.reverseFile(row.path,bytes,[bad]));}
 const bad=structuredClone(row);bad.beforeBase64=Buffer.from('tamper').toString('base64');a.throws(()=>P.reverseFile(row.path,bytes,[bad]));
 }
 const unknown=Buffer.from('unknown');a.deepEqual(P.forHistoricalChain('unknown',unknown),unknown);
});
test('older recovery test names and assertions are retained with only a normalized read boundary',()=>{
 const file='tests/recovery-baseline-projection.test.cjs',current=readCurrent(file),prior=P.reverseFile(file,current).toString(),names=s=>[...s.matchAll(/test\('([^']+)'/g)].map(m=>m[1]);a.deepEqual(names(current.toString()),names(prior));a.equal(names(prior).length,4);
 const original=current.toString().replace('const readRaw=r=>','const read=r=>').replace("const read=r=>require('./helpers/accepted-publication-preservation.cjs').forHistoricalChain(r.path,readRaw(r));\n",'');a.equal(original,prior);
});
