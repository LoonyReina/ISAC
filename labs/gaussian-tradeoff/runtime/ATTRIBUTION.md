# Implementation provenance

No paper PDF, source figure image, author code or licensed third-party source is redistributed.

- `kernel.mjs`, `math.mjs`, `presets.mjs`, tests and packaging are fresh project implementations of the operational equations in arXiv:2204.06938v8
- `vendor/linalg.js` is the unchanged first-party independently reviewed SyncLinalg helper from `networked-sync-browser-prototype/js/linalg.js`, SHA-256 `7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc`. Its source header retains prior project Householder/Jacobi attributions. This port independently tests its actual complex-matrix use; previous review alone is not this port's acceptance
- `oracle/reference/core.py` is the unchanged first-party independent Python operational reference, SHA-256 `b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2`
- `oracle/build_fresh_reference_cases.py` was supplied by the reference owner. Only its reference directory selection was changed to be portable and environment-overridable; generated numerical case values are unchanged. The original supplied generator SHA was `97ba9bf40f27d8d5eb7ec2d53577a138c89b2ca7880d45537f05d8d301f7c6a0`
- `oracle/reviewer-stress-inputs.json` is copied from the independent port review's initial boundary inputs. It preserves the cases that exposed linear-μ and absolute-water-level conditioning failures
- Worker/runtime/codec lifecycle patterns adapt the independently reviewed first-party networked-sync implementation. This is a new ES-module protocol and an exact signed-zero tagged format, with its own independent tests; details are in `PROTOCOL-HANDOFF.md`
- Teaching H is read exactly from the separately reviewed teaching evidence. Fig.10 H is the first stored complex channel for seed 91021 in the accepted reference. Presets contain inputs only
