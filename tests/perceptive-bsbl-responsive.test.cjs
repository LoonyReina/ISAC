'use strict';
// Static source contracts only. Real grid sizing, local scrolling and visual
// containment require the separate actual-browser regression, including 485px.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./helpers/perceptive-bsbl-responsive-preservation.cjs');
const root = path.resolve(__dirname, '..');
const read = file => require('./helpers/lesson-narrow-layout-integration-preservation.cjs').maybeWithoutFile(file, fs.readFileSync(path.join(root, file)));
const css = read(R.correction.path);
const normalize = text => ['HEADER', 'CONTEXT', 'NEXT'].reduce((value, key) => value.replace(new RegExp('<!-- SITE:' + key + ':START -->[\\s\\S]*?<!-- SITE:' + key + ':END -->'), '<!-- SITE:' + key + ' -->'), text).replace(/\n$/, '');

// Parse this stylesheet's explicit max-width rules, preserving source order.
// This is deliberately not a browser layout emulator or min-content estimate.
function rules(text, maxWidth = Infinity) {
  const result = [];
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf('{', cursor);
    if (open < 0) break;
    const selector = text.slice(cursor, open).trim();
    let close = open + 1, depth = 1;
    while (close < text.length && depth) {
      if (text[close] === '{') depth++;
      if (text[close] === '}') depth--;
      close++;
    }
    assert.equal(depth, 0, 'balanced stylesheet');
    const body = text.slice(open + 1, close - 1);
    if (selector.startsWith('@media')) {
      const match = /^@media\(max-width:(\d+)px\)$/.exec(selector);
      if (match) result.push(...rules(body, Math.min(maxWidth, Number(match[1]))));
      else assert.equal(selector, '@media(prefers-reduced-motion:reduce)');
    } else {
      const declarations = Object.fromEntries(body.split(';').filter(Boolean).map(item => {
        const colon = item.indexOf(':');
        assert.ok(colon > 0, 'valid declaration');
        return [item.slice(0, colon).trim(), item.slice(colon + 1).trim()];
      }));
      for (const name of selector.split(',')) result.push({ selector: name.trim(), maxWidth, declarations });
    }
    cursor = close;
  }
  return result;
}
const parsed = rules(css.toString());
function declarations(selector, width, source = parsed) {
  return Object.assign({}, ...source.filter(rule => rule.selector === selector && width <= rule.maxWidth).map(rule => rule.declarations));
}

test('Perceptive responsive CSS is one exact narrow-grid correction and rejects other byte changes', () => {
  const copy = Buffer.from(css);
  const prior = R.withoutCSS(R.correction.path, css);
  assert.deepEqual(css, copy, 'inverse never mutates current bytes');
  assert.equal(R.sha(prior), R.correction.before.sha256);
  assert.equal(R.sha(css), R.correction.after.sha256);
  assert.equal(css.toString(), prior.toString().replace(R.correction.beforeText, R.correction.afterText));
  const changed = Buffer.from(css);
  changed[200] ^= 1;
  for (const bad of [prior, changed, css.subarray(1), Buffer.concat([css, Buffer.from('/* unreviewed */')]), Buffer.from(css.toString().replace('min-width:0}', 'min-width:1px}'))]) {
    assert.throws(() => R.withoutCSS(R.correction.path, bad));
  }
  assert.equal(R.withoutCSS('unlisted/' + R.correction.path, css), css);
  assert.equal(R.withoutCSS('labs/perceptive-bsbl/lesson.mjs', css), css);
});

test('Perceptive narrow grid explicitly removes track and item min-content floors through exactly 950px', () => {
  for (const width of [320, 375, 485, 540, 541, 768, 950]) {
    assert.equal(declarations('.pb-layout', width)['grid-template-columns'], 'minmax(0,1fr)', width + 'px track');
    assert.equal(declarations('.pb-layout>*', width)['min-width'], '0', width + 'px direct item');
    assert.equal(declarations('.pb-panel', width)['min-width'], '0', width + 'px panel');
  }
  const changes = parsed.filter(rule => rule.selector === '.pb-layout>*');
  assert.deepEqual(changes, [{ selector: '.pb-layout>*', maxWidth: 950, declarations: { 'min-width': '0' } }]);
});

