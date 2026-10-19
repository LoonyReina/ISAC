'use strict';
// NEW direct-baseline recovery profiles, including exact unchanged comparator aliases.
module.exports={reviewedProfiles:new Map([
  [
    "labs/pilot-pattern/lesson.mjs",
    {
      "sha256": "c130e713a876cb59500df0e1e7fe16ea6a6af5bbe1c739eb6384c1da505b773a",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "labs/pilot-pattern/runtime/records.mjs",
    {
      "sha256": "7ce55df46c4eed6f94254066c6ea7719091d646ad9adf44bac5272c743167f95",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "labs/pilot-pattern/runtime/calibration.mjs",
    {
      "sha256": "be65bec74eabbe6078af5edf2f0e0adebcdc8c9f5809af38369dfc8f54301de5",
      "runtimePolicy": "reviewed-recovery-runtime",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": [
        {
          "kind": "data",
          "url": "./core.mjs",
          "literal": "for(const [name,expected]of Object.entries(CALIBRATION.sourceHashes))"
        },
        {
          "kind": "data",
          "url": "./processing.mjs",
          "literal": "for(const [name,expected]of Object.entries(CALIBRATION.sourceHashes))"
        }
      ]
    }
  ],
  [
    "labs/pilot-pattern/runtime/calibration-data.mjs",
    {
      "sha256": "9d2e794a4c8a6a86440be374a8df3d2fa591262bad78e66ddabfce44af245d19",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "labs/cellfree-maprt/robustness/model.mjs",
    {
      "sha256": "a7e67b24381d6f046daa2eedb2e7eb6b326a52eb0f33ac103cebf9f8b59fd280",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "labs/cellfree-maprt/robustness/panel.mjs",
    {
      "sha256": "ea9d12495fef6800cbb6b854a941915849ded415d123df27ebbad22598ca057e",
      "runtimePolicy": "reviewed-recovery-runtime",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": [
        {
          "kind": "data",
          "url": "./study.json",
          "literal": "fetch(new URL('./study.json',import.meta.url),{signal})"
        }
      ]
    }
  ],
  [
    "otfs-receiver/joint/joint-core.mjs",
    {
      "sha256": "e77c420cbe2ad3cd2623a9adfc9af36bbe585d50d8683ef4371248ab0d52328a",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "otfs-receiver/joint/simulation.mjs",
    {
      "sha256": "9fa29d9c8eeb4bf9af2df9a17b81a612fab17f474afd4ebb48533d13ae9d49f0",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "otfs-receiver/joint/lesson.mjs",
    {
      "sha256": "6a53844133637d511d84cc6bb23c2562346bc7a195531001c7b51b5350d44fe0",
      "runtimePolicy": "reviewed-recovery-runtime",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": [
        {
          "kind": "worker",
          "url": "./worker.mjs",
          "literal": "new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})"
        },
        {
          "kind": "data",
          "url": "./waveform.json",
          "literal": "['waveform.json','scenes.json'].map(async path=>"
        },
        {
          "kind": "data",
          "url": "./scenes.json",
          "literal": "['waveform.json','scenes.json'].map(async path=>"
        }
      ]
    }
  ],
  [
    "otfs-receiver/joint/worker.mjs",
    {
      "sha256": "72111b25110e79a1cf9e56c11393913f7a0d4c93d926da4bf9220913e4613650",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "otfs-receiver/joint/session.mjs",
    {
      "sha256": "16e90e36499e8a78500bd3564ad72cdf3be20999cbc3cb2a174622b1bcbfca4b",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "joint-beamforming/ssp/ssp-core.mjs",
    {
      "sha256": "e88896affd8d4a539b5a8cdf2ad90aed44328bf9e54d33a4d5593fd5bd75b34a",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "joint-beamforming/ssp/ssp-ui.mjs",
    {
      "sha256": "06e6057492d51d3e5dd0214a8e60b27809adc43692b23042d331ba2cebd9404e",
      "runtimePolicy": "reviewed-recovery-runtime",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": [
        {
          "kind": "worker",
          "url": "./ssp-worker.mjs",
          "literal": "new Worker(new URL('./ssp-worker.mjs',import.meta.url),{type:'module'})"
        },
        {
          "kind": "data",
          "url": "./ssp-data.json",
          "literal": "['ssp-data.json','user-load-data.json'].map(checked)"
        },
        {
          "kind": "data",
          "url": "./user-load-data.json",
          "literal": "['ssp-data.json','user-load-data.json'].map(checked)"
        },
        {
          "kind": "module",
          "url": "./teaching-pins.mjs",
          "literal": "await import('./teaching-pins.mjs')"
        }
      ]
    }
  ],
  [
    "otfs-receiver/mppsi/accepted-kernel.mjs",
    {
      "sha256": "80fad52c681d19eaa5d82a6b1d20dd329a6cf40d39c08cd92774f88118d8f1e7",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "otfs-receiver/mppsi/mppsi-kernel.mjs",
    {
      "sha256": "565c161b020aef6fa6c9c61150d484ca3e88bbabc22547ca7a59f3657ee96dfd",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "otfs-receiver/mppsi/mppsi-worker.mjs",
    {
      "sha256": "c1df1bf7053cc5871d19db5c9ee72d6cdf4595ddd75361cbf1597fadec9b1493",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "otfs-receiver/mppsi/mppsi-ui.mjs",
    {
      "sha256": "e1d5883394589111513673045c255856b39748a5671a0b7d684c8e7b0bfdaad9",
      "runtimePolicy": "reviewed-recovery-runtime",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": [
        {
          "kind": "worker",
          "url": "./mppsi-worker.mjs",
          "literal": "new Worker(new URL('./mppsi-worker.mjs',import.meta.url),{type:'module'})"
        },
        {
          "kind": "data",
          "url": "./offline-summary.json",
          "literal": "fetch(new URL('./offline-summary.json',import.meta.url))"
        }
      ]
    }
  ],
  [
    "otfs-receiver/communication/kernel.mjs",
    {
      "sha256": "80fad52c681d19eaa5d82a6b1d20dd329a6cf40d39c08cd92774f88118d8f1e7",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "joint-beamforming/ssp/ssp-model.mjs",
    {
      "sha256": "bd25dda27e62c58ca15f577faf92c562ae2f9cde71c79bcd201bef27f69c7812",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "joint-beamforming/ssp/ssp-worker.mjs",
    {
      "sha256": "4bb95119d2437670e52aac612591a482129f5fa63629130806d9c98b450fa41a",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ],
  [
    "joint-beamforming/ssp/teaching-pins.mjs",
    {
      "sha256": "f91e5f2f8a476f60ff36778335277f3c0357201839cadede41d565dc70fb1ec5",
      "runtimePolicy": "no-runtime-loads",
      "sourceLiterals": [],
      "edgeKind": "reviewed-recovery-module",
      "runtimeEdges": []
    }
  ]
]),pilotPublicFiles:new Map([
  [
    "labs/pilot-pattern/lesson.mjs",
    "c130e713a876cb59500df0e1e7fe16ea6a6af5bbe1c739eb6384c1da505b773a"
  ],
  [
    "labs/pilot-pattern/runtime/records.mjs",
    "7ce55df46c4eed6f94254066c6ea7719091d646ad9adf44bac5272c743167f95"
  ],
  [
    "labs/pilot-pattern/runtime/calibration.mjs",
    "be65bec74eabbe6078af5edf2f0e0adebcdc8c9f5809af38369dfc8f54301de5"
  ],
  [
    "labs/pilot-pattern/runtime/calibration-data.mjs",
    "9d2e794a4c8a6a86440be374a8df3d2fa591262bad78e66ddabfce44af245d19"
  ],
  [
    "assets/data/pilot-pattern/new-calibrated-detection-evidence.tar.gz",
    "7cbe7f383a6cc5ed182d0c121ade196997f21465e46a204ebc94f9f3ef7f9a2c"
  ]
]),cellfreePublicFiles:new Map([
  [
    "labs/cellfree-maprt/robustness/model.mjs",
    "a7e67b24381d6f046daa2eedb2e7eb6b326a52eb0f33ac103cebf9f8b59fd280"
  ],
  [
    "labs/cellfree-maprt/robustness/panel.css",
    "614f52ef98555720d66cf80b084b2dde3ead4b587865f892ddd5ad87a5d700ff"
  ],
  [
    "labs/cellfree-maprt/robustness/study.json",
    "7493d6c738e2ceef7a78d5e48c2a612f271c86b3eb8e8900c38dd359876b9b0e"
  ],
  [
    "labs/cellfree-maprt/robustness/panel.mjs",
    "ea9d12495fef6800cbb6b854a941915849ded415d123df27ebbad22598ca057e"
  ]
])};
