'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),r=JSON.parse(read('site/registry.json'));
test('exactly two top-level sections on every canonical and legacy page',()=>{
 a.deepEqual(r.stages.map(x=>x.id),['foundations','reading']);
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  const html=read(file),nav=html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0];a.ok(nav,file);
  a.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),['foundations.html','reading.html'],file);
  a.doesNotMatch(nav,/研究实践|机制实验|书目|experiments|practice/);
 }
 a.equal([...read('index.html').matchAll(/class="stage-card"/g)].length,2);
 a.ok(read('index.html').includes('href="reading.html">')||read('index.html').includes('href="reading.html" class="hero-secondary"'));
});
test('each existing unit has one canonical placement; mixed pages retain explicit anchor ownership',()=>{
 for(const u of r.units){const rows=r.lessonPlacement.filter(p=>p.unitId===u.id);a.equal(rows.length,1,u.id);a.equal(rows[0].canonicalHref,u.href);a.ok(['foundations','reading'].includes(rows[0].section));}
 for(const [href,section]of [['near-field.html#experiment','foundations'],['theory.html#capacity-distortion','reading']])a.ok(r.lessonPlacement.some(p=>p.canonicalHref===href&&p.section===section));
 for(const id of ['pilot','clock','golay-radar','offgrid-range','reference-uncertainty'])a.equal(r.lessonPlacement.find(p=>p.unitId===id).section,'foundations',id);
 for(const id of ['pilot-pattern','near-field','crb-beamforming','otfs-receiver','perceptive-bsbl'])a.equal(r.lessonPlacement.find(p=>p.unitId===id).section,'reading',id);
});
test('reading hosts the single-source notebook with the full topic set; compatibility preserves query',()=>{
 const page=read('reading.html');a.equal([...page.matchAll(/id="notebook"/g)].length,1);a.equal([...page.matchAll(/src="notebook.js\?/g)].length,1);
 const topics=JSON.parse(page.match(/id="notebook-topics">([\s\S]*?)<\/script>/)[1]);a.deepEqual(topics.map(x=>x.id),r.units.map(x=>x.id));
 a.match(read('notebook.js'),/刷新、关闭或离开页面可能丢失/);
 const calls=[],location={pathname:'/ISAC/practice.html',hash:'#notebook',search:'?topic=pilot',href:'https://example.test/ISAC/practice.html?topic=pilot#notebook',replace:x=>calls.push(x)};
 vm.runInNewContext(read('legacy-routes.js'),{location,URL,window:{addEventListener(){}}});a.deepEqual(calls,['https://example.test/ISAC/reading.html?topic=pilot#notebook']);
 for(const [id,href]of Object.entries(r.legacy['practice.html'])){if(id)a.ok(read('practice.html').includes('id="'+id+'"'));a.ok(href.startsWith('reading.html#'));a.ok(page.includes('id="'+href.split('#')[1]+'"'));}
});
test('all old experiment unit anchors resolve directly to their existing core lesson',()=>{
 for(const u of r.units){a.equal(r.legacy['experiments.html']['unit-'+u.id],u.href);a.ok(read('experiments.html').includes('id="unit-'+u.id+'"'));}
 a.equal(r.legacy['experiments.html'][''],'foundations.html');
 a.match(read('experiments.html'),/旧链接兼容/);
});
