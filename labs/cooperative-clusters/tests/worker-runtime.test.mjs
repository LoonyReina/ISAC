import { isMainThread, parentPort, Worker } from 'node:worker_threads';

if (!isMainThread) {
  // Browser-shaped adapter only: run the production module and its production event handler.
  globalThis.self = {
    postMessage: message => parentPort.postMessage(message),
    addEventListener: (type, listener) => { if (type === 'message') parentPort.on('message', data => listener({ data })); },
  };
  await import('../labs/cooperative-clusters/cooperative-fim-worker.mjs');
} else {
  const { default: test } = await import('node:test');
  const { default: assert } = await import('node:assert/strict');
  const { readFile } = await import('node:fs/promises');
  const { createLessonController } = await import('../labs/cooperative-clusters/cooperative-fim-controller.mjs');
  const fixture = JSON.parse(await readFile(new URL('../assets/data/cooperative-fim-retained-coordinates.json', import.meta.url)));
  class ModuleWorkerAdapter {
    mappings = new Map();
    worker = new Worker(new URL(import.meta.url), { type: 'module' });
    addEventListener(type, listener) {
      const adapter = type === 'message' ? data => listener({ data }) : error => listener(error);
      this.mappings.set(listener, adapter); this.worker.on(type, adapter);
    }
    removeEventListener(type, listener) {
      const adapter = this.mappings.get(listener);
      if (adapter) this.worker.off(type, adapter);
      this.mappings.delete(listener);
    }
    postMessage(message) { this.worker.postMessage(message); }
    terminate() { void this.worker.terminate(); }
  }
  test('actual module Worker completes 512 accepted-core attempts with paired summary', { timeout: 10000 }, async () => {
    const seen = [];
    const controller = createLessonController({ fixture, initialState: { preset: 'network', view: 'average', trials: 256 },
      workerFactory: () => new ModuleWorkerAdapter(), onChange: snapshot => seen.push(snapshot) });
    try {
      await controller.run();
      const snapshot = controller.getSnapshot();
      assert.equal(snapshot.phase, 'ready');
      assert.equal(snapshot.result.batch.records.length, 512);
      assert.equal(snapshot.result.statistics.finitePairs, 256);
      assert.ok(Math.abs(snapshot.result.statistics.pairedMeanDelta + 0.044046379427134685) < 1e-15);
      assert.ok(seen.some(value => value.phase === 'running' && value.progress.attempted > 0));
      assert.equal(snapshot.result.sides[0].summary.status_counts.finite, 256);
    } finally { controller.destroy(); }
  });
  test('actual module Worker cancels cooperatively and keeps incomplete all-attempt data', { timeout: 10000 }, async () => {
    let controller, cancelled = false;
    controller = createLessonController({ fixture, initialState: { preset: 'network', view: 'average', trials: 256 },
      workerFactory: () => new ModuleWorkerAdapter(), onChange: snapshot => {
        if (!cancelled && snapshot.phase === 'running' && snapshot.progress.attempted >= 8) {
          cancelled = true; controller.cancel();
        }
      } });
    try {
      await controller.run();
      const snapshot = controller.getSnapshot();
      assert.equal(snapshot.phase, 'cancelled');
      assert.ok(snapshot.progress.attempted >= 8);
      assert.ok(snapshot.progress.attempted <= 512);
      assert.equal(snapshot.result.batch.complete, false);
      assert.equal(snapshot.result.sides[0].summary.mean_trace_inverse, null);
      assert.equal(snapshot.result.statistics.pairedMeanDelta, null);
      assert.equal(snapshot.result.statistics.descriptivePairedSE, null);
    } finally { controller.destroy(); }
  });
}
