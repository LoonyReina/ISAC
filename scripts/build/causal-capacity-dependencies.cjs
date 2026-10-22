'use strict';
// Current-code closure for the bounded fixed-quarter causal lesson. No historical
// projection is used here. Every module and data asset is code-owned by digest.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const contract=require('./causal-capacity-runtime-contracts.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const CONTRACT_SHA256='7aeec144d7f4509dbc88f95fd8e7d46d002b45fe57aae5433dfdf4e1bd6d3f3e';
a.equal(sha(JSON.stringify(contract)),CONTRACT_SHA256,'Unreviewed causal runtime contract');
const runtimeProfiles=contract.modules.map(m=>({public:m.public,sha256:m.sha256,runtimeEdges:m.runtimeEdges,runtimePolicy:m.runtimePolicy,unverifiedInputs:[]}));
const reviewedProfiles=contract.modules.map(m=>[m.public,{sha256:m.sha256,runtimePolicy:m.runtimePolicy,sourceLiterals:m.sourceLiterals,edgeKind:'reviewed-causal-module',runtimeEdges:m.runtimeEdges}]);
const fields=(x,keys,label)=>a.deepEqual(Object.keys(x).sort(),[...keys].sort(),'Exact causal '+label+' fields');
function causalDependencies(modules,current,identities,pages,parse){
 a.deepEqual(current,contract,'Exact code-owned causal contract');
 a.ok(Array.isArray(modules)&&Array.isArray(identities)&&Array.isArray(pages)&&typeof parse==='function','Complete causal closure inputs');
 const files=[...contract.modules,...contract.assets,{public:contract.entryPoint,sha256:contract.entryPageSha256}],expected=new Map(files.map(f=>[f.public,f])),ids=new Map(),sources=new Map();
 a.equal(expected.size,files.length,'Unique causal file inventory');
 for(const id of identities){fields(id,['file','sha256'],'identity');a.ok(typeof id.file==='string'&&/^[a-f0-9]{64}$/.test(id.sha256)&&!ids.has(id.file),'Unique valid causal identity');ids.set(id.file,id.sha256);
  if(/^(?:causal-capacity|causal-state-capacity)/i.test(id.file))a.ok(expected.has(id.file),'Unlisted causal public dependency '+id.file);
  for(const f of files)if(f.sha256===id.sha256)a.equal(id.file,f.public,'Causal dependency moved or duplicated');
 }
 for(const f of files)a.equal(ids.get(f.public),f.sha256,'Missing or changed causal dependency '+f.public);
 for(const m of modules){fields(m,['file','source'],'module');a.ok(typeof m.source==='string'&&!sources.has(m.file),'Unique causal module');sources.set(m.file,m.source);}
 a.deepEqual([...sources.keys()].sort(),contract.modules.map(m=>m.public).sort(),'Complete causal module inventory');
 const edges=[];
 for(const m of contract.modules){const source=sources.get(m.public);a.equal(sha(source),m.sha256,'Exact causal module source '+m.public);
  for(const literal of new Set([...m.sourceLiterals,...m.runtimeEdges.map(e=>e.literal)]))a.equal(source.split(literal).length,2,'Unique causal runtime literal');
  for(const e of m.runtimeEdges)edges.push({from:m.public,url:e.url,kind:'reviewed-causal-'+e.kind});
 }
 for(const item of parse(modules)){const m=contract.modules.find(m=>m.public===item.file);a.deepEqual(item.specifiers,m.staticSpecifiers,'Exact causal static module edges');for(const url of item.specifiers)edges.push({from:item.file,url,kind:'causal-static-module'});}
 for(const e of edges){a.ok(typeof e.url==='string'&&e.url.startsWith('./')&&!/[?#\\\s]/.test(e.url)&&!e.url.includes('..'),'Local bounded causal edge');a.ok(expected.has(e.url.slice(2)),'Unlisted causal runtime edge '+e.url);}
 a.equal(ids.get(contract.entryPoint),contract.entryPageSha256,'Mapped exact causal entry page identity');
 const matches=pages.filter(p=>p.file===contract.entryPoint);a.equal(matches.length,1,'Exactly one causal entry page');const source=matches[0].source;
 a.equal(sha(source),contract.entryPageSha256,'Exact complete causal entry page');
 const end=source.indexOf('</head>');a.ok(end>=0,'Causal entry head');const head=source.slice(0,end+7);a.equal(sha(head),contract.entryHeadSha256,'Exact causal entry head');
 const scripts=[...source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]);a.deepEqual(scripts,contract.pageScripts,'No duplicate, external, inline, or unlisted causal page scripts');
 const styles=[...source.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)].map(m=>m[0]);a.deepEqual(styles,contract.pageStyles,'Exact causal page styles');
 for(const e of contract.pageEdges){a.ok(ids.has(e.url.split('?')[0]),'Missing causal page dependency');edges.push({from:contract.entryPoint,url:e.url,kind:'causal-page-'+e.kind});}
 return edges;
}
module.exports={causalDependencies,reviewedProfiles,runtimeProfiles,contract};
