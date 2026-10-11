'use strict';
// Pure serialization and small DOM tests, not a real-browser/download certification.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const N=require('../notebook.js'),root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('site/registry.json')),topics=require('../scripts/notebook-topics.cjs').buildNotebookTopics(registry),script=read('notebook.js');
const blank=()=>Object.fromEntries(N.FIELDS.map(({id})=>[id,'']));
const now='2026-10-11T09:30:00.000Z';
const plain=x=>JSON.parse(JSON.stringify(x));
function setup(search=''){
 const els={},anchors=[],downloads=[],blobs=[],created=[],revoked=[],timers=new Map(),events={},fault={};let timerId=0;
 class Element{
  constructor(){this.value='';this.hidden=false;this.attrs={};this.events={};this.textContent='';this.removed=false;}
  setAttribute(key,value){this.attrs[key]=String(value);}
  removeAttribute(key){delete this.attrs[key];}
  addEventListener(type,fn){this.events[type]=fn;}
  fire(type,extra={}){return this.events[type]({target:this,...extra});}
 }
 for(const [,id]of read('practice.html').matchAll(/\bid="([^"]+)"/g))els[id]=new Element();
 els['notebook-form'].hidden=true;els['notebook-jump'].hidden=true;els['notebook-topics'].textContent=JSON.stringify(topics);
 const get=id=>els['notebook-'+id];
 const document={getElementById:id=>els[id]||null,createElement:tag=>{a.equal(tag,'a');const x=new Element();x.click=()=>{if(fault.click)throw Error('click failure');downloads.push({name:x.download,href:x.href});};x.remove=()=>{x.removed=true;};anchors.push(x);return x;},body:{append(){if(fault.append)throw Error('append failure');}}};
 const window={document,location:{search},Blob:class{constructor(parts,options){if(fault.blob)throw Error('blob failure');this.parts=parts;this.options=options;blobs.push(this);}},URL:{createObjectURL(){if(fault.url)throw Error('url failure');const x='blob:notebook-'+created.length;created.push(x);return x;},revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),addEventListener:(type,fn)=>events[type]=fn};
 vm.runInNewContext(script,{window,Date},{filename:'notebook.js'});
 return {els,get,anchors,downloads,blobs,created,revoked,timers,events,fault,click:id=>get(id).fire('click'),enter:(id,value)=>{get(id).value=value;get(id).fire('input');},switchTopic:id=>{get('topic').value=id;get('topic').fire('change');},runTimers(){for(const fn of [...timers.values()])fn();}};
}

test('topic query uses exactly one allowlisted bounded unit ID, decodes safely and never echoes invalid input',()=>{
 for(const topic of topics){a.equal(N.selectTopic('?topic='+topic.id,topics),topic);a.equal(N.selectTopic('?unused=ok&topic='+encodeURIComponent(topic.id),topics),topic);}
 a.equal(N.selectTopic('?topic=%70ilot',topics).id,'pilot');
 for(const query of ['', '?topic=', '?topic=pilot&topic=pilot', '?topic=pilot&%74opic=pilot','?topic=pilot&topic=', '?topic=unknown','?topic=Pilot','?topic=pilot%0A','?topic=pilot+','?topic=pilot%2F..','?topic=%3Cscript%3E','?topic=%','?topic=%C0%AF','?topic='+ 'a'.repeat(65),'?topic=pilot&'+ 'a'.repeat(4096)])a.equal(N.selectTopic(query,topics),null,query.slice(0,100));
});

