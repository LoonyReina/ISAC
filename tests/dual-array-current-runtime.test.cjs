'use strict';
// Current-runtime provenance adapter gates. Numerical and behavior execution stays
// in the unchanged named 42-case owned suite and six production export/replay cases.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const P = require('./helpers/dual-array-current-runtime-preservation.cjs');
const display = require('./helpers/dual-array-plot-readability-preservation.cjs');
const timer = require('./helpers/dual-array-browser-timer-preservation.cjs');
const root = path.resolve(__dirname, '..');
const page = 'content/pages/dual-array-positioning.html';
function read(file) {
  const names = file === page ? [file, 'dual-array-positioning.html'] : [file];
  for (const name of names) if (fs.existsSync(path.join(root, name))) return require('./helpers/dual-array-record-portability-preservation.cjs').maybeWithoutFile(file, fs.readFileSync(path.join(root, name)));
  throw Error('Missing current runtime source: ' + file);
}
const deltaBytes = read('tests/helpers/dual-array-current-runtime-delta.json');
const freezeBytes = read('tests/helpers/dual-array-current-runtime-freeze.json');
const delta = JSON.parse(deltaBytes), freeze = JSON.parse(freezeBytes);

test('Current-runtime adapter and complete support inventory are independently pinned', () => {
  assert.equal(P.sha(deltaBytes), 'c3930a165fd2d69b92a203ad4eed492c9565db852293beed7e6909a1c6fefef4');
  assert.equal(P.sha(freezeBytes), 'abc86e172d819dd8cfdc5fbb404db01dc9e2018c97d012d57af4ac9809771fa3');
  assert.deepEqual(P.adaptedPaths, ['labs/dual-array/lesson/tests/lesson.test.mjs', 'tests/dual-array-owned.test.cjs']);
  assert.deepEqual(P.supportPaths, ['tests/helpers/dual-array-current-runtime-preservation.cjs', 'tests/helpers/dual-array-current-runtime-delta.json', 'tests/helpers/dual-array-browser-timer-preservation.cjs', 'tests/helpers/dual-array-plot-readability-preservation.cjs']);
  assert.deepEqual(freeze.files.map(row => row.path), [...P.adaptedPaths, ...P.supportPaths]);
  for (const row of freeze.files) { const current = read(row.path); assert.equal(current.length, row.bytes, row.path); assert.equal(P.sha(current), row.sha256, row.path); }
});

test('Current client display and adapted lesson recover the exact21-file historical provenance', () => {
  const frozen = read('labs/dual-array/FUNCTIONAL-FREEZE.json');
  assert.equal(P.sha(frozen), '183fae1a6f7b536d582595440763a7f57a1aed8b0dcd23e31bbd5a2c4897fbd6');
  const files = JSON.parse(frozen).files; assert.equal(files.length, 21);
  for (const row of files) {
    const current = read(row.path), old = P.historicalBytes(row.path, current);
    if (row.path === page) assert.equal(P.sha(display.normalizePage(old.toString())), display.corrections[1].beforeNormalizedSha256);
    else { assert.equal(old.length, row.bytes, row.path); assert.equal(P.sha(old), row.sha256, row.path); }
  }
  assert.equal(P.sha(read(timer.correction.path)), timer.correction.after.sha256, 'current production still contains both timer bindings');
});

