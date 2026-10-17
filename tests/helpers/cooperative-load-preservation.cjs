'use strict';
// Exact newest historical layer only. Production gates never import this file.
const a=require('node:assert/strict'),crypto=require('node:crypto'),delta=require('./cooperative-load-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(b,x)=>b.length===x.bytes&&sha(b)===x.sha256;
function withoutFile(file,bytes){
 bytes=require('./cooperative-rate-preservation.cjs').withoutFile(file,bytes);
 const exact=delta.files.filter(x=>x.path===file),rows=exact.length?exact:delta.files.filter(x=>x.compatibility===file);a.ok(rows.length<=1,'one load historical endpoint');if(!rows.length)return bytes;
 const row=rows[0];if([row.before,...row.historicalIntermediates||[]].some(x=>identity(bytes,x)))return bytes;
 a.ok(identity(bytes,row.after),'exact load current endpoint '+file);let out=Buffer.from(bytes);
 for(const c of [...row.changes].reverse()){const before=Buffer.from(c.beforeBase64,'base64'),after=Buffer.from(c.afterBase64,'base64');a.deepEqual(out.subarray(c.offsetAfter,c.offsetAfter+after.length),after,'exact load edit');out=Buffer.concat([out.subarray(0,c.offsetAfter),before,out.subarray(c.offsetAfter+after.length)]);}
 a.ok(identity(out,row.before),'exact load prior endpoint');return out;
}
function withoutMappings(input){const out=require('./cooperative-rate-preservation.cjs').withoutMappings(input);if(!delta.addedEntries.some(e=>out.entries.some(x=>x.source===e.source)))return out;for(const row of delta.addedEntries){const at=out.entries.flatMap((e,i)=>e.source===row.source?[i]:[]);a.equal(at.length,1);a.deepEqual(out.entries[at[0]],row);out.entries.splice(at[0],1);}a.equal(sha(JSON.stringify(out,null,2)+'\n'),delta.priorManifestSha256);return out;}
function withoutContracts(input){const out=require('./cooperative-rate-preservation.cjs').withoutContracts(input),rows=delta.addedModuleProfiles;if(!rows.some(r=>out.modules.some(x=>x.public===r.public)))return out;a.equal(out.modules.length,delta.priorModuleCount+rows.length);a.deepEqual(out.modules.slice(delta.priorModuleCount),rows);out.modules.splice(delta.priorModuleCount);return out;}
function withoutRegistry(input){const out=require('./cooperative-rate-preservation.cjs').withoutRegistry(input),row=delta.registryAddition,items=out.lessonPlacement;if(!Object.hasOwn(out,'lessonPlacement'))return out;a.ok(Array.isArray(items),'load lesson placement array');const at=items.flatMap((x,i)=>x.canonicalHref===row.value.canonicalHref?[i]:[]);if(!at.length)return out;a.equal(at.length,1);a.equal(items.length,row.priorLength+1);a.equal(at[0],row.priorLength);a.deepEqual(items[at[0]],row.value);items.splice(at[0],1);return out;}
module.exports={delta,sha,identity,withoutFile,withoutMappings,withoutContracts,withoutRegistry};
