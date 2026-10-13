'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'labs/otfs-receiver');
const page=fs.existsSync(path.join(root,'content/pages/otfs-receiver.html'))?path.join(root,'content/pages/otfs-receiver.html'):path.join(root,'otfs-receiver.html');
const html=fs.readFileSync(page,'utf8'),script=fs.readFileSync(path.join(base,'otfs-receiver.mjs'),'utf8');
test('canonical page has unique anchors, labeled native inputs and all literal UI bindings',()=>{
  const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(ids.length,new Set(ids).size,'duplicate HTML IDs');
  for(const anchor of ['intuition','model','sensing','communication','paper','limits','reproduce'])assert.ok(ids.includes(anchor),anchor);
  for(const [,id]of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(id),`missing ${id}`);
  for(const [,id]of script.matchAll(/\b(?:text|table|paragraphs)\('([^']+)'/g))assert.ok(ids.includes(id),`missing output ${id}`);
  for(const match of html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g))assert.match(html,new RegExp(`for="${match[1]}"`),`unlabeled ${match[1]}`);
  for(const task of ['sensing','communication'])for(const suffix of ['form','run','cancel','reset','export','status','truth','evaluation'])assert.ok(ids.includes(`${task}-${suffix}`));
  assert.match(html,/<noscript>/);assert.match(html,/role="status" aria-live="polite"/);assert.match(html,/<script type="module" src="otfs-receiver\/otfs-receiver.mjs"/);
});
test('ESM relative imports and Worker endpoints resolve inside the publication subtree',()=>{
  function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
  for(const file of walk(base).filter(f=>f.endsWith('.mjs'))){const source=fs.readFileSync(file,'utf8');for(const [,ref]of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g))assert.ok(fs.existsSync(path.resolve(path.dirname(file),ref)),`${file}: ${ref}`);}
  for(const task of ['sensing','communication'])assert.ok(fs.existsSync(path.join(base,task,'browser-worker.mjs')));
  assert.doesNotMatch(script,/localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest/,'no parameter upload or silent persistence');
});
test('all copied frozen source modules retain independent acceptance hashes',()=>{
  for(const task of ['sensing','communication']){const dir=path.join(base,task),freeze=JSON.parse(fs.readFileSync(path.join(dir,'FREEZE.json')));for(const [source,expected]of Object.entries(freeze.sourceHashes)){if(!source.startsWith('src/'))continue;const file=path.join(dir,source.slice(4));assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expected,`${task}/${source}`);}}
});
test('learner-facing scope preserves epistemic, budget and scientific distinctions',()=>{
  for(const phrase of ['perfect supplied CSI','有限网格','连续细化','FIM/CRB','entropy proxy','不重新生成 H/y','16 MiB','1910.01896v1','原文未给','输入过期','名义算子'])assert.ok(html.includes(phrase),phrase);
  for(const task of ['sensing','communication'])assert.ok(script.includes(`new Worker(new URL('./${task}/browser-worker.mjs',import.meta.url)`));assert.match(script,/state\.status!==['"]completed/);
  assert.match(script,/snapshot\.incomingLogMessages\[2\*edgeIndex/);assert.match(script,/mpg\.history/);
  assert.match(script,/state\.terminal\.result/);assert.match(script,/inspectSensing\(state\.receiver,q,a\)/);
  assert.match(script,/evaluateSensing\(state\.terminal\.result,truth\)/);
  assert.match(script,/importInputs\(await file\.text\(\)\)/);assert.match(script,/await data\.session\.run\(receiver,imported\.observation\)/);
});
