'use strict';
// Independent source-data audit. No browser or network is used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(process.env.NOTEBOOK_REPO||process.cwd());
const M=require(path.join(root,'scripts/notebook-topics.cjs'));
const registry=JSON.parse(fs.readFileSync(path.join(root,'site/registry.json'),'utf8'));
const clone=()=>JSON.parse(JSON.stringify(registry));
const decodeHtml=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');

test('reference list contains exactly registered units and real local destinations',()=>{
 const topics=M.buildNotebookTopics(registry);
 assert.equal(topics.length,registry.units.length);
 assert.equal(new Set(topics.map(x=>x.id)).size,topics.length);
 assert.deepEqual(topics.map(x=>x.id),registry.units.map(x=>x.id));
 for(const topic of topics){
  assert.match(topic.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(topic.id.length<=64);
  for(const key of ['teachingHref','experimentHref','evidenceHref','boundaryHref']){
   if(!topic[key])continue;
   assert.match(topic[key],/^[A-Za-z0-9_-]+\.html#[A-Za-z0-9_.:%-]+$/);
   const [file,fragment]=topic[key].split('#');
   const html=fs.readFileSync(path.join(root,file),'utf8');
   assert.ok([...html.matchAll(/\bid="([^"]+)"/g)].some(m=>m[1]===decodeURIComponent(fragment)),key+': '+topic[key]);
  }
 }
});

test('HTML options escape hostile registry prose without changing its decoded text',()=>{
 const r=clone();const attack='\"\'&<> </option><img src=x onerror=alert(1)> 中文 🛰️\n\u2028\u2029';
 r.units[0].title=attack;const topics=M.buildNotebookTopics(r),options=M.renderNotebookOptions(topics);
 assert.doesNotMatch(options,/<img|<script/i);
 const first=options.match(/^<option value="[a-z0-9-]+">([\s\S]*?)<\/option>/);assert.ok(first);
 assert.equal(decodeHtml(first[1]),attack);
 assert.doesNotMatch(first[1],/[<>"']/);
});

test('inline JSON defeats closing-script, HTML-comment and line-separator injection and round-trips exactly',()=>{
 const r=clone();const attack='</script><script>throw new Error("test data")</script><!-- & >\u2028\u2029\n中文 😺 `';
 for(const key of ['title','question','action'])r.units[0][key]=attack;
 const topics=M.buildNotebookTopics(r),markup=M.renderNotebookData(topics);
 assert.ok(markup.startsWith('<script type="application/json" id="notebook-topics">'));
 assert.ok(markup.endsWith('</script>'));
 assert.equal((markup.match(/<\/script>/g)||[]).length,1);
 const payload=markup.slice(markup.indexOf('>')+1,-'</script>'.length);
 assert.doesNotMatch(payload,/[<>&\u2028\u2029]/);
 assert.deepEqual(JSON.parse(payload),topics);
});

test('build-time IDs reject delimiter injection, whitespace, excess length and duplicate membership',()=>{
 for(const value of ['', '../x','x?topic=y','x#notebook','a\nb','crb\n',' crb','crb ','CRB','javascript:alert(1)','" onfocus="x','中','a'.repeat(65),null,7]){
  const r=clone();r.units[0].id=value;
  assert.throws(()=>M.buildNotebookTopics(r),undefined,JSON.stringify(value));
  assert.throws(()=>M.notebookHref(value),undefined,JSON.stringify(value));
 }
 const r=clone();r.units.push({...r.units[0]});assert.throws(()=>M.buildNotebookTopics(r),/Duplicate/);
});

test('build-time references reject remote, absolute, traversal, query, missing and malformed routes',()=>{
 for(const href of ['javascript:alert(1)','https://example.invalid/x','#notebook','/practice.html#notebook','../practice.html#notebook','practice.html?topic=crb#notebook','practice.html#notebook\n','practice.html#missing-audit-fragment','practice.html#%ZZ','not-a-real-page.html#x']){
  const r=clone();r.units[0].href=href;assert.throws(()=>M.buildNotebookTopics(r),undefined,href);
 }
 for(const key of ['paper','next']){
  const r=clone();r.cases[0][key]='https://example.invalid/should-not-be-linked';assert.throws(()=>M.buildNotebookTopics(r));
 }
});
