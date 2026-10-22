'use strict';
// Visibility-only historical read adapter. Never imported by live runtime or scientific gates.
const a=require('node:assert/strict'),crypto=require('node:crypto'),delta=require('./accepted-publication-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function reverseFile(file,bytes,rows=delta.files){const found=rows.filter(r=>r.path===file);a.ok(found.length<=1,'unique publication inverse');if(!found.length)return bytes;const row=found[0];a.ok(identity(bytes,row.after),'exact publication current '+file);const prior=Buffer.from(row.beforeBase64,'base64');a.ok(identity(prior,row.before),'exact publication prior '+file);return prior;}
function forHistoricalChain(file,input){input=require('./reset-ui-preservation.cjs').forHistoricalChain(file,input);const bytes=Buffer.from(input),row=delta.files.find(r=>r.path===file);return row&&identity(bytes,row.after)?reverseFile(file,bytes):bytes;}
module.exports={delta,sha,identity,reverseFile,forHistoricalChain};
