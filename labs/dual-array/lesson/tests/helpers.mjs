import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import lightDocument from './dom-harness.cjs';
import {mountLesson} from '../mount.mjs';
export const workerURL=new URL('../../runtime/worker.mjs',import.meta.url);
export const workerFactory=()=>new Worker(workerURL,{type:'module'});
export async function waitFor(fn,ms=20000){const started=Date.now();while(!fn()){if(Date.now()-started>ms)throw Error('Timed out waiting for owned completion');await new Promise(r=>setTimeout(r,10));}}
export async function mounted(extra={}){const html=await fs.readFile(new URL('../../../../content/pages/dual-array-positioning.html',import.meta.url),'utf8');const dom=lightDocument(html),blobs=new Map(),revoked=[];const app=mountLesson(dom.document,{workerFactory,URLImpl:{createObjectURL(blob){const u=`blob:test-${blobs.size}`;blobs.set(u,blob);return u;},revokeObjectURL(u){revoked.push(u);}},...extra});return {...dom,app,blobs,revoked};}
export async function run(h){await h.get('da-form').fire('submit');await waitFor(()=>!['running','reading'].includes(h.app.session.state.status));if(!['ready','absent-estimate'].includes(h.app.session.state.status))throw Error(h.app.session.state.error);return h.app.session.state.selected;}
export async function change(h,key,value,event='input'){h.get('da-'+key).value=value;await h.get('da-'+key).fire(event);}
export async function download(h){await h.get('da-download').fire('click');const d=h.downloads.at(-1),text=await h.blobs.get(d.href).text();return {record:JSON.parse(text),text,filename:d.download};}
