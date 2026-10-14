'use strict';
// Exact historical view only. Active build/runtime execution never consumes this inverse.
// Every prior assertion and frozen digest remains unchanged. No prefix/path exemption.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const delta=require('./ofdm-false-alarm-integration-delta.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const identity=(bytes,row)=>bytes.length===row.bytes&&sha(bytes)===row.sha256;
function withoutFile(file,bytes){
 const rows=delta.files.filter(row=>row.path===file||row.compatibility===file);a.ok(rows.length<=1,'one OFDM exact file inverse');
 if(!rows.length)return bytes;
 const row=rows[0];if(identity(bytes,row.before)||(row.historicalIntermediates||[]).some(prior=>identity(bytes,prior)))return bytes;
 a.ok(identity(bytes,row.after),'exact OFDM current source '+file);
 const prior=Buffer.from(row.beforeBase64,'base64');a.ok(identity(prior,row.before),'exact pre-OFDM source '+file);return prior;
}
function withoutMappings(input){
 const out=structuredClone(input);
 if(!out.entries.some(row=>row.source==='tests/helpers/ofdm-false-alarm-integration-preservation.cjs'))return out;
 for(const row of delta.addedEntries){
  const indices=out.entries.flatMap((entry,i)=>entry.source===row.source?[i]:[]);
  a.equal(indices.length,1,'one exact OFDM addition '+row.source);a.deepEqual(out.entries[indices[0]],row,'exact OFDM mapping ownership');out.entries.splice(indices[0],1);
 }
 a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.baselineManifestSha256,'exact pre-OFDM cumulative manifest');return out;
}
function withoutContracts(input){
 const out=structuredClone(input);
 if(!out.scripts.some(row=>delta.addedClassicProfiles.some(added=>added.public===row.public)))return out;
 a.equal(out.scripts.length,delta.priorClassicCount+delta.addedClassicProfiles.length,'complete OFDM classic profile inventory');
 a.deepEqual(out.scripts.slice(delta.priorClassicCount),delta.addedClassicProfiles,'exact OFDM classic profiles and endpoints');out.scripts.splice(delta.priorClassicCount);return out;
}
module.exports={delta,sha,identity,withoutFile,withoutMappings,withoutContracts};

// Preserve unrelated suffix text for the older parser inverse's explicit contract.
// Changed prefixes, reordered additions, and partial OFDM edits still fail closed.
function withoutClassicParser(source){
 const row=delta.files.find(r=>r.path==='scripts/build/classic-dependencies.cjs');
 const before=Buffer.from(row.beforeBase64,'base64').toString();
 if(source.startsWith(before))return source;
 const bytes=Buffer.from(source),prefix=bytes.subarray(0,row.after.bytes);
 a.ok(identity(prefix,row.after),'exact OFDM parser prefix');
 return before+bytes.subarray(row.after.bytes).toString();
}
function withoutPageAddition(source){
 const addition=delta.pageAddition;
 a.equal(source.split(addition).length,2,'one exact OFDM false-alarm continuation section');
 return source.replace(addition,'');
}
Object.assign(module.exports,{withoutClassicParser,withoutPageAddition});