test('blank and partial records are learner-authored, have separate references and presence-only checks',()=>{
 const empty=N.makeRecord(blank(),null,now);a.equal(empty.kind,'learner-authored-notebook');a.equal(empty.schemaVersion,1);a.equal(empty.exportedAt,now);a.equal(empty.referenceTopic,null);a.equal(empty.referenceSiteBase,'https://loonyreina.github.io/ISAC/');a.match(empty.exportedAtMeaning,/不是实验/);a.deepEqual(empty.learnerEntries,blank());a.equal(empty.fieldPresenceCheck.nonWhitespaceFields,0);a.equal(empty.fieldPresenceCheck.totalFields,10);a.equal(empty.fieldPresenceCheck.kind,'field-presence-only');a.equal(empty.fieldPresenceCheck.missingFields.length,10);
 const e={...blank(),identity:'\n \t　',question:'未执行：观察是否反例',results:'0'};const record=N.makeRecord(e,{...topics[0],location:'secret',referrer:'secret'},now);a.deepEqual(record.learnerEntries,e);a.equal(record.fieldPresenceCheck.nonWhitespaceFields,2);a.equal(record.fieldPresenceCheck.missingFields.includes('results'),false);a.deepEqual(record.referenceTopic,topics[0]);a.notEqual(record.referenceTopic,topics[0]);a.doesNotMatch(JSON.stringify(record),/secret/);
});

test('JSON preserves exact Unicode, spaces, multiline, HTML, numbers as text, and does not fabricate results',()=>{
 const text='  汉字 😀 e\u0301 \u2028\u2029\n\r\n<script>alert("x")</script>\n```md\n[click](javascript:alert(1))\n~~~~\n001.20 NaN Infinity  \t';
 const e=Object.fromEntries(N.FIELDS.map(({id},i)=>[id,text+i]));const record=N.makeRecord(e,topics.at(-1),now);a.deepEqual(JSON.parse(JSON.stringify(record)).learnerEntries,e);a.equal(typeof record.learnerEntries.parameters,'string');a.deepEqual(Object.keys(record.learnerEntries),N.FIELDS.map(x=>x.id));
 a.throws(()=>N.makeRecord({...blank(),results:'x'.repeat(N.MAX_FIELD_LENGTH+1)},null,now),RangeError);a.throws(()=>N.makeRecord({...blank(),parameters:32},null,now),TypeError);a.equal(N.makeRecord({...blank(),results:'x'.repeat(N.MAX_FIELD_LENGTH)},null,now).learnerEntries.results.length,N.MAX_FIELD_LENGTH);
});

test('Markdown fences contain learner HTML and fence attacks literally; reference links use fixed public base',()=>{
 const e=blank();e.question='\n</pre><script>alert(1)</script>\n'+ '`'.repeat(30)+'\n# fake heading\n~~~\n[evil](https://example.invalid/)\n  end  ';
 const record=N.makeRecord(e,topics.find(t=>t.id==='crb'),now),md=N.toMarkdown(record),fence='`'.repeat(31);
 a.ok(md.includes(fence+'\n'+e.question+'\n'+fence));a.match(md,/学习者自行填写的研究草稿/);a.match(md,/不是实验执行时间/);a.ok(md.includes('[教学入口](https://loonyreina.github.io/ISAC/'+record.referenceTopic.teachingHref+')'));a.match(md,/1\/10 栏含非空白文字/);a.match(md,/不认证可复现性/);
 const blankMd=N.toMarkdown(N.makeRecord(blank(),null,now));a.match(blankMd,/未选择参考主题/);a.match(blankMd,/0\/10 栏含非空白文字/);
});

