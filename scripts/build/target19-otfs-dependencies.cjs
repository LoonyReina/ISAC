'use strict';
const crypto=require('node:crypto');
const requiredFiles={
  "otfs-receiver/source-objective-v1/index.html": "64f01f7d62e24293d8765714e81d4a77ab353fcb446c667ab636f987318cf537",
  "otfs-receiver/source-objective-v1/runtime/joint/joint-core.mjs": "e77c420cbe2ad3cd2623a9adfc9af36bbe585d50d8683ef4371248ab0d52328a",
  "otfs-receiver/source-objective-v1/runtime/joint/scenes.json": "1e775936672afa6b64645ac3513c4043fbf9d85b3c9c166f4ad532fd380d0586",
  "otfs-receiver/source-objective-v1/runtime/joint/simulation.mjs": "9fa29d9c8eeb4bf9af2df9a17b81a612fab17f474afd4ebb48533d13ae9d49f0",
  "otfs-receiver/source-objective-v1/runtime/joint/waveform.json": "5e14fc4463d819597d4e5a6c1341e8a30d0e9ed2147b4ed6c1469cf20d345a89",
  "otfs-receiver/source-objective-v1/runtime/printed-variant.mjs": "e0a009d84359d3b88ba5d158d53191cae31f38d2115a399dccca95a4a96e2393",
  "otfs-receiver/source-objective-v1/runtime/source-objective.mjs": "a4d06b7c14eb7bbc75ec0649d037f51d23981a5e2f93ea05d734abc0363a817b",
  "otfs-receiver/source-objective-v1/runtime/statistics/otfs-core.mjs": "20c887dec06148dc7b031b15d2c2aba64ba10776c523a6d28367e005e82fabe2",
  "otfs-receiver/source-objective-v1/runtime/ui.mjs": "58fbabe54930e9dc90b44ebca023b02f0d7e8e9cf3c4f9823114979cb53bad0b",
  "otfs-receiver/source-objective-v1/runtime/worker.mjs": "1133d5ded43d4a1ae54ea593f2e83ecee6be5352af20d21e0be03002e6d9b668",
  "otfs-receiver/source-objective-v1/results/independent-check.json": "3311e45c6f761022d65a6175782d715ad5faf51ad5567283f9066f47a10802c4",
  "otfs-receiver/source-objective-v1/results/new-study-30.json": "78cbdaedd870496c165ffdf9ea8f6edeaf88657f622d3ce7b9aa6d992dc53470"
};
// Exact feedback presentation revision; scientific files and historical constants stay frozen.
for(const [file,prior,next] of [["otfs-receiver/source-objective-v1/index.html","64f01f7d62e24293d8765714e81d4a77ab353fcb446c667ab636f987318cf537","346711a8d917df10ef587efd070860b3338fb984b898f7822c4f0e89da7ae861"],["otfs-receiver/source-objective-v1/runtime/ui.mjs","58fbabe54930e9dc90b44ebca023b02f0d7e8e9cf3c4f9823114979cb53bad0b","078067117f0a0583507d070a2843bfade34e07f82cc941af28491b908c3cd81f"]]){
 if(requiredFiles[file]!==prior)throw Error("Unexpected pre-feedback target19 identity: "+file);requiredFiles[file]=next;
}
function target19OtfsDependencies({identities,pages}){
 const files=new Map(identities.map(e=>[e.file,e.sha256])), docs=new Map(pages.map(e=>[e.file,e.source]));
 const fail=m=>{throw Error('Target19 OTFS boundary: '+m);};
 for(const [file,hash] of Object.entries(requiredFiles))if(files.get(file)!==hash)fail('missing/changed '+file);
 for(const file of files.keys())if(file.startsWith('otfs-receiver/source-objective-v1/')&&!Object.hasOwn(requiredFiles,file))fail('unreviewed '+file);
 const parent=docs.get('otfs-receiver.html')||'';
 if(!parent.includes('id="joint-source-objective"')||!/<iframe\b[^>]*src="otfs-receiver\/source-objective-v1\/index.html"/.test(parent))fail('missing iframe mount');
 const edges=[{from:'otfs-receiver.html',url:'otfs-receiver/source-objective-v1/index.html',kind:'target19-iframe'}];
 const file='otfs-receiver/source-objective-v1/index.html',html=docs.get(file);if(!html)fail('missing embedded document');
 for(const m of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g))edges.push({from:file,url:m[1],kind:'target19-nested-html'});
 // Fetch is document-relative, not module-relative. Declare this separately and test both views.
 for(const url of ['runtime/joint/waveform.json','runtime/joint/scenes.json'])edges.push({from:file,url,kind:'target19-document-fetch'});
 return edges;
}
module.exports={target19OtfsDependencies,requiredFiles};
