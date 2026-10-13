# Independent IEEE 802.11ad SC sequence source audit

Checked 2026-10-12. Scope: chip identities, chip ordering, STF/CEF construction, and pi/2 modulation. This is original audit commentary, not a copy of a standard, paper, or third-party implementation. No third-party files are included in this deliverable.

## Result and confidence

The 128-chip pair below is source-backed by an official IEEE editorial contribution and matches every chip in an independent authors' SC-PHY simulator. It is materially stronger evidence than a generic complementary-pair test. The sequence, SC preamble ordering, and a reproducible rotation convention are established. **Full IEEE PHY conformance and exact reproduction of Kumari et al.'s unpublished simulation implementation are not established.** No normative IEEE standard edition was independently opened in this audit.

## 1. Exact chip-generation recurrence

Let A0(n)=B0(n)=delta(n), with delta(0)=1 and zero elsewhere. For k=1,...,7:

- Ak(n) = Wk A{k-1}(n) + B{k-1}(n-Dk)
- Bk(n) = Wk A{k-1}(n) - B{k-1}(n-Dk)
- D = [1, 8, 2, 4, 16, 32, 64]
- W = [-1, -1, -1, -1, +1, -1, -1]
- Ga128(n) = A7(127-n), Gb128(n) = B7(127-n), for n=0,...,127

The final reversal is essential. Implement the recurrence with zero extension and enough storage for the delayed coefficients. Do not replace the permuted D by sorted powers of two. Do not truncate each intermediate stage to 2^k samples: after the second stage D=8, support already extends through n=9.

