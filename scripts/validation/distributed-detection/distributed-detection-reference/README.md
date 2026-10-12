# Two-receiver detection reference

Original independent Python standard-library teaching model. No source-paper detector or original figure reproduction is claimed.

From this directory:

```sh
python3 -B -m unittest -v
python3 -B generate_fixtures.py
python3 -B run_monte_carlo.py --trials 100000
```

`fixtures.json` is the reference implementation snapshot, not independent mathematical evidence. Independent high-precision fixtures and audit code are in the sibling `distributed-detection-independent` directory; actual-JavaScript audit results are in `distributed-detection-js-independent`. Read `SOURCE_BOUNDARIES.md` and the lesson validation document before reusing claims.

Only original code and synthetic data are included; no third-party full text or private absolute paths.
