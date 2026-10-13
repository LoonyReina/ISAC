import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import lightDocument from './dom-harness.cjs';
export const root=path.resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
export const runtime=path.resolve(fileURLToPath(new URL('../../runtime/',import.meta.url)));
export const pagePath=()=>fs.existsSync(path.join(root,'content/pages/gaussian-tradeoff.html'))?path.join(root,'content/pages/gaussian-tradeoff.html'):path.join(root,'gaussian-tradeoff.html');
export const page=()=>fs.readFileSync(pagePath(),'utf8');
export const fileOf=text=>({size:Buffer.byteLength(text),async text(){return text;}});
export function gate(){let resolve,reject;const promise=new Promise((ok,bad)=>{resolve=ok;reject=bad;});return {promise,resolve,reject};}
export function freshInput(extra={}){return {operation:'tradeoff',label:'Fresh complex UI gate: not a source-figure claim',model:{m:2,ns:2,t:4,powerPerAntenna:1,sensingNoise:.73,communicationNoise:1.1,priorVariance:1.4},H:{re:[[.91,.27],[-.18,.68]],im:[[.19,-.31],[.44,.12]]},kappas:[0,.0037,.37,3.14159,42.125,'communication-only'],blocks:8,seed:826123,selectedIndex:3,...extra};}
export const freshQ=()=>({re:[[1.25,.16],[.16,.75]],im:[[0,.21],[-.21,0]]});
export function transport(){
 const workers=[],sent=[],events=[];
 const createWorker=()=>{const worker=new Worker(new URL('../../runtime/worker.mjs',import.meta.url),{type:'module'}),post=worker.postMessage.bind(worker);worker.postMessage=message=>{sent.push(structuredClone(message));post(message);};worker.on('message',message=>events.push(structuredClone(message)));workers.push(worker);return worker;};
 return {workers,sent,events,createWorker};
}
export async function actual(t,options={}){
 const {Controller}=await import('../controller.mjs'),tr=transport(),changes=[],waiters=new Set();
 const c=new Controller({...options,createWorker:tr.createWorker,onChange(state){changes.push({state:state.state,stage:state.progress?.stage,result:state.result,held:state.held});for(const w of [...waiters])if(w.p(state)){waiters.delete(w);clearTimeout(w.timer);w.resolve(state);}options.onChange?.(state);}});
 const when=p=>p(c)?Promise.resolve(c):new Promise((resolve,reject)=>{const w={p,resolve,timer:setTimeout(()=>{waiters.delete(w);reject(Error('Controller wait timed out: '+c.state+'/'+c.progress?.stage));},20000)};waiters.add(w);});
 async function dispose(){for(const w of waiters)clearTimeout(w.timer);await c.dispose();await Promise.all(tr.workers.map(w=>w.terminate()));}
 t?.after(dispose);return {...tr,c,changes,when,dispose};
}
export async function mounted(t,options={}){
 const V=await import('../lesson.mjs'),h=lightDocument(page(),options),tr=transport(),downloads=[];
 const createWorker=options.beforeCreateWorker?async()=>{await options.beforeCreateWorker();return tr.createWorker();}:tr.createWorker;
 const app=await V.mountLesson({document:h.document,createWorker,download(text,name,mode){downloads.push({text,name,mode});}});
 async function dispose(){await app.destroy();await Promise.all(tr.workers.map(w=>w.terminate()));}
 t?.after(dispose);return {...h,...tr,app,downloads,dispose};
}
export function onProgress(h,predicate,action){const c=h.app?.controller??h.c,prior=c.onChange;let hit=false,outcome;c.onChange=state=>{prior(state);if(!hit&&predicate(state)){hit=true;outcome=action();}};return {get hit(){return hit;},async done(){await outcome;c.onChange=prior;assert.equal(hit,true,'a real Worker progress notification must trigger action');}};}

export async function setFields(h,values){for(const [id,value] of Object.entries(values)){const el=h.get('gt-'+id);if(typeof value==='boolean')el.checked=value;else el.value=String(value);await el.fire('input');await el.fire('change');}}
export async function configureFresh(h,extra={}){const input=freshInput();await setFields(h,{channel:JSON.stringify(input.H),kappa:3.14159,t:4,ns:2,power:1,snoise:.73,cnoise:1.1,prior:1.4,blocks:8,seed:826123,landmarks:true,'comm-only':false,...extra});}
export async function freshRun(h,extra={}){await configureFresh(h,extra);await h.get('gt-run').fire('click');assert.equal(h.app.controller.state,'complete',h.app.controller.error??h.get('gt-error').textContent);assert.equal(h.app.controller.result.freshExecution,true);return h.app.controller.result;}
// Delay one real main-thread WebCrypto digest; Worker math/transport is unchanged.
export function pauseDigest(){const original=globalThis.crypto.subtle.digest,entered=gate(),blocked=gate();let once=true;globalThis.crypto.subtle.digest=async function(...args){if(once){once=false;entered.resolve();await blocked.promise;}return original.apply(this,args);};return {entered,release:()=>blocked.resolve(),restore(){globalThis.crypto.subtle.digest=original;blocked.resolve();}};}
