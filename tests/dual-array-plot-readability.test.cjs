'use strict';
// Source contracts only. Actual glyph size, scrollability and focus require browser review.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const P = require('./helpers/dual-array-plot-readability-preservation.cjs');
const root = path.resolve(__dirname, '..');
const sourcePage = 'content/pages/dual-array-positioning.html';
function read(file) {
  const names = file === sourcePage ? [sourcePage, 'dual-array-positioning.html'] : [file];
  for (const name of names) if (fs.existsSync(path.join(root, name))) return fs.readFileSync(path.join(root, name));
  throw Error('Missing readable plot source: ' + file);
}
const css = read('labs/dual-array/lesson.css'), page = read(sourcePage);
const ids = ['da-main-phase-plot', 'da-aux-phase-plot', 'da-matrix-plot', 'da-row-plot', 'da-music-plot', 'da-range-plot', 'da-template-plot', 'da-fit-plot', 'da-joint-plot', 'da-offline-angle', 'da-offline-range'];

test('Plot sizing keeps native 850-unit coordinates inside local horizontal scrollers', () => {
  const suffix = P.corrections[0].suffix;
  assert.equal(css.toString().slice(-suffix.length), suffix);
  assert.match(suffix, /\.da-pair:has\(\.da-plot\)\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(suffix, /\.da-plot\{overflow-x:auto;overscroll-behavior-x:contain\}/);
  assert.match(suffix, /\.da-plot svg\{min-width:850px\}/);
  assert.match(suffix, /#da-offline-status\{overflow-wrap:anywhere\}/);
  assert.doesNotMatch(suffix, /font-size|viewBox|overflow:hidden|body|html/);
  assert.equal(P.sha(read('labs/dual-array/lesson/view.mjs')), '8f3907a4bc5202432ce9ceda1b7f456e1175a775123a94d0ef286124d4e69c10');
});

test('Every existing plot region gains keyboard focus while labels roles and source remain identical', () => {
  const plots = [...page.toString().matchAll(/<div\b[^>]*class="da-plot"[^>]*>/g)].map(m => m[0]);
  assert.equal(plots.length, 11);
  assert.deepEqual(plots.map(tag => /\bid="([^"]+)"/.exec(tag)[1]), ids);
  for (const tag of plots) { assert.match(tag, /\btabindex="0"/); assert.match(tag, /\brole="img"/); assert.match(tag, /\baria-label="[^"]+"/); }
  const old = P.withoutPage(page);
  const oldPlots = [...old.toString().matchAll(/<div\b[^>]*class="da-plot"[^>]*>/g)].map(m => m[0]);
  assert.deepEqual(plots.map(tag => tag.replace(' tabindex="0"', '')), oldPlots);
  assert.match(css.toString(), /:focus-visible\{outline:3px solid #e69b28;outline-offset:3px\}/);
});

test('Exact readability inverses restore historical CSS and page with no scientific edits', () => {
  const oldCSS = P.withoutCSS(css), oldPage = P.withoutPage(page);
  assert.equal(P.sha(oldCSS), 'edf7126ca31eba6bdb657710cf735d84e755268aa8677650daa984c0e8804d81');
  assert.equal(P.sha(P.normalizePage(oldPage.toString())), '25642b1d3eac569800ac62761532ecfc1b90eeba38b2f27bca8d322cf53b868a');
  if (fs.existsSync(path.join(root, sourcePage))) {
    assert.equal(page.length, 21122); assert.equal(P.sha(page), 'e9512a3f290e56f71588b336e38b9d419a036f8571e23c45bc8297ef3b75aaee');
    assert.equal(oldPage.length, 20979); assert.equal(P.sha(oldPage), '9a01945692d73de0ba18931a6af2cb8748aa83225c1fec7350451a92df43b5ed');
  }
  const freeze = read('labs/dual-array/FUNCTIONAL-FREEZE.json');
  assert.equal(P.sha(freeze), '183fae1a6f7b536d582595440763a7f57a1aed8b0dcd23e31bbd5a2c4897fbd6');
});

test('Readability inverses reject omitted changes, unrelated modifications and clipping workarounds', () => {
  assert.throws(() => P.withoutCSS(P.withoutCSS(css)));
  assert.throws(() => P.withoutCSS(Buffer.from(css.toString().replace('min-width:850px', 'min-width:849px'))));
  assert.throws(() => P.withoutCSS(Buffer.from(css.toString().replace('overflow-x:auto;overscroll-behavior-x:contain', 'overflow-x:hidden;overscroll-behavior-x:contain'))));
  assert.throws(() => P.withoutCSS(Buffer.concat([css, Buffer.from('body{overflow-x:hidden}')])));
  assert.throws(() => P.withoutPage(P.withoutPage(page)));
  assert.throws(() => P.withoutPage(Buffer.from(page.toString().replace(' tabindex="0"', ''))));
  assert.throws(() => P.withoutPage(Buffer.from(page.toString().replace('aria-label="实际所选矩阵，横轴列、纵轴行"', 'aria-label="changed"'))));
  assert.throws(() => P.withoutPage(Buffer.from(page.toString().replace('14,464', '14,465'))));
});

test('The source freeze lists every readability gate and pins the same two display corrections', () => {
  const freeze = JSON.parse(read('tests/helpers/dual-array-plot-readability-freeze.json'));
  assert.equal(freeze.schema, 'dual-array-plot-readability-v1');
  assert.deepEqual(freeze.corrections, P.corrections);
  assert.deepEqual(freeze.files.map(row => row.path), ['labs/dual-array/lesson.css', sourcePage, 'labs/dual-array/lesson/view.mjs', 'tests/dual-array-plot-readability.test.cjs', 'tests/helpers/dual-array-plot-readability-preservation.cjs']);
  for (const row of freeze.files) {
    const bytes = read(row.path);
    if (row.path === sourcePage && !fs.existsSync(path.join(root, sourcePage))) assert.equal(P.sha(P.normalizePage(bytes.toString())), P.corrections[1].afterNormalizedSha256);
    else { assert.equal(bytes.length, row.bytes, row.path); assert.equal(P.sha(bytes), row.sha256, row.path); }
  }
});
