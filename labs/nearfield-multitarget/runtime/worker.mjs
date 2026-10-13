import {solve} from './solver.mjs';
import {certify} from './certificate.mjs';
import {sample} from './sampler.mjs';
let active=null;
const seenIds=new Set(),MAX_REQUEST_IDS=4096,MODES=['proposed','nccs'];
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const has=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
function keys(v,allowed,label){if(!plain(v))throw Error(label+' must be a plain object');for(const k of Object.keys(v))if(!allowed.includes(k))throw Error('unknown '+label+' field: '+k);}
function number(v,k,low,high,integer=false,exclusiveLow=false){if(has(v,k)&&(typeof v[k]!=='number'||!Number.isFinite(v[k])||(exclusiveLow?v[k]<=low:v[k]<low)||v[k]>high||(integer&&!Number.isInteger(v[k]))))throw Error('invalid '+k);}
function validate(data){
 keys(data,['type','id','input','options','sample','seed'],'request');
 const input=has(data,'input')?data.input:{};keys(input,['side','wavelength','power','noise','rate','epsilon','snapshots','users','targets'],'input');
 number(input,'side',4,10,true);number(input,'wavelength',.005,.02);number(input,'power',0,1,false,true);number(input,'noise',1e-12,1e-6);number(input,'rate',0,17,false,true);number(input,'epsilon',.01,.5);number(input,'snapshots',32,1024,true);
 for(const [name,n]of [['users',2],['targets',3]])if(has(input,name)){let list=input[name];if(!Array.isArray(list)||list.length!==n)throw Error('invalid '+name+' shape');for(const p of list){if(!Array.isArray(p)||p.length!==3||Array.from(p).some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>2)||p[2]<.05)throw Error('invalid '+name+' position');}}
 const options=has(data,'options')?data.options:{};keys(options,['maxSteps','maxMs','relativeGap'],'options');number(options,'maxSteps',1,600,true);number(options,'maxMs',1,10000);number(options,'relativeGap',1e-7,1e-4);
 if(has(data,'sample')&&typeof data.sample!=='boolean')throw Error('sample must be boolean');number(data,'seed',0,4294967295,true);
 return {input,options};
}
function failure(mode,raw){return {mode,status:raw.status,accepted:false,details:{steps:raw.steps,history:raw.history,rateUpperBounds:raw.rateUpperBounds,rawReducedCoordinates:raw.x}};}
self.onmessage=async({data})=>{
 if(!plain(data)||typeof data.id!=='string'||data.id.trim().length===0||data.id.length>100){self.postMessage({type:'error',accepted:false,id:null,status:'invalid_request',error:'nonempty string request id required (maximum 100 characters)'});return;}
 if(data.type==='cancel'){
 try{keys(data,['type','id'],'cancel');}catch(e){self.postMessage({type:'error',accepted:false,id:data.id,status:'invalid_request',error:e.message});return;}
 if(active?.id===data.id)active.cancelled=true;else self.postMessage({type:'error',accepted:false,id:data.id,status:'unknown_active_id',error:'cancel id does not identify an active job'});return;
 }
 if(data.type!=='solve'){self.postMessage({type:'error',accepted:false,id:data.id,status:'invalid_request',error:'unknown request type'});return;}
 if(seenIds.has(data.id)){self.postMessage({type:'error',accepted:false,id:data.id,status:'duplicate_id',error:'solve IDs must be unique for this Worker lifetime'});return;}
 if(seenIds.size>=MAX_REQUEST_IDS){self.postMessage({type:'error',accepted:false,id:data.id,status:'request_id_capacity',error:'create a new Worker after 4096 solve requests'});return;}
 seenIds.add(data.id);
 let args;try{args=validate(data);}catch(e){self.postMessage({type:'error',accepted:false,id:data.id,status:'invalid_request',error:String(e.message)});return;}
 if(active){self.postMessage({type:'error',accepted:false,id:data.id,status:'busy',error:'busy; cancel or terminate previous worker first'});return;}
 const job={id:data.id,cancelled:false},results=[];active=job;
 try{
 for(const mode of MODES){
 if(job.cancelled){results.push({mode,status:'not_run_cancelled',accepted:false});continue;}
 let raw;
 try{
 raw=await solve(args.input,mode,{...args.options,cancelled:()=>job.cancelled,progress:p=>self.postMessage({id:job.id,type:'progress',mode,...p})});
 if(job.cancelled||raw.status==='cancelled'){results.push(failure(mode,{...raw,status:'cancelled'}));continue;}
 if(raw.status!=='candidate'){results.push(failure(mode,raw));continue;}
 const report=certify(raw);
 if(data.sample&&report.accepted){try{report.sampler=sample(report,data.seed??6252);}catch(e){report.sampler={status:'failed',error:String(e.message)};}}
 results.push(report);
 }catch(e){results.push({mode,status:raw?'certificate_failure':'explicit_failure',accepted:false,error:String(e.message),details:raw?{solverStatus:raw.status,steps:raw.steps,history:raw.history,rawReducedCoordinates:raw.x}:undefined});}
 }
 const numericalAccepted=results.every(r=>r.accepted),samplingFailed=results.some(r=>r.sampler?.status==='failed'),accepted=numericalAccepted&&!samplingFailed,status=accepted?'complete':results.some(r=>r.accepted)?'partial_failure':'failed';
 self.postMessage({id:job.id,type:job.cancelled?'cancelled':'result',status:job.cancelled?'cancelled':status,accepted:!job.cancelled&&accepted,numericalAccepted:!job.cancelled&&numericalAccepted,results});
 }finally{if(active===job)active=null;}
};
