'use strict';
// Source-only fixtures for unchanged accepted suites. Every input and output is
// explicitly byte-bound; no filesystem interception, rewritten assertions, broad
// copies, generated pages, or generic parent test replaces the original cases.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Unchanged rows come from accepted c7281552ffb9205a08171059610a753bd59885fe.
// Desktop rows use independently accepted 54e4ffd and ef818cb source freezes.
const specifications = {
  "narrow": {
    "suite": "tests/lesson-narrow-layout.test.cjs",
    "wrapper": "tests/lesson-narrow-layout-source-gate.test.cjs",
    "inverseHelpers": [
      "tests/helpers/perceptive-sticky-layout-preservation.cjs",
      "tests/helpers/pilot-sticky-layout-preservation.cjs"
    ],
    "files": [
      {
        "path": "content/pages/perceptive-bsbl.html",
        "input": {
          "bytes": 29706,
          "sha256": "170347477f883efa48370cbdc840f1e83a32c7356b17d7aab014a588f977c7d3"
        },
        "output": {
          "bytes": 29706,
          "sha256": "170347477f883efa48370cbdc840f1e83a32c7356b17d7aab014a588f977c7d3"
        }
      },
      {
        "path": "content/pages/pilot-patterns.html",
        "input": {
          "bytes": 24799,
          "sha256": "2aa1b31f423338ae93ffca342847d78e2ed400685b090491b7e84f6d00a15737"
        },
        "output": {
          "bytes": 24799,
          "sha256": "2aa1b31f423338ae93ffca342847d78e2ed400685b090491b7e84f6d00a15737"
        }
      },
      {
        "path": "labs/perceptive-bsbl/FUNCTIONAL-FREEZE-V2.json",
        "input": {
          "bytes": 20752,
          "sha256": "9dbb0480e1ba56bae45ae8548e9d833e1771b15d31f3d23365bbad4a7c50c8d4"
        },
        "output": {
          "bytes": 20752,
          "sha256": "9dbb0480e1ba56bae45ae8548e9d833e1771b15d31f3d23365bbad4a7c50c8d4"
        }
      },
      {
        "path": "labs/perceptive-bsbl/FUNCTIONAL-FREEZE.json",
        "input": {
          "bytes": 18992,
          "sha256": "dc59c83f0d2f82f6597677e978ec0b80f22f6d9a1bdb367f875af2c22c64cf0e"
        },
        "output": {
          "bytes": 18992,
          "sha256": "dc59c83f0d2f82f6597677e978ec0b80f22f6d9a1bdb367f875af2c22c64cf0e"
        }
      },
      {
        "path": "labs/perceptive-bsbl/OWNED-TESTS-V2.json",
        "input": {
          "bytes": 3245,
          "sha256": "338c2c5e91bcce661dd916db36ba38ace3e8b3f570748734da16774103a170b3"
        },
        "output": {
          "bytes": 3245,
          "sha256": "338c2c5e91bcce661dd916db36ba38ace3e8b3f570748734da16774103a170b3"
        }
      },
      {
        "path": "labs/perceptive-bsbl/OWNED-TESTS.json",
        "input": {
          "bytes": 2349,
          "sha256": "206fe59788315e5ab3de96deeb9bd76a2dd169535ad8f96ddbbfe5bbb1a090c6"
        },
        "output": {
          "bytes": 2349,
          "sha256": "206fe59788315e5ab3de96deeb9bd76a2dd169535ad8f96ddbbfe5bbb1a090c6"
        }
      },
      {
        "path": "labs/perceptive-bsbl/PUBLIC-ASSETS-V2.json",
        "input": {
          "bytes": 20382,
          "sha256": "c3090f309e897d9e263dc5f9884b638beef931b61e6b8b191ab52f838f58b2a4"
        },
        "output": {
          "bytes": 20382,
          "sha256": "c3090f309e897d9e263dc5f9884b638beef931b61e6b8b191ab52f838f58b2a4"
        }
      },
      {
        "path": "labs/perceptive-bsbl/PUBLIC-ASSETS.json",
        "input": {
          "bytes": 18471,
          "sha256": "c489366c17b632b06e5133e9d066f236d146e5f2fdcae0f3b04fce304961f814"
        },
        "output": {
          "bytes": 18471,
          "sha256": "c489366c17b632b06e5133e9d066f236d146e5f2fdcae0f3b04fce304961f814"
        }
      },
      {
        "path": "labs/perceptive-bsbl/README.md",
        "input": {
          "bytes": 5203,
          "sha256": "3c9bdcf40dde3dd7a19a4414886f861a23f7397f58f31e57fbde910f9b9ad9f2"
        },
        "output": {
          "bytes": 5203,
          "sha256": "3c9bdcf40dde3dd7a19a4414886f861a23f7397f58f31e57fbde910f9b9ad9f2"
        }
      },
      {
        "path": "labs/perceptive-bsbl/REPAIR-V2.md",
        "input": {
          "bytes": 3490,
          "sha256": "7f26551d8a4e13932eb259934445599cee742aa0f3fdd58bcb9cf4186a795f00"
        },
        "output": {
          "bytes": 3490,
          "sha256": "7f26551d8a4e13932eb259934445599cee742aa0f3fdd58bcb9cf4186a795f00"
        }
      },
      {
        "path": "labs/perceptive-bsbl/check-worker.mjs",
        "input": {
          "bytes": 1822,
          "sha256": "7f39df950ee2008c70f25811968dc83eeee1a6473fc427c66ea3600323e728c4"
        },
        "output": {
          "bytes": 1822,
          "sha256": "7f39df950ee2008c70f25811968dc83eeee1a6473fc427c66ea3600323e728c4"
        }
      },
      {
        "path": "labs/perceptive-bsbl/fixtures/v1-accepted-cap.json",
        "input": {
          "bytes": 397863,
          "sha256": "5189ddbc7eeb876cf581474d10502e64a8c9c962d7923bd36987bd3d0dd49d28"
        },
        "output": {
          "bytes": 397863,
          "sha256": "5189ddbc7eeb876cf581474d10502e64a8c9c962d7923bd36987bd3d0dd49d28"
        }
      },
      {
        "path": "labs/perceptive-bsbl/lesson.css",
        "input": {
          "bytes": 4718,
          "sha256": "30c4e563393c48460c7b1cf19d820223e00744056694cf8a4ee3f38b45574c95"
        },
        "output": {
          "bytes": 4502,
          "sha256": "13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14"
        }
      },
      {
        "path": "labs/perceptive-bsbl/lesson.mjs",
        "input": {
          "bytes": 29835,
          "sha256": "2c227befd0eecaff551a7fa63cf2b9e1cf1fabd06707669213be5cd97a157a57"
        },
        "output": {
          "bytes": 29835,
          "sha256": "2c227befd0eecaff551a7fa63cf2b9e1cf1fabd06707669213be5cd97a157a57"
        }
      },
      {
        "path": "labs/perceptive-bsbl/plots.mjs",
        "input": {
          "bytes": 4661,
          "sha256": "dc5dffb8d1270303e528c3e2b14c91f7cd5596b543ba9c4a088081a6d3b97a93"
        },
        "output": {
          "bytes": 4661,
          "sha256": "dc5dffb8d1270303e528c3e2b14c91f7cd5596b543ba9c4a088081a6d3b97a93"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/budget.mjs",
        "input": {
          "bytes": 1103,
          "sha256": "603f29be21da5753485d38db4187d81c2de9b699f956c119c71262a4da6e9491"
        },
        "output": {
          "bytes": 1103,
          "sha256": "603f29be21da5753485d38db4187d81c2de9b699f956c119c71262a4da6e9491"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/build-info.mjs",
        "input": {
          "bytes": 1794,
          "sha256": "fe5e5191d70c276b54e98a32d717ded791137441629e820e5c434bbeb9cceaa8"
        },
        "output": {
          "bytes": 1794,
          "sha256": "fe5e5191d70c276b54e98a32d717ded791137441629e820e5c434bbeb9cceaa8"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/check-record.mjs",
        "input": {
          "bytes": 11565,
          "sha256": "5ca5af74bf146c41f08f9e39f27f7fcba381d2093955365d42a7265ae40e2f78"
        },
        "output": {
          "bytes": 11565,
          "sha256": "5ca5af74bf146c41f08f9e39f27f7fcba381d2093955365d42a7265ae40e2f78"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/client.mjs",
        "input": {
          "bytes": 4813,
          "sha256": "e801bb6cdc43d3f41f67b0e44a4a9cfa231afec8ef81d7131e519d4d8ebb0746"
        },
        "output": {
          "bytes": 4813,
          "sha256": "e801bb6cdc43d3f41f67b0e44a4a9cfa231afec8ef81d7131e519d4d8ebb0746"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/complex.mjs",
        "input": {
          "bytes": 7310,
          "sha256": "23c73626e904de547abe59108dc90a3dcb92c0ebbaf63a981fdf394c12cfb63a"
        },
        "output": {
          "bytes": 7310,
          "sha256": "23c73626e904de547abe59108dc90a3dcb92c0ebbaf63a981fdf394c12cfb63a"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/evaluation.mjs",
        "input": {
          "bytes": 6527,
          "sha256": "6ad9250411da235c381d7e97008de9f7d5045ff575c1c1d5d6c95d2914a89bc3"
        },
        "output": {
          "bytes": 6527,
          "sha256": "6ad9250411da235c381d7e97008de9f7d5045ff575c1c1d5d6c95d2914a89bc3"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/model.mjs",
        "input": {
          "bytes": 6515,
          "sha256": "7dcda312eac442c68f1698b42d9cbcf30264a6ccf47039698d006b31bde8bc33"
        },
        "output": {
          "bytes": 6515,
          "sha256": "7dcda312eac442c68f1698b42d9cbcf30264a6ccf47039698d006b31bde8bc33"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/record.mjs",
        "input": {
          "bytes": 3164,
          "sha256": "594bf95306ded22352b047a5ddea7c9be070516b45bc431be129f213d4c8c5f5"
        },
        "output": {
          "bytes": 3164,
          "sha256": "594bf95306ded22352b047a5ddea7c9be070516b45bc431be129f213d4c8c5f5"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/runner.mjs",
        "input": {
          "bytes": 5125,
          "sha256": "e780a1bfa10871b711762243550e6cf27e7e1925f6e4cd5e3e7493a118516dda"
        },
        "output": {
          "bytes": 5125,
          "sha256": "e780a1bfa10871b711762243550e6cf27e7e1925f6e4cd5e3e7493a118516dda"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/schema.mjs",
        "input": {
          "bytes": 21939,
          "sha256": "c3ed85625e2065063ea9805a83027c9f601dcbdbd237a7ae7b25050e7c33c212"
        },
        "output": {
          "bytes": 21939,
          "sha256": "c3ed85625e2065063ea9805a83027c9f601dcbdbd237a7ae7b25050e7c33c212"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/solver.mjs",
        "input": {
          "bytes": 11614,
          "sha256": "5abd5230f86ecf0b701fff5a77e7bbee1bdc8e2bdfd95f096b8df698aef34977"
        },
        "output": {
          "bytes": 11614,
          "sha256": "5abd5230f86ecf0b701fff5a77e7bbee1bdc8e2bdfd95f096b8df698aef34977"
        }
      },
      {
        "path": "labs/perceptive-bsbl/runtime/worker.mjs",
        "input": {
          "bytes": 1240,
          "sha256": "96614b7de0a5983f67ece8b13704f1ffcfe3c4b7609b0c17edc7f215ae9f6402"
        },
        "output": {
          "bytes": 1240,
          "sha256": "96614b7de0a5983f67ece8b13704f1ffcfe3c4b7609b0c17edc7f215ae9f6402"
        }
      },
      {
        "path": "labs/perceptive-bsbl/session.mjs",
        "input": {
          "bytes": 14165,
          "sha256": "9cc64f36e9ad71b62ac8ccf5b00026b9787477b0f72e1a9d0396572716b8394a"
        },
        "output": {
          "bytes": 14165,
          "sha256": "9cc64f36e9ad71b62ac8ccf5b00026b9787477b0f72e1a9d0396572716b8394a"
        }
      },
      {
        "path": "labs/perceptive-bsbl/tests/dom-harness.cjs",
        "input": {
          "bytes": 7379,
          "sha256": "625f7ba8ac7822efd6833537916770567129c226882c420384b369e83933d51d"
        },
        "output": {
          "bytes": 7379,
          "sha256": "625f7ba8ac7822efd6833537916770567129c226882c420384b369e83933d51d"
        }
      },
      {
        "path": "labs/perceptive-bsbl/tests/export-records.mjs",
        "input": {
          "bytes": 3415,
          "sha256": "57d3de4f86edc25900ef9ec99849b60b720fc7d1b3566b541a8e20d659047e5a"
        },
        "output": {
          "bytes": 3415,
          "sha256": "57d3de4f86edc25900ef9ec99849b60b720fc7d1b3566b541a8e20d659047e5a"
        }
      },
      {
        "path": "labs/perceptive-bsbl/tests/mounted-helpers.mjs",
        "input": {
          "bytes": 2077,
          "sha256": "f0cd12085a485cdbda3d3b3726280091fb760ad673b444b18372155e5c026835"
        },
        "output": {
          "bytes": 2077,
          "sha256": "f0cd12085a485cdbda3d3b3726280091fb760ad673b444b18372155e5c026835"
        }
      },
      {
        "path": "labs/perceptive-bsbl/tests/mounted.test.mjs",
        "input": {
          "bytes": 9978,
          "sha256": "0a99ad7bd22b12bf635814cc61b0a353e413208dcefcbf6a5e3c9faccb1879b5"
        },
        "output": {
          "bytes": 9978,
          "sha256": "0a99ad7bd22b12bf635814cc61b0a353e413208dcefcbf6a5e3c9faccb1879b5"
        }
      },
      {
        "path": "labs/perceptive-bsbl/tests/reset-repair.test.mjs",
        "input": {
          "bytes": 9176,
          "sha256": "1bf90c8e802ade5a321b320228c22c3ea3ebe7c848e747536dad26fbec9b1c74"
        },
        "output": {
          "bytes": 9176,
          "sha256": "1bf90c8e802ade5a321b320228c22c3ea3ebe7c848e747536dad26fbec9b1c74"
        }
      },
      {
        "path": "labs/perceptive-bsbl/tests/view.test.mjs",
        "input": {
          "bytes": 3429,
          "sha256": "39934940c91b3caac320fd6a33e3ead2a16eee774a030d3f1d2058e49cebbb4c"
        },
        "output": {
          "bytes": 3429,
          "sha256": "39934940c91b3caac320fd6a33e3ead2a16eee774a030d3f1d2058e49cebbb4c"
        }
      },
      {
        "path": "labs/perceptive-bsbl/view.mjs",
        "input": {
          "bytes": 6376,
          "sha256": "35f3b882ffb87a61d6476ea31f830c1b82576abccb261c6dd3ba32c392581592"
        },
        "output": {
          "bytes": 6376,
          "sha256": "35f3b882ffb87a61d6476ea31f830c1b82576abccb261c6dd3ba32c392581592"
        }
      },
      {
        "path": "labs/pilot-pattern/FUNCTIONAL-FREEZE-V4.json",
        "input": {
          "bytes": 4570,
          "sha256": "18ad28cf435178d526b331eb9a2764a622fa54e3af5d972536aa8ed25e68d04d"
        },
        "output": {
          "bytes": 4570,
          "sha256": "18ad28cf435178d526b331eb9a2764a622fa54e3af5d972536aa8ed25e68d04d"
        }
      },
      {
        "path": "labs/pilot-pattern/INTEGRATION.md",
        "input": {
          "bytes": 1482,
          "sha256": "ad0c168fd2db0e16282b4b1dbe4cffdaeaceb9db56b37342cbd7955132899622"
        },
        "output": {
          "bytes": 1482,
          "sha256": "ad0c168fd2db0e16282b4b1dbe4cffdaeaceb9db56b37342cbd7955132899622"
        }
      },
      {
        "path": "labs/pilot-pattern/README.md",
        "input": {
          "bytes": 5169,
          "sha256": "3f2a452aacb0c2e63546f9fbbf4aa206086c9d8b0ce9797a56f9dbbfb31cabda"
        },
        "output": {
          "bytes": 5169,
          "sha256": "3f2a452aacb0c2e63546f9fbbf4aa206086c9d8b0ce9797a56f9dbbfb31cabda"
        }
      },
      {
        "path": "labs/pilot-pattern/lesson.css",
        "input": {
          "bytes": 5156,
          "sha256": "4c00a92b40d0b50735a459492831a139782f76eb357ca81470f8a884baf07350"
        },
        "output": {
          "bytes": 5065,
          "sha256": "4c0cae10a4b3960e0bccc2dbf591e057013916a3f118eef5ebfe6d0f32cc1249"
        }
      },
      {
        "path": "labs/pilot-pattern/lesson.mjs",
        "input": {
          "bytes": 30658,
          "sha256": "9a0665b92d157fd64c9569db5fc236f73b2735c3303f4ee088400149288c4246"
        },
        "output": {
          "bytes": 30658,
          "sha256": "9a0665b92d157fd64c9569db5fc236f73b2735c3303f4ee088400149288c4246"
        }
      },
      {
        "path": "labs/pilot-pattern/runtime/core.mjs",
        "input": {
          "bytes": 11798,
          "sha256": "53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f"
        },
        "output": {
          "bytes": 11798,
          "sha256": "53591126e91fe7f1c838bc7cd58e57a1a50035de9b5a811206d3ce3c47c1c87f"
        }
      },
      {
        "path": "labs/pilot-pattern/runtime/processing.mjs",
        "input": {
          "bytes": 6984,
          "sha256": "48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7"
        },
        "output": {
          "bytes": 6984,
          "sha256": "48427712f64f00de71e5c3e44af9557ee577343159b50b47179a22c4e10fc7e7"
        }
      },
      {
        "path": "labs/pilot-pattern/runtime/protocol.mjs",
        "input": {
          "bytes": 5101,
          "sha256": "0d3fcc205699d7d36ad9d35556d9c8f105d0124d03dad27f29995dbbffa474d1"
        },
        "output": {
          "bytes": 5101,
          "sha256": "0d3fcc205699d7d36ad9d35556d9c8f105d0124d03dad27f29995dbbffa474d1"
        }
      },
      {
        "path": "labs/pilot-pattern/runtime/records.mjs",
        "input": {
          "bytes": 11486,
          "sha256": "1982bfa3c17a479c8fb9e26cd5fd270a792c677b4a2e2f301ae89b6ca78a7c28"
        },
        "output": {
          "bytes": 11486,
          "sha256": "1982bfa3c17a479c8fb9e26cd5fd270a792c677b4a2e2f301ae89b6ca78a7c28"
        }
      },
      {
        "path": "labs/pilot-pattern/runtime/worker.mjs",
        "input": {
          "bytes": 212,
          "sha256": "b157c3560b5126417150bd5d7237389ed6c1b9c8c1867bdf7cbab942c705a2c2"
        },
        "output": {
          "bytes": 212,
          "sha256": "b157c3560b5126417150bd5d7237389ed6c1b9c8c1867bdf7cbab942c705a2c2"
        }
      },
      {
        "path": "labs/pilot-pattern/session.mjs",
        "input": {
          "bytes": 3618,
          "sha256": "96a7bb28fb6bbb4a6cd4ab94e2910adb515486d6ff183cb53caab5658ffcc267"
        },
        "output": {
          "bytes": 3618,
          "sha256": "96a7bb28fb6bbb4a6cd4ab94e2910adb515486d6ff183cb53caab5658ffcc267"
        }
      },
      {
        "path": "labs/pilot-pattern/strict-json.mjs",
        "input": {
          "bytes": 1570,
          "sha256": "4d539f0a15a957649029bd8190d73d50425a202f2446270dc3285223f25fe359"
        },
        "output": {
          "bytes": 1570,
          "sha256": "4d539f0a15a957649029bd8190d73d50425a202f2446270dc3285223f25fe359"
        }
      },
      {
        "path": "labs/pilot-pattern/tests/dom-harness.cjs",
        "input": {
          "bytes": 7406,
          "sha256": "44795b7639a49c8dcaa4d650103a709b58a4cb66eb6bf0459152d3f5399515f5"
        },
        "output": {
          "bytes": 7406,
          "sha256": "44795b7639a49c8dcaa4d650103a709b58a4cb66eb6bf0459152d3f5399515f5"
        }
      },
      {
        "path": "labs/pilot-pattern/tests/lesson.test.mjs",
        "input": {
          "bytes": 22507,
          "sha256": "e3d954b69e828882b4bdb3c05cf81af95feaa8d1062591ac03870c13d7548247"
        },
        "output": {
          "bytes": 22507,
          "sha256": "e3d954b69e828882b4bdb3c05cf81af95feaa8d1062591ac03870c13d7548247"
        }
      },
      {
        "path": "labs/pilot-pattern/tests/mounted.mjs",
        "input": {
          "bytes": 1717,
          "sha256": "8519327be7681a1cbef40422ba44b95b55cc741e33c064c073116d61cbeabca6"
        },
        "output": {
          "bytes": 1717,
          "sha256": "8519327be7681a1cbef40422ba44b95b55cc741e33c064c073116d61cbeabca6"
        }
      },
      {
        "path": "labs/pilot-pattern/tests/node-worker.mjs",
        "input": {
          "bytes": 269,
          "sha256": "90f2d8a0651be6c780fb64ef0daaaf3aec43b7e80a01b8edb94fa8c58c964599"
        },
        "output": {
          "bytes": 269,
          "sha256": "90f2d8a0651be6c780fb64ef0daaaf3aec43b7e80a01b8edb94fa8c58c964599"
        }
      },
      {
        "path": "labs/pilot-pattern/tests/replay_downloads.py",
        "input": {
          "bytes": 5825,
          "sha256": "49996bcc0ee4d4fd6b3f86b7a66920e73084c010f8fb80031737fa9c3be29bb0"
        },
        "output": {
          "bytes": 5825,
          "sha256": "49996bcc0ee4d4fd6b3f86b7a66920e73084c010f8fb80031737fa9c3be29bb0"
        }
      },
      {
        "path": "tests/helpers/lesson-narrow-layout-preservation.cjs",
        "input": {
          "bytes": 2680,
          "sha256": "61f808667ccf191d437a00c9b8a8bb5b0266e2772b5e96e57bb70989f9261e11"
        },
        "output": {
          "bytes": 2680,
          "sha256": "61f808667ccf191d437a00c9b8a8bb5b0266e2772b5e96e57bb70989f9261e11"
        }
      },
      {
        "path": "tests/helpers/perceptive-bsbl-metadata-baseline.json",
        "input": {
          "bytes": 51043,
          "sha256": "45971e88a95398e59aab3fcd3b42bc7cce44d7c0aa6825354df618d6c022f223"
        },
        "output": {
          "bytes": 51043,
          "sha256": "45971e88a95398e59aab3fcd3b42bc7cce44d7c0aa6825354df618d6c022f223"
        }
      },
      {
        "path": "tests/helpers/perceptive-bsbl-responsive-preservation.cjs",
        "input": {
          "bytes": 1698,
          "sha256": "019dcf7287c35335489ead1337741c6e7ae591e66e98673ce8d034643d92f668"
        },
        "output": {
          "bytes": 1698,
          "sha256": "019dcf7287c35335489ead1337741c6e7ae591e66e98673ce8d034643d92f668"
        }
      },
      {
        "path": "tests/helpers/perceptive-sticky-layout-preservation.cjs",
        "input": {
          "bytes": 2358,
          "sha256": "765757f6131f061735a83ef27a0fd35b09ae9d5bb644a2bddf772e569de9058d"
        },
        "output": {
          "bytes": 2358,
          "sha256": "765757f6131f061735a83ef27a0fd35b09ae9d5bb644a2bddf772e569de9058d"
        }
      },
      {
        "path": "tests/helpers/pilot-pattern-metadata-baseline.json",
        "input": {
          "bytes": 2063393,
          "sha256": "cbb370808ec844ba381494acf6e533a4b3103d0c2025827ebc961ff93ea3e5ad"
        },
        "output": {
          "bytes": 2063393,
          "sha256": "cbb370808ec844ba381494acf6e533a4b3103d0c2025827ebc961ff93ea3e5ad"
        }
      },
      {
        "path": "tests/helpers/pilot-sticky-layout-preservation.cjs",
        "input": {
          "bytes": 2408,
          "sha256": "be4d1dd01b3294481ea6caef53116accc2641cf876547170ccaabdc5d7eaa578"
        },
        "output": {
          "bytes": 2408,
          "sha256": "be4d1dd01b3294481ea6caef53116accc2641cf876547170ccaabdc5d7eaa578"
        }
      },
      {
        "path": "tests/lesson-narrow-layout.test.cjs",
        "input": {
          "bytes": 9558,
          "sha256": "2a44e7b08169f424107109105871841ce76a27fd0cc6cb8fa223eb3df68bf4bb"
        },
        "output": {
          "bytes": 9558,
          "sha256": "2a44e7b08169f424107109105871841ce76a27fd0cc6cb8fa223eb3df68bf4bb"
        }
      }
    ]
  },
  "pilot": {
    "suite": "tests/pilot-sticky-layout.test.cjs",
    "wrapper": "tests/pilot-sticky-layout-source-gate.test.cjs",
    "inverseHelpers": [
      "tests/helpers/perceptive-sticky-layout-preservation.cjs"
    ],
    "files": [
      {
        "path": "content/pages/pilot-patterns.html",
        "input": {
          "bytes": 24799,
          "sha256": "2aa1b31f423338ae93ffca342847d78e2ed400685b090491b7e84f6d00a15737"
        },
        "output": {
          "bytes": 24799,
          "sha256": "2aa1b31f423338ae93ffca342847d78e2ed400685b090491b7e84f6d00a15737"
        }
      },
      {
        "path": "labs/perceptive-bsbl/lesson.css",
        "input": {
          "bytes": 4718,
          "sha256": "30c4e563393c48460c7b1cf19d820223e00744056694cf8a4ee3f38b45574c95"
        },
        "output": {
          "bytes": 4502,
          "sha256": "13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14"
        }
      },
      {
        "path": "labs/pilot-pattern/lesson.css",
        "input": {
          "bytes": 5156,
          "sha256": "4c00a92b40d0b50735a459492831a139782f76eb357ca81470f8a884baf07350"
        },
        "output": {
          "bytes": 5156,
          "sha256": "4c00a92b40d0b50735a459492831a139782f76eb357ca81470f8a884baf07350"
        }
      },
      {
        "path": "tests/helpers/lesson-narrow-layout-preservation.cjs",
        "input": {
          "bytes": 2680,
          "sha256": "61f808667ccf191d437a00c9b8a8bb5b0266e2772b5e96e57bb70989f9261e11"
        },
        "output": {
          "bytes": 2680,
          "sha256": "61f808667ccf191d437a00c9b8a8bb5b0266e2772b5e96e57bb70989f9261e11"
        }
      },
      {
        "path": "tests/helpers/perceptive-sticky-layout-preservation.cjs",
        "input": {
          "bytes": 2358,
          "sha256": "765757f6131f061735a83ef27a0fd35b09ae9d5bb644a2bddf772e569de9058d"
        },
        "output": {
          "bytes": 2358,
          "sha256": "765757f6131f061735a83ef27a0fd35b09ae9d5bb644a2bddf772e569de9058d"
        }
      },
      {
        "path": "tests/helpers/pilot-sticky-layout-preservation.cjs",
        "input": {
          "bytes": 2408,
          "sha256": "be4d1dd01b3294481ea6caef53116accc2641cf876547170ccaabdc5d7eaa578"
        },
        "output": {
          "bytes": 2408,
          "sha256": "be4d1dd01b3294481ea6caef53116accc2641cf876547170ccaabdc5d7eaa578"
        }
      },
      {
        "path": "tests/lesson-narrow-layout.test.cjs",
        "input": {
          "bytes": 9558,
          "sha256": "2a44e7b08169f424107109105871841ce76a27fd0cc6cb8fa223eb3df68bf4bb"
        },
        "output": {
          "bytes": 9558,
          "sha256": "2a44e7b08169f424107109105871841ce76a27fd0cc6cb8fa223eb3df68bf4bb"
        }
      },
      {
        "path": "tests/pilot-sticky-layout.test.cjs",
        "input": {
          "bytes": 8615,
          "sha256": "24bf7d73e87a4b160f4e4d6dd70d8c2b8e1b420f44a271559b622536e871574f"
        },
        "output": {
          "bytes": 8615,
          "sha256": "24bf7d73e87a4b160f4e4d6dd70d8c2b8e1b420f44a271559b622536e871574f"
        }
      }
    ]
  }
};
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
freeze(specifications);
function bind(bytes, identity, label) {
  assert.ok(Buffer.isBuffer(bytes), 'source fixture Buffer: ' + label);
  assert.equal(bytes.length, identity.bytes, 'source fixture exact size: ' + label);
  assert.equal(sha(bytes), identity.sha256, 'source fixture exact identity: ' + label);
}
function createFixture(root, name) {
  assert.ok(Object.hasOwn(specifications, name), 'known source fixture');
  const specification = specifications[name];
  const files = specification.files;
  const names = files.map(row => row.path);
  assert.equal(new Set(names).size, names.length, 'unique source fixture paths');
  assert.ok(names.includes(specification.suite), 'original suite is explicitly bound');
  for (const helper of specification.inverseHelpers) {
    assert.ok(names.includes(helper), 'inverse helper is explicitly bound');
  }
  // Read and authenticate the complete source snapshot before executing any
  // copied code or transforming either stylesheet.
  const inputs = new Map();
  for (const row of files) {
    assert.ok(!path.isAbsolute(row.path) && path.posix.normalize(row.path) === row.path
      && !row.path.startsWith('../') && !row.path.includes('\\'), 'relative exact fixture path');
    const source = path.join(root, row.path);
    assert.ok(fs.lstatSync(source).isFile(), 'source fixture regular file: ' + row.path);
    const bytes = fs.readFileSync(source);
    bind(bytes, row.input, 'input ' + row.path);
    inputs.set(row.path, bytes);
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'isac-desktop-' + name + '-source-'));
  const cleanup = () => fs.rmSync(directory, { recursive: true, force: true });
  try {
    // Only these explicit files are copied. The original suites and helpers are
    // authenticated again on disk before any of their code is loaded.
    for (const row of files) {
      const destination = path.join(directory, row.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, inputs.get(row.path));
      bind(fs.readFileSync(destination), row.input, 'copied input ' + row.path);
    }
    const inverses = specification.inverseHelpers.map(file => require(path.join(directory, file)));
    for (const row of files) {
      let bytes = inputs.get(row.path);
      for (const inverse of inverses) bytes = inverse.withoutCSS(row.path, bytes);
      bind(bytes, row.output, 'transformed output ' + row.path);
      fs.writeFileSync(path.join(directory, row.path), bytes);
    }
    // Bind the full final fixture, including untouched originals, before the
    // wrapper registers the original node:test cases by requiring their source.
    for (const row of files) {
      bind(fs.readFileSync(path.join(directory, row.path)), row.output, 'fixture output ' + row.path);
    }
    return Object.freeze({ directory, suite: path.join(directory, specification.suite), cleanup });
  } catch (error) {
    cleanup();
    throw error;
  }
}
module.exports = { specifications, sha, bind, createFixture };
