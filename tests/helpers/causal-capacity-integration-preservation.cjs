'use strict';
// Provenance-only inverse. Current runtime/dependency gates never import it.
// Compact byte edits retain both complete identities and exact edit boundaries.
const a=require('node:assert/strict'),crypto=require('node:crypto'),delta=require('./causal-capacity-refresh-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function withoutFile(file,bytes,rows=delta.files){
 bytes=require('./multipath-information-preservation.cjs').withoutFile(file,bytes);
 const matches=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(matches.length<=1,'unique causal inverse');if(!matches.length)return bytes;
 const row=matches[0];if(identity(bytes,row.before)||(row.historicalIntermediates||[]).some(r=>identity(bytes,r)))return bytes;
 a.ok(identity(bytes,row.after),'exact causal current file '+file);let prior=Buffer.from(bytes);
 for(const c of [...row.changes].reverse()){
  const before=Buffer.from(c.beforeBase64,'base64'),after=Buffer.from(c.afterBase64,'base64'),at=c.offsetAfter;
  a.ok(Number.isInteger(at)&&at>=0&&at+after.length<=prior.length,'bounded causal edit');
  a.deepEqual(prior.subarray(at,at+after.length),after,'exact causal edit bytes');
  prior=Buffer.concat([prior.subarray(0,at),before,prior.subarray(at+after.length)]);
 }
 a.ok(identity(prior,row.before),'exact causal prior file '+file);return prior;
}
function withoutRegistry(input){
 const out=require('./multipath-information-preservation.cjs').withoutRegistry(input),marker=delta.registryAdditions;
 if(!marker.some(c=>Array.isArray(out[c.key])&&out[c.key].some(v=>JSON.stringify(v)===JSON.stringify(c.value)||v.path==='causal-state-capacity.html'||v.canonicalHref?.startsWith('causal-state-capacity.html'))))return out;
 for(const c of marker){a.equal(out[c.key].length,c.priorLength+1,'complete causal registry '+c.key);a.deepEqual(out[c.key][c.priorLength],c.value,'exact causal registry addition '+c.key);out[c.key].splice(c.priorLength,1);}
 return out;
}
function withoutMappings(input){
 const out=require('./multipath-information-preservation.cjs').withoutMappings(input),rows=delta.addedEntries,owners=delta.addedOwners;
 if(!rows.some(row=>out.entries.some(e=>e.source===row.source))&&!owners.some(row=>out.owners.some(o=>o.id===row.id)))return out;
 for(const row of rows){const at=out.entries.flatMap((e,i)=>e.source===row.source?[i]:[]);a.equal(at.length,1,'one causal mapping '+row.source);a.deepEqual(out.entries[at[0]],row,'exact causal mapping');out.entries.splice(at[0],1);}
 for(const row of owners){const at=out.owners.flatMap((e,i)=>e.id===row.id?[i]:[]);a.equal(at.length,1,'one causal owner');a.deepEqual(out.owners[at[0]],row,'exact causal owner');out.owners.splice(at[0],1);}
 a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.priorManifestSha256,'exact pre-causal manifest');return out;
}
function withoutContracts(input){
 const out=require('./multipath-information-preservation.cjs').withoutContracts(input),rows=delta.addedModuleProfiles;
 if(!rows.some(row=>out.modules.some(e=>e.public===row.public)))return out;
 a.equal(out.modules.length,delta.priorModuleCount+rows.length,'complete causal module inventory');a.deepEqual(out.modules.slice(delta.priorModuleCount),rows,'exact causal appended profiles');out.modules.splice(delta.priorModuleCount);return out;
}
module.exports={delta,sha,identity,withoutFile,withoutRegistry,withoutMappings,withoutContracts};

// Structural read-boundary inverse for historical metadata consumers. Only the
// enumerated fields of the same canonical paper are reversed; unrelated values
// remain visible to their original guards. Mixed old/new endpoints fail closed.
const sameMetadata=(x,y)=>require('node:util').isDeepStrictEqual(x,y)&&JSON.stringify(x)===JSON.stringify(y);
function withoutMetadata(input,key){
 const out=require('./multipath-information-preservation.cjs')[key==='guides'?'withoutGuides':'withoutBacklog'](input),record=delta.metadataChanges[key],rows=out[record.collection];
 a.ok(Array.isArray(rows),'causal metadata collection');
 const matches=rows.filter(x=>x.id===record.id);a.equal(matches.length,1,'one causal historical paper identity');const item=matches[0];
 const states=record.changes.map(c=>{let parent=item;for(const part of c.path.slice(0,-1)){a.ok(parent&&Object.hasOwn(parent,part),'causal metadata parent');parent=parent[part];}const leaf=c.path.at(-1),present=Object.hasOwn(parent,leaf),value=parent[leaf];return {c,parent,leaf,prior:c.added?!present:present&&sameMetadata(value,c.before),current:present&&sameMetadata(value,c.after)};});
 if(states.every(x=>x.prior))return out;
 a.ok(states.every(x=>x.current),'complete exact causal metadata endpoint');
 for(const {c,parent,leaf}of states){if(c.added)delete parent[leaf];else parent[leaf]=structuredClone(c.before);}
 return out;
}
module.exports.withoutGuides=input=>withoutMetadata(input,'guides');
module.exports.withoutBacklog=input=>withoutMetadata(input,'backlog');
