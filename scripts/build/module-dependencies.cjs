'use strict';
// Node's public parser supplies static ESM specifiers without linking or executing
// a module. Runtime edges are reviewed facts bound to complete source hashes;
// this intentionally makes no generic JavaScript runtime-discovery claim.
const cp=require('node:child_process'),crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const parserProgram=String.raw`
'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const inputs=JSON.parse(fs.readFileSync(0,'utf8'));
const result=inputs.map(({file,source})=>({file,specifiers:[...new vm.SourceTextModule(source,{identifier:file}).dependencySpecifiers]}));
process.stdout.write(JSON.stringify(result));
`;
function staticModuleDependencies(modules){
 const result=cp.spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings','-e',parserProgram],{input:JSON.stringify(modules),encoding:'utf8',maxBuffer:32*1024*1024,timeout:30000});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Parse-only ESM dependency inspection failed: '+result.stderr);
 return JSON.parse(result.stdout);
}
function fields(x,expected,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==[...expected].sort().join(','))throw Error('Invalid '+label+' fields');}

// These are two explicitly reviewed frozen source profiles, not patterns for
// discovering arbitrary factories, dynamic imports, or directory contents. The
// code-owned hashes also prevent weakening a profile by only editing its JSON.
// The exported generic createModuleWorker(relative) is NOT an unrestricted edge:
// only these two fixed public endpoint calls are covered by this guarantee.
const factory="export async function createModuleWorker(relative){const url=new URL(relative,import.meta.url);if(typeof Worker!=='undefined')return new Worker(url,{type:'module'});const {Worker:NodeWorker}=await import('node:worker_threads');return new NodeWorker(url,{type:'module'});}";
const solverLoop="for(const name of ['linalg','hermitian','numerics','model','optimizer','metrics','core'])await import(`../vendor/solver/${name}.js`)";
const reviewedProfiles=new Map([
 // Exact accepted dual-array bounded receiver and mounted teaching lesson.
[
  "labs/dual-array/lesson.mjs",
  {
    "sha256": "c6b83930e3aec78eb3b4c9c8976c62d6d13842213a2dbb59ff0c2eda18c8c781",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": []
  }
],
[
  "labs/dual-array/lesson/model.mjs",
  {
    "sha256": "4608ebcfc164858358b884b2313fb3b8ccd373aea9ada8e57cec00d98a95b7e7",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": []
  }
],
[
  "labs/dual-array/lesson/mount.mjs",
  {
    "sha256": "d2a2bd8468e5aa1ca49b5e9361675362be0f216f7069af1b437322715be34848",
    "runtimePolicy": "reviewed-dual-array-runtime",
    "sourceLiterals": [
      "fetchImpl=globalThis.fetch"
    ],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": [
      {
        "kind": "data",
        "url": "../../../assets/data/dual-array/historical-statistics.json",
        "literal": "fetchImpl('assets/data/dual-array/historical-statistics.json')"
      }
    ]
  }
],
[
  "labs/dual-array/lesson/session.mjs",
  {
    "sha256": "5768801f8afeb248f77f844f5fd64666b3f0ba0fc25321675b72844bf5dd3664",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": []
  }
],
[
  "labs/dual-array/lesson/view.mjs",
  {
    "sha256": "8f3907a4bc5202432ce9ceda1b7f456e1175a775123a94d0ef286124d4e69c10",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": []
  }
],
[
  "labs/dual-array/runtime/client.mjs",
  {
    "sha256": "16e2d61c07929a57520e25e3ffe2ba6d89998fbfdbbc0b8edee7415dabbfd824",
    "runtimePolicy": "reviewed-dual-array-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./worker.mjs",
        "literal": "new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})"
      }
    ]
  }
],
[
  "labs/dual-array/runtime/kernel.mjs",
  {
    "sha256": "0292203f5dd4d0ff39592f892a332c5333f2ba8caf894effdc4a81d43702c32d",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": []
  }
],
[
  "labs/dual-array/runtime/records.mjs",
  {
    "sha256": "7340f93036f1d2abbf833e88e73341820c14e5432d39a7ea7e4844e99b642158",
    "runtimePolicy": "reviewed-dual-array-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": [
      {
        "kind": "dynamic-module",
        "url": "./kernel.mjs",
        "literal": "await import('./kernel.mjs')"
      }
    ]
  }
],
[
  "labs/dual-array/runtime/worker.mjs",
  {
    "sha256": "b2b2376d0b3c62a4e2ec58a84a1f95f31a0ddb1023d9a19940445f641d84f94f",
    "runtimePolicy": "reviewed-dual-array-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-dual-array-module",
    "runtimeEdges": [
      {
        "kind": "node-builtin",
        "url": "node:worker_threads",
        "literal": "await import('node:worker_threads')"
      }
    ]
  }
],
 // Exact immutable pilot-pattern v4 lesson and accepted raw-IQ receiver.
