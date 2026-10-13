import {SCHEMA_VERSION,KERNEL_VERSION,LIMITS,KernelError,validateReceiver,validateObservation,number,vector,numericFail,energy} from './validation.mjs';
import {createTemplateOperator,physicalCoordinates,frameLedger} from './operators.mjs';
export {SCHEMA_VERSION,KERNEL_VERSION,LIMITS,KernelError,validateReceiver,inputDigest,canonicalJSON} from './validation.mjs';
const clone=x=>structuredClone(x);
/** Unknown complex hprime is profiled at every candidate. v is E|w|². */
function profile(s,y,v,{inspect=false}={}) {
  let den=0,ir=0,ii=0;for(let j=0;j<s.length;j++){den+=s[j].re*s[j].re+s[j].im*s[j].im;ir+=s[j].re*y[j].re+s[j].im*y[j].im;ii+=s[j].re*y[j].im-s[j].im*y[j].re;}
  if(!Number.isFinite(den)||!Number.isFinite(ir)||!Number.isFinite(ii))numericFail('Nonfinite template energy or matched inner product');
  if(den<=LIMITS.minTemplateEnergy)return {status:'uninformative-template',templateEnergy:den,reason:'Template energy <=1e-25; gain/profile score unavailable'};
  const gain={re:ir/den,im:ii/den},score=(ir*ir+ii*ii)/den,yhat=[],residualVector=[];let residual=0;
  for(let j=0;j<s.length;j++){const fitted={re:gain.re*s[j].re-gain.im*s[j].im,im:gain.re*s[j].im+gain.im*s[j].re},r={re:y[j].re-fitted.re,im:y[j].im-fitted.im};residual+=r.re*r.re+r.im*r.im;if(inspect){yhat.push(fitted);residualVector.push(r);}}
  const nll=residual/v,logLikelihood=-s.length*Math.log(Math.PI*v)-nll;
  for(const z of [gain.re,gain.im,score,residual,nll,logLikelihood])if(!Number.isFinite(z))numericFail('Nonfinite profiled likelihood');
  const result={status:'computed',templateEnergy:den,innerProduct:{re:ir,im:ii},gain,score,residual,negativeLogLikelihoodUpToConstant:nll,logLikelihood};
  if(inspect)Object.assign(result,{template:clone(s),fitted:yhat,residualVector});return result;
}
export function profileComplexGain(template,y,noiseVariance) {
  if(!Array.isArray(template)||template.length<1||template.length>LIMITS.maxD)throw new KernelError('invalid-input','template length must be in [1,32]');
  const s=vector(template,template.length,'template',1e4),observation=vector(y,template.length,'y',LIMITS.maxAbsY),v=number(noiseVariance,LIMITS.minNoiseVariance,LIMITS.maxNoiseVariance,'noiseVariance');
  return profile(s,observation,v,{inspect:true});
}
export function evaluateCandidate(raw,q,a){const obs=validateObservation(raw),operator=createTemplateOperator(obs.frame,obs.x,obs.model),s=operator.apply(q,a);return {model:obs.model,delayBin:q,dopplerBin:a,...profile(s,obs.y,obs.noiseVariance,{inspect:true}),physical:physicalCoordinates(obs.frame,q,a)};}
export function linspace(lo,hi,n){const step=(hi-lo)/(n-1);return Array.from({length:n},(_,i)=>i===n-1?hi:lo+i*step);}
/** Incremental exhaustive source-style finite-grid search. No truth argument.
 * The source does not disclose numeric Γ; these endpoint-inclusive axes are ours.
 * Traversal is q outer/a inner. Strict > replaces best, exact ties retain first.
 */
