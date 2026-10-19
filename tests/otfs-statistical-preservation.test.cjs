'use strict';
const {test} = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('./helpers/otfs-statistical-preservation.cjs');
const root = path.resolve(__dirname, '..');
const sourceLayout = fs.existsSync(path.join(root, 'content/data/registry.json'));
const read = file => fs.readFileSync(path.join(root, file));
const metadataPath = name => (sourceLayout ? 'content/data/' : 'site/') + name;

// These are additional historical checks. No current source is replaced when
// dependency scanners, generator validation or statistical runtime tests run.
test('OTFS statistical inverse binds whole authored/rendered bytes and rejects unreviewed changes', () => {
  for (const row of P.delta.files) {
    const file = sourceLayout ? row.path : row.compatibility;
    if (!sourceLayout && row.authored) continue;
    if (!fs.existsSync(path.join(root, file))) {
      a.ok(sourceLayout && row.generated || !sourceLayout && row.sourceOnly, row.path);
      continue;
    }
    const current = require('./helpers/recovery-published-baseline-projection.cjs').projectFile(file, read(file)), original = Buffer.from(current);
    a.ok(P.identity(current, row.after), 'current reviewed bytes: ' + file);
    const prior = P.withoutFile(file, current);
    a.ok(P.identity(prior, row.before), file);
    a.deepEqual(current, original, 'input remains unchanged');
    a.deepEqual(P.withoutFile(file, prior), prior, 'exact predecessor is idempotent');
    const changed = Buffer.from(current); changed[Math.floor(changed.length / 2)] ^= 1;
    for (const bad of [changed, current.subarray(1), Buffer.concat([current, Buffer.from('unreviewed')])]) a.throws(() => P.withoutFile(file, bad));
    a.throws(() => P.withoutFile(file, current, [row, row]), /unique/);
    for (const mutate of [
      r => { r.after.sha256 = '0'.repeat(64); },
      r => { r.before.sha256 = '0'.repeat(64); },
      r => { r.after.bytes += 1; },
      r => { r.before.bytes += 1; },
      r => { r.changes[0].beforeBase64 = Buffer.from('unreviewed').toString('base64'); },
      r => { r.changes[0].afterBase64 = Buffer.from('unreviewed').toString('base64'); },
      r => { r.changes[0].offsetAfter = -1; },
      r => { r.changes[0].offsetAfter = current.length + 1; },
      r => { r.changes[0].offsetAfter = 0.5; }
    ]) {
      const bad = structuredClone(row); mutate(bad);
      a.throws(() => P.withoutFile(file, current, [bad]), file);
    }
    a.deepEqual(P.withoutFile('unlisted/' + file, current), current, 'unlisted files are never hidden');
  }
});

function metadataTests(name, inverse, records) {
  const file = metadataPath(name), input = JSON.parse(require('./helpers/recovery-published-baseline-projection.cjs').projectFile(file, read(file))), original = JSON.stringify(input);
  const prior = inverse(input);
  a.deepEqual(prior, JSON.parse(P.withoutFile(file, require('./helpers/recovery-published-baseline-projection.cjs').projectFile(file, read(file)))), 'structural inverse equals reviewed byte predecessor');
  a.equal(JSON.stringify(input), original);
  a.deepEqual(inverse(prior), prior);
  const unrelated = structuredClone(input); unrelated.unreviewed = {science: 'must remain visible'};
  a.deepEqual(inverse(unrelated).unreviewed, unrelated.unreviewed);
  for (const record of records) {
    const duplicate = structuredClone(input); duplicate[record.collection].push(structuredClone(duplicate[record.collection].find(row => row.id === record.id)));
    a.throws(() => inverse(duplicate), /one OTFS statistical metadata identity/);
    const missing = structuredClone(input); missing[record.collection] = missing[record.collection].filter(row => row.id !== record.id);
    a.throws(() => inverse(missing), /one OTFS statistical metadata identity/);
    const changedElsewhere = structuredClone(input); changedElsewhere[record.collection].find(row => row.id === record.id).unrelatedScientificMutation = true;
    a.equal(inverse(changedElsewhere)[record.collection].find(row => row.id === record.id).unrelatedScientificMutation, true);
    for (const change of record.changes) for (const mode of ['missing', 'changed', 'mixed']) {
      const bad = structuredClone(input); let parent = bad[record.collection].find(row => row.id === record.id);
      for (const key of change.path.slice(0, -1)) parent = parent[key];
      const key = change.path.at(-1);
      if (mode === 'missing') delete parent[key];
      if (mode === 'changed') parent[key] = {unreviewed: undefined};
      if (mode === 'mixed') parent[key] = structuredClone(change.before);
      a.throws(() => inverse(bad), record.id + ' ' + mode);
    }
    const duplicateLeaf = structuredClone(records); duplicateLeaf.find(row => row.id === record.id).changes.push(structuredClone(record.changes[0]));
    a.throws(() => inverse(input, duplicateLeaf), /unique OTFS statistical metadata leaf/);
  }
}
test('OTFS statistical registry inverse restores only exact canonical leaves and rejects mixed endpoints', () => metadataTests('registry.json', P.withoutRegistry, P.delta.registryChanges));
test('OTFS statistical guide inverse restores only exact canonical leaves and rejects mixed endpoints', () => metadataTests('research-guides.json', P.withoutGuides, P.delta.guideChanges));

