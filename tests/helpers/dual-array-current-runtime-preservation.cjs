'use strict';
// Provenance is peeled; execution retains the exact repaired current sources.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const timer = require('./dual-array-browser-timer-preservation.cjs');
const display = require('./dual-array-plot-readability-preservation.cjs');
const delta = require('./dual-array-current-runtime-delta.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const supportPaths = Object.freeze([
  'tests/helpers/dual-array-current-runtime-preservation.cjs',
  'tests/helpers/dual-array-current-runtime-delta.json',
  'tests/helpers/dual-array-browser-timer-preservation.cjs',
  'tests/helpers/dual-array-plot-readability-preservation.cjs',
]);
const adaptedPaths = Object.freeze(['labs/dual-array/lesson/tests/lesson.test.mjs', 'tests/dual-array-owned.test.cjs']);
function withoutAdapter(file, bytes) {
  assert.equal(delta.schema, 'dual-array-browser-owned-adapter-delta-v1');
  assert.deepEqual(delta.changes.map(row => row.path), adaptedPaths, 'exact two adapted test sources');
  const row = delta.changes.find(row => row.path === file);
  assert.ok(row, 'explicit adapter path required');
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(bytes.length, row.after.bytes, 'exact adapter current size: ' + file);
  assert.equal(sha(bytes), row.after.sha256, 'exact adapter current identity: ' + file);
  const old = Buffer.from(row.beforeBase64, 'base64');
  assert.equal(old.length, row.before.bytes, 'exact adapter prior size: ' + file);
  assert.equal(sha(old), row.before.sha256, 'exact adapter prior identity: ' + file);
  return old;
}
function historicalBytes(file, bytes) {
  if (file === timer.correction.path) return timer.withoutClient(bytes);
  if (file === display.corrections[0].path) return display.withoutCSS(bytes);
  if (file === display.corrections[1].path || file === 'dual-array-positioning.html') return display.withoutPage(bytes);
  if (adaptedPaths.includes(file)) return withoutAdapter(file, bytes);
  return bytes;
}
module.exports = {sha, supportPaths, adaptedPaths, withoutAdapter, historicalBytes};
