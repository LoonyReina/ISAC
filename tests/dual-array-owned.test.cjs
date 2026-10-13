'use strict';
// Mandatory mapped-layout aggregate: accepted source, real Node Workers and
// production DOM/Blob downloads. This is not hosted-browser acceptance.
const {test} = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const owned = require('./helpers/dual-array-owned-suites.json');
const repair = require('./helpers/dual-array-record-runtime-preservation.cjs');
const adapterFreeze = require('./helpers/dual-array-record-runtime-freeze.json');
const root = path.resolve(__dirname, '..');
const page = 'content/pages/dual-array-positioning.html';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function source(row) {
  a.ok(/^[a-zA-Z0-9_./-]+$/.test(row.path) && !row.path.split('/').includes('..') && !path.isAbsolute(row.path), 'owned relative source path');
  const candidates = row.path === page ? [page, 'dual-array-positioning.html'] : [row.path];
  for (const relative of candidates) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) continue;
    a.ok(fs.lstatSync(file).isFile(), 'regular accepted input: ' + relative);
    return fs.readFileSync(file);
  }
  throw Error('Missing accepted dual-array input: ' + row.path);
}

function normalizePage(text) {
  // Only the three site-generator regions may differ. All other bytes,
  // including the final newline, remain part of the accepted fingerprint.
  for (const name of ['HEADER', 'CONTEXT', 'NEXT']) {
    const start = '<!-- SITE:' + name + ':START -->', end = '<!-- SITE:' + name + ':END -->';
    a.equal(text.split(start).length, 2, 'one ' + name + ' start marker');
    a.equal(text.split(end).length, 2, 'one ' + name + ' end marker');
    a.ok(text.indexOf(start) < text.indexOf(end), 'ordered ' + name + ' markers');
    text = text.replace(new RegExp(start + '[\\s\\S]*?' + end), '<!-- SITE:' + name + ' -->');
  }
  return text;
}

function inventory(dir, relative = '') {
  return fs.readdirSync(path.join(dir, relative), {withFileTypes: true}).flatMap(entry => {
    const file = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) return inventory(dir, file);
    a.ok(entry.isFile(), 'only regular owned files: ' + file);
    return [file];
  }).sort();
}

