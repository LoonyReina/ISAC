'use strict';
// Historical read boundary only. Current runtime gates inspect the current bytes.
// Every accepted predecessor and edit range is explicit; there are no wildcards.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const delta=require('./teaching-heading-maintenance-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function withoutFile(file,bytes,rows=delta.files){
 const matches=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(matches.length<=1,'one teaching-heading inverse');if(!matches.length)return bytes;
 const row=matches[0];if(identity(bytes,row.before)||(row.historicalIntermediates||[]).some(r=>identity(bytes,r)))return bytes;
 a.ok(identity(bytes,row.after),'exact teaching-heading current endpoint '+file);let prior=Buffer.from(bytes);
 for(const c of [...row.changes].reverse()){
  const before=Buffer.from(c.beforeBase64,'base64'),after=Buffer.from(c.afterBase64,'base64'),at=c.offsetAfter;
  a.ok(Number.isInteger(at)&&at>=0&&at+after.length<=prior.length,'bounded teaching-heading edit');
  a.deepEqual(prior.subarray(at,at+after.length),after,'exact teaching-heading edit bytes');
  prior=Buffer.concat([prior.subarray(0,at),before,prior.subarray(at+after.length)]);
 }
 a.ok(identity(prior,row.before),'exact teaching-heading prior endpoint '+file);return prior;
}
function withoutRegistry(input){
 const out=structuredClone(input),change=delta.registryTitle,pages=out.pages?.filter(p=>p.path===change.path)||[];a.ok(pages.length<=1,'unique cooperative page display title');
 if(pages.length){a.ok([change.before,change.after].includes(pages[0].title),'exact cooperative page display title');pages[0].title=change.before;}
 return out;
}
function withoutContracts(input){
 const out=structuredClone(input);
 for(const change of delta.moduleShaChanges){const rows=out.modules.filter(m=>m.public===change.public);a.ok(rows.length<=1,'unique cooperative presentation profile');if(rows.length){a.ok([change.before,change.after].includes(rows[0].sha256),'exact cooperative presentation profile identity');rows[0].sha256=change.before;}}
 return out;
}
function withoutMappings(input){
 const out=structuredClone(input);
 if(!delta.addedEntries.some(row=>out.entries.some(e=>e.source===row.source)))return out;
 for(const row of delta.addedEntries){const indexes=out.entries.flatMap((e,i)=>e.source===row.source?[i]:[]);a.equal(indexes.length,1,'one heading-maintenance mapping');a.deepEqual(out.entries[indexes[0]],row,'exact private heading-maintenance mapping');out.entries.splice(indexes[0],1);}
 a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.priorManifestSha256,'exact manifest before heading maintenance');return out;
}
module.exports={delta,sha,identity,withoutFile,withoutRegistry,withoutContracts,withoutMappings};
