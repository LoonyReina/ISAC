'use strict';
// Source-only exact inverse for Pages diagnostic reporting and its gate adapter.
// Existing Perceptive and OTFS freezes remain immutable and run after this layer.
const a = require('node:assert/strict');
const crypto = require('node:crypto');
const delta = require('./pages-diagnostic-delta.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
a.equal(delta.schemaVersion, 1, 'Pages diagnostic inverse schema');
a.deepEqual(delta.files.map(row => row.path), [
  '.github/workflows/pages.yml',
  'tests/perceptive-bsbl-dependencies.test.cjs'
], 'exact Pages diagnostic inverse paths');
function reverseFile(file, bytes, records) {
  const rows = records.filter(row => row.path === file);
  a.ok(rows.length <= 1, 'unique Pages diagnostic inverse path');
  if (!rows.length) return bytes;
  const row = rows[0];
  a.equal(bytes.length, row.after.bytes, 'exact Pages diagnostic current size ' + file);
  a.equal(sha(bytes), row.after.sha256, 'exact Pages diagnostic current identity ' + file);
  const prior = Buffer.from(row.beforeBase64, 'base64');
  a.equal(prior.length, row.before.bytes, 'exact Pages diagnostic prior size ' + file);
  a.equal(sha(prior), row.before.sha256, 'exact Pages diagnostic prior identity ' + file);
  return prior;
}
const withoutFile = (file, bytes) => reverseFile(file, bytes, delta.files);
module.exports = { delta, sha, reverseFile, withoutFile };
