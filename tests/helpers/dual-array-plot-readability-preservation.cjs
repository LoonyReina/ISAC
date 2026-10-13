'use strict';
// Exact display-only correction. Generated SITE regions use the existing three-marker contract.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const corrections = [
  {
    "path": "labs/dual-array/lesson.css",
    "before": {
      "bytes": 6118,
      "sha256": "edf7126ca31eba6bdb657710cf735d84e755268aa8677650daa984c0e8804d81"
    },
    "after": {
      "bytes": 6389,
      "sha256": "a26465d08bea5d94ee331ab8e2ced8784ab85261018f21e151b870be4fb784d4"
    },
    "suffix": "/* Preserve natural SVG label size; overflow stays in focusable chart regions. */\n.da-pair:has(.da-plot){grid-template-columns:minmax(0,1fr)}\n.da-plot{overflow-x:auto;overscroll-behavior-x:contain}\n.da-plot svg{min-width:850px}\n#da-offline-status{overflow-wrap:anywhere}\n"
  },
  {
    "path": "content/pages/dual-array-positioning.html",
    "before": {
      "bytes": 20979,
      "sha256": "9a01945692d73de0ba18931a6af2cb8748aa83225c1fec7350451a92df43b5ed"
    },
    "after": {
      "bytes": 21122,
      "sha256": "e9512a3f290e56f71588b336e38b9d419a036f8571e23c45bc8297ef3b75aaee"
    },
    "beforeNormalizedSha256": "25642b1d3eac569800ac62761532ecfc1b90eeba38b2f27bca8d322cf53b868a",
    "afterNormalizedSha256": "bb5719e9e07551b0c32381895dc8ff0daa14a679efa1ce96e285998718a2da65",
    "from": "class=\"da-plot\" role=\"img\"",
    "to": "class=\"da-plot\" tabindex=\"0\" role=\"img\"",
    "occurrences": 11
  }
];

function normalizePage(text) {
  for (const name of ['HEADER', 'CONTEXT', 'NEXT']) {
    const start = '<!-- SITE:' + name + ':START -->', end = '<!-- SITE:' + name + ':END -->';
    assert.equal(text.split(start).length, 2, 'one ' + name + ' start marker');
    assert.equal(text.split(end).length, 2, 'one ' + name + ' end marker');
    assert.ok(text.indexOf(start) < text.indexOf(end), 'ordered ' + name + ' markers');
    text = text.replace(new RegExp(start + '[\\s\\S]*?' + end), '<!-- SITE:' + name + ' -->');
  }
  return text;
}
function withoutCSS(bytes) {
  const row = corrections[0];
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(bytes.length, row.after.bytes, 'exact readable plot CSS size');
  assert.equal(sha(bytes), row.after.sha256, 'exact readable plot CSS identity');
  assert.ok(bytes.toString().endsWith(row.suffix));
  const old = bytes.subarray(0, bytes.length - Buffer.byteLength(row.suffix));
  assert.equal(old.length, row.before.bytes); assert.equal(sha(old), row.before.sha256);
  return old;
}
function withoutPage(bytes) {
  const row = corrections[1];
  assert.ok(Buffer.isBuffer(bytes));
  const text = bytes.toString();
  assert.equal(sha(normalizePage(text)), row.afterNormalizedSha256, 'exact focusable plot page except generated SITE regions');
  assert.equal(text.split(row.to).length - 1, row.occurrences, 'all eleven existing plot containers');
  const old = Buffer.from(text.replaceAll(row.to, row.from));
  assert.equal(sha(normalizePage(old.toString())), row.beforeNormalizedSha256, 'exact prior plot page except generated SITE regions');
  assert.equal(bytes.length - old.length, row.after.bytes - row.before.bytes, 'only eleven tabindex additions');
  return old;
}
module.exports = {corrections, sha, normalizePage, withoutCSS, withoutPage};
