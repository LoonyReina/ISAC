'use strict';
// Separate exact maintenance inverse: historic assertions never substitute old runtime execution.
const a=require('node:assert/strict'),leaf=require('./dual-array-record-leaf-preservation.cjs');
const delta=require('./dual-array-record-portability-delta.json'),mapping=require('../../build/dual-array-record-portability-mappings.json');
const {sha,identity}=leaf;
function withoutFile(file,bytes,rows=delta.changedFiles){
 if(leaf.delta.files.some(row=>row.path===file))return leaf.withoutFile(file,bytes);
 const found=rows.filter(row=>row.path===file||row.compatibility===file);a.ok(found.length<=1,'unique record portability inverse');if(!found.length)return bytes;
 const row=found[0];a.ok(identity(bytes,row.after),'exact current record portability source '+file);
 const prior=Buffer.from(row.beforeBase64,'base64');a.ok(identity(prior,row.before),'exact prior record portability source '+file);return prior;
}
function maybeWithoutFile(file,bytes){const row=[...delta.changedFiles,...leaf.delta.files].find(row=>row.path===file||row.compatibility===file);return row&&identity(bytes,row.before)?bytes:withoutFile(file,bytes);}
function withoutMappings(input){const out=structuredClone(input);for(const row of mapping.addedEntries){const ii=out.entries.flatMap((x,i)=>x.source===row.source?[i]:[]);a.equal(ii.length,1,'one record portability mapping');a.deepEqual(out.entries[ii[0]],row,'exact record portability mapping');out.entries.splice(ii[0],1);}a.equal(sha(JSON.stringify(out,null,2)+'\n'),mapping.baselineManifestSha256,'exact pre-record portability manifest');return out;}
const maybeWithoutMappings=input=>input.entries.some(row=>row.source==='build/dual-array-record-portability-mappings.json')?withoutMappings(input):structuredClone(input);
function currentProfiles(input){const out=structuredClone(input),rows=out.filter(row=>row.public===delta.profile.before.public);a.equal(rows.length,1,'one original records profile');a.deepEqual(rows[0],delta.profile.before,'exact original records profile');Object.assign(rows[0],structuredClone(delta.profile.after));return out;}
function maybeWithoutContracts(input){const out=structuredClone(input),rows=out.modules.filter(row=>row.public===delta.profile.before.public);if(!rows.length)return out;a.equal(rows.length,1,'one current records profile');if(rows[0].sha256===delta.profile.before.sha256)a.deepEqual(rows[0],delta.profile.before);else{a.deepEqual(rows[0],delta.profile.after,'exact current records profile and edges');Object.assign(rows[0],structuredClone(delta.profile.before));}return out;}
module.exports={leaf,delta,mapping,sha,identity,withoutFile,maybeWithoutFile,withoutMappings,maybeWithoutMappings,currentProfiles,maybeWithoutContracts};
