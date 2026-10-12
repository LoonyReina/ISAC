# Source and claim boundaries

## Main fixed source

Behdad, Demir, Sung, Björnson, and Cavdar, “Multi-Static Target Detection and Power Allocation for Integrated Sensing and Communication in Cell-Free Massive MIMO,” IEEE TWC 23(9), 11580–11596, 2024.

- DOI: https://doi.org/10.1109/TWC.2024.3383209
- Fixed version: https://arxiv.org/abs/2305.12523v2
- Fixed PDF: https://arxiv.org/pdf/2305.12523v2
- Prior research handoff verified v2 dated 2024-03-27; this model task independently rechecked the existing local PDF hash: `30b871e5bb3dd1a66fab1a4c2ab3974abb8a7e664e04e2dfa62f6e50679c0d10`
- The existing extracted text was independently inspected around §VII equations (20)–(33), confirming a maximization-based MAPRT with unknown RCS and target-free channels. Its prior includes general RCS covariance, while §IX/Table III discussion explicitly uses independent, equal-variance Swerling-I RCS for the numerical setup
- This task did not redownload, republish, or include source PDFs

The paper motivates unknown random reflectivity and central fusion. It is not the source of the exact two-receiver marginalized likelihood, analytic ROC, counterexample, or scalar-count implementation in this deliverable. Those are independent derivations from the explicitly stated teaching model. Our model omits unknown target-free channels, arrays, multiuser beamforming, optimization and the paper's full resource/network architecture.

“Unknown α with a known prior” does not make this model an implementation of that paper's MAPRT. Here α is integrated out, not optimized. No original paper figure is reproduced, and the κ-controlled correlated example is not labeled as the paper's simulation setup.

## Direct research motivation, with unresolved full-text provenance

Zou, Behdad, Demir, and Cavdar, “Distributed Versus Centralized Sensing in Cell-Free Massive MIMO,” IEEE WCL 13(12), 3345–3349, 2024.

- DOI: https://doi.org/10.1109/LWC.2024.3462710
- Existing handoff verified publication metadata and reviewed a public transcription, but did not obtain a stable official/author full text or a hashable PDF
- Therefore this paper remains motivation for asking about computation placement and two-way fronthaul
- This deliverable does not attribute unverified formula-level claims, resource formulas, fully/partly-informed algorithms, or original performance curves to it
- A later faithful paper comparison requires authorized stable full text; no access restrictions were bypassed

## Exact claims made here

Within this fixed, calibrated, known-white-noise, known-prior, two-receiver model:

1. Raw samples and the two complex matched outputs have the same likelihood ratio
2. For ρ>0 and κ=0, the energy sum realizes the same test; at κ>0 and ρ>0 local energies generally do not recover the complex LRT
3. At the same parameter point and Pfa, the complex-observation Neyman–Pearson test is optimal among tests of that observation; the energy-sum comparison is one particular compressed-data baseline
4. Analytic Pd averages over both random α and noise, using H0-calibrated thresholds
5. The bidirectional payload count is an explicit independent star-unicast accounting convention, not a source-paper formula or a measured network metric

Do not generalize these to unknown noise, unknown clutter, arbitrary priors, unknown calibration, finite-bit losslessness, full-map Pfa, localization accuracy, varying receiver counts, actual network latency, or all distributed algorithms.

Citation/influence counts and social-media claims were deliberately omitted from this numerical deliverable. Source PDFs and raw third-party full text are deliberately absent from its files.
