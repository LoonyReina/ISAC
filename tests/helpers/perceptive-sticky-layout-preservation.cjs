'use strict';
// CSS-only sticky-layout leaf above accepted 54e4ffd. Preserve that source layer
// and peel this correction before its exact narrow-layout inverse/contracts.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baseCommit = '54e4ffdf7236b1181704b50c0e59e603672d80ab';
const baseTree = '3a467581c500e426222d846b894748e1d9acf95a';
const correction = {
  "path": "labs/perceptive-bsbl/lesson.css",
  "before": {
    "bytes": 4502,
    "sha256": "13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14"
  },
  "after": {
    "bytes": 4718,
    "sha256": "30c4e563393c48460c7b1cf19d820223e00744056694cf8a4ee3f38b45574c95"
  },
  "edits": [
    {
      "beforeText": "@media(max-width:950px){#pb-record-state{",
      "afterText": "body:has(>main#pb-main)>.site-header{position:static}@media(width>950px){.pb-nav{max-height:calc(100vh - 40px);box-sizing:border-box;overflow:auto}.pb-nav a{flex-shrink:0}.pb-nav a:focus-visible{outline-offset:-3px}}@media(max-width:950px){#pb-record-state{"
    }
  ]
};
Object.freeze(correction.before);
Object.freeze(correction.after);
correction.edits.forEach(Object.freeze);
Object.freeze(correction.edits);
Object.freeze(correction);
function reverseCSS(file, bytes, rows = [correction]) {
  const matches = rows.filter(row => row.path === file);
  assert.ok(matches.length <= 1, 'unique perceptive-sticky correction path');
  if (!matches.length) return bytes;
  const row = matches[0];
  assert.equal(bytes.length, row.after.bytes, 'exact perceptive-sticky current size');
  assert.equal(sha(bytes), row.after.sha256, 'exact perceptive-sticky current identity');
  let text = bytes.toString('utf8');
  for (const edit of [...row.edits].reverse()) {
    assert.equal(text.split(edit.afterText).length, 2, 'one exact perceptive-sticky correction');
    text = text.replace(edit.afterText, edit.beforeText);
  }
  const prior = Buffer.from(text);
  assert.equal(prior.length, row.before.bytes, 'exact perceptive-sticky prior size');
  assert.equal(sha(prior), row.before.sha256, 'exact perceptive-sticky prior identity');
  return prior;
}
const withoutCSS = (file, bytes) => reverseCSS(file, bytes);
module.exports = { baseCommit, baseTree, correction, sha, reverseCSS, withoutCSS };
