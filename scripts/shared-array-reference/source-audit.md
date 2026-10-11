# Source audit: Liu et al., separated/shared arrays

Verified 2026-10-11. This is a source map plus explicitly labeled deductions, not a reproduction of the paper or its figures. Full-text source PDFs are not redistributed in this repository.

## Editions and provenance

- Canonical article: **Fan Liu, Christos Masouros, Ang Li, Huafei Sun, Lajos Hanzo**, *MU-MIMO Communications With MIMO Radar: From Co-Existence to Joint Transmission*, **IEEE Transactions on Wireless Communications 17(4), 2755–2770, April 2018**, DOI [10.1109/TWC.2018.2803045](https://doi.org/10.1109/TWC.2018.2803045). The PDF header confirms vol.17; UCL's landing-page metadata incorrectly says vol.14. Preserve Fan, not DBLP's occasionally displayed Fang.
- Version of Record (VoR), directly inspected: [UCL PDF](https://discovery.ucl.ac.uk/id/eprint/1563386/7/Masouros%20VoR%2008288677.pdf), [UCL record](https://discovery.ucl.ac.uk/id/eprint/1563386/). Sixteen PDF pages, printed pp.2755–2770. First-page chronology: received 2017-07-03, revised 2017-11-16, accepted 2018-02-02, online 2018-02-09, current version 2018-04-08. CC BY 3.0 stated in PDF.
- Preprint, directly inspected: [arXiv:1707.00519v1](https://arxiv.org/abs/1707.00519v1), [v1 PDF](https://arxiv.org/pdf/1707.00519v1). Fifteen pages; submitted 2017-07-03 13:02:38 UTC; arXiv displays only v1, described as submitted to IEEE. It is **not established as an accepted manuscript**.
- [Southampton record](https://eprints.soton.ac.uk/419970/) identifies its [08288677 PDF](https://eprints.soton.ac.uk/419970/1/08288677.pdf) explicitly as **Version of Record**. Its acceptance date is metadata, not an AAM designation. The record is search-readable; direct web open returned 403. No separately labeled institutional accepted-manuscript file was located in the accessible UCL/Southampton records or targeted searches. Do not guess repository filenames or call a third edition verified.

## Evidence matrix and exact equation/page map

Page notation below: VoR printed page / arXiv v1 PDF page. Equations (1)–(20) retain their numbers.

| Topic | Source location | Faithful mathematical content |
|---|---|---|
| Physical deployment | Fig.1, Sec.II, 2757 / 3 | One N-element ULA; K single-antenna users. Split into radar NR and communications NC groups; hence NR+NC=N. Fig.1 draws contiguous left/right subarrays. Shared uses all N elements. This is one collocated platform, not two distant stations. |
| Channel convention | Sec.II-A, 2757–2758 / 3 | gi∈C^(NC×1), fi∈C^(NR×1), hi=[fi;gi]∈C^(N×1); H=[h1,…,hK]. Channel multiplies transmit vectors by **transpose**, not Hermitian transpose. Flat Rayleigh, perfect CSI. |
| Separated received signal | Eq.(1), 2757 / 3 | xi[l]=gi^T Σk wk dk[l]+fi^T sl+ωi[l]. R1=L^(-1)Σl sl sl^H; Wk=wk wk^H. |
| Separated communications covariance/power/SINR | Eqs.(2)–(4), 2758 / 3–4 | P1=Σk tr(Wk); C1=Σk Wk; βi=|gi^T wi|²/(Σk≠i|gi^T wk|²+fi^T R1 fi*+N0). Eq.(4) is on v1 p.4; (2),(3) on p.3. |
| Source independence | Sec.II-A assumption 1, 2758 / 3; Eq.(14), 2759 / 5 | Radar and communications signals statistically independent; aggregate covariance Ctilde=blockdiag(R1,C1). |
| Shared signal and covariance | Eqs.(5)–(8), Sec.II-B, 2758 / 4 | yi[l]=hi^TΣk tk dk[l]+ni[l]; Tk=tk tk^H; P2=Σk tr(Tk); C2=Σk Tk. Communication waveform itself probes radar; Eq.(7) has MUI+noise, no separate radar-interference term. |
| Steering and radar reference | Eq.(9), 2758 / 4; Eq.(10), 2759 / 4 | a(θ)=[1,e^(j2πΔsinθ),…,e^(j2π(Nt−1)Δsinθ)]^T; equal diagonal P0/Nt, PSD/Hermitian R. Eq.(9) least-squares pattern fit with free α≥0; Eq.(10) fixed 3-dB width and sidelobe margin. |
| Radar interference null | Eq.(11), 2759 / 4 | E|fi^T sl|²=fi^T R1 fi*=tr(fi*fi^T R1)=0, every i. |
| Separated radar optimization | Eqs.(12),(13), 2759 / 5 | Radar-only covariance with added null constraints; R1∈C^(NR×NR). **Printed normalization issues below**. |
| Separated aggregate pattern | Eqs.(14)–(18), 2759 / 5 | a=[a1;a2], a1∈C^NR,a2∈C^NC. Pd=a1^H R1 a1+a2^H C1 a2, no cross-block term. Comm pattern is fit to a nonnegative scalar σ times radar pattern. |
| Separated beamforming | Eq.(19), 2759 / 5; Algorithm1, 2760 / 5 | First fix R1 from (12)/(13), then fit communication beampattern under βi≥Γi, P1≤PC, Wk PSD rank-one, σ≥0. Sequential SDR, then rank-one recovery; not joint global optimization of both blocks. |
| Shared beamforming | Eq.(20), 2760 / 6 | Reference R2 from (9)/(10) with Nt=N. Minimize ||Σk Tk−R2||F², γi≥Γi, diag(Σk Tk)=P0·1/N, Tk PSD rank-one. |
| Main simulation settings | Sec.VI, 2764–2765 / 10 | N=20, P0=20 dBm, N0=0 dBm, half-wavelength ULA, iid standard complex Gaussian H. Fig.3–5 comparison: NR=14, NC=6, PR=PC=P0/2, K=4; Γ=10 dB for Figs.3,4. |
| Pattern scenarios and reported result | Figs.3–5, 2765–2766 / 10–11 | Five beams at −60°,−36°,0°,36°,60°; single beam centered at 0°, 3-dB width 10°. Reported example PSLR 7 vs15 dB; Fig.5 reports approximately 8-dB benefit under these settings. |

## Verified print inconsistencies requiring disclosure

Both PDFs were **visually inspected**, not only text-extracted, at VoR p.2759 and v1 p.5.

1. This is a **printed-normalization ambiguity only, not evidence of unequal-power author simulations**. Eqs.(12),(13) literally print **diag(R1)=PR·1/N**, not PR·1/NR. Yet R1 is NR×NR and prose defines PR as radar transmit power. Sec.II defines N as the total ULA count; Eq.(17) still distinguishes total N from NR/NC, and no local redefinition of N as NR was located in Sec.III-B. Thus, if those global definitions and the printed diagonal are applied literally, the conditional trace is NR·PR/N. A tutorial that intends tr(R1)=PR must explicitly state it uses the dimensionally/budget-consistent normalization PR/NR; do not silently attribute that correction to the paper. No author erratum or implementation was checked.
2. **Conditional arithmetic, not a claim about author execution:** for NR=14,N=20,PR=PC=P0/2, literal equations imply tr(R1)=0.35P0 and tr(Ctilde)≤0.85P0, while shared Eq.(20) enforces P0 exactly. Even with the intended PR/NR correction, Eq.(19) is ≤PC, so actual communication usage must be measured, not assumed to saturate.
3. Eq.(12)'s quadratic uses a rather than a1 despite R1 being NR×NR; v1 additionally prints R rather than R1 in this objective. VoR corrects R to R1 but retains a. For an executable tutorial, define the reduced steering a1 and annotate the repair.
4. Eq.(9)'s generic Nt-element steering/vector is textually labeled C^(N×1), another generic-Nt/global-N notation looseness. Use matched dimensions in new derivations.

## Mathematical deductions and limits (ours, not paper claims)

- To obtain C1=WW^H and C2=TT^H, explicitly state E[d]=0 and E[dd^H]=I_K (or equivalent unit-power uncorrelated-symbol normalization). The two bullet assumptions in Sec.II-A do **not explicitly spell this out**. Statistical radar/data independence gives the zero cross block with zero means; at finite L independent random sequences do not guarantee exactly zero empirical cross-covariance.
- With F=[f1,…,fK]∈C^(NR×K), the null operator is F^T. PSD R1 and Eq.(11) imply range(R1)⊆ker(F^T), so R1=ZQZ^H for F^T Z=0,Q≽0. Under generic Rayleigh channels nullity=max(NR−K,0); when K≥NR, nonzero nullspace radar transmission is impossible. NR>K is necessary for nonzero radar power, not sufficient for a given equal-diagonal/beampattern constraint.
- Shared data-only model has rank(C2)≤min(N,K). It is **not** the later/generalized model x=Wc d+Wr s with an additional independent radar stream. Separated rank(Ctilde)=rank(R1)+rank(C1) can exceed K. Consequently one cannot establish universal feasible-set containment or dominance merely by counting N versus NC.
- Same overall physical N and spacing does not imply equal usable coherent aperture in the two covariance models: cross-block entries are zero in separated, but may be nonzero in shared. Fig.1/steering partition support a contiguous baseline; interleaved or antenna-selected allocations require a separately stated model.
- The comparison combines hardware sharing, nulling, rank structure, separate/flexible power allocation, and sequential optimization. It is not an isolation of a single variable. Fixing PR=PC rather than optimizing their split further limits generality.
- The approximately 8-dB PSLR result is an example under the stated simulation settings and their chosen reference designs, not a universal theorem, not a communications SINR gain, and not direct proof of detection probability/CRB superiority. Sec.I-C (VoR p.2756) sets receiver designs and temporal processing aside.
- Monte Carlo sample count, paired channel realization policy, rank-recovery details, and the actual implementation's treatment of PR/N are not established by the inspected simulation text. A new controlled experiment should disclose them, use linear powers (P0=100 mW, N0=1 mW), and report realized transmit traces and post-recovery SINRs.
