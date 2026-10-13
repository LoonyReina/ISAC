'use strict';
// Source contracts, not browser acceptance. Live QA reproduced the Perceptive
// record-state and pilot grid overflows. Pilot source-hash wrapping is preventive:
// the measured 458px token exceeds the inferred post-shrink ~411px text box.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const N = require('./helpers/lesson-narrow-layout-preservation.cjs');
const R = require('./helpers/perceptive-bsbl-responsive-preservation.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const normalize = text => ['HEADER', 'CONTEXT', 'NEXT'].reduce((value, key) => value.replace(new RegExp('<!-- SITE:' + key + ':START -->[\\s\\S]*?<!-- SITE:' + key + ':END -->'), '<!-- SITE:' + key + ' -->'), text).replace(/\n$/, '');

// Only parse explicit declarations and max-width source scopes. This does not
// emulate CSS layout, text measurements, min-content sizing, or browser scrolling.
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
const sources = N.corrections.map(row => ({ row, current: rules(read(row.path).toString()), prior: rules(N.withoutCSS(row.path, read(row.path)).toString()) }));
const [pb, pp] = sources;
const declarations = (source, selector, width) => Object.assign({}, ...source.filter(rule => rule.selector === selector && width <= rule.maxWidth).map(rule => rule.declarations));

test('Narrow-layout exact CSS inverses bind both endpoints and reject mutations or duplicate paths', () => {
  assert.equal(N.baseCommit, '1c04b1d49acab598619c6b89b0dc2853bec5e7b2');
  assert.equal(N.baseTree, '991ef6ceb4e03e02512be3a791593480fbc6dee0');
  assert.deepEqual(N.corrections.map(row => row.path), ['labs/perceptive-bsbl/lesson.css', 'labs/pilot-pattern/lesson.css']);
  for (const row of N.corrections) {
    const bytes = read(row.path), copy = Buffer.from(bytes), prior = N.withoutCSS(row.path, bytes);
    assert.deepEqual(bytes, copy);
    assert.equal(prior.toString().split(row.beforeText).length, 2);
    assert.equal(bytes.toString(), prior.toString().replace(row.beforeText, row.afterText));
    const changed = Buffer.from(bytes); changed[200] ^= 1;
    for (const bad of [prior, changed, bytes.subarray(1), Buffer.concat([bytes, Buffer.from('/* unreviewed */')])]) assert.throws(() => N.withoutCSS(row.path, bad));
    for (const endpoint of ['before', 'after']) for (const field of ['bytes', 'sha256']) {
      const bad = structuredClone(row); bad[endpoint][field] = field === 'bytes' ? 0 : '0'.repeat(64);
      assert.throws(() => N.reverseCSS(row.path, bytes, [bad]));
    }
    for (const field of ['beforeText', 'afterText']) {
      const bad = structuredClone(row); bad[field] += 'unreviewed';
      assert.throws(() => N.reverseCSS(row.path, bytes, [bad]));
    }
    assert.throws(() => N.reverseCSS(row.path, bytes, [row, row]));
    assert.equal(N.withoutCSS('unlisted/' + row.path, bytes), bytes);
  }
});

test('Perceptive record identity wraps only through 950px and preserves the accepted grid repair', () => {
  assert.deepEqual(pb.current.filter(rule => rule.selector === '#pb-record-state'), [
    { selector: '#pb-record-state', maxWidth: 950, declarations: { 'overflow-wrap': 'anywhere' } }
  ]);
  for (const width of [320, 375, 485, 487, 540, 541, 768, 950]) {
    assert.equal(declarations(pb.current, '#pb-record-state', width)['overflow-wrap'], 'anywhere');
    assert.equal(declarations(pb.current, '.pb-layout', width)['grid-template-columns'], 'minmax(0,1fr)');
    assert.equal(declarations(pb.current, '.pb-layout>*', width)['min-width'], '0');
  }
  assert.equal(N.sha(R.withoutCSS(pb.row.path, N.withoutCSS(pb.row.path, read(pb.row.path)))), R.correction.before.sha256);
});

test('Pilot narrow grid shrinks through 1050px and preventive source wrapping targets only the source note', () => {
  for (const width of [320, 375, 485, 487, 650, 651, 768, 950, 1050]) {
    assert.equal(declarations(pp.current, '.pp-layout', width)['grid-template-columns'], 'minmax(0,1fr)');
    assert.equal(declarations(pp.current, '.pp-layout>*', width)['min-width'], '0');
    assert.equal(declarations(pp.current, '#source .pp-small', width)['overflow-wrap'], 'anywhere');
    assert.equal(declarations(pp.current, '.pp-hash', width)['overflow-wrap'], 'anywhere');
    assert.equal(declarations(pp.current, '.pp-status', width)['overflow-wrap'], 'anywhere');
  }
  assert.deepEqual(pp.current.filter(rule => rule.selector === '#source .pp-small'), [
    { selector: '#source .pp-small', maxWidth: 1050, declarations: { 'overflow-wrap': 'anywhere' } }
  ]);
  assert.deepEqual(pp.current.filter(rule => rule.selector === '.pp-layout>*'), [
    { selector: '.pp-layout>*', maxWidth: 1050, declarations: { 'min-width': '0' } }
  ]);
});

test('Desktop declarations and every unrelated source rule remain exactly unchanged', () => {
  for (const { row, current, prior } of sources) {
    for (const width of [row.maxWidth + 1, 1280, 1440, 1920]) {
      for (const selector of new Set([...current, ...prior].map(rule => rule.selector))) {
        assert.deepEqual(declarations(current, selector, width), declarations(prior, selector, width), selector + ' at ' + width);
      }
    }
    const allowed = row.path.includes('perceptive') ? ['#pb-record-state'] : ['.pp-layout', '.pp-layout>*', '#source .pp-small'];
    const unrelated = source => source.filter(rule => !(rule.maxWidth === row.maxWidth && allowed.includes(rule.selector)));
    assert.deepEqual(unrelated(current), unrelated(prior));
  }
});

test('Wide scientific tables retain local scrolling and nowrap cells without clipped outer containers', () => {
  for (const [source, scroll, containers] of [[pb, '.pb-scroll', ['body', '#pb-main', '.pb-layout', '.pb-layout>*', '.pb-panel']], [pp, '.pp-table', ['body', '.pp-wrap', '.pp-layout', '.pp-layout>*', '.pp-panel']]]) {
    for (const width of [320, 485, 650, 768, 950, 1050, 1280]) {
      assert.equal(declarations(source.current, scroll, width).overflow, 'auto');
      assert.equal(declarations(source.current, scroll, width)['max-width'], '100%');
      assert.equal(declarations(source.current, 'table', width)['white-space'], 'nowrap');
      assert.equal(declarations(source.current, 'table', width).width, '100%');
      for (const selector of containers) for (const property of ['overflow', 'overflow-x']) {
        assert.ok(!['hidden', 'clip'].includes(declarations(source.current, selector, width)[property]), selector + ' must not conceal overflow');
      }
    }
  }
});

test('Historical freeze files, frozen lesson runtime bytes and scientific page content remain unchanged', () => {
  for (const [file, hash] of [
    ['labs/perceptive-bsbl/FUNCTIONAL-FREEZE.json', 'dc59c83f0d2f82f6597677e978ec0b80f22f6d9a1bdb367f875af2c22c64cf0e'],
    ['labs/perceptive-bsbl/FUNCTIONAL-FREEZE-V2.json', '9dbb0480e1ba56bae45ae8548e9d833e1771b15d31f3d23365bbad4a7c50c8d4'],
    ['labs/perceptive-bsbl/PUBLIC-ASSETS.json', 'c489366c17b632b06e5133e9d066f236d146e5f2fdcae0f3b04fce304961f814'],
    ['labs/perceptive-bsbl/PUBLIC-ASSETS-V2.json', 'c3090f309e897d9e263dc5f9884b638beef931b61e6b8b191ab52f838f58b2a4'],
    ['labs/pilot-pattern/FUNCTIONAL-FREEZE-V4.json', '18ad28cf435178d526b331eb9a2764a622fa54e3af5d972536aa8ed25e68d04d']
  ]) assert.equal(N.sha(read(file)), hash, file);
  for (const [lesson, freezeName, page] of [['perceptive-bsbl', 'FUNCTIONAL-FREEZE-V2.json', 'perceptive-bsbl.html'], ['pilot-pattern', 'FUNCTIONAL-FREEZE-V4.json', 'pilot-patterns.html']]) {
    const freeze = JSON.parse(read('labs/' + lesson + '/' + freezeName));
    for (const row of freeze.files) {
      const file = row.source || row.path;
      if (!file.startsWith('labs/' + lesson + '/')) continue;
      let bytes = N.withoutCSS(file, read(file));
      if (lesson === 'perceptive-bsbl') bytes = R.withoutCSS(file, bytes);
      assert.equal(bytes.length, row.bytes, file);
      assert.equal(N.sha(bytes), row.sha256, file);
    }
    const baseline = JSON.parse(read('tests/helpers/' + lesson + '-metadata-baseline.json'));
    const file = fs.existsSync(path.join(root, 'content/pages/' + page)) ? 'content/pages/' + page : page;
    assert.equal(N.sha(normalize(read(file).toString())), baseline.functionalPageNormalizedSha256, file);
  }
});
