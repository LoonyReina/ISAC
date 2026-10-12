// Independent reviewer harness. Calls the actual exported core; no solver copy.
'use strict';
const fs = require('node:fs'),path=require('node:path');
const siteRoot=path.resolve(__dirname,'../../../..'),core=fs.existsSync(path.join(siteRoot,'nearfield-gc-sage-core.js'))?path.join(siteRoot,'nearfield-gc-sage-core.js'):path.join(siteRoot,'labs/near-field/nearfield-gc-sage-core.js');
const G = require(core);
const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
let result;
if (payload.action === 'joint') {
  result = G.jointGains(payload.design, payload.observations);
} else {
  const input = G.fromFixture(payload);
  const initial = G.initialize(input.observations, input.model, input.options);
  result = {initial_delays_ns: initial.reference_delays_ns,
    observation_sha256: initial.observation_sha256, methods: {}};
  for (const mode of ['scattering', 'hybrid']) {
    const fit = G.fit(input.observations, input.model, mode, input.options, initial);
    result.methods[mode] = {states: fit.states.map(s => ({kind:s.kind,
      reference_delay:s.reference_delay, delays:s.delays, gains:s.gains,
      point:s.point, normal:s.normal, bounce_points:s.bounce_points})),
      trace:fit.trace, budget:fit.budget, prediction:fit.prediction,
      converged:fit.converged, stopping_reason:fit.stopping_reason};
  }
}
process.stdout.write(JSON.stringify(G.serializable(result)));
