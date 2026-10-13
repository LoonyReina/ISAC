# Integrator handoff

Base commit: 948fef056d03827826f6b2802674da2145b7773c
Base tree: e3b59c17729321e2576589f999f654d8771c0508

Owned roots only:
- content/pages/pilot-patterns.html → pilot-patterns.html
- labs/pilot-pattern/** → labs/pilot-pattern/**
- assets/data/pilot-pattern/** → assets/data/pilot-pattern/**

These are a scoped source manifest description, not permission to bypass the compatibility builder's exact-file mapping. Register each intended public file explicitly, keeping tests non-runtime if the existing architecture permits. The HTML uses relative module paths from its public root; worker.mjs imports sibling runtime modules. Do not flatten them, add a fallback to main-thread heavy processing, mutate the accepted runtime, or alter the paper identity count.

Required separate integration: register this teaching route for supplement-case-pilot/case-pilot/case-pilot-paper, preserve the old single-symbol prerequisite and all legacy anchors, update shared navigation with the strict resolver, run the full reproducible compatibility build without freshness or anchor bypasses, and review same-commit hosted browser controls/rendering/lifecycle/downloads plus narrow layouts. Node author checks do not substitute for this.

The module task deliberately did not run a full build: the route is not yet catalogued/mapped, and no dist was created. It used a sparse linked worktree to stay below the disk budget; no historical evidence/archive was removed.
