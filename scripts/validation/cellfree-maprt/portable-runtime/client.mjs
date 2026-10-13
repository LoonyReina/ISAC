// Generation IDs prevent stale results; terminate provides immediate cancellation
// even while a bounded synchronous channel fit or convex solve is executing.
export class RuntimeClient {
 constructor({onProgress=()=>{},workerFactory=url=>new Worker(url,{type:'module'})}={}){this.onProgress=onProgress;this.factory=workerFactory;this.serial=0;this.worker=null;this.pending=null;this.destroyed=false;}
 start(){if(this.destroyed)throw Error('client destroyed');if(!this.worker){this.worker=this.factory(new URL('./worker.mjs',import.meta.url));let captured=this.worker;this.worker.onmessage=({data:m})=>{if(this.worker!==captured)return;let p=this.pending;if(!p||p.id!==m.id)return;if(m.type==='progress')this.onProgress(m);else if(m.type==='result'||m.type==='error'){this.pending=null;m.type==='result'?p.resolve(m.record):p.reject(Error(m.error));}};this.worker.onerror=e=>{if(this.worker!==captured)return;this.pending?.reject(Error(e.message??'Worker failure'));this.pending=null;this.worker?.terminate();this.worker=null;};}}
 execute(type,payload){if(this.pending)throw Error('run already active; cancel or restart');this.start();let id=String(++this.serial);return new Promise((resolve,reject)=>{this.pending={id,resolve,reject};try{this.worker.postMessage({id,type,...payload});}catch(e){this.pending=null;this.worker?.terminate();this.worker=null;reject(e);}});}
 run(settings){return this.execute('run',{settings});}
 replay(record){return this.execute('replay',{record});}
 cancel(){this.pending?.reject(Error('cancelled'));this.pending=null;this.worker?.terminate();this.worker=null;this.serial++;}
 restart(settings){this.cancel();return this.run(settings);}
 destroy(){this.cancel();this.destroyed=true;}
}
