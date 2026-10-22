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
    "sha256": "42824018b1a913b442ac40984ff8e54a2f6b0de59411dce23135a0109709f2f9",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/runtime/js/evaluation.js",
    "sha256": "1171d1f19b8f330f0da12ed79e5247d2b129b4cf13f2af68113aeae4c54a0e1d",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/runtime/js/receiver.js",
    "sha256": "fb44f41a9fce21f7bbcdf9558e2c87df5750dab4c5560d1b5c595ad0b4125090",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/runtime/js/sha256.js",
    "sha256": "9b620ba2e4decf0014a5e6ce30b3e17c99b3d1df103e0d6a6ef4c40c65f96342",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/runtime/worker/client.js",
    "sha256": "866a92a3408351ded4f48020be1d3f5dd1f050846287be4e3a57320fa56f44e5",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/runtime/worker/protocol.js",
    "sha256": "41a7b0bd3a28a1acd4051a47ca6e42bf2100a2afc381f27e1bd35846be1b6458",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/runtime/worker/receiver-worker.js",
    "sha256": "0e422167dbb93a92e459405362cf67a8b0fa8dac26629d8bfe92c06fc4dc902b",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": [
      {
        "url": "./protocol.js",
        "resolutionFrom": "labs/80211ad/runtime/worker/receiver-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('./protocol.js', '../js/sha256.js', '../js/receiver.js')"
      },
      {
        "url": "../js/sha256.js",
        "resolutionFrom": "labs/80211ad/runtime/worker/receiver-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('./protocol.js', '../js/sha256.js', '../js/receiver.js')"
      },
      {
        "url": "../js/receiver.js",
        "resolutionFrom": "labs/80211ad/runtime/worker/receiver-worker.js",
        "kind": "reviewed-classic-importScripts",
        "literal": "importScripts('./protocol.js', '../js/sha256.js', '../js/receiver.js')"
      }
    ]
  },
  {
    "public": "labs/80211ad/lesson/controller.js",
    "sha256": "1e295a1d12ed09b943fc0105987b4b1de8688129fe58087addd39e070e329c37",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": [
      {
        "url": "labs/80211ad/runtime/worker/receiver-worker.js",
        "resolutionFrom": "80211ad-receiver.html",
        "kind": "reviewed-classic-worker",
        "literal": "new Worker('labs/80211ad/runtime/worker/receiver-worker.js')"
      }
    ]
  },
  {
    "public": "labs/80211ad/lesson/stages.js",
    "sha256": "f24aa698e1321737011176c5366288d8b041f367726c2f79f51e6f39dc76f260",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/80211ad/lesson/lesson.js",
    "sha256": "124cf884cfb3bf461c313f653732ac588f4c989d8d21c8cfbc5947506265624f",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/lesson/controller.js",
    "sha256": "d8c6de52ac728c68eb0609ac8ca35155e49db9d53af6801238ed0b0a19b6f32b",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/lesson/lesson.js",
    "sha256": "6f811fcf415608f8fa40d5f931e73b505d935f4055017a72f75c0b305271b3dc",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": [
      {
        "url": "labs/networked-sync/runtime/worker/receiver-worker.js",
        "resolutionFrom": "networked-sync.html",
        "kind": "reviewed-networked-sync-worker",
        "literal": "new Worker('labs/networked-sync/runtime/worker/receiver-worker.js')"
      }
    ]
  },
  {
    "public": "labs/networked-sync/lesson/stages.js",
    "sha256": "72fc52e078f2ede43bb0870ea9a6def1f39c20b672c73fb59d22d578b51da995",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/js/codec.js",
    "sha256": "ea32aa145a59794a21421ee7d900bc8d59566ddd734416aeb2d570bae333c1a5",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/js/linalg.js",
    "sha256": "7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/js/receiver.js",
    "sha256": "473e7739d35a7dcde7807edb0627a9f0058a4d193518a6c8cfa6745a6218de98",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/js/sha256.js",
    "sha256": "9f1dfd6b3c81f5647db4a2f8259e8e4cc756d27183b1e0a9c43b586f361952e6",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/worker/client.js",
    "sha256": "2ec4be85c09f9abfa6a86da8995ed1b6c6c67bbd28518ca299f67db19dca19eb",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/worker/protocol.js",
    "sha256": "7a2eebeed3e169bf9339a75d87b317190d84ddf9ee9cedb07737039f64422a38",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
  {
    "public": "labs/networked-sync/runtime/worker/receiver-worker.js",
    "sha256": "e2f50711ef502d8ec6cb185a7e5d9f3cb00444512fe57c8d4de8bbfa12a5d534",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": [
      {
        "url": "../js/sha256.js",
        "resolutionFrom": "labs/networked-sync/runtime/worker/receiver-worker.js",
        "kind": "reviewed-networked-sync-importScripts",
        "literal": "importScripts('../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js')"
      },
      {
        "url": "../js/codec.js",
        "resolutionFrom": "labs/networked-sync/runtime/worker/receiver-worker.js",
        "kind": "reviewed-networked-sync-importScripts",
        "literal": "importScripts('../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js')"
      },
      {
        "url": "./protocol.js",
        "resolutionFrom": "labs/networked-sync/runtime/worker/receiver-worker.js",
        "kind": "reviewed-networked-sync-importScripts",
        "literal": "importScripts('../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js')"
      },
      {
        "url": "../js/linalg.js",
        "resolutionFrom": "labs/networked-sync/runtime/worker/receiver-worker.js",
        "kind": "reviewed-networked-sync-importScripts",
        "literal": "importScripts('../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js')"
      },
      {
        "url": "../js/receiver.js",
        "resolutionFrom": "labs/networked-sync/runtime/worker/receiver-worker.js",
        "kind": "reviewed-networked-sync-importScripts",
        "literal": "importScripts('../js/sha256.js','../js/codec.js','./protocol.js','../js/linalg.js','../js/receiver.js')"
      }
    ]
  },
  {
    "public": "labs/gaussian-tradeoff/runtime/vendor/linalg.js",
    "sha256": "7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc",
    "runtimePolicy": "exact-frozen-classic",
    "runtimeEdges": []
  },
{
  "public": "labs/ofdm-ici/false-alarm/adapter.js",
  "sha256": "7e96c87727b616327f312aada19d652cb67ddde45e6348a7189e24f608f7bf87",
  "runtimePolicy": "exact-frozen-classic",
  "runtimeEdges": []
},
{
  "public": "labs/ofdm-ici/false-alarm/presentation.js",
  "sha256": "2fce59e0e952f896b57acd7660454a004e028d967558ba39bd8195dd87a49641",
  "runtimePolicy": "exact-frozen-classic",
  "runtimeEdges": []
},
{
  "public": "labs/ofdm-ici/false-alarm/app.js",
  "sha256": "4745cbefb5ffdaed02d479e2041c25e8bd67c607b36a44cec7184a6dd1b6ebb7",
  "runtimePolicy": "exact-frozen-classic",
  "runtimeEdges": [
    {
      "url": "../runtime/worker/ici-worker.js",
      "resolutionFrom": "labs/ofdm-ici/false-alarm/index.html",
      "kind": "reviewed-classic-worker",
      "literal": "new Worker('../runtime/worker/ici-worker.js')"
    }
  ]
}
];
const auxiliaryFiles=new Set(["labs/ofdm-ici/false-alarm/index.html","labs/ofdm-ici/false-alarm/style.css","labs/ofdm-ici/false-alarm/SOURCE-IMPORT.json","labs/ofdm-ici/README.md","labs/ofdm-ici/lesson/PUBLIC-ASSETS.json","labs/ofdm-ici/lesson/ici-lesson.css","labs/ofdm-ici/runtime/FORMAT.md","labs/ofdm-ici/runtime/HANDOFF.md","labs/ofdm-ici/runtime/SOURCE-FREEZE.json","labs/ofdm-ici/LESSON-FREEZE.json","labs/80211ad/runtime/DEVELOPMENT-FIXES.json","labs/80211ad/runtime/FORMAT.md","labs/80211ad/runtime/HANDOFF.md","labs/80211ad/runtime/README.md","labs/80211ad/runtime/SOURCE-FREEZE.json","labs/80211ad/runtime/package.json","labs/80211ad/runtime/run_all.sh","labs/80211ad/runtime/tests/benchmark.cjs","labs/80211ad/runtime/tests/test-kernel.cjs","labs/80211ad/runtime/tests/test-worker.cjs","labs/80211ad/runtime/tests/verify_manifest.py","labs/80211ad/runtime/worker/BOUNDARY-BENCHMARK.json","labs/80211ad/runtime/worker/README.md","labs/80211ad/runtime/worker/TEST-REPORT.txt","labs/80211ad/runtime/worker/WORKER-FREEZE.json","labs/80211ad/runtime/worker/benchmark-boundary.cjs","labs/80211ad/runtime/RUNTIME-MANIFEST.json","labs/80211ad/lesson/DEVELOPMENT-FIXES.json","labs/80211ad/lesson/PUBLIC-ASSETS.json","labs/80211ad/lesson/README.md","labs/80211ad/lesson/lesson.css","labs/80211ad/lesson/LESSON-FREEZE.json","labs/networked-sync/lesson/DEVELOPMENT-FIXES.json","labs/networked-sync/lesson/LESSON-FREEZE.json","labs/networked-sync/lesson/PUBLIC-ASSETS.json","labs/networked-sync/lesson/README.md","labs/networked-sync/lesson/lesson.css","labs/networked-sync/runtime/DEVELOPMENT-FIXES.json","labs/networked-sync/runtime/HANDOFF.md","labs/networked-sync/runtime/NUMERICAL-VERIFICATION.md","labs/networked-sync/runtime/README.md","labs/networked-sync/runtime/RELEASE-BOUNDARIES.json","labs/networked-sync/runtime/SOURCE-FREEZE.json","labs/networked-sync/runtime/worker/FORMAT.md","labs/networked-sync/runtime/worker/README.md","labs/gaussian-tradeoff/runtime/SOURCE-FREEZE.json","labs/gaussian-tradeoff/runtime/ATTRIBUTION.md","labs/gaussian-tradeoff/runtime/DEVELOPMENT-FIXES.json","labs/gaussian-tradeoff/runtime/HANDOFF.md","labs/gaussian-tradeoff/runtime/NUMERICAL-VERIFICATION.md","labs/gaussian-tradeoff/runtime/PROTOCOL-HANDOFF.md","labs/gaussian-tradeoff/runtime/README.md","labs/gaussian-tradeoff/lesson/DEVELOPMENT-FIXES.json","labs/gaussian-tradeoff/lesson/README.md","labs/gaussian-tradeoff/lesson/LESSON-FREEZE.json","labs/gaussian-tradeoff/lesson/PUBLIC-ASSETS.json","labs/gaussian-tradeoff/lesson/lesson.css"]);
// Module bytes are checked by the unified ESM gate; this is only namespace inventory.
const gaussianModuleFiles=new Set(["labs/gaussian-tradeoff/runtime/codec.mjs","labs/gaussian-tradeoff/runtime/kernel.mjs","labs/gaussian-tradeoff/runtime/math.mjs","labs/gaussian-tradeoff/runtime/presets.mjs","labs/gaussian-tradeoff/runtime/runtime.mjs","labs/gaussian-tradeoff/runtime/worker.mjs","labs/gaussian-tradeoff/lesson/controller.mjs","labs/gaussian-tradeoff/lesson/view.mjs","labs/gaussian-tradeoff/lesson/lesson.mjs"]);
// A narrow owned namespace inventory, not a claim that every extension executes.
function fields(x,keys,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==[...keys].sort().join(','))throw Error('Invalid '+label+' fields');}
// Exact reset-only UI update. Prior scientific/runtime profiles remain frozen above.
{const p=profiles.filter(p=>p.public==='labs/80211ad/lesson/lesson.js');a.equal(p.length,1);a.equal(p[0].sha256,'124cf884cfb3bf461c313f653732ac588f4c989d8d21c8cfbc5947506265624f');p[0].sha256='63afe2d831a094f11197e4155de73588754e4861d9cec17ce43c3b77d34d3104';}
function classicDependencies(scripts,contract,identities){
 fields(contract,['schemaVersion','scripts'],'classic contract');
 if(contract.schemaVersion!==1||!Array.isArray(contract.scripts))throw Error('Invalid classic contract');
 a.deepEqual(contract.scripts,profiles,'Unreviewed classic runtime contract: exact code-owned paths, hashes, policies and endpoints required');
 const expected=new Map(profiles.map(p=>[p.public,p])),hashPaths=new Map(),actual=new Map(),seen=new Set();
 // Shared frozen bytes may appear only at their separately reviewed exact paths.
 for(const p of profiles){if(!hashPaths.has(p.sha256))hashPaths.set(p.sha256,new Set());hashPaths.get(p.sha256).add(p.public);}
 if(!Array.isArray(identities))throw Error('Missing complete public identities');
 for(const x of identities){fields(x,['file','sha256'],'public identity');if(typeof x.file!=='string'||!/^[a-f0-9]{64}$/.test(x.sha256)||seen.has(x.file))throw Error('Invalid or duplicate public identity');seen.add(x.file);const bound=hashPaths.get(x.sha256);if(bound&&!bound.has(x.file))throw Error('Frozen classic source path mismatch: '+x.file);if(['labs/ofdm-ici/','labs/80211ad/','labs/networked-sync/','labs/gaussian-tradeoff/'].some(prefix=>x.file.startsWith(prefix))&&!expected.has(x.file)&&!auxiliaryFiles.has(x.file)&&!gaussianModuleFiles.has(x.file))throw Error('Unreviewed classic source path: '+x.file);}
 for(const x of scripts){fields(x,['file','source'],'classic input');if(typeof x.file!=='string'||typeof x.source!=='string'||actual.has(x.file))throw Error('Invalid or duplicate classic input');actual.set(x.file,x.source);}
 if(actual.size!==expected.size||[...expected.keys()].some(f=>!actual.has(f)))throw Error('Unreviewed or missing frozen classic source');
 const edges=[];
 for(const [file,p] of expected){const source=actual.get(file);if(hash(source)!==p.sha256)throw Error('Unreviewed frozen classic source hash: '+file);const id=identities.find(x=>x.file===file);if(!id||id.sha256!==p.sha256)throw Error('Missing or changed public classic identity: '+file);new vm.Script(source,{filename:file});for(const literal of new Set(p.runtimeEdges.map(e=>e.literal)))if(source.split(literal).length!==2)throw Error('Frozen classic runtime literal mismatch: '+file);for(const e of p.runtimeEdges)edges.push({from:e.resolutionFrom,url:e.url,kind:e.kind});}
 return edges;
}
module.exports={classicDependencies};
