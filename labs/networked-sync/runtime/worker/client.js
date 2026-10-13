/* UMD browser/Node client adapted from first-party 80211ad-browser-prototype
 * worker/client.js. Accepted-only supersession and stale result fencing retained;
 * request operations revised for fresh reciprocal networked ISAC runs/records. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NetworkedSyncWorkerClient = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var instances = 0;
  function error(code, message, id) {
    var e = new Error(message); e.name = 'NetworkedSyncWorkerError'; e.code = code; e.id = id || null; return e;
  }
  function validId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id); }
  function optionKeys(value, allowed) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw error('INVALID_OPTIONS', 'Client options must be an object');
    if (Reflect.ownKeys(value).some(k => !allowed.includes(k))) throw error('INVALID_OPTIONS', 'Unknown client option');
  }
  class NetworkedSyncWorkerClient {
    constructor(worker, options) {
      this.options = options || {}; optionKeys(this.options, ['onEvent', 'createWorker']);
      if (this.options.onEvent !== undefined && typeof this.options.onEvent !== 'function') throw error('INVALID_OPTIONS', 'onEvent must be a function');
      if (this.options.createWorker !== undefined && typeof this.options.createWorker !== 'function') throw error('INVALID_OPTIONS', 'createWorker must be a function');
      this.pending = new Map(); this.usedIds = new Set(); this.currentId = null;
      this.counter = 0; this.sequence = 0; this.disposed = false; this.failed = null; this.generation = 0; this.lifecycleEpoch = 0;
      this._attach(worker);
    }
    _attach(worker) {
      if (!worker || typeof worker.postMessage !== 'function') throw new TypeError('Pass an existing browser or Node Worker');
      if (typeof worker.addEventListener !== 'function' && typeof worker.on !== 'function') throw new TypeError('Worker must support addEventListener or on');
      this.worker = worker; this.prefix = 'ns-' + (++instances) + '-' + Date.now().toString(36);
      this.readyEvent = null; this.ready = new Promise(resolve => { this._readyResolve = resolve; });
      var generation = ++this.generation;
      this._message = e => { if (this.generation === generation) this._receive(e.data); };
      this._nodeMessage = e => { if (this.generation === generation) this._receive(e); };
      this._error = e => { if (this.generation === generation) this._fail(error('WORKER_TRANSPORT_ERROR', e && e.message || 'Worker transport failed')); };
      this._exit = code => { if (this.generation === generation && !this.disposed) this._fail(error('WORKER_EXITED', 'Worker exited with code ' + code)); };
      this.browser = typeof worker.addEventListener === 'function';
      if (this.browser) {
        worker.addEventListener('message', this._message); worker.addEventListener('error', this._error); worker.addEventListener('messageerror', this._error);
      } else {
        worker.on('message', this._nodeMessage); worker.on('error', this._error); worker.on('messageerror', this._error); worker.on('exit', this._exit);
      }
    }
    _detach() {
      var worker = this.worker;
      if (this.browser) {
        worker.removeEventListener('message', this._message); worker.removeEventListener('error', this._error); worker.removeEventListener('messageerror', this._error);
      } else {
        var off = typeof worker.off === 'function' ? worker.off.bind(worker) : worker.removeListener.bind(worker);
        off('message', this._nodeMessage); off('error', this._error); off('messageerror', this._error); off('exit', this._exit);
      }
      ++this.generation;
    }
    _notify(e) { if (this.options.onEvent) { try { this.options.onEvent(e); } catch (_) { /* Observers cannot break lifecycle. */ } } }
    _accepted(entry) {
      if (entry.accepted || !entry.compute) return;
      entry.accepted = true;
      for (var [id, older] of this.pending) if (older.compute && older.sequence < entry.sequence) {
        older.superseded = true;
        if (older.deferred) this._receive({ type: 'superseded', id: id, operation: older.type, reason: 'newer-request-accepted' });
      }
    }
    _restoreCurrent() {
      var newest = null, newestId = null;
      for (var [id, entry] of this.pending) if (entry.compute && !entry.superseded && !entry.cancelReason && (!newest || entry.sequence > newest.sequence)) {
        newest = entry; newestId = id;
      }
      this.currentId = newestId;
      if (newest && newest.deferred) { var event = newest.deferred; newest.deferred = null; this._receive(event); }
    }
    _receive(e) {
      if (this.disposed || this.failed || !e || typeof e !== 'object') return;
      if (e.type === 'ready') {
        this.readyEvent = e; this._readyResolve(e); this._notify(e);
        if (!e.ok) this._fail(error('KERNEL_LOAD_FAILED', e.error && e.error.message || 'Kernel failed to load'));
        return;
      }
      var entry = this.pending.get(e.id);
      if (!entry) return;
      // A duplicate raw transport request can reuse an accepted id. Its rejection
      // must not settle the original accepted request sharing that id.
      if (e.type === 'error' && e.rejected && entry.accepted) return;
      var current = !entry.compute || e.id === this.currentId;
      if (e.type === 'accepted' || e.type === 'progress') {
        this._accepted(entry);
        if (current && !entry.cancelReason) {
          if (e.type === 'progress' && entry.onProgress) { try { entry.onProgress(e.progress); } catch (_) {} }
          this._notify(e);
        }
        return;
      }
      if (!['complete', 'cancelled', 'superseded', 'error'].includes(e.type)) return;
      if (e.type === 'complete' && entry.compute) this._accepted(entry);
      if (e.type === 'complete' && entry.compute && entry.cancelReason)
        e = { type: 'cancelled', id: e.id, operation: entry.type, reason: entry.cancelReason, queuedResultSuppressed: true };
      else if (e.type === 'complete' && entry.compute && entry.superseded)
        e = { type: 'superseded', id: e.id, operation: entry.type, reason: 'stale-result-suppressed' };
      else if (e.type === 'complete' && entry.compute && !current) {
        // A newer submission is not yet proof of valid supersession. Hold this
        // queued completion until that request is accepted or rejected.
        entry.deferred = e; return;
      }
      this.pending.delete(e.id);
      if (entry.compute && current) this.currentId = null;
      if (e.type === 'error') entry.reject(error(e.error && e.error.code || 'WORKER_ERROR', e.error && e.error.message || 'Worker error', e.id));
      else entry.resolve(e);
      if (current && !entry.silent) this._notify(e);
      if (current && entry.compute && e.type === 'error' && e.rejected && !entry.accepted) this._restoreCurrent();
    }
    _fail(e) {
      this.failed = e;
      this._readyResolve({ type: 'ready', ok: false, error: { code: e.code, message: e.message } });
      for (var [id, entry] of this.pending) entry.reject(error(e.code, e.message, id));
      this.pending.clear(); this.currentId = null;
    }
    _submit(type, body, options, silent) {
      if (this.disposed) throw error('CLIENT_DISPOSED', 'Client has been disposed');
      if (this.failed) throw this.failed;
      options = options || {}; optionKeys(options, ['id', 'onProgress']);
      if (options.onProgress !== undefined && typeof options.onProgress !== 'function') throw error('INVALID_OPTIONS', 'onProgress must be a function');
      var id = options.id === undefined ? this.prefix + '-' + (++this.counter) : options.id;
      if (!validId(id)) throw error('INVALID_ID', 'Invalid request id');
      if (this.usedIds.has(id)) throw error('REUSED_ID', 'Use a fresh id for every request', id);
      if (this.usedIds.size >= 10000) throw error('SESSION_LIMIT', 'Restart the Worker/client after 10,000 submitted requests');
      var compute = !['cancel', 'release'].includes(type);
      var resolve, reject, result = new Promise((ok, bad) => { resolve = ok; reject = bad; });
      var entry = { type: type, compute: compute, sequence: ++this.sequence, accepted: false, superseded: false, deferred: null,
        resolve: resolve, reject: reject, onProgress: options.onProgress, cancelReason: null, silent: !!silent };
      this.usedIds.add(id); this.pending.set(id, entry);
      var previous = this.currentId;
      if (compute) this.currentId = id;
      try { this.worker.postMessage(Object.assign({ type: type, id: id }, body)); }
      catch (e) { this.pending.delete(id); this.currentId = previous; reject(error('POST_MESSAGE_FAILED', e.message, id)); }
      return { id: id, result: result, cancel: () => this.cancel(id) };
    }
    run(request, options) { return this._submit('run', { request: request }, options); }
    process(observationId, config, options) { return this._submit('process', { observationId: observationId, config: config === undefined ? {} : config }, options); }
    importRecord(record, options) { return this._submit('import', { record: record }, options); }
    exportRecord(observationId, mode, options) { return this._submit('export', { observationId: observationId, mode: mode === undefined ? 'raw' : mode }, options); }
    cancel(id) {
      id = id === undefined ? this.currentId : id;
      if (this.disposed || !id || !this.pending.has(id) || !this.pending.get(id).compute) return false;
      this.pending.get(id).cancelReason = 'requested';
      if (this.pending.get(id).deferred) this._receive({ type: 'cancelled', id: id, reason: 'requested' });
      try {
        var action = this._submit('cancel', { targetId: id }, {}, true), generation = this.generation;
        action.result.catch(e => { if (!this.disposed && this.generation === generation) this._fail(e); });
        return true;
      } catch (e) { this._fail(e); return false; }
    }
    release(options) {
      var action = this._submit('release', {}, options);
      for (var [id, entry] of this.pending) if (entry.compute) {
        entry.cancelReason = 'released';
        if (entry.deferred) this._receive({ type: 'cancelled', id: id, operation: entry.type, reason: 'released' });
      }
      this.currentId = null;
      return action;
    }
    async dispose(reason) {
      // Even an already-disposed client may have an asynchronous factory pending.
      // Every explicit lifecycle action invalidates all older restart continuations.
      ++this.lifecycleEpoch;
      if (this.disposed) return;
      this.disposed = true; this._detach();
      this._readyResolve({ type: 'ready', ok: false, error: { code: 'CLIENT_DISPOSED', message: 'Client disposed before readiness' } });
      for (var [id, entry] of this.pending) entry.resolve({ type: 'cancelled', id: id, operation: entry.type, reason: reason || 'client-disposed' });
      this.pending.clear(); this.currentId = null;
      if (typeof this.worker.terminate === 'function') await this.worker.terminate();
    }
    async restart(worker) {
      if (worker === undefined && !this.options.createWorker) throw error('WORKER_REQUIRED', 'Pass a new Worker or configure createWorker');
      if (worker !== undefined && worker === this.worker) throw error('WORKER_REQUIRED', 'Restart requires a distinct new Worker');
      var closing = this.dispose('client-restarted'), epoch = this.lifecycleEpoch;
      // Attach an already-created replacement synchronously before awaiting the
      // old Worker's termination, so its initial ready event is not lost.
      var next;
      if (worker !== undefined) next = worker;
      else {
        await closing;
        if (epoch !== this.lifecycleEpoch) return this;
        try { next = await this.options.createWorker(); }
        catch (e) { if (epoch !== this.lifecycleEpoch) return this; throw e; }
        if (epoch !== this.lifecycleEpoch) {
          // A stale factory owns its unused transport, but must never terminate
          // a transport that a newer lifecycle action has already installed.
          if (next && next !== this.worker && typeof next.terminate === 'function') await next.terminate();
          return this;
        }
      }
      if (next === this.worker) throw error('WORKER_REQUIRED', 'Restart requires a distinct new Worker');
      this.usedIds.clear(); this.counter = 0; this.failed = null;
      // Attach validation can fail; the old client remains safely disposed.
      this._attach(next); this.disposed = false;
      await closing;
      return this;
    }
  }
  return NetworkedSyncWorkerClient;
}));
