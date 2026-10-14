'use strict';
// Exact outer integration layer. Current runtime execution never uses this provenance view.
const a=require('node:assert/strict'),crypto=require('node:crypto');
const repair=require('./dual-array-current-runtime-preservation.cjs');
const records=require('./dual-array-record-portability-preservation.cjs');
const timer=require('./dual-array-browser-timer-preservation.cjs'),display=require('./dual-array-plot-readability-preservation.cjs');
const delta=require('./dual-array-browser-integration-delta.json'),mapping=require('../../build/dual-array-browser-mappings.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=(bytes,row)=>bytes.length===row.bytes&&sha(bytes)===row.sha256;
function reverseFile(file,bytes,rows=delta.changedFiles){
 const found=rows.filter(r=>r.path===file||r.compatibility===file);a.ok(found.length<=1,'unique browser integration inverse');if(!found.length)return bytes;
 const r=found[0];a.ok(identity(bytes,r.after),'exact browser integration current identity '+file);
 const old=Buffer.from(r.beforeBase64,'base64');a.ok(identity(old,r.before),'exact browser integration prior identity '+file);return old;
}
function withoutFile(file,bytes){
 bytes=records.maybeWithoutFile(file,bytes);
 if(file===timer.correction.path||display.corrections.some(r=>r.path===file)||file==='dual-array-positioning.html'||repair.adaptedPaths.includes(file))return repair.historicalBytes(file,bytes);
 return reverseFile(file,bytes);
}
function maybeWithoutFile(file,bytes){
 const row=delta.changedFiles.find(r=>r.path===file||r.compatibility===file)||delta.leafFiles.find(r=>r.path===file||r.compatibility===file);
 if(row&&identity(bytes,row.before))return bytes;
 // Previously normalized generated pages retain their generated SITE regions.
 if((file==='content/pages/dual-array-positioning.html'||file==='dual-array-positioning.html')&&sha(display.normalizePage(bytes.toString()))===display.corrections[1].beforeNormalizedSha256)return bytes;
 return withoutFile(file,bytes);
}
function withoutMappings(input){const out=records.maybeWithoutMappings(input);for(const row of mapping.addedEntries){const ii=out.entries.flatMap((x,i)=>x.source===row.source?[i]:[]);a.equal(ii.length,1,'one browser integration mapping');a.deepEqual(out.entries[ii[0]],row);out.entries.splice(ii[0],1);}a.equal(sha(JSON.stringify(out,null,2)+'\n'),mapping.baselineManifestSha256,'exact maintenance checkpoint manifest');return out;}
const maybeWithoutMappings=input=>input.entries.some(x=>x.source==='build/dual-array-browser-mappings.json')?withoutMappings(input):structuredClone(input);
function currentDualArrayProfiles(input){const out=records.currentProfiles(input),rows=out.filter(x=>x.public===timer.correction.path);a.equal(rows.length,1);a.deepEqual(rows[0],delta.clientProfile.before,'exact original timer profile');Object.assign(rows[0],structuredClone(delta.clientProfile.after));return out;}
function maybeWithoutContracts(input){const out=records.maybeWithoutContracts(require('./waveform-cmc-integration-preservation.cjs').withoutContracts(input)),rows=out.modules.filter(x=>x.public===timer.correction.path);if(!rows.length)return out;a.equal(rows.length,1,'one browser client profile');if(rows[0].sha256===delta.clientProfile.before.sha256){a.deepEqual(rows[0],delta.clientProfile.before);return out;}a.deepEqual(rows[0],delta.clientProfile.after,'exact current timer profile and edges');Object.assign(rows[0],structuredClone(delta.clientProfile.before));return out;}
module.exports={delta,mapping,repair,timer,display,sha,identity,reverseFile,withoutFile,maybeWithoutFile,withoutMappings,maybeWithoutMappings,currentDualArrayProfiles,maybeWithoutContracts};
