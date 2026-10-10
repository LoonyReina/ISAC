// Static navigation contracts, not a substitute for rendered browser/keyboard QA.
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const hub=read('research.html');
const pages=['research.html','index.html','theory.html','pilot-design.html','network-clock.html','sbfd-resource.html'];
const routes=['theory.html#crb-mechanism','pilot-design.html','network-clock.html','sbfd-resource.html'];
test('hub and both entrances expose all four case routes as native links',()=>{
 for(const name of ['research.html','index.html','theory.html']){
  const h=read(name);
  for(const route of routes)a.ok(h.includes(`href="${route}"`),`${name}: ${route}`);
  a.match(h,/href="research.css\?v=1"/);
 }
 for(const name of pages.filter(n=>n!=='research.html'))a.ok(read(name).includes('href="research.html"'),`${name}: hub return`);
});
test('four case cards preserve prerequisite, question, mechanism, evidence, limit and next-question structure',()=>{
 const cards=[...hub.matchAll(/<article class="research-case"[^>]*>([\s\S]*?)<\/article>/g)];
 a.equal(cards.length,4);
 for(const [,card]of cards){
  for(const label of ['先修','问题','交互机制','证据类型','结论边界','下一研究问题'])a.ok(card.includes(`<dt>${label}</dt>`),label);
  a.match(card,/<dd>论文：/);
  a.match(card,/本站：/);
 }
 a.match(hub,/不是难度排名或技术演进顺序/);
 a.match(hub,/不是本站已经得到的结论/);
 for(const route of ['index.html#start','index.html#reading','theory.html#pathway','theory.html#research-method'])a.ok(hub.includes(`href="${route}"`));
});
test('all local href/src paths and fragments in affected pages resolve',()=>{
 for(const name of pages){
  const h=read(name);
  for(const [,raw]of h.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|mailto:|data:)/.test(raw))continue;
   const [file,fragment]=raw.split('#');
   const target=path.resolve(root,(file||name).split('?')[0]);
   a.ok(target.startsWith(root+path.sep),`${name}: path escapes root`);
   a.ok(fs.existsSync(target),`${name}: missing ${raw}`);
   if(fragment){
    const ids=[...fs.readFileSync(target,'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    a.ok(ids.includes(decodeURIComponent(fragment)),`${name}: missing anchor ${raw}`);
   }
  }
 }
});
test('hub labels, skip target and unique IDs are present, with no script dependency',()=>{
 for(const name of pages){
  const h=read(name),ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  a.equal(new Set(ids).size,ids.length,`${name}: duplicate ID`);
  for(const [,label]of h.matchAll(/aria-labelledby="([^"]+)"/g))for(const id of label.split(/\s+/))a.ok(ids.includes(id),`${name}: absent label ${id}`);
 }
 a.match(hub,/<html lang="zh-CN">/);
 a.match(hub,/<a class="skip" href="#foundations">/);
 a.equal([...hub.matchAll(/<h1[ >]/g)].length,1);
 a.ok(!/<script\b|<button\b|<input\b|<select\b|localStorage|analytics/i.test(hub));
});
test('hub primary sources reuse documented URLs; static responsive rules remain scoped',()=>{
 const sources=read('docs/READING-MAP.md');
 for(const [,url]of hub.matchAll(/href="(https:[^"]+)"/g))a.ok(sources.includes(url.split('#')[0]),`undocumented source ${url}`);
 const css=read('research.css');
 a.match(css,/@media\(max-width:760px\)/);
 a.match(css,/@media\(max-width:520px\)/);
 a.match(css,/grid-template-columns:1fr/);
 a.ok(!/^(?:body|html|a|h[1-6]|p)\s*\{/m.test(css),'no unscoped element rule');
});
