'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),loc=(source,flat)=>path.join(root,fs.existsSync(path.join(root,source))?source:flat),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const receipt=require(loc('labs/crb-beamforming/receiver/SOURCE-IMPORT.json','crb-receiver/SOURCE-IMPORT.json'));
const flat=p=>p.startsWith('labs/crb-beamforming/receiver/')?'crb-receiver/'+path.basename(p):p.startsWith('labs/crb-beamforming/multiuser/')?'crb-multiuser/'+path.basename(p):p.startsWith('labs/crb-beamforming/')?path.basename(p):p.startsWith('content/pages/')?path.basename(p):p;
test('receiver imports retain reviewed bytes, immutable original K1 and four Eq33 kernels',()=>{
 for(const row of [...receipt.acceptedFiles,...receipt.protectedRuntimeFiles]){if(row.path==='content/pages/crb-beamforming.html')continue;const b=fs.readFileSync(loc(row.path,flat(row.path)));a.equal(b.length,row.bytes,row.path);a.equal(sha(b),row.sha256,row.path);}a.equal(receipt.verificationScope.fullPaperReproduction,false);
});
test('receiver is additive to exact old single-user sections and all existing anchors',()=>{
 const html=fs.readFileSync(loc('content/pages/crb-beamforming.html','crb-beamforming.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);a.equal(new Set(ids).size,ids.length);for(const id of receipt.preservedPageIds)a.ok(ids.includes(id),id);for(const [id,row]of Object.entries(receipt.protectedK1Sections)){const m=html.match(new RegExp('<section\\b[^>]*id="'+id+'".*?</section>','s'));a.ok(m,id);a.equal(sha(m[0]),row.sha256,id);}a.match(html,/id="crb-receiver"/);a.match(html,/18,001/);a.match(html,/8 MiB/);a.match(html,/扩展目标/);a.match(html,/原文.*基线/);
});
