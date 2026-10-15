import { evaluateCausalCapacity } from './causal-capacity-core.mjs';

/** Minimal state owner. Invalid input/reset supersedes any pending computation. */
export function createCausalCapacityRuntime() {
  if (arguments.length) throw new TypeError('The fixed-model runtime accepts no configuration or p/q overrides.');
  let revision = 0;
  let state = Object.freeze({ revision, phase: 'idle', requestedD: null, result: null, error: null });
  function update(phase, requestedD, result, error = null) {
    state = Object.freeze({ revision, phase, requestedD, result, error });
  }
  function start(D, argumentCount) {
    revision++;
    update('pending', null, null);
    try {
      if (argumentCount !== 1) throw new TypeError('Supply exactly one D.');
      // Validate before starting work, without coercion or computing the PMF twice.
      if (typeof D !== 'number' || !Number.isFinite(D)) throw new TypeError('D must be a finite number.');
      if (D < 0 || D > 0.5) throw new RangeError('D must be in [0,0.5].');
      update('pending', D, null);
    } catch (error) {
      update('invalid', null, null, error.message);
      throw error;
    }
    return revision;
  }
  function run(D) {
    start(D, arguments.length);
    try {
      const result = evaluateCausalCapacity(D);
      update('ready', D, result);
      return state;
    } catch (error) {
      update('error', D, null, error.message);
      throw error;
    }
  }
  async function runAsync(D) {
    const ticket = start(D, arguments.length);
    try {
      const result = await Promise.resolve().then(() => evaluateCausalCapacity(D));
      if (ticket !== revision) return Object.freeze({ committed: false, revision: ticket, reason: 'superseded', result: null });
      update('ready', D, result);
      return Object.freeze({ committed: true, revision: ticket, result });
    } catch (error) {
      if (ticket === revision) update('error', D, null, error.message);
      throw error;
    }
  }
  function reset() {
    revision++;
    update('idle', null, null);
    return state;
  }
  function exportCurrentJSON() {
    if (state.phase !== 'ready' || state.result === null) throw new Error('No current valid result to export.');
    return JSON.stringify({ runtimeRevision: revision, ...state.result }, null, 2) + '\n';
  }
  return Object.freeze({ run, runAsync, reset, getState: () => state, exportCurrentJSON });
}
