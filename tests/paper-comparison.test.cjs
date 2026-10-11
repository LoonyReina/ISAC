'use strict';
// Build and source contracts, not browser layout or scientific numerical tests.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const M=require('../scripts/paper-comparison-groups.cjs');
const registry=JSON.parse(read('site/registry.json')),clone=()=>structuredClone(registry);
function generateWith(r){
 const outputs={};
 vm.runInNewContext(read('scripts/generate-site.cjs'),{__dirname:path.join(root,'scripts'),process:{argv:[]},console:{log(){}},require:id=>id==='node:fs'?{...fs,readFileSync:(file,...args)=>String(file)===path.join(root,'site/registry.json')?JSON.stringify(r):fs.readFileSync(file,...args),writeFileSync:(file,text)=>outputs[path.basename(file)]=text}:require(id)});
 return outputs['reading.html']||read('reading.html');
}
const mutated=fn=>{const r=clone();fn(r.paperComparisonGroups[0],r);return r;};
const expectBad=fn=>a.throws(()=>M.buildComparisonGroups(mutated(fn)),/Invalid|Missing/);
test('comparison is a reading-only group without changing learning/catalog counts',()=>{
 a.equal(registry.units.length,28);a.equal(registry.cases.length,15);a.equal(registry.knowledgeMap.nodes.length,32);a.equal(registry.directions.length,8);a.equal(JSON.parse(read(registry.researchDirectoryFile)).cards.length,9);
 const groups=M.buildComparisonGroups(registry);a.equal(groups.length,1);a.equal(groups[0].members.length,3);
 const html=read('reading.html');a.ok(html.indexOf('id="directions"')<html.indexOf('id="paper-comparisons"'));a.ok(html.indexOf('id="paper-comparisons"')<html.indexOf('id="influential-papers"'));
 for(const name of ['paper-comparisons','comparison-beamforming','comparison-beamforming-resources','comparison-beamforming-checks','comparison-beamforming-next'])a.ok(html.includes(`id="${name}"`));
 a.match(html,/href="#paper-comparisons">同方向论文对读/);a.match(html,/paper-comparison.css\?v=paper-comparison-v1/);a.match(html,/defer src="paper-comparison.js\?v=paper-comparison-v1/);
 for(const page of registry.pages.filter(p=>p.path!=='reading.html'))a.doesNotMatch(read(page.path),/src="paper-comparison\.js|href="paper-comparison\.css/);
});
test('source edition pins are independent of unchanged article and lesson metadata',()=>{
 const g=M.buildComparisonGroups(registry)[0],m=g.members[0],c=registry.cases.find(c=>c.id===m.caseId);
 a.equal(m.sourceTitle,c.paperComparison.sourceTitle);a.match(c.paperComparison.sourceUrl,/discovery\.ucl\.ac\.uk/);
 a.equal(m.inspectedSource.url,'https://arxiv.org/pdf/1707.00519v1');a.match(m.inspectedSource.edition,/2017-07-03/);a.match(m.inspectedSource.edition,/PDF 页码/);
 a.equal(g.members[1].inspectedSource.url,'https://arxiv.org/pdf/1912.03420v2');a.match(g.members[2].inspectedSource.edition,/期刊印刷页码/);
 const html=M.renderComparisonGroups(registry);a.match(html,/本轮未重新核验期刊 VoR/);a.doesNotMatch(html,/#page=|\/workspace\/|\.pdf\.png|<img|<canvas/);
});
test('all derived teaching, experiment, evidence, boundary and notebook destinations stay canonical',()=>{
 const g=M.buildComparisonGroups(registry)[0];
 for(const m of g.members){const c=registry.cases.find(c=>c.id===m.caseId),u=registry.units.find(u=>u.id===c.unit);a.equal(m.links.model,m.modelHref);a.equal(m.links.teaching,c.learningEntry);a.equal(m.links.experiment,u.href);a.equal(m.links.evidence,c.paper);a.equal(m.links.boundary,c.next);a.equal(m.links.notebook,'practice.html?topic='+u.id+'#notebook');}
 const h=M.renderComparisonGroups(registry),ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);a.equal(ids.length,new Set(ids).size);
 for(const [,href]of h.matchAll(/href="([^"]+)"/g)){if(href.startsWith('#'))a.ok(ids.includes(href.slice(1)),href);else if(!href.startsWith('https:')){const [file,fragment]=href.split('#'),[name,query]=file.split('?');a.ok(read(name).includes(`id="${fragment}"`));if(query)a.match(query,/^topic=(shared-array|joint-beamforming|crb-beamforming)$/);}}
 const practice=read('practice.html');const fields=[...practice.matchAll(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/g)];a.equal(fields.length,10);a.ok(fields.every(m=>m[1]===''));a.doesNotMatch(h,/practice\.html\?[^" ]*(?:question|answer|plan|content)=/);
});
test('static comparison contains all readings, premise explanations, source feedback and next questions',()=>{
 const g=registry.paperComparisonGroups[0],html=M.renderComparisonGroups(registry);
 for(const q of g.questions){a.ok(html.includes(q.label));a.ok(html.includes(M.escapeHtml(q.answer)));a.ok(html.includes(M.escapeHtml(q.limit)));}
 for(const p of g.premises){a.ok(html.includes(M.escapeHtml(p.explanation)));a.ok(html.includes(M.escapeHtml(p.action)));}
 for(const c of g.checks)for(const o of c.options){a.ok(html.includes(M.escapeHtml(o.label)));a.ok(html.includes(M.escapeHtml(o.feedback)));}
 for(const tag of html.matchAll(/<(?:fieldset|button)[^>]*data-comparison-controls[^>]*>/g))a.match(tag[0],/ hidden/);
 for(const tag of html.matchAll(/<details[^>]*data-comparison-(?:panel|reference)[^>]*>/g))a.doesNotMatch(tag[0],/ hidden/);
 a.match(html,/查看全部参考解释（无需 JavaScript）/);a.match(html,/十栏仍由你填写/);a.match(html,/待执行计划/);
});
test('scientific guards preserve branches, metrics, budgets, omissions and conditional equivalence',()=>{
 const html=M.renderComparisonGroups(registry);
 for(const text of ['没有额外雷达符号','点目标分支仍使用通信流','完整 G','平方误差','式(46)','GLRT','每天线等式','总功率上限','SSP 惩罚型变体','未充分说明','非零','未知复反射系数 α','名义角度','独立复高斯噪声','接收阵列','快拍数','通信 SNR 与总功率约束','充分设置','没有完成公平性验证','不代表整个研究方向已经完成','条件统计不能代替失败率','≤0.85P₀','不能推断实际仿真'])a.ok(html.includes(text),text);
 for(const m of registry.paperComparisonGroups[0].members){a.ok(m.inspectedSource.unknowns.length);a.ok(m.inspectedSource.resources);a.ok(m.methods);}
 a.match(html,/信号由谁发 → 哪些阵元可用 → 优化什么/);a.match(html,/箭头只是阅读顺序/);a.match(html,/不是接收处理链或性能图/);a.match(html,/本站主实验仅做单用户点目标/);
});
test('group schema rejects duplicate, unknown, incomplete and cross-member data',()=>{
 const cases=[g=>{g.id='../escape';},(g,r)=>r.paperComparisonGroups.push(structuredClone(g)),g=>g.members.push(structuredClone(g.members[0])),g=>{g.members[0].caseId='case-missing';},g=>{g.members[0].inspectedSource.caseId=g.members[1].caseId;},g=>{delete g.members[0].inspectedSource;},g=>{g.members[0].inspectedSource.edition='';},g=>{g.members[0].inspectedSource.locators=[];},g=>{g.questions[0].readings.pop();},g=>{g.questions[0].readings[0].refs[0].caseId=g.members[1].caseId;},g=>{g.questions[0].readings[0].refs[0].locatorId='unknown';},g=>g.questions.push(structuredClone(g.questions[0])),g=>g.premises.push(structuredClone(g.premises[0])),g=>{g.premises[0].caseIds=['case-unknown'];},g=>g.checks[0].options.push(structuredClone(g.checks[0].options[0])),g=>{g.checks[0].options[0].feedback='';},g=>{g.nextQuestions[0].caseId='case-unknown';},g=>{g.members[0].flows[0].signal='';},g=>{g.members[0].modelHref='joint-beamforming.html#model';},g=>{g.members[0].modelHref='shared-array.html#missing';}];
 cases.forEach(expectBad);
});
test('schema IDs, source URLs and derived local routes fail closed',()=>{
 for(const value of ['', 'a\n','a b','a/../b','a"x','a'.repeat(65),'[x]','UPPER'])expectBad(g=>{g.id=value;});
 for(const url of ['javascript:alert(1)','http://example.com/p.pdf','https://user:secret@example.com/p.pdf','https://example.com/p.pdf#fake','https://example.com/a b.pdf','https://example.com/p.pdf\n','//example.com/p.pdf'])expectBad(g=>{g.members[0].inspectedSource.url=url;});
 for(const href of ['https://evil.test/#model','joint-beamforming.html?x=1#model','../joint-beamforming.html#model','joint-beamforming.html#missing','shared-array.html#question'])expectBad((g,r)=>{r.cases.find(c=>c.id==='case-joint-beamforming').learningEntry=href;});
});
test('plain prose, attribute and inert JSON serialization defeat HTML delimiter injection',()=>{
 const attack='\"\'&<> </script><script>bad()</script><!-- \u2028\u2029 中文';
 const r=mutated(g=>{g.title=attack;g.members[0].question=attack;g.members[0].inspectedSource.edition=attack;g.checks[0].options[0].feedback=attack;g.questions[0].label=attack;});
 const html=M.renderComparisonGroups(r);a.ok(html.includes(M.escapeHtml(attack)));a.doesNotMatch(html,/<script>bad|<img|<!-- \u2028/);
 const encoded=M.jsonForHtml({text:attack});a.doesNotMatch(encoded,/[<>&\u2028\u2029]/);a.equal(JSON.parse(encoded).text,attack);
 a.equal((html.match(/<script /g)||[]).length,1);a.equal((html.match(/<\/script>/g)||[]).length,1);
});
test('second synthetic group is data-only, independently namespaced, generated without publishing it',()=>{
 const r=clone(),second=structuredClone(r.paperComparisonGroups[0]);second.id='synthetic';second.title='测试组';r.paperComparisonGroups.push(second);
 const html=M.renderComparisonGroups(r),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);a.equal(ids.length,new Set(ids).size);a.match(html,/id="comparison-synthetic"/);a.match(html,/name="comparison-synthetic-question"/);a.match(html,/href="#comparison-synthetic-source-/);
 const generated=generateWith(r);a.match(generated,/id="comparison-synthetic"/);a.match(generated,/测试组/);a.doesNotMatch(read('reading.html'),/id="comparison-synthetic"/);
 a.equal(registry.paperComparisonGroups.length,1);a.equal(M.renderComparisonGroups({...r,paperComparisonGroups:[]}), '');const absent=clone();delete absent.paperComparisonGroups;a.equal(M.renderComparisonGroups(absent),'');a.doesNotMatch(generateWith(absent),/href="#paper-comparisons"/);
});
test('CSS and client remain narrow, scoped, native, non-animated and free of external side effects',()=>{
 const css=read('paper-comparison.css'),js=read('paper-comparison.js');
 for(const token of ['minmax(0,1fr)','min-width:0','overflow-wrap:anywhere','flex-wrap:wrap','min-height:44px',':focus-visible','@media(max-width:480px)','@media print','[hidden]','details::details-content'])a.ok(css.includes(token),token);
 a.doesNotMatch(js,/innerHTML|outerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|navigator\.|location\.|history\.|scrollIntoView|\.focus\(|setInterval|requestAnimationFrame/);
 a.doesNotMatch(css,/animation:|transition:|scroll-behavior:smooth/);
});
