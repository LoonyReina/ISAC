'use strict';
// NEW recovery release boundary, independently inventoried against published main
// ba68a519430bc39b12d2507276df1e9ab60a6ab5. This is not the lost inverse fixture.
// Required production inventory is unconditional: deleting feature + JSON contracts
// together must fail. Historical generic module fixture semantics remain unchanged.
const crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const requiredFiles={
  "labs/pilot-pattern/lesson.mjs": "c130e713a876cb59500df0e1e7fe16ea6a6af5bbe1c739eb6384c1da505b773a",
  "labs/pilot-pattern/runtime/core.mjs": "53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f",
  "labs/pilot-pattern/runtime/processing.mjs": "48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7",
  "labs/pilot-pattern/runtime/records.mjs": "7ce55df46c4eed6f94254066c6ea7719091d646ad9adf44bac5272c743167f95",
  "labs/pilot-pattern/runtime/calibration.mjs": "be65bec74eabbe6078af5edf2f0e0adebcdc8c9f5809af38369dfc8f54301de5",
  "labs/pilot-pattern/runtime/calibration-data.mjs": "9d2e794a4c8a6a86440be374a8df3d2fa591262bad78e66ddabfce44af245d19",
  "labs/cellfree-maprt/robustness/model.mjs": "a7e67b24381d6f046daa2eedb2e7eb6b326a52eb0f33ac103cebf9f8b59fd280",
  "labs/cellfree-maprt/robustness/panel.css": "614f52ef98555720d66cf80b084b2dde3ead4b587865f892ddd5ad87a5d700ff",
  "labs/cellfree-maprt/robustness/study.json": "7493d6c738e2ceef7a78d5e48c2a612f271c86b3eb8e8900c38dd359876b9b0e",
  "labs/cellfree-maprt/robustness/panel.mjs": "ea9d12495fef6800cbb6b854a941915849ded415d123df27ebbad22598ca057e",
  "otfs-receiver/joint/joint-core.mjs": "e77c420cbe2ad3cd2623a9adfc9af36bbe585d50d8683ef4371248ab0d52328a",
  "otfs-receiver/joint/simulation.mjs": "9fa29d9c8eeb4bf9af2df9a17b81a612fab17f474afd4ebb48533d13ae9d49f0",
  "otfs-receiver/joint/lesson.mjs": "6a53844133637d511d84cc6bb23c2562346bc7a195531001c7b51b5350d44fe0",
  "otfs-receiver/joint/worker.mjs": "72111b25110e79a1cf9e56c11393913f7a0d4c93d926da4bf9220913e4613650",
  "otfs-receiver/joint/waveform.json": "5e14fc4463d819597d4e5a6c1341e8a30d0e9ed2147b4ed6c1469cf20d345a89",
  "otfs-receiver/joint/lesson-fragment.html": "d4e4349c5d3bdba8a31e505e5a35daea8eca10013101846ed6a95d49bc9b5d99",
  "otfs-receiver/joint/joint.css": "c9dce830e3644708dc6e9ced9a9948a40d3d4718f1a27ae32233f34f77e139a5",
  "otfs-receiver/joint/scenes.json": "1e775936672afa6b64645ac3513c4043fbf9d85b3c9c166f4ad532fd380d0586",
  "otfs-receiver/joint/session.mjs": "16e90e36499e8a78500bd3564ad72cdf3be20999cbc3cb2a174622b1bcbfca4b",
  "otfs-receiver/joint/new-offline-summary.json": "5a72a48b8ab8fa8866269cf0c4dcaef02ff320e9e3b3c7d2d1cc11eaf80a550d",
  "assets/data/pilot-pattern/new-calibrated-detection-evidence.tar.gz": "7cbe7f383a6cc5ed182d0c121ade196997f21465e46a204ebc94f9f3ef7f9a2c",
  "assets/data/cellfree-maprt/new-robustness-evidence.tar.xz": "ce96d95303e638df67920daabd1cde982b969423fe3ed1d317715554eab6cc50",
  "assets/data/otfs-joint/new-joint-evidence.tar.xz": "918e3b135d176d1c6dc7990fbf3cf9827f7ecc6a97f70c5186ff57ac2f9dda1b",
  "labs/crb-beamforming/extended-lab/extended/core.js": "1c73151c201fdf2e345f36023bf3f1553d17402d07fe4f5a83a4c39ffb461dae",
  "labs/crb-beamforming/extended-lab/extended/hermitian.js": "da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a",
  "labs/crb-beamforming/extended-lab/extended/linalg.js": "11b0de23151c48a4cedcad17405bf26a610739b22db37378b2d77828af560d0d",
  "labs/crb-beamforming/extended-lab/prototype/index.html": "cd7968c38ff702799db38a761be2f65677612c4886355202d8b9a7c829056c25",
  "labs/crb-beamforming/extended-lab/prototype/app.js": "a23fb6594c9e109331cb661b6fcf07ccee263a7c3ac410f29da4ca9676374000",
  "labs/crb-beamforming/extended-lab/prototype/record.js": "204dc02aca475fed766a497fb1ccbf747b5794579cb87dad00c678500f077cc7",
  "labs/crb-beamforming/extended-lab/prototype/worker.js": "98f38a7e5099c1f2bd893ee84b389bc0783992d96e114a9914c5018d4333ae9e",
  "labs/crb-beamforming/extended-lab/prototype/style.css": "73aa08c0659040d8b0bbd86b51dcdf75f6f91516b3adb4caf8146c80939808a8",
  "labs/crb-beamforming/extended-lab/DERIVATION.md": "427289c6e8c0ee01dfdf8fb4948de61843507949d37f52570d1187d33d8c5ee3",
  "labs/crb-beamforming/extended-lab/SCHEMA.md": "557acc687751c40ecb6e0f06572a14f0ed68781e5a65f71e8b1c84fe4ca666da",
  "labs/crb-beamforming/extended-lab/tests/INDEPENDENT-REVIEW.md": "40f25c7399dca9d6403c1604abab86c44e54cab690ecf4f72f0f5067a083a7e3",
  "labs/crb-beamforming/extended-lab/fresh-evidence/README.md": "c8c019c4d7586fedc7ffc16e93a8f2f4ad5f58b96be9c338d3a702f1270fbee5",
  "labs/crb-beamforming/extended-lab/fresh-evidence/SUMMARY.json": "e3f0b91103f24f58b39ba5257b987f264f9daf580443c9f0c8a2e699b23fbd63",
  "labs/crb-beamforming/extended-lab/fresh-evidence/MANIFEST.json": "dee7617216e2849fa4a0e2ab31cc4ab2f0114bb6facdf1b2ddd1250019ecb8b5",
  "assets/data/crb-beamforming/new-extended-crb-evidence.tar.gz": "ce410550c9e9dd923cece2018e9ce4291d38c18e9ceae7c1d85f53c81f9c8741",
  "joint-beamforming/ssp/ssp-core.mjs": "e88896affd8d4a539b5a8cdf2ad90aed44328bf9e54d33a4d5593fd5bd75b34a",
  "joint-beamforming/ssp/ssp-ui.mjs": "06e6057492d51d3e5dd0214a8e60b27809adc43692b23042d331ba2cebd9404e",
  "joint-beamforming/ssp/ssp.css": "14d316d65d36d558f1d2a3aad512510980ddb55d9ada5aa8a139abe98c579f89",
  "joint-beamforming/ssp/SOURCE-AUDIT.md": "79e25df5fceada4ded95fefe4d00bc087b69002eadd4ec71edf36700dad2f429",
  "joint-beamforming/ssp/ssp-data.json": "5e664f0cbe4d46755603f138ed6342d8344b56ac3693f313ab07f78f16f2affd",
  "joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip": "ee6981ef11b601be5d1af67f52a1e586501f3d08bfc6922974385baba0f738df",
  "otfs-receiver/mppsi/mppsi-worker.mjs": "c1df1bf7053cc5871d19db5c9ee72d6cdf4595ddd75361cbf1597fadec9b1493",
  "otfs-receiver/mppsi/mppsi.css": "7714e8abda287638fb72e5222075445c27ab17904b6c54554b19119314e1b73e",
  "otfs-receiver/mppsi/offline-summary.json": "9792d3031eafff7f47de0c10b256c844f0aaba2d0229522cb62eb76da5309d90",
  "otfs-receiver/mppsi/SOURCE-CONTRACT.md": "bb5833a20747cebc0c4228c0d4cfbfb0bdf7676b1927ed01a70e35fdbfed93ff",
  "otfs-receiver/mppsi/mppsi-ui.mjs": "e1d5883394589111513673045c255856b39748a5671a0b7d684c8e7b0bfdaad9",
  "otfs-receiver/mppsi/mppsi-kernel.mjs": "565c161b020aef6fa6c9c61150d484ca3e88bbabc22547ca7a59f3657ee96dfd",
  "otfs-receiver/mppsi/accepted-kernel.mjs": "80fad52c681d19eaa5d82a6b1d20dd329a6cf40d39c08cd92774f88118d8f1e7",
  "otfs-receiver/mppsi/revalidation/README.md": "1b9311a127bd1ff80e4e44ad3c25e6a2e1b795e8ee59581d38666753034455a6",
  "otfs-receiver/mppsi/revalidation/recovery-report.json": "459f1cfb7e08c83e750396cbb3045a54c4a83ff45f427843fc3abeb3df19caeb",
  "otfs-receiver/mppsi/revalidation/numerical-report.json": "03eddad9342687706c9ec8f1384da284ae21dd18490e1f2cb9c13a72e2fa0049",
  "otfs-receiver/mppsi/revalidation/lifecycle-report.json": "9f04aa6318ac76c0fb74ca4d74b0769615c7c0b3e07deba8c419ec9a912d8c68",
  "joint-beamforming/ssp/ssp-model.mjs": "bd25dda27e62c58ca15f577faf92c562ae2f9cde71c79bcd201bef27f69c7812",
  "joint-beamforming/ssp/ssp-worker.mjs": "4bb95119d2437670e52aac612591a482129f5fa63629130806d9c98b450fa41a",
  "joint-beamforming/ssp/user-load-data.json": "99390536b5d9f711e0bed55d9f298cb6704febe4c1a53174a9ce660cb830a939",
  "joint-beamforming/ssp/teaching-pins.mjs": "f91e5f2f8a476f60ff36778335277f3c0357201839cadede41d565dc70fb1ec5",
  "joint-beamforming/ssp/USER-LOAD-SOURCE-AUDIT.md": "2d093ce41164c680450f5ed64e66f69c1a5b36bd60056ff85a8c12be70aad8b4",
  "joint-beamforming/ssp/evidence/user-load-final-review.json": "684a0cb8a3d46eb871e977588daa5e0b566697fdb4557ec42aec8740e1c2ba76",
  "joint-beamforming/ssp/evidence/REVIEW.md": "dff82767e4594f3702aa47e685ffebdf6233dee2df015dcee21e3e9cb8e078a7",
  "joint-beamforming/ssp/evidence/REAL-MAPPING-REVIEW.json": "1ad5e0a825bf0b9c0cc925afd3d102a3a3c6690531b63c6c01e4ac2a51a35fd5",
  "assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz": "20185af2e4a58a24aa6bfd279f31bcad28fb2be60a8ec94bbe24da84dc21ddeb"
};
const requiredModules={
  "labs/pilot-pattern/lesson.mjs": {
    "sha256": "c130e713a876cb59500df0e1e7fe16ea6a6af5bbe1c739eb6384c1da505b773a",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "labs/pilot-pattern/runtime/core.mjs": {
    "sha256": "53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "labs/pilot-pattern/runtime/processing.mjs": {
    "sha256": "48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "labs/pilot-pattern/runtime/records.mjs": {
    "sha256": "7ce55df46c4eed6f94254066c6ea7719091d646ad9adf44bac5272c743167f95",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "labs/pilot-pattern/runtime/calibration.mjs": {
    "sha256": "be65bec74eabbe6078af5edf2f0e0adebcdc8c9f5809af38369dfc8f54301de5",
    "runtimePolicy": "reviewed-recovery-runtime",
    "runtimeEdges": [
      {
        "kind": "data",
        "url": "./core.mjs"
      },
      {
        "kind": "data",
        "url": "./processing.mjs"
      }
    ]
  },
  "labs/pilot-pattern/runtime/calibration-data.mjs": {
    "sha256": "9d2e794a4c8a6a86440be374a8df3d2fa591262bad78e66ddabfce44af245d19",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "labs/cellfree-maprt/robustness/model.mjs": {
    "sha256": "a7e67b24381d6f046daa2eedb2e7eb6b326a52eb0f33ac103cebf9f8b59fd280",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "labs/cellfree-maprt/robustness/panel.mjs": {
    "sha256": "ea9d12495fef6800cbb6b854a941915849ded415d123df27ebbad22598ca057e",
    "runtimePolicy": "reviewed-recovery-runtime",
    "runtimeEdges": [
      {
        "kind": "data",
        "url": "./study.json"
      }
    ]
  },
  "otfs-receiver/joint/joint-core.mjs": {
    "sha256": "e77c420cbe2ad3cd2623a9adfc9af36bbe585d50d8683ef4371248ab0d52328a",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "otfs-receiver/joint/simulation.mjs": {
    "sha256": "9fa29d9c8eeb4bf9af2df9a17b81a612fab17f474afd4ebb48533d13ae9d49f0",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "otfs-receiver/joint/lesson.mjs": {
    "sha256": "6a53844133637d511d84cc6bb23c2562346bc7a195531001c7b51b5350d44fe0",
    "runtimePolicy": "reviewed-recovery-runtime",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./worker.mjs"
      },
      {
        "kind": "data",
        "url": "./waveform.json"
      },
      {
        "kind": "data",
        "url": "./scenes.json"
      }
    ]
  },
  "otfs-receiver/joint/worker.mjs": {
    "sha256": "72111b25110e79a1cf9e56c11393913f7a0d4c93d926da4bf9220913e4613650",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "otfs-receiver/joint/session.mjs": {
    "sha256": "16e90e36499e8a78500bd3564ad72cdf3be20999cbc3cb2a174622b1bcbfca4b",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "joint-beamforming/ssp/ssp-core.mjs": {
    "sha256": "e88896affd8d4a539b5a8cdf2ad90aed44328bf9e54d33a4d5593fd5bd75b34a",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "joint-beamforming/ssp/ssp-ui.mjs": {
    "sha256": "06e6057492d51d3e5dd0214a8e60b27809adc43692b23042d331ba2cebd9404e",
    "runtimePolicy": "reviewed-recovery-runtime",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./ssp-worker.mjs"
      },
      {
        "kind": "data",
        "url": "./ssp-data.json"
      },
      {
        "kind": "data",
        "url": "./user-load-data.json"
      },
      {
        "kind": "module",
        "url": "./teaching-pins.mjs"
      }
    ]
  },
  "otfs-receiver/mppsi/mppsi-worker.mjs": {
    "sha256": "c1df1bf7053cc5871d19db5c9ee72d6cdf4595ddd75361cbf1597fadec9b1493",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "otfs-receiver/mppsi/mppsi-ui.mjs": {
    "sha256": "e1d5883394589111513673045c255856b39748a5671a0b7d684c8e7b0bfdaad9",
    "runtimePolicy": "reviewed-recovery-runtime",
    "runtimeEdges": [
      {
        "kind": "worker",
        "url": "./mppsi-worker.mjs"
      },
      {
        "kind": "data",
        "url": "./offline-summary.json"
      }
    ]
  },
  "otfs-receiver/mppsi/mppsi-kernel.mjs": {
    "sha256": "565c161b020aef6fa6c9c61150d484ca3e88bbabc22547ca7a59f3657ee96dfd",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "otfs-receiver/mppsi/accepted-kernel.mjs": {
    "sha256": "80fad52c681d19eaa5d82a6b1d20dd329a6cf40d39c08cd92774f88118d8f1e7",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "joint-beamforming/ssp/ssp-model.mjs": {
    "sha256": "bd25dda27e62c58ca15f577faf92c562ae2f9cde71c79bcd201bef27f69c7812",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "joint-beamforming/ssp/ssp-worker.mjs": {
    "sha256": "4bb95119d2437670e52aac612591a482129f5fa63629130806d9c98b450fa41a",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  },
  "joint-beamforming/ssp/teaching-pins.mjs": {
    "sha256": "f91e5f2f8a476f60ff36778335277f3c0357201839cadede41d565dc70fb1ec5",
    "runtimePolicy": "no-runtime-loads",
    "runtimeEdges": []
  }
};
const requiredMounts={
  "pilot-patterns.html": {
    "id": [
      "calibrated-detection"
    ],
    "src": [
      "labs/pilot-pattern/lesson.mjs"
    ],
    "href": [
      "assets/data/pilot-pattern/new-calibrated-detection-evidence.tar.gz"
    ]
  },
  "cellfree-maprt.html": {
    "id": [
      "robustness"
    ],
    "src": [
      "labs/cellfree-maprt/robustness/panel.mjs"
    ],
    "href": [
      "labs/cellfree-maprt/robustness/panel.css",
      "assets/data/cellfree-maprt/new-robustness-evidence.tar.xz"
    ]
  },
  "otfs-receiver.html": {
    "id": [
      "joint-otfs",
      "mppsi-extension"
    ],
    "src": [
      "otfs-receiver/joint/lesson.mjs",
      "otfs-receiver/mppsi/mppsi-ui.mjs"
    ],
    "href": [
      "otfs-receiver/joint/joint.css",
      "assets/data/otfs-joint/new-joint-evidence.tar.xz",
      "otfs-receiver/mppsi/mppsi.css",
      "otfs-receiver/mppsi/revalidation/README.md"
    ]
  },
  "joint-beamforming.html": {
    "id": [
      "ssp-extension",
      "ssp-model",
      "ssp-experiment",
      "ssp-users",
      "ssp-power",
      "ssp-noise",
      "ssp-evidence"
    ],
    "src": [
      "joint-beamforming/ssp/ssp-ui.mjs"
    ],
    "href": [
      "joint-beamforming/ssp/ssp.css",
      "joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip",
      "joint-beamforming/ssp/USER-LOAD-SOURCE-AUDIT.md",
      "joint-beamforming/ssp/evidence/user-load-final-review.json",
      "joint-beamforming/ssp/evidence/REAL-MAPPING-REVIEW.json",
      "assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz"
    ]
  },
  "crb-beamforming.html": {
    "id": [
      "extended-target"
    ],
    "href": [
      "labs/crb-beamforming/extended-lab/prototype/index.html",
      "assets/data/crb-beamforming/new-extended-crb-evidence.tar.gz"
    ]
  }
};
const additionalEdges=[
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/app.js",
    "url": "./worker.js",
    "kind": "recovery-classic-worker"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/worker.js",
    "url": "../extended/hermitian.js",
    "kind": "recovery-importScripts"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/worker.js",
    "url": "../extended/linalg.js",
    "kind": "recovery-importScripts"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/worker.js",
    "url": "../extended/core.js",
    "kind": "recovery-importScripts"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "style.css",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../../../../foundations.html",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../../../../reading.html",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../../../../crb-beamforming.html#extended-target",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../fresh-evidence/SUMMARY.json",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../DERIVATION.md",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../SCHEMA.md",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "../tests/INDEPENDENT-REVIEW.md",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "record.js",
    "kind": "recovery-nested-html"
  },
  {
    "from": "labs/crb-beamforming/extended-lab/prototype/index.html",
    "url": "app.js",
    "kind": "recovery-nested-html"
  }
];

function check(ok,message){if(!ok)throw Error('Recovery production boundary: '+message);}
function unique(items,key,label){const map=new Map();for(const item of items){check(item&&typeof item[key]==='string'&&!map.has(item[key]),'duplicate or invalid '+label);map.set(item[key],item);}return map;}
function recoveryDependencies({identities,modules,contract,pages}){
 check(Array.isArray(identities)&&Array.isArray(modules)&&Array.isArray(pages)&&contract?.schemaVersion===1&&Array.isArray(contract.modules),'complete inputs required');
 const files=unique(identities,'file','identity'),sources=unique(modules,'file','module'),declared=unique(contract.modules,'public','contract'),documents=unique(pages,'file','page');
 for(const file of files.keys())if(['labs/cellfree-maprt/robustness/','otfs-receiver/joint/','otfs-receiver/mppsi/','joint-beamforming/ssp/','labs/crb-beamforming/extended-lab/'].some(prefix=>file.startsWith(prefix)))check(Object.hasOwn(requiredFiles,file),'unreviewed feature asset '+file);
 for(const [file,hash]of Object.entries(requiredFiles))check(files.get(file)?.sha256===hash,'missing or changed required asset '+file);
 const edges=additionalEdges.map(e=>({...e}));
 for(const [file,expected]of Object.entries(requiredModules)){
  const source=sources.get(file),actual=declared.get(file);
  check(source&&sha(source.source)===expected.sha256,'missing or changed required module '+file);
  check(actual&&actual.sha256===expected.sha256&&actual.runtimePolicy===expected.runtimePolicy&&Array.isArray(actual.runtimeEdges)&&Array.isArray(actual.unverifiedInputs)&&actual.unverifiedInputs.length===0,'missing or changed required contract '+file);
  check(JSON.stringify(actual.runtimeEdges.map(({kind,url})=>({kind,url})))===JSON.stringify(expected.runtimeEdges),'changed runtime endpoint inventory '+file);
  for(const edge of expected.runtimeEdges)edges.push({from:file,url:edge.url,kind:'recovery-'+edge.kind});
 }
 for(const [file,attributes]of Object.entries(requiredMounts)){
  const page=documents.get(file);check(page&&typeof page.source==='string','missing required page '+file);
  const tags=[...page.source.replace(/<!--[^]*?-->/g,'').matchAll(/<[a-zA-Z][^>]*>/g)].map(m=>m[0]);
  for(const [attribute,values]of Object.entries(attributes))for(const value of values){
   check(tags.some(tag=>{
    const attrs=new Map([...tag.matchAll(/\s(id|src|href|type|rel)\s*=\s*(["'])([^]*?)\2/g)].map(m=>[m[1],m[3]]));
    if(attrs.get(attribute)!==value)return false;
    if(attribute==='src')return /^<script\b/i.test(tag)&&attrs.get('type')==='module';
    if(attribute==='href')return value.endsWith('.css')?/^<link\b/i.test(tag)&&attrs.get('rel')==='stylesheet':/^<a\b/i.test(tag);
    return true;
   }),'missing mounted '+attribute+' '+file+' '+value);
   if(attribute!=='id')edges.push({from:file,url:value,kind:'recovery-mount'});
  }
 }
 return edges;
}
module.exports={recoveryDependencies,requiredFiles,requiredModules,requiredMounts};
