import { createCausalCapacityRuntime } from './causal-capacity-runtime.mjs';

export const DEFAULT_D = 0.2;

/** The accepted runtime is the only owner of current scientific results. */
export function createLessonController({ onState = () => {} } = {}) {
  const runtime = createCausalCapacityRuntime();
  let disposed = false;
  const publish = () => { if (!disposed) onState(runtime.getState()); };
  async function change(D) {
    if (disposed) return { committed: false, reason: 'disposed', result: null };
    const pending = runtime.runAsync(D);
    publish(); // start() has synchronously cleared the previous result, including invalid edits
    try {
      const outcome = await pending;
      if (outcome.committed) publish();
      return outcome;
    } catch (error) {
      // Validation already published invalid; only the still-current runtime can be rendered.
      publish();
      return { committed: false, reason: runtime.getState().phase, result: null, error: error.message };
    }
  }
  function reset() { runtime.reset(); publish(); return runtime.getState(); }
  function dispose() { disposed = true; runtime.reset(); }
  return Object.freeze({ change, reset, dispose, getState: runtime.getState,
    exportCurrentJSON: runtime.exportCurrentJSON });
}
