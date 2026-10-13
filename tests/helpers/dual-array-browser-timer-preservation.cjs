'use strict';
// One exact default-host-timer correction; scientific runtime bytes stay frozen.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const correction = Object.freeze({
  path: 'labs/dual-array/runtime/client.mjs',
  before: Object.freeze({bytes: 6092, sha256: '16e2d61c07929a57520e25e3ffe2ba6d89998fbfdbbc0b8edee7415dabbfd824'}),
  after: Object.freeze({bytes: 6126, sha256: 'd78605231b69be6d7468cc4e08dbcd1c4483b091d543875071e40e672aa5017f'}),
  from: 'setTimer=setTimeout,clearTimer=clearTimeout',
  to: 'setTimer=setTimeout.bind(globalThis),clearTimer=clearTimeout.bind(globalThis)',
});
function withoutClient(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'timer inverse takes original file bytes');
  assert.equal(bytes.length, correction.after.bytes, 'exact repaired timer client size');
  assert.equal(sha(bytes), correction.after.sha256, 'exact repaired timer client identity');
  const text = bytes.toString('utf8');
  assert.equal(text.split(correction.to).length, 2, 'one exact default-only timer change');
  const before = Buffer.from(text.replace(correction.to, correction.from));
  assert.equal(before.length, correction.before.bytes, 'exact accepted timer client size');
  assert.equal(sha(before), correction.before.sha256, 'exact accepted timer client identity');
  return before;
}
module.exports = {correction, sha, withoutClient};