test('OTFS statistical contract inverse preserves live old profiles and rejects changed or partial additions', () => {
  const input = JSON.parse(require('./helpers/recovery-published-baseline-projection.cjs').projectFile('scripts/build/module-runtime-contracts.json', read('scripts/build/module-runtime-contracts.json'))), original = JSON.stringify(input);
  const prior = P.withoutContracts(input);
  a.equal(prior.modules.length, P.delta.priorModuleCount);
  a.deepEqual(prior.modules, input.modules.slice(0, P.delta.priorModuleCount));
  a.equal(JSON.stringify(input), original); a.deepEqual(P.withoutContracts(prior), prior);
  const oldMutation = structuredClone(input); oldMutation.modules[0].sha256 = '0'.repeat(64);
  a.equal(P.withoutContracts(oldMutation).modules[0].sha256, '0'.repeat(64), 'old science is still guarded by old contracts');
  for (const row of P.delta.addedModuleProfiles) for (const mode of ['missing', 'duplicate', 'changed']) {
    const bad = structuredClone(input), at = bad.modules.findIndex(item => item.public === row.public);
    if (mode === 'missing') bad.modules.splice(at, 1);
    if (mode === 'duplicate') bad.modules.push(structuredClone(row));
    if (mode === 'changed') bad.modules[at].sha256 = '0'.repeat(64);
    a.throws(() => P.withoutContracts(bad));
  }
  const reordered = structuredClone(input); reordered.modules.reverse(); a.throws(() => P.withoutContracts(reordered));
});

test('OTFS statistical mapping inverse binds the exact prior inventory and rejects altered additions', () => {
  if (!sourceLayout) return; // Old-layout staging never contains this source-only manifest.
  const input = JSON.parse(require('./helpers/recovery-published-baseline-projection.cjs').projectFile('build/compatibility-manifest.json', read('build/compatibility-manifest.json'))), original = JSON.stringify(input);
  const prior = P.withoutMappings(input);
  a.equal(P.sha(JSON.stringify(prior, null, 2) + '\n'), P.delta.priorManifestSha256);
  a.deepEqual(P.withoutMappings(prior), prior); a.equal(JSON.stringify(input), original);
  for (const [key, rows, identityKey] of [['entries', P.delta.addedEntries, 'source'], ['owners', P.delta.addedOwners, 'id']]) {
    for (const row of rows) for (const mode of ['missing', 'duplicate', 'changed']) {
      const bad = structuredClone(input), at = bad[key].findIndex(item => item[identityKey] === row[identityKey]);
      if (mode === 'missing') bad[key].splice(at, 1);
      if (mode === 'duplicate') bad[key].push(structuredClone(row));
      if (mode === 'changed') bad[key][at].unreviewed = true;
      a.throws(() => P.withoutMappings(bad));
    }
  }
  const oldMutation = structuredClone(input); oldMutation.entries[0].owner = 'unreviewed'; a.throws(() => P.withoutMappings(oldMutation));
});

test('OTFS statistical integration leaves every frozen historical JSON byte-exact', () => {
  for (const row of P.delta.preservedHistoricalJSONs) {
    if (!sourceLayout && row.compatibility === null) continue;
    const bytes = read(sourceLayout ? row.path : row.compatibility);
    a.equal(bytes.length, row.bytes, row.path); a.equal(P.sha(bytes), row.sha256, row.path);
  }
});

test('OTFS statistical historical projection never replaces current runtime and scientific gate inputs', () => {
  const candidates = ['scripts/build/compatibility.cjs', 'scripts/build/module-dependencies.cjs', 'scripts/site/generate-site.cjs', 'scripts/generate-site.cjs', 'tests/otfs-statistical-extension.test.cjs'];
  for (const file of candidates) if (fs.existsSync(path.join(root, file))) a.ok(!read(file).includes(Buffer.from('otfs-statistical-preservation')), file);
  const page = read(sourceLayout ? 'content/pages/otfs-receiver.html' : 'otfs-receiver.html').toString();
  a.match(page, /otfs-receiver\/statistics\/statistics\.mjs/);
  const registry = JSON.parse(read(metadataPath('registry.json')));
  for (const record of P.delta.registryChanges) for (const change of record.changes) {
    let current = registry[record.collection].find(item => item.id === record.id);
    for (const key of change.path) current = current[key];
    a.deepEqual(current, change.after, 'current metadata remains visible');
  }
});

test('only the enumerated empty guide checkpoint is accepted without an OTFS identity', () => {
  const empty = {cards: []}, rate = require('./helpers/cooperative-rate-preservation.cjs');
  a.deepEqual(rate.withoutGuides(empty), empty); a.notEqual(rate.withoutGuides(empty), empty);
  a.throws(() => P.withoutGuides(empty), 'generic OTFS metadata guard stays strict');
  for (const bad of [{cards: [], unreviewed: true}, {cards: [{id: 'unreviewed'}]}, {}]) {
    a.throws(() => rate.withoutGuides(bad)); a.throws(() => P.withoutGuides(bad));
  }
});