function assertTap(result) {
  const stdout = result.stdout;
  const summary = key => {
    const values = [...stdout.matchAll(new RegExp('^# ' + key + ' (\\d+)$', 'gm'))];
    a.equal(values.length, 1, 'one TAP summary for ' + key);
    return Number(values[0][1]);
  };
  a.equal(summary('tests'), 42, 'all accepted cases executed');
  a.equal(summary('pass'), 42);
  a.equal(summary('suites'), 0);
  for (const key of ['fail', 'cancelled', 'skipped', 'todo']) a.equal(summary(key), 0, 'no lost coverage: ' + key);
  a.deepEqual([...stdout.matchAll(/^# Subtest: (.+)$/gm)].map(match => match[1]), owned.names, 'exact accepted test names and order');
  a.deepEqual([...stdout.matchAll(/^ok (\d+) - (.+)$/gm)].map(match => [Number(match[1]), match[2]]), owned.names.map((name, i) => [i + 1, name]), '42 successful named TAP cases');
  a.equal((stdout.match(/^1\.\.42$/gm) || []).length, 1, 'complete TAP plan');
}

function pick(value, keys) {
  return Object.fromEntries(keys.map(key => [key, value[key]]));
}

// Independently re-hash the downloaded record body, preserving signed zero.
// Runtime wall timings belong to each actual receipt, not a historical digest.
function canonicalJSON(value) {
  if (typeof value === 'number') {
    a.ok(Number.isFinite(value), 'finite downloaded record numbers');
    return Object.is(value, -0) ? '-0' : JSON.stringify(value);
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJSON(value[key])).join(',') + '}';
}

const gateName = 'Dual-array 42 immutable owned tests and six production Blob downloads pass independent formula replay outside the repository';
test(gateName, {timeout: 240000}, t => {
  // Set this outside the source tree to retain every receipt and failure log.
  // Without it, successful runs are removed and failed temporary runs remain.
  const evidenceRoot = process.env.DUAL_ARRAY_OWNED_EVIDENCE_DIR;
  if (evidenceRoot) {
    a.ok(path.isAbsolute(evidenceRoot), 'absolute evidence directory');
    const relative = path.relative(root, evidenceRoot);
    a.ok(relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'evidence stays outside the repository');
    fs.mkdirSync(evidenceRoot, {recursive: true});
  }
  const temp = fs.mkdtempSync(path.join(evidenceRoot || os.tmpdir(), 'dual-array-owned-'));
  const sourceRoot = path.join(temp, 'source'), out = path.join(temp, 'downloads');
  let passed = false;
  const env = {...process.env, PYTHONDONTWRITEBYTECODE: '1', OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', NUMEXPR_NUM_THREADS: '1', VECLIB_MAXIMUM_THREADS: '1', UV_THREADPOOL_SIZE: '1'};
  delete env.NODE_TEST_CONTEXT;
  // Prevent parent test filters/options from silently altering child coverage.
  delete env.NODE_OPTIONS;
  function run(label, executable, args, timeout) {
    const result = cp.spawnSync(executable, args, {cwd: temp, env, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024});
    fs.writeFileSync(path.join(temp, label + '.stdout.log'), result.stdout || '');
    fs.writeFileSync(path.join(temp, label + '.stderr.log'), result.stderr || '');
    fs.writeFileSync(path.join(temp, label + '.process.json'), JSON.stringify({executable, args, cwd: temp, status: result.status, signal: result.signal, error: result.error ? String(result.error) : null}, null, 2) + '\n');
    if (result.error) throw result.error;
    a.equal(result.status, 0, label + '\n' + result.stdout + '\n' + result.stderr);
    a.equal(result.signal, null, label + ' completed normally');
    return result;
  }
  try {
    a.equal(owned.schemaVersion, 1);
    a.equal(owned.testCount, 42);
    a.equal(owned.names.length, 42);
    a.equal(new Set(owned.names).size, 42, 'unique accepted test names');
    a.equal(owned.downloadCount, 6);
    a.equal(owned.numericValuesCompared, 25563);
    const frozenBytes = source(owned.functionalFreeze);
    a.equal(frozenBytes.length, owned.functionalFreeze.bytes, 'functional freeze byte count');
    a.equal(sha(frozenBytes), '183fae1a6f7b536d582595440763a7f57a1aed8b0dcd23e31bbd5a2c4897fbd6', 'accepted functional freeze identity');
    a.equal(sha(frozenBytes), owned.functionalFreeze.sha256);
    const frozen = JSON.parse(frozenBytes);
    a.equal(frozen.schema, 'dual-array-lesson-functional-freeze-v1');
    a.deepEqual(frozen.files, owned.functionalFiles, 'exact accepted functional inventory');
    a.equal(frozen.files.length, 21);
    a.equal(frozen.owner_tests.passed, 42);
    a.equal(frozen.owner_tests.failed, 0);
    a.equal(frozen.owner_formula_replay.production_blob_downloads, 6);
    a.equal(frozen.owner_formula_replay.numeric_values_compared, 25563);
    const testDirectory = 'labs/dual-array/lesson/tests/';
    a.deepEqual(inventory(path.join(root, testDirectory)), owned.functionalFiles.filter(row => row.path.startsWith(testDirectory)).map(row => row.path.slice(testDirectory.length)).sort(), 'every owned helper and suite is frozen; no missing or extra test files');
    const fileReceipts = [];
    for (const row of owned.functionalFiles) {
      const bytes = source(row), accepted = repair.historicalBytes(row.path, bytes);
      // Historical provenance uses only exact reviewed inverses. Current bytes execute below.
      if (row.path === page) a.equal(sha(normalizePage(accepted.toString('utf8'))), owned.functionalPageNormalizedSha256, 'accepted HTML except generated SITE regions');
      else {
        a.equal(accepted.length, row.bytes, 'accepted size: ' + row.path);
        a.equal(sha(accepted), row.sha256, 'accepted bytes: ' + row.path);
      }
      const target = path.join(sourceRoot, row.path);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, bytes);
      fileReceipts.push({path: row.path, bytes: bytes.length, sha256: sha(bytes), acceptedSha256: sha(accepted), siteRegionsNormalized: row.path === page});
    }
    a.equal(adapterFreeze.schema, 'dual-array-browser-owned-adapter-freeze-v1');
    a.deepEqual(adapterFreeze.files.map(row => row.path), [...repair.adaptedPaths, ...repair.supportPaths], 'complete explicit current adapter inventory');
    for (const row of adapterFreeze.files) {
      const bytes = source(row);
      a.equal(bytes.length, row.bytes, 'current adapter size: ' + row.path);
      a.equal(sha(bytes), row.sha256, 'current adapter identity: ' + row.path);
      if (repair.supportPaths.includes(row.path)) {
        const target = path.join(sourceRoot, row.path);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, bytes);
      }
    }
    a.deepEqual(inventory(sourceRoot), [...owned.functionalFiles.map(row => row.path), ...repair.supportPaths].sort(), 'exact current owned source and provenance adapter tree');
    fs.writeFileSync(path.join(temp, 'source-receipts.json'), JSON.stringify(fileReceipts, null, 2) + '\n');

    const suite = run('owned-tests', process.execPath, ['--max-old-space-size=512', '--test', '--test-concurrency=1', '--test-reporter=tap', path.join(sourceRoot, owned.suite)], 160000);
    assertTap(suite);
    const exported = run('mounted-exports', process.execPath, ['--max-old-space-size=512', path.join(sourceRoot, 'labs/dual-array/lesson/tests/export-mounted.mjs'), out], 45000);
    const report = JSON.parse(exported.stdout);
    a.deepEqual(pick(report, ['actual_node_workers', 'production_mount', 'production_blob_downloads', 'browser']), {actual_node_workers: true, production_mount: true, production_blob_downloads: 6, browser: false});
    a.equal(owned.downloads.length, 6);
    const names = ['default-offgrid', 'rank1', 'rank2-nonreal-gain', 'same-y-coarse', 'noise-only', 'all-null'];
    a.deepEqual(owned.downloads.map(row => row.name), names);
    const projections = readJSON(path.join(out, 'mounted-projections.json'));
    a.equal(projections.length, 6, 'six actual mounted download receipts');
    a.deepEqual(projections.map(row => pick(row, ['name', 'filename', 'kind'])), owned.downloads, 'exact accepted download cases and kinds');
    a.deepEqual(report.files, projections.map(row => pick(row, ['name', 'bytes', 'sha256', 'record_sha256'])), 'stdout and persisted receipt identities agree');
    const downloaded = [];
    for (const receipt of projections) {
      a.equal(receipt.filename, receipt.name + '.json', 'local receipt filename');
      a.match(receipt.record_sha256, /^[a-f0-9]{64}$/, 'actual record SHA256');
      a.match(receipt.sha256, /^[a-f0-9]{64}$/, 'actual Blob SHA256');
      a.ok(Number.isSafeInteger(receipt.bytes) && receipt.bytes > 0, 'nonempty actual Blob bytes');
      a.equal(receipt.blob_filename, 'dual-array-' + receipt.record_sha256.slice(0, 16) + '.json', 'actual production Blob filename');
      const bytes = fs.readFileSync(path.join(out, receipt.filename));
      a.equal(bytes.length, receipt.bytes, receipt.name + ' actual Blob size');
      a.equal(sha(bytes), receipt.sha256, receipt.name + ' actual Blob digest');
      const record = JSON.parse(bytes);
      a.equal(record.record_sha256, receipt.record_sha256, receipt.name + ' record identity');
      const {record_sha256, ...body} = record;
      a.equal(sha(canonicalJSON(body)), record_sha256, receipt.name + ' independently recomputed record digest');
      const timings = record.execution.result.timing_seconds;
      a.deepEqual(Object.keys(timings).sort(), ['eigen_and_music', 'joint_profiles_literal_finite_X', 'preparation', 'total'], 'exact runtime timing fields');
      a.ok(Object.values(timings).every(value => Number.isFinite(value) && value >= 0), 'finite current-run timing receipts');
      a.equal(record.kind, receipt.kind);
      a.equal(receipt.matrix, 'Y', 'production selected observation');
      a.equal(record.execution.request.mode, 'observation', 'export includes actual X/Y');
      a.equal(record.execution.request.theta_grid_rad.length * record.execution.request.range_grid_m.length, owned.replayCases[downloaded.length].full_grid_candidates);
      a.equal(record.execution.result.joint.status, owned.replayCases[downloaded.length].status);
      downloaded.push(record);
    }
    a.equal(downloaded[2].execution.result.x_sha256, downloaded[3].execution.result.x_sha256, 'same-X regrid receipt');
    a.equal(downloaded[2].execution.result.y_sha256, downloaded[3].execution.result.y_sha256, 'same-Y regrid receipt');
    a.equal(downloaded[3].execution.generation, null, 'raw regrid has no inherited generation truth');
    const outputs = [...owned.downloads.map(row => row.filename), 'mounted-projections.json', 'alias-witness.json'];
    a.deepEqual(inventory(out), outputs.sort(), 'exact six downloads and two producer receipts');

    const replay = run('independent-formula-replay', 'python3', [path.join(sourceRoot, 'labs/dual-array/lesson/tests/replay_downloads.py'), out], 30000);
    const result = readJSON(path.join(out, 'independent-formula-replay.json'));
    a.deepEqual(JSON.parse(replay.stdout), result, 'persisted Python replay receipt matches actual process output');
    a.equal(result.status, 'passed');
    a.equal(result.owner_authored_independent_formula_replay, true);
    a.equal(result.browser_acceptance, false);
    a.equal(result.numeric_values_compared, 25563, 'exact independently replayed numeric count');
    a.deepEqual(result.cases.map(row => pick(row, ['case', 'full_grid_candidates', 'status'])), owned.replayCases, 'all six named cases and complete grids');
    a.deepEqual(result.cases.map(row => row.record_sha256), projections.map(row => row.record_sha256), 'Python replay verifies this run’s exact record identities');
    a.ok(Number.isFinite(result.maximum_normalized_error) && result.maximum_normalized_error >= 0 && result.maximum_normalized_error < 2e-5, 'finite bounded independent numerical error');
    a.ok(Number.isFinite(result.alias_template_relative_residual) && result.alias_template_relative_residual >= 0 && result.alias_template_relative_residual < 1e-11, 'analytic alias witness replay');
    a.deepEqual(inventory(out), [...outputs, 'independent-formula-replay.json'].sort(), 'complete export and replay inventory');
    fs.writeFileSync(path.join(temp, 'gate-receipt.json'), JSON.stringify({status: 'passed', testNames: owned.names, tests: 42, passed: 42, failed: 0, cancelled: 0, skipped: 0, todo: 0, productionBlobDownloads: 6, numericValuesCompared: 25563, actualNodeWorkers: true, productionMount: true, browserAcceptance: false, sourceReceipts: fileReceipts, downloads: projections.map(row => pick(row, ['name', 'filename', 'blob_filename', 'bytes', 'sha256', 'record_sha256', 'kind'])), independentFormulaReplay: result}, null, 2) + '\n');
    passed = true;
    t.diagnostic('42/42 exact named owned cases, six mounted production Blob downloads, and 25,563 independent Python numeric comparisons passed; actual Node Workers and lightweight DOM only, no hosted-browser claim');
  } catch (error) {
    fs.writeFileSync(path.join(temp, 'gate-failure.log'), error.stack || String(error));
    t.diagnostic('Retained dual-array failure logs and exact attempted source: ' + temp);
    throw error;
  } finally {
    if (passed && !evidenceRoot) fs.rmSync(temp, {recursive: true, force: true});
    else if (passed) t.diagnostic('Retained dual-array gate evidence: ' + temp);
  }
});
