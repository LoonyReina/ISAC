/* Strict standalone 802.11ad Worker protocol. No numerical work or transport. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AdWorkerProtocol = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var limits = Object.freeze({ maxMessageBytes: 100 * 1024 * 1024, maxNodes: 4100000,
    maxDepth: 12, maxRequests: 10000, maxSamples: 2000000, maxMapCells: 262144,
    maxIdLength: 128, generationWallMs: 30000 });
  var configFields = ['frames', 'frame_chips', 'oversample', 'max_delay_chips',
    'pulse_halfspan_chips', 'scnr_db', 'seed', 'rotation', 'oscillator_hz',
    'fs_hz', 'carrier_hz', 'stf_threshold', 'pfa_family', 'fractional_phase'];
  function fail(code, message) { var e = new Error(message); e.code = code; throw e; }
  function validId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id); }
  function record(x) {
    if (x === null || typeof x !== 'object' || Object.prototype.toString.call(x) !== '[object Object]') return false;
    var p = Object.getPrototypeOf(x);
    return p === null || Object.getPrototypeOf(p) === null;
  }
  function keys(x, allowed, required, label) {
    if (!record(x)) fail('INVALID_INPUT', label + ' must be a plain object');
    var own = Reflect.ownKeys(x);
    for (var k of own) {
      if (typeof k !== 'string' || allowed.indexOf(k) < 0) fail('UNKNOWN_FIELD', label + ' contains an unknown field');
      var d = Object.getOwnPropertyDescriptor(x, k);
      if (!d || !('value' in d) || !d.enumerable) fail('INVALID_INPUT', label + ' must contain enumerable data properties');
    }
    for (var r of required || []) if (!Object.prototype.hasOwnProperty.call(x, r)) fail('MISSING_FIELD', label + '.' + r + ' is required');
  }
  // Transport cloning happens before the Worker receives a message. These bounds
  // prevent subsequent normalization/numerical allocations, not that first clone.
  // Arrays are traversed without creating an additional array of all their keys.
  function preflight(input) {
    var seen = new Set(), bytes = 0, nodes = 0;
    function visit(x, depth) {
      if (++nodes > limits.maxNodes || depth > limits.maxDepth) fail('INPUT_LIMIT', 'Message exceeds structural limits');
      if (x === null || typeof x === 'boolean') bytes += 8;
      else if (typeof x === 'number') {
        if (!Number.isFinite(x)) fail('INVALID_INPUT', 'All input numbers must be finite');
        bytes += 8;
      } else if (typeof x === 'string') {
        if (x.length > 1024) fail('INPUT_LIMIT', 'Individual input strings are limited to 1024 characters');
        bytes += x.length * 2;
      } else if (typeof x === 'object') {
        if (seen.has(x)) fail('INVALID_INPUT', 'Message must be an acyclic tree without shared objects');
        seen.add(x);
        if (ArrayBuffer.isView(x)) {
          if (Object.prototype.toString.call(x) !== '[object Float64Array]' ||
              Object.prototype.toString.call(x.buffer) !== '[object ArrayBuffer]')
            fail('INVALID_INPUT', 'Only nonshared Float64Array input views are supported');
          bytes += x.byteLength;
          if (x.length > limits.maxSamples) fail('INPUT_LIMIT', 'An input vector exceeds the sample limit');
          for (var i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) fail('INVALID_INPUT', 'Input arrays must be finite');
        } else if (Array.isArray(x)) {
          if (x.length > limits.maxSamples * 2 || x.length + nodes > limits.maxNodes) fail('INPUT_LIMIT', 'Input array exceeds structural limits');
          bytes += 8;
          for (var j = 0; j < x.length; j++) {
            var desc = Object.getOwnPropertyDescriptor(x, String(j));
            if (!desc || !('value' in desc)) fail('INVALID_INPUT', 'Arrays must be dense and contain data properties');
            visit(desc.value, depth + 1);
          }
          for (var key in x) if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= x.length)
            fail('INVALID_INPUT', 'Arrays cannot have additional properties');
          if (Object.getOwnPropertySymbols(x).length) fail('INVALID_INPUT', 'Arrays cannot have symbol properties');
        } else {
          if (!record(x)) fail('INVALID_INPUT', 'Unsupported input object');
          var names = Reflect.ownKeys(x);
          if (names.length > 32) fail('INPUT_LIMIT', 'Input object has too many fields');
          bytes += 8;
          for (var name of names) {
            if (typeof name !== 'string' || name.length > 128) fail('INVALID_INPUT', 'Invalid input field');
            var d = Object.getOwnPropertyDescriptor(x, name);
            if (!d || !('value' in d) || !d.enumerable) fail('INVALID_INPUT', 'Input properties must be enumerable data');
            bytes += name.length * 2;
            visit(d.value, depth + 1);
          }
        }
      } else fail('INVALID_INPUT', 'Unsupported input value');
      if (bytes > limits.maxMessageBytes) fail('INPUT_LIMIT', 'Message exceeds the 100 MiB preflight budget');
    }
    visit(input, 0);
    return { bytes: bytes, nodes: nodes };
  }
  function config(x, kernel) {
    keys(x, configFields, [], 'config');
    var c = kernel.validateConfig(x);
    var samplesPerFrame = (3328 + c.max_delay_chips + 128 + 2 * c.pulse_halfspan_chips) * c.oversample + 1;
    if (!Number.isSafeInteger(samplesPerFrame) || samplesPerFrame * c.frames > limits.maxSamples)
      fail('SAMPLE_LIMIT', 'Configuration exceeds the 2,000,000 complex sample limit');
    return c;
  }
  function observation(x, kernel) {
    keys(x, ['config', 'samples', 'noise_variance', 'start_chip', 'pulse_noise_filter', 'provenance'],
      ['config', 'samples', 'noise_variance', 'start_chip', 'pulse_noise_filter', 'provenance'], 'observation');
    config(x.config, kernel);
    keys(x.provenance, ['model', 'truth_in_receiver', 'synthetic', 'standard_compliance', 'pre_payload_only', 'noisy', 'rng'],
      ['model', 'truth_in_receiver', 'synthetic', 'standard_compliance', 'pre_payload_only', 'noisy'], 'observation.provenance');
    if (x.provenance.truth_in_receiver !== false) fail('TRUTH_FORBIDDEN', 'Observation provenance must declare truth_in_receiver:false');
    if (!Array.isArray(x.samples)) fail('INVALID_INPUT', 'observation.samples must be an array of complex rows');
    for (var row of x.samples) keys(row, ['real', 'imag'], ['real', 'imag'], 'observation.samples row');
    return kernel.validateObservation(x);
  }
  function options(x, c) {
    x = x === undefined ? {} : x;
    keys(x, ['nfft', 'max_wall_ms', 'stf_threshold', 'pfa_family', 'fractional_phase'], [], 'options');
    var nfft = x.nfft === undefined ? c.frames : x.nfft;
    var wall = x.max_wall_ms === undefined ? 30000 : x.max_wall_ms;
    if (!Number.isInteger(nfft) || nfft < c.frames || nfft > 256) fail('INVALID_OPTIONS', 'nfft must be an integer from frames through 256');
    if (!Number.isInteger(wall) || wall < 10 || wall > 120000) fail('INVALID_OPTIONS', 'max_wall_ms must be an integer from 10 through 120000');
    if (c.frames > 1 && (c.max_delay_chips + 1) * nfft > limits.maxMapCells) fail('MAP_LIMIT', 'Request exceeds the 262,144 map-cell limit');
    var result = { nfft: nfft, max_wall_ms: wall };
    if (x.stf_threshold !== undefined) {
      if (typeof x.stf_threshold !== 'number' || !Number.isFinite(x.stf_threshold) || x.stf_threshold < Number.EPSILON || x.stf_threshold > 1 - Number.EPSILON)
        fail('INVALID_OPTIONS', 'stf_threshold must be finite, at least epsilon and at most 1-epsilon');
      result.stf_threshold = x.stf_threshold;
    }
    if (x.pfa_family !== undefined) {
      if (typeof x.pfa_family !== 'number' || !Number.isFinite(x.pfa_family) || x.pfa_family < 1e-12 || x.pfa_family > 1 - Number.EPSILON)
        fail('INVALID_OPTIONS', 'pfa_family must be finite from 1e-12 through 1-epsilon');
      result.pfa_family = x.pfa_family;
    }
    if (x.fractional_phase !== undefined) {
      if (typeof x.fractional_phase !== 'boolean') fail('INVALID_OPTIONS', 'fractional_phase must be boolean');
      result.fractional_phase = x.fractional_phase;
    }
    return result;
  }
  function request(x, kernel, held) {
    keys(x, ['id', 'type', 'config', 'targets', 'noise', 'observation', 'observationId', 'options', 'targetId', 'expected_hashes'], ['id', 'type'], 'message');
    if (!validId(x.id)) fail('INVALID_ID', 'id must be 1–128 ASCII letters, digits, underscore, dot, colon or dash, starting with a letter or digit');
    var fields = { generate: ['config', 'targets', 'noise'], process: ['observationId', 'options'],
      import: ['observation', 'expected_hashes'], export: ['observationId'], release: [], cancel: ['targetId'] };
    if (typeof x.type !== 'string' || !Object.prototype.hasOwnProperty.call(fields, x.type)) fail('UNKNOWN_TYPE', 'Unsupported request type');
    keys(x, ['id', 'type'].concat(fields[x.type]), ['id', 'type'], 'message');
    preflight(x);
    var out = { id: x.id, type: x.type };
    if (x.type === 'generate') {
      out.config = config(x.config, kernel);
      if (!Array.isArray(x.targets) || x.targets.length > 8) fail('INVALID_TARGETS', 'targets must contain 0–8 generation-only targets');
      for (var target of x.targets) {
        keys(target, ['range_m', 'velocity_mps', 'gain'], ['range_m', 'velocity_mps'], 'target');
        if (target.gain !== undefined) keys(target.gain, ['real', 'imag'], ['real', 'imag'], 'target.gain');
      }
      out.targets = kernel.validateTargets(out.config, x.targets);
      if (x.noise !== undefined && typeof x.noise !== 'boolean') fail('INVALID_INPUT', 'noise must be boolean');
      out.noise = x.noise === undefined ? true : x.noise;
    } else if (x.type === 'import') {
      if (x.expected_hashes !== undefined) {
        keys(x.expected_hashes, ['observation_sha256', 'observation_metadata_sha256'], ['observation_sha256', 'observation_metadata_sha256'], 'expected_hashes');
        for (var field of ['observation_sha256', 'observation_metadata_sha256'])
          if (typeof x.expected_hashes[field] !== 'string' || !/^[0-9a-f]{64}$/.test(x.expected_hashes[field]))
            fail('INVALID_HASH', 'Expected digests must be 64 lowercase hexadecimal characters');
        out.expected_hashes = { ...x.expected_hashes };
      }
      out.observation = observation(x.observation, kernel);
    }
    else if (x.type === 'process' || x.type === 'export') {
      if (!validId(x.observationId)) fail('INVALID_OBSERVATION_ID', 'An observationId is required');
      if (!held || held.id !== x.observationId) fail('OBSERVATION_NOT_HELD', 'Requested observation is not held by this Worker');
      out.observationId = x.observationId;
      if (x.type === 'process') {
        out.options = options(x.options, held.observation.config);
        if (typeof kernel.budget === 'function') kernel.budget(held.observation.config, out.options.nfft);
      }
    } else if (x.type === 'cancel') {
      if (!validId(x.targetId)) fail('INVALID_TARGET_ID', 'cancel.targetId is required');
      out.targetId = x.targetId;
    }
    return out;
  }
  return Object.freeze({ name: '80211ad-worker-v1', limits: limits, validId: validId,
    isRecord: record, preflight: preflight, validateRequest: request, validateOptions: options });
}));
