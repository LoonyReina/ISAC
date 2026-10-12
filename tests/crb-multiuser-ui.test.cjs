'use strict';
// Real frozen Worker/core messages run through the actual adapter and controller.
// Controlled DOM/SVG geometry checks do not certify browser fonts, layout or latency.
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const loc = (flat, source) => path.join(root, fs.existsSync(path.join(root, flat)) ? flat : source);
const read = (flat, source) => fs.readFileSync(loc(flat, source), 'utf8');
const script = read('crb-multiuser.js', 'labs/crb-beamforming/crb-multiuser.js');
const modelCode = read('crb-multiuser-model.js', 'labs/crb-beamforming/crb-multiuser-model.js');
const dataCode = read('crb-multiuser-data.js', 'labs/crb-beamforming/crb-multiuser-data.js');
const D = require(loc('crb-multiuser-data.js', 'labs/crb-beamforming/crb-multiuser-data.js'));
const M = require(loc('crb-multiuser-model.js', 'labs/crb-beamforming/crb-multiuser-model.js'));
const core = require(loc('crb-multiuser/core.js', 'labs/crb-beamforming/multiuser/core.js'));
const workerCode = Object.fromEntries(['worker.js', 'core.js', 'hermitian.js', 'linalg.js'].map(name => [name, read('crb-multiuser/' + name, 'labs/crb-beamforming/multiuser/' + name)]));
const copy = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
const staticIds = [...new Set([...script.matchAll(/['"](cm-[a-z]+(?:-[a-z]+)*)['"]/g)].map(match => match[1]))];
function setup({missingWorker = false, missingModel = false, missingData = false, missingMount = false, workerThrows = false, importThrows = false, postThrows = false, width = 540} = {}) {
  const els = {}, workers = [], events = {}, timers = new Map(), blobs = [], downloads = [], revoked = [];
  let timerSerial = 0, time = 0, env;
  class Element {
    constructor(tag = '') {this.tag = tag; this.children = []; this.value = ''; this.disabled = false; this.hidden = false; this.events = {}; this.attrs = {}; this.textContent = ''; this.clientWidth = width;}
    set id(value) {this._id = value; els[value] = this;} get id() {return this._id;}
    setAttribute(key, value) {this.attrs[key] = String(value);} getAttribute(key) {return this.attrs[key];}
    append(...children) {this.children.push(...children);} replaceChildren(...children) {this.children = children;}
    addEventListener(name, fn) {(this.events[name] ||= []).push(fn);}
    fire(name) {return Promise.all((this.events[name] || []).map(fn => fn({target: this})));}
  }
  for (const id of ['multiuser', ...staticIds]) {const el = new Element(); el.id = id;}
  if (missingMount) delete els.multiuser;
  const document = {getElementById: id => els[id] || null, createElement: tag => {const el = new Element(tag); if (tag === 'a') el.click = () => downloads.push({href: el.href, name: el.download}); return el;}, createElementNS: (_ns, tag) => new Element(tag)};
  env = {document, TextEncoder, performance: {now: () => ++time},
    setTimeout: (fn, delay) => {const id = ++timerSerial; timers.set(id, {fn, delay}); return id;}, clearTimeout: id => timers.delete(id),
    addEventListener: (name, fn) => (events[name] ||= []).push(fn),
    Blob: class {constructor(parts) {this.parts = parts; blobs.push(this);}},
    URL: {createObjectURL: () => 'blob:node-ui-' + blobs.length, revokeObjectURL: value => revoked.push(value)}
  };
  env.window = env; vm.createContext(env);
  class Worker {
    constructor(url) {
      if (workerThrows) throw Error('Controlled Worker construction failure');
      assert.equal(url, 'crb-multiuser/worker.js'); this.url = url; this.tasks = []; this.requests = []; this.messages = []; this.terminated = false; workers.push(this);
      const worker = this;
      this.context = vm.createContext({performance, setTimeout: fn => {worker.tasks.push(fn); return worker.tasks.length;},
        postMessage: value => {const msg = structuredClone(value); worker.messages.push(msg); worker.deliver(msg);},
        importScripts: (...names) => {if (importThrows) throw Error('Controlled importScripts failure'); for (const name of names) {assert.ok(workerCode[name], name); vm.runInContext(workerCode[name], worker.context, {filename: name});}}
      });
      vm.runInContext('self=globalThis;', this.context);
      try {vm.runInContext(workerCode['worker.js'], this.context, {filename: 'worker.js'});} catch (error) {this.loadFailed = true; this.tasks.push(() => this.onerror?.({message: error.message}));}
    }
    postMessage(msg) {if (postThrows) throw Error('Controlled postMessage failure'); this.requests.push(structuredClone(msg)); if (!this.loadFailed) this.tasks.push(() => {this.context.__wire = JSON.stringify(msg); vm.runInContext('onmessage({data:JSON.parse(__wire)})', this.context);});}
    deliver(msg) {env.__wire = JSON.stringify(msg); const data = vm.runInContext('JSON.parse(__wire)', env); this.onmessage?.({data});}
    terminate() {this.terminated = true; this.tasks = [];}
    step() {if (!this.terminated && this.tasks.length) this.tasks.shift()();}
  }
  if (!missingWorker) env.Worker = Worker;
  if (!missingData) vm.runInContext(dataCode, env);
  if (!missingModel && !missingData) vm.runInContext(modelCode, env);
  vm.runInContext(script, env, {filename: 'crb-multiuser.js'});
  return {els, workers, events, timers, blobs, downloads, revoked, env,
    click(id) {return els['cm-' + id].fire('click');},
    change(id, value, event = 'input') {els['cm-' + id].value = String(value); return els['cm-' + id].fire(event);},
    edit(k, m, part, value) {return this.change('h-' + part + '-' + k + '-' + m, value);},
    start() {this.click('run'); return workers.at(-1);},
    step() {workers.find(worker => !worker.terminated && worker.tasks.length)?.step();},
    drain(limit = 5000) {for (let i = 0; i < limit; i++) {const worker = workers.find(w => !w.terminated && w.tasks.length); if (!worker) return; worker.step();} throw Error('Controlled Worker did not terminate within task budget');},
    fire(name) {for (const fn of events[name] || []) fn({persisted: true});},
    expire(delay) {for (const [id, timer] of [...timers]) if (timer.delay === delay) {timers.delete(id); timer.fn();}},
    download() {const before = blobs.length; this.click('export'); return blobs.length > before ? JSON.parse(blobs.at(-1).parts[0]) : null;},
    async import(text, options = {}) {const file = {size: options.size ?? Buffer.byteLength(text), text: options.text || (async () => text)}; els['cm-import'].files = [file]; await els['cm-import'].fire('change'); await settle();}
  };
}
function noCurrent(s) {assert.equal(s.els['cm-root-crb'].textContent, '—'); assert.equal(s.els['cm-power'].textContent, '—'); assert.equal(s.els['cm-gap'].textContent, '—'); assert.equal(s.els['cm-users'].children.length, 0);}
function resultFor(input = D.DEFAULT_INPUT, options = M.optionsFor(input)) {const solver = core.createSolver(input, options); while (solver.status === 'running') solver.step(1000); return solver.result(true);}
let acceptedFixture;
function accepted() {return copy(acceptedFixture ||= resultFor());}
function deliver(s, result = accepted()) {const worker = s.start(); worker.deliver({type: 'result', id: worker.requests[0].id, result}); return s.download();}
function fields(s) {return Object.values(s.els).filter(el => /^cm-h-(real|imag)-\d+-\d+$/.test(el.id));}
function chartNumbers(s) {for (const id of ['cm-sinr-chart', 'cm-information-chart', 'cm-tradeoff-chart']) for (const el of s.els[id].children) for (const key of ['x','y','x1','x2','y1','y2','cx','cy','width','height']) if (el.attrs[key] !== undefined) assert.ok(Number.isFinite(Number(el.attrs[key])), id + ' ' + key);}
test('default stays paused with exact complex channel, bounded controls and no stored result', () => {
  const s = setup(); noCurrent(s); assert.equal(s.workers.length, 0); assert.equal(fields(s).length, 16);
  assert.equal(s.els['cm-run'].disabled, false); assert.equal(s.els['cm-cancel'].disabled, true); assert.equal(s.els['cm-export'].disabled, true);
  assert.equal(s.els['cm-gamma'].value, '10'); assert.equal(s.els['cm-h-real-0-0'].value, String(D.DEFAULT_INPUT.H.real[0][0]));
  assert.match(s.els['cm-state'].textContent, /不会自动运行/); assert.equal(s.download(), null); assert.equal(s.blobs.length, 0);
});
test('actual Worker/core result passes adapter physical replay, populates all plots/table and exports full provenance', () => {
  const s = setup(), worker = s.start(); s.drain(); const record = s.download(); assert.ok(record, s.els['cm-error'].textContent);
  assert.equal(record.result.status, 'converged'); assert.equal(record.result.physicalGate.passed, true); assert.deepEqual(record.input, D.DEFAULT_INPUT);
  assert.deepEqual(worker.requests[0].options, M.optionsFor(D.DEFAULT_INPUT)); assert.equal(worker.terminated, true);
  assert.equal(record.generator.seed, null); assert.equal(record.generator.source, 'reference-fixture'); assert.equal(record.trace.truncated, false);
  assert.ok(record.result.certificate.dual.length); assert.ok(record.result.finalState.x.length); assert.deepEqual(record.kernel, D.KERNEL);
  assert.equal(s.els['cm-root-crb'].textContent, M.fmt(record.result.metrics.radar.rootCrbDegrees) + '°'); assert.equal(s.els['cm-users'].children.length, 2);
  assert.equal(s.els['cm-sinr-chart'].children.filter(x => x.tag === 'circle').length, 2); assert.equal(s.els['cm-information-chart'].children.filter(x => x.tag === 'rect').length, 3);
  assert.equal(s.els['cm-tradeoff-table'].children.length, 1);
  const users=record.result.metrics.users,radar=record.result.metrics.radar,scale=2*record.input.L/record.input.radarNoiseMw;
  assert.deepEqual(s.els['cm-sinr-chart'].children.filter(n=>n.tag==='circle').map(n=>Number(n.attrs['data-value'])),users.map(u=>u.sinrDb));
  const expectedInformation=[scale*radar.s2,scale*(radar.s2-radar.effectiveInformationWithoutScale),scale*radar.effectiveInformationWithoutScale];
  s.els['cm-information-chart'].children.filter(n=>n.tag==='rect').forEach((n,k)=>assert.ok(Math.abs(Number(n.attrs['data-value'])-expectedInformation[k])<1e-6*Math.max(1,Math.abs(expectedInformation[k]))));
  s.els['cm-users'].children.forEach((row,k)=>assert.deepEqual(row.children.map(td=>td.textContent),[String(k+1),M.fmt(users[k].desiredMw),M.fmt(users[k].interferenceMw),'1','10',M.fmt(users[k].sinrDb),M.fmt(users[k].ratioToThreshold-1)]));
  chartNumbers(s); assert.match(s.els['cm-state'].textContent, /导出/);
  assert.match(s.els['cm-progress'].textContent, /不含后续绘制完成测量/); assert.equal(M.parseImport(JSON.stringify(record)).historical, true);
  s.expire(0); assert.deepEqual(s.revoked, [s.downloads[0].href]);
});
test('own full export → file import → actual fresh solve preserves raw inputs and physical metrics without adopting historical success', async () => {
  const first = setup(); first.start(); first.drain(); const original = first.download();
  const s = setup(); await s.import(JSON.stringify(original)); noCurrent(s); assert.equal(s.workers.length, 0); assert.equal(s.els['cm-export'].disabled, true);
  assert.match(s.els['cm-state'].textContent, /历史记录/); assert.equal(s.els['cm-import'].value, '');
  s.start(); s.drain(); const fresh = s.download(); assert.deepEqual(fresh.input, original.input); assert.equal(fresh.inputDigest, original.inputDigest);
  assert.equal(fresh.result.status, 'converged'); assert.ok(Math.abs(fresh.result.metrics.radar.rootCrbDegrees - original.result.metrics.radar.rootCrbDegrees) < 1e-12);
  assert.equal(fresh.generator.seed, null); assert.equal(s.workers.length, 1);
});
test('Gamma edit immediately clears current result, keeps exact H and preserves original download as historical', () => {
  const s = setup(), original = deliver(s); s.change('gamma-number', 12); noCurrent(s);
  assert.equal(s.els['cm-gamma'].value, '12'); assert.deepEqual(s.download(), original); assert.equal(s.els['cm-tradeoff-table'].children.length, 1);
  const worker = s.start(); assert.equal(worker.requests[0].input.gammaDb, 12); assert.deepEqual(worker.requests[0].input.H, original.input.H);
  s.drain(); assert.equal(s.download().input.gammaDb, 12); assert.equal(s.els['cm-tradeoff-table'].children.length, 2);
});
test('progress reports actual iteration/time but never claims percent or acceptance', () => {
  const s = setup(), worker = s.start(); s.step(); s.step();
  assert.ok(worker.messages.some(m => m.type === 'progress')); assert.match(s.els['cm-progress'].textContent, /已迭代 16 次/); assert.doesNotMatch(s.els['cm-progress'].textContent, /%/); noCurrent(s);
  const before = s.els['cm-progress'].textContent; worker.deliver({type:'progress', id: 999, progress: {iterations: 100, elapsedMs: 100}}); assert.equal(s.els['cm-progress'].textContent, before);
  worker.deliver({type:'progress', id: 1, progress: {iterations: 'fake', elapsedMs: 100}}); assert.equal(s.els['cm-progress'].textContent, before);
});
test('rapid Run A → Run B → Cancel B rejects every late/duplicate result and permits a fresh run', () => {
  const s = setup(), a = s.start(), b = s.start(); assert.equal(a.terminated, true); assert.notEqual(a, b); assert.equal(s.workers.filter(w => !w.terminated).length, 1);
  s.click('cancel'); s.click('cancel'); noCurrent(s);
  for (const worker of [a, b]) {worker.deliver({type:'result', id:worker.requests[0].id, result:accepted()}); worker.deliver({type:'progress', id:worker.requests[0].id, progress:{iterations:100,elapsedMs:10}});}
  noCurrent(s); assert.equal(s.els['cm-export'].disabled, true); assert.equal(s.els['cm-cancel'].disabled, true);
  s.expire(250); assert.ok(s.workers.every(w => w.terminated)); s.start(); s.drain(); assert.equal(s.download().result.status, 'converged');
});
test('actual cancellation before first chunk and during iteration yields a cancelled record without accepted display', () => {
  for (const steps of [0, 2]) {const s = setup(); s.start(); for (let i = 0; i < steps; i++) s.step(); s.click('cancel'); s.drain(); noCurrent(s);
    const r = s.download(); assert.equal(r.result.status, 'cancelled'); assert.equal(r.result.physicalGate.passed, false); assert.equal(s.els['cm-tradeoff-table'].children.length, 1); assert.match(s.els['cm-tradeoff-table'].children[0].children[1].textContent, /停止/); assert.equal(s.workers[0].terminated, true);}
});
test('Cancel after final is inert and duplicate terminal/error messages cannot erase success', () => {
  const s = setup(), record = deliver(s), worker = s.workers[0]; s.click('cancel'); worker.deliver({type:'result',id:1,result:accepted()}); worker.onerror({message:'late error'});
  assert.deepEqual(s.download(), record); assert.equal(s.els['cm-users'].children.length, 2); assert.equal(s.els['cm-tradeoff-table'].children.length, 1);
});
test('editing H during a run clears scenario history and prevents old result, progress, cancellation or error resurrection', () => {
  const s = setup(); deliver(s); const worker = s.start(); s.edit(0, 0, 'real', 0.7123); noCurrent(s); assert.equal(s.els['cm-tradeoff-table'].children.length, 0);
  worker.deliver({type:'result',id:2,result:accepted()}); worker.deliver({type:'progress',id:2,progress:{iterations:200,elapsedMs:200}}); worker.onerror({message:'obsolete'});
  s.drain(); noCurrent(s); assert.equal(s.download().run.id, 1);
  const next = s.start(); assert.equal(next.requests[0].input.H.real[0][0], .7123); s.drain(); assert.equal(s.download().generator.seed, null);
});
test('a delayed cancelled record cannot replace a newer completed run or an imported current input', async () => {
  const s = setup(), old = s.start(); s.click('cancel'); const solver = core.createSolver(D.DEFAULT_INPUT, M.optionsFor(D.DEFAULT_INPUT)), cancelled = solver.cancel();
  const fresh = deliver(s); old.deliver({type:'cancelled',id:1,result:cancelled}); assert.deepEqual(s.download(), fresh);
  const t = setup(), first = t.start(); t.click('cancel'); await t.import(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:0})); first.deliver({type:'cancelled',id:1,result:cancelled});
  assert.equal(t.els['cm-export'].disabled, true); assert.equal(t.els['cm-gamma'].value, '0'); noCurrent(t);
});
test('explicit seed is deterministic; fresh increments including uint32 wrap; actual solve exports honest seed', () => {
  const s = setup(); s.change('seed', 1234, 'change'); let worker = s.start(); assert.deepEqual(worker.requests[0].input.H, M.seededH(4, 1234)); s.drain(); assert.equal(s.download().generator.seed, 1234);
  s.click('fresh'); assert.equal(s.els['cm-seed'].value, '1235'); worker = s.start(); assert.deepEqual(worker.requests[0].input.H, M.seededH(4, 1235));
  s.change('seed', 4294967295, 'change'); s.click('fresh'); assert.equal(s.els['cm-seed'].value, '0'); worker = s.start(); assert.deepEqual(worker.requests[0].input.H, M.seededH(4, 0));
});
test('changing dimensions intentionally regenerates H, changes Nr and clears old comparisons; reset restores exact raw defaults', () => {
  const s = setup(); deliver(s); s.change('seed', 17, 'change'); s.change('nt', 6, 'change'); noCurrent(s); assert.equal(s.els['cm-tradeoff-table'].children.length, 0);
  const worker = s.start(); assert.equal(worker.requests[0].input.Nt, 6); assert.equal(worker.requests[0].input.Nr, 10); assert.deepEqual(worker.requests[0].input.H, M.seededH(6, 17));
  assert.match(s.els['cm-ledger'].textContent, /6 发射 \/ 10 接收/);
  s.click('reset'); s.click('reset'); noCurrent(s); assert.equal(s.els['cm-nt'].value, '4'); assert.equal(s.els['cm-seed'].value, '290102'); assert.equal(s.els['cm-gamma'].value, '10');
  const fresh = s.start(); assert.deepEqual(fresh.requests[0].input, D.DEFAULT_INPUT); assert.equal(worker.terminated, true); s.drain(); assert.equal(s.download().generator.seed, null);
});
test('direction change resets comparisons and enters the actual numerical input', () => {
  const s = setup(); deliver(s); s.change('theta', 23, 'change'); noCurrent(s); assert.equal(s.els['cm-tradeoff-table'].children.length, 0);
  const worker = s.start(); assert.equal(worker.requests[0].input.thetaDegrees, 23); s.drain(); assert.equal(s.download().input.thetaDegrees, 23);
});
test('invalid H and Gamma cannot start work or revive success, and reset recovers', () => {
  for (const [id, value] of [['h-real-0-0',''],['h-imag-1-1','Infinity'],['h-real-0-0',11],['gamma-number',''],['gamma-number',-1],['gamma-number',21]]) {
    const s = setup(); deliver(s); const count = s.workers.length; s.change(id, value); noCurrent(s); s.start(); assert.equal(s.workers.length, count); assert.ok(s.els['cm-error'].textContent);
    s.click('reset'); const worker = s.start(); assert.deepEqual(worker.requests[0].input, D.DEFAULT_INPUT);
  }
});
test('invalid seed or dimensions preserve existing inputs and do not create a Worker', () => {
  for (const [id,value] of [['seed',''],['seed',-1],['seed',1.5],['seed',4294967296],['nt',5]]) {const s = setup(); s.change(id,value,'change'); assert.ok(s.els['cm-error'].textContent); const w=s.start(); assert.deepEqual(w.requests[0].input,D.DEFAULT_INPUT);}
});
test('same-H sweep actually solves 0/10/20 as disconnected points with the original fixed resources', () => {
  const s = setup(); s.click('sweep'); s.drain(); assert.equal(s.workers.length, 3);
  assert.deepEqual(s.workers.map(w => w.requests[0].input.gammaDb), [0,10,20]);
  for (const worker of s.workers) {assert.deepEqual(worker.requests[0].input.H,D.DEFAULT_INPUT.H); assert.equal(worker.requests[0].input.powerMw,1000); assert.equal(worker.terminated,true);}
  assert.equal(s.els['cm-tradeoff-table'].children.length,3); assert.equal(s.els['cm-tradeoff-chart'].children.filter(n => n.tag==='polyline'||n.tag==='path').length,0);
  assert.equal(s.els['cm-tradeoff-chart'].children.filter(n => n.attrs['data-run']).length,3); assert.equal(s.download().input.gammaDb,20); chartNumbers(s);
});
test('sweep cancellation/edit/watchdog discard all queued thresholds and no late completion restarts them', () => {
  for (const kind of ['cancel','edit','timeout']) {const s=setup(); s.click('sweep'); const worker=s.workers[0]; if(kind==='cancel')s.click('cancel'); if(kind==='edit')s.change('gamma-number',7); if(kind==='timeout')s.expire(30000);
    worker.deliver({type:'result',id:1,result:resultFor({...copy(D.DEFAULT_INPUT),gammaDb:0})}); s.drain(); s.expire(250); noCurrent(s); assert.equal(s.workers.length,1); assert.equal(worker.terminated,true);}
});
test('watchdog is resource-limited unresolved and terminates the worker even if it ignores cancellation', () => {
  const s=setup(),worker=s.start(); s.expire(30000); noCurrent(s); assert.match(s.els['cm-state'].textContent,/30 秒运行上限/); assert.match(s.els['cm-state'].textContent,/不证明要求不可行/);
  assert.equal(worker.requests.at(-1).type,'cancel'); s.expire(250); assert.equal(worker.terminated,true); worker.deliver({type:'result',id:1,result:accepted()}); noCurrent(s); assert.equal(s.download(),null);
});
test('actual iteration-limit and rank-gate records never show accepted CRB, power or bars', () => {
  const limited=resultFor(D.DEFAULT_INPUT,{...M.optionsFor(D.DEFAULT_INPUT),maxIterations:1}),s=setup(); deliver(s,limited); noCurrent(s); assert.match(s.els['cm-current-label'].textContent,/预算用尽/); assert.equal(s.download().result.status,'iteration_limit');
  const input=copy(D.DEFAULT_INPUT); input.H={real:[[1,0,0,1],[0,1,1,0]],imag:[[0,0,0,0],[0,0,0,0]]};
  const t=setup(); for(let k=0;k<2;k++)for(let j=0;j<4;j++)for(const part of ['real','imag'])t.edit(k,j,part,input.H[part][k][j]); t.start(); t.drain(); noCurrent(t); assert.equal(t.download().result.status,'rank_condition_not_met'); assert.match(t.els['cm-current-label'].textContent,/秩条件/); assert.doesNotMatch(t.els['cm-state'].textContent,/不可行/);
});
test('wrong input/version/missing or physically altered results are rejected before presentation and export', () => {
  const mutations=[r=>{r.version='wrong';},r=>{r.input.gammaDb=0;},r=>{delete r.Wc;},r=>{r.metrics.powerMw*=2;},r=>{r.metrics.radar.rootCrbDegrees=null;},r=>{r.certificate.relativeRecoveredGap=NaN;},r=>{r.physicalGate.passed=false;},r=>{r.result='unexpected';}];
  for(const mutate of mutations){const s=setup(),worker=s.start(),r=accepted(); mutate(r); worker.deliver({type:'result',id:1,result:r}); noCurrent(s); assert.equal(s.els['cm-export'].disabled,true); assert.match(s.els['cm-error'].textContent,/复核/); assert.equal(worker.terminated,true);}
});
test('missing resources and every Worker failure path are honest and never substitute saved answers', () => {
  for(const options of [{missingWorker:true},{workerThrows:true},{importThrows:true},{postThrows:true}]){const s=setup(options); s.start(); s.drain(); noCurrent(s); assert.ok(s.els['cm-error'].textContent); assert.equal(s.els['cm-export'].disabled,true); assert.equal(s.els['cm-cancel'].disabled,true);}
  for(const options of [{missingModel:true},{missingData:true}]){const s=setup(options); assert.match(s.els['cm-state'].textContent,/资源未能加载/); assert.equal(s.workers.length,0);}
  assert.equal(setup({missingMount:true}).workers.length,0);
  for(const kind of ['error','onerror']){const s=setup(),worker=s.start(); if(kind==='error')worker.deliver({type:'error',id:1,error:'Controlled numerical exception'});else worker.onerror({message:'Controlled runtime exception'});noCurrent(s);assert.match(s.els['cm-error'].textContent,/Controlled/);assert.equal(worker.terminated,true);assert.equal(s.download(),null);}
});
test('navigation/back stops all workers and cannot attach old results or automatically restart', () => {
  const s=setup(),worker=s.start(); s.fire('pagehide'); assert.equal(worker.terminated,true); noCurrent(s); worker.deliver({type:'result',id:1,result:accepted()});s.fire('pageshow');noCurrent(s);assert.equal(s.workers.length,1);assert.match(s.els['cm-state'].textContent,/重新求解/);assert.equal(s.timers.size,0);
});
test('malformed imports preserve prior exact inputs and accepted historical record; file size is checked before reading', async () => {
  const s=setup(),original=deliver(s),badInput=copy(D.DEFAULT_INPUT);badInput.H.imag[0].pop();
  const mutations=[r=>{r.schemaVersion=999;},r=>{r.inputDigest='wrong';},r=>{r.result.certificate.dual.pop();},r=>{r.conventions.power='W';},r=>{r.input.extra=true;},r=>{r.kernel.version='wrong';}];
  const texts=['{',JSON.stringify(badInput),JSON.stringify({...copy(D.DEFAULT_INPUT),Nt:100}),JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:'NaN'}),'{}','{"__proto__":{"polluted":true}}',...mutations.map(mutate=>{const r=copy(original);mutate(r);return JSON.stringify(r);})];
  for(const text of texts){await s.import(text);assert.match(s.els['cm-error'].textContent,/导入未完成/);assert.equal(s.els['cm-gamma'].value,'10');assert.equal(s.els['cm-h-real-0-0'].value,String(D.DEFAULT_INPUT.H.real[0][0]));assert.deepEqual(s.download(),original);assert.equal(s.els['cm-users'].children.length,2);assert.equal(s.workers.length,1);}
  let read=false;await s.import('{}',{size:2*1024*1024+1,text:async()=>{read=true;return '{}';}});assert.equal(read,false);assert.match(s.els['cm-error'].textContent,/2 MiB/);assert.equal({}.polluted,undefined);
});
test('an import that finishes after an input edit is rejected without overwriting the new input', async () => {
  const s=setup();let resolve;const pending=s.import(JSON.stringify(D.DEFAULT_INPUT),{text:()=>new Promise(r=>{resolve=r;})});s.change('gamma-number',7);const status=s.els['cm-state'].textContent;resolve(JSON.stringify(D.DEFAULT_INPUT));await pending;
  assert.equal(s.els['cm-gamma'].value,'7');assert.equal(s.els['cm-error'].textContent,'');assert.equal(s.els['cm-state'].textContent,status);noCurrent(s);assert.equal(s.workers.length,0);
});
test('loading a valid input cancels running work and does not trust a previous accepted file', async () => {
  const s=setup(),worker=s.start(),input={...copy(D.DEFAULT_INPUT),gammaDb:5};await s.import(JSON.stringify(input));noCurrent(s);worker.deliver({type:'result',id:1,result:accepted()});noCurrent(s);s.expire(250);assert.equal(worker.terminated,true);
  const next=s.start();assert.deepEqual(next.requests[0].input,input);s.drain();assert.equal(s.download().input.gammaDb,5);
});
test('tiny-bound labels remain unique and axis endpoint anchors stay inside the declared narrow SVG geometry', () => {
  for(const width of [240,320,540]){const s=setup({width});deliver(s);s.fire('resize');chartNumbers(s);
    const svg=s.els['cm-tradeoff-chart'],ticks=svg.children.filter(n=>n.tag==='text'&&n.attrs['text-anchor']==='end'&&Number(n.attrs.x)<90&&Number(n.attrs.y)<240);
    assert.equal(ticks.length,5);assert.equal(new Set(ticks.map(n=>n.textContent)).size,5);assert.ok(ticks.some(n=>n.textContent!=='0.00'));
    for(const id of ['cm-sinr-chart','cm-tradeoff-chart']){const c=s.els[id],xTicks=c.children.filter(n=>n.tag==='text'&&Number(n.attrs.y)===248);assert.ok(xTicks.length>=5);assert.equal(xTicks.at(-1).attrs['text-anchor'],'end');assert.equal(xTicks[0].attrs['text-anchor'],'start');assert.ok(Number(xTicks.at(-1).attrs.x)<=width-20);assert.ok(Number(xTicks[0].attrs.x)>=0);}
  }
  for(const [min,max] of [[1e-9,1.0001e-9],[.005,.0050001],[0,1e-12],[1e8,1e8+1]]){const ticks=M.axisTicks(min,max,5);assert.equal(new Set(ticks.map(t=>t.label)).size,5);assert.ok(ticks.every(t=>Number.isFinite(t.value)));}
});
test('history is bounded to twelve actual summaries, reset clears it, and replacing runs leaves one active worker', () => {
  const s=setup();for(let i=0;i<15;i++)deliver(s);assert.equal(s.els['cm-tradeoff-table'].children.length,12);assert.equal(s.els['cm-tradeoff-chart'].children.filter(n=>n.attrs['data-run']).length,12);assert.equal(s.download().run.id,15);
  for(let i=0;i<10;i++)s.start();assert.equal(s.workers.filter(w=>!w.terminated).length,1);assert.equal([...s.timers.values()].filter(t=>t.delay===30000).length,1);s.click('reset');s.expire(250);assert.equal(s.els['cm-tradeoff-table'].children.length,0);assert.ok(s.workers.every(w=>w.terminated));
});
test('controller has no network, cached-answer, auto-loop, HTML injection or browser-latency claim path', () => {
  assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|setInterval|\.innerHTML\s*=/);
  assert.match(script,/new window\.Worker\('crb-multiuser\/worker\.js'\)/);assert.match(script,/URL\.revokeObjectURL/);assert.doesNotMatch(dataCode,/"Wc"\s*:|"metrics"\s*:|"finalState"\s*:/);
});
test('a pending import cannot replace a newer Run, and the latest selected import wins regardless of completion order', async () => {
  const s=setup();let resolve;const pending=s.import(JSON.stringify(D.DEFAULT_INPUT),{text:()=>new Promise(r=>{resolve=r;})});s.start();const status=s.els['cm-state'].textContent;resolve(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:3}));await pending;
  assert.equal(s.els['cm-gamma'].value,'10');assert.equal(s.els['cm-error'].textContent,'');assert.equal(s.els['cm-state'].textContent,status);s.drain();assert.equal(s.download().input.gammaDb,10);
  for(const firstFinishesFirst of [true,false]){const t=setup();let a,b;const pa=t.import('{}',{text:()=>new Promise(r=>{a=r;})}),pb=t.import('{}',{text:()=>new Promise(r=>{b=r;})});
    if(firstFinishesFirst){a(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:1}));await pa;b(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:2}));await pb;}
    else{b(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:2}));await pb;a(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:1}));await pa;}
    assert.equal(t.els['cm-gamma'].value,'2');assert.equal(t.els['cm-error'].textContent,'');noCurrent(t);
  }
});
test('page binds every controller element once, preserves old sections, and orders the paused scripts correctly', () => {
  const html=read('crb-beamforming.html','content/pages/crb-beamforming.html'),css=read('crb-multiuser.css','labs/crb-beamforming/crb-multiuser.css');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'no duplicate page IDs');
  for(const id of ['multiuser',...staticIds])assert.ok(ids.includes(id),'missing controller mount '+id);
  for(const id of ['intuition','model','experiment','solution','paper','limits','reproduce','companion'])assert.ok(ids.includes(id),'preserved old anchor '+id);
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)].map(m=>({tag:m[0],src:m[1]}));
  const data=scripts.findIndex(s=>s.src==='crb-multiuser-data.js'),model=scripts.findIndex(s=>s.src==='crb-multiuser-model.js'),ui=scripts.findIndex(s=>s.src==='crb-multiuser.js');assert.ok(data>=0&&data<model&&model<ui);for(const i of [data,model,ui])assert.match(scripts[i].tag,/\bdefer\b/);
  assert.ok(!scripts.some(s=>s.src==='crb-multiuser/core.js'),'numerical core belongs only in Worker');assert.match(html,/<link[^>]+href="crb-multiuser\.css"/);
  assert.match(html,/<p[^>]+id="cm-progress"[^>]+aria-live="off"/);assert.match(html,/<p[^>]+id="cm-state"[^>]+role="status"/);assert.match(html,/<p[^>]+id="cm-error"[^>]+role="alert"/);
  for(const id of ['cm-nt','cm-theta','cm-seed','cm-import'])assert.match(html,new RegExp('for="'+id+'"'));
  for(const id of ['cm-sinr-chart','cm-information-chart','cm-tradeoff-chart']){const before=html.slice(0,html.indexOf('id="'+id+'"'));assert.ok(before.lastIndexOf('<figcaption')>before.lastIndexOf('<figure'));}
  assert.match(html,/历史成功结果/);assert.match(html,/浮点/);assert.match(html,/真实浏览器/);assert.match(css,/:focus-visible/);assert.match(css,/@media\(max-width:520px\)/);
});
test('an obsolete failed file read cannot overwrite a newer successful import', async () => {
  const s=setup();let resolve;const old=s.import('{}',{text:()=>new Promise(yes=>{resolve=yes;})});await s.import(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:6}));resolve('{');await old;
  assert.equal(s.els['cm-gamma'].value,'6');assert.equal(s.els['cm-error'].textContent,'');assert.match(s.els['cm-state'].textContent,/已载入/);
  const t=setup();let fail;const pending=t.import('{}',{text:()=>new Promise((_yes,no)=>{fail=no;})});await t.import(JSON.stringify({...copy(D.DEFAULT_INPUT),gammaDb:8}));fail(Error('old file read failure'));await pending;
  assert.equal(t.els['cm-gamma'].value,'8');assert.equal(t.els['cm-error'].textContent,'');
});
test('all bounded array choices rebuild their entire visible complex H editor without truncating old custom values', () => {
  const s=setup();s.change('seed',29,'change');
  const visibleFields=el=>[...(el.tag==='input'?[el]:[]),...el.children.flatMap(visibleFields)];
  for(const nt of [6,8,4]){s.change('nt',nt,'change');const shown=visibleFields(s.els['cm-channel-editor']);assert.equal(shown.length,4*nt);
    const w=s.start();assert.equal(w.requests[0].input.Nr,nt+4);assert.deepEqual(w.requests[0].input.H,M.seededH(nt,29));s.click('cancel');s.expire(250);}
  s.click('reset');assert.equal(visibleFields(s.els['cm-channel-editor']).length,16);assert.equal(s.els['cm-h-real-0-0'].value,String(D.DEFAULT_INPUT.H.real[0][0]));
});
