'use strict';
// Provenance-only read boundary. Current scientific/runtime gates never import
// this adapter. Every inverse binds an enumerated path and both complete hashes;
// frozen historical records remain immutable and retain their original guards.
const a = require('node:assert/strict');
const crypto = require('node:crypto');
const {isDeepStrictEqual} = require('node:util');
const delta = require('./full-duplex-delta.json');
const statistics = require('./otfs-statistical-preservation.cjs');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const identity = (bytes, record) => bytes.length === record.bytes && sha(bytes) === record.sha256;
const same = (left, right) => isDeepStrictEqual(left, right) && JSON.stringify(left) === JSON.stringify(right);

function withoutFile(file, bytes, rows = delta.files) {
  bytes = statistics.withoutFile(file, bytes);
  // Authored and generated HTML have separate identities at the same URL.
  const exact = rows.filter(row => row.path === file);
  const matches = exact.length ? exact : rows.filter(row => row.compatibility === file);
  a.ok(matches.length <= 1, 'unique full-duplex inverse: ' + file);
  if (!matches.length) return bytes;
  const row = matches[0];
  if ([row.before, ...(row.historicalIntermediates || [])].some(record => identity(bytes, record))) return bytes;
  a.ok(identity(bytes, row.after), 'exact full-duplex current endpoint: ' + file);
  let prior = Buffer.from(bytes);
  for (const change of [...row.changes].reverse()) {
    const before = Buffer.from(change.beforeBase64, 'base64');
    const after = Buffer.from(change.afterBase64, 'base64');
    const at = change.offsetAfter;
    a.ok(Number.isSafeInteger(at) && at >= 0 && at + after.length <= prior.length, 'bounded full-duplex byte edit');
    a.deepEqual(prior.subarray(at, at + after.length), after, 'exact full-duplex byte edit');
    prior = Buffer.concat([prior.subarray(0, at), before, prior.subarray(at + after.length)]);
  }
  a.ok(identity(prior, row.before), 'exact full-duplex predecessor: ' + file);
  return prior;
}

function withoutRegistry(input) {
  const out = statistics.withoutRegistry(input), states = [];
  for (const record of delta.registryChanges) {
    const rows = out[record.collection];
    a.ok(Array.isArray(rows), 'full-duplex registry collection');
    const matches = rows.filter(row => row.id === record.id);
    a.equal(matches.length, 1, 'one full-duplex registry identity');
    const item = matches[0];
    for (const change of record.changes) {
      a.ok(change.path.length > 0, 'bounded full-duplex registry path');
      let parent = item;
      for (const key of change.path.slice(0, -1)) {
        a.ok(parent && Object.hasOwn(parent, key), 'full-duplex registry parent');
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
  for (const row of delta.registryAdditions) {
    const rows = out[row.key];
    const identify = item => row.identityKeys.every(key => item && same(item[key], row.value[key]));
    const matches = Array.isArray(rows) ? rows.filter(identify) : [];
    states.push({
      prior: matches.length === 0,
      current: Array.isArray(rows) && rows.length === row.priorLength + 1 && matches.length === 1 && same(rows[row.priorLength], row.value),
      restore() { rows.splice(row.priorLength, 1); }
    });
  }
  if (states.every(state => state.prior)) return out;
  a.ok(states.every(state => state.current), 'complete exact full-duplex registry endpoint');
  for (const state of [...states].reverse()) state.restore();
  return out;
}

function withoutMappings(input) {
  const out = statistics.withoutMappings(input);
  if (!delta.addedEntries.some(row => out.entries.some(item => item.source === row.source)) &&
      !delta.addedOwners.some(row => out.owners.some(item => item.id === row.id))) return out;
  for (const [key, rows, identityKey] of [['entries', delta.addedEntries, 'source'], ['owners', delta.addedOwners, 'id']]) {
    for (const row of rows) {
      const indexes = out[key].flatMap((item, index) => item[identityKey] === row[identityKey] ? [index] : []);
      a.equal(indexes.length, 1, 'one exact full-duplex ' + key + ': ' + row[identityKey]);
      a.ok(same(out[key][indexes[0]], row), 'exact full-duplex ' + key + ' addition');
      out[key].splice(indexes[0], 1);
    }
  }
  a.equal(sha(JSON.stringify(out, null, 2) + '\n'), delta.priorManifestSha256, 'exact pre-full-duplex manifest');
  return out;
}

function withoutContracts(input) {
  const out = statistics.withoutContracts(input), rows = delta.addedModuleProfiles;
  if (!rows.some(row => out.modules.some(item => item.public === row.public))) return out;
  a.equal(out.modules.length, delta.priorModuleCount + rows.length, 'complete full-duplex module inventory');
  a.ok(same(out.modules.slice(delta.priorModuleCount), rows), 'exact full-duplex appended profiles');
  out.modules.splice(delta.priorModuleCount);
  return out;
}

function withoutTutorials(input) {
  const out = structuredClone(input), record = delta.tutorialChanges;
  const bytes = Buffer.from(JSON.stringify(out));
  if ([record.before, ...(record.historicalIntermediates || [])].some(row => identity(bytes, row))) return out;
  a.ok(identity(bytes, record.after), 'exact full-duplex current tutorial inventory');
  for (const row of record.added) {
    const indexes = out.flatMap((item, index) => same(item, row) ? [index] : []);
    a.equal(indexes.length, 1, 'one exact full-duplex tutorial addition');
    out.splice(indexes[0], 1);
  }
  a.ok(identity(Buffer.from(JSON.stringify(out)), record.before), 'exact pre-full-duplex tutorial inventory');
  return out;
}

module.exports = {delta, sha, identity, withoutFile, withoutRegistry, withoutMappings, withoutContracts, withoutTutorials};
