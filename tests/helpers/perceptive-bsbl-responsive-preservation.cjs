'use strict';
// Exact, CSS-only correction over the immutable original and L01/L02 freezes.
// Keep this a leaf: no historical adapters, consumers, or generated files are loaded.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const correction = Object.freeze({
  path: 'labs/perceptive-bsbl/lesson.css',
  baseCommit: '722ec1b75c0eafbcd17d581b0c660b7dc63317df',
  baseTree: '54d0a65e32b438a31e9deefaacb0f0ab14cc4779',
  before: Object.freeze({ bytes: 4427, sha256: '88eb3b03c73cc35a3419387b64275f02db8728af6c46b57a6e410f8b46e04ecb' }),
  after: Object.freeze({ bytes: 4462, sha256: '97fa3d71368ca3ba4c8e506aaf77f661558c1a5b4702f597657da81e51df210e' }),
  beforeText: '@media(max-width:950px){.pb-layout{grid-template-columns:1fr}',
  afterText: '@media(max-width:950px){.pb-layout{grid-template-columns:minmax(0,1fr)}.pb-layout>*{min-width:0}'
});
function withoutCSS(file, bytes) {
  if (file !== correction.path) return bytes;
  assert.equal(bytes.length, correction.after.bytes, 'exact responsive CSS current size');
  assert.equal(sha(bytes), correction.after.sha256, 'exact responsive CSS current identity');
  const text = bytes.toString('utf8');
  assert.equal(text.split(correction.afterText).length, 2, 'one responsive correction');
  const prior = Buffer.from(text.replace(correction.afterText, correction.beforeText));
  assert.equal(prior.length, correction.before.bytes, 'exact responsive CSS prior size');
  assert.equal(sha(prior), correction.before.sha256, 'exact responsive CSS prior identity');
  return prior;
}
module.exports = { correction, sha, withoutCSS };