test('progressive page retains exact original nine-line PRE, four native groups, ten blank labeled fields and safe actions',()=>{
 const html=read('practice.html'),source=read('site/content-practice.html'),original='日期 / 代码版本 / 文献版本与章节：\n研究问题 / 可推翻的预测：\n观测数据 / 已知、未知、可控量：\n几何 / 同步 / 近似 / 坐标与单位：\n固定资源 / 基线 / 本轮唯一改动：\n参数 / 种子 / 次数 / 容差：\n指标 / 原始值 / 失败判据与失败次数：\n结果 / 不确定性 / 与预测的差异：\n结论适用范围 / 尚未验证 / 下一步：';
 for(const h of [html,source]){a.equal(h.match(/<pre class="notebook-template">([\s\S]*?)<\/pre>/)[1],original);a.equal([...h.matchAll(/<details class="notebook-step"/g)].length,4);a.equal([...h.matchAll(/<details class="notebook-step" open/g)].length,1);a.equal([...h.matchAll(/<textarea /g)].length,10);a.match(h,/<form id="notebook-form"[^>]* hidden>/);a.match(h,/<noscript>/);a.match(h,/<p id="notebook-jump" hidden><a href="#notebook-form">/);a.ok(h.indexOf('id="notebook-jump"')<h.indexOf('<pre class="notebook-template">'));a.match(h,/<form id="notebook-form" tabindex="-1"/);a.match(h,/拟开展实验与理论预测，不是新增实测结果/);a.match(h,/先下载，再离开/);a.match(h,/离开前请先下载/);a.match(h,/不包含、也不能代替实验页计算得到的 JSON 证据/);a.match(h,/推导、仿真与实测证据/);
  for(const {id}of N.FIELDS){a.match(h,new RegExp('<label for="notebook-'+id+'">'));a.match(h,new RegExp('<textarea id="notebook-'+id+'"[^>]*maxlength="12000"[^>]*></textarea>'));a.match(h,new RegExp('id="notebook-'+id+'-help"'));}
  for(const id of ['check','download-md','download-json'])a.match(h,new RegExp('<button id="notebook-'+id+'" type="button">'));
  for(const id of ['teaching','experiment','evidence','boundary'])a.match(h,new RegExp('<a id="notebook-'+id+'" target="_blank" rel="noopener noreferrer" hidden>[^<]+（新标签页）</a>'));
 }
 a.doesNotMatch(source,/\brequired\b|type="submit"|type="reset"/);a.match(read('notebook.css'),/min-width:0/);a.match(read('notebook.css'),/focus-visible/);
});

test('DOM starts with all ten fields blank even for a seeded topic and prevents form submission',()=>{
 for(const search of ['', '?topic=crb','?topic=%3Cscript%3E']){const s=setup(search);a.equal(s.get('form').hidden,false);a.equal(s.get('jump').hidden,false);for(const {id}of N.FIELDS)a.equal(s.get(id).value,'');a.equal(s.downloads.length,0);a.equal(s.get('topic').value,search==='?topic=crb'?'crb':'');let prevented=false;s.get('form').fire('submit',{preventDefault(){prevented=true;}});a.ok(prevented);}
 const s=setup('?topic=crb');a.equal(s.get('teaching').attrs.href,topics.find(t=>t.id==='crb').teachingHref);a.equal(s.get('evidence').hidden,false);a.equal(s.get('boundary').hidden,false);
});

test('topic changes preserve every field, update only reference data and never rewrite URL/history',()=>{
 const s=setup('?topic=pilot'),e={};for(const {id}of N.FIELDS){e[id]='独立草稿 '+id+'\n<>& 😀';s.enter(id,e[id]);}
 for(const topic of [topics.find(t=>t.id==='crb'),topics.find(t=>!t.evidenceHref),null,topics.at(-1)]){s.switchTopic(topic?topic.id:'');for(const {id}of N.FIELDS)a.equal(s.get(id).value,e[id]);a.match(s.get('topic-status').textContent,/草稿未改变/);a.equal(s.get('evidence').hidden,!topic?.evidenceHref);if(!topic)a.equal(s.get('teaching').attrs.href,undefined);s.click('download-json');const record=JSON.parse(s.blobs.at(-1).parts[0]);a.deepEqual(record.learnerEntries,e);a.deepEqual(record.referenceTopic,topic);}
 a.doesNotMatch(script,/history\.|location\.(?:href|hash|pathname)|location\s*=|location\.(?:replace|assign)|referrer/);
});

