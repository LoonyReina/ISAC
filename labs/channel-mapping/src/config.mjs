export const C = 299792458;
export const GENERATOR_VERSION = 'channel-mapping-portable-fnv1a-lcg32-v2';
export const CANDIDATE_VERSION = 'rebuilt-channel-mapping-v1';
export const SCENES = Object.freeze(['separated', 'delay_ambiguous', 'sensing_missing']);
export const DEFAULTS = Object.freeze({scene: 'separated', seed: 101, noise: 1, minPowerDb: -55, minSeparationNs: 2.2, minRangeM: 0.5, maxPeaksPerAngle: 4, clusterRadiusM: 0.45, associationGateNs: 0.75});
export function finiteRange(value, low, high, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) throw new RangeError(`${label} must be finite in [${low}, ${high}]`);
  return value;
}
export function integerRange(value, low, high, label) {
  finiteRange(value, low, high, label);
  if (!Number.isInteger(value)) throw new RangeError(`${label} must be an integer`);
  return value;
}
export function generatorConfig(input = {}) {
  const value = {...DEFAULTS, ...input};
  if (!SCENES.includes(value.scene)) throw new RangeError('Unknown scene');
  integerRange(value.seed, 0, 2147483647, 'seed');
  finiteRange(value.noise, 0, 3, 'noise');
  return {scene: value.scene, seed: value.seed, noise: value.noise};
}
export function inferenceConfig(input = {}) {
  const c = {...DEFAULTS, ...input};
  finiteRange(c.minPowerDb, -120, 0, 'minPowerDb');
  finiteRange(c.minSeparationNs, 0, 40, 'minSeparationNs');
  finiteRange(c.minRangeM, 0, 20, 'minRangeM');
  integerRange(c.maxPeaksPerAngle, 0, 16, 'maxPeaksPerAngle');
  finiteRange(c.clusterRadiusM, 0, 2, 'clusterRadiusM');
  finiteRange(c.associationGateNs, 0, 20, 'associationGateNs');
  return Object.fromEntries(['minPowerDb', 'minSeparationNs', 'minRangeM', 'maxPeaksPerAngle', 'clusterRadiusM', 'associationGateNs'].map(k => [k,c[k]]));
}
export function caseConfig(input = {}) { return {...generatorConfig(input), ...inferenceConfig(input)}; }
