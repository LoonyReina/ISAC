'use strict';
// Exact inverses for this integration only. Frozen earlier layers are never rebased.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function reverseFile(file,bytes,records){const matches=records.filter(x=>x.path===file||x.compatibility===file);a.ok(matches.length<=1,'unique sensing-assisted OTFS inverse path');if(!matches.length)return bytes;const r=matches[0];a.equal(bytes.length,r.after.bytes,'exact sensing-assisted OTFS current size '+file);a.equal(sha(bytes),r.after.sha256,'exact sensing-assisted OTFS current identity '+file);const prior=Buffer.from(r.beforeBase64,'base64');a.equal(prior.length,r.before.bytes);a.equal(sha(prior),r.before.sha256);return prior;}
const withoutRuntimeFile=(file,bytes)=>reverseFile(file,bytes,require('./sensing-assisted-otfs-runtime-delta.json').files);
const withoutLegacyFile=(file,bytes)=>reverseFile(file,bytes,require('./sensing-assisted-otfs-legacy-hooks.json').files);
function withoutModuleParser(s){return s.includes('const sensingOtfsPublicFiles=')?withoutRuntimeFile('scripts/build/module-dependencies.cjs',Buffer.from(s)).toString():s;}
function withoutBuilder(s){return s.includes('moduleDependencies,isModuleFile')?withoutRuntimeFile('scripts/build/compatibility.cjs',Buffer.from(s)).toString():s;}
function withoutContracts(c){const d=require('./sensing-assisted-otfs-runtime-delta.json'),out=structuredClone(c);if(!out.modules.some(x=>x.public.startsWith('labs/otfs-sensing-assisted/')))return out;a.deepEqual(out.modules.slice(d.priorModuleProfileCount),d.moduleProfiles,'exact appended sensing-assisted OTFS profiles');out.modules.splice(d.priorModuleProfileCount);return out;}
function withoutMappings(m){const out=structuredClone(m),d=require('../../build/sensing-assisted-otfs-mappings.json');for(const[key,records,id]of [['entries',d.addedEntries,'source'],['owners',d.addedOwners,'id']])for(const r of records){const ii=out[key].flatMap((x,i)=>x[id]===r[id]?[i]:[]);a.equal(ii.length,1,'one exact sensing-assisted OTFS mapping');a.deepEqual(out[key][ii[0]],r);out[key].splice(ii[0],1);}return out;}
function withoutFile(file,bytes){if(file==='scripts/build/module-runtime-contracts.json')return Buffer.from(JSON.stringify(withoutContracts(JSON.parse(bytes)),null,2)+'\n');return withoutLegacyFile(file,withoutRuntimeFile(file,bytes));}
module.exports={sha,reverseFile,withoutRuntimeFile,withoutLegacyFile,withoutModuleParser,withoutBuilder,withoutContracts,withoutMappings,withoutFile};

function priorMappingSource(m){const text=JSON.stringify(withoutMappings(m),null,2)+'\n',literal='Finite-alphabet capacity–distortion optimizer and its teaching interface';a.equal(text.split(literal).length,2);return text.replace(literal,'Finite-alphabet capacity\\u2013distortion optimizer and its teaching interface');}
module.exports.priorMappingSource=priorMappingSource;
module.exports.basePageNormalizedSha256='74237ab3fdee755afdd63cb0843b7985dafc5b76cce35ed0c0dc8e89ad27f942';
const repairLayers=require('./sensing-assisted-otfs-functional-repairs.json');
function normalizePage(s){return ['HEADER','CONTEXT','NEXT'].reduce((v,k)=>v.replace(new RegExp('<!-- SITE:'+k+':START -->[\\s\\S]*?<!-- SITE:'+k+':END -->'),'<!-- SITE:'+k+' -->'),s).replace(/\n$/,'');}
function withoutRepairLayer(file,bytes,version){const layer=repairLayers.layers.find(x=>x.version===version);a.ok(layer,'known versioned repair');const rec=layer.files.find(x=>x.path===file);if(!rec)return bytes;if(rec.afterNormalizedSha256){a.equal(sha(normalizePage(bytes.toString())),rec.afterNormalizedSha256,'exact repaired handwritten body');const prior=Buffer.from(rec.beforeBase64,'base64');a.equal(sha(prior),rec.before.sha256);a.equal(sha(normalizePage(prior.toString())),rec.beforeNormalizedSha256);return prior;}return reverseFile(file,bytes,layer.files);}
const withoutOracleCliRepair=(file,bytes)=>reverseFile(file,bytes,require('./sensing-assisted-otfs-oracle-cli-repair.json').files);
const withoutFunctionalRepairs=(file,bytes)=>withoutRepairLayer(file,withoutRepairLayer(file,withoutOracleCliRepair(file,bytes),'v2.1'),'v2');
Object.assign(module.exports,{repairLayers,normalizePage,withoutRepairLayer,withoutFunctionalRepairs,withoutOracleCliRepair});
