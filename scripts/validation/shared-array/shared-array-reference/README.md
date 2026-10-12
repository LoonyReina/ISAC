# Separated/shared-array numerical reference

This independent Python standard-library model is frozen research code, not an
implementation of Liu et al.'s SDR/manifold optimizers or a reproduction of their
figures. It provides a separately executable reference for `shared-array-core.js`.
No author code or source-paper PDF is redistributed.

Run from this directory:

    python3 -m unittest -v test_reference.py
    python3 reference.py --fixtures ../../data/shared-array-fixtures.json

Run from the repository root:

    node scripts/validate-shared-array.cjs
    node --test tests/shared-array-core.test.cjs

The 14 fixtures and two expected numerical-range errors are in
`data/shared-array-fixtures.json`. Complex numbers use `[real, imaginary]`.
`reference.py` and `test_reference.py` retain their frozen content. The source
audit contains only public links and omits the research machine's temporary path.
`sources.json` records the exact editions, source PDF hashes, and unchanged
bibliography snapshot; `manifest.json` records bundled file provenance.

Primary target-power metrics use analytic identities; corresponding `*_direct`
fields retain cancellation-limited complex-vector diagnostics. Positive
subnormal or underflowed q raises an explicit numerical-range error, even when
radar power is zero, because every evaluation computes q. Exact q=0 with zero
radar power remains supported. The JavaScript implementation returns only finite
numbers and additionally rejects derived overflow with `NUMERICAL_RANGE` rather
than allowing JSON to silently replace nonfinite metrics with null.

JavaScript `evaluate(partial_config)` uses snake_case parameters and returns the
same shape as the reference, except the Python boundary witness's first real-only
weight is consistently encoded as `[real, 0]` in JavaScript. The frozen fixture
is unchanged and the parity validator handles this representation explicitly.
JavaScript limits n to 128 elements because it materializes dense covariances;
its exported helpers require dense finite arrays with matching dimensions and
physical u in [-1,1]. The lesson uses n=8. There is no new physical constraint.
`pattern([recipe.wc, recipe.wr], u)` computes the
unnormalized direction power at u=sin(theta). At QoS equality, use the explicit
`numerical_boundary` classification, not the platform-sensitive raw `qos_met`
Boolean. Near-zero q and analytic target powers require relative-error checks;
direct diagnostics require absolute tolerance near cancellation-limited zeros.

These checks validate numerical models only. They do not certify a browser,
published site, original-paper algorithm, source simulation, or hardware result.
