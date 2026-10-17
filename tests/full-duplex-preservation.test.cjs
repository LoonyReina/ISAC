'use strict';
// Historical evidence is checked independently of the current runtime contract.
const {test} = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('./helpers/full-duplex-preservation.cjs');
const root = path.resolve(__dirname, '..');
const sourceLayout = fs.existsSync(path.join(root, 'content/data/registry.json'));
const locate = row => path.join(root, sourceLayout ? row.path : row.compatibility);
const read = file => fs.readFileSync(path.join(root, file));
const registry = () => JSON.parse(read(sourceLayout ? 'content/data/registry.json' : 'site/registry.json'));

test('full-duplex inverse binds complete current and predecessor bytes and rejects unreviewed deltas', () => {
  for (const row of P.delta.files) {
    const file = locate(row);
    if (!fs.existsSync(file)) { a.ok(sourceLayout && row.generated || !sourceLayout && row.sourceOnly, row.path); continue; }
    // Generated and authored page records have one compatibility URL; evaluate
    // authored records only in source layout and generated records in staging.
    if (!sourceLayout && row.authored) continue;
    const current = fs.readFileSync(file), original = Buffer.from(current);
    const key = sourceLayout ? row.path : row.compatibility;
    const prior = P.withoutFile(key, current);
    a.ok(P.identity(prior, row.before), row.path);
    a.deepEqual(current, original, 'inverse does not mutate input');
    a.deepEqual(P.withoutFile(key, prior), prior, 'idempotent exact predecessor');
    for (const bad of [current.subarray(1), Buffer.concat([current, Buffer.from('unreviewed')])]) a.throws(() => P.withoutFile(key, bad));
    a.throws(() => P.withoutFile(key, current, [row, row]));
    for (const mutate of [
      r => { r.after.sha256 = '0'.repeat(64); },
      r => { r.before.sha256 = '0'.repeat(64); },
      r => { r.changes[0].beforeBase64 = Buffer.from('unreviewed').toString('base64'); },
      r => { r.changes[0].afterBase64 = Buffer.from('unreviewed').toString('base64'); },
      r => { r.changes[0].offsetAfter = -1; }
    ]) { const bad = structuredClone(row); mutate(bad); a.throws(() => P.withoutFile(key, current, [bad])); }
    a.deepEqual(P.withoutFile('unlisted/' + key, current), current);
  }
});

test('full-duplex registry inverse is leaf-scoped and rejects partial duplicate or altered additions', () => {
  const input = registry(), prior = P.withoutRegistry(input);
  const registryPath = sourceLayout ? 'content/data/registry.json' : 'site/registry.json';
  a.deepEqual(prior, JSON.parse(P.withoutFile(registryPath, read(registryPath))));
  a.deepEqual(P.withoutRegistry(prior), prior);
  const unrelated = structuredClone(input); unrelated.unrelated = {retain: true};
  a.deepEqual(P.withoutRegistry(unrelated).unrelated, unrelated.unrelated);
  for (const row of P.delta.registryAdditions) for (const mode of ['missing', 'duplicate', 'changed']) {
    const bad = structuredClone(input), values = bad[row.key];
    if (mode === 'missing') values.splice(row.priorLength, 1);
    if (mode === 'duplicate') values.push(structuredClone(row.value));
    if (mode === 'changed') values[row.priorLength].unreviewed = true;
    a.throws(() => P.withoutRegistry(bad), row.key + ' ' + mode);
  }
  for (const row of P.delta.registryChanges) {
    const duplicate = structuredClone(input); duplicate[row.collection].push(structuredClone(duplicate[row.collection].find(item => item.id === row.id)));
    a.throws(() => P.withoutRegistry(duplicate));
    for (const change of row.changes) for (const mode of ['missing', 'changed']) {
      const bad = structuredClone(input); let parent = bad[row.collection].find(item => item.id === row.id);
      for (const key of change.path.slice(0, -1)) parent = parent[key];
      if (mode === 'missing') delete parent[change.path.at(-1)]; else parent[change.path.at(-1)] = {unreviewed: undefined};
      a.throws(() => P.withoutRegistry(bad));
    }
  }
});

