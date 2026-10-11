#!/usr/bin/env node
'use strict';

// Portable frozen-Python -> JavaScript comparison. No Python dependencies,
// private paths, network access, author code, or browser needed for this check.
const assert = require('node:assert/strict');
const core = require('../shared-array-core.js');
const fixtures = require('../data/shared-array-fixtures.json');

function validate() {
  let numeric_checks = 0, structure_checks = 0, error_checks = 0;
  let max_absolute_error = 0, max_primary_relative_error = 0;

  function compare(actual, expected, path, parent_actual, parent_expected) {
    // The frozen Python witness assigns its first weight a real float rather
    // than complex(0.5, 0). JS consistently encodes every complex entry as a
    // pair; preserve the frozen fixture and normalize only this representation.
    if (path.endsWith('.boundary_nullspace_witness.wr.0') && typeof expected === 'number') {
      assert.ok(Array.isArray(actual) && actual.length === 2, path);
      compare(actual[0], expected, path + '.real', actual, expected);
      compare(actual[1], 0, path + '.imaginary', actual, expected);
      return;
    }
    if (typeof expected === 'number') {
      assert.equal(typeof actual, 'number', path);
      assert.ok(Number.isFinite(actual), path + ': nonfinite result');
      const error = Math.abs(actual - expected);
      max_absolute_error = Math.max(max_absolute_error, error);
      // Relative-only checks on q and analytical target values preserve tiny
      // positive quantities; direct diagnostics are cancellation-limited.
      const primary = /\.(q|target_power|target_comm_power|target_independent_radar_power)$/.test(path)
        && (!parent_expected || parent_expected.name !== 'boundary_nullspace_witness');
      const tolerance = primary ? 3e-12 * Math.abs(expected) : 3e-11 * (1 + Math.abs(expected));
      assert.ok(error <= tolerance, `${path}: JS ${actual} != Python ${expected}; tolerance ${tolerance}`);
      if (primary && expected !== 0) max_primary_relative_error = Math.max(max_primary_relative_error, error / Math.abs(expected));
      numeric_checks++;
    } else if (Array.isArray(expected)) {
      assert.ok(Array.isArray(actual), path);
      assert.equal(actual.length, expected.length, path);
      expected.forEach((v, i) => compare(actual[i], v, path + '.' + i, actual, expected));
      structure_checks++;
    } else if (expected && typeof expected === 'object') {
      assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path + ': fields');
      for (const [key, value] of Object.entries(expected)) compare(actual[key], value, path + '.' + key, actual, expected);
      structure_checks++;
    } else {
      // A raw >= Boolean is platform-sensitive at equality. The explicit
      // numerical_boundary classification, not that Boolean, governs the UI.
      if (path.endsWith('.qos_met') && parent_expected.qos_status === 'numerical_boundary') {
        assert.equal(parent_actual.qos_status, 'numerical_boundary', path);
        assert.equal(actual, parent_actual.qos_margin >= 0, path + ': raw predicate');
      } else assert.equal(actual, expected, path);
      structure_checks++;
    }
  }

  for (const [name, expected] of Object.entries(fixtures.cases)) {
    const actual = core.evaluate(expected.config);
    compare(actual, expected, name, null, null);
    // Reject JSON's silent conversion of nonfinite numbers to null.
    const encoded = JSON.stringify(actual, (key, value) => {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), name + '.' + key);
      return value;
    });
    assert.deepEqual(JSON.parse(encoded), JSON.parse(JSON.stringify(actual)));
  }
  for (const spec of fixtures.numerical_error_cases) {
    assert.throws(() => core.evaluate({ target_u: spec.target_u }), error =>
      error instanceof RangeError && error.code === 'NUMERICAL_RANGE' && /not geometric infeasibility|do not label it infeasible/.test(error.message));
    error_checks++;
  }
  return {
    status: 'PASS', fixture_cases: Object.keys(fixtures.cases).length,
    numeric_checks, structure_checks, error_checks,
    max_absolute_error, max_primary_relative_error,
    note: 'Frozen Python fixtures versus actual JavaScript; direct diagnostics use absolute tolerance near zeros. Browser/UI and published-site checks are separate.'
  };
}

if (require.main === module) process.stdout.write(JSON.stringify(validate(), null, 2) + '\n');
module.exports = { validate };
