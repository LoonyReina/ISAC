'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Usable both in authoritative layout and the compatibility build's staged layout.
const root = path.resolve(__dirname, '..');
const source = fs.existsSync(path.join(root, 'labs/resolution/resolution.js')) ? path.join(root, 'labs/resolution/resolution.js') : path.join(root, 'resolution.js');
const model = require(source);
const close = (actual, expected, tolerance = 2e-12) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
function finiteResponse(deltaRange) {
  const theta = 4 * Math.PI * model.DF * deltaRange / model.C;
  const den = Math.sin(theta / 2);
  if (Math.abs(den) < 1e-14) return { re: 1, im: 0 };
  const envelope = Math.sin(64 * theta / 2) / (64 * den);
  return { re: envelope * Math.cos(63 * theta / 2), im: envelope * Math.sin(63 * theta / 2) };
}
test('complex two-target sum agrees with independent finite geometric response', () => {
  for (const p of [{ separation: 4, phaseDeg: 0, strengthDb: 0 }, { separation: 0.25, phaseDeg: 135, strengthDb: -17 }, { separation: 16, phaseDeg: 270, strengthDb: -30 }]) {
    const observation = model.observe(p);
    for (const padding of [1, 4, 8]) for (const point of model.process(observation, padding).grid) {
      const a = finiteResponse(point.range - 10), b = finiteResponse(point.range - 10 - p.separation);
      const phi = p.phaseDeg * Math.PI / 180, amp = 10 ** (p.strengthDb / 20);
      const re = a.re + amp * (b.re * Math.cos(phi) - b.im * Math.sin(phi));
      const im = a.im + amp * (b.re * Math.sin(phi) + b.im * Math.cos(phi));
      close(point.re, re); close(point.im, im); close(point.power, re * re + im * im);
    }
  }
});
test('equal-strength same-distance opposite-phase targets cancel, not two independent powers', () => {
  const observation = model.observe({ separation: 0, phaseDeg: 180 });
  assert.ok(observation.channel.every(z => Math.hypot(z.re, z.im) < 1e-14));
  for (const padding of [1, 4, 8]) {
    const result = model.process(observation, padding);
    assert.equal(result.maximum, null);
    assert.ok(result.grid.every(z => z.power < 1e-27));
  }
  const constructive = model.process(model.observe({ separation: 0, phaseDeg: 0 }), 8);
  const independent = finiteResponse(constructive.maximum.range - 10);
  close(constructive.maximum.power, 4 * (independent.re ** 2 + independent.im ** 2));
});
test('padding preserves original noisy observation and coincident grid complex values', () => {
  const observation = model.observe({ noiseRms: 0.6, phaseDeg: 75 });
  const before = JSON.stringify(observation), base = model.process(observation, 1);
  for (const padding of [4, 8]) {
    const fine = model.process(observation, padding);
    assert.deepEqual(fine.samples, base.samples);
    base.grid.forEach((point, k) => { close(point.re, fine.grid[k * padding].re); close(point.im, fine.grid[k * padding].im); });
    close(fine.grid[1].range, 1.5 / padding);
  }
  assert.equal(JSON.stringify(observation), before);
  assert.equal(observation.received.length, 64);
});
test('wrong known-data removal changes processing only and fails default recovery', () => {
  const observation = model.observe(), before = JSON.stringify(observation);
  const right = model.process(observation, 8), wrong = model.process(observation, 8, true);
  right.samples.forEach((z, k) => { close(z.re, observation.channel[k].re); close(z.im, observation.channel[k].im); });
  wrong.samples.forEach((z, k) => {
    const y = observation.received[k], s = observation.symbols[(k + 1) % 64];
    close(z.re, y.re * s.re + y.im * s.im); close(z.im, y.im * s.re - y.re * s.im);
  });
  assert.notDeepEqual(wrong.samples, right.samples);
  assert.ok(Math.min(Math.abs(wrong.maximum.range - 10), Math.abs(wrong.maximum.range - 14)) > 1.5);
  assert.equal(JSON.stringify(observation), before);
});
test('seeded complex noise is repeatable, strength is an amplitude conversion, invalid input rejected', () => {
  const a = model.observe({ noiseRms: 1 }), b = model.observe({ noiseRms: 1 });
  assert.deepEqual(a.received, b.received);
  assert.notDeepEqual(a.received, model.observe({ noiseRms: 1, seed: 12 }).received);
  close(model.observe({ separation: 0, strengthDb: -20 }).channel[0].re, 1.1);
  assert.throws(() => model.observe({ noiseRms: NaN }), RangeError);
  assert.throws(() => model.process(a, 2), RangeError);
});
test('browser wiring keeps original controls and exercise controls usable with textual results', () => {
  const nodes = new Map();
  const values = { bw: '100', tm: '20', 'tt-separation': '4', 'tt-phase': '0', 'tt-strength': '0', 'tt-noise': '0', 'tt-padding': '1' };
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { value: values[id] || '', checked: false, textContent: '', listeners: {}, attrs: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, setAttribute(k, v) { this.attrs[k] = v; } });
    return nodes.get(id);
  }};
  vm.runInNewContext(fs.readFileSync(source, 'utf8'), { document });
  assert.equal(nodes.get('dr').textContent, '1.50 m');
  assert.match(nodes.get('tt-result').textContent, /64 格/);
  nodes.get('tt-cancel').listeners.click();
  assert.match(nodes.get('tt-result').textContent, /不能报告距离候选/);
  nodes.get('tt-padding').value = '8'; nodes.get('tt-padding').listeners.change();
  assert.match(nodes.get('tt-result').textContent, /不能报告距离候选/);
  nodes.get('tt-reset').listeners.click();
  assert.match(nodes.get('tt-truth').textContent, /14.00/);
  nodes.get('tt-wrong').checked = true; nodes.get('tt-wrong').listeners.change();
  assert.match(nodes.get('tt-warning').textContent, /原始接收数组不变/);
});
