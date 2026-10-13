'use strict';
// Optional evidence producer. Production mounted DOM actions + actual Node Workers.
// This does not exercise a browser or assert browser memory/performance support.
// Write only to the explicit external directory supplied as --out DIR.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { Worker } = require('node:worker_threads');
const lightDocument = require('./dom-harness.cjs');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out' || !args[1]) throw Error('Usage: node export-ui-records.cjs --out ABSOLUTE_OUTPUT_DIRECTORY');
if (!path.isAbsolute(args[1])) throw Error('--out must be an absolute directory');
const out = path.resolve(args[1]);
const root = path.resolve(__dirname, '../../../..');
if (out === root || out.startsWith(root + path.sep)) throw Error('Evidence must stay outside the site source/staging tree');
const manifestPath = path.join(out, 'UI-EXPORT-MANIFEST.json');
if (fs.existsSync(manifestPath)) throw Error('Output already has a manifest; preserve it and select a new explicit directory');
const sourcePage = path.join(root, 'content/pages/networked-sync.html');
const page = fs.existsSync(sourcePage) ? sourcePage : path.join(root, 'networked-sync.html');
const pageBytes = fs.readFileSync(page), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['controller.js', 'stages.js', 'lesson.js', 'lesson.css'].map(p => path.resolve(__dirname, '..', p));
const sourceFiles = [...sourcePaths, page].map(p => { const bytes = fs.readFileSync(p); return { path: path.relative(root, p), bytes: bytes.length, sha256: sha(bytes) }; });
const V = require('../lesson.js');
const entry = path.resolve(__dirname, '../../runtime/worker/receiver-worker.js');
const cases = [
  { name: 'compact-r1', shape: 'compact', rank: 1 },
  { name: 'compact-r2', shape: 'compact', rank: 2 },
  { name: 'compact-r3', shape: 'compact', rank: 3 },
  { name: 'original-r1', shape: 'original', rank: 1 },
  { name: 'original-r2', shape: 'original', rank: 2 },
  { name: 'original-r3', shape: 'original', rank: 3, iterations: 3 },
  { name: 'compact-near-collision-r3', shape: 'compact', rank: 3, scenario: 'close' },
  { name: 'compact-low-snr-r3', shape: 'compact', rank: 3, snr: -10 },
  { name: 'compact-phasewrap-r2', shape: 'compact', rank: 2, scenario: 'phasewrap' }
];
const manifest = {
  schema: 'networked-sync-mounted-ui-exports-v1',
  created_at_utc: new Date().toISOString(),
  execution: 'production mounted DOM button handlers; actual Node worker_threads; no real browser execution',
  source_files_at_module_load: sourceFiles,
  runtime_source_freeze_sha256: sha(fs.readFileSync(path.resolve(__dirname, '../../runtime/SOURCE-FREEZE.json'))),
  node: process.version,
  cases: [],
  files: []
};
const persist = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.mkdirSync(out, { recursive: true }); persist();
async function runCase(item) {
  const h = lightDocument(pageBytes.toString('utf8')), workers = [], sent = [], downloads = [];
  const app = V.mount(h.document, {
    createWorker() { const worker = new Worker(entry), post = worker.postMessage.bind(worker); worker.postMessage = m => { sent.push({ type: m.type, id: m.id }); post(m); }; workers.push(worker); return worker; },
    download(text, name) { downloads.push({ text, name }); }
  });
  const started = performance.now(), record = { name: item.name, requested: { shape: item.shape, rank: item.rank, iterations: item.iterations || 2, trace: 'full', seed: 20261012, snrDb: item.snr ?? 5, scenario: item.scenario || 'ordinary' }, files: [] };
  try {
    for (const [field, value] of Object.entries({ shape: item.shape, rank: item.rank, iterations: item.iterations || 2, trace: 'full', seed: 20261012, snr: item.snr ?? 5, scenario: item.scenario || 'ordinary' })) h.get('ns-' + field).value = String(value);
    await h.get('ns-run').fire('click');
    assert.equal(app.controller.state, 'complete', app.controller.error || h.get('ns-record-status').textContent);
    assert.equal(app.controller.result.operation, 'generate');
    record.config = structuredClone(app.controller.result.config);
    record.identity = structuredClone(app.controller.held.identity);
    record.methods = Object.fromEntries(Object.entries(app.controller.result.methods).map(([name, method]) => [name, {
      numerical_success: method.numerical_success,
      link_success: method.links.map(Boolean),
      errors: method.errors,
      association_gap: method.pair?.association_gap ?? null,
      ambiguous_association: method.pair?.ambiguous_association ?? null,
      residual_norm: method.links.map(link => link?.residual_norm ?? null),
      iterations: method.links.map(link => link?.iterations ?? null),
      stopping_condition_met: method.links.map(link => link?.stopping_condition_met ?? null)
    }]));
    record.boundaries = structuredClone(app.controller.result.boundaries);
    record.evaluation = structuredClone(app.controller.result.evaluation);
    for (const mode of ['raw', 'history']) {
      const before = downloads.length; await h.get('ns-export-' + mode).fire('click');
      assert.equal(downloads.length, before + 1, 'UI export button must produce one download');
      const { text, name } = downloads.pop(), envelope = JSON.parse(text), filename = item.name + '-' + mode + '.json';
      assert.equal(envelope.mode, mode); assert.deepEqual(envelope.identity, record.identity);
      if (mode === 'history') { assert.equal(envelope.historical.freshExecution, false); assert.equal(envelope.historical.label, 'historical-import-not-fresh-execution'); }
      const destination = path.join(out, filename); assert.equal(fs.existsSync(destination), false, 'Refuse to overwrite prior evidence');
      fs.writeFileSync(destination, text);
      const file = { case: item.name, mode, path: filename, download_name: name, bytes: Buffer.byteLength(text), sha256: sha(text), identity: structuredClone(record.identity), config: structuredClone(record.config) };
      manifest.files.push(file); record.files.push(filename);
    }
    record.execution_status = 'complete';
  } catch (error) {
    record.execution_status = 'error'; record.error = { name: error.name, message: error.message };
    process.exitCode = 1;
  } finally {
    record.node_elapsed_ms = performance.now() - started;
    record.operations = sent; manifest.cases.push(record); persist();
    await app.dispose(); await Promise.all(workers.map(w => w.terminate()));
    console.log(JSON.stringify({ case: item.name, status: record.execution_status, files: record.files.length, methods: Object.fromEntries(Object.entries(record.methods || {}).map(([k, v]) => [k, v.numerical_success])), elapsed_ms: Math.round(record.node_elapsed_ms) }));
  }
}
(async () => {
  for (const item of cases) { await runCase(item); if (typeof global.gc === 'function') global.gc(); }
  manifest.completed_at_utc = new Date().toISOString();
  manifest.total_bytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  manifest.source_files_unchanged_after_module_load = sourceFiles.every(file => sha(fs.readFileSync(path.join(root, file.path))) === file.sha256);
  persist();
  console.log(JSON.stringify({ cases: manifest.cases.length, files: manifest.files.length, total_bytes: manifest.total_bytes, out, source_files_unchanged_after_module_load: manifest.source_files_unchanged_after_module_load }));
})().catch(error => { console.error(error); process.exitCode = 1; });
