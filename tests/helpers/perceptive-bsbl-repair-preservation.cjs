'use strict';
// Separate exact L01/L02 layer; original functional and integration freezes stay immutable.
const a=require('node:assert/strict'),crypto=require('node:crypto'),delta=require('./perceptive-bsbl-repair-delta.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function reverseFile(file,bytes,rows){const matches=rows.filter(x=>x.path===file);a.ok(matches.length<=1,'unique Perceptive repair inverse');if(!matches.length)return bytes;const r=matches[0];a.equal(bytes.length,r.after.bytes,'exact Perceptive repair current size');a.equal(sha(bytes),r.after.sha256,'exact Perceptive repair current identity');const prior=Buffer.from(r.beforeBase64,'base64');a.equal(prior.length,r.before.bytes);a.equal(sha(prior),r.before.sha256);return prior;}
const withoutFunctional=(f,b)=>reverseFile(f,b,delta.functionalFiles),withoutIntegration=(f,b)=>reverseFile(f,b,delta.integrationFiles);
function replaceProfile(input,from,to){const out=structuredClone(input),ii=out.flatMap((x,i)=>x.public===from.public?[i]:[]);a.equal(ii.length,1,'one repaired Perceptive lesson profile');a.deepEqual(out[ii[0]],from,'exact complete Perceptive repair profile');out[ii[0]]=structuredClone(to);return out;}
const withProfiles=p=>replaceProfile(p,delta.profile.before,delta.profile.after);
function withoutContracts(c){const out=structuredClone(c);if(!out.modules.some(x=>x.public===delta.profile.after.public))return out;out.modules=replaceProfile(out.modules,delta.profile.after,delta.profile.before);return out;}
function withPublicFiles(input){const out=structuredClone(input),r=delta.functionalFiles[0],ii=out.flatMap((x,i)=>x[0]===r.path?[i]:[]);a.equal(ii.length,1);a.deepEqual(out[ii[0]],[r.path,r.before.sha256]);out[ii[0]]=[r.path,r.after.sha256];for(const row of delta.addedPublicFiles){a.ok(!out.some(x=>x[0]===row[0]));out.push(structuredClone(row));}return out;}
function withoutMappings(input){const out=structuredClone(input);for(const entry of delta.addedEntries){const ii=out.entries.flatMap((x,i)=>x.source===entry.source?[i]:[]);a.equal(ii.length,1,'one repair mapping');a.deepEqual(out.entries[ii[0]],entry,'exact repair mapping');out.entries.splice(ii[0],1);}return out;}
function withRootGates(input){const out=structuredClone(input),r=delta.ownedRoot;a.deepEqual(out[r.file],r.before,'original exact owned root suite');out[r.file]=structuredClone(r.after);return out;}
module.exports={delta,sha,reverseFile,withoutFunctional,withoutIntegration,withProfiles,withoutContracts,withPublicFiles,withoutMappings,withRootGates};

function withoutTextSuffix(s,key){const suffix=delta.textSuffixes[key];if(!suffix||!s.includes(suffix))return s;a.equal(s.split(suffix).length,2);a.ok(s.endsWith(suffix));return s.slice(0,-suffix.length);}
module.exports.withoutTextSuffix=withoutTextSuffix;
