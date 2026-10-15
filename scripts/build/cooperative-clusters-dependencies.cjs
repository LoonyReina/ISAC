'use strict';
// Current-code closure for the bounded normalized FIM lesson. No historical
// projection is used here. Every module and data asset is code-owned by digest.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const contract=require('./cooperative-clusters-runtime-contracts.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const CONTRACT_SHA256='0b1a317748304c2891b0ed0c31c4c199cd14e1405a5f89c7c98a46d2a8aacd73';
a.equal(sha(JSON.stringify(contract)),CONTRACT_SHA256,'Unreviewed cooperative runtime contract');
const runtimeProfiles=contract.modules.map(m=>({public:m.public,sha256:m.sha256,runtimeEdges:m.runtimeEdges,runtimePolicy:m.runtimePolicy,unverifiedInputs:[]}));
const reviewedProfiles=contract.modules.map(m=>[m.public,{sha256:m.sha256,runtimePolicy:m.runtimePolicy,sourceLiterals:m.sourceLiterals,edgeKind:'reviewed-cooperative-module',runtimeEdges:m.runtimeEdges}]);
const fields=(x,keys,label)=>a.deepEqual(Object.keys(x).sort(),[...keys].sort(),'Exact cooperative '+label+' fields');
function cooperativeDependencies(modules,current,identities,pages,parse){
 a.deepEqual(current,contract,'Exact code-owned cooperative contract');
 a.ok(Array.isArray(modules)&&Array.isArray(identities)&&Array.isArray(pages)&&typeof parse==='function','Complete cooperative closure inputs');
 const files=[...contract.modules,...contract.assets,{public:contract.entryPoint,sha256:contract.entryPageSha256}],expected=new Map(files.map(f=>[f.public,f])),ids=new Map(),sources=new Map();
 a.equal(expected.size,files.length,'Unique cooperative file inventory');
 for(const id of identities){fields(id,['file','sha256'],'identity');a.ok(typeof id.file==='string'&&/^[a-f0-9]{64}$/.test(id.sha256)&&!ids.has(id.file),'Unique valid cooperative identity');ids.set(id.file,id.sha256);
  if(/^(?:cooperative-fim|assets\/data\/cooperative-fim)/i.test(id.file))a.ok(expected.has(id.file),'Unlisted cooperative public dependency '+id.file);
  for(const f of files)if(f.sha256===id.sha256)a.equal(id.file,f.public,'Cooperative dependency moved or duplicated');
 }
 for(const f of files)a.equal(ids.get(f.public),f.sha256,'Missing or changed cooperative dependency '+f.public);
 for(const m of modules){fields(m,['file','source'],'module');a.ok(typeof m.source==='string'&&!sources.has(m.file),'Unique cooperative module');sources.set(m.file,m.source);}
 a.deepEqual([...sources.keys()].sort(),contract.modules.map(m=>m.public).sort(),'Complete cooperative module inventory');
 const edges=[];
 for(const m of contract.modules){const source=sources.get(m.public);a.equal(sha(source),m.sha256,'Exact cooperative module source '+m.public);
  for(const literal of new Set([...m.sourceLiterals,...m.runtimeEdges.map(e=>e.literal)]))a.equal(source.split(literal).length,2,'Unique cooperative runtime literal');
  for(const e of m.runtimeEdges)edges.push({from:m.public,url:e.url,kind:'reviewed-cooperative-'+e.kind});
 }
 for(const item of parse(modules)){const m=contract.modules.find(m=>m.public===item.file);a.deepEqual(item.specifiers,m.staticSpecifiers,'Exact cooperative static module edges');for(const url of item.specifiers)edges.push({from:item.file,url,kind:'cooperative-static-module'});}
 for(const e of edges){a.ok(typeof e.url==='string'&&e.url.startsWith('./')&&!/[?#\\\s]/.test(e.url)&&!e.url.includes('..'),'Local bounded cooperative edge');a.ok(expected.has(e.url.slice(2)),'Unlisted cooperative runtime edge '+e.url);}
 a.equal(ids.get(contract.entryPoint),contract.entryPageSha256,'Mapped exact cooperative entry page identity');
 const matches=pages.filter(p=>p.file===contract.entryPoint);a.equal(matches.length,1,'Exactly one cooperative entry page');const source=matches[0].source;
 a.equal(sha(source),contract.entryPageSha256,'Exact complete cooperative entry page');
 const end=source.indexOf('</head>');a.ok(end>=0,'Cooperative entry head');const head=source.slice(0,end+7);a.equal(sha(head),contract.entryHeadSha256,'Exact cooperative entry head');
 const scripts=[...source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]);a.deepEqual(scripts,contract.pageScripts,'No duplicate, external, inline, or unlisted cooperative page scripts');
 const styles=[...source.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)].map(m=>m[0]);a.deepEqual(styles,contract.pageStyles,'Exact cooperative page styles');
 for(const e of contract.pageEdges){a.ok(ids.has(e.url.split('?')[0]),'Missing cooperative page dependency');edges.push({from:contract.entryPoint,url:e.url,kind:'cooperative-page-'+e.kind});}
 return edges;
}
module.exports={cooperativeDependencies,reviewedProfiles,runtimeProfiles,contract};
