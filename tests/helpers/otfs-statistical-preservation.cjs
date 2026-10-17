'use strict';
// Provenance-only boundary for the reviewed OTFS statistical extension.
// Current generation, dependency, runtime and scientific gates read live inputs.
// Every byte inverse binds a complete current/predecessor identity and exact
// offsets; metadata inverses restore only enumerated leaves on canonical IDs.
const a = require('node:assert/strict');
const crypto = require('node:crypto');
const {isDeepStrictEqual} = require('node:util');
const delta = require('./otfs-statistical-delta.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const identity = (bytes, record) => bytes.length === record.bytes && sha(bytes) === record.sha256;
const same = (left, right) => isDeepStrictEqual(left, right) && JSON.stringify(left) === JSON.stringify(right);

function withoutFile(file, bytes, rows = delta.files) {
  const exact = rows.filter(row => row.path === file);
  const matches = exact.length ? exact : rows.filter(row => row.compatibility === file);
  a.ok(matches.length <= 1, 'unique OTFS statistical inverse: ' + file);
  if (!matches.length) return bytes;
  const row = matches[0];
  if ([row.before, ...(row.historicalIntermediates || [])].some(record => identity(bytes, record))) return bytes;
  a.ok(identity(bytes, row.after), 'exact OTFS statistical current endpoint: ' + file);
  let prior = Buffer.from(bytes);
  for (const change of [...row.changes].reverse()) {
    const before = Buffer.from(change.beforeBase64, 'base64');
    const after = Buffer.from(change.afterBase64, 'base64');
    const at = change.offsetAfter;
    a.ok(Number.isSafeInteger(at) && at >= 0 && at + after.length <= prior.length, 'bounded OTFS statistical byte edit');
    a.deepEqual(prior.subarray(at, at + after.length), after, 'exact OTFS statistical byte edit');
    prior = Buffer.concat([prior.subarray(0, at), before, prior.subarray(at + after.length)]);
  }
  a.ok(identity(prior, row.before), 'exact OTFS statistical predecessor: ' + file);
  return prior;
}

function withoutMetadata(input, records) {
  const out = structuredClone(input), states = [];
  const identities = records.map(record => JSON.stringify([record.collection, record.id]));
  a.equal(new Set(identities).size, identities.length, 'unique OTFS statistical metadata identity');
  for (const record of records) {
    const rows = out[record.collection];
    a.ok(Array.isArray(rows), 'OTFS statistical metadata collection');
    const matches = rows.filter(row => row.id === record.id);
    a.equal(matches.length, 1, 'one OTFS statistical metadata identity');
    const item = matches[0], paths = record.changes.map(change => JSON.stringify(change.path));
    a.equal(new Set(paths).size, paths.length, 'unique OTFS statistical metadata leaf');
    for (const change of record.changes) {
      a.ok(Array.isArray(change.path) && change.path.length > 0, 'bounded OTFS statistical metadata path');
      let parent = item;
      for (const key of change.path.slice(0, -1)) {
        a.ok(parent && Object.hasOwn(parent, key), 'OTFS statistical metadata parent');
        parent = parent[key];
      }
      const key = change.path.at(-1), present = Object.hasOwn(parent, key);
      states.push({
        prior: change.added ? !present : present && same(parent[key], change.before),
        current: present && same(parent[key], change.after),
        restore() { if (change.added) delete parent[key]; else parent[key] = structuredClone(change.before); }
      });
    }
  }
  if (states.every(state => state.prior)) return out;
  a.ok(states.every(state => state.current), 'complete exact OTFS statistical metadata endpoint');
  for (const state of states) state.restore();
  return out;
}
const withoutRegistry = (input, records = delta.registryChanges) => withoutMetadata(input, records);
const withoutGuides = (input, records = delta.guideChanges) => withoutMetadata(input, records);

function withoutMappings(input) {
  const out = structuredClone(input);
  if (!delta.addedEntries.some(row => out.entries.some(item => item.source === row.source)) &&
      !delta.addedOwners.some(row => out.owners.some(item => item.id === row.id))) return out;
  for (const [key, rows, identityKey] of [['entries', delta.addedEntries, 'source'], ['owners', delta.addedOwners, 'id']]) {
    for (const row of rows) {
      const indexes = out[key].flatMap((item, index) => item[identityKey] === row[identityKey] ? [index] : []);
      a.equal(indexes.length, 1, 'one exact OTFS statistical mapping: ' + row[identityKey]);
      a.ok(same(out[key][indexes[0]], row), 'exact OTFS statistical mapping addition');
      out[key].splice(indexes[0], 1);
    }
  }
  a.equal(sha(JSON.stringify(out, null, 2) + '\n'), delta.priorManifestSha256, 'exact pre-statistical manifest');
  return out;
}

function withoutContracts(input) {
  const out = structuredClone(input), rows = delta.addedModuleProfiles;
  if (!rows.some(row => out.modules.some(item => item.public === row.public))) return out;
  a.equal(out.modules.length, delta.priorModuleCount + rows.length, 'complete OTFS statistical module inventory');
  a.ok(same(out.modules.slice(delta.priorModuleCount), rows), 'exact OTFS statistical appended profiles');
  out.modules.splice(delta.priorModuleCount);
  return out;
}
module.exports = {delta, sha, identity, withoutFile, withoutMetadata, withoutRegistry, withoutGuides, withoutMappings, withoutContracts};
