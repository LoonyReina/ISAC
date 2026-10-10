# PR #23 deployed research validation

Commit `6ae1f4cf6133c4a7f0509b1f6d48260f174b6a42`; Pages run `38059374750` succeeded. Live homepage, map JavaScript, reading page, directory CSS, waveform HTML/core JavaScript/UI JavaScript/CSS, and state JSON were checked against frozen release bytes.

## Actual cloud Chrome checks

Desktop client width: 1168 px. Narrow desktop client width: 323 px at 150% zoom. This was not a physical phone or device-emulation test. The browser was subsequently restored to 1168 px / 100% zoom.

### Waveform mechanism case

- Default complex covariance, β = 0.8, angle = 0°, user = 0 rendered reference MSE 0.94266 and optimal MSE 0.47741; energy 8 / 8; covariance residuals 1.00e-16 / 9.15e-16; objective lower bound 7.63849; optimum certificate −8.88e-16.
- Changing user preserved metrics and the reference pattern while changing constellation coordinates.
- Correlated covariance, β = 0, angle = 30° rendered reference 1.37595 / optimal 0.40558 and energy 8 for both. Plotted flatness spread was 2.84e-14 SVG pixels.
- Repeated reset restored all four controls and the default status deterministically.
- Narrow orthogonal covariance, β = 0.8, angle = −30° rendered 1.5680 / 0.3073 without document overflow.
- Desktop and narrow graphs were visually inspected: overlays, common axes, constellation and time samples. The narrow SVG width and viewBox were both 262; 14 px text and three tick labels were readable.

### Influential-research directory

- The directory displayed nine cards, exactly one implemented teaching-case link, and eight explicit notices that deep interactions were unavailable.
- Keyboard interaction opened optimal-waveform evidence. Distinct OpenAlex 980 / Semantic Scholar 972 counts, 2025 citing-year count 206, retrieval dates, awards and limitations were visible without narrow overflow.
- Directory → waveform → Back preserved the open evidence disclosure.
- The perceptive-network record displayed the noncomparable OpenAlex DOI count 1 and repository count 295, with Semantic Scholar 295 separately. Split counts were neither summed nor ranked.
- Captured console errors concerned Chrome extension metadata rather than site scripts. This is not an exhaustive clean-console certification.

### Map reveal

Map JavaScript v2 explicitly revealed the title and first question at 323 px. Accumulated root scroll padding and panel margin still placed the title near the viewport bottom. The bounded CSS margin correction and its pending deployment/retest are tracked in [Knowledge-map validation](KNOWLEDGE-MAP-VALIDATION.md).

## Limits and provenance

These observations were supplied by the actual release QA run; the offset-polish implementation did not operate a browser. No physical-phone, real screen-reader, JavaScript-disabled browser or print run was performed. Failure/recovery and all 54 selector states were checked separately in simulated DOM, not fault-injected in the live browser. No full-paper, hardware, BER or capacity replication is claimed.
