'use strict';
// Narrow, code-owned whole-source contracts for the new classic-script receiver.
// This is not generic Worker/importScripts inference. Legacy .js checks and all
// public ESM parsing/hash contracts remain separate and unchanged.
const a=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const profiles=[
  {
    "public": "labs/ofdm-ici/runtime/js/evaluate.js",
    "sha256": "bcf9be4cb478928e4744d3dea357e20b38f53b793f67a7a5f9e43c64255c51ac",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/ofdm-ici/runtime/js/ici-kernel.js",
    "sha256": "3c9e13e8bbd478802c4292999c7633b4e35dba7f2b7a861e7413dce43ac5ddbe",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/ofdm-ici/runtime/js/linalg.js",
    "sha256": "c7e21dadbac282314c504c5f1b73a4de18964c18ee1d06cc34eedcce1d81509a",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/ofdm-ici/runtime/js/sha256.js",
    "sha256": "11ed1580ff4e1f5c627389c242079fc72595fd69bbf101c43c662aa61c01d657",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/ofdm-ici/runtime/worker/ici-client.js",
    "sha256": "1397e1f04bb674973fdebc29213c2531e8383b3aa3f959504761f65dcdf20b75",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/ofdm-ici/runtime/worker/ici-worker.js",
    "sha256": "864131d8d1d91658397a3ca7cd2f1e8cb55ab847a90c7d6c6ef6271d6e66f9fc",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": [
      {
        "url": "../js/linalg.js",
        "resolutionFrom": "labs/ofdm-ici/runtime/worker/ici-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('../js/linalg.js', '../js/sha256.js', '../js/evaluate.js', '../js/ici-kernel.js')"
      },
      {
        "url": "../js/sha256.js",
        "resolutionFrom": "labs/ofdm-ici/runtime/worker/ici-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('../js/linalg.js', '../js/sha256.js', '../js/evaluate.js', '../js/ici-kernel.js')"
      },
      {
        "url": "../js/evaluate.js",
        "resolutionFrom": "labs/ofdm-ici/runtime/worker/ici-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('../js/linalg.js', '../js/sha256.js', '../js/evaluate.js', '../js/ici-kernel.js')"
      },
      {
        "url": "../js/ici-kernel.js",
        "resolutionFrom": "labs/ofdm-ici/runtime/worker/ici-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('../js/linalg.js', '../js/sha256.js', '../js/evaluate.js', '../js/ici-kernel.js')"
      }
    ]
  },
  {
    "public": "labs/ofdm-ici/lesson/ici-controller.js",
    "sha256": "e4b41da1fc612e1c3f9cccdc3998384cf8349762c27b856d911444d0746e7cfb",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": [
      {
        "url": "labs/ofdm-ici/runtime/worker/ici-worker.js",
        "resolutionFrom": "ofdm-ici-receiver.html",
        "kind": "reviewed-classic-worker",
        "literal": "new Worker('labs/ofdm-ici/runtime/worker/ici-worker.js')"
      }
    ]
  },
  {
    "public": "labs/ofdm-ici/lesson/ici-lesson.js",
    "sha256": "1b51814832d69dcbce235594cf6812d8766f9017cbf90ebaf6f609cf9343fd0b",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  }
];
const auxiliaryFiles=new Set(["labs/ofdm-ici/README.md", "labs/ofdm-ici/lesson/PUBLIC-ASSETS.json", "labs/ofdm-ici/lesson/ici-lesson.css", "labs/ofdm-ici/runtime/FORMAT.md", "labs/ofdm-ici/runtime/HANDOFF.md", "labs/ofdm-ici/runtime/SOURCE-FREEZE.json", "labs/ofdm-ici/LESSON-FREEZE.json"]);
// A narrow owned namespace inventory, not a claim that every extension executes.
function fields(x,keys,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==[...keys].sort().join(','))throw Error('Invalid '+label+' fields');}
function classicDependencies(scripts,contract,identities){
 fields(contract,['schemaVersion','scripts'],'classic contract');
 if(contract.schemaVersion!==1||!Array.isArray(contract.scripts))throw Error('Invalid classic contract');
 a.deepEqual(contract.scripts,profiles,'Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required');
 const expected=new Map(profiles.map(p=>[p.public,p])),hashPaths=new Map(profiles.map(p=>[p.sha256,p.public])),actual=new Map(),seen=new Set();
 if(!Array.isArray(identities))throw Error('Missing complete public identities');
 for(const x of identities){fields(x,['file','sha256'],'public identity');if(typeof x.file!=='string'||!/^[a-f0-9]{64}$/.test(x.sha256)||seen.has(x.file))throw Error('Invalid or duplicate public identity');seen.add(x.file);const bound=hashPaths.get(x.sha256);if(bound&&bound!==x.file)throw Error('Frozen classic source path mismatch: '+x.file);if(x.file.startsWith('labs/ofdm-ici/')&&!expected.has(x.file)&&!auxiliaryFiles.has(x.file))throw Error('Unreviewed classic source path: '+x.file);}
 for(const x of scripts){fields(x,['file','source'],'classic input');if(typeof x.file!=='string'||typeof x.source!=='string'||actual.has(x.file))throw Error('Invalid or duplicate classic input');actual.set(x.file,x.source);}
 if(actual.size!==expected.size||[...expected.keys()].some(f=>!actual.has(f)))throw Error('Unreviewed or missing frozen classic source');
 const edges=[];
 for(const [file,p] of expected){const source=actual.get(file);if(hash(source)!==p.sha256)throw Error('Unreviewed frozen classic source hash: '+file);const id=identities.find(x=>x.file===file);if(!id||id.sha256!==p.sha256)throw Error('Missing or changed public classic identity: '+file);new vm.Script(source,{filename:file});for(const literal of new Set(p.runtimeEdges.map(e=>e.literal)))if(source.split(literal).length!==2)throw Error('Frozen classic runtime literal mismatch: '+file);for(const e of p.runtimeEdges)edges.push({from:e.resolutionFrom,url:e.url,kind:e.kind});}
 return edges;
}
module.exports={classicDependencies};
