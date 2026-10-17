import {MODEL_ID,KERNEL_VERSION,CONFIG,POLICY_THRESHOLD_NATS,analyticTruncationBounds} from './kernel.mjs';
export const DEFAULT_INPUT=Object.freeze({L:3,kappa:.5});
export function inputSnapshot(input){
  if(!input||Object.keys(input).sort().join(',')!=='L,kappa'||![1,2,3,5].includes(input.L)||![0,.25,.5,.75,1].includes(input.kappa))throw new Error('Invalid lesson input');
  return Object.freeze({L:input.L,kappa:input.kappa});
}
const same=(a,b)=>a?.L===b?.L&&a?.kappa===b?.kappa;
export function matches(a,b){return a?.generation===b.generation&&a?.requestId===b.requestId&&a?.modelId===MODEL_ID&&a?.kernelVersion===KERNEL_VERSION&&same(a.input,b.input);}
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function validateRecord(r,input){
  if(r?.status!=='computed-policy-checks-passed'||r.identity!=='this-execution-numerical-integral'||r.modelId!==MODEL_ID||r.kernelVersion!==KERNEL_VERSION||!same(r.input,input)||r.input.alpha!==4||r.input.K!==3||r.input.pc!==.5||r.units!=='nats/channel-use'||JSON.stringify(r.config)!==JSON.stringify(CONFIG)||r.threshold!==POLICY_THRESHOLD_NATS)throw new Error('Result identity failed');
  for(const key of ['baseline','selected']){
    const v=r[key],d=r.refinement?.[key],b=r.analyticTruncation?.[key];
    if(!finite(v?.coarse)||!finite(v?.refined)||!finite(d)||d!==Math.abs(v.coarse-v.refined)||d>POLICY_THRESHOLD_NATS)throw new Error('Numerical check failed');
    const expected=analyticTruncationBounds(key==='baseline'?{L:1,kappa:0}:input);
    for(const k of ['low_z','high_z','small_v','sum'])if(b?.[k]!==expected[k])throw new Error('Truncation identity failed');
  }
  if(r.difference!==r.selected.refined-r.baseline.refined||r.equivalentToBaseline!==(input.L===1||input.kappa===0)||!finite(r.elapsedMs)||!finite(r.maxChunkMs))throw new Error('Invalid completed record');
}
export class LessonController{
  constructor({execute,onChange=()=>{},now=()=>performance.now(),timeoutMs=60000,setTimer=(...args)=>globalThis.setTimeout(...args),clearTimer=(...args)=>globalThis.clearTimeout(...args)}){
    this.execute=execute;this.onChange=onChange;this.now=now;this.timeoutMs=timeoutMs;this.setTimer=setTimer;this.clearTimer=clearTimer;this.generation=0;this.requestId=0;this.state={status:'idle',input:DEFAULT_INPUT,result:null,progress:null};
  }
  emit(){this.onChange(this.state);}
  invalidate(status,input=this.state.input){
    ++this.generation;this.abort?.abort();this.abort=null;if(this.timer!==undefined)this.clearTimer(this.timer);this.timer=undefined;
    this.state={status,input,result:null,progress:null};this.emit();
  }
  edit(input){this.invalidate('dirty',inputSnapshot(input));}
  reset(){this.invalidate('idle',DEFAULT_INPUT);}
  cancel(){this.invalidate('cancelled');}
  dispose(){this.invalidate('cancelled');}
  async run(){
    this.invalidate('running');const input=inputSnapshot(this.state.input),started=this.now();
    const envelope=Object.freeze({generation:this.generation,requestId:++this.requestId,modelId:MODEL_ID,kernelVersion:KERNEL_VERSION,input});
    const abort=new AbortController();this.abort=abort;
    const current=()=>this.generation===envelope.generation&&!abort.signal.aborted;
    this.timer=this.setTimer(()=>{if(current())this.invalidate('timeout');},this.timeoutMs);
    try{
      const message=await this.execute(envelope,{signal:abort.signal,onProgress:message=>{
        if(!current()||!matches(message,envelope))return;
        const p=message.progress;if(!['baseline','selected'].includes(p?.target)||!['coarse','refined'].includes(p?.phase))return;
        this.state={...this.state,progress:{target:p.target,phase:p.phase}};this.emit();
      }});
      if(!current())return;
      if(!matches(message,envelope))throw new Error('Result envelope failed');
      validateRecord(message.result,input);
      this.state={status:'complete',input,result:structuredClone({...message.result,envelope,endToEndMs:this.now()-started,executionKappa:input.L===1?'not-applicable':input.kappa}),progress:null};this.emit();
    }catch(error){if(current()){this.state={status:'failed',input,result:null,progress:null,error:String(error.message)};this.emit();}}
    finally{if(current()){this.clearTimer(this.timer);this.timer=undefined;this.abort=null;}}
  }
  exportRecord(){return this.state.status==='complete'?structuredClone(this.state.result):null;}
}
