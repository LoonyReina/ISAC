'use strict';
// Historical read boundaries only. Production dependency, scientific and UI gates
// inspect current bytes and never import this adapter. Frozen predecessors stay
// immutable; every inverse is scoped to explicit files, fields and identities.
const a = require('node:assert/strict');
const crypto = require('node:crypto');
const {isDeepStrictEqual} = require('node:util');
const delta = require('./multipath-information-integration-delta.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const identity = (bytes, record) => bytes.length === record.bytes && sha(bytes) === record.sha256;
const same = (left, right) => isDeepStrictEqual(left, right) && JSON.stringify(left) === JSON.stringify(right);

function withoutFile(file, bytes, rows = delta.files) {
  bytes = require("./cooperative-load-preservation.cjs").withoutFile(file, bytes);
  // Authored HTML and rendered HTML share a compatibility URL but have
  // distinct exact identities. Prefer an explicitly named layout endpoint.
  const exact = rows.filter(row => row.path === file);
  const matches = exact.length ? exact : rows.filter(row => row.compatibility === file);
  a.ok(matches.length <= 1, 'unique multipath inverse: ' + file);
  if (!matches.length) return bytes;
  const row = matches[0];
  if (identity(bytes, row.before) || (row.historicalIntermediates || []).some(record => identity(bytes, record))) return bytes;
  a.ok(identity(bytes, row.after), 'exact multipath current endpoint: ' + file);
  let prior = Buffer.from(bytes);
  for (const change of [...row.changes].reverse()) {
    const before = Buffer.from(change.beforeBase64, 'base64');
    const after = Buffer.from(change.afterBase64, 'base64');
    const at = change.offsetAfter;
    a.ok(Number.isSafeInteger(at) && at >= 0 && at + after.length <= prior.length, 'bounded multipath byte edit');
    a.deepEqual(prior.subarray(at, at + after.length), after, 'exact multipath byte edit');
    prior = Buffer.concat([prior.subarray(0, at), before, prior.subarray(at + after.length)]);
  }
  a.ok(identity(prior, row.before), 'exact multipath predecessor: ' + file);
  return prior;
}

function recordStates(out, records) {
  const states = [];
  for (const record of records) {
    const rows = out[record.collection];
    a.ok(Array.isArray(rows), 'multipath metadata collection: ' + record.collection);
    const matches = rows.filter(row => row.id === record.id);
    a.equal(matches.length, 1, 'one multipath metadata identity: ' + record.id);
    const item = matches[0];
    const paths = record.changes.map(change => JSON.stringify(change.path));
    a.equal(new Set(paths).size, paths.length, 'unique multipath metadata leaf');
    for (const change of record.changes) {
      a.ok(change.path.length > 0, 'bounded multipath metadata path');
      let parent = item;
      for (const part of change.path.slice(0, -1)) {
        a.ok(parent && Object.hasOwn(parent, part), 'multipath metadata parent');
        parent = parent[part];
      }
      const leaf = change.path.at(-1);
      const present = Object.hasOwn(parent, leaf);
      states.push({
        prior: change.added ? !present : present && same(parent[leaf], change.before),
        current: present && same(parent[leaf], change.after),
        restore() {
          if (change.added) delete parent[leaf];
          else parent[leaf] = structuredClone(change.before);
        }
      });
    }
  }
  return states;
}

function withoutMetadata(input, key, additions = []) {
  const out = structuredClone(input);
  const states = recordStates(out, delta.metadataChanges[key] || []);
  for (const addition of additions) {
    const rows = out[addition.key];
    const identify = row => addition.identityKeys.every(key => row && same(row[key], addition.value[key]));
    const matches = Array.isArray(rows) ? rows.filter(identify) : [];
    states.push({
      prior: matches.length === 0,
      current: Array.isArray(rows) && rows.length === addition.priorLength + 1 && matches.length === 1 && same(rows[addition.priorLength], addition.value),
      restore() { rows.splice(addition.priorLength, 1); }
    });
  }
  if (states.every(state => state.prior)) return out;
  a.ok(states.every(state => state.current), 'complete exact multipath ' + key + ' endpoint');
  for (const state of [...states].reverse()) state.restore();
  return out;
}
const withoutRegistry = input => withoutMetadata(require('./cooperative-load-preservation.cjs').withoutRegistry(input), 'registry', delta.registryAdditions);
const withoutGuides = input => withoutMetadata(require('./cooperative-rate-preservation.cjs').withoutGuides(input), 'guides');
const withoutBacklog = input => withoutMetadata(input, 'backlog');

function withoutMappings(input) {
  input = require("./cooperative-load-preservation.cjs").withoutMappings(input);
  const out = structuredClone(input);
  const added = delta.addedEntries;
  const owners = delta.addedOwners;
  if (!added.some(row => out.entries.some(item => item.source === row.source)) && !owners.some(row => out.owners.some(item => item.id === row.id))) return out;
  for (const [key, rows, identityKey] of [['entries', added, 'source'], ['owners', owners, 'id']]) {
    for (const row of rows) {
      const indexes = out[key].flatMap((item, index) => item[identityKey] === row[identityKey] ? [index] : []);
      a.equal(indexes.length, 1, 'one exact multipath ' + key + ': ' + row[identityKey]);
      a.ok(same(out[key][indexes[0]], row), 'exact multipath ' + key + ' addition');
      out[key].splice(indexes[0], 1);
    }
  }
  a.equal(sha(JSON.stringify(out, null, 2) + '\n'), delta.priorManifestSha256, 'exact pre-multipath manifest');
  return out;
}

function withoutContracts(input) {
  input = require("./cooperative-load-preservation.cjs").withoutContracts(input);
  const out = structuredClone(input);
  const rows = delta.addedModuleProfiles;
  if (!rows.some(row => out.modules.some(item => item.public === row.public))) return out;
  a.equal(out.modules.length, delta.priorModuleCount + rows.length, 'complete multipath module inventory');
  a.ok(same(out.modules.slice(delta.priorModuleCount), rows), 'exact multipath appended profiles');
  out.modules.splice(delta.priorModuleCount);
  return out;
}

function withoutTutorials(input) {
  const out = require('./cooperative-rate-preservation.cjs').withoutTutorials(input);
  const record = delta.tutorialChanges;
  const bytes = Buffer.from(JSON.stringify(out));
  if (identity(bytes, record.before)) return out;
  a.ok(identity(bytes, record.after), 'exact multipath current tutorial inventory');
  for (const row of record.added) {
    const indexes = out.flatMap((item, index) => same(item, row) ? [index] : []);
    a.equal(indexes.length, 1, 'one exact multipath tutorial addition');
    out.splice(indexes[0], 1);
  }
  a.ok(identity(Buffer.from(JSON.stringify(out)), record.before), 'exact pre-multipath tutorials');
  return out;
}

module.exports = {delta, sha, identity, withoutFile, withoutRegistry, withoutGuides, withoutBacklog, withoutMappings, withoutContracts, withoutTutorials};
