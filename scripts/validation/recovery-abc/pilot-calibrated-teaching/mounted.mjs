import fs from 'node:fs';
// Node test transport for same-origin module-integrity fetches in the browser Worker.
const nativeFetch=globalThis.fetch;globalThis.fetch=async (url,options)=>String(url).startsWith('file:')?new Response(fs.readFileSync(url)):nativeFetch(url,options);
import {Worker} from 'node:worker_threads';
import light from '../../../../labs/pilot-pattern/tests/dom-harness.cjs';
import {mount} from '../../../../labs/pilot-pattern/lesson.mjs';
const sourcePage=new URL('../../../../content/pages/pilot-patterns.html',import.meta.url),compatibilityPage=new URL('../../../../pilot-patterns.html',import.meta.url);
const html=fs.readFileSync(fs.existsSync(sourcePage)?sourcePage:compatibilityPage,'utf8');
export function mounted({canvas=true,factoryOverride,failFirst=false}={}){const h=light(html,{canvas}),blobs=new Map(),sent=[],workers=[],terminated=[];h.document.defaultView.location={pathname:'/pilot-patterns.html',hash:''};
 const workerFactory=url=>{if(factoryOverride)return factoryOverride(url);const worker=new Worker(new URL('./node-worker.mjs',import.meta.url),{workerData:{url:failFirst&&workers.length===0?new URL('./missing-worker-for-failure-test.mjs',import.meta.url).href:url.href},execArgv:[]});workers.push(worker);return {addEventListener(name,fn){if(name==='message')worker.on('message',data=>fn({data}));else worker.on(name,fn);},postMessage(m){sent.push({kind:m.kind,id:m.id,revision:m.revision,operation:m.operation});worker.postMessage(m);},terminate(){terminated.push(worker);return worker.terminate();}};};
 const app=mount(h.document,{workerFactory,urlApi:{createObjectURL(blob){const id='blob:actual-production-'+blobs.size;blobs.set(id,blob);return id;},revokeObjectURL(){}}});
 return {...h,app,blobs,sent,workers,terminated,async cleanup(){app.destroy();await Promise.all(workers.map(w=>w.terminate()));}};
}
export async function change(h,id,value,type='input'){h.get('pp-'+id).value=value;await h.get('pp-'+id).fire(type);}
export async function download(h){await h.get('pp-download').fire('click');const d=h.downloads.at(-1);if(!d)throw Error('No download: '+h.get('pp-check-state').textContent);return h.blobs.get(d.href).text();}
