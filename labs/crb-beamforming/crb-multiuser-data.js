/* Immutable raw input and provenance; no stored solver outputs. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CrbMultiuserData=api;})(typeof self!=='undefined'?self:globalThis,function(){'use strict';
const data={
  "DEFAULT_INPUT": {
    "Nt": 4,
    "Nr": 8,
    "K": 2,
    "L": 30,
    "powerMw": 1000,
    "communicationNoiseMw": 1,
    "radarNoiseMw": 1,
    "thetaDegrees": 0,
    "alpha": {
      "real": 1,
      "imag": 0
    },
    "H": {
      "real": [
        [
          -0.8667818659248935,
          0.46629303940839345,
          1.6093458575947963,
          0.6301379273305082
        ],
        [
          -0.5760628184371438,
          -0.8093153807451507,
          0.3831294045552306,
          0.9123611827981742
        ]
      ],
      "imag": [
        [
          0.10348153051314395,
          -0.11860274131480511,
          -0.7257076161491862,
          0.8086928746891884
        ],
        [
          -0.5842274310535411,
          0.19619801848133397,
          0.2257763023301539,
          -0.14552346731462565
        ]
      ]
    },
    "gammaDb": 10
  },
  "SOURCE": {
    "title": "Cramér-Rao Bound Optimization for Joint Radar-Communication Beamforming",
    "doi": "10.1109/TSP.2021.3135692",
    "edition": "IEEE Transactions on Signal Processing 70, 240–253 (2022), published journal version",
    "pdfUrl": "https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf",
    "sha256": "3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d",
    "equations": "Eq. (7), (30)–(33), Theorem 2; point target only"
  },
  "KERNEL": {
    "version": "crb-point-drs-v0.4-feasibility",
    "artifact": "crb-point-kernel-v0.4",
    "runtimeFiles": {
      "crb-multiuser/hermitian.js": "da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a",
      "crb-multiuser/linalg.js": "11b0de23151c48a4cedcad17405bf26a610739b22db37378b2d77828af560d0d",
      "crb-multiuser/core.js": "208f4d91db12d5c24d8bff921a1f31806cea846cb3f1a3a6101f7520f2e335c1",
      "crb-multiuser/worker.js": "cdf0412a332c79c6e7ff6d5340285b78a434838aa6c560c9b35762ec4775520b"
    },
    "pythonReferenceSha256": "70f0a44a67b261f3ffc62e47455a42b08208aebebd6e99b8dc58b81f97fa3d0a",
    "independentAssertions": 194,
    "reviewScope": "Bounded offline JavaScript/worker feasibility; browser acceptance is a separate gate",
    "fullPaperReproduction": false
  },
  "DOMAIN": {
    "Nt": [
      4,
      6,
      8
    ],
    "NrOffset": 4,
    "K": 2,
    "L": 30,
    "powerMw": 1000,
    "communicationNoiseMw": 1,
    "radarNoiseMw": 1,
    "alpha": {
      "real": 1,
      "imag": 0
    },
    "thetaDegrees": [
      0,
      23
    ],
    "gammaDb": [
      0,
      20
    ],
    "maxChannelMagnitude": 10
  },
  "GENERATOR": {
    "id": "mulberry32-box-muller-cn01",
    "version": 1,
    "defaultSeed": 290102,
    "description": "Deterministic uniform 32-bit generator with Box–Muller; real/imaginary variance 1/2; no row or whole-matrix normalization",
    "defaultInputOrigin": "Exact frozen oracle/routine/nt4-k2-g10-theta0-seed290102.input.json; NumPy-generated reference H, not this browser generator"
  },
  "OPTIONS": {
    "linearWeight": 10,
    "relaxation": 1.6,
    "memory": 10,
    "safeguard": 1,
    "maxIterations": 20000,
    "tolerance": 1e-9,
    "recordEvery": 100
  },
  "TOLERANCES": {
    "rankRelative": 1e-8,
    "rankOneRelative": 0.0001,
    "powerRelative": 0.000002,
    "sinrRelative": 0.00002,
    "gapAbsolute": 1e-7,
    "gapRelative": 0.0001,
    "gapNegative": 2e-7,
    "epigraphStationarity": 1e-9,
    "physicalReplayRelative": 2e-8
  },
  "RESOURCES": {
    "maxImportBytes": 2097152,
    "maxProgressSamples": 512,
    "maxComparisonSummaries": 12,
    "maxFullRecords": 3,
    "maxWorkers": 1,
    "maxIterations": 20000,
    "workerChunkIterations": 16,
    "tracePolicy": "Full kernel trace retained; rendered progress bounded separately"
  },
  "FORMAT": "isac-crb-multiuser-run",
  "SCHEMA_VERSION": 1,
  "MODEL_ID": "point-unknown-complex-alpha-eq33-k2",
  "APP_BUILD": "crb-multiuser-lesson-v1"
};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
return freeze(data);
});
