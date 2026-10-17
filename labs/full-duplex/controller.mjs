export const DEFAULTS=Object.freeze({preset:'iid',delay:8,seed:20261017});
export function validateConfig(c){if(!c||!['iid','correlated'].includes(c.preset)||![1,8].includes(c.delay)||!Number.isInteger(c.seed)||c.seed<0||c.seed>0xffffffff)throw Error('请选择有效预设、延迟和 0–4294967295 的整数种子');return {preset:c.preset,delay:c.delay,seed:c.seed};}
export class Controller{
 constructor({workerFactory,onChange=()=>{},setTimer=(...a)=>globalThis.setTimeout(...a),clearTimer=(...a)=>globalThis.clearTimeout(...a),timeoutMs=60000}){Object.assign(this,{workerFactory,onChange,setTimer,clearTimer,timeoutMs});this.generation=0;this.state={status:'idle',result:null,config:null,error:''};}
 publish(p){this.state={...this.state,...p};this.onChange(this.state);}
 stop(){this.generation++;if(this.worker){this.worker.terminate();this.worker=null;}if(this.timer!==undefined){this.clearTimer(this.timer);this.timer=undefined;}}
 invalidate(){this.stop();this.publish({status:'stale',result:null,error:''});}
 cancel(){this.stop();this.publish({status:'cancelled',result:null,error:''});}
 run(raw){this.stop();let config;try{config=validateConfig(raw);}catch(e){this.publish({status:'error',result:null,error:e.message});return;}
 const generation=this.generation;this.publish({status:'running',result:null,config,error:'',progress:''});
 try{const worker=this.workerFactory();this.worker=worker;const fail=message=>{if(generation!==this.generation)return;this.stop();this.publish({status:'error',result:null,error:message});};
 worker.onmessage=({data})=>{if(generation!==this.generation||data.id!==generation)return;if(data.type==='progress'){this.publish({progress:data.phase});return;}if(data.type==='result'){this.stop();this.publish({status:'ready',result:data.result,elapsedMs:data.elapsedMs});}else if(data.type==='error')fail(data.message||'计算失败');};
 worker.onerror=e=>{e.preventDefault?.();fail('Worker 无法完成计算，请重试：'+(e.message||'加载失败'));};
 this.timer=this.setTimer(()=>fail('计算超过 60 秒，已停止；请重试'),this.timeoutMs);worker.postMessage({type:'run',id:generation,config});
 }catch(e){this.stop();this.publish({status:'error',result:null,error:e.message});}}
 exportData(){if(this.state.status!=='ready'||!this.state.result)throw Error('请先运行当前设置');return JSON.stringify({scope:'Synthetic Eq. (11) memory-polynomial block LS; not Eq. (12), RF measurements, or detection probability',generator:'Mulberry32 + Box-Muller (not NumPy PCG64)',config:this.state.config,elapsed_ms:this.state.elapsedMs,result:this.state.result},null,2);}
}
