'use strict';
// Exact CSS-only leaf over accepted main. Integration must compose this layer
// before the existing responsive/functional inverses; historical hashes stay put.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baseCommit = '1c04b1d49acab598619c6b89b0dc2853bec5e7b2';
const baseTree = '991ef6ceb4e03e02512be3a791593480fbc6dee0';
const corrections = [
  {
    "path": "labs/perceptive-bsbl/lesson.css",
    "maxWidth": 950,
    "before": {
      "bytes": 4462,
      "sha256": "97fa3d71368ca3ba4c8e506aaf77f661558c1a5b4702f597657da81e51df210e"
    },
    "after": {
      "bytes": 4502,
      "sha256": "13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14"
    },
    "beforeText": "@media(max-width:950px){.pb-layout{",
    "afterText": "@media(max-width:950px){#pb-record-state{overflow-wrap:anywhere}.pb-layout{"
  },
  {
    "path": "labs/pilot-pattern/lesson.css",
    "maxWidth": 1050,
    "before": {
      "bytes": 4989,
      "sha256": "b8f59d4ba8ecb30aba5739271c665f59b8f85fc1bd63f6b10b6a46659c5fec17"
    },
    "after": {
      "bytes": 5065,
      "sha256": "4c0cae10a4b3960e0bccc2dbf591e057013916a3f118eef5ebfe6d0f32cc1249"
    },
    "beforeText": "@media(max-width:1050px){.pp-layout{grid-template-columns:1fr}",
    "afterText": "@media(max-width:1050px){#source .pp-small{overflow-wrap:anywhere}.pp-layout{grid-template-columns:minmax(0,1fr)}.pp-layout>*{min-width:0}"
  }
];
for (const row of corrections) {
  Object.freeze(row.before);
  Object.freeze(row.after);
  Object.freeze(row);
}
Object.freeze(corrections);
function reverseCSS(file, bytes, rows = corrections) {
  const matches = rows.filter(row => row.path === file);
  assert.ok(matches.length <= 1, 'unique narrow-layout correction path');
  if (!matches.length) return bytes;
  const row = matches[0];
  assert.equal(bytes.length, row.after.bytes, 'exact narrow-layout current size: ' + file);
  assert.equal(sha(bytes), row.after.sha256, 'exact narrow-layout current identity: ' + file);
  const text = bytes.toString('utf8');
  assert.equal(text.split(row.afterText).length, 2, 'one exact narrow-layout correction: ' + file);
  const prior = Buffer.from(text.replace(row.afterText, row.beforeText));
  assert.equal(prior.length, row.before.bytes, 'exact narrow-layout prior size: ' + file);
  assert.equal(sha(prior), row.before.sha256, 'exact narrow-layout prior identity: ' + file);
  return prior;
}
const withoutCSS = (file, bytes) => reverseCSS(file, bytes);
module.exports = { baseCommit, baseTree, corrections, sha, reverseCSS, withoutCSS };
