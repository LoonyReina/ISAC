/* Actual finite-alphabet BA work. The UI terminates obsolete workers.
 * Transfer one complete selected trace, never a trace for every frontier point. */
'use strict';
let bootstrapError = null;
try { importScripts('capacity-distortion-core.js?v=finite-ba-v1'); }
catch (error) { bootstrapError = error.message; }
const MU_GRID = Object.freeze([0, .125, .25, .5, .75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]);
function assertFiniteTree(value) {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('数值核心返回了非有限数；本次结果已拒绝。');
  if (value && typeof value === 'object') Object.values(value).forEach(assertFiniteTree);
}
function summarize(r, mu) {
  return { mu, p:r.p, rateBits:r.rateBits, distortion:r.distortion, cost:r.cost, objectiveNats:r.objectiveNats,
    status:r.status, converged:r.converged, feasible:r.feasible, gapNats:r.gapNats, iterations:r.iterations,
    lambda:r.lambda, exactCostBoundary:r.exactCostBoundary || false,
    innerFallbackCount:r.trace.filter(t=>t.innerFallback).length,
    innerIterations:r.trace.reduce((s,t)=>s+t.innerIterations,0) };
}
self.onmessage = event => {
  const request = event.data || {}, token = request.token;
  if (request.type !== 'solve') return;
  try {
    if (bootstrapError || !self.CapacityDistortion) throw new Error('数值核心未能加载：' + (bootstrapError || 'missing core'));
    const C = self.CapacityDistortion, started = performance.now(), model = C.createModel(request.model);
    const selected = C.solve(model, request.settings);
    assertFiniteTree(selected);
    const risk = C.bayesRisk(model), frontier = [];
    if (selected.status !== 'infeasible_cost') {
      const mus = [...new Set([...MU_GRID, request.settings.mu])].sort((a,b)=>a-b);
      for (let index=0; index<mus.length; index++) {
        const mu = mus[index];
        const result = mu === request.settings.mu ? selected : C.solve(model, {...request.settings,mu});
        assertFiniteTree(result); frontier.push(summarize(result,mu));
        self.postMessage({type:'progress',token,completed:index+1,total:mus.length});
      }
    }
    const exactEndpoint = request.paperOverlay ? {p:[0,1],...C.metrics(model,[0,1],{mu:0}),origin:'direct-degenerate-evaluation-not-finite-mu'} : null;
    const result = {model,selected,risk,frontier,muGrid:frontier.map(p=>p.mu),exactEndpoint,algorithmVersion:C.VERSION,workerElapsedMs:performance.now()-started};
    assertFiniteTree(result);
    self.postMessage({type:'result',token,result});
  } catch (error) { self.postMessage({type:'error',token,message:error.message || String(error)}); }
};
