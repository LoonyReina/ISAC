# Knowledge-map validation

## Deployed PR #22 checks

Commit `a3907b2e737105a85272a207b917a0cc64897ed6`; Pages run `38058751038` succeeded. Live `index.html`, `knowledge-map.css`, `knowledge-map.js`, and `site.css` were checked against the frozen release bytes.

Actual cloud Chrome checks used a 1168 px desktop client and a 323 px narrow desktop client at 150% zoom. The narrow check is not a physical-phone certification.

- Editorial hero and four-band overview were visually inspected; the narrow disclosure list was readable without document overflow.
- Searching CRB returned two entries. Enter preserved the query and URL without reloading. An unmatched term showed an explicit empty state; clear returned focus to search.
- Fisher selection showed seven typed relations; boundary filtering left one. Neighbor selection changed to estimation, and Back restored Fisher.
- Reset cleared query, selection and open groups. Escape from I/Q selected inside communication returned actual focus to the visible summary, not its hidden child button.
- Narrow I/Q → OFDM neighbor → Back restored the title without horizontal overflow.
- A direction deep link exposed six levels and three reverse concept relations. Its native pilot experiment link and Back restored the selected direction.
- The old homepage velocity-matching anchor redirected to foundations with its query and anchor intact and displayed the velocity module. The old research near-field case anchor redirected to the corresponding reading case with its query and anchor intact.

### Historical issue and PR #23 retest

The PR #22 narrow-browser pass found that focusing a tall detail container could reveal its middle rather than its beginning. PR #23, commit `6ae1f4cf6133c4a7f0509b1f6d48260f174b6a42`, changed selection to `focus({preventScroll:true})` followed by `scrollIntoView({block:'start',behavior:'auto'})` in map JavaScript v2.

The deployed PR #23 reveal behavior was retested in actual narrow cloud Chrome. Explicit start reveal worked, but the root scroll padding and the panel's large scroll margin accumulated. At a 323 px client width and 507 px viewport height, the header bottom was approximately 100.2 px, the panel top 310 px, and its title 414 px. This left excessive empty space above the selected content.

## Bounded offset polish

Based on verified main `6ae1f4cf6133c4a7f0509b1f6d48260f174b6a42`, this follow-up changes only the detail panel's desktop and narrow scroll margins to 16 px. The root scroll padding continues to reserve header space; the panel contributes a small additional gap. The map stylesheet cache version advances to v2; map JavaScript remains unchanged at v2.

Local validation:

- Focused CSS regression checks both 16 px panel offsets, retained root header offsets, and the stylesheet/JavaScript cache versions.
- `node scripts/generate-site.cjs --check`: passed.
- `node --test tests/knowledge-map.test.cjs`: 24 passed, 0 failed.
- `node --test tests/*.test.cjs`: 258 passed, 0 failed.
- `git diff --check`: passed. Existing JavaScript files remain byte-identical to the base commit.

The checks above are static and simulated-DOM validation, separate from browser validation. Deployed PR #23 waveform and directory checks are recorded in [Research-release validation](RESEARCH-RELEASE-VALIDATION.md).

This latest offset polish is awaiting deployment and actual browser verification. No new title/panel coordinates are claimed for it. After deployment, repeat narrow selection and neighbor selection, confirm the title and question appear comfortably below the header, then check Back and Escape focus behavior.

## Limits

Physical phones, real screen readers, CSS print expansion, and browser JavaScript-disabled behavior have not been certified in these browser passes. Static and simulated-DOM tests cover fallback structure and interaction contracts separately. Scientific numerical controls are unchanged; no new full scientific-browser regression is claimed for these styling releases. Browser observations above were supplied by the release QA run; this follow-up implementation did not operate a browser.
