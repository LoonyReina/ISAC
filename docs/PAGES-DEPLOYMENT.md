# GitHub Pages build and deployment

The workflow is `.github/workflows/pages.yml`. The deploy job only consumes the verified artifact from its own successful build job. The existing public URL and paths remain unchanged; no runtime URL rewriting, JSON regeneration, or content transformation is added by this workflow.

## Verification contract

- Node.js 24, Python 3.12; NumPy 2.3.5 and SciPy 1.17.0 match the checked-in waveform validation metadata. Only binary wheels are installed; no third-party JavaScript build dependencies or package cache are needed.
- `node --test tests/compatibility-build.test.cjs` tests the new build boundary.
- `node scripts/build-compatibility.cjs --test --reproducible` stages the current mapped sources in the compatibility layout, runs the unchanged site generator and freshness check, recomputes scientific waveform invariants, runs all 956 existing JavaScript regression tests, independently builds a second clean tree, and writes only the explicit public paths to `dist/`. The normal build accepts current source edits; the separate `--audit-migration` release gate checks the old whole-tree baseline and exact maintainer-document exceptions.
- `node scripts/build-compatibility.cjs --check` checks the existing artifact again; `git diff --exit-code` rejects tracked-source changes.
- The Python check preserves canonical JSON bytes. BLAS/SVD sign choices can change regeneration output even when the result is scientifically equivalent. Do not replace `--check` with ordinary waveform generation in CI or compare newly generated waveform JSON byte-for-byte.
- `include-hidden-files: true` is required in upload-pages-artifact v5 to preserve `.nojekyll`. The manifest/build checks reject unmapped files, symlinks, and unexpected public paths before upload; migration snapshot hashes are checked only by the explicit audit mode.

## Security boundary

Workflow-level permissions are empty. Build gets only `contents: read`, with checkout credentials not persisted. PRs use `pull_request`, never `pull_request_target` or `workflow_run`; PRs cannot upload a deploy artifact or start deployment. No repository secrets, personal access token, or persistent credentials are introduced. The deploy job has only `pages: write` and `id-token: write`, runs only on main push/manual dispatch, uses `github-pages`, and neither checks out the repository nor executes its code. Deployment waits for every build verification step to pass. An active deployment is not cancelled by a newer run.

## First-cutover procedure and recorded result

1. Keep current main/root source files and Pages configuration intact while preparing/reviewing the workflow and building the exact artifact. Do not move/delete the old published root files yet.
2. Merge the compatibility builder and this workflow with root source files unchanged. Verify the build job is green and its 367-path artifact exists for the expected commit. The first deploy may fail while Pages still uses branch publishing; this does not mean the artifact build failed.
3. After the green artifact is confirmed, change repository Settings → Pages → Build and deployment → Source to GitHub Actions. Keep the current domain/URL settings. This is a one-time authorized configuration change performed separately, not by workflow code.
4. Rerun the workflow on main using `workflow_dispatch`, or rerun the failed deployment if its artifact is still retained. Confirm the deployed revision equals the intended main revision.
5. Verify the live public URL, all compatibility entry points, HTML headers/navigation, local assets, anchors, and canonical JSON against the artifact. A green deployment alone is not full browser QA.
6. Only after this succeeds should source-directory relocation proceed through the fixed compatibility/public manifest mapping. Root source deletion before a verified Actions publication is explicitly out of scope.

The initial cutover was verified on 2026-10-12 at main `2e2625215f107ae8e6117650b80e5946192c645d`: hosted run `38196311829` built and deployed successfully, artifact `11723447928` contained the compatibility tree, and repository Pages Source persisted as GitHub Actions. Live geometry and reading entry checks passed before authorizing source relocation. This record concerns that revision, not future deployment results.

Rollback before relocation: restore Pages publishing to main/root if needed; retained root files remain available. After relocation, restore the previous source-preserving commit or redeploy a known-good verified artifact. Never improvise by deleting Pages or creating a new site.

## Verified action pins (official upstream, 2026-10-12)

- Checkout v7.0.1: https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1
- Setup Node v7.1.0: https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1
- Setup Python v7.0.0: https://github.com/actions/setup-python/commit/5fda3b95a4ea91299a34e894583c3862153e4b97
- Upload Pages artifact v5.0.0: https://github.com/actions/upload-pages-artifact/commit/fc324d3547104276b827a68afc52ff2a11cc49c9
- Deploy Pages v5.0.1: https://github.com/actions/deploy-pages/commit/368f82528645a54fb793d4d04e342629a3f51346
- Official deployment requirements: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

The pinned upload-pages-artifact action itself pins upload-artifact v7.0.0 to `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`. It packages the already verified static tree without invoking Jekyll. `configure-pages` is intentionally unnecessary here: no generator needs Pages metadata, and the separate configuration cutover should not be performed from untrusted build code.

## Local verification record

On 2026-10-12, `python3 scripts/generate-waveform.py --check` passed under Python 3.12.14 / NumPy 2.3.5 / SciPy 1.17.0 in 0.598 seconds. This recomputed 27 states, 540 random feasible checks, edge cases and independent SLSQP checks. Full GitHub-hosted workflow execution and live publication must be verified after integration; local validation is not evidence of a deployment.
