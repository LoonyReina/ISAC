'use strict';
// Exact provenance inverse only. Never called by live runtime/dependency gates.
const a=require('node:assert/strict'),crypto=require('node:crypto'),delta=require('./crb-receiver-integration-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),identity=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function reverseFile(file,bytes,rows=delta.files){
 const found=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(found.length<=1,'one exact receiver file inverse');if(!found.length)return bytes;const row=found[0];
 if(identity(bytes,row.before)||(row.historicalIntermediates||[]).some(x=>identity(bytes,x)))return bytes;
 a.ok(identity(bytes,row.after),'exact current receiver integration file '+file);
 const prior=Buffer.from(row.beforeBase64,'base64');a.ok(identity(prior,row.before),'exact pre-receiver source '+file);return prior;
}
function withoutFile(file,bytes){return reverseFile(file,require('./two-section-navigation-preservation.cjs').withoutFile(file,bytes));}
function withoutMappings(input){
 const sources=new Set(delta.addedEntries.map(x=>x.source));
 // Validate receiver-absent input at its own historical boundary before the newer
 // navigation layer. Relocated receiver sources are not a navigation migration.
 if(!input.entries.some(x=>sources.has(x.source))){a.ok(delta.historicalManifestIdentities.some(row=>row.sha256===sha(JSON.stringify(input,null,2)+'\n')),'Unrecognized pre-receiver manifest identity');return structuredClone(input);}
 const out=require('./two-section-navigation-preservation.cjs').withoutMappings(input);
 for(const row of delta.addedEntries){const ii=out.entries.flatMap((x,i)=>x.source===row.source?[i]:[]);a.equal(ii.length,1,'one exact receiver mapping '+row.source);a.deepEqual(out.entries[ii[0]],row,'exact receiver mapping ownership');out.entries.splice(ii[0],1);}
 a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.baselineManifestSha256,'exact pre-receiver cumulative manifest');return out;
}
module.exports={delta,sha,identity,reverseFile,withoutFile,withoutMappings};
