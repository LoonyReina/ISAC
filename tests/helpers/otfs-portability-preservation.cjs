'use strict';
// Outermost, data-only exact inverse. Historical layers and scientific bytes stay frozen.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const Q=require('./otfs-diagnostics-preservation.cjs');
const delta=require('./otfs-portability-integration-delta.json'),mapping=require('../../build/otfs-portability-mappings.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function reverseFile(file,bytes,rows){const matches=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(matches.length<=1,'unique OTFS portability inverse path');if(!matches.length)return bytes;const r=matches[0];a.equal(bytes.length,r.after.bytes,'exact OTFS portability current size '+file);a.equal(sha(bytes),r.after.sha256,'exact OTFS portability current identity '+file);const prior=Buffer.from(r.beforeBase64,'base64');a.equal(prior.length,r.before.bytes,'exact OTFS portability prior size');a.equal(sha(prior),r.before.sha256,'exact OTFS portability prior identity');return prior;}
const withoutFile=(file,bytes)=>reverseFile(file,Q.maybeWithoutFile(file,bytes),delta.changedFiles);
function maybeWithoutFile(file,bytes){const rows=delta.changedFiles.filter(r=>r.path===file||r.compatibility===file);a.ok(rows.length<=1,'unique OTFS portability optional inverse path');if(rows.length&&bytes.length===rows[0].before.bytes&&sha(bytes)===rows[0].before.sha256)return bytes;return withoutFile(file,bytes);}
function withoutMappings(input){const out=Q.maybeWithoutMappings(input);for(const row of mapping.addedEntries){const ii=out.entries.flatMap((r,i)=>r.source===row.source?[i]:[]);a.equal(ii.length,1,'one exact OTFS portability mapping');a.deepEqual(out.entries[ii[0]],row,'exact OTFS portability mapping fields');out.entries.splice(ii[0],1);}a.equal(sha(JSON.stringify(out,null,2)+'\n'),mapping.baselineManifestSha256,'exact accepted pre-portability manifest');return out;}
const maybeWithoutMappings=input=>input.entries.some(r=>r.source==='build/otfs-portability-mappings.json')?withoutMappings(input):structuredClone(input);
module.exports={sha,delta,mapping,reverseFile,withoutFile,maybeWithoutFile,withoutMappings,maybeWithoutMappings};
