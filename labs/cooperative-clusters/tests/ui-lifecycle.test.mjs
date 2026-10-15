import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { createBatchRequest } from '../labs/cooperative-clusters/cooperative-fim-model.mjs';
import { runFixtureBatch } from '../labs/cooperative-clusters/cooperative-fim-core.mjs';

// A minimal DOM/event harness for the real UI module, not a browser or visual test.
// In particular, setting textContent must replace old innerHTML, as in a browser.
class Element {
  dataset = {}; events = {}; disabled = false; hidden = false; value = ''; _html = ''; _text = '';
  classList = { toggle() {} };
  get innerHTML() { return this._html; }
  set innerHTML(value) { this._html = String(value); this._text = String(value).replace(/<[^>]*>/g, ''); }
  get textContent() { return this._text; }
  set textContent(value) { this._text = String(value); this._html = String(value); }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(type, callback) { this.events[type] = callback; }
  click() { if (!this.disabled) this.events.click?.(); }
  change(value) { this.value = value; this.events.change?.({ target: this }); }
}

test('real UI clears completed evidence after a blocked cancellation or Worker failure, then recovers', async () => {
  const globals = ['document', 'location', 'history', 'addEventListener', 'requestAnimationFrame', 'fetch', 'Worker', 'crypto'];
  const previous = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const setGlobal = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const elements = new Map(), events = new Map(), workers = [];
  const element = id => elements.get(id) || elements.set(id, new Element()).get(id);
  const presets = ['symmetric', 'collinear', 'network'].map(preset => Object.assign(new Element(), { dataset: { preset } }));
  const controls = ['symmetric', 'collinear', 'network'].map(control => Object.assign(new Element(), { dataset: { control } }));
  const currentWorker = () => workers.at(-1);
  class WorkerStub {
    events = new Map(); request = null; terminated = false;
    constructor() { workers.push(this); }
    addEventListener(type, callback) { this.events.set(type, callback); }
    removeEventListener(type, callback) { if (this.events.get(type) === callback) this.events.delete(type); }
    postMessage(message) { if (message.type === 'run') this.request = message; }
    terminate() { this.terminated = true; }
    progress(attempted) {
      const { request_id, state } = this.request;
      this.events.get('message')?.({ data: { type: 'progress', request_id,
        progress: { request_id, attempted, requested_attempts: state.trials * 2, complete: false } } });
    }
    async finish() {
      const { state, fixture, request_id } = this.request;
      const batch = await runFixtureBatch(createBatchRequest(state, fixture, request_id), { yield_control: async () => {} });
      this.events.get('message')?.({ data: { type: 'result', request_id, batch } });
    }
    fail() { this.events.get('error')?.({ message: 'Injected Worker failure' }); }
  }
  try {
    setGlobal('document', { getElementById: element, documentElement: new Element(), createElement: () => new Element(),
      querySelectorAll: selector => selector === '[data-preset]' ? presets : selector === '[data-control]' ? controls : [] });
    setGlobal('location', { href: 'https://example.invalid/ISAC/cooperative-clusters.html', search: '' });
    setGlobal('history', { pushState() {}, replaceState() {} });
    setGlobal('addEventListener', (type, callback) => events.set(type, callback));
    setGlobal('requestAnimationFrame', callback => callback());
    setGlobal('crypto', webcrypto);
    setGlobal('Worker', WorkerStub);
    // Serve exact accepted bytes. Public URL/subpath routing is tested separately.
    setGlobal('fetch', async url => {
      const path = url.pathname.endsWith('cooperative-fim-retained-coordinates.json')
        ? '../assets/data/cooperative-fim-retained-coordinates.json' : '../labs/cooperative-clusters/cooperative-fim-core.mjs';
      const bytes = await readFile(new URL(path, import.meta.url));
      return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    });
    await import('../labs/cooperative-clusters/cooperative-fim-ui.mjs?ui-lifecycle-test');
    assert.equal(element('cf-run-status').dataset.phase, 'ready');
    presets[2].click(); element('cf-view').change('average'); element('cf-run').click();
    await currentWorker().finish();
    assert.match(element('cf-numerical-detail').innerHTML, /finite: 256/);
    assert.match(element('cf-numerical-detail').innerHTML, /-0\.04404637943/);
    assert.equal(element('cf-download').disabled, false);

    element('cf-trials').change('64'); element('cf-run').click();
    const blocked = currentWorker(); blocked.progress(8); element('cf-cancel').click();
    assert.equal(element('cf-run-status').dataset.phase, 'cancelling');
    // Exercise the actual production cancellation timeout, with no Worker reply.
    await new Promise(resolve => setTimeout(resolve, 2100));
    assert.equal(element('cf-run-status').dataset.phase, 'cancelled');
    assert.match(element('cf-run-status').textContent, /8 \/ 128/);
    assert.equal(blocked.terminated, true);
    assert.equal(element('cf-download').disabled, true);
    assert.equal(element('cf-geometry').innerHTML, '');
    assert.doesNotMatch(element('cf-bound').innerHTML, /data-mean=/);
    assert.doesNotMatch(element('cf-numerical-detail').innerHTML, /finite: 256|-0\.04404637943|完成：是/);
    assert.match(element('cf-numerical-detail').textContent, /没有可下载/);
    assert.match(element('cf-provenance').textContent, /取消/);
    assert.equal(element('cf-sample-warning').hidden, true);
    assert.equal(element('cf-population-note').hidden, true);

    element('cf-run').click(); await currentWorker().finish();
    assert.equal(element('cf-run-status').dataset.phase, 'ready');
    assert.match(element('cf-numerical-detail').innerHTML, /finite: 64/);
    element('cf-run').click(); currentWorker().fail();
    assert.equal(element('cf-run-status').dataset.phase, 'error');
    assert.doesNotMatch(element('cf-numerical-detail').innerHTML, /finite: 64|完成：是/);
    assert.equal(element('cf-bound').innerHTML, '');
    assert.equal(element('cf-download').disabled, true);
    assert.match(element('cf-provenance').textContent, /未获得/);
    element('cf-run').click(); await currentWorker().finish();
    assert.equal(element('cf-run-status').dataset.phase, 'ready');
    assert.match(element('cf-numerical-detail').innerHTML, /finite: 64/);
  } finally {
    events.get('pagehide')?.({ persisted: false });
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
