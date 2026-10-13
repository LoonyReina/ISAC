'use strict';
// This release reverses one exact navigation repair before historical OTFS layers.
// Independent leaf helper: no imports of its consumers and no self-hashed metadata.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const delta=require('./sensing-assisted-otfs-navigation-delta.json'),integration=require('./sensing-assisted-otfs-navigation-integration-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function reverseFile(file,bytes,records){const matches=records.filter(r=>r.path===file);a.ok(matches.length<=1,'unique navigation inverse path');if(!matches.length)return bytes;const rec=matches[0];a.equal(bytes.length,rec.after.bytes,'exact navigation current size '+file);a.equal(sha(bytes),rec.after.sha256,'exact navigation current identity '+file);const prior=Buffer.from(rec.beforeBase64,'base64');a.equal(prior.length,rec.before.bytes,'exact navigation prior size');a.equal(sha(prior),rec.before.sha256,'exact navigation prior identity');return prior;}
const withoutLesson=(file,bytes)=>reverseFile(file,bytes,delta.files);
const withoutFile=(file,bytes)=>reverseFile(file,withoutLesson(file,bytes),integration.files);
function replaceProfile(input,from,to){const out=structuredClone(input),indices=out.flatMap((x,i)=>x.public===from.public?[i]:[]);a.equal(indices.length,1,'one exact navigation lesson profile');a.deepEqual(out[indices[0]],from,'exact navigation profile before inverse');out[indices[0]]=structuredClone(to);return out;}
function withoutContracts(input){const out=structuredClone(input);if(!out.modules.some(x=>x.public===integration.profile.after.public))return out;out.modules=replaceProfile(out.modules,integration.profile.after,integration.profile.before);return out;}
const withProfiles=input=>replaceProfile(input,integration.profile.before,integration.profile.after);
function withPublicFiles(input){const out=structuredClone(input),rec=delta.files[0],indices=out.flatMap((x,i)=>x[0]===rec.path?[i]:[]);a.equal(indices.length,1);a.deepEqual(out[indices[0]],[rec.path,rec.before.sha256]);out[indices[0]]=[rec.path,rec.after.sha256];return out;}
function withoutMappings(input){const out=structuredClone(input),mapping=require('../../build/sensing-assisted-otfs-navigation-mappings.json');for(const entry of mapping.addedEntries){const indices=out.entries.flatMap((x,i)=>x.source===entry.source?[i]:[]);a.equal(indices.length,1,'one exact navigation source mapping');a.deepEqual(out.entries[indices[0]],entry,'exact navigation source-stage-public mapping');out.entries.splice(indices[0],1);}return out;}
module.exports={sha,delta,integration,reverseFile,withoutLesson,withoutFile,withoutContracts,withProfiles,withPublicFiles,withoutMappings};

function priorMappingSource(input){const text=JSON.stringify(withoutMappings(input),null,2)+'\n',literal='Finite-alphabet capacity–distortion optimizer and its teaching interface';a.equal(text.split(literal).length,2);return text.replace(literal,'Finite-alphabet capacity\\u2013distortion optimizer and its teaching interface');}
module.exports.priorMappingSource=priorMappingSource;

module.exports.withoutRuntimeFile=(file,bytes)=>reverseFile(file,bytes,integration.files.filter(x=>x.path.startsWith('scripts/')));
module.exports.withoutLegacyFile=(file,bytes)=>reverseFile(file,bytes,integration.files.filter(x=>x.path.startsWith('tests/')));
