'use strict';
// NEW, test-only bridge to the actual published ba68 baseline. No production
// module imports this helper. Historical expected hashes and fixtures stay intact.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const delta=require('./recovery-published-baseline-projection.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let currentClosureChecked=false;
const matches=(b,r)=>b.length===r.bytes&&sha(b)===r.sha256;
function rowFor(file,rows=delta.files){const exact=rows.filter(r=>r.path===file);const found=exact.length?exact:rows.filter(r=>r.compatibility===file);assert.ok(found.length<=1,'unique NEW published-baseline projection '+file);return found[0];}
function projectFile(file,input,rows=delta.files){if(!currentClosureChecked){assertCurrentClosure();currentClosureChecked=true;}const bytes=Buffer.from(input),r=rowFor(file,rows);if(!r)return bytes;assert.ok(matches(bytes,r.after),'exact NEW current projection endpoint '+file);const before=Buffer.from(r.beforeBase64,'base64');assert.ok(matches(before,r.before),'exact actual published baseline endpoint '+file);return before;}
// The preserved chain also handles older, independently hash-guarded endpoints.
// Only this known current endpoint is projected; no unknown bytes are repaired.
function forHistoricalChain(file,input){const bytes=Buffer.from(input),r=rowFor(file);return r&&matches(bytes,r.after)?projectFile(file,bytes):bytes;}
const projectJSON=(file,input)=>JSON.parse(projectFile(file,Buffer.from(JSON.stringify(input,null,2)+'\n')));
const jsonForHistoricalChain=(file,input)=>JSON.parse(forHistoricalChain(file,Buffer.from(JSON.stringify(input,null,2)+'\n')));
function assertCurrentClosure(root=path.resolve(__dirname,'../..')){const manifestPath=path.join(root,'build/compatibility-manifest.json');const m=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)):{entries:[]},read=file=>{const direct=path.join(root,file);if(fs.existsSync(direct))return fs.readFileSync(direct);const e=(m.entries.length?m.entries:delta.currentPublicMappings).find(e=>e.public===file);assert.ok(e?.source,'current mapped recovery input '+file);const mapped=m.entries.length?e.source:e.compatibility;return fs.readFileSync(path.join(root,mapped));};const R=require('../../scripts/build/recovery-dependencies.cjs');return R.recoveryDependencies({identities:Object.keys(R.requiredFiles).map(file=>({file,sha256:sha(read(file))})),modules:Object.keys(R.requiredModules).map(file=>({file,source:read(file).toString()})),contract:JSON.parse(fs.readFileSync(path.join(root,'scripts/build/module-runtime-contracts.json'))),pages:Object.keys(R.requiredMounts).map(file=>({file,source:read(file).toString()}))});}
module.exports={delta,sha,matches,rowFor,projectFile,forHistoricalChain,projectJSON,jsonForHistoricalChain,assertCurrentClosure};
