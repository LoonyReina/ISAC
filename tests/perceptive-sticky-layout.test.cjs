'use strict';
// Source contracts only. Actual repaired desktop/narrow navigation needs final
// deployed-byte pointer, keyboard, focus and local-scroll browser verification.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('./helpers/perceptive-sticky-layout-preservation.cjs');
const N = require('./helpers/lesson-narrow-layout-preservation.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const css = read(S.correction.path), priorCSS = S.withoutCSS(S.correction.path, css);
function rules(text, maxWidth = Infinity, minExclusive = -Infinity) {
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
      if (match) result.push(...rules(body, Math.min(maxWidth, Number(match[1])), minExclusive));
      else {
        const desktop = /^@media\(width>(\d+)px\)$/.exec(selector);
        if (desktop) result.push(...rules(body, maxWidth, Math.max(minExclusive, Number(desktop[1]))));
        else assert.equal(selector, '@media(prefers-reduced-motion:reduce)');
      }
    } else {
      const declarations = Object.fromEntries(body.split(';').filter(Boolean).map(item => {
        const colon = item.indexOf(':');
        assert.ok(colon > 0, 'valid declaration');
        return [item.slice(0, colon).trim(), item.slice(colon + 1).trim()];
      }));
      for (const name of selector.split(',')) result.push({ selector: name.trim(), maxWidth, minExclusive, declarations });
    }
    cursor = close;
  }
  return result;
}
const current = rules(css.toString()), prior = rules(priorCSS.toString());
const declarations = (source, selector, width) => Object.assign({}, ...source.filter(rule => rule.selector === selector && width <= rule.maxWidth && width > rule.minExclusive).map(rule => rule.declarations));
const header = 'body:has(>main#pb-main)>.site-header';

test('Perceptive sticky inverse preserves accepted narrow bytes and rejects endpoint, edit and path mutations', () => {
  assert.equal(S.baseCommit, '54e4ffdf7236b1181704b50c0e59e603672d80ab');
  assert.equal(S.baseTree, '3a467581c500e426222d846b894748e1d9acf95a');
  const row = S.correction, copy = Buffer.from(css);
  assert.deepEqual(row.before, N.corrections.find(item => item.path === row.path).after);
  assert.deepEqual(css, copy);
  assert.equal(S.sha(N.withoutCSS(row.path, priorCSS)), N.corrections.find(item => item.path === row.path).before.sha256);
  assert.equal(row.edits.length, 1);
  const edit = row.edits[0];
  assert.equal(priorCSS.toString().split(edit.beforeText).length, 2);
  assert.equal(css.toString(), priorCSS.toString().replace(edit.beforeText, edit.afterText));
  const changed = Buffer.from(css); changed[200] ^= 1;
  for (const bad of [priorCSS, changed, css.subarray(1), Buffer.concat([css, Buffer.from('/* unreviewed */')])]) assert.throws(() => S.withoutCSS(row.path, bad));
  for (const endpoint of ['before', 'after']) for (const field of ['bytes', 'sha256']) {
    const bad = structuredClone(row); bad[endpoint][field] = field === 'bytes' ? 0 : '0'.repeat(64);
    assert.throws(() => S.reverseCSS(row.path, css, [bad]));
  }
  for (const field of ['beforeText', 'afterText']) {
    const bad = structuredClone(row); bad.edits[0][field] += 'unreviewed';
    assert.throws(() => S.reverseCSS(row.path, css, [bad]));
  }
  for (const edits of [[], [...row.edits, row.edits[0]]]) assert.throws(() => S.reverseCSS(row.path, css, [{ ...row, edits }]));
  assert.throws(() => S.reverseCSS(row.path, css, [row, row]));
  assert.equal(S.withoutCSS('unlisted/' + row.path, css), css);
});

test('Only the Perceptive page header becomes nonsticky with no guessed offset or navigation changes', () => {
  assert.deepEqual(current.filter(rule => rule.selector === header), [
    { selector: header, maxWidth: Infinity, minExclusive: -Infinity, declarations: { position: 'static' } }
  ]);
  const page = fs.existsSync(path.join(root, 'content/pages/perceptive-bsbl.html')) ? 'content/pages/perceptive-bsbl.html' : 'perceptive-bsbl.html';
  const html = read(page).toString();
  assert.equal((html.match(/<main id="pb-main">/g) || []).length, 1);
  assert.equal((html.match(/<header class="site-header">/g) || []).length, 1);
  for (const width of [320, 485, 950, 950.5, 951, 1170, 1440]) {
    assert.equal(declarations(current, header, width).position, 'static');
    for (const selector of ['.site-header', 'html', '.pb-panel']) assert.deepEqual(declarations(current, selector, width), declarations(prior, selector, width));
  }
});

