'use strict';
// NEW actual-current fixture augmentation. No baseline projection is used here:
// the production unified gate receives every required recovery feature verbatim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function augmentRecoveryFixture({directory,put},root){
 const R=require('../../scripts/build/recovery-dependencies.cjs'),manifest=JSON.parse(fs.readFileSync(path.join(root,'build/compatibility-manifest.json')));
 const read=file=>{const direct=path.join(root,file);if(fs.existsSync(direct))return fs.readFileSync(direct);const e=manifest.entries.find(e=>e.public===file);assert.ok(e?.source,'actual-current fixture input '+file);return fs.readFileSync(path.join(root,e.source));};
 // Every unconditional current gate needs its complete real asset closure, not only ESM rows.
 const requiredFiles={...R.requiredFiles,...require('../../scripts/build/target19-otfs-dependencies.cjs').requiredFiles,...require('../../scripts/build/target19-nearfield-dependencies.cjs').requiredFiles,...require('../../scripts/build/target19-bistatic-dependencies.cjs').requiredFiles};
 for(const file of Object.keys(requiredFiles))put(file,read(file));
 const target=path.join(directory,'scripts/build/module-runtime-contracts.json'),contract=JSON.parse(fs.readFileSync(target)),current=JSON.parse(fs.readFileSync(path.join(root,'scripts/build/module-runtime-contracts.json')));
 for(const file of new Set([...Object.keys(R.requiredModules),...current.modules.filter(x=>Object.hasOwn(requiredFiles,x.public)||x.public.startsWith('labs/pilot-pattern/')||x.public.startsWith('otfs-receiver/')).map(x=>x.public)])){put(file,read(file));const row=current.modules.find(x=>x.public===file);assert.ok(row);contract.modules=contract.modules.filter(x=>x.public!==file);contract.modules.push(row);}
 put('scripts/build/module-runtime-contracts.json',JSON.stringify(contract),false);
 for(const [file,attrs]of Object.entries(R.requiredMounts)){const target=path.join(directory,file);let page=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';for(const value of attrs.id||[])page+='\n<section id="'+value+'"></section>';for(const value of attrs.src||[])page+='\n<script type="module" src="'+value+'"></script>';for(const value of attrs.href||[])page+=value.endsWith('.css')?'\n<link rel="stylesheet" href="'+value+'">':'\n<a href="'+value+'">Recovery evidence</a>';put(file,page);}
 // These three gate-owned parent mounts are synthetic fixture markup only.
 // Preserve all earlier fixture anchors; nested documents/runtime/evidence above stay exact.
 for(const [file,mount]of Object.entries({
  'otfs-receiver.html':'<section id="joint-source-objective"><iframe src="otfs-receiver/source-objective-v1/index.html"></iframe></section>',
  'near-field.html':'<!-- NFR:LEGACY-PREREQUISITE:START --><section id="research-experiment"></section><script type="module" src="labs/near-field/research/entry.mjs"></script>',
  'network-clock.html':'<section id="bistatic-core"></section><script src="bistatic-ui.js"></script><link rel="stylesheet" href="bistatic.css">'
 })){const target=path.join(directory,file),page=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';put(file,page+'\n'+mount);}
};
