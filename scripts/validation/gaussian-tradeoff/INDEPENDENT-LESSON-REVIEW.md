# Independent Gaussian matrix lesson review

Status: PASS for the final frozen local lesson/Node execution and evidence scope, 13 October 2026 UTC. All confirmed findings below are corrected and rechecked on the accepted bytes. This review is limited to local source, production mounted UI callbacks, actual Node workers, SVG markup and downloadable numerical evidence. It does not certify a real browser, layout engine, screen reader, mobile performance, remote environment, published site, source-figure match or full-paper reproduction.

## Isolation and accepted prerequisites

All reviewer changes and evidence live in this review directory. Owner files were read and copied, never edited. Initial and revised snapshots and failures are retained. The page source is `content/pages/gaussian-tradeoff.html`, intended public route `gaussian-tradeoff.html`.

The seven production runtime files must remain byte-identical to the accepted port. Source-freeze SHA-256 is `ea5c2ad520d33962b4d33e9f6e9f89e9ddaa3e1ee41e4d249250c54da91cb113`. The prior independent port-review SHA-256 is `167fc761ff93b4f89b5bc7e59e2f3392e325c133306c96cf9614ac161c4f7a57`. The copied Python reference core is independently pinned to `b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2`.

## Executed review

Final verification used the archive-derived `final-snapshot/`, without owner-source imports. All checks passed:

- 45/45 named author lesson tests, exercising production mounted controls and actual Node workers
- 9/9 independent adversarial lifecycle/input-ownership cases
- 50/50 independent matrix/SVG/table/record checks
- 16 reviewer-selected live cases yielding 32 genuine UI downloads; 482 Python oracle/encoding checks
- All 18 owner UI downloads from nine cases, including M=Nc=Ns=6, T=32, B=512 and six weights; 234 additional Python oracle/encoding checks
- All 50 raw/history files explicitly replayed through mounted production import/replay/export controls, producing bitwise-identical fresh history downloads
- 37/37 codec/Worker regressions on a separate isolated, byte-identical runtime copy
- 103/103 owner-freeze members verified, with all 47 portable-capsule entries checked before extraction; no duplicate, traversal, symlink or undeclared member

The two Python batches total 716 checks. This is a count of named checks, some covering several scalar or matrix identities, not a count of independent random experiments. The nine owner cases and 16 reviewer cases are separate evidence batches and include overlapping scenarios.

Final owner lesson-freeze SHA-256: `c4d52b780e100daaed3fe7ba5259eb57135af076e40cdd00da3ae4e850d2e41f`.

Portable capsule: 284,622 bytes; SHA-256 `bc911703991d7c0bc1457793eff79aaf503b25735129d9b1c897312db955b7d9`.

Final page SHA-256: `109df43838495394b7020f8b9de640ab9677a4bf9cd135254b2a9d21b57e5447`.

Final production controller, entry and view SHA-256, respectively:

- `0ec5f2562224a61fc065a59da21d56532d51ba9eba0c26e0d4a7fb96a015ba03`
- `31b7eda801a49ffb167af53c02faefaab43feb5b29aa84c66d068c33b5af2cfb`
- `aa6f5749b16fd48cb3c2a0983b96cde7d343931e10cd028b0d33221160885d64`

All 103 owner members and all 46 manifest-listed extracted members remained byte-identical after the final reruns. The 47th archive member is its manifest. `OWNER-LESSON-FREEZE.json`, `package-audit.json`, `owner-freeze-verification.json` and the review freeze record these identities.

The reviewer captures actual production raw/history button downloads for independently chosen continuous weights and complex channels at M=1 through 6, changed T/Ns/noise/power/prior, a non-real singular custom covariance, zero communication channel, held Gaussian/Stiefel posterior data, finite Wishart cases at T<M, T=M and T>M, and rank-one sphere cases including T=16/SNR=100. These are live computations, not substituted fixtures.

`audit_downloads.py` independently decodes canonical tagged binary64 JSON and recomputes SHA-256 in Python. It checks every captured file's exact wire bytes and historical/non-fresh semantics. The numerical oracle combines direct NumPy complex/full-real likelihood calculations with the frozen Python core, including independent SciPy covariance optimization. It verifies Q trace and PSD, Gaussian MI per complex use, covariance error, full complex supporting-plane certificates, active/null KKT scores, raw block means and standard errors, energy normalization, X/Y/R, truth-only scores, posterior means, row/column covariance orientation and complete real BFIM. Finite Wishart values are separately checked with high-precision polynomial moments; MP includes the structural zero atom; sphere MI uses the independent noncentral chi-square output density.

`replay_downloads.mjs` imports each actual raw/history file through mounted production controls, verifies that import alone starts no worker and displays no fresh result, explicitly reruns it through a fresh actual Node worker, and compares the new production history download byte-for-byte with the original history.

`audit_views_records.mjs` checks every rendered heatmap cell/title and numeric table entry for both input laws and ten matrix views in both real and imaginary components. Eigenvalue, tradeoff and energy marker coordinates use actual arrays and retain zero directions. The large full-real BFIM retains all 5,184 cells and all 5,256 table cells while thinning visible index labels. Other checks cover changed-seed data, held improper-prior rejection, oversized files rejected before read, exact UTF-8/signed-zero import/download/replay, and digest-valid fabricated history never being treated as a computation.

`audit_lifecycle.mjs` deliberately pauses SHA-256 and old worker termination while newer UI actions finish. It checks obsolete raw export suppression, stale invalid-import error suppression, valid import supersession, fresh nonpreset inputs, correct custom-Q classification, delayed Restart versus newer completion/pagehide, input ownership before readiness, and cancellation during a delayed factory. These controlled delays wrap actual Node workers, not a numerical worker mock.