test('Only the first provenance assertion and its import change; all41 behavior cases and42 names remain exact', () => {
  const file = P.adaptedPaths[0], current = read(file).toString(), old = P.withoutAdapter(file, read(file)).toString();
  const oldHash = "createHash('sha256').update(await fs.readFile(new URL('../../runtime/'+name,import.meta.url))).digest('hex')";
  const newHash = "createHash('sha256').update(repair.historicalBytes('labs/dual-array/runtime/'+name,await fs.readFile(new URL('../../runtime/'+name,import.meta.url)))).digest('hex')";
  assert.equal(old.split(oldHash).length, 2);
  assert.equal(current, old.replace("import test from 'node:test';", "import test from 'node:test';\nimport repair from '../../../../tests/helpers/dual-array-current-runtime-preservation.cjs';").replace(oldHash, newHash));
  const marker = "test('default controls build exact accepted default request'";
  assert.equal(current.slice(current.indexOf(marker)), old.slice(old.indexOf(marker)), 'byte-exact remaining41 cases');
  const names = [...current.matchAll(/^test\('([^']+)'/gm)].map(m => m[1]);
  assert.equal(names.length, 42);
  assert.deepEqual(names, JSON.parse(read('tests/helpers/dual-array-owned-suites.json')).names);
});

test('Owned fixture writes current bytes while accepted bytes are restricted to provenance assertions', () => {
  const text = read(P.adaptedPaths[1]).toString();
  assert.match(text, /const bytes = source\(row\), accepted = repair\.historicalBytes\(row\.path, bytes\)/);
  assert.match(text, /fs\.writeFileSync\(target, bytes\)/);
  assert.doesNotMatch(text, /fs\.writeFileSync\([^\n]*accepted/);
  assert.match(text, /const suite = run\('owned-tests', process\.execPath, \['--max-old-space-size=512', '--test', '--test-concurrency=1', '--test-reporter=tap', path\.join\(sourceRoot, owned\.suite\)\]/);
  assert.match(text, /const exported = run\('mounted-exports'/);
  assert.match(text, /const replay = run\('independent-formula-replay'/);
  assert.match(text, /a\.equal\(summary\('tests'\), 42/);
  assert.match(text, /a\.equal\(result\.numeric_values_compared, 25563/);
  assert.match(text, /a\.ok\(Number\.isFinite\(result\.alias_template_relative_residual/);
  const old = P.withoutAdapter(P.adaptedPaths[1], read(P.adaptedPaths[1])).toString();
  for (const [start, end] of [['function assertTap(', '\nfunction pick('], ["    const suite = run('owned-tests'", '\n  } catch (error) {']]) {
    assert.equal(text.slice(text.indexOf(start), text.indexOf(end)), old.slice(old.indexOf(start), old.indexOf(end)), 'exact execution/assertion block: ' + start);
  }
});

test('Every repaired path rejects old or unreviewed bytes rather than accepting arbitrary historical input', () => {
  for (const file of [timer.correction.path, display.corrections[0].path, page, ...P.adaptedPaths]) {
    const current = read(file), old = P.historicalBytes(file, current);
    assert.throws(() => P.historicalBytes(file, Buffer.concat([current, Buffer.from('\n')])), file + ' extra source');
    assert.throws(() => P.historicalBytes(file, old), file + ' old source cannot masquerade as current');
  }
  for (const file of ['labs/dual-array/runtime/kernel.mjs', 'labs/dual-array/runtime/records.mjs', 'labs/dual-array/runtime/worker.mjs']) {
    const current = read(file); assert.equal(P.historicalBytes(file, current), current, 'scientific sources are never adapted: ' + file);
  }
  assert.throws(() => P.withoutAdapter('unlisted.test.cjs', Buffer.from('anything')));
});

test('Generated SITE regions compose with focus-only page inverse and preserve every other byte', () => {
  let mapped = read(page).toString();
  for (const name of ['HEADER', 'CONTEXT', 'NEXT']) {
    const start = '<!-- SITE:' + name + ':START -->', end = '<!-- SITE:' + name + ':END -->';
    mapped = mapped.replace(new RegExp(start + '[\\s\\S]*?' + end), start + '\n<div>Generated ' + name + '</div>\n' + end);
  }
  const old = P.historicalBytes('dual-array-positioning.html', Buffer.from(mapped));
  assert.equal(P.sha(display.normalizePage(old.toString())), display.corrections[1].beforeNormalizedSha256);
  assert.equal(old.toString().replaceAll(display.corrections[1].from, display.corrections[1].to), mapped);
  assert.throws(() => P.historicalBytes(page, Buffer.from(mapped.replace('14,464', '14,465'))));
});
