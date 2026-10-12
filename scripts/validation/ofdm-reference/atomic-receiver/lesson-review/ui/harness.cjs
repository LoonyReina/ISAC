'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{Worker:NodeWorker}=require('node:worker_threads');
const defaultRoot=path.resolve(__dirname,'../../../../../..');
const locate=(root,name)=>{const canonical=path.join(root,name);return fs.existsSync(canonical)?canonical:path.join(root,path.basename(name));};
function setup({root=defaultRoot,live=false,omitCore=false,omitModel=false,omitWorker=false,wrongCore=false,wrongModel=false,workerThrows=false}={}){
 root=path.resolve(root);const dir=path.dirname(locate(root,'labs/ofdm-reference/atomic-receiver-core.js')),html=fs.readFileSync(locate(root,'content/pages/atomic-ofdm-receiver.html'),'utf8'),script=fs.readFileSync(path.join(dir,'atomic-receiver.js'),'utf8'),elements=new Map(),workers=[],timers=new Map(),downloads=[],blobs=[],networkAttempts=[];let timerId=0;
 class Element{
  constructor(tag,id,attrs=''){this.tagName=tag;this.id=id;this.attrs={};this.listeners=new Map();this.children=[];this.checked=/\bchecked\b/.test(attrs);this.disabled=/\bdisabled\b/.test(attrs);this.hidden=/\bhidden\b/.test(attrs);this.type=(attrs.match(/\btype="([^"]*)"/)||[])[1]||'';this._min=(attrs.match(/\bmin="([^"]*)"/)||[])[1]||'0';this._max=(attrs.match(/\bmax="([^"]*)"/)||[])[1]||'100';this._value='';this.value=(attrs.match(/\bvalue="([^"]*)"/)||[])[1]||'';this.textContent='';this.innerHTML='';}
  get value(){return this._value;}set value(v){let s=String(v);if(this.type==='range'){const lo=Number(this._min),hi=Math.max(lo,Number(this._max));let n=s.trim()===''?NaN:Number(s);if(!Number.isFinite(n))n=(lo+hi)/2;n=Math.max(lo,Math.min(hi,n));s=String(Math.round(n));}this._value=s;}
  get min(){return this._min;}set min(v){this._min=String(v);if(this.type==='range')this.value=this._value;}
  get max(){return this._max;}set max(v){this._max=String(v);if(this.type==='range')this.value=this._value;}
  addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
  setAttribute(name,value){this.attrs[name]=String(value);if(name==='max'||name==='min'||name==='value')this[name]=value;}
  getAttribute(name){return this.attrs[name];}
  dispatch(name,{force=false}={}){if(name==='click'&&this.disabled&&!force)return;for(const fn of this.listeners.get(name)||[])fn({target:this,type:name});}
  appendChild(child){this.children.push(child);}remove(){}click(){if(this.tagName==='a')downloads.push({url:this.href,filename:this.download});else this.dispatch('click');}
 }
 for(const match of html.matchAll(/<([a-zA-Z0-9]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const [,tag,attrs,id]=match;if(elements.has(id))throw Error('Duplicate ID '+id);elements.set(id,new Element(tag,id,attrs));}
 for(const key of ['ar-preset','ar-seed','ar-separation','ar-errors','ar-snr','ar-lambda','ar-mu','ar-maxiter','ar-threshold','ar-branch','ar-cell','ar-history'])if(!elements.has(key))throw Error('Missing '+key);
 class Worker{
  constructor(url){if(workerThrows)throw Error('test worker constructor failure');this.url=url;this.requests=[];this.messages=[];this.terminated=false;this.pending=[];this.real=null;workers.push(this);if(live){this.real=new NodeWorker(path.join(__dirname,'../worker-node-adapter.cjs'),{workerData:{worktree:root}});this.real.on('message',m=>{this.messages.push(structuredClone(m));this.deliver(m);});this.real.on('error',e=>this.onerror?.({message:e.message}));}}
  postMessage(m){const c=structuredClone(m);this.requests.push(c);this.real?.postMessage(c);}
  terminate(){this.terminated=true;return this.real?.terminate();}
  deliver(data){this.onmessage?.({data:structuredClone(data)});}
 }
 const forbidden=label=>()=>{networkAttempts.push(label);throw Error('Unexpected '+label);};
 const sandbox={document:{getElementById:id=>elements.get(id)||null,createElement:tag=>new Element(tag,''),body:new Element('body','')},console,performance,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),Blob:class{constructor(parts,opts){this.parts=parts;this.options=opts;blobs.push(this);}},URL:{createObjectURL:()=>`blob:test-${blobs.length}`,revokeObjectURL(){}},fetch:forbidden('fetch'),XMLHttpRequest:forbidden('XMLHttpRequest'),requestAnimationFrame:forbidden('requestAnimationFrame'),setInterval:forbidden('setInterval'),localStorage:new Proxy({},{get:forbidden('localStorage')}),sessionStorage:new Proxy({},{get:forbidden('sessionStorage')})};sandbox.window=sandbox;
 const ctx=vm.createContext(sandbox);if(!omitCore)vm.runInContext(fs.readFileSync(path.join(dir,'atomic-receiver-core.js'),'utf8'),ctx);if(!omitModel)vm.runInContext(fs.readFileSync(path.join(dir,'atomic-receiver-model.js'),'utf8'),ctx);if(wrongCore)ctx.AtomicReceiverCore.VERSION='stale';if(wrongModel)ctx.AtomicReceiverLesson.VERSION='stale';if(!omitWorker)ctx.Worker=Worker;vm.runInContext(script,ctx,{filename:'atomic-receiver.js'});
 const get=id=>elements.get(id.startsWith('ar-')?id:'ar-'+id);
 return {root,dir,html,script,elements,workers,timers,downloads,blobs,networkAttempts,context:ctx,get,click(id,force=false){get(id).dispatch('click',{force});},change(id,value,event='input'){const e=get(id);if(typeof value==='boolean')e.checked=value;else e.value=String(value);e.dispatch(event);},export(){const n=blobs.length;get('download').dispatch('click',{force:true});return blobs.length>n?JSON.parse(blobs.at(-1).parts.join('')):null;},run(){get('run').dispatch('click');return workers.slice(-2);},async cleanup(){await Promise.all(workers.map(w=>w.terminate()));},fireWatchdog(){for(const [id,t]of [...timers])if(t.ms===10000){timers.delete(id);t.fn();}}};
}
async function waitUntil(fn,ms=30000){const t=performance.now();while(performance.now()-t<ms){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timed out waiting for UI');}
function prepare(s,fixtures){const ws=s.run();for(let i=0;i<ws.length;i++)ws[i].deliver(fixtures[i].find(m=>m.type==='ready'));return ws;}
function deliver(s,fixtures,mutate){const ws=prepare(s,fixtures);for(let i=0;i<ws.length;i++){const req=ws[i].requests.find(m=>m.type==='solve');for(const raw of fixtures[i].filter(m=>m.type!=='ready')){const m=structuredClone(raw);m.requestId=req.requestId;if(m.type==='result'&&mutate)mutate(m.result,i,m);ws[i].deliver(m);}}return ws;}
module.exports={setup,waitUntil,prepare,deliver,defaultRoot,locate};
