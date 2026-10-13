'use strict';
// Each layer reverses only its exact named additions. No historical hash is reset.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function withoutMultitargetFile(file,bytes){
 const rec=require('./nearfield-multitarget-legacy-hooks.json').files.find(x=>x.path===file||x.compatibility===file);
 if(!rec)return bytes;
 a.equal(bytes.length,rec.after.bytes,'exact multi-target adapter size '+file);
 a.equal(sha(bytes),rec.after.sha256,'exact multi-target adapter identity '+file);
 let value=Buffer.from(bytes);
 for(const ch of [...rec.changes].reverse()){
  const before=Buffer.from(ch.beforeBase64,'base64'),after=Buffer.from(ch.afterBase64,'base64');
  a.deepEqual(value.subarray(ch.offsetAfter,ch.offsetAfter+after.length),after);
  value=Buffer.concat([value.subarray(0,ch.offsetAfter),before,value.subarray(ch.offsetAfter+after.length)]);
 }
 a.equal(value.length,rec.before.bytes);a.equal(sha(value),rec.before.sha256);return value;
}
function withoutMultitargetModuleParser(source){
 if(!source.includes('const multitargetPublicFiles='))return source;
 const d=require('./nearfield-multitarget-runtime-delta.json');
 for(const ch of [...d.moduleParserChanges].reverse()){a.equal(source.split(ch.after).length,2,'one exact multi-target parser addition');source=source.replace(ch.after,ch.before);}
 return source;
}
function withoutMultitargetModuleContracts(input){
 const out=structuredClone(input),d=require('./nearfield-multitarget-runtime-delta.json');
 if(!out.modules.some(x=>x.public.startsWith('labs/nearfield-multitarget/')))return out;
 a.deepEqual(out.modules.slice(d.priorModuleProfileCount),d.moduleProfiles,'exact multi-target appended module profiles');out.modules.splice(d.priorModuleProfileCount);return out;
}
function withoutMultitargetMappings(input){
 const out=structuredClone(input),d=require('../../build/nearfield-multitarget-mappings.json');
 for(const [key,records,identity]of [['entries',d.addedEntries,'source'],['owners',d.addedOwners,'id']])for(const rec of records){const indices=out[key].flatMap((x,i)=>x[identity]===rec[identity]?[i]:[]);a.equal(indices.length,1,'one exact multi-target '+identity);a.deepEqual(out[key][indices[0]],rec);out[key].splice(indices[0],1);}return out;
}
module.exports={withoutMultitargetFile,withoutMultitargetModuleParser,withoutMultitargetModuleContracts,withoutMultitargetMappings};

function priorMappingSource(input){const text=JSON.stringify(withoutMultitargetMappings(input),null,2)+'\n',literal='Finite-alphabet capacity–distortion optimizer and its teaching interface';a.equal(text.split(literal).length,2);return text.replace(literal,'Finite-alphabet capacity\\u2013distortion optimizer and its teaching interface');}
module.exports.priorMappingSource=priorMappingSource;