test('Perceptive desktop grids and every unrelated source rule retain the exact previous declarations', () => {
  const prior = rules(R.withoutCSS(R.correction.path, css).toString());
  for (const width of [951, 1024, 1280, 1440]) {
    assert.equal(declarations('.pb-layout', width)['grid-template-columns'], '190px minmax(0,1fr)');
    assert.deepEqual(declarations('.pb-layout>*', width), {});
    for (const selector of new Set(parsed.map(rule => rule.selector))) {
      assert.deepEqual(declarations(selector, width), declarations(selector, width, prior), selector + ' at ' + width);
    }
  }
  const removeCorrection = source => source.filter(rule => !(rule.maxWidth === 950 && ['.pb-layout', '.pb-layout>*'].includes(rule.selector)));
  assert.deepEqual(removeCorrection(parsed), removeCorrection(prior));
});

test('Perceptive wide numeric tables keep readable nowrap cells and keyboard-focusable local scroll containers', () => {
  for (const width of [320, 485, 768, 950, 951, 1280]) {
    assert.equal(declarations('.pb-scroll', width).overflow, 'auto');
    assert.equal(declarations('.pb-scroll', width)['max-width'], '100%');
    assert.equal(declarations('table', width)['white-space'], 'nowrap');
    assert.equal(declarations('table', width).width, '100%');
    for (const selector of ['body', '#pb-main', '.pb-layout', '.pb-layout>*', '.pb-panel']) {
      assert.ok(!['hidden', 'clip'].includes(declarations(selector, width).overflow), selector + ' must not hide the symptom');
      assert.ok(!['hidden', 'clip'].includes(declarations(selector, width)['overflow-x']), selector + ' must not clip horizontal content');
    }
  }
  const htmlFile = fs.existsSync(path.join(root, 'content/pages/perceptive-bsbl.html')) ? 'content/pages/perceptive-bsbl.html' : 'perceptive-bsbl.html';
  const html = read(htmlFile).toString();
  for (const id of ['pb-symbols', 'pb-matrix-table', 'pb-dictionary-table', 'pb-gamma-table', 'pb-history-table', 'pb-power-table', 'pb-block-table', 'pb-subblock', 'pb-correlation', 'pb-estimates', 'pb-matches']) {
    const element = html.match(new RegExp('<div\\b[^>]*\\bid="' + id + '"[^>]*>'))?.[0];
    assert.ok(element, id);
    assert.match(element, /class="[^"]*\bpb-scroll\b/);
    assert.match(element, /tabindex="0"/);
  }
});

test('Perceptive original and L01 L02 freezes remain immutable and all other frozen functional bytes are unchanged', () => {
  for (const [name, hash] of [
    ['FUNCTIONAL-FREEZE.json', 'dc59c83f0d2f82f6597677e978ec0b80f22f6d9a1bdb367f875af2c22c64cf0e'],
    ['FUNCTIONAL-FREEZE-V2.json', '9dbb0480e1ba56bae45ae8548e9d833e1771b15d31f3d23365bbad4a7c50c8d4'],
    ['PUBLIC-ASSETS.json', 'c489366c17b632b06e5133e9d066f236d146e5f2fdcae0f3b04fce304961f814'],
    ['PUBLIC-ASSETS-V2.json', 'c3090f309e897d9e263dc5f9884b638beef931b61e6b8b191ab52f838f58b2a4'],
    ['OWNED-TESTS-V2.json', '338c2c5e91bcce661dd916db36ba38ace3e8b3f570748734da16774103a170b3']
  ]) assert.equal(R.sha(read('labs/perceptive-bsbl/' + name)), hash, name);
  const freeze = JSON.parse(read('labs/perceptive-bsbl/FUNCTIONAL-FREEZE-V2.json'));
  assert.equal(freeze.files.length, 52);
  for (const row of freeze.files) {
    const file = fs.existsSync(path.join(root, row.source)) ? row.source : row.compatibility;
    const value = R.withoutCSS(row.source, read(file));
    if (row.source === 'content/pages/perceptive-bsbl.html') {
      const baseline = JSON.parse(read('tests/helpers/perceptive-bsbl-metadata-baseline.json'));
      assert.equal(R.sha(normalize(value.toString())), baseline.functionalPageNormalizedSha256);
    } else {
      assert.equal(value.length, row.bytes, row.source);
      assert.equal(R.sha(value), row.sha256, row.source);
    }
  }
});
