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
const isModuleFile=file=>file.endsWith('.mjs')||sensingOtfsJsModules.has(file);
const reviewedHashPaths=new Map([...reviewedProfiles].map(([file,profile])=>[profile.sha256,file]));
const reviewedPolicies=new Set(['reviewed-factory-endpoints','reviewed-enumerated-imports','reviewed-gaussian-runtime','reviewed-cellfree-runtime','reviewed-sensing-otfs-runtime']);
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
  if(identity.file.startsWith('labs/cellfree-maprt/')&&cellfreePublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed Cell-Free public path or hash: '+identity.file);
  if(identity.file.startsWith('labs/nearfield-multitarget/')&&multitargetPublicFiles.get(identity.file)!==identity.sha256)throw Error('Unreviewed multi-target public path or hash: '+identity.file);
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