test('presence check reports only non-whitespace counts and allows blank and partial downloads',()=>{
 const s=setup();s.click('check');a.match(s.get('check-status').textContent,/0\/10/);for(const {label}of N.FIELDS)a.ok(s.get('check-status').textContent.includes(label));s.click('download-json');a.equal(JSON.parse(s.blobs[0].parts[0]).fieldPresenceCheck.nonWhitespaceFields,0);s.enter('results','  \n　');s.enter('question','先预测');s.click('check');a.match(s.get('check-status').textContent,/1\/10/);a.match(s.get('check-status').textContent,/不判断正确性/);s.click('download-md');a.match(s.blobs[1].parts[0],/1\/10/);s.enter('results','实际未执行');a.match(s.get('check-status').textContent,/内容已更改/);a.match(s.get('download-status').textContent,/先前请求下载的文件不包含本次修改/);
});

test('each click takes a fresh immutable snapshot, uses correct MIME and fixed filename, and avoids saved claims',()=>{
 const s=setup('?topic=pilot');s.enter('question','first');s.click('download-json');s.enter('question','second');s.click('download-json');s.click('download-md');a.equal(s.blobs.length,3);a.equal(JSON.parse(s.blobs[0].parts[0]).learnerEntries.question,'first');a.equal(JSON.parse(s.blobs[1].parts[0]).learnerEntries.question,'second');a.equal(s.blobs[0].options.type,'application/json;charset=utf-8');a.equal(s.blobs[2].options.type,'text/markdown;charset=utf-8');a.deepEqual(s.downloads.map(x=>x.name),['isac-learner-notebook.json','isac-learner-notebook.json','isac-learner-notebook.md']);a.match(s.get('download-status').textContent,/已请求浏览器下载/);a.doesNotMatch(s.get('download-status').textContent,/^已保存/);a.ok(s.anchors.every(x=>x.hidden&&x.removed));s.switchTopic('crb');a.match(s.get('download-status').textContent,/先前请求下载的文件仍使用原主题/);a.equal(JSON.parse(s.blobs[0].parts[0]).referenceTopic.id,'pilot');
});

test('repeated download URLs are revoked exactly once by timers or pagehide',()=>{
 const s=setup();s.click('download-json');s.click('download-md');a.equal(s.revoked.length,0);s.runTimers();a.deepEqual(s.revoked,s.created);a.equal(s.timers.size,0);s.click('download-json');s.events.pagehide();s.events.pagehide();s.runTimers();a.deepEqual(s.revoked,s.created);a.equal(s.timers.size,0);
});

test('Blob, URL, append and click failures retain every entry, clean allocated resources, and recover on retry',()=>{
 for(const fault of ['blob','url','append','click']){const s=setup('?topic=crb');s.enter('results','  原始失败证据\n😀');s.fault[fault]=true;s.click('download-json');a.equal(s.downloads.length,0);a.equal(s.get('results').value,'  原始失败证据\n😀');a.match(s.get('download-status').textContent,/下载未能启动，当前草稿未清除/);a.deepEqual(s.revoked,s.created);a.ok(s.anchors.every(x=>x.removed));delete s.fault[fault];s.click('download-json');a.equal(s.downloads.length,1);a.equal(JSON.parse(s.blobs.at(-1).parts[0]).learnerEntries.results,'  原始失败证据\n😀');s.events.pagehide();a.deepEqual(s.revoked,s.created);}
 const s=setup();s.enter('results','x'.repeat(12001));s.click('download-json');a.equal(s.downloads.length,0);a.equal(s.get('results').value.length,12001);a.match(s.get('download-status').textContent,/12,000/);s.enter('results','未执行');s.click('download-json');a.equal(s.downloads.length,1);
});

test('notebook adds no storage, clipboard, network, imports, accounts, auto-evidence or raw JSON preview',()=>{
 a.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|navigator\.clipboard|document\.cookie|innerHTML|insertAdjacentHTML|eval\s*\(|new Function|import\s|require\s*\(/);
 a.doesNotMatch(read('site/content-practice.html'),/type="(?:file|password|email)"/);
 a.doesNotMatch(script,/\.textContent\s*=\s*(?:JSON\.stringify|text|record)/);
});
