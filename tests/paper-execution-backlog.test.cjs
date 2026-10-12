'use strict';
// Tracking/source contracts only. This does not validate a numerical paper implementation.
// Resolve either authoritative source layout or the isolated compatibility-build layout.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function read(candidates) {
  for (const file of candidates) {
    const name = path.join(root, file);
    if (fs.existsSync(name)) return fs.readFileSync(name, 'utf8');
  }
  throw Error(`Missing canonical input: ${candidates.join(' or ')}`);
}
const guides = JSON.parse(read(['content/data/research-guides.json', 'site/research-guides.json'])).cards;
const catalog = JSON.parse(read(['content/data/research-directory.json', 'site/research-directory.json'])).cards;
const cases = JSON.parse(read(['content/data/registry.json', 'site/registry.json'])).cases;
const text = read(['docs/PAPER-EXECUTION-BACKLOG.json']);
const backlog = JSON.parse(text);
const plan = read(['docs/PAPER-EXECUTION-PLAN.md']);
const acceptance = read(['docs/PAPER-EXECUTION-ACCEPTANCE.md']);
const normalizeTitle = title => title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
function identity(url, title) {
  const arxiv = url.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})/);
  return arxiv ? `arxiv:${arxiv[1]}` : `title:${normalizeTitle(title)}`;
}
function fixedIdentity(url) {
  const arxiv = url.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5}v\d+)/);
  return arxiv ? `arxiv:${arxiv[1]}` : url;
}
const samePaper = (source, title, comparison) =>
  identity(source.url, title) === identity(comparison.sourceUrl, comparison.sourceTitle) ||
  normalizeTitle(title) === normalizeTitle(comparison.sourceTitle);