[
  "labs/pilot-pattern/lesson.mjs",
  {
    "sha256": "9a0665b92d157fd64c9569db5fc236f73b2735c3303f4ee088400149288c4246",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
[
  "labs/pilot-pattern/runtime/core.mjs",
  {
    "sha256": "53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
[
  "labs/pilot-pattern/runtime/processing.mjs",
  {
    "sha256": "48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
[
  "labs/pilot-pattern/runtime/protocol.mjs",
  {
    "sha256": "0d3fcc205699d7d36ad9d35556d9c8f105d0124d03dad27f29995dbbffa474d1",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
[
  "labs/pilot-pattern/runtime/records.mjs",
  {
    "sha256": "1982bfa3c17a479c8fb9e26cd5fd270a792c677b4a2e2f301ae89b6ca78a7c28",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
[
  "labs/pilot-pattern/runtime/worker.mjs",
  {
    "sha256": "b157c3560b5126417150bd5d7237389ed6c1b9c8c1867bdf7cbab942c705a2c2",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
[
  "labs/pilot-pattern/session.mjs",
  {
    "sha256": "96a7bb28fb6bbb4a6cd4ab94e2910adb515486d6ff183cb53caab5658ffcc267",
    "runtimePolicy": "reviewed-factory-endpoints",
    "sourceLiterals": [
      "workerFactory=url=>new Worker(url,{type:'module'})",
      "workerFactory(new URL('./runtime/worker.mjs',import.meta.url))"
    ],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./runtime/worker.mjs",
        "literal": "new URL('./runtime/worker.mjs',import.meta.url)"
      }
    ]
  }
],
[
  "labs/pilot-pattern/strict-json.mjs",
  {
    "sha256": "4d539f0a15a957649029bd8190d73d50425a202f2446270dc3285223f25fe359",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-pilot-pattern-module",
    "runtimeEdges": []
  }
],
 // Exact source-bound Perceptive direct block-MMV lesson and v2 solver.
[
  "labs/perceptive-bsbl/check-worker.mjs",
  {
    "sha256": "7f39df950ee2008c70f25811968dc83eeee1a6473fc427c66ea3600323e728c4",
    "runtimePolicy": "reviewed-perceptive-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": [
      {
        "kind": "node-builtin",
        "url": "node:worker_threads",
        "literal": "const { parentPort } = await import('node:worker_threads');"
      }
    ]
  }
],
[
  "labs/perceptive-bsbl/lesson.mjs",
  {
    "sha256": "2c227befd0eecaff551a7fa63cf2b9e1cf1fabd06707669213be5cd97a157a57",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/plots.mjs",
  {
    "sha256": "dc5dffb8d1270303e528c3e2b14c91f7cd5596b543ba9c4a088081a6d3b97a93",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/budget.mjs",
  {
    "sha256": "603f29be21da5753485d38db4187d81c2de9b699f956c119c71262a4da6e9491",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/build-info.mjs",
  {
    "sha256": "fe5e5191d70c276b54e98a32d717ded791137441629e820e5c434bbeb9cceaa8",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/check-record.mjs",
  {
    "sha256": "5ca5af74bf146c41f08f9e39f27f7fcba381d2093955365d42a7265ae40e2f78",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/client.mjs",
  {
    "sha256": "e801bb6cdc43d3f41f67b0e44a4a9cfa231afec8ef81d7131e519d4d8ebb0746",
    "runtimePolicy": "reviewed-perceptive-runtime",
    "sourceLiterals": [
      "new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})"
    ],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./worker.mjs",
        "literal": "new globalThis.Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})"
      },
      {
        "kind": "node-builtin",
        "url": "node:worker_threads",
        "literal": "const {Worker}=await import('node:worker_threads');"
      }
    ]
  }
],
[
  "labs/perceptive-bsbl/runtime/complex.mjs",
  {
    "sha256": "23c73626e904de547abe59108dc90a3dcb92c0ebbaf63a981fdf394c12cfb63a",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/evaluation.mjs",
  {
    "sha256": "6ad9250411da235c381d7e97008de9f7d5045ff575c1c1d5d6c95d2914a89bc3",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/model.mjs",
  {
    "sha256": "7dcda312eac442c68f1698b42d9cbcf30264a6ccf47039698d006b31bde8bc33",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/record.mjs",
  {
    "sha256": "594bf95306ded22352b047a5ddea7c9be070516b45bc431be129f213d4c8c5f5",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/runner.mjs",
  {
    "sha256": "e780a1bfa10871b711762243550e6cf27e7e1925f6e4cd5e3e7493a118516dda",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/schema.mjs",
  {
    "sha256": "c3ed85625e2065063ea9805a83027c9f601dcbdbd237a7ae7b25050e7c33c212",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/solver.mjs",
  {
    "sha256": "5abd5230f86ecf0b701fff5a77e7bbee1bdc8e2bdfd95f096b8df698aef34977",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
[
  "labs/perceptive-bsbl/runtime/worker.mjs",
  {
    "sha256": "96614b7de0a5983f67ece8b13704f1ffcfe3c4b7609b0c17edc7f215ae9f6402",
    "runtimePolicy": "reviewed-perceptive-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": [
      {
        "kind": "node-builtin",
        "url": "node:worker_threads",
        "literal": "const {parentPort}=await import('node:worker_threads');"
      }
    ]
  }
],
[
  "labs/perceptive-bsbl/session.mjs",
  {
    "sha256": "9cc64f36e9ad71b62ac8ccf5b00026b9787477b0f72e1a9d0396572716b8394a",
    "runtimePolicy": "reviewed-perceptive-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./check-worker.mjs",
        "literal": "new globalThis.Worker(new URL('./check-worker.mjs', import.meta.url), { type: 'module' })"
      }
    ]
  }
],
[
  "labs/perceptive-bsbl/view.mjs",
  {
    "sha256": "35f3b882ffb87a61d6476ea31f830c1b82576abccb261c6dd3ba32c392581592",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-perceptive-module",
    "runtimeEdges": []
  }
],
 // Exact source-bound sensing-assisted OTFS ESM, including seven .js modules.
[
  "labs/otfs-sensing-assisted/lesson/adapter.mjs",
  {
    "sha256": "d32b392228318a872193076556bdba8979c0185f361e8a4a427182a129507af6",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/lesson/lesson.mjs",
  {
    "sha256": "c36424aac31011d7ff1b80d2a84964d29b91a1ef28c15c02eb1454eb77c81431",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/lesson/offline-reference.mjs",
  {
    "sha256": "3558bfafaef4ba90231e2c4be3a7d47c8401d659363c3f596a62ee368f7a1194",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/lesson/record.mjs",
  {
    "sha256": "9114d8f9e7d891db68cde4d867d2ca73d8d662bc23a1e27c5b8795b16226f28b",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/lesson/session.mjs",
  {
    "sha256": "1cf1ff661c504a5443110b88c158076521f5e07e72c5e1c5a2b5e05f879a3879",
    "runtimePolicy": "reviewed-factory-endpoints",
    "sourceLiterals": [
      "this.workerFactory=workerFactory??(url=>new Worker(url,{type:'module'}))"
    ],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "../runtime/worker/receiver-worker.js",
        "literal": "new URL('../runtime/worker/receiver-worker.js',import.meta.url)"
      }
    ]
  }
],
[
  "labs/otfs-sensing-assisted/lesson/tiny-reference.mjs",
  {
    "sha256": "62e15ebfe822951ad9a4df49b5ef07c037ad34eab33f32a7f2b5cf74d60bf472",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/runtime/js/codec.js",
  {
    "sha256": "a69320e0884407594f76bc5d2779f84e9b6e21ce7700f221f355f648962d2e4b",
    "runtimePolicy": "reviewed-sensing-otfs-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": [
      {
        "kind": "node-builtin",
        "url": "node:crypto",
        "literal": "globalThis.crypto?.subtle??(await import('node:crypto')).webcrypto.subtle"
      }
    ]
  }
],
[
  "labs/otfs-sensing-assisted/runtime/js/evaluation.js",
  {
    "sha256": "52e8b5575f2bb6c76df8186a790bdca446c6cd44e6094ba42e43027d773ed017",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/runtime/js/receiver.js",
  {
    "sha256": "1569d209f3cd6b3f7c2cd93e3d2e0340b569ff2967838f4370b02463e76fadcd",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/runtime/js/validation.js",
  {
    "sha256": "63a012ba71bde644d67beb835e68d15951c0fd5f004b31f1ef7ecf6e7520f1ea",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/runtime/worker/client.js",
  {
    "sha256": "e7f37c75dea265d4c091f3710fe539129fee174ca4950dd85994948ab51958f4",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/runtime/worker/protocol.js",
  {
    "sha256": "4201112be861f495f611b34a5db2dbee144fe62ab7d0f093bb25e72be7b5b0c1",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": []
  }
],
[
  "labs/otfs-sensing-assisted/runtime/worker/receiver-worker.js",
  {
    "sha256": "9805fb429d6056b17ab53a3f74dbb768a5deb6d34ed789fe1b056c7322d372a5",
    "runtimePolicy": "reviewed-sensing-otfs-runtime",
    "sourceLiterals": [],
    "edgeKind": "reviewed-sensing-otfs-module",
    "runtimeEdges": [
      {
        "kind": "node-builtin",
        "url": "node:worker_threads",
        "literal": "const port=node?(await import('node:worker_threads')).parentPort:null;"
      }
    ]
  }
],
 // Exact source-bound multi-target lesson and audited v2 solver.
[
  "labs/nearfield-multitarget/lesson/adapter.mjs",
  {
    "sha256": "21ed9c365a6dacc96152225055e2d1edc2e091ae6c316930239ef832eb1cdcf9",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/lesson/client.mjs",
  {
    "sha256": "0777004186f828f0ab283eeb2ee12c5d7a0f5e2be1576e11ba5b2d15a15b956d",
    "runtimePolicy": "reviewed-factory-endpoints",
    "sourceLiterals": [
      "workerFactory=url=>new Worker(url,{type:'module'})",
      "this.factory=workerFactory;",
      "worker=this.factory(url);"
    ],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "../runtime/worker.mjs",
        "literal": "new URL('../runtime/worker.mjs',import.meta.url)"
      },
      {
        "kind": "worker",
        "url": "./derived-worker.mjs",
        "literal": "new URL('./derived-worker.mjs',import.meta.url)"
      }
    ]
  }
],[
  "labs/nearfield-multitarget/lesson/codec.mjs",
  {
    "sha256": "89e60270d88cecd37a76de8f81589610d84250af59a4544c906550c82d04fc57",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/lesson/derived-worker.mjs",
  {
    "sha256": "c0958e5d8e7f794388d5c3f4630ebecdc250917c4b5aeab7b33450df1269af8b",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/lesson/lesson.mjs",
  {
    "sha256": "402ffec78acb542877124f7762c453a277335853debe4a712185dfd42b611dcc",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/lesson/presets.mjs",
  {
    "sha256": "8320b49bd1cc0cb1a7d9df80be4c22d6701f64f23ed505840eebda9b54e2f716",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/lesson/record-check.mjs",
  {
    "sha256": "e35bc54cb588820326f2664a1bff1ae2e12848ebcef82aa757e5dcc4cf9abed5",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/lesson/session.mjs",
  {
    "sha256": "1a9139199cf25a8ca3b8708e16fae584092eaacd3d2b005516cd7acdbe788a8a",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/runtime/certificate.mjs",
  {
    "sha256": "5446c8691ac5aea951c3b3b559a68f7d89390cb2fb0b3c99ae2a845120bdec20",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/runtime/linalg.mjs",
  {
    "sha256": "abb3495224d647af55229efafb8bd48901dec27704cdb65d52be21b2d784c15a",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/runtime/model.mjs",
  {
    "sha256": "f06df731dbb14a991545b859e676ade1953e245aa12ea97b61e9db773b7d4779",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/runtime/sampler.mjs",
  {
    "sha256": "b225f895253cf6cae64c2acf0038dc33a2d277b00dcd2a850b158f5dca4c6971",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/runtime/solver.mjs",
  {
    "sha256": "939539968a293ceccabeedf1d7f059ee6d2b9080164cc34d5267445be699d267",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],[
  "labs/nearfield-multitarget/runtime/worker.mjs",
  {
    "sha256": "4b456a678db81236266365071191f30e6ff1b7182e00b2ec6edc94f848944106",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-multitarget-module",
    "runtimeEdges": []
  }
],
 ['labs/near-field/research/runtime/src/worker-client.mjs',{
  sha256:'ebd7e69157c05099e89c576e6959364b915f950f365f1c22a76847f41d7dea4d',
  runtimePolicy:'reviewed-factory-endpoints',sourceLiterals:[factory],edgeKind:'reviewed-worker',
  runtimeEdges:[
   {kind:'worker',url:'./solver-worker.mjs',factory:'createModuleWorker',endpoint:'createSolverClient',literal:"export async function createSolverClient(){return new JobWorker(await createModuleWorker('./solver-worker.mjs'));}"},
   {kind:'worker',url:'./receiver-worker.mjs',factory:'createModuleWorker',endpoint:'createReceiverClient',literal:"export async function createReceiverClient(){return new JobWorker(await createModuleWorker('./receiver-worker.mjs'));}"}
  ]
 }],
 ['labs/near-field/research/runtime/src/solver-loader.mjs',{
  sha256:'7e734d0e81d4988bfcabf517673b1d6d12f7b9fb07a0c7b2ac70f32ee4fbd250',
  runtimePolicy:'reviewed-enumerated-imports',
  sourceLiterals:["if(typeof process!=='undefined'&&process.versions?.node){kernel=(await import('../vendor/solver/core.js')).default;}",solverLoop],
  edgeKind:'reviewed-module',
  runtimeEdges:['linalg','hermitian','numerics','model','optimizer','metrics','core'].map(name=>({kind:'module',url:'../vendor/solver/'+name+'.js',literal:solverLoop}))
 }],
 // Gaussian paths, complete source hashes and browser/Node fallback shapes were
 // reviewed together; none of these declarations is generic dynamic inference.
 // Only the default createWorkerClient endpoint is covered. Caller-injected
 // createWorker callbacks are external transports, not inferred dependencies.
 [
   "labs/gaussian-tradeoff/runtime/codec.mjs",
   {
     "sha256": "cd210349a1755aba09af3c8bcf0ebb046a935ca8acd3f1839a56b8a9c4f033aa",
     "runtimePolicy": "reviewed-gaussian-runtime",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": [
       {
         "kind": "node-builtin",
         "url": "node:crypto",
         "literal": "if(!subtle&&typeof process==='object'&&process.versions?.node)subtle=(await import('node:crypto')).webcrypto.subtle;"
       }
     ]
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/kernel.mjs",
   {
     "sha256": "0f2dc07dc891593cfe2190d09d395a6be4b7343a43c52f45dd6b1b9a6d176310",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/math.mjs",
   {
     "sha256": "930bedc07777ea6c078bc742dbc4b64938cf963b8f44c35902f80967f47fd79d",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/presets.mjs",
   {
     "sha256": "9a9633235b4a86aa8c084c915394d9ef004c1ca5062a8507c44ff016e22851ae",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/runtime.mjs",
   {
     "sha256": "94352d73c3921f7a83b6313ccdf31d2f0aa3e311c5de342f9cf18f002e1b6758",
     "runtimePolicy": "reviewed-gaussian-runtime",
     "sourceLiterals": [
       "const factory=ownedOptions.createWorker??(async()=>{",
       "const worker=await factory();"
     ],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": [
       {
         "kind": "worker",
         "url": "./worker.mjs",
         "literal": "if(typeof Worker==='function')return new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});"
       },
       {
         "kind": "node-builtin",
         "url": "node:worker_threads",
         "literal": "const {Worker:NodeWorker}=await import('node:worker_threads');return new NodeWorker(new URL('./worker.mjs',import.meta.url),{type:'module'});"
       }
     ]
   }
 ],
 [
   "labs/gaussian-tradeoff/runtime/worker.mjs",
   {
     "sha256": "acd716f63099a6e3e773c29e51b23d5ff8f8babbfb442830bdcf55559bb9727c",
     "runtimePolicy": "reviewed-gaussian-runtime",
     "sourceLiterals": [
       "if(typeof self==='object'&&typeof self.postMessage==='function'){",
       "}else if(typeof process==='object'&&process.versions?.node){"
     ],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": [
       {
         "kind": "node-builtin",
         "url": "node:worker_threads",
         "literal": "const {parentPort}=await import('node:worker_threads');"
       }
     ]
   }
 ],
 [
   "labs/gaussian-tradeoff/lesson/controller.mjs",
   {
     "sha256": "0ec5f2562224a61fc065a59da21d56532d51ba9eba0c26e0d4a7fb96a015ba03",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/lesson/view.mjs",
   {
     "sha256": "aa6f5749b16fd48cb3c2a0983b96cde7d343931e10cd028b0d33221160885d64",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 [
   "labs/gaussian-tradeoff/lesson/lesson.mjs",
   {
     "sha256": "af1dfaca2790fe654ad95265c3923a54eaf076a6c718800152dc103e482eba57",
     "runtimePolicy": "no-runtime-loads",
     "sourceLiterals": [],
     "edgeKind": "reviewed-gaussian-module",
     "runtimeEdges": []
   }
 ],
 // Exact Cell-Free source-bound Worker factory and explicit reference-summary fetch.
[
  "labs/cellfree-maprt/lesson/adapter.mjs",
  {
    "sha256": "976112b376b800237066e2f1923fb6958547829bcb6cbf8bb542159b32d37bc7",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/lesson/lesson.mjs",
  {
    "sha256": "6e686fc26494728db434fd797f745e2b1bcdd51e7fbc9d822bd4c4fe3f58a451",
    "runtimePolicy": "reviewed-cellfree-runtime",
    "sourceLiterals": [
      "fetch=globalThis.fetch"
    ],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": [
      {
        "kind": "data",
        "url": "./reference-summary.json",
        "literal": "const response=await fetch(new URL('./reference-summary.json',import.meta.url));"
      }
    ]
  }
],
[
  "labs/cellfree-maprt/lesson/session.mjs",
  {
    "sha256": "894831143a4c395f9e3eb9df03540ba40b9dcf4cb6120bca6115c6d2b8d01a00",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/client.mjs",
  {
    "sha256": "6e371cd9595e3463443019cf1fdb20294bbce6fe8326f3385d7ce0b2aabb5a32",
    "runtimePolicy": "reviewed-cellfree-runtime",
    "sourceLiterals": [
      "workerFactory=url=>new Worker(url,{type:'module'})",
      "this.factory=workerFactory;"
    ],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./worker.mjs",
        "literal": "this.worker=this.factory(new URL('./worker.mjs',import.meta.url));"
      }
    ]
  }
],
[
  "labs/cellfree-maprt/runtime/codec.mjs",
  {
    "sha256": "658642bb48f4bf930a382f2e3532b71631dc4ed8d764ef8620c9e9166ba67a57",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/linalg.mjs",
  {
    "sha256": "9aed31d84830eda15ca8071c43add8c1da8c04584ed829b959087a9def1527b5",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/maprt.mjs",
  {
    "sha256": "cd6ffe513d9f41ae950a53ae9e1ac173fdca26fd669718f4dddfacfdc4bc61d1",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/power.mjs",
  {
    "sha256": "c777d9339556a967f7d1aa95f1fc4165932e368bcc6da9037d2cbbf53ee3dbfa",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/runtime.mjs",
  {
    "sha256": "ace8a85459f8109f81504f18948e58d689b566f07f24b868b055791ee0054d1b",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/scenario.mjs",
  {
    "sha256": "537790f4ea80e70bb48fe57cec7f3b2871242e804538f2a9d2e49bc5a4085551",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/statistics.mjs",
  {
    "sha256": "2423ee5876b6049a4fad082d11716e595fd9908e7c142e0bcd82871406f20993",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
],
[
  "labs/cellfree-maprt/runtime/worker.mjs",
  {
    "sha256": "815153fb7e0eb0d8db9354a43135909b28843087be6b375becc2c9d1b711fe7e",
    "runtimePolicy": "no-runtime-loads",
    "sourceLiterals": [],
    "edgeKind": "reviewed-cellfree-module",
    "runtimeEdges": []
  }
]
]);
const cellfreePublicFiles=new Map([
  [
    "labs/cellfree-maprt/lesson/LESSON-FREEZE.json",
    "d87233daa4e5d122ce3192e4260be127241777ef2746b2219d58311e5125a8d7"
  ],
  [
    "labs/cellfree-maprt/lesson/PUBLIC-ASSETS.json",
    "941403a04929cab4b1cafc92192bb05db404ccbcc6e567532c380b8a89e40fe0"
  ],
  [
    "labs/cellfree-maprt/lesson/README.md",
    "03d1fdd1096bbfa0b6973ae981f6b5fec0955c786e4d0ca216245517b162c3c0"
  ],
  [
    "labs/cellfree-maprt/lesson/adapter.mjs",
    "976112b376b800237066e2f1923fb6958547829bcb6cbf8bb542159b32d37bc7"
  ],
  [
    "labs/cellfree-maprt/lesson/lesson.css",
    "512c77535e786bcfd3fae9e94e33763f6432a5d8a4063d3cc76420c49410dd53"
  ],
  [
    "labs/cellfree-maprt/lesson/lesson.mjs",
    "6e686fc26494728db434fd797f745e2b1bcdd51e7fbc9d822bd4c4fe3f58a451"
  ],
  [
    "labs/cellfree-maprt/lesson/reference-summary.json",
    "4be7f2f643652a673670d05fa25ef448307b5bf1d32e1ec96af6a70e34067f72"
  ],
  [
    "labs/cellfree-maprt/lesson/session.mjs",
    "894831143a4c395f9e3eb9df03540ba40b9dcf4cb6120bca6115c6d2b8d01a00"
  ],
  [
    "labs/cellfree-maprt/runtime/INDEPENDENT-REVIEW.md",
    "30d9ac2a92314aade0588f167825cc646efc1d5637f3257ad6878fbb2ca90e93"
  ],
  [
    "labs/cellfree-maprt/runtime/README.md",
    "06acd8c5ae76441b1f19e5e81c3d094c312089355d67d50013aac26c1592ef98"
  ],
  [
    "labs/cellfree-maprt/runtime/RUNTIME-MANIFEST.json",
    "4614ef3d375be7185cf32759a4e00638ee0a2db091cce57b62bc7268ff07f9e5"
  ],
  [
    "labs/cellfree-maprt/runtime/client.mjs",
    "6e371cd9595e3463443019cf1fdb20294bbce6fe8326f3385d7ce0b2aabb5a32"
  ],
  [
    "labs/cellfree-maprt/runtime/codec.mjs",
    "658642bb48f4bf930a382f2e3532b71631dc4ed8d764ef8620c9e9166ba67a57"
  ],
  [
    "labs/cellfree-maprt/runtime/linalg.mjs",
    "9aed31d84830eda15ca8071c43add8c1da8c04584ed829b959087a9def1527b5"
  ],
  [
    "labs/cellfree-maprt/runtime/maprt.mjs",
    "cd6ffe513d9f41ae950a53ae9e1ac173fdca26fd669718f4dddfacfdc4bc61d1"
  ],
  [
    "labs/cellfree-maprt/runtime/power.mjs",
    "c777d9339556a967f7d1aa95f1fc4165932e368bcc6da9037d2cbbf53ee3dbfa"
  ],
  [
    "labs/cellfree-maprt/runtime/runtime.mjs",
    "ace8a85459f8109f81504f18948e58d689b566f07f24b868b055791ee0054d1b"
  ],
  [
    "labs/cellfree-maprt/runtime/scenario.mjs",
    "537790f4ea80e70bb48fe57cec7f3b2871242e804538f2a9d2e49bc5a4085551"
  ],
  [
    "labs/cellfree-maprt/runtime/statistics.mjs",
    "2423ee5876b6049a4fad082d11716e595fd9908e7c142e0bcd82871406f20993"
  ],
  [
    "labs/cellfree-maprt/runtime/worker.mjs",
    "815153fb7e0eb0d8db9354a43135909b28843087be6b375becc2c9d1b711fe7e"
  ]
]);
const multitargetPublicFiles=new Map([
  [
    "labs/nearfield-multitarget/lesson/LESSON-FREEZE.json",
    "3ea8557ab493cf2cb4806c9ed8d117a843c4626d3fbbc95818c5724da1bbacf0"
  ],
  [
    "labs/nearfield-multitarget/lesson/PUBLIC-ASSETS.json",
    "f8e27615f9940c9113e6dbdd1ebda66bdec29a704a052722ecb8bc906ad26d1f"
  ],
  [
    "labs/nearfield-multitarget/lesson/README.md",
    "dd78ec831389d923f3c513b1d6ac95b6a2b7caf685dc552b379606496eeb4267"
  ],
  [
    "labs/nearfield-multitarget/lesson/adapter.mjs",
    "21ed9c365a6dacc96152225055e2d1edc2e091ae6c316930239ef832eb1cdcf9"
  ],
  [
    "labs/nearfield-multitarget/lesson/client.mjs",
    "0777004186f828f0ab283eeb2ee12c5d7a0f5e2be1576e11ba5b2d15a15b956d"
  ],
  [
    "labs/nearfield-multitarget/lesson/codec.mjs",
    "89e60270d88cecd37a76de8f81589610d84250af59a4544c906550c82d04fc57"
  ],
  [
    "labs/nearfield-multitarget/lesson/derived-worker.mjs",
    "c0958e5d8e7f794388d5c3f4630ebecdc250917c4b5aeab7b33450df1269af8b"
  ],
  [
    "labs/nearfield-multitarget/lesson/lesson.css",
    "b3a5fb16e16e40626032f75eba9f841faf1572b40e3ede2f4c5ebf7412d69106"
  ],
  [
    "labs/nearfield-multitarget/lesson/lesson.mjs",
    "402ffec78acb542877124f7762c453a277335853debe4a712185dfd42b611dcc"
  ],
  [
    "labs/nearfield-multitarget/lesson/presets.mjs",
    "8320b49bd1cc0cb1a7d9df80be4c22d6701f64f23ed505840eebda9b54e2f716"
  ],
  [
    "labs/nearfield-multitarget/lesson/record-check.mjs",
    "e35bc54cb588820326f2664a1bff1ae2e12848ebcef82aa757e5dcc4cf9abed5"
  ],
  [
    "labs/nearfield-multitarget/lesson/session.mjs",
    "1a9139199cf25a8ca3b8708e16fae584092eaacd3d2b005516cd7acdbe788a8a"
  ],
  [
    "labs/nearfield-multitarget/runtime/FINAL-BINDING.json",
    "f78b5b2415ec07f42eca0ccd0a39f5049013c9441bd5e4dca08f9230633de26e"
  ],
  [
    "labs/nearfield-multitarget/runtime/MANIFEST.json",
    "eccfffee0878070e936cad88a9de8fac7567cfa9846dde616dfc5a00dcaa7d44"
  ],
  [
    "labs/nearfield-multitarget/runtime/PROTOCOL-V2.md",
    "d7d2071891bfaf56b4e16b7b59dba46672fab3dc10d233b385c40475ef199515"
  ],
  [
    "labs/nearfield-multitarget/runtime/README.md",
    "0e45e172b622fc84c44a8826b3a2c4cb0f81fe529237d7397576193fca90a5d3"
  ],
  [
    "labs/nearfield-multitarget/runtime/certificate.mjs",
    "5446c8691ac5aea951c3b3b559a68f7d89390cb2fb0b3c99ae2a845120bdec20"
  ],
  [
    "labs/nearfield-multitarget/runtime/linalg.mjs",
    "abb3495224d647af55229efafb8bd48901dec27704cdb65d52be21b2d784c15a"
  ],
  [
    "labs/nearfield-multitarget/runtime/model.mjs",
    "f06df731dbb14a991545b859e676ade1953e245aa12ea97b61e9db773b7d4779"
  ],
  [
    "labs/nearfield-multitarget/runtime/sampler.mjs",
    "b225f895253cf6cae64c2acf0038dc33a2d277b00dcd2a850b158f5dca4c6971"
  ],
  [
    "labs/nearfield-multitarget/runtime/solver.mjs",
    "939539968a293ceccabeedf1d7f059ee6d2b9080164cc34d5267445be699d267"
  ],
  [
    "labs/nearfield-multitarget/runtime/worker.mjs",
    "4b456a678db81236266365071191f30e6ff1b7182e00b2ec6edc94f848944106"
  ]
]);
const perceptivePublicFiles=new Map([
  ["labs/perceptive-bsbl/REPAIR-V2.md", "7f26551d8a4e13932eb259934445599cee742aa0f3fdd58bcb9cf4186a795f00"],
  [
    "assets/data/perceptive-bsbl/ACCEPTANCE-V2.md",
    "1f8f6736ae81e1a39754223d90bf4e7d355764cf51c812572f6f195d64607629"
  ],
  [
    "assets/data/perceptive-bsbl/API.md",
    "da138321c196a10f31b8d538c1f0471125a47329286bb5af04f87ca44aecaf99"
  ],
  [
    "assets/data/perceptive-bsbl/EXPERIMENT-PLAN.json",
    "08b71d148def86b195a75fee41b1fb7089ee8ab964bb678c18909d0cd7dab679"
  ],
  [
    "assets/data/perceptive-bsbl/INDEPENDENT-ACCEPTANCE.md",
    "921f20bee47211c14507e9604cb42cc18cc5c8511ec385a66bdc9de52349759b"
  ],
  [
    "assets/data/perceptive-bsbl/MANIFEST.json",
    "7efb99af1382fe39adc8348e168d66b29f9d1ca13d232f076827e2f1e6e3d6fc"
  ],
  [
    "assets/data/perceptive-bsbl/REPAIR-DELTA.md",
    "ab28c2183d48194ad5576145a1d161662961eeb8fcfc275fd1551a15100e9bf4"
  ],
  [
    "assets/data/perceptive-bsbl/REPORT.md",
    "bf49cbe2035a858400eff562f3859ba5de87079ccee834f88fb659da3ec200a3"
  ],
  [
    "assets/data/perceptive-bsbl/SOURCE-CONTRACT.md",
    "4ee990001696b08decce4b738f9bcf18b56dec25b187557ae50a188de8028d18"
  ],
  [
    "assets/data/perceptive-bsbl/SOURCE-LINKS-HASHES.json",
    "5e28aa329ed305835b72bc62211803631cb41562ab33c3463add3108382d8965"
  ],
  [
    "assets/data/perceptive-bsbl/ambiguity-aware-metrics.json",
    "a4544489ade22efaf8c24da5b2a4ebdf8773bed9d38434700f2b70080d0940ab"
  ],
  [
    "assets/data/perceptive-bsbl/calibration.json",
    "bde43a8f8f1a6a57c94db79c98ed47ee51e5f66d6cf4095ebc51e652338f47ad"
  ],
  [
    "assets/data/perceptive-bsbl/execution-provenance.json",
    "5c7cb3f77d943e3199d49c2c04340bafe9ea66e50f937326dce9d9af7606cc44"
  ],
  [
    "assets/data/perceptive-bsbl/summary.json",
    "e1d90bd33a79cfef33bf29c53bee4112c1e12a877f0f008a6f204325eac46777"
  ],
  [
    "labs/perceptive-bsbl/README.md",
    "3c9bdcf40dde3dd7a19a4414886f861a23f7397f58f31e57fbde910f9b9ad9f2"
  ],
  [
    "labs/perceptive-bsbl/check-worker.mjs",
    "7f39df950ee2008c70f25811968dc83eeee1a6473fc427c66ea3600323e728c4"
  ],
  [
    "labs/perceptive-bsbl/lesson.css",
    "88eb3b03c73cc35a3419387b64275f02db8728af6c46b57a6e410f8b46e04ecb"
  ],
  [
    "labs/perceptive-bsbl/lesson.mjs",
    "2c227befd0eecaff551a7fa63cf2b9e1cf1fabd06707669213be5cd97a157a57"
  ],
  [
    "labs/perceptive-bsbl/plots.mjs",
    "dc5dffb8d1270303e528c3e2b14c91f7cd5596b543ba9c4a088081a6d3b97a93"
  ],
  [
    "labs/perceptive-bsbl/runtime/budget.mjs",
    "603f29be21da5753485d38db4187d81c2de9b699f956c119c71262a4da6e9491"
  ],
  [
    "labs/perceptive-bsbl/runtime/build-info.mjs",
    "fe5e5191d70c276b54e98a32d717ded791137441629e820e5c434bbeb9cceaa8"
  ],
  [
    "labs/perceptive-bsbl/runtime/check-record.mjs",
    "5ca5af74bf146c41f08f9e39f27f7fcba381d2093955365d42a7265ae40e2f78"
  ],
  [
    "labs/perceptive-bsbl/runtime/client.mjs",
    "e801bb6cdc43d3f41f67b0e44a4a9cfa231afec8ef81d7131e519d4d8ebb0746"
  ],
  [
    "labs/perceptive-bsbl/runtime/complex.mjs",
    "23c73626e904de547abe59108dc90a3dcb92c0ebbaf63a981fdf394c12cfb63a"
  ],
  [
    "labs/perceptive-bsbl/runtime/evaluation.mjs",
    "6ad9250411da235c381d7e97008de9f7d5045ff575c1c1d5d6c95d2914a89bc3"
  ],
  [
    "labs/perceptive-bsbl/runtime/model.mjs",
    "7dcda312eac442c68f1698b42d9cbcf30264a6ccf47039698d006b31bde8bc33"
  ],
  [
    "labs/perceptive-bsbl/runtime/record.mjs",
    "594bf95306ded22352b047a5ddea7c9be070516b45bc431be129f213d4c8c5f5"
  ],
  [
    "labs/perceptive-bsbl/runtime/runner.mjs",
    "e780a1bfa10871b711762243550e6cf27e7e1925f6e4cd5e3e7493a118516dda"
  ],
  [
    "labs/perceptive-bsbl/runtime/schema.mjs",
    "c3ed85625e2065063ea9805a83027c9f601dcbdbd237a7ae7b25050e7c33c212"
  ],
  [
    "labs/perceptive-bsbl/runtime/solver.mjs",
    "5abd5230f86ecf0b701fff5a77e7bbee1bdc8e2bdfd95f096b8df698aef34977"
  ],
  [
    "labs/perceptive-bsbl/runtime/worker.mjs",
    "96614b7de0a5983f67ece8b13704f1ffcfe3c4b7609b0c17edc7f215ae9f6402"
  ],
  [
    "labs/perceptive-bsbl/session.mjs",
    "9cc64f36e9ad71b62ac8ccf5b00026b9787477b0f72e1a9d0396572716b8394a"
  ],
  [
    "labs/perceptive-bsbl/view.mjs",
    "35f3b882ffb87a61d6476ea31f830c1b82576abccb261c6dd3ba32c392581592"
  ],
  [
    "scripts/validation/perceptive-bsbl/AUDIT-ADAPTATION.md",
    "307d0e0b3fb21a3c359b7da8863361fef8cb9a787acd5f1b20d183a5bf8989d5"
  ],
  [
    "scripts/validation/perceptive-bsbl/check-download.py",
    "7582e6a32316c396f58eb22c17a4a032b3312ca009fb8578c81c83fbd4b4c2e6"
  ],
  [
    "scripts/validation/perceptive-bsbl/oracle/REFERENCE-FREEZE.json",
    "75e4b9bb86aacda343739c52a0810edcd38f5e6818c115abfd8a37916d3dcdf8"
  ],
  [
    "scripts/validation/perceptive-bsbl/oracle/dense_oracle.py",
    "2745e67d3c2f064fea819cabe20673180713f74139c0101a2a18973a7e7cb4ac"
  ],
  [
    "scripts/validation/perceptive-bsbl/oracle/reference.py",
    "2a78defdf9f01ad7af14e7cd16b48d20b89137292abf471d12eaeacf604c5c70"
  ]
]);
// Independently reviewed narrow-grid CSS correction; scientific/runtime policies stay frozen.
if(perceptivePublicFiles.get('labs/perceptive-bsbl/lesson.css')!=='88eb3b03c73cc35a3419387b64275f02db8728af6c46b57a6e410f8b46e04ecb')throw Error('Unexpected original Perceptive CSS policy');
perceptivePublicFiles.set('labs/perceptive-bsbl/lesson.css','97fa3d71368ca3ba4c8e506aaf77f661558c1a5b4702f597657da81e51df210e');
const sensingOtfsPublicFiles=new Map([
  [
    "labs/otfs-sensing-assisted/lesson/README.md",
    "0f8894528611e86db462f6a1a20bed567445aa02e150749806e19d25ecf40892"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/adapter.mjs",
    "d32b392228318a872193076556bdba8979c0185f361e8a4a427182a129507af6"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/lesson.css",
    "7a464c20a0d6dc9876cd83f0c1a8f9f11c033802a5a39d866554aae99e5266d5"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/lesson.mjs",
    "c36424aac31011d7ff1b80d2a84964d29b91a1ef28c15c02eb1454eb77c81431"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/offline-reference.mjs",
    "3558bfafaef4ba90231e2c4be3a7d47c8401d659363c3f596a62ee368f7a1194"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/record.mjs",
    "9114d8f9e7d891db68cde4d867d2ca73d8d662bc23a1e27c5b8795b16226f28b"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/session.mjs",
    "1cf1ff661c504a5443110b88c158076521f5e07e72c5e1c5a2b5e05f879a3879"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/tests/record-oracle.py",
    "c0315b3722073dddfede9ccdaecdae3629e40710983d4d88310313fa257ef321"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/tiny-reference.mjs",
    "62e15ebfe822951ad9a4df49b5ef07c037ad34eab33f32a7f2b5cf74d60bf472"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/js/codec.js",
    "a69320e0884407594f76bc5d2779f84e9b6e21ce7700f221f355f648962d2e4b"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/js/evaluation.js",
    "52e8b5575f2bb6c76df8186a790bdca446c6cd44e6094ba42e43027d773ed017"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/js/receiver.js",
    "1569d209f3cd6b3f7c2cd93e3d2e0340b569ff2967838f4370b02463e76fadcd"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/js/validation.js",
    "63a012ba71bde644d67beb835e68d15951c0fd5f004b31f1ef7ecf6e7520f1ea"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/package.json",
    "cb1f28255cca749d4608c19ed02d0898d93133a250c58c1cb396cf3b68ec8975"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/worker/client.js",
    "e7f37c75dea265d4c091f3710fe539129fee174ca4950dd85994948ab51958f4"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/worker/protocol.js",
    "4201112be861f495f611b34a5db2dbee144fe62ab7d0f093bb25e72be7b5b0c1"
  ],
  [
    "labs/otfs-sensing-assisted/runtime/worker/receiver-worker.js",
    "9805fb429d6056b17ab53a3f74dbb768a5deb6d34ed789fe1b056c7322d372a5"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/ACCEPTANCE.json",
    "dd1f7235bab149c1fb160ece6270e40b62a0c6f0c9ddd6afbe1f14a80e01f620"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/LESSON-FREEZE-V2.1.json",
    "f7ab9392d1767cf8a6367b72874312e2624153e167f587b96b4eed3b5f13b8e9"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/LESSON-FREEZE-V2.json",
    "479ede7c7c61dbc08497f71693c812068802f7cb5bd135599ab41cfb20300125"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/REPAIR-V2.1.md",
    "4d5bc09986d0827121c35620d614b506924bbd6c5ee5edc08003a348d384995e"
  ],
  [
    "labs/otfs-sensing-assisted/lesson/REPAIR-V2.md",
    "bfecfd34716426d28be52184cd3b8dc808a58156a06e2bbcd2ba655f28811963"
  ]
]);
const sensingOtfsJsModules=new Set([
  "labs/otfs-sensing-assisted/runtime/js/codec.js",
  "labs/otfs-sensing-assisted/runtime/js/evaluation.js",
  "labs/otfs-sensing-assisted/runtime/js/receiver.js",
  "labs/otfs-sensing-assisted/runtime/js/validation.js",
  "labs/otfs-sensing-assisted/runtime/worker/client.js",
  "labs/otfs-sensing-assisted/runtime/worker/protocol.js",
  "labs/otfs-sensing-assisted/runtime/worker/receiver-worker.js"
]);
const pilotPatternPublicFiles=new Map([
  [
    "labs/pilot-pattern/README.md",
    "3f2a452aacb0c2e63546f9fbbf4aa206086c9d8b0ce9797a56f9dbbfb31cabda"
  ],
  [
    "labs/pilot-pattern/lesson.css",
    "b8f59d4ba8ecb30aba5739271c665f59b8f85fc1bd63f6b10b6a46659c5fec17"
  ],
  [
    "labs/pilot-pattern/lesson.mjs",
    "9a0665b92d157fd64c9569db5fc236f73b2735c3303f4ee088400149288c4246"
  ],
  [
    "labs/pilot-pattern/runtime/core.mjs",
    "53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f"
  ],
  [
    "labs/pilot-pattern/runtime/processing.mjs",
    "48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7"
  ],
  [
    "labs/pilot-pattern/runtime/protocol.mjs",
    "0d3fcc205699d7d36ad9d35556d9c8f105d0124d03dad27f29995dbbffa474d1"
  ],
  [
    "labs/pilot-pattern/runtime/records.mjs",
    "1982bfa3c17a479c8fb9e26cd5fd270a792c677b4a2e2f301ae89b6ca78a7c28"
  ],
  [
    "labs/pilot-pattern/runtime/worker.mjs",
    "b157c3560b5126417150bd5d7237389ed6c1b9c8c1867bdf7cbab942c705a2c2"
  ],
  [
    "labs/pilot-pattern/session.mjs",
    "96a7bb28fb6bbb4a6cd4ab94e2910adb515486d6ff183cb53caab5658ffcc267"
  ],
  [
    "labs/pilot-pattern/strict-json.mjs",
    "4d539f0a15a957649029bd8190d73d50425a202f2446270dc3285223f25fe359"
  ],
  [
    "assets/data/pilot-pattern/ACCEPTED-PORT-MANIFEST.json",
    "08c3947e6e3d49b34b47035231d307c34a0a373bc5beb2532695ed426e7dbd80"
  ],
  [
    "assets/data/pilot-pattern/CONTRACT.md",
    "5f4d8b73aecf1856adfd973f356b5d4243e911ad881961c6a015c2cc715ba66c"
  ],
  [
    "assets/data/pilot-pattern/PORT-ACCEPTANCE.md",
    "2bb507afd973ae56b6cf925c3b6b814698ac3c2887633579d8e5613c5871c0bb"
  ],
  [
    "assets/data/pilot-pattern/PORT-PROTOCOL.md",
    "241dc5e9995619cf63f66b9a3e6f5d937ce86a390be3c00e48f6d63389308ba0"
  ],
  [
    "assets/data/pilot-pattern/REPORT.md",
    "1db33ae80bc14b4b7bfce9fb901a1209eadbbf5d177a5c3b74973e7b0055e386"
  ],
  [
    "assets/data/pilot-pattern/offline-summary.json",
    "4a8ba79b2139d95e802561f746f478fc4b62411f7ba941ebfc4316673e5cea8f"
  ],
  [
    "labs/pilot-pattern/FUNCTIONAL-FREEZE-V1.json",
    "b6495c2b7a3d6b235742a0fccdd6c486433c93d1a7489628a81bd10ce90513f0"
  ],
  [
    "labs/pilot-pattern/FUNCTIONAL-FREEZE-V2.json",
    "6c433bafbb83c6388e24e162f1b7bb685a4993e97512cc4bac5b0c58782cbedf"
  ],
  [
    "labs/pilot-pattern/FUNCTIONAL-FREEZE-V3.json",
    "f7eecaa8b3471936524c2bd1d7230508f7a2e92fc06094e4b4c184a3bcdfad9d"
  ],
  [
    "labs/pilot-pattern/FUNCTIONAL-FREEZE-V4.json",
    "18ad28cf435178d526b331eb9a2764a622fa54e3af5d972536aa8ed25e68d04d"
  ],
  [
    "assets/data/pilot-pattern/lesson-review/ACCEPTANCE.md",
    "7f302ec2b5884e6f5c3ead0103d44f9a70e8963b56d39555952b9ad24b209cc2"
  ],
  [
    "assets/data/pilot-pattern/lesson-review/ACCEPTANCE.json",
    "3a347d9b02df3fcc5271fb02306b4a69e88d75bde74a63fb0ebd96347f23101a"
  ],
  [
    "assets/data/pilot-pattern/lesson-review/ACCEPTED-SOURCE-MANIFEST.json",
    "18ad28cf435178d526b331eb9a2764a622fa54e3af5d972536aa8ed25e68d04d"
  ]
]);
// Separate exact CSS-only narrow-screen correction; numerical module profiles are unchanged.
if(perceptivePublicFiles.get('labs/perceptive-bsbl/lesson.css')!=='97fa3d71368ca3ba4c8e506aaf77f661558c1a5b4702f597657da81e51df210e')throw Error('Unexpected pre-narrow Perceptive CSS identity');
perceptivePublicFiles.set('labs/perceptive-bsbl/lesson.css','13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14');
if(pilotPatternPublicFiles.get('labs/pilot-pattern/lesson.css')!=='b8f59d4ba8ecb30aba5739271c665f59b8f85fc1bd63f6b10b6a46659c5fec17')throw Error('Unexpected pre-narrow pilot CSS identity');
pilotPatternPublicFiles.set('labs/pilot-pattern/lesson.css','4c0cae10a4b3960e0bccc2dbf591e057013916a3f118eef5ebfe6d0f32cc1249');
// Separate exact desktop-only navigation correction; accepted narrow and numerical endpoints stay frozen.
if(perceptivePublicFiles.get('labs/perceptive-bsbl/lesson.css')!=='13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14')throw Error('Unexpected pre-desktop Perceptive CSS identity');
perceptivePublicFiles.set('labs/perceptive-bsbl/lesson.css','30c4e563393c48460c7b1cf19d820223e00744056694cf8a4ee3f38b45574c95');
if(pilotPatternPublicFiles.get('labs/pilot-pattern/lesson.css')!=='4c0cae10a4b3960e0bccc2dbf591e057013916a3f118eef5ebfe6d0f32cc1249')throw Error('Unexpected pre-desktop pilot CSS identity');
pilotPatternPublicFiles.set('labs/pilot-pattern/lesson.css','4c00a92b40d0b50735a459492831a139782f76eb357ca81470f8a884baf07350');
const dualArrayPublicFiles=new Map([
  [
    "labs/dual-array/README.md",
    "bfe70bc4e069040aadaec4bb0989c19a50a515b01f61ce0da9a0c83ee1e6c8bc"
  ],
  [
    "labs/dual-array/lesson/model.mjs",
    "4608ebcfc164858358b884b2313fb3b8ccd373aea9ada8e57cec00d98a95b7e7"
  ],
  [
    "labs/dual-array/lesson/mount.mjs",
    "d2a2bd8468e5aa1ca49b5e9361675362be0f216f7069af1b437322715be34848"
  ],
  [
    "labs/dual-array/lesson/session.mjs",
    "5768801f8afeb248f77f844f5fd64666b3f0ba0fc25321675b72844bf5dd3664"
  ],
  [
    "labs/dual-array/lesson/view.mjs",
    "8f3907a4bc5202432ce9ceda1b7f456e1175a775123a94d0ef286124d4e69c10"
  ],
  [
    "labs/dual-array/lesson.css",
    "edf7126ca31eba6bdb657710cf735d84e755268aa8677650daa984c0e8804d81"
  ],
  [
    "labs/dual-array/lesson.mjs",
    "c6b83930e3aec78eb3b4c9c8976c62d6d13842213a2dbb59ff0c2eda18c8c781"
  ],
  [
    "labs/dual-array/runtime/client.mjs",
    "16e2d61c07929a57520e25e3ffe2ba6d89998fbfdbbc0b8edee7415dabbfd824"
  ],
  [
    "labs/dual-array/runtime/kernel.mjs",
    "0292203f5dd4d0ff39592f892a332c5333f2ba8caf894effdc4a81d43702c32d"
  ],
  [
    "labs/dual-array/runtime/records.mjs",
    "7340f93036f1d2abbf833e88e73341820c14e5432d39a7ea7e4844e99b642158"
  ],
  [
    "labs/dual-array/runtime/worker.mjs",
    "b2b2376d0b3c62a4e2ec58a84a1f95f31a0ddb1023d9a19940445f641d84f94f"
  ],
  [
    "assets/data/dual-array/RUNTIME-ACCEPTANCE.json",
    "248a7e3f1f4954999677fdc6077a0f04ed0693754e28c72ceba696fb3583b6f6"
  ],
  [
    "assets/data/dual-array/RUNTIME-ACCEPTANCE.md",
    "6f62999886b5a118d245940632733b2dcc9ac33ca9a9bda5d4bc919adc3a45c3"
  ],
  [
    "assets/data/dual-array/historical-statistics.json",
    "e54cc91dbc25f25b48584dedd98b885305eed33e4e7bc2c22eeb6a8bdb98018b"
  ],
  [
    "assets/data/dual-array/lesson-review/ACCEPTANCE.md",
    "6d25b950b2e5c0a50e04e682a601f66dcc4fd9f17815cc14b3a64447ca5fdf8e"
  ],
  [
    "assets/data/dual-array/lesson-review/ACCEPTANCE.json",
    "6ae4f83aa72a8356b28bcdf19665a722f1d2d18529803b9b17e34841d5d39ba5"
  ],
  [
    "assets/data/dual-array/lesson-review/AUDIT-MANIFEST.json",
    "eb7b204b0ea162f6dfb1c0d2ee1ea69a13f20571cbbb0c4c44363fc768741f21"
  ]
]);
// Exact accepted browser repair overlay. Historical profile constants above remain frozen.
if(reviewedProfiles.get('labs/dual-array/runtime/client.mjs').sha256!=='16e2d61c07929a57520e25e3ffe2ba6d89998fbfdbbc0b8edee7415dabbfd824'||dualArrayPublicFiles.get('labs/dual-array/runtime/client.mjs')!=='16e2d61c07929a57520e25e3ffe2ba6d89998fbfdbbc0b8edee7415dabbfd824'||dualArrayPublicFiles.get('labs/dual-array/lesson.css')!=='edf7126ca31eba6bdb657710cf735d84e755268aa8677650daa984c0e8804d81')throw Error('Unexpected prior dual-array browser identity');
reviewedProfiles.set('labs/dual-array/runtime/client.mjs',{...reviewedProfiles.get('labs/dual-array/runtime/client.mjs'),sha256:'d78605231b69be6d7468cc4e08dbcd1c4483b091d543875071e40e672aa5017f'});
dualArrayPublicFiles.set('labs/dual-array/runtime/client.mjs','d78605231b69be6d7468cc4e08dbcd1c4483b091d543875071e40e672aa5017f');
dualArrayPublicFiles.set('labs/dual-array/lesson.css','a26465d08bea5d94ee331ab8e2ced8784ab85261018f21e151b870be4fb784d4');
// Exact reviewed record portability leaf; receiver and original profile constants stay frozen.
if(reviewedProfiles.get('labs/dual-array/runtime/records.mjs').sha256!=='7340f93036f1d2abbf833e88e73341820c14e5432d39a7ea7e4844e99b642158'||dualArrayPublicFiles.get('labs/dual-array/runtime/records.mjs')!=='7340f93036f1d2abbf833e88e73341820c14e5432d39a7ea7e4844e99b642158')throw Error('Unexpected prior dual-array records identity');
reviewedProfiles.set('labs/dual-array/runtime/records.mjs',{...reviewedProfiles.get('labs/dual-array/runtime/records.mjs'),sha256:'0c9fda6852ef58b3dd942b5bc8bb911be0ecccbffc36605b9a2f73a7ec043854'});
dualArrayPublicFiles.set('labs/dual-array/runtime/records.mjs','0c9fda6852ef58b3dd942b5bc8bb911be0ecccbffc36605b9a2f73a7ec043854');
// Separately reviewed cooperative FIM closure; existing profiles retain their identities.
for(const [file,profile] of require('./cooperative-clusters-dependencies.cjs').reviewedProfiles){if(reviewedProfiles.has(file))throw Error('Duplicate cooperative profile');reviewedProfiles.set(file,profile);}
const isModuleFile=file=>file.endsWith('.mjs')||sensingOtfsJsModules.has(file);
const reviewedHashPaths=new Map([...reviewedProfiles].map(([file,profile])=>[profile.sha256,file]));
// Fixed-quarter causal module identities; no fetch, Worker, or dynamic imports.
for(const [file,profile] of require('./causal-capacity-dependencies.cjs').reviewedProfiles){if(reviewedProfiles.has(file))throw Error('Duplicate causal profile');reviewedProfiles.set(file,profile);}
const reviewedPolicies=new Set(['reviewed-cooperative-runtime','reviewed-factory-endpoints','reviewed-enumerated-imports','reviewed-gaussian-runtime','reviewed-cellfree-runtime','reviewed-sensing-otfs-runtime','reviewed-perceptive-runtime','reviewed-dual-array-runtime']);
function reviewedProfileEdges(file,source,c,profile){
 if(c.sha256!==profile.sha256)throw Error('Unreviewed frozen runtime source hash: '+file);
 if(c.runtimeEdges.length!==profile.runtimeEdges.length)throw Error('Reviewed runtime endpoint set mismatch: '+file);
 for(let i=0;i<profile.runtimeEdges.length;i++){
  const expected=profile.runtimeEdges[i],actual=c.runtimeEdges[i];
  fields(actual,Object.keys(expected),'reviewed runtime edge');
  if(Object.keys(expected).some(key=>actual[key]!==expected[key]))throw Error('Reviewed runtime endpoint mismatch: '+file);
 }
 for(const literal of new Set([...profile.sourceLiterals,...profile.runtimeEdges.map(e=>e.literal)]))if(source.split(literal).length!==2)throw Error('Reviewed runtime source shape mismatch: '+file);
 return profile.runtimeEdges.map(e=>({from:file,url:e.url,kind:e.kind==='node-builtin'?'reviewed-node-builtin':e.kind==='worker'?'reviewed-worker':profile.edgeKind}));
}
function moduleDependencies(modules,contract,identities){
 fields(contract,['schemaVersion','modules'],'module runtime contract');if(contract.schemaVersion!==1||!Array.isArray(contract.modules))throw Error('Invalid module runtime contract');
 const declared=new Map(),actual=new Map();
 for(const c of contract.modules){
  fields(c,['public','sha256','runtimeEdges','runtimePolicy','unverifiedInputs'],'module contract entry');
  if(typeof c.public!=='string'||!isModuleFile(c.public)||declared.has(c.public)||!/^[a-f0-9]{64}$/.test(c.sha256)||!Array.isArray(c.runtimeEdges))throw Error('Invalid or duplicate module contract entry');
  const hasRuntimeEdges=c.runtimePolicy==='literal-workers'||reviewedPolicies.has(c.runtimePolicy);
  if(!['literal-workers','no-runtime-loads','command-line-inputs-unverified',...reviewedPolicies].includes(c.runtimePolicy)||!Array.isArray(c.unverifiedInputs)||c.unverifiedInputs.some(x=>typeof x!=='string'||!x)||(hasRuntimeEdges!==(c.runtimeEdges.length>0))||((c.runtimePolicy==='command-line-inputs-unverified')!==(c.unverifiedInputs.length>0)))throw Error('Invalid module runtime boundary');
  const expectedPath=reviewedHashPaths.get(c.sha256);
  if(expectedPath&&c.public!==expectedPath)throw Error('Reviewed frozen runtime path mismatch: '+c.public);
  const profile=reviewedProfiles.get(c.public);
  if((profile&&c.runtimePolicy!==profile.runtimePolicy)||(!profile&&reviewedPolicies.has(c.runtimePolicy)))throw Error('Unreviewed module runtime policy: '+c.public);
  declared.set(c.public,c);
 }
 for(const m of modules){fields(m,['file','source'],'module input');if(typeof m.file!=='string'||typeof m.source!=='string'||actual.has(m.file))throw Error('Invalid or duplicate module input');actual.set(m.file,m);}
 if(!Array.isArray(identities))throw Error('Missing complete public module identities');
 const seenIdentities=new Map();
 for(const identity of identities){
  fields(identity,['file','sha256'],'public module identity');
  if(typeof identity.file!=='string'||!/^[a-f0-9]{64}$/.test(identity.sha256)||seenIdentities.has(identity.file))throw Error('Invalid or duplicate public module identity');
  if(['labs/dual-array/','assets/data/dual-array/'].some(prefix=>identity.file.startsWith(prefix))&&dualArrayPublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed dual-array public path or hash: '+identity.file);
  if(['labs/pilot-pattern/','assets/data/pilot-pattern/'].some(prefix=>identity.file.startsWith(prefix))&&pilotPatternPublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed pilot-pattern public path or hash: '+identity.file);
  if(identity.file.startsWith('labs/cellfree-maprt/')&&cellfreePublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed Cell-Free public path or hash: '+identity.file);
  if(identity.file.startsWith('labs/nearfield-multitarget/')&&multitargetPublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed multi-target public path or hash: '+identity.file);
  if(['labs/perceptive-bsbl/','assets/data/perceptive-bsbl/','scripts/validation/perceptive-bsbl/'].some(prefix=>identity.file.startsWith(prefix))&&perceptivePublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed Perceptive public path or hash: '+identity.file);
  if(identity.file.startsWith('labs/otfs-sensing-assisted/')&&sensingOtfsPublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed sensing-assisted OTFS public path or hash: '+identity.file);
  const expectedPath=reviewedHashPaths.get(identity.sha256);
  if(expectedPath&&identity.file!==expectedPath)throw Error('Reviewed frozen runtime path mismatch: '+identity.file);
  seenIdentities.set(identity.file,identity.sha256);
 }
 for(const {file,source}of modules)if(seenIdentities.get(file)!==sha(source))throw Error('Missing or changed public module identity: '+file);
 if(declared.size!==actual.size||[...declared.keys()].some(f=>!actual.has(f)))throw Error('Unreviewed or missing module source in runtime contract');
 const edges=[];
 for(const {file,source}of modules){
  const c=declared.get(file);if(!c||sha(source)!==c.sha256)throw Error('Unreviewed module source hash: '+file);
  const profile=reviewedProfiles.get(file);
  if(profile){edges.push(...reviewedProfileEdges(file,source,c,profile));continue;}
  // Keep the existing literal-workers policy's exact constructor contract.
  const targets=new Set();
  for(const e of c.runtimeEdges){fields(e,['kind','url','literal'],'reviewed runtime edge');if(e.kind!=='worker'||typeof e.url!=='string'||!e.url.startsWith('./')||!e.url.endsWith('.mjs')||typeof e.literal!=='string'||!e.literal||targets.has(e.url))throw Error('Invalid or duplicate reviewed runtime edge');targets.add(e.url);const expected="new Worker(new URL('"+e.url+"',import.meta.url),{type:'module'})";if(e.literal!==expected||source.split(e.literal).length!==2)throw Error('Reviewed runtime constructor mismatch: '+file);edges.push({from:file,url:e.url,kind:'reviewed-worker'});}
 }
 for(const {file,specifiers}of staticModuleDependencies(modules))for(const url of specifiers)edges.push({from:file,url,kind:'static-module'});
 return edges;
}
module.exports={staticModuleDependencies,moduleDependencies,isModuleFile};
