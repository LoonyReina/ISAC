'use strict';
// Historical provenance only; never imported by runtime, dependency, or current UI gates.
// Exact file identities and explicit metadata paths replace no historical hashes.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const delta=require('./two-section-navigation-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function reverseFile(file,bytes,rows=delta.files){
 bytes=require('./cooperative-clusters-integration-preservation.cjs').withoutFile(file,bytes);
 const found=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(found.length<=1,'unique two-section navigation file');if(!found.length)return bytes;
 const row=found[0];if(identity(bytes,row.before)||(row.historicalIntermediates||[]).some(r=>identity(bytes,r)))return bytes;
 a.ok(identity(bytes,row.after),'exact reviewed two-section navigation current bytes '+file);
 let prior=Buffer.from(bytes);
 for(const change of [...row.changes].reverse()){
  const before=Buffer.from(change.beforeBase64,'base64'),after=Buffer.from(change.afterBase64,'base64'),at=change.offsetAfter;
  a.ok(Number.isInteger(at)&&at>=0&&at+after.length<=prior.length,'bounded exact navigation edit');
  a.deepEqual(prior.subarray(at,at+after.length),after,'exact navigation edit bytes');
  prior=Buffer.concat([prior.subarray(0,at),before,prior.subarray(at+after.length)]);
 }
 a.ok(identity(prior,row.before),'exact pre-two-section navigation bytes '+file);return prior;
}
function withoutRegistry(input,changes=delta.registryChanges){
 const out=require('./cooperative-clusters-integration-preservation.cjs').withoutRegistry(input),keys=changes.map(c=>JSON.stringify(c.path));a.equal(new Set(keys).size,keys.length,'unique navigation metadata paths');
 // Earlier checkpoints legitimately have fewer pages. A partial current redesign is not earlier history.
 const stageChange=changes.find(c=>JSON.stringify(c.path)==='["stages"]');a.ok(stageChange,'explicit stage delta');
 if(!Object.hasOwn(out,'lessonPlacement')&&JSON.stringify(out.stages)===JSON.stringify(stageChange.before))return out;
 for(const c of [...changes].reverse()){
  let parent=out;for(const k of c.path.slice(0,-1)){a.ok(parent&&Object.hasOwn(parent,k),'navigation metadata parent '+c.path.join('.'));parent=parent[k];}
  const key=c.path.at(-1);a.ok(Object.hasOwn(parent,key),'navigation metadata field '+c.path.join('.'));a.deepEqual(parent[key],c.after,'exact navigation metadata '+c.path.join('.'));
  if(c.added)delete parent[key];else parent[key]=structuredClone(c.before);
 }
 return out;
}
const withoutFile=(file,bytes)=>['content/data/registry.json','site/registry.json'].includes(file)?Buffer.from(JSON.stringify(withoutRegistry(JSON.parse(bytes)),null,2)+'\n'):reverseFile(file,bytes);
module.exports={delta,sha,identity,reverseFile,withoutFile,withoutRegistry};
function withoutMappings(input){
 const out=require('./cooperative-clusters-integration-preservation.cjs').withoutMappings(input),rows=delta.addedMappings||[];
 if(!rows.some(row=>out.entries.some(e=>e.source===row.source)))return out;
 for(const row of rows){const indices=out.entries.flatMap((e,i)=>e.source===row.source?[i]:[]);a.equal(indices.length,1,'one exact two-section mapping');a.deepEqual(out.entries[indices[0]],row,'exact two-section mapping');out.entries.splice(indices[0],1);}
 a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.priorManifestSha256,'exact frozen pre-two-section manifest');return out;
}
module.exports.withoutMappings=withoutMappings;
