/* Standalone classic browser Worker and Node worker_threads entry point.
 * Numerical implementation lives in ../js/ici-kernel.js. No DOM or network use.
 */
(function () {
  'use strict';
  var isNode = typeof process === 'object' && process.versions && process.versions.node && typeof require === 'function';
  var port = isNode ? require('node:worker_threads').parentPort : null;
  if (isNode && !port) throw new Error('ici-worker.js must run in a Worker');
  var send = isNode ? function (message) { port.postMessage(message); } : function (message) { self.postMessage(message); };
  var listen = isNode ? function (handler) { port.on('message', handler); } : function (handler) { self.addEventListener('message', function (event) { handler(event.data); }); };
  var MAX_BYTES = 4 * 1024 * 1024, MAX_NODES = 200000, MAX_DEPTH = 32, MAX_RUNS = 10000;
  var seenIds = new Set(), selected = null, executing = null, scheduled = false, kernel = null, loadError = null;
  var STOP = {};
  function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value); }
  function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && !ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === '[object Object]'; }
  function errorMessage(error) { return String(error && error.message || error || 'Unknown worker error').slice(0, 1000); }
  function reject(message, code, detail) {
    send({ type: 'error', runId: message && validId(message.runId) ? message.runId : null, rejected: true, error: { code: code, message: detail } });
  }
  // A bounded iterative preflight, before any numerical allocation. The transport
  // has already cloned the incoming message; this cannot prevent that first clone.
  function preflight(input) {
    var stack = [{ value: input, depth: 0 }], seen = new Set(), bytes = 0, nodes = 0;
    while (stack.length) {
      var item = stack.pop(), value = item.value;
      if (++nodes > MAX_NODES || item.depth > MAX_DEPTH) throw new Error('Input exceeds structural limits');
      if (value === null || typeof value === 'number' || typeof value === 'boolean') bytes += 8;
      else if (typeof value === 'string') bytes += 2 * value.length;
      else if (typeof value === 'object') {
        if (seen.has(value)) throw new Error('Input must be an acyclic tree without shared references');
        seen.add(value);
        if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) bytes += value.byteLength;
        else {
          if (!Array.isArray(value) && !isRecord(value)) throw new Error('Input contains an unsupported object');
          var keys = Object.keys(value);
          if (keys.length + nodes + stack.length > MAX_NODES) throw new Error('Input exceeds structural limits');
          bytes += 8 + keys.length * 8;
          for (var i = 0; i < keys.length; i++) {
            bytes += keys[i].length * 2;
            stack.push({ value: value[keys[i]], depth: item.depth + 1 });
          }
        }
      } else throw new Error('Input contains an unsupported value');
      if (bytes > MAX_BYTES) throw new Error('Input exceeds the 4 MiB preflight budget');
    }
  }
  function terminal(token, type, extra) {
    if (token.terminal) return;
    var event = { type: type, runId: token.runId };
    if (extra) Object.keys(extra).forEach(function (key) { event[key] = extra[key]; });
    send(event);
    token.terminal = true;
  }
  function stop(token, reason, detail) {
    if (!token || token.terminal) return;
    if (!token.stopReason) { token.stopReason = reason; token.stopDetail = detail; }
    if (token !== executing) terminal(token, token.stopReason, { reason: token.stopDetail });
  }
  async function checkpoint(token) {
    if (token.stopReason || selected !== token) throw STOP;
    // Promise.resolve() alone only yields to microtasks and cannot receive cancel.
    await new Promise(function (resolve) { setTimeout(resolve, 0); });
    if (token.stopReason || selected !== token) throw STOP;
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
    executing = token;
    try {
      await checkpoint(token);
      var result = await kernel.run(token.input, {
        checkpoint: function () { return checkpoint(token); },
        progress: function (event) {
          if (selected === token && !token.stopReason && !token.terminal) send({ type: 'progress', runId: token.runId, progress: event });
        }
      });
      await checkpoint(token);
      terminal(token, 'complete', { result: result });
    } catch (error) {
      if (token.stopReason || error === STOP) terminal(token, token.stopReason || 'superseded', { reason: token.stopDetail || 'newer-run' });
      else {
        var detail = { code: error && typeof error.code === 'string' ? error.code : error && error.status === 'time_cap' ? 'TIME_CAP' : 'KERNEL_ERROR', message: errorMessage(error) };
        if (error && typeof error.status === 'string') detail.status = error.status.slice(0, 128);
        terminal(token, 'error', { error: detail });
      }
    } finally {
      // Release large input/output arrays as soon as the computation unwinds.
      token.input = null;
      if (selected === token) selected = null;
      executing = null;
      schedule();
    }
  }
  function handle(message) {
    if (!isRecord(message) || typeof message.type !== 'string') return reject(message, 'INVALID_MESSAGE', 'Expected a protocol object with a type');
    var allowed = message.type === 'run' ? ['type', 'runId', 'input'] : message.type === 'cancel' ? ['type', 'runId'] : message.type === 'reset' ? ['type'] : null;
    if (!allowed) return reject(message, 'UNKNOWN_MESSAGE_TYPE', 'Supported types are run, cancel and reset');
    if (Object.keys(message).some(function (key) { return allowed.indexOf(key) < 0; })) return reject(message, 'UNKNOWN_MESSAGE_FIELD', 'Unexpected protocol field');
    if (message.type !== 'reset' && !validId(message.runId)) return reject(message, 'INVALID_RUN_ID', 'runId must be 1–128 ASCII letters, digits, underscore, dot, colon or dash, starting with a letter or digit');
    if (message.type === 'reset') {
      stop(selected, 'cancelled', 'reset');
      selected = null;
      send({ type: 'reset', pendingStop: Boolean(executing && !executing.terminal) });
      return;
    }
    if (message.type === 'cancel') {
      if (!selected || selected.runId !== message.runId || selected.terminal) return send({ type: 'cancel-ignored', runId: message.runId, reason: 'not-current' });
      stop(selected, 'cancelled', 'requested');
      selected = null;
      return;
    }
    if (seenIds.has(message.runId)) return reject(message, 'REUSED_RUN_ID', 'Use a new runId for every run, including after reset');
    if (seenIds.size >= MAX_RUNS) return reject(message, 'SESSION_LIMIT', 'Create a new Worker after 10000 accepted runs');
    if (!isRecord(message.input)) return reject(message, 'INVALID_INPUT', 'run.input must be an object');
    try { preflight(message.input); } catch (error) { return reject(message, 'INPUT_PREFLIGHT_FAILED', errorMessage(error)); }
    if (loadError) return reject(message, 'KERNEL_LOAD_FAILED', loadError);
    seenIds.add(message.runId);
    stop(selected, 'superseded', 'newer-run');
    selected = { runId: message.runId, input: message.input, terminal: false, stopReason: null };
    send({ type: 'accepted', runId: message.runId });
    schedule();
  }
  // Bind even on import failure, so requests fail explicitly rather than hang.
  listen(handle);
  try {
    if (isNode) kernel = require('../js/ici-kernel.js');
    else { importScripts('../js/linalg.js', '../js/sha256.js', '../js/evaluate.js', '../js/ici-kernel.js'); kernel = self.ICIKernel; }
    if (!kernel || typeof kernel.run !== 'function') throw new Error('ICIKernel.run was not exported');
  } catch (error) { loadError = errorMessage(error); }
  send({ type: 'ready', ok: !loadError, error: loadError ? { code: 'KERNEL_LOAD_FAILED', message: loadError } : null, protocol: 'ofdm-ici-worker-v1', limits: { maxRunIdLength: 128, maxInputBytes: MAX_BYTES, maxInputNodes: MAX_NODES, maxInputDepth: MAX_DEPTH, maxRuns: MAX_RUNS } });
}());
