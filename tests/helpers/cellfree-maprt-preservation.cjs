'use strict';
// Exact inverse of the bounded Cell-free MAPRT metadata integration. The prior
// paper identity and every unrelated field remain observable to older checks.
const assert = require('node:assert/strict');
const baseline = require('./cellfree-maprt-baseline.json');
const {changes, suffixes} = baseline;

function reverse(input, records) {
  const out = structuredClone(input);
  for (const change of [...records].reverse()) {
    let parent = out;
    for (const key of change.path.slice(0, -1)) {
      assert.ok(parent && Object.hasOwn(parent, key), 'Cellfree reviewed parent: ' + change.path.join('.'));
      parent = parent[key];
    }
    const key = change.path.at(-1);
    assert.ok(parent && Object.hasOwn(parent, key), 'Cellfree reviewed field: ' + change.path.join('.'));
    if (change.append) {
      assert.ok(Array.isArray(parent[key]), 'Cellfree append target is an array');
      assert.ok(parent[key].length >= change.lengthBefore + change.append.length, 'Cellfree append is present');
      assert.deepEqual(parent[key].slice(change.lengthBefore, change.lengthBefore + change.append.length), change.append,
        'exact Cellfree append: ' + change.path.join('.'));
      for (const item of change.append) {
        const identity = item && typeof item === 'object'
          ? ['id', 'path', 'href', 'paperId'].find(field => Object.hasOwn(item, field)) : null;
        const matches = parent[key].filter(value => identity
          ? value && value[identity] === item[identity] : value === item);
        assert.equal(matches.length, 1, 'one Cellfree appended identity: ' + change.path.join('.'));
      }
      parent[key].splice(change.lengthBefore, change.append.length);
    } else {
      assert.deepEqual(parent[key], change.after, 'exact Cellfree field: ' + change.path.join('.'));
      if (change.added) delete parent[key];
      else parent[key] = structuredClone(change.before);
    }
  }
  return out;
}

const withoutCellfreeRegistry = registry => reverse(registry, changes.registry);
const withoutCellfreeBacklog = backlog => reverse(backlog, changes.backlog);
const hasCellfree = input => JSON.stringify(input).includes('cellfree-maprt');
const maybeWithoutCellfreeRegistry = registry => hasCellfree(registry)
  ? withoutCellfreeRegistry(registry) : structuredClone(registry);
const maybeWithoutCellfreeBacklog = backlog => hasCellfree(backlog)
  ? withoutCellfreeBacklog(backlog) : structuredClone(backlog);

function suffix(text, key) {
  assert.ok(text.endsWith(suffixes[key]), 'exact appended Cellfree ' + key);
  assert.equal(text.split(suffixes[key]).length, 2, 'one appended Cellfree ' + key);
  return text.slice(0, -suffixes[key].length);
}
const withoutCellfreeReadingMap = text => suffix(text, 'readingMap');
const withoutCellfreePlan = text => suffix(text, 'plan');
const maybeWithoutCellfreeReadingMap = text => text.includes(suffixes.readingMap)
  ? withoutCellfreeReadingMap(text) : text;
const maybeWithoutCellfreePlan = text => text.includes(suffixes.plan)
  ? withoutCellfreePlan(text) : text;

module.exports = {
  baseline, changes, suffixes, reverse,
  withoutCellfreeRegistry, withoutCellfreeBacklog,
  maybeWithoutCellfreeRegistry, maybeWithoutCellfreeBacklog,
  withoutCellfreeReadingMap, withoutCellfreePlan,
  maybeWithoutCellfreeReadingMap, maybeWithoutCellfreePlan
};
