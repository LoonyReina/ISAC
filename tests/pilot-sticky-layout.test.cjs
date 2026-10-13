'use strict';
// Static source contracts only. Actual repaired desktop pointer/keyboard and
// narrow-layout acceptance must use the final deployed stylesheet.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('./helpers/pilot-sticky-layout-preservation.cjs');
const N = require('./helpers/lesson-narrow-layout-preservation.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const css = read(S.correction.path);
const priorCSS = S.withoutCSS(S.correction.path, css);
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
const current = rules(css.toString()), prior = rules(priorCSS.toString());
const declarations = (source, selector, width) => Object.assign({}, ...source.filter(rule => rule.selector === selector && width <= rule.maxWidth).map(rule => rule.declarations));
const header = 'body:has(>main.pp-wrap)>.site-header';

test('Pilot sticky inverse preserves accepted narrow CSS and rejects endpoint, edit and path mutations', () => {
  assert.equal(S.baseCommit, '51f0fe203e91690e48848c7fc25a6d1caf95dca3');
  assert.equal(S.baseTree, 'fa6a806b507bc90284b1af3b9ee0f69a600998dd');
  const row = S.correction, copy = Buffer.from(css);
  assert.deepEqual(row.before, N.corrections.find(item => item.path === row.path).after);
  assert.deepEqual(css, copy);
  assert.equal(S.sha(N.withoutCSS(row.path, priorCSS)), N.corrections.find(item => item.path === row.path).before.sha256);
  let forward = priorCSS.toString();
  for (const edit of row.edits) {
    assert.equal(forward.split(edit.beforeText).length, 2);
    forward = forward.replace(edit.beforeText, edit.afterText);
  }
  assert.equal(css.toString(), forward);
  const changed = Buffer.from(css); changed[200] ^= 1;
  for (const bad of [priorCSS, changed, css.subarray(1), Buffer.concat([css, Buffer.from('/* unreviewed */')])]) assert.throws(() => S.withoutCSS(row.path, bad));
  for (const endpoint of ['before', 'after']) for (const field of ['bytes', 'sha256']) {
    const bad = structuredClone(row); bad[endpoint][field] = field === 'bytes' ? 0 : '0'.repeat(64);
    assert.throws(() => S.reverseCSS(row.path, css, [bad]));
  }
  for (let index = 0; index < row.edits.length; index++) for (const field of ['beforeText', 'afterText']) {
    const bad = structuredClone(row); bad.edits[index][field] += 'unreviewed';
    assert.throws(() => S.reverseCSS(row.path, css, [bad]));
  }
  for (const editSet of [[], row.edits.slice(1), [...row.edits, row.edits[0]]]) {
    assert.throws(() => S.reverseCSS(row.path, css, [{ ...row, edits: editSet }]));
  }
  assert.throws(() => S.reverseCSS(row.path, css, [row, row]));
  assert.equal(S.withoutCSS('unlisted/' + row.path, css), css);
});

test('Only the pilot shell header becomes nonsticky without guessed header heights or z-index changes', () => {
  assert.deepEqual(current.filter(rule => rule.selector === header), [
    { selector: header, maxWidth: Infinity, declarations: { position: 'static' } }
  ]);
  for (const width of [320, 485, 650, 668, 700, 936, 1050, 1051, 1170, 1440, 1920]) {
    assert.equal(declarations(current, header, width).position, 'static');
    assert.deepEqual(declarations(current, '.site-header', width), declarations(prior, '.site-header', width));
    assert.deepEqual(declarations(current, '.site-header nav a', width), declarations(prior, '.site-header nav a', width));
    assert.deepEqual(declarations(current, 'html', width), declarations(prior, 'html', width), 'anchor spacing preserved');
  }
  const page = fs.existsSync(path.join(root, 'content/pages/pilot-patterns.html')) ? 'content/pages/pilot-patterns.html' : 'pilot-patterns.html';
  const html = read(page).toString();
  assert.equal((html.match(/<main class="pp-wrap" id="site-main" tabindex="-1">/g) || []).length, 1);
  assert.equal((html.match(/<header class="site-header">/g) || []).length, 1);
});

test('Desktop sidebar remains sticky and scrollable with padding included inside viewport bounds', () => {
  for (const width of [1051, 1170, 1280, 1440, 1920]) {
    const sidebar = declarations(current, '.pp-sidebar', width);
    assert.equal(sidebar.position, 'sticky');
    assert.equal(sidebar.top, '.75rem');
    assert.equal(sidebar['max-height'], 'calc(100vh - 1.5rem)');
    assert.equal(sidebar['box-sizing'], 'border-box');
    assert.equal(sidebar.overflow, 'auto');
    assert.equal(sidebar.padding, '1.15rem');
  }
  // Arithmetic identity of the CSS bound, not a browser layout simulation:
  // top=.75rem plus border-box max-height=(100vh-1.5rem) leaves .75rem below.
  for (const height of [320, 480, 757, 900]) for (const rem of [16, 20, 24, 32]) {
    const top = .75 * rem, borderBoxMax = height - 1.5 * rem;
    assert.equal(height - (top + borderBoxMax), .75 * rem);
    assert.ok(borderBoxMax > 0);
  }
});

test('Status stickiness, complete wrapping and all narrow layout corrections remain intact', () => {
  for (const width of [320, 485, 650, 651, 668, 700, 936, 1050, 1051, 1170, 1440]) {
    assert.deepEqual(declarations(current, '.pp-status', width), declarations(prior, '.pp-status', width));
    assert.equal(declarations(current, '.pp-status', width).position, width <= 650 ? 'static' : 'sticky');
    assert.equal(declarations(current, '.pp-status', width)['overflow-wrap'], 'anywhere');
    assert.deepEqual(declarations(current, '#source .pp-small', width), declarations(prior, '#source .pp-small', width));
    assert.deepEqual(declarations(current, '.pp-layout', width), declarations(prior, '.pp-layout', width));
    assert.deepEqual(declarations(current, '.pp-layout>*', width), declarations(prior, '.pp-layout>*', width));
    assert.deepEqual(declarations(current, '.pp-hash', width), declarations(prior, '.pp-hash', width));
    if (width <= 1050) {
      const sidebar = declarations(current, '.pp-sidebar', width);
      assert.equal(sidebar.position, 'static');
      assert.equal(sidebar['max-height'], 'none');
    }
  }
});

test('All unrelated CSS declarations including local scientific-table scrolling are unchanged', () => {
  const withoutCorrection = source => source.filter(rule => rule.selector !== header).map(rule => {
    const copy = structuredClone(rule);
    if (copy.selector === '.pp-sidebar' && copy.maxWidth === Infinity) {
      delete copy.declarations['max-height'];
      delete copy.declarations['box-sizing'];
    }
    return copy;
  });
  assert.deepEqual(withoutCorrection(current), withoutCorrection(prior));
  for (const width of [320, 485, 1050, 1170, 1440]) {
    assert.equal(declarations(current, '.pp-table', width).overflow, 'auto');
    assert.equal(declarations(current, '.pp-table', width)['max-width'], '100%');
    assert.equal(declarations(current, 'table', width)['white-space'], 'nowrap');
  }
});

test('Accepted narrow-layout helper and six tests stay byte-identical as a separate prior layer', () => {
  for (const [file, hash] of [
    ['tests/helpers/lesson-narrow-layout-preservation.cjs', '61f808667ccf191d437a00c9b8a8bb5b0266e2772b5e96e57bb70989f9261e11'],
    ['tests/lesson-narrow-layout.test.cjs', '2a44e7b08169f424107109105871841ce76a27fd0cc6cb8fa223eb3df68bf4bb'],
    ['labs/perceptive-bsbl/lesson.css', '13dc2126f5812b385c5c3e54b8dd3396163ac64e72e96adbe167107a9ef4ad14']
  ]) assert.equal(S.sha(read(file)), hash, file);
});