The accepted runtime's own 37 codec/Worker regressions were separately rerun on an isolated copy. They include exact finite binary64 and signed zero, Unicode/UTF-8, sparse/nonfinite/accessor/prototype rejection, record bounds, snapshot mutation, transport caps, worker death, errors, cancellation and VM module-branch behavior. Some protocol scheduling fixtures are synthetic; the VM is not a browser. This rerun supplements the earlier independent port review rather than replacing it.

## Findings and corrections

1. A raw export delayed in SHA-256 could download an obsolete result after a newer computation completed. The controller now binds export delivery to its captured result/history identity and lifecycle. Invalid rejected candidates still preserve an otherwise valid export.
2. A stale corrupt import could rethrow a hash mismatch into the generic UI action handler and contaminate a newer successful result. Stale rejected imports now return cancellation, and action error rendering is fenced.
3. Restart captured its lifecycle only after awaiting old worker termination. A newer completed run was relabeled idle, and a hidden page was relabeled dead. Restart now fences its own pre-await epoch/ticket through termination, readiness and errors. Both red cases pass after the fix.
4. Custom covariance rows incorrectly used the pure-communication-endpoint KKT label. They now state that the optimizer score is inapplicable.
5. A blanket heatmap caption said entries were not power, even for Q/R diagonal entries. The caption now distinguishes raw real/imaginary components from elementwise modulus-square and identifies Q/R diagonals as per-port power.
6. Full 72×72 BFIM index labels were all drawn in a 220-pixel-high matrix. Visible labels are now thinned while all cells and table values remain. This is a source/SVG geometry correction, not a visual browser acceptance claim.

The first isolated author gate also exposed its stale provisional kernel hash, stale file-selection clearing and an unhidden empty truth panel after raw import. Those initial failures remain in the logs and are rechecked by the final author gate. The hash issue was a test pin, not a change to the accepted kernel. The owner additionally captured input before asynchronous startup and made cold startup visibly cancellable; the reviewer independently checks both behaviors.

The initial Python audit assumed Gaussian summaries had the same `status` property as Stiefel. Its preserved KeyError was corrected to optional-status handling; it was a reviewer error, not a numerical defect.

## Scientific and UI boundary review

The lesson explicitly separates exact Gaussian-input log-det MI, general-MIMO Stiefel finite-SNR MI that is not computed, finite rank-one sphere quadrature, and zero MI for a known deterministic waveform. Covariance outer points are not certified jointly achievable points. Gaussian block energies remain random and unnormalized; realizable Stiefel samples have R=Q and fixed energy. The proper prior retains T<M and nullspace error contributions. The estimator receives X/Y and assumptions, while ground truth only scores draws.

Operational reconstruction remains explicit: Eq. (48)'s sensing-minus-rate objective is used despite the printed Eq. (109) sign conflict; the complex likelihood determines the Eq. (93)/(94) real-coordinate/prior-factor interpretation. Both Figure-10 total-power and per-antenna conventions remain separate single-channel presets, not new fading-curve reproduction. MP is only used for isotropic covariance and remains an approximation. Numerical certificate thresholds and quadrature diagnostics are not rigorous interval proofs.

Current scalar prerequisite preservation is separately recorded: the pre-lesson indexed `theory.html` is byte-identical after removing one additive new-lesson link, and all 129 prior IDs remain in the same order. This is narrower than whole-site integration acceptance.

The source declares numerical/resource limits, cooperative cancellation/time limits, 64 MiB canonical record bound, and that text/clone/snapshot allocations can coexist. A record limit is not a process-memory guarantee. Rendering retains frozen result references rather than deep-cloning the complete history on each redraw. Real browser module loading, CSS geometry at device breakpoints, actual keyboard/focus/screen-reader behavior, download prompts, background scheduling and browser/device memory remain unrun.

## Reproduction

Run commands from this review directory with Node 24 and Python 3.12/NumPy/SciPy/mpmath available. The exact commands used for the final review are:

```sh
node --test final-snapshot/labs/gaussian-tradeoff/lesson/tests/*.test.mjs
node audit_lifecycle.mjs final-snapshot final
node audit_views_records.mjs final-snapshot final
node capture_downloads.mjs final-snapshot final-independent-downloads
python audit_downloads.py final-independent-downloads final
python audit_downloads.py final-owner-downloads final-owner
node replay_downloads.mjs final-snapshot final-independent-downloads final
node replay_downloads.mjs final-snapshot final-owner-downloads final-owner
node --experimental-vm-modules --test runtime-regression/tests/codec.test.mjs runtime-regression/tests/protocol.test.mjs
```

Preserve existing evidence and choose new output directories/tags for a repeat. `audit_package.py` and `verify_owner_freeze.py` document the original freeze/package validation and refuse to overwrite extracted directories. The final reports are `final-owner-tests.log`, `final-lifecycle-results.json`, `final-view-record-results.json`, `final-download-oracles.json`, `final-owner-download-oracles.json`, `final-mounted-replay.json`, `final-owner-mounted-replay.json` and `runtime-regression.log`.

`REVIEW-FREEZE.json` pins this report, the complete accepted owner snapshot, extracted portable snapshot, reviewer scripts, final evidence and preserved initial/intermediate failures. `verify_review.py` verifies it. This is ready for separate site integration/build review and subsequently authorized actual-browser acceptance; neither is supplied by this report.
