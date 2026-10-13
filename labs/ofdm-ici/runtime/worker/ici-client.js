/* Optional UMD client. Accepts a browser Worker or Node worker_threads.Worker. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ICIWorkerClient = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var instanceCounter = 0;
  function failure(code, message, runId, status) {
    var error = new Error(message); error.name = 'ICIWorkerError'; error.code = code; error.runId = runId || null; if (status !== undefined) error.status = status; return error;
  }
  class ICIWorkerClient {
    constructor(worker, options) {
      if (!worker || typeof worker.postMessage !== 'function') throw new TypeError('Pass an existing Worker');
      this.worker = worker; this.options = options || {}; this.pending = new Map(); this.usedIds = new Set();
      this.currentRunId = null; this.counter = 0; this.prefix = 'ici-' + (++instanceCounter) + '-' + Date.now().toString(36);
      this.disposed = false; this.failed = null; this.ready = null;
      this._message = (event) => this._receive(event.data);
      this._nodeMessage = (data) => this._receive(data);
      this._error = (event) => this._fail(failure('WORKER_TRANSPORT_ERROR', event.message || 'Worker transport failed'));
      this._exit = (code) => { if (!this.disposed) this._fail(failure('WORKER_EXITED', 'Worker exited with code ' + code)); };
      if (typeof worker.addEventListener === 'function') {
        worker.addEventListener('message', this._message); worker.addEventListener('error', this._error); worker.addEventListener('messageerror', this._error);
        this.browser = true;
      } else if (typeof worker.on === 'function') {
        worker.on('message', this._nodeMessage); worker.on('error', this._error); worker.on('messageerror', this._error); worker.on('exit', this._exit);
        this.browser = false;
      } else throw new TypeError('Worker must support addEventListener or on');
    }
    _notify(event) {
      if (typeof this.options.onEvent === 'function') {
        try { this.options.onEvent(event); } catch (_) { /* Observer exceptions do not corrupt lifecycle. */ }
      }
    }
    _receive(event) {
      if (this.disposed || !event || typeof event !== 'object') return;
      if (event.type === 'ready') {
        this.ready = event; this._notify(event);
        if (!event.ok) this._fail(failure('KERNEL_LOAD_FAILED', event.error && event.error.message || 'Kernel failed to load'));
        return;
      }
      if (event.type === 'reset') { this._notify(event); return; }
      var entry = this.pending.get(event.runId);
      if (!entry) return;
      var current = event.runId === this.currentRunId;
      if (event.type === 'progress') {
        if (current && !entry.cancelRequested) {
          if (typeof entry.onProgress === 'function') { try { entry.onProgress(event.progress); } catch (_) {} }
          this._notify(event);
        }
        return;
      }
      if (event.type === 'accepted') { if (current && !entry.cancelRequested) this._notify(event); return; }
      if (!['complete', 'cancelled', 'superseded', 'error'].includes(event.type)) return;
      // Defensive stale filtering is independent of the worker's own generation checks.
      if (event.type === 'complete' && entry.cancelRequested) event = { type: 'cancelled', runId: event.runId, reason: entry.cancelReason || 'requested', queuedResultSuppressed: true };
      if (event.type === 'complete' && !current) event = { type: 'superseded', runId: event.runId, reason: 'stale-result-suppressed' };
      this.pending.delete(event.runId);
      if (current) this.currentRunId = null;
      if (event.type === 'error') entry.reject(failure(event.error && event.error.code || 'WORKER_ERROR', event.error && event.error.message || 'Worker error', event.runId, event.error && event.error.status));
      else entry.resolve(event);
      if (current) this._notify(event);
    }
    _fail(error) {
      this.failed = error;
      for (var [runId, entry] of this.pending) entry.reject(failure(error.code, error.message, runId));
      this.pending.clear(); this.currentRunId = null;
    }
    run(input, options) {
      if (this.disposed) throw failure('CLIENT_DISPOSED', 'Client has been disposed');
      if (this.failed) throw this.failed;
      options = options || {};
      var runId = options.runId === undefined ? this.prefix + '-' + (++this.counter) : options.runId;
      if (typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(runId)) throw failure('INVALID_RUN_ID', 'Invalid runId');
      if (this.usedIds.has(runId)) throw failure('REUSED_RUN_ID', 'Use a fresh runId', runId);
      if (this.usedIds.size >= 10000) throw failure('SESSION_LIMIT', 'Create a new Worker/client after 10000 submitted runs');
      this.usedIds.add(runId);
      var resolve, reject, result = new Promise(function (ok, bad) { resolve = ok; reject = bad; });
      this.pending.set(runId, { resolve: resolve, reject: reject, onProgress: options.onProgress, cancelRequested: false });
      var previous = this.currentRunId;
      this.currentRunId = runId;
      try { this.worker.postMessage({ type: 'run', runId: runId, input: input }); }
      catch (error) { this.pending.delete(runId); this.currentRunId = previous; reject(failure('POST_MESSAGE_FAILED', error.message, runId)); }
      return { runId: runId, result: result, cancel: () => this.cancel(runId) };
    }
    cancel(runId) {
      runId = runId === undefined ? this.currentRunId : runId;
      if (this.disposed || !runId || !this.pending.has(runId)) return false;
      this.pending.get(runId).cancelRequested = true;
      this.pending.get(runId).cancelReason = 'requested';
      try { this.worker.postMessage({ type: 'cancel', runId: runId }); }
      catch (error) { this._fail(failure('POST_MESSAGE_FAILED', error.message, runId)); return false; }
      return true;
    }
    reset() {
      if (this.disposed) return;
      for (var entry of this.pending.values()) { entry.cancelRequested = true; entry.cancelReason = 'reset'; }
      this.currentRunId = null;
      try { this.worker.postMessage({ type: 'reset' }); }
      catch (error) { this._fail(failure('POST_MESSAGE_FAILED', error.message)); }
    }
    async dispose() {
      if (this.disposed) return;
      this.disposed = true;
      if (this.browser) {
        this.worker.removeEventListener('message', this._message); this.worker.removeEventListener('error', this._error); this.worker.removeEventListener('messageerror', this._error);
      } else {
        this.worker.off('message', this._nodeMessage); this.worker.off('error', this._error); this.worker.off('messageerror', this._error); this.worker.off('exit', this._exit);
      }
      try { if (typeof this.worker.terminate === 'function') await this.worker.terminate(); }
      finally {
        for (var [runId, entry] of this.pending) entry.resolve({ type: 'cancelled', runId: runId, reason: 'client-disposed' });
        this.pending.clear(); this.currentRunId = null;
      }
    }
  }
  return ICIWorkerClient;
}));
