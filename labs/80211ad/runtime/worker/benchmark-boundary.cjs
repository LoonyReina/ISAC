'use strict';
// Reproducible Node-only measurement of explicit snapshot boundary costs.
// This is not a browser benchmark or a total heap/GC measurement.
const { Worker } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
(async () => {
  const worker = new Worker(path.join(__dirname, 'receiver-worker.js'));
  const events = [], waiters = [];
  worker.on('message', e => { events.push(e); for (const w of [...waiters]) if (w.p(e)) { waiters.splice(waiters.indexOf(w), 1); clearTimeout(w.timer); w.resolve(e); } });
  function wait(p) {
    const prior = events.find(p); if (prior) return Promise.resolve(prior);
    return new Promise((resolve, reject) => { const w = { p, resolve, timer: setTimeout(() => reject(Error('Benchmark timed out')), 120000) }; waiters.push(w); });
  }
  const terminal = id => wait(e => e.id === id && ['complete', 'cancelled', 'superseded', 'error'].includes(e.type));
  try {
    assert.equal((await wait(e => e.type === 'ready')).ok, true);
    const config = { frames: 58, oversample: 8, max_delay_chips: 768, pulse_halfspan_chips: 16 };
    let start = performance.now(); worker.postMessage({ id: 'large', type: 'generate', config, targets: [], noise: false });
    const generated = await terminal('large'); assert.equal(generated.type, 'complete');
    const generationMs = performance.now() - start;
    start = performance.now(); worker.postMessage({ id: 'export', type: 'export', observationId: 'large' });
    const exported = await terminal('export'); assert.equal(exported.type, 'complete');
    const exportMs = performance.now() - start;
    let cancelStarted;
    const cancelExport = e => {
      if (e.id === 'cancel-export' && e.type === 'progress' && e.progress.stage === 'observation_hash' && e.progress.done === e.progress.total) {
        cancelStarted = performance.now(); worker.postMessage({ id: 'cancel-action', type: 'cancel', targetId: 'cancel-export' });
      }
    };
    worker.on('message', cancelExport);
    worker.postMessage({ id: 'cancel-export', type: 'export', observationId: 'large' });
    const cancelledExport = await terminal('cancel-export'); assert.equal(cancelledExport.type, 'cancelled');
    const cancelAfterLastHashProgressMs = performance.now() - cancelStarted;
    worker.off('message', cancelExport);
    const beforePost = performance.now();
    worker.postMessage({ id: 'large-import', type: 'import', observation: exported.result.observation });
    const afterPost = performance.now();
    worker.postMessage({ id: 'release', type: 'release' });
    assert.equal((await terminal('release')).type, 'complete');
    const releaseLatencyMs = performance.now() - afterPost;
    assert.equal((await terminal('large-import')).type, 'cancelled');
    const report = {
      environment: 'actual Node worker_threads; no real-browser execution', node: process.version,
      platform: process.platform, arch: process.arch, fixture: '58 frames, zero signal, no noise; full-size typed/raw arrays',
      complex_samples: generated.result.complexSamples, scalar_sample_elements: generated.result.complexSamples * 2,
      generation_ms: generationMs, full_export_with_hash_and_transport_ms: exportMs,
      cancel_after_last_export_hash_progress_ms: cancelAfterLastHashProgressMs,
      parent_postMessage_plain_import_ms: afterPost - beforePost,
      release_ack_after_plain_import_postMessage_ms: releaseLatencyMs,
      import_result: 'cancelled before committing held state',
      source_sha256: Object.fromEntries(['receiver-worker.js', 'protocol.js', 'benchmark-boundary.cjs', '../js/receiver.js', '../js/sha256.js'].map(name =>
        [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, name))).digest('hex')])),
      limits: ['postMessage initial structured clone cannot be cancelled by Worker code',
        'plain-array input preflight and normalization are synchronous and bounded by dimensions',
        'export JSON-safe array construction and outgoing structured clone are synchronous',
        'timings are this Node host only; no browser latency, heap, GC or speed guarantee']
    };
    fs.writeFileSync(path.join(__dirname, 'BOUNDARY-BENCHMARK.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally { for (const w of waiters) clearTimeout(w.timer); await worker.terminate(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
