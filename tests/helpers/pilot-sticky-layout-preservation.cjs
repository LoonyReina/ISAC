'use strict';
// CSS-only sticky-layout leaf above accepted 51f0fe2. Preserve that source layer
// and peel this correction before its exact narrow-layout inverse/contracts.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baseCommit = '51f0fe203e91690e48848c7fc25a6d1caf95dca3';
const baseTree = 'fa6a806b507bc90284b1af3b9ee0f69a600998dd';
const correction = {
  "path": "labs/pilot-pattern/lesson.css",
  "before": {
    "bytes": 5065,
    "sha256": "4c0cae10a4b3960e0bccc2dbf591e057013916a3f118eef5ebfe6d0f32cc1249"
  },
  "after": {
    "bytes": 5156,
    "sha256": "4c00a92b40d0b50735a459492831a139782f76eb357ca81470f8a884baf07350"
  },
  "edits": [
    {
      "beforeText": ".pp-sidebar{align-self:start;position:sticky;top:.75rem;max-height:95vh;",
      "afterText": ".pp-sidebar{align-self:start;position:sticky;top:.75rem;max-height:calc(100vh - 1.5rem);box-sizing:border-box;"
    },
    {
      "beforeText": "@media(max-width:1050px){#source .pp-small{",
      "afterText": "body:has(>main.pp-wrap)>.site-header{position:static}@media(max-width:1050px){#source .pp-small{"
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
  assert.ok(matches.length <= 1, 'unique pilot-sticky correction path');
  if (!matches.length) return bytes;
  const row = matches[0];
  assert.equal(bytes.length, row.after.bytes, 'exact pilot-sticky current size');
  assert.equal(sha(bytes), row.after.sha256, 'exact pilot-sticky current identity');
  let text = bytes.toString('utf8');
  for (const edit of [...row.edits].reverse()) {
    assert.equal(text.split(edit.afterText).length, 2, 'one exact pilot-sticky correction');
    text = text.replace(edit.afterText, edit.beforeText);
  }
  const prior = Buffer.from(text);
  assert.equal(prior.length, row.before.bytes, 'exact pilot-sticky prior size');
  assert.equal(sha(prior), row.before.sha256, 'exact pilot-sticky prior identity');
  return prior;
}
const withoutCSS = (file, bytes) => reverseCSS(file, bytes);
module.exports = { baseCommit, baseTree, correction, sha, reverseCSS, withoutCSS };