test('full-duplex module inverse retains prior profiles and rejects partial or modified appended profiles', () => {
  const input = JSON.parse(read('scripts/build/module-runtime-contracts.json'));
  const original = JSON.stringify(input), prior = P.withoutContracts(input);
  a.equal(prior.modules.length, P.delta.priorModuleCount);
  a.deepEqual(prior.modules, input.modules.slice(0, P.delta.priorModuleCount));
  a.equal(JSON.stringify(input), original);
  a.deepEqual(P.withoutContracts(prior), prior);
  for (const row of P.delta.addedModuleProfiles) for (const mode of ['missing', 'duplicate', 'changed']) {
    const bad = structuredClone(input), at = bad.modules.findIndex(item => item.public === row.public);
    if (mode === 'missing') bad.modules.splice(at, 1);
    if (mode === 'duplicate') bad.modules.push(structuredClone(row));
    if (mode === 'changed') bad.modules[at].sha256 = '0'.repeat(64);
    a.throws(() => P.withoutContracts(bad));
  }
});

test('full-duplex mapping inverse retains exact predecessor inventory and rejects partial additions', () => {
  if (!sourceLayout) return; // The build manifest is not an old-layout input.
  const input = JSON.parse(read('build/compatibility-manifest.json'));
  const prior = P.withoutMappings(input);
  a.equal(P.sha(JSON.stringify(prior, null, 2) + '\n'), P.delta.priorManifestSha256);
  a.deepEqual(P.withoutMappings(prior), prior);
  for (const [key, rows, id] of [['entries', P.delta.addedEntries, 'source'], ['owners', P.delta.addedOwners, 'id']]) {
    for (const row of rows) for (const mode of ['missing', 'duplicate', 'changed']) {
      const bad = structuredClone(input), at = bad[key].findIndex(item => item[id] === row[id]);
      if (mode === 'missing') bad[key].splice(at, 1);
      if (mode === 'duplicate') bad[key].push(structuredClone(row));
      if (mode === 'changed') bad[key][at].unreviewed = true;
      a.throws(() => P.withoutMappings(bad));
    }
  }
});

test('full-duplex tutorial inverse preserves every prior route and rejects altered current inventory', () => {
  const load = name => JSON.parse(read((sourceLayout ? 'content/data/' : 'site/') + name));
  const B = require(sourceLayout ? '../scripts/site/research-tree.cjs' : '../scripts/research-tree.cjs');
  const tree = B.buildResearchTree(registry(), load('research-guides.json'), load('research-directory.json'), JSON.parse(read('docs/PAPER-EXECUTION-BACKLOG.json')));
  const input = tree.papers.flatMap(paper => paper.tutorials.map(item => ({id: paper.id, href: item.href, kind: item.kind})));
  a.ok(P.identity(Buffer.from(JSON.stringify(input)), P.delta.tutorialChanges.after));
  const prior = P.withoutTutorials(input);
  a.ok(P.identity(Buffer.from(JSON.stringify(prior)), P.delta.tutorialChanges.before));
  a.deepEqual(P.withoutTutorials(prior), prior);
  for (const row of P.delta.tutorialChanges.added) {
    const duplicate = structuredClone(input); duplicate.push(structuredClone(row)); a.throws(() => P.withoutTutorials(duplicate));
    const changed = structuredClone(input); changed.find(item => item.href === row.href).kind = 'unreviewed'; a.throws(() => P.withoutTutorials(changed));
  }
});

test('full-duplex integration leaves all frozen historical JSON evidence byte-exact', () => {
  for (const row of P.delta.preservedHistoricalJSONs) {
    if (!sourceLayout && row.compatibility === null) continue;
    const bytes = read(sourceLayout ? row.path : row.compatibility);
    a.equal(bytes.length, row.bytes, row.path);
    a.equal(P.sha(bytes), row.sha256, row.path);
  }
  for (const file of ['scripts/build/compatibility.cjs', 'scripts/build/module-dependencies.cjs']) if (sourceLayout || fs.existsSync(path.join(root, file))) a.ok(!read(file).includes(Buffer.from('full-duplex-preservation')), 'current gates never use historical inverse');
});
