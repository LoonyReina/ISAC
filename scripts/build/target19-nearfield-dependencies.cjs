'use strict';
const requiredFiles={
  "labs/near-field/research/BASELINE.json": "9f395c2ca3e27216f453aeb4024a67e4880ae1150035e40b7c1884712d716ef8",
  "labs/near-field/research/IMPLEMENTATION-FREEZE.json": "3839ace11911b56a6dd86bc257775a6a49b3958752a1d528d2eb952e3c274b8a",
  "labs/near-field/research/README.md": "a7714499d6bcdf8fb13e20889fc83bd2303bcf8a49b37368acbc982ca57e6dc3",
  "labs/near-field/research/RESTORATION-BOUNDARY.md": "415a995fe509612e4551cf4b2bf0561c8dd376be1bcba3df7b822351363f41d2",
  "labs/near-field/research/controller.mjs": "d114c76490471281486827ddaee118049147a15c4c6fd1c6cf970f48120cb1fb",
  "labs/near-field/research/defaults.mjs": "e3a6fcca0041add3a4811b4fdf417c83f77c37d9cd2058c767d4a69f96ca8a6b",
  "labs/near-field/research/entry.mjs": "495be6ba115c8153cffc1d7e358d2d57620a9b4d3295444c4d4c736365f0370a",
  "labs/near-field/research/precomputed/source-chain.json": "6b349173fa6f16abe3828a508a74f85e22b4f9a6485500d7514664f0e488590e",
  "labs/near-field/research/precomputed/tx-baseline-matrices.json": "68b6460862385462511d77bf8bb921c709140014eb077915f1e998ae2f931568",
  "labs/near-field/research/precomputed-loader.mjs": "ada0a82d284affd18e44db88609af9e93400ce3d034886f8dcb663043fc557ae",
  "labs/near-field/research/reports/author-tests.txt": "dbe2727584a176c740149b4dcadb0c7a01e8a04de266a51bda2defeafb2bfb7e",
  "labs/near-field/research/reports/node-cost.json": "126f25052d0eacc66ff02c59d0112659c498a92259a1a93ea9bf651d0a4afc25",
  "labs/near-field/research/research.css": "47e7e6e5667d09d2376f6d1de4e6d3aff8daa19cab6c1d6411056d976c0fb142",
  "labs/near-field/research/restoration-summary.json": "8a55f82c299a23ed565801bfbb387c92c12673c16162b8d4b42a883e68024576",
  "labs/near-field/research/runtime/CHAIN-FREEZE.json": "50671d38851d0e86a944dd0aaf462f209d05302bc2aad73b78cf02d320529123",
  "labs/near-field/research/runtime/CONTRACT.json": "b9ea2fd6c320517906b1cc40f2a9fe9a127c1caee477766ecfcdd0ee887a5b28",
  "labs/near-field/research/runtime/MUSIC-FREEZE.json": "3493c308a9cb80fcc9f972d41438f56ab2e99e65a5efb13a932f7b208c0817d4",
  "labs/near-field/research/runtime/SOLVER-FREEZE.json": "1754d7e1a04e9ecd78aebc82c3157d7f6ea818107ffc3ea30d215664b509a90f",
  "labs/near-field/research/runtime/fixtures/source-input.json": "e8efb9769a544742a9ddfffcd61b30deadb30034a34fe1f9359da17f94c6bb74",
  "labs/near-field/research/runtime/src/adapter.mjs": "a882ee455d015c340b9444818224a8e9b51c86a95be79a100118eb2d97fc1799",
  "labs/near-field/research/runtime/src/contract.mjs": "4f14f868f6b5b730b993c9b7ccaa0815206b09e9a05a3a0dc11abc342926ad1e",
  "labs/near-field/research/runtime/src/experiment.mjs": "4600f18e8cd9ba74a92f499dedb3227a32c7b9d5d7431fa1b737b374b4272990",
  "labs/near-field/research/runtime/src/physics.mjs": "7a1a3abc7d3301bbf4f6c61d1881fa54a96e53becb8c1208881bdd3d81235588",
  "labs/near-field/research/runtime/src/receiver-worker.mjs": "fe4687461c2fe85442a132738527b5dd695f51761fef89b13db7a9470ac3fe27",
  "labs/near-field/research/runtime/src/replay.mjs": "774a56bb18202bb18ac861af2ce344c01a9e8176e4144eb23f590cbbc68a4d42",
  "labs/near-field/research/runtime/src/solver-loader.mjs": "7e734d0e81d4988bfcabf517673b1d6d12f7b9fb07a0c7b2ac70f32ee4fbd250",
  "labs/near-field/research/runtime/src/solver-worker.mjs": "00e425a74b2be201f39b99f6295bda39bd23fe3c3a7b2fe42b006b9586239abd",
  "labs/near-field/research/runtime/src/worker-client.mjs": "ebd7e69157c05099e89c576e6959364b915f950f365f1c22a76847f41d7dea4d",
  "labs/near-field/research/runtime/vendor/music/generator.mjs": "e083b6e981e307cc9b40efa11946a813d1e6ec3203194c2b3f5f47994bbb2406",
  "labs/near-field/research/runtime/vendor/music/receiver.mjs": "16e0df92c3221a56c51f430cb0f3afc29249f496c6bba9d09ffdf456f2a5f981",
  "labs/near-field/research/runtime/vendor/music/worker.mjs": "406463ea7e7c7893dad88912785fe81bf8cdd2f78ef54e8565782aac704733f3",
  "labs/near-field/research/runtime/vendor/solver/core.js": "fa8ecbd09337cebe2c88637e31b30021ec79a431bb71533b0d5ca0c9b6a938de",
  "labs/near-field/research/runtime/vendor/solver/hermitian.js": "da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a",
  "labs/near-field/research/runtime/vendor/solver/linalg.js": "11b0de23151c48a4cedcad17405bf26a610739b22db37378b2d77828af560d0d",
  "labs/near-field/research/runtime/vendor/solver/metrics.js": "eb2fd49e2bbf647da01428ea54dde7cf83d325a0674fe7e262085db006c90e7a",
  "labs/near-field/research/runtime/vendor/solver/model.js": "185be83a6d057f2bb18c4fd9ef591308ae8cd74c03829afd1fc1bf246c6d4bc4",
  "labs/near-field/research/runtime/vendor/solver/numerics.js": "b322a385ac5a780e4a5735f854a80dbc391ceec7a9c32e56f6cc5a2a81cbd782",
  "labs/near-field/research/runtime/vendor/solver/optimizer.js": "2ba6da263fdda103d89d545bf8fcc6c7d5c9ba1705db8e188082ee9e4ccf5d5c",
  "labs/near-field/research/runtime/vendor/solver/package.json": "dbf8353f77358bc12169b7bb7301e1978d5b503e002ee927229a8993672818fc",
  "labs/near-field/research/tx-design-independent-results.json": "9f314de53382dd96625806d61661cf24a001f897a6fe3bc7fff73980c4ec36a3",
  "labs/near-field/research/view.mjs": "d7cf73d30fd321d300ebe8339e372d16c88980ae4e6aca60e31f00333d200362"
};
function target19NearfieldDependencies({identities,pages}) {
 const files=new Map(identities.map(e=>[e.file,e.sha256]));
 for(const [file,h] of Object.entries(requiredFiles))if(files.get(file)!==h)throw Error('Target19 near-field missing/changed '+file);
 const page=pages.find(p=>p.file==='near-field.html');
 if(!page||!page.source.includes('NFR:LEGACY-PREREQUISITE:START')||!page.source.includes('id="research-experiment"')||!page.source.includes('labs/near-field/research/entry.mjs'))throw Error('Target19 near-field mount/basic controls missing');
 return [];
}
module.exports={requiredFiles,target19NearfieldDependencies};
