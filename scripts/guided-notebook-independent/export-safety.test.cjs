'use strict';
// Independent tests of actual source in a minimal simulated DOM, not a browser.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(process.env.NOTEBOOK_REPO||process.cwd());
const source=fs.readFileSync(path.join(root,'notebook.js'),'utf8');
const html=fs.readFileSync(path.join(root,'practice.html'),'utf8');
const N=require(path.join(root,'notebook.js'));
const generated=html.match(/<script type="application\/json" id="notebook-topics">([\s\S]*?)<\/script>/);
assert.ok(generated,'Generate practice.html before running the independent export audit');
const topics=JSON.parse(generated[1]);
const keys=['identity','question','observations','geometry','comparison','parameters','metrics','results','uncertainty','scope'];
const BASE='https://loonyreina.github.io/ISAC/';
const TIME='2026-10-11T00:00:00.000Z';
const plain=x=>JSON.parse(JSON.stringify(x));
const blank=()=>Object.fromEntries(keys.map(k=>[k,'']));

function setup(search=''){
 const elements={},anchors=[],downloads=[],blobs=[],revoked=[],created=[],events={},timers=new Map(),fault={};
 let timerId=0,now=Date.parse(TIME);
 const forbidden=name=>()=>{throw new Error('Forbidden side effect: '+name);};
 class E{
  constructor(id=''){this.id=id;this.value='';this.textContent='';this.hidden=false;this.events={};this.attrs={};this.children=[];}
  set innerHTML(_){throw new Error('Unsafe HTML sink');}
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){this.events[k]=f;}
  fire(k,event={}){assert.equal(typeof this.events[k],'function',this.id+': '+k);return this.events[k]({...event,target:this});}
  append(child){if(fault.append)throw new Error('append failed');this.children.push(child);}
  click(){if(fault.click)throw new Error('download click failed');downloads.push({href:this.href,name:this.download});}
  remove(){this.removed=true;}
 }
 for(const m of html.matchAll(/\bid="([^"]+)"/g))elements[m[1]]=new E(m[1]);
 elements['notebook-form'].hidden=true;
 elements['notebook-topics'].textContent=generated[1];
 const doc={body:new E('body'),getElementById:id=>{assert.ok(elements[id],id);return elements[id];},createElement:tag=>{assert.equal(tag,'a');if(fault.anchor)throw new Error('anchor creation failed');const a=new E();anchors.push(a);return a;}};
 Object.defineProperty(doc,'referrer',{get:forbidden('referrer read')});
 const loc={search};for(const k of ['href','origin','pathname','hash'])Object.defineProperty(loc,k,{get:forbidden('location.'+k+' read')});
 const win={document:doc,location:loc,addEventListener:(k,f)=>events[k]=f,
  Blob:class extends Blob{constructor(parts,options){if(fault.blob)throw new Error('Blob failed');super(parts,options);this.parts=parts;this.options=options;blobs.push(this);}},
  URL:{createObjectURL(blob){if(fault.url)throw new Error('object URL failed');assert.ok(blob instanceof Blob);const url='blob:audit-'+created.length;created.push(url);return url;},revokeObjectURL:url=>revoked.push(url)},
  setTimeout(fn,delay){assert.equal(delay,1000);const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 for(const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','localStorage','sessionStorage','indexedDB','navigator'])Object.defineProperty(win,name,{get:forbidden(name+' access')});
 class TestDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const ctx=vm.createContext({window:win,Date:TestDate});
 vm.runInContext(source,ctx,{filename:'notebook.js',timeout:3000});
 return {elements,anchors,downloads,blobs,revoked,created,events,timers,fault,win,doc,
  fill(values){for(const [k,v]of Object.entries(values)){elements['notebook-'+k].value=v;elements['notebook-'+k].fire('input');}},
  click(format='json'){elements['notebook-download-'+format].fire('click');},
  change(id){elements['notebook-topic'].value=id;elements['notebook-topic'].fire('change');},
  setNow(value){now=Date.parse(value);},
  flush(){for(const [id,fn]of [...timers])if(timers.delete(id))fn();},
  record(){return JSON.parse(blobs.at(-1).parts[0]);}};
}

function literalBlocks(md){
 // The actual exporter uses bare backtick fences. Independently recognize closure
 // using CommonMark's >= opening-fence rule, including CR and CRLF boundaries.
 const blocks=[];let current=null;
 for(const line of md.split(/\r\n|\n|\r/)){
  if(!current){const m=line.match(/^(`{3,})$/);if(m)current={size:m[1].length,lines:[]};}
  else if(new RegExp('^ {0,3}`{'+current.size+',}[ \\t]*$').test(line)){blocks.push(current.lines.join('\n'));current=null;}
  else current.lines.push(line);
 }
 assert.equal(current,null,'all literal fences close');return blocks;
}

test('exactly ten blank native fields and non-submitting export controls are generated',()=>{
 assert.deepEqual(N.FIELDS.map(x=>x.id),keys);
 const textareas=[...html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g)];assert.equal(textareas.length,10);
 for(const [_,attrs,text]of textareas){assert.equal(text,'');assert.match(attrs,/maxlength="12000"/);assert.doesNotMatch(attrs,/\bname=/);}
 for(const id of ['check','download-json','download-md'])assert.match(html,new RegExp('<button[^>]*id="notebook-'+id+'"[^>]*type="button"'));
 assert.match(html,/<form[^>]*id="notebook-form"[^>]*hidden/);assert.match(html,/<noscript>/);
 assert.doesNotMatch(html,/<form[^>]*\b(?:action|method)\s*=/i);
 const s=setup();assert.equal(s.elements['notebook-form'].hidden,false);let prevented=false;s.elements['notebook-form'].fire('submit',{preventDefault(){prevented=true;}});assert.equal(prevented,true);
 assert.ok(keys.every(k=>s.elements['notebook-'+k].value===''));
});

test('topic selector accepts one registered ID and percent-encoded equivalents',()=>{
 for(const topic of topics){assert.equal(N.selectTopic('?topic='+topic.id,topics),topic);assert.equal(N.selectTopic('?x=ignored&topic='+topic.id+'&other=no',topics),topic);}
 const id=topics[0].id,encoded=[...id].map(c=>'%'+c.charCodeAt(0).toString(16)).join('');
 assert.equal(N.selectTopic('?%74opic='+encoded,topics),topics[0]);
});

test('unknown, duplicate, malformed, URL-shaped, whitespace and oversized topic inputs stay generic',()=>{
 const id=topics[0].id;
 const bad=['','?topic','?topic=','?topic='+id+'&topic='+id,'?topic='+id+'&%74opic='+id,'?topic=&topic='+id,'?topic=__proto__','?topic=constructor','?topic=not-registered',
 '?topic=javascript%3Aalert(1)','?topic=https%3A%2F%2Fexample.invalid','?topic=%2F%2Fevil.invalid','?topic=%3Cscript%3E','?topic='+id+'%0A','?topic=%20'+id,'?topic='+id+'+','?topic=%00'+id,
 '?topic=%','?topic=%GG','?topic=%C0%AF','?topic=%ED%A0%80','?topic='+id+'&%ZZ=x','?topic='+('a'.repeat(65)),'?topic='+('a'.repeat(100000)),
 '?irrelevant='+('z'.repeat(100000))+'&topic='+id];
 for(const search of bad)assert.equal(N.selectTopic(search,topics),null,search.slice(0,100));
 for(const search of bad.slice(0,-2)){
  const s=setup(search);assert.equal(s.elements['notebook-topic'].value,'');
  for(const key of ['teaching','experiment','evidence','boundary']){assert.equal(s.elements['notebook-'+key].hidden,true);assert.equal(s.elements['notebook-'+key].attrs.href,undefined);}
  s.click();assert.equal(s.record().referenceTopic,null);
 }
});

test('blank and partial records export without claiming experiment execution or correctness',()=>{
 for(const entries of [blank(),{...blank(),question:'A possible question',results:'未执行'}]){
  const record=N.makeRecord(entries,null,TIME);assert.deepEqual(record.learnerEntries,entries);assert.equal(record.referenceTopic,null);assert.equal(record.exportedAt,TIME);
  assert.match(record.exportedAtMeaning,/不是实验执行时间/);assert.equal(record.fieldPresenceCheck.kind,'field-presence-only');assert.match(record.fieldPresenceCheck.notice,/不判断正确性/);assert.match(record.fieldPresenceCheck.notice,/不证明实验已执行/);assert.match(record.fieldPresenceCheck.notice,/不认证可复现性/);
  const md=N.toMarkdown(record);assert.match(md,/不是结果认证/);assert.match(md,/不是实验执行时间/);assert.equal(literalBlocks(md).length,10);
 }
});

test('presence distinguishes only non-whitespace strings and never alters learner text',()=>{
 const entries=Object.fromEntries(keys.map((key,i)=>[key,i%2?' \t\n\r\u3000':'This is deliberately unsupported text']));const before=JSON.stringify(entries),p=N.presence(entries);
 assert.equal(p.nonWhitespaceFields,5);assert.equal(p.totalFields,10);assert.deepEqual(p.missingFields,keys.filter((_,i)=>i%2));assert.equal(JSON.stringify(entries),before);
 const full=N.presence(Object.fromEntries(keys.map(k=>[k,'nonsense'])));assert.equal(full.nonWhitespaceFields,10);assert.match(full.notice,/不判断正确性/);
 const s=setup();s.fill(entries);s.elements['notebook-check'].fire('click');assert.match(s.elements['notebook-check-status'].textContent,/5\/10/);assert.match(s.elements['notebook-check-status'].textContent,/不判断正确性/);assert.deepEqual(Object.fromEntries(keys.map(k=>[k,s.elements['notebook-'+k].value])),entries);
});

test('JSON bytes preserve Unicode, HTML, CR/LF, tabs, spaces, backticks and lone surrogates exactly',async()=>{
 const hostile='  中文 e\u0301 🛰️\nline\r\nline\rline\t</textarea><script>alert(1)</script>\n```\n[unsafe](javascript:alert(1))\n\\ \u0000 \ud800 \udfff \u2028\u2029  ';
 const entries=Object.fromEntries(keys.map((k,i)=>[k,hostile+' '+i]));const before=JSON.stringify(entries),record=N.makeRecord(entries,topics[0],TIME);
 assert.deepEqual(JSON.parse(JSON.stringify(record)).learnerEntries,entries);assert.equal(JSON.stringify(entries),before);
 const s=setup('?topic='+topics[0].id);s.fill(entries);s.click();assert.deepEqual(JSON.parse(await s.blobs.at(-1).text()).learnerEntries,entries);
});

test('Markdown isolates every learner field literally even with adversarial fence closers and HTML',()=>{
 const attacks=['<script>alert(1)</script>\n<img src=x onerror=x>', '```\n# injected heading\n~~~\n[link](javascript:alert(1))', '``````````\r\n</pre>\r# still literal', '   ````\t\n<!-- comment -->\n> quoted', '\n\nTrailing whitespace  \n', 'Unicode 中文 🛰️ e\u0301 \u2028 \u2029', '`'.repeat(12000), '<https://example.invalid/>\n![pixel](https://example.invalid/pixel)', 'tab\tand\\backslash\rbare CR', '\n``\n`\n~~~~\n<form action="https://example.invalid">'];
 const entries=Object.fromEntries(keys.map((k,i)=>[k,attacks[i]]));
 const md=N.toMarkdown(N.makeRecord(entries,null,TIME)),blocks=literalBlocks(md);
 assert.equal(blocks.length,10);
 keys.forEach((k,i)=>assert.equal(blocks[i],entries[k].replace(/\r\n|\r/g,'\n')));
});

test('reference context is a detached whitelist separate from entries and includes fixed external provenance',()=>{
 const entries={...blank(),question:'Learner question'},ref={...topics[0],untrustedExtra:'should not export'},r=N.makeRecord(entries,ref,TIME);
 assert.equal(r.referenceSiteBase,BASE);assert.equal(r.learnerEntries.question,'Learner question');assert.equal(r.referenceTopic.question,topics[0].question);assert.equal(r.referenceTopic.untrustedExtra,undefined);
 ref.title='changed';entries.question='changed';assert.notEqual(r.referenceTopic.title,ref.title);assert.equal(r.learnerEntries.question,'Learner question');
 const md=N.toMarkdown(r);for(const key of ['teachingHref','experimentHref','evidenceHref','boundaryHref'])if(r.referenceTopic[key])assert.ok(md.includes(BASE+r.referenceTopic[key]),key);
 const noTopic=N.makeRecord(blank(),null,TIME);assert.equal(noTopic.referenceSiteBase,BASE);
});

test('over-limit or non-string fields are rejected without silently truncating data',()=>{
 const exact={...blank(),question:'x'.repeat(N.MAX_FIELD_LENGTH)};assert.equal(N.makeRecord(exact,null,TIME).learnerEntries.question.length,N.MAX_FIELD_LENGTH);
 assert.throws(()=>N.makeRecord({...exact,question:exact.question+'x'},null,TIME),RangeError);assert.throws(()=>N.makeRecord({...blank(),question:42},null,TIME),TypeError);
 const s=setup(),text='x'.repeat(N.MAX_FIELD_LENGTH+1);s.fill({question:text});s.click();assert.equal(s.blobs.length,0);assert.equal(s.elements['notebook-question'].value,text);assert.match(s.elements['notebook-download-status'].textContent,/未清除/);
 s.fill({question:'recovered'});s.click();assert.equal(s.record().learnerEntries.question,'recovered');
});

test('topic changes preserve all learner fields and invalid options cannot create links',()=>{
 const s=setup('?topic='+topics[0].id);const entries=Object.fromEntries(keys.map((k,i)=>[k,'Entry '+i+'\n```<b>text</b>']));s.fill(entries);
 for(const id of [topics[1].id,'','javascript:alert(1)',topics[0].id]){
  s.change(id);assert.deepEqual(Object.fromEntries(keys.map(k=>[k,s.elements['notebook-'+k].value])),entries);s.click();assert.deepEqual(s.record().learnerEntries,entries);assert.equal(s.record().referenceTopic?.id||'',topics.some(t=>t.id===id)?id:'');
 }
 assert.match(s.elements['notebook-topic-status'].textContent,/草稿未改变/);
});

test('each export takes a fresh draft, topic and export time snapshot with safe names and MIME types',()=>{
 const s=setup('?topic='+topics[0].id);s.fill({identity:'../../unsafe\nname',results:'first result'});s.click();const first=s.record();
 assert.equal(first.exportedAt,TIME);assert.equal(s.downloads[0].name,'isac-learner-notebook.json');assert.equal(s.blobs[0].type,'application/json;charset=utf-8');
 s.fill({results:'second result'});assert.match(s.elements['notebook-download-status'].textContent,/先前请求下载的文件不包含本次修改/);
 s.change(topics[1].id);s.setNow('2026-10-11T00:00:05.000Z');s.click();const second=s.record();
 assert.equal(second.learnerEntries.results,'second result');assert.equal(second.referenceTopic.id,topics[1].id);assert.equal(second.exportedAt,'2026-10-11T00:00:05.000Z');assert.equal(first.learnerEntries.results,'first result');
 s.click('md');assert.equal(s.downloads.at(-1).name,'isac-learner-notebook.md');assert.equal(s.blobs.at(-1).type,'text/markdown;charset=utf-8');assert.ok(s.blobs.at(-1).parts[0].includes('second result'));
 assert.match(s.elements['notebook-download-status'].textContent,/未确认文件已保存/);assert.ok(s.anchors.every(a=>a.hidden&&a.removed));assert.equal(new Set(s.created).size,3);
});

test('Blob, object-URL, anchor, append and click failures keep drafts and recover on retry',()=>{
 for(const fault of ['blob','url','anchor','append','click']){
  const s=setup('?topic='+topics[0].id);s.fill({question:'Keep this draft',results:'Not yet run'});s.fault[fault]=true;s.click();
  assert.equal(s.downloads.length,0,fault);assert.equal(s.elements['notebook-question'].value,'Keep this draft');assert.match(s.elements['notebook-download-status'].textContent,/下载未能启动/);assert.match(s.elements['notebook-download-status'].textContent,/未清除/);assert.deepEqual(s.revoked,s.created);assert.ok(s.anchors.every(a=>a.removed));
  delete s.fault[fault];s.fill({results:'Edited before retry'});s.click();assert.equal(s.downloads.length,1);assert.equal(s.record().learnerEntries.results,'Edited before retry');s.flush();assert.deepEqual(s.revoked,s.created);assert.equal(s.timers.size,0);
 }
});

test('timers and pagehide revoke every created object URL exactly once across repeated downloads',()=>{
 const s=setup();s.click();s.click('md');assert.equal(s.created.length,2);assert.equal(s.revoked.length,0);s.flush();assert.deepEqual(s.revoked,s.created);s.events.pagehide();s.flush();assert.equal(s.revoked.length,2);
 s.click();s.click();s.events.pagehide();assert.equal(s.timers.size,0);assert.deepEqual(s.revoked,s.created);s.events.pagehide();s.flush();assert.equal(new Set(s.revoked).size,s.created.length);
});

test('no network, storage, clipboard, import or full-location/referrer capture exists',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|sendBeacon|localStorage|sessionStorage|indexedDB|navigator\.clipboard|\bimport\s*(?:\(|\{|["'])|\brequire\s*\(|innerHTML|outerHTML|insertAdjacentHTML|eval\s*\(|new\s+Function\b|document\.referrer|location\.(?:href|origin|pathname)|\.submit\s*\(/);
 const marker='PRIVATE_QUERY_MUST_NOT_EXPORT',s=setup('?other='+marker+'&topic='+topics[0].id);s.click();s.click('md');
 for(const blob of s.blobs){assert.ok(!blob.parts[0].includes(marker));assert.ok(!blob.parts[0].includes('blob:audit-'));}
});

test('query size boundaries are explicit and a 64-character allowlisted ID is accepted exactly',()=>{
 assert.equal(N.MAX_SEARCH_LENGTH,4096);
 const id=topics[0].id,prefix='?topic='+id+'&x=',max=prefix+'z'.repeat(N.MAX_SEARCH_LENGTH-prefix.length);
 assert.equal(max.length,4096);assert.equal(N.selectTopic(max,topics),topics[0]);assert.equal(N.selectTopic(max+'z',topics),null);
 const custom={id:'a'.repeat(64)};assert.equal(N.selectTopic('?topic='+custom.id,[custom]),custom);assert.equal(N.selectTopic('?topic='+custom.id+'a',[{id:custom.id+'a'}]),null);
});

test('query fuzz stays null or returns the exact registered object and never invents destinations',()=>{
 let seed=37;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const alphabet='abcXYZ019-%&?=#<>"\' /+:\n\r\t中';
 for(let trial=0;trial<600;trial++){
  const length=random()%160;let value='';for(let j=0;j<length;j++)value+=alphabet[random()%alphabet.length];
  const query=trial%3===0?'?topic='+value:trial%3===1?'?'+value+'&topic='+topics[0].id:value;
  const selected=N.selectTopic(query,topics);assert.ok(selected===null||topics.includes(selected));
 }
});

test('a failed later export does not lose an earlier pending URL or stale-copy the retry',()=>{
 for(const fault of ['blob','url','click']){
  const s=setup();s.fill({question:'first'});s.click();const first=s.record();s.fill({question:'second'});s.fault[fault]=true;s.click();assert.equal(s.downloads.length,1);delete s.fault[fault];
  s.fill({question:'third'});s.click();assert.equal(s.downloads.length,2);assert.equal(s.record().learnerEntries.question,'third');assert.equal(first.learnerEntries.question,'first');
  s.events.pagehide();s.flush();assert.equal(s.timers.size,0);assert.deepEqual([...s.revoked].sort(),[...s.created].sort());assert.equal(new Set(s.revoked).size,s.created.length);
 }
});

test('literal registry text enters only text sinks and reference links use generated routes',()=>{
 const s=setup('?topic='+topics[0].id);assert.equal(s.elements['notebook-reference-title'].textContent,topics[0].title);
 for(const [id,key]of [['teaching','teachingHref'],['experiment','experimentHref'],['evidence','evidenceHref'],['boundary','boundaryHref']]){
  assert.equal(s.elements['notebook-'+id].attrs.href,topics[0][key]);
  assert.match(html,new RegExp('<a[^>]*id="notebook-'+id+'"[^>]*target="_blank"[^>]*rel="noopener noreferrer"'));
 }
 s.change('');for(const id of ['teaching','experiment','evidence','boundary']){assert.equal(s.elements['notebook-'+id].hidden,true);assert.equal(s.elements['notebook-'+id].attrs.href,undefined);}
});
