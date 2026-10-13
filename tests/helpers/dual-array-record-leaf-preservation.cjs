'use strict';
// Exact provenance-only inverse. Production imports and fixture writes use current bytes.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const delta=require('./dual-array-record-leaf-delta.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const identity=(bytes,row)=>Buffer.isBuffer(bytes)&&bytes.length===row.bytes&&sha(bytes)===row.sha256;
function withoutFile(file,bytes,rows=delta.files){
 const found=rows.filter(row=>row.path===file);a.ok(found.length<=1,'unique record leaf inverse');if(!found.length)return bytes;
 const row=found[0];a.ok(identity(bytes,row.after),'exact current record leaf '+file);
 const prior=Buffer.from(row.beforeBase64,'base64');a.ok(identity(prior,row.before),'exact prior record leaf '+file);return prior;
}
function maybeWithoutFile(file,bytes){const row=delta.files.find(row=>row.path===file);return row&&identity(bytes,row.before)?bytes:withoutFile(file,bytes);}
module.exports={delta,sha,identity,withoutFile,maybeWithoutFile};
