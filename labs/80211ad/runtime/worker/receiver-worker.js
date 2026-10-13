/* Classic browser Worker and Node worker_threads entry point.
 * Scheduling/fencing pattern adapted from the sibling ofdm-ici-browser-prototype
 * worker/ici-worker.js; observation lifecycle and strict protocol are new here.
 * No DOM, network, fixture lookup, truth-assisted receiver, or global data cache.
 */
(function () {
  'use strict';
  var node = typeof process === 'object' && process.versions && process.versions.node && typeof require === 'function';
  var port = node ? require('node:worker_threads').parentPort : null;
  if (node && !port) throw new Error('receiver-worker.js must run inside a Worker');
  var send = node ? function (x) { port.postMessage(x); } : function (x) { self.postMessage(x); };
  var listen = node ? function (f) { port.on('message', f); } : function (f) { self.addEventListener('message', function (e) { f(e.data); }); };
  var protocol, kernel, loadError, held = null, selected = null, executing = null, scheduled = false;
  var ids = new Set(), STOP = {};
  var now = typeof performance === 'object' && typeof performance.now === 'function' ? function () { return performance.now(); } : Date.now;
  function detail(e) { return String(e && e.message || e || 'Unknown Worker error').slice(0, 1000); }
  function validId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id); }
  function reject(message, code, messageText) {
    send({ type: 'error', id: message && validId(message.id) ? message.id : null,
      rejected: true, error: { code: code, message: messageText } });
  }
  function terminal(token, type, extras) {
    if (token.terminal) return;
    var e = { type: type, id: token.id, operation: token.type };
    if (extras) Object.assign(e, extras);
    send(e); token.terminal = true;
  }
  function stop(token, reason, why) {
    if (!token || token.terminal) return;
    if (!token.stopReason) { token.stopReason = reason; token.stopDetail = why; }
    if (token !== executing) {
      terminal(token, token.stopReason, { reason: token.stopDetail });
      token.request = null; token.snapshot = null;
    }
  }
  function check(token) {
    if (token.stopReason || selected !== token) throw STOP;
    if (now() - token.started > token.maxWallMs) {
      var e = new Error('Worker wall-time budget exceeded'); e.code = 'TIME_LIMIT'; throw e;
    }
  }
  async function checkpoint(token, stage, done, total) {
    check(token);
    // A macrotask yield is required: Promise.resolve alone cannot receive cancel.
    await new Promise(function (resolve) { setTimeout(resolve, 0); });
    check(token);
    var time = now();
    if (typeof stage === 'string' && (stage !== token.lastStage || time - token.lastProgress >= 25 || done === total)) {
      token.lastStage = stage; token.lastProgress = time;
      send({ type: 'progress', id: token.id, operation: token.type,
        progress: { stage: stage.slice(0, 128), done: Number.isFinite(done) ? done : null, total: Number.isFinite(total) ? total : null } });
    }
  }
  function metadata(entry) {
    var obs = entry.observation, c = obs.config;
    return { observationId: entry.id, config: c, frames: obs.samples.length,
      samplesPerFrame: obs.samples[0].real.length,
      complexSamples: obs.samples.length * obs.samples[0].real.length,
      noise_variance: obs.noise_variance, start_chip: obs.start_chip,
      provenance: obs.provenance };
  }
  function schedule() {
    if (scheduled || executing || !selected || selected.terminal) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      if (!executing && selected && !selected.terminal) execute(selected);
    }, 0);
  }
  async function execute(token) {
    executing = token; token.started = now();
    try {
      await checkpoint(token);
      var req = token.request, output, observation;
      var hooks = { checkpoint: function (stage, done, total) { return checkpoint(token, stage, done, total); } };
      if (req.type === 'generate') {
        observation = await kernel.synthesize(req.config, req.targets, { noise: req.noise, hooks: hooks });
        await checkpoint(token);
        // Generated truth remains generation input; only validated receiver data
        // can enter held state, and only after the final cancellation fence.
        observation = kernel.validateObservation(observation, { copy: false });
        await checkpoint(token);
        held = { id: token.id, observation: observation };
        output = metadata(held);
      } else if (req.type === 'import') {
        if (req.expected_hashes) {
          var actualSampleHash = await kernel.observationDigest(req.observation, hooks);
          var actualMetadataHash = kernel.observationMetadataDigest(req.observation);
          if (actualSampleHash !== req.expected_hashes.observation_sha256 || actualMetadataHash !== req.expected_hashes.observation_metadata_sha256) {
            var mismatch = new Error('Imported observation does not match the expected sample and metadata digests'); mismatch.code = 'HASH_MISMATCH'; throw mismatch;
          }
        }
        await checkpoint(token, 'import', 1, 1);
        held = { id: token.id, observation: req.observation };
        output = metadata(held);
      } else if (req.type === 'process') {
        output = await kernel.process(token.snapshot.observation, req.options, hooks);
        await checkpoint(token);
      } else if (req.type === 'export') {
        var raw = token.snapshot.observation;
        var digest = await kernel.observationDigest(raw, hooks);
        output = { schema: '80211ad-raw-observation-v1', observationId: req.observationId,
          observation_sha256: digest, observation_metadata_sha256: kernel.observationMetadataDigest(raw),
          hash_codec: 'frame-major-complex-interleaved-float64le-finite-zero-normalized-v1',
          observation: kernel.exportObservation(raw) };
        await checkpoint(token);
      }
      terminal(token, 'complete', { result: output });
    } catch (e) {
      if (token.stopReason || e === STOP) terminal(token, token.stopReason || 'superseded', { reason: token.stopDetail || 'newer-request' });
      else terminal(token, 'error', { error: { code: e && typeof e.code === 'string' ? e.code : 'KERNEL_ERROR', message: detail(e) } });
    } finally {
      // Do not retain targets, stale snapshots, or receiver maps after settling.
      token.request = null; token.snapshot = null;
      if (selected === token) selected = null;
      executing = null; schedule();
    }
  }
  function handle(message) {
    if (loadError) return reject(message, 'KERNEL_LOAD_FAILED', loadError);
    var req;
    try {
      // Duplicate rejection precedes costly array normalization. Rejected input
      // never cancels an accepted job or invalidates a held observation.
      if (message && validId(message.id) && ids.has(message.id)) return reject(message, 'REUSED_ID', 'Use a fresh id for every request, including controls');
      if (ids.size >= protocol.limits.maxRequests) return reject(message, 'SESSION_LIMIT', 'Restart the Worker after 10,000 accepted requests');
      req = protocol.validateRequest(message, kernel, held);
      if (req.type === 'export' && (selected || executing)) return reject(message, 'WORKER_BUSY', 'Export requires an idle Worker');
    } catch (e) { return reject(message, e && e.code || 'INVALID_INPUT', detail(e)); }
    ids.add(req.id);
    if (req.type === 'cancel') {
      var cancelled = Boolean(selected && selected.id === req.targetId && !selected.terminal);
      if (cancelled) { stop(selected, 'cancelled', 'requested'); selected = null; }
      return send({ type: 'complete', id: req.id, operation: 'cancel', result: { targetId: req.targetId, cancelled: cancelled } });
    }
    if (req.type === 'release') {
      var releasedId = held ? held.id : null;
      stop(selected, 'cancelled', 'released'); selected = null; held = null;
      return send({ type: 'complete', id: req.id, operation: 'release', result: { releasedObservationId: releasedId } });
    }
    stop(selected, 'superseded', 'newer-request');
    if (req.type === 'generate' || req.type === 'import') held = null;
    selected = { id: req.id, type: req.type, request: req,
      snapshot: req.type === 'process' || req.type === 'export' ? held : null,
      terminal: false, stopReason: null, maxWallMs: req.type === 'process' ? req.options.max_wall_ms : protocol.limits.generationWallMs,
      lastStage: null, lastProgress: -Infinity };
    send({ type: 'accepted', id: req.id, operation: req.type }); schedule();
  }
  // Bind even if the kernel cannot be loaded: no silent hung requests.
  listen(handle);
  try {
    if (node) { protocol = require('./protocol.js'); kernel = require('../js/receiver.js'); }
    else { importScripts('./protocol.js', '../js/sha256.js', '../js/receiver.js'); protocol = self.AdWorkerProtocol; kernel = self.AdReceiver; }
    for (var name of ['validateConfig', 'validateTargets', 'validateObservation', 'synthesize', 'process', 'exportObservation', 'observationDigest', 'observationMetadataDigest'])
      if (!kernel || typeof kernel[name] !== 'function') throw new Error('AdReceiver.' + name + ' was not exported');
  } catch (e) { loadError = detail(e); }
  send({ type: 'ready', ok: !loadError, protocol: '80211ad-worker-v1',
    limits: protocol ? protocol.limits : null,
    error: loadError ? { code: 'KERNEL_LOAD_FAILED', message: loadError } : null });
}());
