'use strict';
// Read-boundary provenance only: runtime scanners and current tests use current sources.
const a=require('node:assert/strict'),crypto=require('node:crypto'),delta=require('./waveform-cmc-integration-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function withoutFile(file,bytes){
 bytes=require('./crb-receiver-integration-preservation.cjs').withoutFile(file,bytes);
 const rows=delta.files.filter(r=>r.path===file||r.compatibility===file);a.ok(rows.length<=1,'one exact CMC file inverse');
 if(!rows.length)return bytes;
 const r=rows[0];if(identity(bytes,r.before)||(r.historicalIntermediates||[]).some(x=>identity(bytes,x)))return bytes;
 a.ok(identity(bytes,r.after),'exact CMC current source '+file);
 const before=Buffer.from(r.beforeBase64,'base64');a.ok(identity(before,r.before),'exact pre-CMC source '+file);return before;
}
function withoutMappings(input){
 const out=require('./crb-receiver-integration-preservation.cjs').withoutMappings(input);
 if(!out.entries.some(e=>delta.addedEntries.some(r=>r.source===e.source)))return out;
 for(const row of delta.addedEntries){const ii=out.entries.flatMap((e,i)=>e.source===row.source?[i]:[]);a.equal(ii.length,1,'one exact CMC mapping '+row.source);a.deepEqual(out.entries[ii[0]],row,'exact CMC mapping ownership');out.entries.splice(ii[0],1);}
 a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.baselineManifestSha256,'exact pre-CMC cumulative manifest');return out;
}
function withoutContracts(input){
 const out=require('./cooperative-clusters-integration-preservation.cjs').withoutContracts(input);
 if(!out.modules.some(e=>delta.addedModuleProfiles.some(r=>r.public===e.public)))return out;
 a.equal(out.modules.length,delta.priorModuleCount+delta.addedModuleProfiles.length,'complete CMC module inventory');
 a.deepEqual(out.modules.slice(delta.priorModuleCount),delta.addedModuleProfiles,'exact appended CMC profiles');out.modules.splice(delta.priorModuleCount);return out;
}
module.exports={delta,sha,identity,withoutFile,withoutMappings,withoutContracts};