// Derive expected coverage from canonical content. No permanent 20/9/6/35 freeze.
function expectedRecords() {
  const expected = new Map();
  for (const guide of guides) expected.set(guide.id, {
    category:'guide', guideIds:[guide.id], catalogIds:[], source:guide.source,
    caseIds:cases.filter(c => c.paperComparison && samePaper(guide.source, guide.source.title, c.paperComparison)).map(c => c.id)
  });
  for (const card of catalog) {
    assert.ok(!expected.has(card.id), `Canonical ID collision: ${card.id}`);
    const matchingGuide = guides.find(g => normalizeTitle(g.source.title) === normalizeTitle(card.title) ||
      identity(g.source.url, g.source.title) === identity(card.identitySource, card.title));
    assert.equal(matchingGuide, undefined, `Guide/catalog duplicate needs merged coverage: ${card.id}`);
    expected.set(card.id, {category:'catalog', guideIds:[], catalogIds:[card.id], caseIds:card.caseId ? [card.caseId] : [], card});
  }
  const claimedCases = new Set([...expected.values()].flatMap(r => r.caseIds));
  for (const item of cases) if (item.paperComparison && !claimedCases.has(item.id)) {
    expected.set(`supplement-${item.id}`, {category:'case-only', guideIds:[], catalogIds:[], caseIds:[item.id], comparison:item.paperComparison});
  }
  return expected;
}
const expected = expectedRecords();
const enums = {
  source:['reopening-required','audited-partial','audited-for-selected-core','complete'],
  modelFidelity:['not-validated','specified','partial','verified'],
  algorithm:['not-implemented','in-progress','partial-offline','partial-live','implemented'],
  independentValidation:['pending','reference-ready','partial','passed'],
  selectedExperiment:['pending','in-progress','partial','reproduced'],
  fullPaper:['not-reproduced','partial','reproduced'],
  liveExecution:['not-implemented','prerequisite-only','stored-solution-evaluation','in-progress','partial-core','validated'],
  uiLearning:['pending','in-progress','partial','accepted'], latency:['not-measured','measured']
};
const types = ['algorithm','theory','dataset','measurement','platform','learned-method','model'];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function listOfText(value, label, allowEmpty=false) {
  assert.ok(Array.isArray(value) && (allowEmpty || value.length > 0), label);
  assert.ok(value.every(nonempty), label);
}
function validate(data) {
  assert.equal(data.schemaVersion, 1);
  assert.deepEqual(data.trackingContract.stageEnums, enums);
  assert.match(data.baselineCommit, /^[a-f0-9]{40}$/);
  assert.deepEqual(data.papers.map(p => p.id).sort(), [...expected.keys()].sort());
  for (const key of ['id']) assert.equal(new Set(data.papers.map(p => p[key])).size, data.papers.length);
  assert.equal(new Set(data.papers.map(p => p.source.fixedSourceIdentity)).size, data.papers.length, 'duplicate fixed source');
  assert.equal(new Set(data.papers.map(p => p.source.paperIdentity)).size, data.papers.length, 'duplicate primary paper');
  const allSourceIds = data.papers.flatMap(p => p.canonicalReferences.sourceIds);
  assert.equal(new Set(allSourceIds).size, allSourceIds.length, 'duplicate canonical sourceId');
  for (const p of data.papers) {
    const e = expected.get(p.id);
    assert.equal(p.category, e.category);
    for (const key of ['guideIds','catalogIds','caseIds']) assert.deepEqual(p.canonicalReferences[key], e[key], `${p.id}: ${key}`);
    assert.deepEqual(p.canonicalReferences.sourceIds, e.caseIds.map(id => cases.find(c => c.id === id).paperComparison.sourceId));
    assert.ok(p.owner === null || nonempty(p.owner));
    assert.match(p.updatedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(nonempty(p.title) && nonempty(p.paperType));
    assert.match(p.source.url, /^https:\/\/[^\s]+$/);
    assert.equal(p.source.fixedSourceIdentity, fixedIdentity(p.source.url));
    assert.equal(p.source.paperIdentity, identity(p.source.url, p.title));
    assert.ok(nonempty(p.source.fixedVersion));
    assert.ok(p.source.locators && Object.values(p.source.locators).some(nonempty), `${p.id}: locators`);
    if (e.source) {
      assert.equal(fixedIdentity(p.source.url), fixedIdentity(e.source.url));
      assert.equal(p.source.fixedVersion, e.source.edition);
    } else if (e.comparison) {
      assert.equal(fixedIdentity(p.source.url), fixedIdentity(e.comparison.sourceUrl));
      assert.equal(p.source.fixedVersion, e.comparison.version);
    } else if (e.caseIds.length) {
      const c = cases.find(c => c.id === e.caseIds[0]).paperComparison;
      assert.equal(fixedIdentity(p.source.url), fixedIdentity(c.sourceUrl));
      assert.equal(p.source.fixedVersion, c.version);
    } else {
      assert.equal(identity(p.source.url, p.title), identity(e.card.identitySource, e.card.title));
    }
    if (p.source.hashStatus === 'recorded') assert.match(p.source.pdfSha256, /^[a-f0-9]{64}$/);
    else {assert.equal(p.source.hashStatus, 'not-recorded'); assert.equal(p.source.pdfSha256, null);}
    assert.ok(Array.isArray(p.contribution.types) && p.contribution.types.length > 0);
    assert.ok(p.contribution.types.every(t => types.includes(t)));
    assert.ok(nonempty(p.contribution.summary) || nonempty(p.contribution.kind));
    assert.ok(nonempty(p.minimalFaithfulTarget.description));
    for (const key of ['targets','baselines','metrics','resources']) listOfText(p.experiment[key], `${p.id}: ${key}`);
    listOfText(p.experiment.unresolved, `${p.id}: unresolved`, true);
    listOfText(p.dependencies, `${p.id}: dependencies`);
    listOfText(p.missingImplementation, `${p.id}: missing implementation`, p.stages.fullPaper === 'reproduced');
    listOfText(p.blockers, `${p.id}: blockers`, p.stages.fullPaper === 'reproduced');
    assert.deepEqual(Object.keys(p.stages).sort(), Object.keys(enums).sort());
    for (const [stage, value] of Object.entries(p.stages)) assert.ok(enums[stage].includes(value), `${p.id}: invalid ${stage}=${value}`);
    assert.ok(nonempty(p.implementation.classification));
    for (const key of ['source','algorithm','selectedExperiment','fullPaper','latency']) assert.ok(nonempty(p.stageEvidence[key]));
    assert.equal(p.realtime.status, p.stages.latency);
    assert.equal(typeof p.priority.dataAccessParallel, 'boolean');
    assert.ok(p.priority.queuePosition === null || Number.isInteger(p.priority.queuePosition));
    if (p.stages.latency === 'not-measured') {
      assert.equal(p.realtime.measuredLatencyMs, null);
      for (const value of Object.values(p.realtime.benchmark)) assert.equal(value, null);
    } else {
      assert.ok(Number.isFinite(p.realtime.measuredLatencyMs) && p.realtime.measuredLatencyMs >= 0);
      const m = p.realtime.benchmark;
      assert.ok(nonempty(m.device) && nonempty(m.browser));
      assert.ok(Number.isInteger(m.sampleCount) && m.sampleCount > 0);
      assert.ok([undefined,'fixed-configuration-summary','individual-smoke-samples','individual-worker-response-samples'].includes(m.measurementType));
      if (['individual-smoke-samples','individual-worker-response-samples'].includes(m.measurementType)) {
        const responseOnly=m.measurementType==='individual-worker-response-samples';
        if(responseOnly)assert.ok(nonempty(m.measurementBoundary));
        assert.ok(Array.isArray(m.samples) && m.samples.length === m.sampleCount);
        for (const sample of m.samples) {
          assert.ok(nonempty(sample.configuration) && nonempty(sample.resourceState));
          if(responseOnly){assert.ok(Number.isFinite(sample.workerResponseMs)&&sample.workerResponseMs>=0);assert.ok(!Object.hasOwn(sample,'controlToResultMs'));}else{
          assert.ok(Number.isFinite(sample.controlToResultMs) && sample.controlToResultMs >= 0);
          assert.ok(sample.workerMs === null || (Number.isFinite(sample.workerMs) && sample.workerMs >= 0 && sample.workerMs <= sample.controlToResultMs));
          assert.equal(typeof sample.includesInputDebounce, 'boolean');}
        }
        for (const k of ['medianMs','p95Ms','worstMs']) assert.equal(m[k], null, 'mixed-condition smoke timings have no pooled statistics');
        assert.ok(nonempty(m.summaryStatus) && nonempty(m.evidence));
        assert.ok(m.samples.some(sample => (responseOnly?sample.workerResponseMs:sample.controlToResultMs) === p.realtime.measuredLatencyMs), 'representative latency must identify an actual sample');
      } else {
        for (const k of ['medianMs','p95Ms','worstMs']) assert.ok(Number.isFinite(m[k]) && m[k] >= 0);
        assert.ok(m.medianMs <= m.p95Ms && m.p95Ms <= m.worstMs);
      }
    }
    if (p.stages.fullPaper === 'reproduced') {
      assert.equal(p.stages.source, 'complete');
      assert.equal(p.stages.modelFidelity, 'verified');
      assert.equal(p.stages.algorithm, 'implemented');
      assert.equal(p.stages.independentValidation, 'passed');
      assert.equal(p.stages.selectedExperiment, 'reproduced');
      assert.ok(p.fullPaperCoverage && Array.isArray(p.fullPaperCoverage.evidence) && p.fullPaperCoverage.evidence.length > 0, 'full-paper evidence required');
    }
    if (p.stages.liveExecution === 'validated') {
      assert.equal(p.stages.algorithm, 'implemented');
      assert.equal(p.stages.independentValidation, 'passed');
      assert.ok(p.liveValidation && nonempty(p.liveValidation.evidence), 'fresh-input live validation evidence required');
    }
    if (p.category === 'case-only') {
      assert.ok(nonempty(p.experiment.details.metricScope));
      assert.ok(p.experiment.resources.every(s => s.startsWith('Existing independent teaching budget')));
    }
  }
  const categoryCount = kind => [...expected.values()].filter(p => p.category === kind).length;
  assert.deepEqual(data.scope.counts, {guide:categoryCount('guide'),catalog:categoryCount('catalog'),caseOnly:categoryCount('case-only'),uniquePrimaryPapers:expected.size});
  assert.equal(data.scope.fullPaperReproductionsEstablished, data.papers.filter(p => p.stages.fullPaper === 'reproduced').length);
  assert.equal(data.scope.liveTargetLatencyMeasurementsEstablished, data.papers.filter(p => p.stages.latency === 'measured').length);
  for (const id of [data.sequence.current,data.sequence.next,...data.sequence.then,...data.sequence.dataAndWeightAccessInParallel]) assert.ok(expected.has(id));
  for(const id of data.sequence.deliveredBoundedSlices||[])assert.ok(expected.has(id));
  for(const entry of data.sequence.activeStages||[]){assert.ok(expected.has(entry.paperId));assert.ok(['site-integration','independent-numerical-reference','browser-validation'].includes(entry.stage));assert.ok(['in-progress','blocked','pending'].includes(entry.status));}
  assert.doesNotMatch(JSON.stringify(data), /\/(?:workspace|tmp)\//);
}

test(`execution backlog covers all ${expected.size} current canonical primary papers without duplicate IDs or sources`, () => validate(backlog));
test('SBFD case and guide are one paper, retaining the canonical case source ID', () => {
  const row = backlog.papers.find(p => p.id === 'sbfd-resource-synchronization-2026');
  assert.deepEqual(row.canonicalReferences.caseIds, ['case-sbfd']);
  assert.deepEqual(row.canonicalReferences.sourceIds, ['case-sbfd-paper']);
  assert.ok(!backlog.papers.some(p => p.id === 'supplement-case-sbfd'));
});
test('source, real contribution and partial execution statuses remain independent', () => {
  const byId = Object.fromEntries(backlog.papers.map(p => [p.id,p]));
  if (byId.optimal_waveform.stages.liveExecution === 'stored-solution-evaluation') assert.notEqual(byId.optimal_waveform.stages.liveExecution, 'validated');
  for (const p of Object.values(byId)) if (p.stages.algorithm.startsWith('partial-')) assert.notEqual(p.stages.fullPaper, 'reproduced');
  assert.ok(byId.deepsense.contribution.types.includes('dataset'));
  assert.ok(byId['tradeoffs-causal-state-communication-2013'].contribution.types.includes('theory'));
  assert.ok(byId['mimo-ofdm-realtime-testbed-2023'].contribution.types.includes('platform'));
  for (const r of backlog.papers) if (r.stages.algorithm.startsWith('partial-')) assert.notEqual(r.stages.fullPaper, 'reproduced');
});
test('next kernels retain unresolved experiment boundaries and no latency claims', () => {
  const cd = backlog.papers.find(p => p.id === 'tradeoffs-feedback-capacity-distortion-2018');
  const gc = backlog.papers.find(p => p.id === 'nearfield-mechanism-aware-mapping-2026');
  if (cd.stages.algorithm === 'implemented') {
    assert.equal(cd.stages.independentValidation, 'passed');
    assert.match(cd.evidence.numericalMilestone.coreSha256, /^[a-f0-9]{64}$/);
    assert.ok(cd.evidence.numericalMilestone.coreTestsPassed > 0);
    assert.ok(cd.evidence.numericalMilestone.independentRandomSlsqpComparisons > 0);
  }
  const binary = cd.experiment.gates.find(g => g.id === 'binary-figure-2');
  const gaussian = cd.experiment.gates.find(g => g.id === 'gaussian-figure-3');
  assert.ok(binary && gaussian);
  if (binary.status === 'reproduced') {
    assert.equal(cd.stages.selectedExperiment, 'reproduced');
    assert.ok(cd.evidence.numericalMilestone.binaryFigure2ActualBaSolves > 0);
  }
  if (gaussian.status !== 'reproduced') {
    assert.notEqual(cd.stages.fullPaper, 'reproduced');
    assert.match(JSON.stringify(cd.experiment.unresolved), /1\.213/);
    assert.match(JSON.stringify(cd.experiment.unresolved), /1\.252699474402693/);
  }
  if (gc.stages.algorithm === 'not-implemented') assert.notEqual(gc.stages.independentValidation, 'passed');
  assert.match(gc.minimalFaithfulTarget.description, /channel-wise complex gain LS in both/);
  assert.match(JSON.stringify(gc.details.auditCorrections), /path count, not iterations/);
  assert.match(JSON.stringify(gc.dependencies), /physical aperture/);
});
test('schema rejects missing coverage, duplicate fixed sources, invalid stage and unsupported completion', () => {
  const bad = mutate => {const clone = structuredClone(backlog); mutate(clone); assert.throws(() => validate(clone));};
  bad(b => b.papers.pop());
  bad(b => b.papers[1].id = b.papers[0].id);
  bad(b => b.papers[1].source.fixedSourceIdentity = b.papers[0].source.fixedSourceIdentity);
  bad(b => b.papers[0].stages.algorithm = 'looks-correct');
  bad(b => delete b.papers[0].stages.selectedExperiment);
  bad(b => b.papers[0].experiment.baselines = []);
  bad(b => b.papers[0].experiment.metrics = []);
  bad(b => b.papers[0].experiment.resources = []);
  bad(b => b.papers[0].dependencies = []);
  bad(b => b.papers[0].stages.fullPaper = 'reproduced');
  bad(b => b.papers[0].stages.liveExecution = 'validated');
  bad(b => b.papers[0].realtime.measuredLatencyMs = 0);
  bad(b => b.papers[0].canonicalReferences.sourceIds.push('invented-source'));
});
test('plan checklist covers the same papers and states citation/measurement limits', () => {
  assert.equal((plan.match(/^\| \d+\. ☐ \|/gm) || []).length, expected.size);
  for (const p of backlog.papers) assert.ok(plan.includes(`](${p.source.url})`), p.id);
  assert.match(plan, /Auxiliary tutorials\/surveys and secondary motivation citations/);
  assert.match(plan, /separate future audit/);
  assert.match(plan, /not a second website\/navigation catalog/);
  assert.match(acceptance, /Per-paper release gates/);
  assert.match(acceptance, /general finite-alphabet/);
  assert.doesNotMatch(text + plan + acceptance, /\/(?:workspace|tmp)\//);
});

test('measured smoke timings retain real samples without inventing pooled quantiles', () => {
  const id='tradeoffs-feedback-capacity-distortion-2018', record=backlog.papers.find(p=>p.id===id);
  if (record.realtime.benchmark.measurementType !== 'individual-smoke-samples') return;
  const bad = mutate => {const clone=structuredClone(backlog);mutate(clone.papers.find(p=>p.id===id));assert.throws(()=>validate(clone));};
  bad(p=>p.realtime.benchmark.medianMs=100);
  bad(p=>p.realtime.benchmark.p95Ms=200);
  bad(p=>p.realtime.benchmark.samples[0].controlToResultMs=-1);
  bad(p=>p.realtime.benchmark.samples[0].workerMs=p.realtime.benchmark.samples[0].controlToResultMs+1);
  bad(p=>p.realtime.benchmark.sampleCount++);
  bad(p=>p.realtime.benchmark.measurementType='universal-performance-guarantee');
  bad(p=>p.realtime.measuredLatencyMs=123456);
});


test('Worker response measurements cannot masquerade as rendered-result timings',()=>{
 const candidate=backlog.papers.find(p=>p.realtime.benchmark.measurementType==='individual-worker-response-samples');if(!candidate)return;
 const bad=mutate=>{const d=structuredClone(backlog),p=d.papers.find(p=>p.id===candidate.id);mutate(p.realtime.benchmark);assert.throws(()=>validate(d));};
 bad(m=>delete m.measurementBoundary);bad(m=>m.samples[0].workerResponseMs=-1);bad(m=>m.samples[0].controlToResultMs=m.samples[0].workerResponseMs);bad(m=>m.p95Ms=42);
 const future=structuredClone(backlog);future.sequence.activeStages=[{paperId:future.papers[0].id,stage:'independent-numerical-reference',status:'pending'}];validate(future);future.sequence.activeStages[0].paperId='invented';assert.throws(()=>validate(future));
});
