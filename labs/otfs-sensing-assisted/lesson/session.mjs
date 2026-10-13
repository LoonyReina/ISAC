import {SensingOtfsClient} from '../runtime/worker/client.js';
import {validateSubmission} from './adapter.mjs';
import {createRecord,parseRecord,checkRecord} from './record.mjs';
export const MAX_IMPORT_BYTES=8*1024*1024;
export class LessonSession {
 constructor({workerFactory,onChange=()=>{},now=()=>performance.now()}={}){this.workerFactory=workerFactory??(url=>new Worker(url,{type:'module'}));this.onChange=onChange;this.now=now;this.history=[];this.selected=null;this.active=null;this.state='idle';this.notice='尚未运行';this.error=null;this.epoch=0;this.counter=0;this.client=null;this.disposed=false;this.checks=null;this.draftDirty=false;this.owners=new Map();this.renderError=null;}
 emit(){if(this.disposed)return;try{this.onChange(this);this.renderError=null;}catch(e){this.renderError=e.message;this.notice='显示未完成；已接受的记录仍保留，不是导入解析拒绝';}}
 ensureClient(){if(this.disposed)throw Error('页面已关闭');if(!this.client){const worker=this.workerFactory(new URL('../runtime/worker/receiver-worker.js',import.meta.url));this.client=new SensingOtfsClient(worker,{onEvent:e=>{if(e.type==='accepted'){const owner=this.owners.get(e.id);if(owner)owner.accepted=true;}}});}return this.client;}
 get source(){return this.history.find(x=>x.id===this.selected)??null;}
 get busy(){return !!this.active;}
 edit(){this.epoch++;this.draftDirty=true;this.checks=null;this.error=null;this.notice=this.active?'输入草稿已修改；正在计算的仍是已提交快照':'输入草稿已修改；显示的记录仍属于原输入，尚未重算';this.emit();}
 canRetain(){return this.history.length<32&&this.history.reduce((n,x)=>n+(x.text?new TextEncoder().encode(x.text).length:1024*1024),0)<=24*1024*1024;}
 async run(input,operation='run',parentRunId=null){let normalized;try{normalized=validateSubmission(operation,input);}catch(e){this.error=e.message;this.notice='输入被拒绝；已有有效作业继续';this.emit();return null;}
 if(!this.canRetain()){this.error='会话历史已到32份/32 MiB保留预算；请先下载需要的记录，再刷新开始新会话；未删除已有历史';this.emit();return null;}
 let client;try{client=this.ensureClient();}catch(e){this.error=e.message;this.state='unavailable';this.notice='Worker 不可用；可读静态讲解，已有历史仍可下载';this.emit();return null;}
 const id='sensing-otfs-'+Date.now().toString(36)+'-'+(++this.counter),epoch=++this.epoch,started=this.now(),startedAt=new Date().toISOString(),entry={id,record:null,text:null,result:null,trusted:true,operation,input:structuredClone(normalized),status:'validating',progress:null};
 this.history.push(entry);this.selected=id;this.checks=null;this.error=null;this.draftDirty=false;this.state='running';this.notice='已提交有限预算；等待 Worker 接受';
 const owner={id,epoch,entry,cancelled:false,accepted:false,client,previous:this.active};this.owners.set(id,owner);this.active=owner;
 let job;try{job=client[operation](normalized,{id,onProgress:(p,partial)=>{entry.progress=p;if(partial)entry.result=partial;entry.status='running';if(this.active===owner){this.notice=p.stage==='receiver_complete'?`已完成一条接收记录；${p.mode}`:p.stage==='raw_frame_ready'?'原始帧已生成，开始从导频估计增益':'正在进行真实有限迭代';this.emit();}}});}catch(e){entry.status='failed';this.owners.delete(id);this.restoreRejectedOwner(owner);this.error=e.message;if(!this.active)this.state='failed';this.emit();return entry;}
 owner.job=job;this.emit();
 let terminal;try{terminal=await job.result;}catch(e){terminal={type:'error',reason:e.code??'WORKER_ERROR',error:e.message,partial:e.partial??entry.result};}
 const result=terminal.result??terminal.partial??entry.result;
 entry.status=terminal.type==='complete'?'complete':terminal.type;entry.result=result??null;entry.error=terminal.error??null;
 if(result){try{Object.assign(entry,await createRecord({runId:id,parentRunId,operation,input:normalized,result,status:entry.status,reason:terminal.reason??terminal.error??null,startedAt,durationMs:this.now()-started}));}catch(e){entry.status='record-error';entry.error=e.message;}}
 this.owners.delete(id);if(this.active===owner&&!owner.accepted&&terminal.type==='error')this.restoreRejectedOwner(owner);
 if(this.active===owner){this.active=null;this.state=entry.status;this.error=entry.error??terminal.error??null;this.notice=entry.status==='complete'?'本次计算完成；1–2 帧只说明机制，不提供性能置信区间':`本次状态：${entry.status}；已完成部分保留，缺失模式不补零`;if(this.draftDirty)this.notice+='；输入草稿已有改动';}
 this.emit();return entry;
 }
 restoreRejectedOwner(owner){const restored=owner.client===this.client?this.owners.get(owner.client.currentId):null;if(restored&&restored!==owner){this.active=restored;this.state='running';if(this.selected===owner.id)this.selected=restored.id;this.error=owner.entry.error??'新请求未被接受；已有有效作业继续';this.notice=`新请求失败；仍在计算 ${restored.id}，取消按钮仍控制该作业`;}else if(this.active===owner){this.active=null;this.state=owner.entry.status;this.notice='新请求未被接受；没有仍在计算的作业';}}
 cancel(){this.epoch++;this.checks=null;if(this.active){this.active.cancelled=true;this.active.job?.cancel();this.notice='已请求取消；等待实际终态，保留已完成证据';this.emit();}}
 select(id){this.epoch++;if(!this.history.some(x=>x.id===id))throw Error('Unknown history entry');this.selected=id;this.checks=null;this.notice='正在查看所选记录；不会重新计算，后台作业可继续';this.emit();}
 async importFile(file){const ticket=++this.epoch;this.error=null;this.checks=null;if(!this.canRetain()){this.error='会话历史保留预算已满；先下载并刷新，已有记录未删除';this.emit();return null;}if(!file||!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_IMPORT_BYTES){this.error='导入文件须 ≤8 MiB；未读取文件内容';this.emit();return null;}let value;try{const text=await file.text();if(ticket!==this.epoch||this.disposed)return null;value=await parseRecord(text);if(ticket!==this.epoch||this.disposed)return null;}catch(e){if(ticket===this.epoch&&!this.disposed){this.error=e.message;this.notice='导入被拒绝；当前运行/所选记录未被替换';this.emit();}return null;}const id='import-'+(++this.counter),entry={...value,id,trusted:false,operation:value.record.operation,status:'historical'};this.history.push(entry);this.selected=id;this.state=this.active?'running':'historical';this.notice='已导入不可信历史；哈希/结构不认证来源，尚未新运行';this.emit();return entry;}
 async checkSelected(){const source=this.source;if(!source?.record)return null;const ticket=++this.epoch;this.checks=null;this.notice='正在核对全记录自洽性；这不认证来源';this.emit();try{const checks=await checkRecord(source);if(ticket!==this.epoch||this.source!==source||this.disposed)return null;this.checks=checks;this.notice='核对已结束；来源仍未认证，独立 Python 与真实浏览器是另两层验证';this.emit();return checks;}catch(e){if(ticket===this.epoch&&!this.disposed){this.error=e.message;this.notice='保存记录自洽核对失败；不能当作本次新计算';this.emit();}return null;}}
 async rerunSelected(){const s=this.source;if(!s?.record)return null;const input=s.input??s.record.input;return this.run(input,s.record.operation,s.record.runId);}
 async restart(reason='restart'){this.epoch++;const client=this.client;this.client=null;const previous=this.active;this.active=null;this.checks=null;this.state='idle';this.notice='Worker 已重启；历史保留，可显式重新运行';this.error=null;if(previous)previous.cancelled=true;const closing=client?.dispose(reason);this.emit();if(closing)await closing;}
 async reset(){const closing=this.restart('reset');this.selected=null;this.draftDirty=false;this.notice='尚未运行；历史仍可查看或下载';this.emit();await closing;}
 async suspend(reason='pagehide'){const closing=this.restart(reason);this.notice='页面离开已停止计算；返回后需显式重新运行，历史仍可下载';this.emit();await closing;}
 async destroy(){this.disposed=true;await this.restart('page-closed');}
}
