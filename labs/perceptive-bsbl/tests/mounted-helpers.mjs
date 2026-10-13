import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {WorkerClient} from '../runtime/client.mjs';
import {createLessonSession} from '../session.mjs';
import {mount} from '../lesson.mjs';
import light from './dom-harness.cjs';
const source=new URL('../../../content/pages/perceptive-bsbl.html',import.meta.url),staged=new URL('../../../perceptive-bsbl.html',import.meta.url);
const html=fs.readFileSync(fs.existsSync(source)?source:staged,'utf8');
export function mounted({canvas=true,urlApi:override}={}){const h=light(html,{canvas}),blobs=new Map(),workers=[],sent=[],terminated=[];h.document.defaultView.location={pathname:'/perceptive-bsbl.html',hash:''};const factory=url=>{const w=new Worker(url,{type:'module',execArgv:[]});workers.push(w);const term=w.terminate.bind(w);w.terminate=()=>{terminated.push(w);return term();};const post=w.postMessage.bind(w);w.postMessage=m=>{sent.push(m);post(m);};return w;};const app=mount(h.document,{sessionFactory:()=>createLessonSession({client:new WorkerClient(()=>factory(new URL('../runtime/worker.mjs',import.meta.url))),checkerFactory:()=>factory(new URL('../check-worker.mjs',import.meta.url))}),urlApi:override??{createObjectURL(blob){const id=`blob:actual-production-${blobs.size}`;blobs.set(id,blob);return id;},revokeObjectURL(){}}});return {...h,app,blobs,workers,sent,terminated,async cleanup(){await app.destroy();await Promise.all(workers.map(w=>w.terminate()));}};}
export async function change(h,id,value,type='input'){h.get('pb-'+id).value=value;await h.get('pb-'+id).fire(type);}
export async function download(h,source=false){await h.get(source?'pb-download-source':'pb-download').fire('click');const last=h.downloads.at(-1);if(!last)throw Error(h.get('pb-download-state').textContent);return h.blobs.get(last.href).text();}
export const shortRequest={acquisition:{config:{N:16,Np:8},paths:[{q:2,user:0,aoa:-23,aod:17,gain:[.8,.2]}],symbolSeed:710391,noiseSeed:983741,snrDb:12},methods:['mmv_fm_projected','single_log_fm_projected','row_sbl_fm','block_omp','privileged_delay_support_ls']};
