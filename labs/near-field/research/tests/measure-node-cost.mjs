// One Node observation, not a latency guarantee and not an actual browser test.
import {ResearchController,fieldsFromSpec} from '../controller.mjs';
import {realizeAcceptedCovariance,auditRawChain} from '../runtime/src/adapter.mjs';
const now=()=>performance.now(),c=new ResearchController();
try{
 let t=now();const result=await c.action('solve'),totalSolveObserveMs=now()-t;if(result.status!=='observation_ready')throw Error(result.status);
 t=now();const realization=realizeAcceptedCovariance(c.experiment.spec.designInput,c.experiment.solution),synchronousFiniteXRecheckMs=now()-t;
 const bundle=c.experiment.bundle();t=now();const audit=auditRawChain(bundle.spec.designInput,bundle.spec.scene,bundle.raw),synchronousRawAuditMs=now()-t;
 const fields=fieldsFromSpec(c.experiment.spec).receiver;fields.stepM=.08;c.edit('receiver',fields,['stepM']);t=now();const receiver=await c.action('receive'),receiverTotalMs=now()-t;
 t=now();const record=c.export('full'),exportMs=now()-t;const bytes=new TextEncoder().encode(record).length;
 console.log(JSON.stringify({kind:'single_Node_timing_observation',date:'2026-10-12',node:process.version,source:'arxiv:2302.01153v5',N:65,K:4,T:256,totalSolveObserveMs,synchronousFiniteXRecheckMs,synchronousRawAuditMs,finiteXPassed:realization.report.passed,auditPassed:audit.passed,workerSolver:c.experiment.solution.worker,receiverStatus:receiver.status,gridPoints:receiver.domain?.count,receiverTotalMs,receiverTimings:receiver.timings,exportMs,exportUtf8Bytes:bytes,warning:'Single observed Node run only. finite-X, raw audit, import/export and rendering remain synchronous in caller. No browser responsiveness, percentile, or hard cancellation/deadline claim.'},null,2));
}finally{await c.close();}
