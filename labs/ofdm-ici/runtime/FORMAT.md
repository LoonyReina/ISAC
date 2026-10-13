# Accepted inputs and actual outputs

## Input v1

Only `schema_version,input_revision,mode,config,simulation,x,y,noise_variance,y_ici_free_counterfactual,max_wall_ms,expected_hashes` are permitted. Version must be `ofdm-ici-input-v1`. Revision is a nonempty string of at most128 characters. The Worker also uses a unique runId, distinct from input revision.

Simulate mode accepts only `simulation:{seed,noise_seed,noise_variance,targets,symbols?}`. Seeds are uint32. Generator is explicitly Mulberry32 with Box–Muller Gaussian pairs, not NumPy PCG64. Symbols are QPSK by default, or declared qam16/all_ones. Up to8 targets have delay_samples∈[0,16], epsilon∈[−32,32], angle_deg∈[−89,89], and alpha_real/alpha_imag∈[−100,100]. CP-valid but unretained delays and out-of-search CFOs stay unaltered.

Raw mode accepts explicit x shape[64,16], y shape[16,64,8], positive noise_variance, and optional separately labelled synthetic y_ici_free_counterfactual with Y's shape. Every complex array is `{shape,real,imag}` with exact-length flat row-major arrays or unshared Float64Array components. Components must be finite and bounded by1e6; known symbols must have magnitude≥1e−12 because the operational comparator divides by X. No truth, receiver output, detection or support fields are accepted in raw mode.

Optional expected_hashes requires x_sha256 and y_sha256, and may include y_ici_free_sha256. Hashes use complex interleaved IEEE754 Float64 little-endian bytes. The exported raw contract supplies them. Hash mismatch aborts execution. Hashes verify byte integrity, not authenticity or physical truth.

`parseRawJSON` applies a5 MiB character cap before JSON parse; Worker preflight applies its separate4 MiB approximate object budget. Both reject invalid structures; exact shapes, numbers and dimensions are checked by the kernel. Transport allocation occurs before worker preflight, so callers should check file size before reading untrusted files.

Config keys correspond to the pinned Python dataclass. Fixed dimensions/physical constants/rank tolerance and refine=false are enforced. Angle points≤321 with endpoints on grid, CFO points3…113 inside the source principal interval, Pmax1…4, model order null or0…7. CFAR guards are strictly smaller than bounded training half-windows. Unsupported extension requests reject explicitly.

## Output v1

`computation:'fresh'` means the returned data was numerically recomputed from this accepted input, even if imported X/Y originally came from a historical fixture. It never means a new measurement or new random draw. Historical result JSON cannot masquerade as an input.

Top-level provenance includes revision and SHA256 of X, Y and fixed-key-order config JSON. Receiver and operational FFT use that same provenance; the counterfactual has its own Y hash plus paired operational Y hash. Each MUSIC, angle, iteration and recovery carries the accepted revision.

Actual outputs include:
- Complete accepted X/Y, generator/noise when generated, config, effective observation count, units and knowledge policy
- MUSIC empirical covariance, ascending eigenvalues, MDL score/order, noise projector, full angle spectrum, selected peaks/endpoints/shortfall and eigencertificates
- Every OMP input residual/R/capon beam, every fixed CFO coordinate/cost/rank status, selected Q/beam, normalized Eq65 and absolute Eq49 statistics, exact accept/reject status
- Every accepted joint CFO support, refit channels, Q/beam, scalar model and complete array model_cube, original-Y output residual, condition/normal/distortionless/reconstruction/objective invariants
- Every actual complex frequency channel, full unpadded RD power, CFAR threshold/count grids, all detections, complex gains, slow ambiguity, CFO zone and literal unwrapped estimates
- Known-X FFT maps from identical Y and angle candidates; synthetic ICI-free maps separately
- Simulation evaluation by one-to-one assignment, misses/false detections, conditional RMSE and both FDR denominators. Raw-mode evaluation is external via ICIEvaluation and cannot enter inference

Real array outputs are `{shape,data}`. `K.toJSON` converts typed arrays to JSON arrays and nonfinite numeric failure cells to null. No raw detection is pruned by truth, target count or display selection. Rank stops, search-boundary flags, flat-profile warnings and OMP caps are retained. Nonconverged linalg becomes an explicit failure, never loaded/pseudoinverted silently.

The source normalized GLRT threshold and nominal CA-CFAR Pfa have different meanings. Raw APES channel gain has a distortionless receive normalization, whereas ordinary FFT uses the source unnormalized receive sum. Raw gains/maps cannot be treated as identically normalized.