Primary source: [IEEE 11-17-1811-00-000m, 20.11 Golay Sequences](https://mentor.ieee.org/802.11/dcn/17/11-17-1811-00-000m-20-11-golay-sequences.docx), dated November 20, 2017. Its tracked changes propose correcting the reversal argument from 128-n to 127-n (and similarly 64 to 63, 32 to 31). The D/W vectors and recurrence are not those proposed numerical edits. This is an editorial proposal against IEEE 802.11-2016 / REVmd D0.4, not itself a normative standard. Its unedited statement about stage support n<2^k is inconsistent with its permuted delay vectors; the recurrence with zero extension resolves that inconsistency.

Additional primary support: [IEEE 11-16-0994r1, EDMG STF and CEF Design for SC PHY in 11ay](https://mentor.ieee.org/802.11/dcn/16/11-16-0994-01-00ay-edmg-stf-and-cef-design-for-sc-phy-in-11ay.pptx), Intel, July 27, 2016. Slides 21-24 identify the legacy pair as the core pair, give the 11ad delay vector, and list this W as the first 128-chip pair. The proposal references REVmc D5.4; its new 11ay sequences must not be confused with the explicitly described legacy 11ad pair.

### Independent chip-exact check

The recurrence above was implemented independently with seven length-128 integer array updates. Its reversed outputs equal all 256 literals in [Jiri Milos / Brno University of Technology's Spreading_params.m](https://github.com/jirimilos/802.11ad-phy-sim/blob/f986bfcecf0c621c8adcd125426836d8c311d8e6/Spreading_params.m). These are primary code by authors of the 2019 NorCAS SC-PHY simulator, not code by Kumari et al. Forward outputs do not match.

Compact exact encodings: read the following 128 bits most-significant-bit first, map 1 to +1 and 0 to -1, with the first bit representing n=0:

- Ga128: C059CF563FA6CF56C059CF56C05930A9
- Gb128: 3FA630A9C05930A9C059CF56C05930A9

SHA-256 of the 128 signed-int8 chip bytes in transmission order (+1=0x01, -1=0xff):

- Ga128: df184ba9daeb4e0c9dd29e814c2c11ba37f4d6a155da21ffbb1b2a422f397ba9
- Gb128: 56adf5bf5c62b2f75ae1e79d71253d9100f2bafcc300a6176362e3ffc97ad251

[Official MathWorks wlanGolaySequence documentation](https://www.mathworks.com/help/wlan/ref/wlangolaysequence.html) independently identifies the generator with IEEE 802.11ad-2012 section 21.11 and supports lengths 32, 64, 128. Its public page supplies neither the 128-chip arrays nor generator source. A MATLAB runtime oracle was not run, so do not label the chip check “validated against MATLAB.”

## 2. STF and CEF order

Write A=Ga128, B=Gb128, and brackets for concatenation:

- STF = [A repeated 16 times, -A], length 2176 chips
- Gu512 = [-B, -A, +B, -A]
- Gv512 = [-B, +A, -B, -A]
- CEF = [Gu512, Gv512, -B], length 1152 chips
- STF plus CEF = 3328 chips
- The boundary-sensitive CEF context is [-A, Gu512, Gv512, -B], length 1280 chips

These signs/order are stated on slides 4 and 7 of IEEE 11-16-0994r1 and independently implemented in [the authors' WIFI_TX_ad.m](https://github.com/jirimilos/802.11ad-phy-sim/blob/f986bfcecf0c621c8adcd125426836d8c311d8e6/WIFI_TX_ad.m). The code contains a caution that the frame waveforms should be checked against the standard, so it is corroboration rather than a normative compliance certificate.

[The fixed Kumari et al. paper, arXiv:1702.05833v1](https://arxiv.org/pdf/1702.05833v1), printed page 6, Fig. 2, was visually inspected. Its a512 bracket matches Gu512 and b512 matches Gv512, followed by -b128; Section II-A gives sixteen a128 repetitions and -a128. The figure also labels the first two 256-chip halves [-B,-A] and [+B,-A]. The paper's names do not justify replacing the displayed blocks by another textbook 512-chip Golay pair.

In particular, the two isolated displayed 512-chip blocks are not an aperiodic complementary pair: the independently checked sum of their aperiodic autocorrelations is 1024 at zero lag but 2 at lag +1 (and -1). Complementarity of A/B is insufficient to infer cancellation of detached Gu/Gv records. Preserve the surrounding chips and explicitly state the correlation windows, timing origin, lag range, and CP treatment.

## 3. Pi/2 modulation and paper-model caveat

The primary simulator constructs the real STF/CEF above and multiplies each field's chip k by exp(+j*pi*k/2), beginning at k=0. Thus the reproducible convention is x[k]=s[k]j^k. Every 128-, 512-, 1152-, and 2176-chip boundary is a multiple of four, so resetting this phase index at these preamble boundaries is exactly equivalent to continuing a single global index.

For a delayed chip stream with integer fixed delay d, y[k]=h*s[k-d]*j^(k-d)*exp(j*omega*k), receiver derotation j^(-k) produces h*j^(-d)*s[k-d]*exp(j*omega*k). The delay-dependent constant phase can be absorbed into each target's unknown complex gain. This mathematical equivalence supports an explicitly de-rotated chip-domain model. It does not establish equivalence for arbitrary fractional-delay filtering, time-varying delay, a complete waveform's pulse shaping, or regulatory spectral behavior.

Kumari v1 does not explicitly specify the pi/2 rotation in the inspected waveform/preamble discussion. Its Eq. 16 uses a128 without a conjugate, consistent with a real/de-rotated template, while Eq. 18 uses conjugated templates. These facts do not uniquely prove whether the authors' internal arrays were real or modulated. Recommended label: “source-backed standard Ga128/Gb128 chips and SC block order; explicitly de-rotated chip-domain radar model; not full PHY conformance.”

## 4. Provenance and unresolved points

Downloaded official source-file SHA-256 values, for audit reproducibility only:

- IEEE 11-17-1811-00 DOCX: 9800bac743237baa091729706365613c3e68e5f0e0b63c6df552046c08a25452
- IEEE 11-16-0994-01 PPTX: a213c9a7e3d5832f966392d314ca6795e354530b79c42b6b356f2df6cc9fc36c
- Authors' Spreading_params.m at the checked head: 29c09c512ee7c88fc750fa7f4f0139ae4c8e59a3f64f01404ceda25dd1b37285
- Verified authors' repository HEAD: f986bfcecf0c621c8adcd125426836d8c311d8e6 (2020-01-27)

Not verified here: adoption history of the 2017 editorial fix; bit-for-bit comparison against an actual licensed WLAN Toolbox execution; normative full PHY text; Kumari authors' source code; phase normalization across an entire generated packet outside the preamble; spectral masks, pulse shaping, and final-journal changes. Do not promote any of these to a passed conformance claim.


## Owner implementation decision after independent source audit

The executable receiver defaults to the independently corroborated physical chip modulation j^n BEFORE finite pulse shaping (`rotation="pi2"`), rather than adopting the earlier suggested de-rotated model label. `rotation="none"` is a separately selectable diagnostic. Integer-delay chip-domain equivalence does not justify silently exchanging these models for fractional-delay pulse-shaped samples. The fixed radar paper does not explicitly settle its modulation convention, so the default is a stated primary-implementation-backed reconstruction choice. Full-PHY compliance remains false.
