"use strict";
// Newest exact leaf layer; accepted CSS and all earlier frozen endpoints remain separate.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const delta=require('./perceptive-bsbl-responsive-integration-delta.json'),R=require('./perceptive-bsbl-responsive-preservation.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function reverseFile(file,bytes,rows){const found=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(found.length<=1,'unique responsive integration path');if(!found.length)return bytes;const r=found[0];a.equal(bytes.length,r.after.bytes,'exact responsive integration current size '+file);a.equal(sha(bytes),r.after.sha256,'exact responsive integration current identity '+file);const prior=Buffer.from(r.beforeBase64,'base64');a.equal(prior.length,r.before.bytes);a.equal(sha(prior),r.before.sha256);return prior;}
const withoutFile=(file,bytes)=>file===R.correction.path?R.withoutCSS(file,bytes):reverseFile(file,bytes,delta.integrationFiles);
function maybeWithoutFile(file,bytes){const r=file===R.correction.path?R.correction:delta.integrationFiles.find(x=>x.path===file||x.compatibility===file);if(r&&bytes.length===r.before.bytes&&sha(bytes)===r.before.sha256)return bytes;return withoutFile(file,bytes);}
function withoutMappings(input){const out=structuredClone(input);for(const row of delta.addedEntries){const ii=out.entries.flatMap((x,i)=>x.source===row.source?[i]:[]);a.equal(ii.length,1,'one exact responsive mapping');a.deepEqual(out.entries[ii[0]],row);out.entries.splice(ii[0],1);}a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.priorManifestSha256,'exact pre-responsive pilot manifest');return out;}
const maybeWithoutMappings=input=>input.entries.some(x=>x.source==='tests/helpers/perceptive-bsbl-responsive-integration-preservation.cjs')?withoutMappings(input):structuredClone(input);
function withPublicFiles(input){const out=structuredClone(input),ii=out.flatMap((r,i)=>r[0]===R.correction.path?[i]:[]);a.equal(ii.length,1,'one exact CSS public identity');a.deepEqual(out[ii[0]],[R.correction.path,R.correction.before.sha256]);out[ii[0]]=[R.correction.path,R.correction.after.sha256];return out;}
module.exports={delta,sha,reverseFile,withoutFile,maybeWithoutFile,withoutMappings,maybeWithoutMappings,withPublicFiles};