test('Desktop navigation stays sticky, fits the viewport and preserves readable links and visible focus', () => {
  assert.deepEqual(current.filter(rule => rule.minExclusive === 950), [
    { selector: '.pb-nav', maxWidth: Infinity, minExclusive: 950, declarations: { 'max-height': 'calc(100vh - 40px)', 'box-sizing': 'border-box', overflow: 'auto' } },
    { selector: '.pb-nav a', maxWidth: Infinity, minExclusive: 950, declarations: { 'flex-shrink': '0' } },
    { selector: '.pb-nav a:focus-visible', maxWidth: Infinity, minExclusive: 950, declarations: { 'outline-offset': '-3px' } }
  ]);
  for (const width of [950.01, 950.5, 951, 1170, 1280, 1920]) {
    const nav = declarations(current, '.pb-nav', width);
    assert.equal(nav.position, 'sticky');
    assert.equal(nav.top, '20px');
    assert.equal(nav['max-height'], 'calc(100vh - 40px)');
    assert.equal(nav['box-sizing'], 'border-box');
    assert.equal(nav.overflow, 'auto');
    assert.equal(declarations(current, '.pb-nav a', width)['flex-shrink'], '0');
    assert.equal(declarations(current, '.pb-nav a:focus-visible', width)['outline-offset'], '-3px');
    assert.equal(declarations(current, 'a:focus-visible', width).outline, '3px solid #ecb360');
    assert.deepEqual(declarations(current, '.pb-nav a:focus', width), declarations(prior, '.pb-nav a:focus', width));
  }
  // Algebraic bound from existing20px top spacing, not a layout simulation.
  for (const height of [240, 320, 480, 757, 900]) assert.equal(height - (20 + height - 40), 20);
});

test('The entire existing narrow navigation and grid/hash rules remain unchanged through exactly950px', () => {
  for (const width of [320, 375, 485, 487, 540, 650, 768, 949.99, 950]) {
    for (const selector of ['.pb-nav', '.pb-nav a', '.pb-nav a:focus', '.pb-nav a:focus-visible', '.pb-layout', '.pb-layout>*', '#pb-record-state']) {
      assert.deepEqual(declarations(current, selector, width), declarations(prior, selector, width), selector + ' at ' + width);
    }
    assert.equal(declarations(current, '.pb-nav', width).position, 'static');
    assert.equal(declarations(current, '.pb-nav', width)['flex-wrap'], 'wrap');
    assert.equal(declarations(current, '.pb-nav', width)['max-height'], undefined);
    assert.equal(declarations(current, '.pb-nav', width).overflow, undefined);
    assert.equal(declarations(current, '#pb-record-state', width)['overflow-wrap'], 'anywhere');
  }
});

test('Every unrelated source rule and scientific-table local scrolling declaration remains unchanged', () => {
  const withoutCorrection = source => source.filter(rule => rule.selector !== header && rule.minExclusive !== 950);
  assert.deepEqual(withoutCorrection(current), prior);
  for (const width of [320, 485, 950, 950.5, 1170, 1440]) {
    assert.equal(declarations(current, '.pb-scroll', width).overflow, 'auto');
    assert.equal(declarations(current, '.pb-scroll', width)['max-width'], '100%');
    assert.equal(declarations(current, 'table', width)['white-space'], 'nowrap');
    for (const selector of ['body', '#pb-main', '.pb-layout', '.pb-panel']) for (const property of ['overflow', 'overflow-x']) {
      assert.ok(!['hidden', 'clip'].includes(declarations(current, selector, width)[property]));
    }
  }
});

test('Accepted narrow and pilot-sticky source layers retain their immutable helper, test and CSS endpoints', () => {
  for (const [file, hash] of [
    ['tests/helpers/lesson-narrow-layout-preservation.cjs', '61f808667ccf191d437a00c9b8a8bb5b0266e2772b5e96e57bb70989f9261e11'],
    ['tests/lesson-narrow-layout.test.cjs', '2a44e7b08169f424107109105871841ce76a27fd0cc6cb8fa223eb3df68bf4bb'],
    ['tests/helpers/pilot-sticky-layout-preservation.cjs', 'be4d1dd01b3294481ea6caef53116accc2641cf876547170ccaabdc5d7eaa578'],
    ['tests/pilot-sticky-layout.test.cjs', '24bf7d73e87a4b160f4e4d6dd70d8c2b8e1b420f44a271559b622536e871574f'],
    ['labs/pilot-pattern/lesson.css', '4c00a92b40d0b50735a459492831a139782f76eb357ca81470f8a884baf07350']
  ]) assert.equal(S.sha(read(file)), hash, file);
});
