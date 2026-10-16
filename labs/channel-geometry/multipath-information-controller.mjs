/** UI lifecycle only. Scientific values are exclusively supplied by the core. */
export function createChannel(core, {workerFactory, prefix = 'mpi'} = {}) {
  let serial = 0, active = null;
  function cancel() {
    if (!active) return;
    active.abort.abort();
    active.worker?.terminate();
    active.resolve(null);
    active = null;
  }
  function run(type, payload, onProgress = () => {}) {
    cancel();
    const requestId = `${prefix}-${++serial}`;
    const abort = new AbortController();
    return new Promise((resolve, reject) => {
      const job = {requestId, abort, resolve, reject, worker: null};
      active = job;
      const current = () => active === job && !abort.signal.aborted;
      const finish = record => {
        if (!current()) return;
        job.worker?.terminate(); active = null; resolve(record);
      };
      const progress = p => {if (current()) onProgress(p);};
      const fallback = async () => {
        try {
          const options = {requestId, signal: abort.signal, onProgress: progress};
          const record = await (type === 'scene' ? core.computeSceneAsync(payload, options)
            : type === 'sweep' ? core.computeSweep(payload, options) : core.replayRecord(payload, options));
          finish(record);
        } catch (error) {if (current()) {active = null; reject(error);}}
      };
      if (!workerFactory) {fallback(); return;}
      try {
        job.worker = workerFactory();
        job.worker.onmessage = ({data}) => {
          if (!current() || data.requestId !== requestId) return;
          if (data.type === 'progress') progress(data.progress);
          else if (data.type === 'result') finish(data.record);
        };
        job.worker.onerror = () => {
          if (!current()) return;
          job.worker.terminate(); job.worker = null;
          fallback();
        };
        job.worker.postMessage({type, requestId, ...(type === 'replay' ? {record: payload} : {input: payload})});
      } catch {job.worker?.terminate(); job.worker = null; fallback();}
    });
  }
  return {run, cancel, dispose: cancel};
}

export const sweepKey = input => `${input.phaseRad}|${input.noiseMode}`;

/** Synchronous invalidation precedes every scientific request, including replay. */
export function createLessonController({core, workerFactory, onState = () => {}}) {
  const sceneChannel = createChannel(core, {workerFactory, prefix: 'mpi-scene'});
  const sweepChannel = createChannel(core, {workerFactory, prefix: 'mpi-sweep'});
  let generation = 0, sweepGeneration = 0, disposed = false;
  let state = {input: {...core.DEFAULT_INPUT}, status: 'idle', current: null, sweep: null,
    sweepKey: null, sweepStatus: 'idle', progress: [], error: null, generation: 0};
  const publish = () => {if (!disposed) onState({...state});};
  function invalidate(input, status = 'pending', clearSweep = false) {
    sceneChannel.cancel();
    generation++;
    const key = sweepKey(input);
    if (clearSweep || state.sweepKey !== key) {
      sweepChannel.cancel(); sweepGeneration++;
      state = {...state, sweep: null, sweepKey: key, sweepStatus: 'idle', progress: []};
    }
    state = {...state, input: {...input}, status, current: null, error: null, generation};
    publish();
    return generation;
  }
  async function ensureSweep(input, token) {
    const key = sweepKey(input);
    if (disposed || token !== generation || state.sweepKey !== key || ['pending', 'complete'].includes(state.sweepStatus)) return;
    const sweepToken = ++sweepGeneration;
    state = {...state, sweepStatus: 'pending', progress: []}; publish();
    try {
      const result = await sweepChannel.run('sweep', input, p => {
        if (disposed || sweepToken !== sweepGeneration || key !== state.sweepKey) return;
        if (!p.record) return;
        const progress = state.progress.slice(); progress[p.index] = p.record;
        state = {...state, progress}; publish();
      });
      if (!result || disposed || sweepToken !== sweepGeneration || key !== state.sweepKey) return;
      state = {...state, sweep: result, sweepStatus: result.status, progress: result.records}; publish();
    } catch (error) {
      if (sweepToken !== sweepGeneration || disposed) return;
      state = {...state, sweepStatus: 'error', error: String(error.message || error)}; publish();
    }
  }
  async function select(input = core.DEFAULT_INPUT) {
    const token = invalidate(input);
    try {
      const result = await sceneChannel.run('scene', input);
      if (!result || disposed || token !== generation) return null;
      state = {...state, current: result, status: result.status}; publish();
      if (result.validatedDomain && result.status !== 'cancelled') ensureSweep(input, token);
      return result;
    } catch (error) {
      if (token !== generation || disposed) return null;
      state = {...state, status: 'error', error: String(error.message || error)}; publish(); return null;
    }
  }
  async function replay(json) {
    const token = invalidate(state.input, 'pending', true);
    try {
      const record = await sceneChannel.run('replay', json, p => {
        if (disposed || token !== generation || !p.record) return;
        // Replay inputs are not trusted until core validation/recomputation finishes.
        // Keep imported points nondrawable while visible controls own the old input.
        state = {...state, progress: [], sweepStatus: 'replaying'}; publish();
      });
      if (!record || disposed || token !== generation) return null;
      if (record.status === 'invalid-input') {
        state = {...state, status: 'invalid-input', current: record, sweep: null, sweepStatus: 'idle'}; publish(); return record;
      }
      if (record.schemaVersion.endsWith('sweep.v1')) {
        state = {...state, input: {...record.input}, sweep: record, sweepKey: sweepKey(record.input), sweepStatus: record.status,
          progress: record.records, current: record.records.find(r => r.input.heightM === record.input.heightM), status: 'finite'};
        state.status = state.current.status;
      } else {
        state = {...state, input: {...record.input}, current: record, status: record.status, sweepKey: sweepKey(record.input)};
      }
      publish(); ensureSweep(state.input, token); return record;
    } catch (error) {
      if (token !== generation || disposed) return null;
      state = {...state, status: 'error', error: String(error.message || error)}; publish(); return null;
    }
  }
  function cancel() {
    sceneChannel.cancel(); sweepChannel.cancel(); generation++; sweepGeneration++;
    state = {...state, status: 'cancelled', current: null, sweep: null, sweepStatus: 'cancelled', progress: [], generation}; publish();
  }
  return {select, replay, cancel, getState: () => ({...state}), dispose: () => {disposed = true; sceneChannel.dispose(); sweepChannel.dispose();}};
}