export function createGridSearch(raw,{now=()=>performance.now()}={}) {
  const started=now(),receiver=validateReceiver(raw),initializationStart=now(),operator=createTemplateOperator(receiver.frame,receiver.x,receiver.model),initializationMs=now()-initializationStart;
  const qAxis=linspace(...receiver.bounds[0],receiver.gridShape[0]),aAxis=linspace(...receiver.bounds[1],receiver.gridShape[1]);
  const planned=qAxis.length*aAxis.length,records=[];let status='running',best=null,bestInspection=null,invalidCandidates=0,equalBestScoreCount=0,computeMs=0;
  function stop(reason){if(status!=='running')return;if(!['cancelled','superseded'].includes(reason))throw new KernelError('invalid-input','Stop must be cancelled or superseded');status=reason;}
  function step() {
    if(status!=='running')return {status,newCandidates:[],evaluations:records.length,plannedCandidates:planned};
    const t0=now(),newCandidates=[];
    for(let j=0;j<receiver.settings.chunkCandidates&&records.length<planned;j++){
      if(records.length>=receiver.settings.maxEvaluations){status='evaluation-cap';break;}
      if(now()-started>=receiver.settings.maxElapsedMs){status='time-cap';break;}
      const index=records.length,qIndex=Math.floor(index/aAxis.length),aIndex=index%aAxis.length,q=qAxis[qIndex],a=aAxis[aIndex],s=operator.apply(q,a),fit=profile(s,receiver.y,receiver.noiseVariance);
      const record={index,qIndex,aIndex,delayBin:q,dopplerBin:a,...fit};records.push(record);newCandidates.push(record);
      if(fit.status!=='computed'){invalidCandidates++;continue;}
      if(!best||fit.score>best.score){best=record;bestInspection=profile(s,receiver.y,receiver.noiseVariance,{inspect:true});equalBestScoreCount=1;}else if(fit.score===best.score)equalBestScoreCount++;
    }
    if(records.length===planned)status=best?'grid-exhausted':'no-informative-candidate';
    else if(status==='running'&&records.length>=receiver.settings.maxEvaluations)status='evaluation-cap';
    computeMs+=now()-t0;
    return clone({status,newCandidates,evaluations:records.length,plannedCandidates:planned,elapsedMs:now()-started,best:best?{index:best.index,delayBin:best.delayBin,dopplerBin:best.dopplerBin,score:best.score}:null});
  }
  function result(){
    const elapsedMs=now()-started,exhausted=records.length===planned,selected=best?{...best,physical:physicalCoordinates(receiver.frame,best.delayBin,best.dopplerBin),inspection:bestInspection}:null;
    return clone({schemaVersion:SCHEMA_VERSION,kernelVersion:KERNEL_VERSION,taskKind:'radar',knownPathCount:1,algorithm:'source-style-exhaustive-grid',model:receiver.model,status,
      receiver,grid:{qAxis,aAxis,shape:receiver.gridShape,spacingBins:[qAxis[1]-qAxis[0],aAxis[1]-aAxis[0]],order:'q outer, a inner',endpoints:'inclusive',resolutionOrigin:'declared implementation grid; source numeric Γ unspecified'},
      selected,candidates:records,operatorEvaluations:records.length,plannedCandidates:planned,invalidCandidates,equalBestScoreCount,
      partial:!exhausted,globalOnDeclaredGrid:exhausted&&!!best&&invalidCandidates===0,globalOnContinuum:false,
      selectionPolicy:'Largest computed score, strict >; exact ties retain first q-outer/a-inner candidate',
      informationStatus:energy(receiver.y)===0?'zero-observation-all-profile-scores-tie':'profile-grid-only; uniqueness not certified',
      continuousRefinement:{status:'unavailable',reason:'Not implemented or independently validated in this gate'},
      localCRB:{status:'unavailable',reason:'No model-specific derivative/FIM implementation in this gate'},
      likelihoodConvention:'v=E|w|²; log p(y|hprime,q,a)=-D log(πv)-||y-hprime Ψx||²/v',
      source:{id:'arxiv:1910.01896v1',url:'https://arxiv.org/pdf/1910.01896v1',coreSha256:'92b997201493a3187b5ddb37026672ef44e163131e422bdf8618f11b17aa235f',locators:'Eq14–19; p11 after Eq25, p12 P=1 grid qualification'},
      ledger:{...frameLedger(receiver.frame),transmitEnergy:energy(receiver.x),observationEnergy:energy(receiver.y),noiseVariance:receiver.noiseVariance},
      timing:{runtime:'JavaScript core; excludes transport and rendering',initializationMs,candidateComputeMs:computeMs,elapsedMs}});
  }
  return Object.freeze({step,stop,result,get status(){return status;},get receiver(){return clone(receiver);}});
}
export function solveSync(raw,options){const search=createGridSearch(raw,options);while(search.status==='running')search.step();return search.result();}
