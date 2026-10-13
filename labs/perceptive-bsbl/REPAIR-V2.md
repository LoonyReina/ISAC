# Perceptive lesson reset repair v2

This is a separately versioned functional repair of the lesson frozen at commit `5a98c4d421f3a8762811f06ad5462db78aabd769`, tree `8a513fc3b21c064f352303876808cf6cfe3aa6b3`. Its original freeze, public asset map, test inventory and independent failing evidence remain unchanged. This repair does not change numerical algorithms, the native record contract, the session/checker module, or any of the 12 accepted v2 runtime files.

## L01: late reset/disposal ownership

The original mounted reset awaited session disposal and then unconditionally installed a new empty session. Two overlapping resets could therefore allow the older completion to erase a newer import or completed real Worker result, leaving the newer session undisposed. A rejected old disposal could also write a stale error onto the newer UI.

The mounted controller now captures a lifecycle generation and retiring session before awaiting. It may replace the session, restore controls or report a cleanup failure only while that exact generation/session still owns the page. Session replacement and genuine pagehide advance the lifecycle generation. Subscription callbacks are bound to their session. Final destroy marks itself closed and detaches listeners before asynchronous disposal, so an old completion cannot create another session. Same-document hash/Back navigation does not change this generation or cancel active computation.

An obsolete disposal completion/rejection does not change current records, selectors, check state or errors. A current cleanup rejection is still displayed honestly; a later explicit reset can retry. No missing record or result is synthesized.

## L02: coherent default controls

A winning reset restores the `default` scenario and `all` five-method selector together with default paths, SNR, seeds, noise override, action/work/wall budgets, truth visibility, and matrix/action/array view coordinates. The old implementation restored the underlying path/SNR draft while leaving a visible weak preset and primary-only selector.

## Validation

Eight new deterministic mounted tests use real Node module Workers, delaying only actual termination acknowledgements when needed. They cover newer import, completed new run, still-running new run and cancellation, departure/return, final destroy, late cleanup rejection, current cleanup rejection/retry, and a full default five-method execution after reset. All earlier tests remain in the versioned `OWNED-TESTS-V2.json` inventory.

Corrected red regressions against the unchanged original controller preserve the observed old-session erasure and selector mismatch. They are failing diagnostic evidence, not passing release gates. The initial red runner asserted a newly added return value too early; the corrected runner removes that assertion and fails on the actual historical defects instead. Both logs are retained transparently.

`FUNCTIONAL-FREEZE-V2.json` and `PUBLIC-ASSETS-V2.json` give the new exact binding. Original `FUNCTIONAL-FREEZE.json`, `PUBLIC-ASSETS.json` and `OWNED-TESTS.json` remain historical v1 artifacts. Current root owned tests select the v2 inventory, adding rather than replacing coverage. The only existing public functional source changed is `lesson.mjs`; this document is an added public correction record.

Actual browser scheduling/rendering, full-site integration and deployment remain separate gates. No browser, publication or user Codex was used in this repair.
