# Runtime data and scientific trace

## Observation

Only `config`, `samples`, `noise_variance`, `start_chip`, `pulse_noise_filter` and `provenance` are accepted. A complex vector is `{real: Float64Array, imag: Float64Array}`; JSON import uses ordinary finite arrays. Samples are an array of M complex rows, each exactly `((3328 + max_delay_chips + 128 + 2*pulse_halfspan_chips)*oversample + 1)` long. Admitted model/rng provenance strings are ASCII, preserving the standard JSON export/import round trip. Noise-filter length is `2*pulse_halfspan_chips*oversample+1` and its squared norm must be one within 1e-10; every tap must match the declared normalized finite RRC grid within absolute1e-12. SharedArrayBuffer input is rejected. `start_chip` is minus pulse half-support.

Strict provenance fields identify the synthetic model and disclaim PHY compliance. A target list or arbitrary truth object is forbidden. Legacy Config includes generator seed, SCNR and oscillator offset for provenance; those fields are not receiver inputs to estimation. The detector uses declared `noise_variance` and the actual provided normalized noise filter. Tests mutate generator-only fields with held samples and verify identical estimates.

## Generation versus held receiver policy

Scene targets are `{range_m, velocity_mps, gain:{real,imag}}`; omitted gain is 1+0j. They enter `synthesize` only. Fresh generator defaults use Mulberry32 uint32 state, open uniform `(uint32+0.5)/2^32`, and Box–Muller cos followed by cached sin. For each frame, all real innovations are drawn, then all imaginary innovations, from one uninterrupted stream. It intentionally does not pretend to reproduce NumPy PCG64 from the same seed. Complete filtered samples are compared to an independent Python reimplementation of this RNG and waveform.

`process(observation, options, hooks)` accepts nfft, max_wall_ms, stf_threshold, pfa_family and fractional_phase. Only the last three replace effective receiver Config fields. The original observation/config remain unchanged. No source waveform or scene changes occur during held processing. A new generator seed or target scene requires a new observation ID.

## Output

`acquisition` includes phase energies, selected phase, physical origin, full complex STF autocorrelation, pass mask/run counts, first and confirmation indices; preliminary delay and full lag128 products/sum; uncompensated searched preamble curve; original and corrected symbol arrays; complex searched STF, Gu/Gv contributions, CEF and preamble curves; fine timing/range; exact noise variance, threshold and search count; all acceptance gates and status.

`estimate` retains the acquisition record, every lag512 and adjacent-frame product, per-frame and pooled sums/frequencies/apparent velocities, explicit null adjacent-frame estimate at M1, pair counts, observation chips, CPI and principal intervals. `centered_channel` has every complex512 coefficient per frame, ell and delay axes, CP/extraction coordinates and ±128 algebraic neighborhood mask. Negative local-delay coordinates are not asserted negative target ranges.

For M≥2, `map` has every complex per-frame channel coefficient, complex DFT bin and linear power, range/frequency/apparent-velocity axes, bin spacing and finite-CPI resolution. `detection` retains the entire threshold mask and all local maxima in descending power order. Ties preserve range-major traversal within each Doppler row. Doppler neighbors wrap; range neighbors do not. M1 returns map and detection as null, not fabricated maps.

`provenance` binds the source, runtime version, exact held-sample hash, separate metadata hash, explicit policy overrides/effective receiver Config and scientific limitations. `resources` has limits, declared numeric-array budget and actual host elapsed time. This is not a browser heap guarantee.

## Numeric hashes and portability

The raw sample SHA256 hashes frame-major, sample-major little-endian Float64 real then imaginary bytes. All finite signed zeros are canonicalized to +0. This codec differs intentionally from the accepted Python Observation.digest byte contract when signed-zero bits differ. Exact raw bit hashes from that legacy reference are not interchangeable with this canonical port digest. Python oracle verification independently recomputes the port codec.

The metadata SHA256 separately hashes sorted-key canonical JSON of schema, config, known noise variance, origin, noise filter and synthetic provenance. Numeric signed zero is canonical +0. It is not the JSON-string hash of the sample arrays. Editing metadata does not change the sample hash; it changes metadata identity. Editing receiver policy preserves both original-held identities, and is separately reported in process provenance.

`exportObservation` creates a bounded plain JSON-compatible record. `parseObservationJSON` allows at most104,857,600 ASCII characters and rejects non-ASCII characters (observation metadata strings are also restricted to ASCII; escaped non-ASCII metadata is rejected at observation validation). JSON parsing/export serialization are synchronous and may allocate substantial memory; application-level file-size checks and Worker isolation are required before using maximum-size records. Direct Worker object import has its own structural/byte preflight. Export/reimport can verify sample/metadata hashes through the Worker integrity fields. A naked imported observation without expected hashes is structurally validated but does not establish who created it or whether bytes were changed earlier.

Same-runtime seeded generation is deterministic. JavaScript engines can differ in transcendental last bits; fresh-generation byte digests across engines are not promised equal. Held byte replay uses immutable supplied numbers; numerical parity against Python uses preregistered finite tolerances. A comparison mismatch, threshold tie or gate mismatch is retained as a failure, not hidden by looser post-hoc tolerance.

## Boundaries

The small runtime archive contains no paper PDF or historical/fresh large numerical fixtures. Full evidence archive adds those first-party simulated observations and their independent expected outputs. The ordinary runtime never reads oracle files. No arbitrary code, archive decompression, URL fetching, remote import or plugin access is permitted by the Worker protocol.

Truth-only evaluation accepts range0..100m and velocity±100,000m/s, estimates with absolute magnitude≤1,000,000, and diagnostic errors≤2,000,000. Larger or nonfinite values are rejected before summary arithmetic; extreme external inputs cannot silently become JSON null through Infinity.
