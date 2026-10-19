import {VERSION,assert,vector,grid} from './core.mjs';
import {evaluateCandidates} from './processing.mjs';
import {CALIBRATION} from './calibration-data.mjs';
export const CALIBRATION_VERSION='pilot-live-calibration-1';
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
let integrityPromise;
/** Fail closed if deployed receiver bytes do not match the calibrated implementation. */
async function runtimeIntegrity(){
 if(!integrityPromise)integrityPromise=(async()=>{const actual={},reasons=[];
  for(const [name,expected]of Object.entries(CALIBRATION.sourceHashes))try{
   const url=new URL(name,import.meta.url),response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());
   const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);actual[name]=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   if(actual[name]!==expected)reasons.push('source-hash-mismatch:'+name);
  }catch{actual[name]=null;reasons.push('source-hash-unverified:'+name);}
  return {actual,reasons};
 })();return integrityPromise;
}

/** Absolute strict threshold, frozen 3x3 maxima/tie/suppression. No truth input. */
export function absoluteCandidates(power,delay,doppler,threshold){
 assert(Number.isFinite(threshold)&&threshold>=0,'finite nonnegative absolute threshold');
 const D=delay.length,F=doppler.length;power=vector(power,D*F,'score');assert(power.every(v=>v>=0),'score nonnegative');
 let maximum=0;for(const p of power)maximum=Math.max(maximum,p);const epsilon=maximum*1e-12,order=[];
 for(let f=0;f<F;f++)for(let d=0;d<D;d++){const p=power[f*D+d];if(!(p>threshold))continue;let local=true;
  for(let df=-1;df<=1;df++)for(let dd=-1;dd<=1;dd++){const ff=f+df,ddd=d+dd;if(ff>=0&&ff<F&&ddd>=0&&ddd<D&&p<power[ff*D+ddd]-epsilon)local=false;}
  if(local)order.push({f,d,power:p});
 }
 order.sort((a,b)=>b.power-a.power||a.f-b.f||a.d-b.d);const sorted=[];
 for(let i=0;i<order.length;){let end=i+1;while(end<order.length&&order[i].power-order[end].power<=epsilon)end++;sorted.push(...order.slice(i,end).sort((a,b)=>a.f-b.f||a.d-b.d).map(p=>({...p,size:end-i})));i=end;}
 const chosen=[];for(const p of sorted){const ds=delay[p.d],fd=doppler[p.f];if(chosen.some(v=>Math.abs(v.delay_samples-ds)<=2&&Math.abs(v.doppler_hz-fd)<=150))continue;
  chosen.push({delay_samples:ds,doppler_hz:fd,power:p.power,near_tie_group_size:p.size,near_tie_power_tolerance:epsilon});if(chosen.length===8)break;
 }return chosen;
}
/** Only generated white-noise provenance is currently verified. Imported raw is never silently certified. */
export async function calibratedResults(observation,processing,branches,digest){
 const integrity=await runtimeIntegrity(),g=grid(observation.grid),gen=observation.generator,c=gen?.config,reasons=[...integrity.reasons];
 if(VERSION!=='pilot-pattern-browser-0.1.0')reasons.push('receiver-version');
 for(const [key,value]of Object.entries({N:96,Ncp:12,S:6,M:24,J:1,delta_f:15000}))if(g[key]!==value)reasons.push('grid-'+key);
 const pattern=g.offsets.length===24&&g.offsets.every(v=>v===0)?'A':g.offsets.length===24&&g.offsets.every((v,i)=>v===i%6)?'D':null;
 if(!pattern)reasons.push('offset-vector');
 if(!same(processing.axes.delay_samples,Array.from({length:192},(_,i)=>i*.5)))reasons.push('delay-search');
 if(!same(processing.axes.doppler_hz,Array.from({length:121},(_,i)=>-1500+i*25)))reasons.push('doppler-search');
 const pilotHash=await digest(observation.pilots),expectedPilotHash=pattern?await digest(CALIBRATION.pilots[pattern]):null;
 if(!pattern||!same(observation.pilots,CALIBRATION.pilots[pattern]))reasons.push('known-pilot-complex-array');
 if(observation.kind!=='generated'||!c)reasons.push('raw-import:unknown-noise-provenance-and-waveform');
 else {if(c.transmit_seed!==CALIBRATION.seed)reasons.push('waveform-seed');if(c.payload!==false||c.pilot_amplitudes!==null)reasons.push('waveform-payload-or-amplitudes');}
 const variance=c?.noise_variance??null;if(!(variance>0&&Number.isFinite(variance)))reasons.push('positive-known-time-noise-variance-required');
 const results=[];
 for(const b of branches){const why=[...reasons],key=pattern===null?null:pattern+b.ell;
  if(!CALIBRATION.thresholds.values[key])why.push('receiver-ell');
  if(b.map.kind!=='separable-direct-physical-grid'||b.map.normalization!=='abs(Z)^2/(MK)^2; never map-peak normalized'||b.map.rows!==processing.axes.doppler_hz.length||b.map.columns!==processing.axes.delay_samples.length)why.push('coherent-rectangular-map-definition');
  if(b.trace.L!==g.N-b.ell*g.K)why.push('receiver-retained-length');
  let Vz=null;if(variance>0){let sum=0;for(let j=0;j<g.M*g.K;j++)sum+=1/(b.trace.L*(observation.pilots[2*j]**2+observation.pilots[2*j+1]**2));Vz=variance*sum;}
  if(!(Vz>0&&Number.isFinite(Vz))){why.push('finite-positive-map-variance-required');Vz=null;}
  let score=Vz>0?b.map.raw_power.map(v=>v/Vz):null;if(score&&!score.every(v=>Number.isFinite(v)&&v>=0)){why.push('score-outside-finite-numeric-range');score=null;}let maximum=null;if(score){maximum=0;for(const v of score)maximum=Math.max(maximum,v);}
  const available=why.length===0,decisions={};
  for(const alpha of ['0.01','0.05']){const threshold=available?CALIBRATION.thresholds.values[key][alpha]:null;decisions[alpha]={nominal_alpha:Number(alpha),rank:CALIBRATION.thresholds.ranks[alpha],threshold,scene_detected:available?maximum>threshold:null,candidates:available?absoluteCandidates(score,processing.axes.delay_samples,processing.axes.doppler_hz,threshold):[]};}
  results.push({ell:b.ell,configuration:key,available,reasons:why,noise_map_variance:Vz,maximum_score:maximum,decisions});
 }
 return {version:CALIBRATION_VERSION,id:CALIBRATION.id,freeze_sha256:CALIBRATION.freeze_sha256,thresholds_sha256:CALIBRATION.thresholds_sha256,source_hashes:{...CALIBRATION.sourceHashes},verified_runtime_hashes:integrity.actual,receiver_version:VERSION,pilot_sha256:pilotHash,expected_pilot_sha256:expectedPilotHash,waveform_seed:c?.transmit_seed??null,noise:{variance,provenance:c?'generator-known-white-proper-independent-complex-time-noise':'unknown; raw import does not certify external variance or whiteness',rng:c?'Mulberry32/Box-Muller; independent live realization, not PCG64 seed replay':null},weights:'coherent rectangular',normalization:'raw abs(Z)^2 / (sigma_t^2 sum 1/(L abs(pilot)^2))',threshold_convention:'strict score > ascending kth calibration maximum',branches:results};
}
/** Kept out of detector computation. H1 model/evaluation never selects calibration. */
export function calibratedEvaluation(result,record,ell,alpha){
 const b=result.branches.find(v=>v.ell===ell),scene=record.evaluation_scene,c=record.observation.generator?.config;
 const mismatch=[];if(c?.model==='continuous-doppler')mismatch.push('sample-varying Doppler is outside guarded low-Doppler H1 model');
 const guard=ell===5?92:ell===0?12:record.observation.grid.Ncp+ell*record.observation.grid.N/record.observation.grid.S;
 if(c?.scene.delays_samples.some(d=>d>guard))mismatch.push('generated path exceeds '+guard+' sample H1 guard');
 return {model_mismatches:mismatch,claim:'H0 conditional calibration is separate from scene recovery; a changed scene is outside frozen H1 trial coverage',evaluation:scene&&b?.available?evaluateCandidates(b.decisions[alpha].candidates,scene):null};
}
