# Bounded source transport for accepted evidence

The accepted user-load archive (96,924,176 bytes) and SSP K2 archive (13,437,937 bytes) exceed the connector's safe single-request budget. Their exact bytes are stored as twelve and two ordered source chunks respectively, each at most 8 MiB. A full-sized chunk occupies 11,184,812 base64 characters; JSON framing stays below the verified 16 MiB request cap. These parts and their metadata are build-only inputs, never public files.

Before direct source tests or calls to the compatibility library, run:

    node --test tests/chunked-evidence.test.cjs
    node scripts/restore-chunked-evidence.cjs

The normal build CLI also invokes reconstruction before reading the compatibility manifest. Every invocation validates all chunk sizes and SHA256 hashes and any existing output before creating either archive. Reconstructed outputs must match fixed accepted whole-file lengths and SHA256 hashes. Missing, swapped, truncated, corrupt or symlinked inputs fail closed. Existing mismatched outputs are rejected, never overwritten. Derived archives are local build inputs and must not be uploaded as source blobs; commit the fourteen parts instead.

The unchanged compatibility manifest publishes the complete archives at their original URLs:

- assets/data/joint-beamforming/user-load-uniform-recomputation-20261018-full.tar.xz
  - SHA256: 20185af2e4a58a24aa6bfd279f31bcad28fb2be60a8ec94bbe24da84dc21ddeb
  - Git blob SHA: bf37fd5e4446e1ba744da296e2127787282d7efe
- joint-beamforming/ssp/recomputed-ssp-k2-evidence.zip
  - SHA256: ee6981ef11b601be5d1af67f52a1e586501f3d08bfc6922974385baba0f738df

This is packaging only. Scientific evidence, historical freezes, frontend code and all public artifact bytes remain unchanged.
