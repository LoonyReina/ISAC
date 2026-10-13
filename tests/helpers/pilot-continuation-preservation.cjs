'use strict';
// Reverse only the exact reviewed pilot-only generator extension; old digests stay.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const extensionHash='b2ea05111ab2b48ff87db78f5f4fa980620b8ee33bc032d4055d8f8cefaf6ad7';
const oldNext="function next(page){const c=page.case&&caseFor(page.case),href=page.next==='practice.html#notebook'&&c?notebookHref(c.unit):page.next;return `<aside class=\"site-next\" aria-label=\"下一步\"><p>完成当前问题之后</p>${link(href,page.nextLabel+' →')}</aside><footer class=\"site-footer\">ISAC 交互学习 · 独立教学模型不等于完整论文复现 · ${link('index.html','学习地图')} · ${link('reading.html#reading','原文与证据')}</footer>`;}\n";
const newNext="function next(page){const c=page.case&&caseFor(page.case),href=page.next==='practice.html#notebook'&&c?notebookHref(c.unit):page.next;const continuation=pilotReadingContinuation(page);return `<aside class=\"site-next\" aria-label=\"下一步\">${continuation||'<p>完成当前问题之后</p>'}${continuation?'<p>也可先记录这次观察：'+link(href,esc(page.nextLabel)+' →')+'</p>':link(href,page.nextLabel+' →')}</aside><footer class=\"site-footer\">ISAC 交互学习 · 独立教学模型不等于完整论文复现 · ${link('index.html','学习地图')} · ${link('reading.html#reading','原文与证据')}</footer>`;}\n";
function withoutPilotContinuation(source){
 source=require('./nearfield-research-preservation.cjs').maybeWithoutNearfieldPrerequisiteTitle(source);
 const start='function pilotReadingContinuation(page){',following='function next(page){';
 a.equal(source.split(start).length,2,'one pilot continuation helper');
 a.equal(source.split(newNext).length,2,'one exact pilot-only next hook');
 const i=source.indexOf(start),j=source.indexOf(following,i),block=source.slice(i,j);
 a.equal(crypto.createHash('sha256').update(block).digest('hex'),extensionHash,'exact reviewed continuation helper');
 a.ok(source.includes("return text+'</div>';}\n"+block+newNext+'function region(key,html){'),'helper and next hook remain in the original shell position');
 return source.replace(block,'').replace(newNext,oldNext);
}
module.exports={withoutPilotContinuation,extensionHash,oldNext,newNext};
