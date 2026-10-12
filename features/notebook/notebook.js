/* Page-only learner notebook: references are context; entries are never calculated or filled. */
(function(root){'use strict';
const MAX_FIELD_LENGTH=12000;
const MAX_SEARCH_LENGTH=4096;
const REFERENCE_SITE_BASE='https://loonyreina.github.io/ISAC/';
const FIELDS=Object.freeze([
 ['identity','记录标识 / 日期 / 代码版本 / 文献版本与章节'],
 ['question','研究问题 / 可推翻的预测'],
 ['observations','观测数据 / 已知、未知、可控量'],
 ['geometry','几何 / 同步 / 近似 / 坐标与单位'],
 ['comparison','基线 / 本轮唯一改动 / 固定资源'],
 ['parameters','参数 / 种子 / 重复次数 / 数值容差'],
 ['metrics','指标 / 预先定义的失败判据'],
 ['results','实际结果 / 失败样本 / 证据文件位置'],
 ['uncertainty','不确定性 / 与预测的差异'],
 ['scope','适用范围 / 尚未验证 / 下一问']
].map(([id,label])=>Object.freeze({id,label})));
const PRESENCE_NOTICE='仅检查各栏是否含非空白文字；不判断正确性，不证明实验已执行，也不认证可复现性。';
const LOSS_NOTICE='内容只在当前页面中；刷新、关闭或离开页面可能丢失，请先下载。';
const TOPIC_KEYS=['id','title','question','action','teachingHref','experimentHref','evidenceHref','boundaryHref'];
function selectTopic(search,topics){
 // Strict decoding rejects broken percent escapes rather than echoing or repairing them.
 try{
  const query=String(search||'');if(query.length>MAX_SEARCH_LENGTH)return null;
  const values=[];
  for(const part of query.replace(/^\?/,'').split('&')){
   const split=part.indexOf('='),key=decodeURIComponent((split<0?part:part.slice(0,split)).replace(/\+/g,' '));
   if(key==='topic')values.push(decodeURIComponent((split<0?'':part.slice(split+1)).replace(/\+/g,' ')));
  }
  if(values.length!==1)return null;
  const id=values[0];
  if(id.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))return null;
  return topics.find(topic=>topic.id===id)||null;
 }catch{return null;}
}
function learnerEntries(entries){
 return Object.fromEntries(FIELDS.map(({id})=>{
  const value=entries[id]===undefined?'':entries[id];
  if(typeof value!=='string')throw new TypeError('Learner entries must remain text');
  if(value.length>MAX_FIELD_LENGTH)throw new RangeError('Learner entry exceeds field limit');
  return [id,value];
 }));
}
function presence(entries){
 const missingFields=FIELDS.filter(({id})=>typeof entries[id]!=='string'||!entries[id].trim()).map(({id})=>id);
 return {kind:'field-presence-only',nonWhitespaceFields:FIELDS.length-missingFields.length,totalFields:FIELDS.length,missingFields,notice:PRESENCE_NOTICE};
}
function makeRecord(entries,referenceTopic,exportedAt){
 const ownEntries=learnerEntries(entries);
 return {kind:'learner-authored-notebook',schemaVersion:1,exportedAt,referenceSiteBase:REFERENCE_SITE_BASE,
  exportedAtMeaning:'文件导出时间，不是实验执行时间。',
  notice:'学习者自行填写的研究草稿。本站参考主题与学习者条目分开；空白或部分填写不代表已完成实验。',
  referenceTopic:referenceTopic?Object.fromEntries(TOPIC_KEYS.filter(key=>typeof referenceTopic[key]==='string').map(key=>[key,referenceTopic[key]])):null,
  learnerEntries:ownEntries,fieldPresenceCheck:presence(ownEntries)};
}
function literal(text){
 // A fence longer than every learner-supplied backtick run keeps HTML and Markdown inert.
 const runs=String(text).match(/`+/g)||[],fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));
 return fence+'\n'+text+'\n'+fence;
}
function toMarkdown(record){
 const lines=['# 学习者自行填写的研究草稿','',record.notice,'',
  '导出时间：'+record.exportedAt+'（文件导出时间，不是实验执行时间）','',
  '## 参考主题（本站提供，不是学习者实验结果）',''];
 if(record.referenceTopic){
  const topic=record.referenceTopic;
  lines.push(literal('主题：'+topic.title+'\n参考问题：'+topic.question+'\n参考动作：'+topic.action),'');
  for(const [key,label]of [['teachingHref','教学入口'],['experimentHref','机制实验'],['evidenceHref','原文与证据'],['boundaryHref','边界与下一问']])if(topic[key])lines.push('['+label+']('+REFERENCE_SITE_BASE+topic[key]+')');
 }else lines.push('未选择参考主题（通用记录）。');
 lines.push('','## 学习者条目（原样文字；空栏允许保留）','');
 for(const {id,label}of FIELDS)lines.push('### '+label,'',literal(record.learnerEntries[id]),'');
 const check=record.fieldPresenceCheck;
 lines.push('## 填写情况（不是结果认证）','',check.nonWhitespaceFields+'/'+check.totalFields+' 栏含非空白文字。',PRESENCE_NOTICE,'');
 return lines.join('\n');
}
function init(doc,win){
 const form=doc.getElementById('notebook-form');if(!form)return null;
 const get=id=>doc.getElementById('notebook-'+id),topics=JSON.parse(get('topics').textContent),select=get('topic');
 const fields=Object.fromEntries(FIELDS.map(({id})=>[id,get(id)]));
 const checkStatus=get('check-status'),downloadStatus=get('download-status'),topicStatus=get('topic-status');
 const urls=new Map();let selected=selectTopic(win.location.search,topics),hasRequestedDownload=false;
 function entries(){return Object.fromEntries(FIELDS.map(({id})=>[id,fields[id].value]));}
 function renderReference(){
  get('reference-title').textContent=selected?selected.title:'通用研究记录';
  get('reference-question').textContent=selected?selected.question:'尚未选择参考主题。请在下方写自己的研究问题。';
  get('reference-action').textContent=selected?selected.action:'参考主题是可选的，不会替你填写或执行实验。';
  for(const [id,key]of [['teaching','teachingHref'],['experiment','experimentHref'],['evidence','evidenceHref'],['boundary','boundaryHref']]){
   const anchor=get(id),href=selected&&selected[key];anchor.hidden=!href;
   if(href)anchor.setAttribute('href',href);else anchor.removeAttribute('href');
  }
 }
 function revoke(url){
  if(!urls.has(url))return;
  const timer=urls.get(url);urls.delete(url);if(timer!==null)win.clearTimeout(timer);
  win.URL.revokeObjectURL(url);
 }
 function release(){for(const url of [...urls.keys()])revoke(url);}
 function changed(){
  checkStatus.textContent='内容已更改，可重新检查填写情况。'+PRESENCE_NOTICE;
  if(hasRequestedDownload)downloadStatus.textContent='草稿已更改，先前请求下载的文件不包含本次修改；请重新下载。'+LOSS_NOTICE;
 }
 function download(format){
  let url,anchor;
  try{
   const record=makeRecord(entries(),selected,new Date().toISOString());
   const text=format==='json'?JSON.stringify(record,null,2):toMarkdown(record);
   url=win.URL.createObjectURL(new win.Blob([text],{type:format==='json'?'application/json;charset=utf-8':'text/markdown;charset=utf-8'}));
   urls.set(url,null);anchor=doc.createElement('a');anchor.hidden=true;anchor.href=url;
   anchor.download=format==='json'?'isac-learner-notebook.json':'isac-learner-notebook.md';
   doc.body.append(anchor);anchor.click();
   urls.set(url,win.setTimeout(()=>revoke(url),1000));
   hasRequestedDownload=true;
   downloadStatus.textContent='已请求浏览器下载 '+(format==='json'?'JSON':'Markdown')+'；请检查下载提示和文件内容，浏览器未确认文件已保存。'+LOSS_NOTICE;
  }catch{
   if(url)revoke(url);
   downloadStatus.textContent='下载未能启动，当前草稿未清除。请检查每栏是否超过 12,000 个字符及浏览器下载支持后重试；也可手动复制各栏文字。'+LOSS_NOTICE;
  }finally{if(anchor)anchor.remove();}
 }
 form.addEventListener('submit',event=>event.preventDefault());
 for(const field of Object.values(fields))field.addEventListener('input',changed);
 select.value=selected?selected.id:'';renderReference();
 select.addEventListener('change',()=>{
  selected=topics.find(topic=>topic.id===select.value)||null;
  select.value=selected?selected.id:'';renderReference();
  topicStatus.textContent='参考主题已更改，你填写的草稿未改变。请自行核对条目与新主题是否对应。';
  if(hasRequestedDownload)downloadStatus.textContent='参考主题已更改；先前请求下载的文件仍使用原主题，请重新下载。'+LOSS_NOTICE;
 });
 get('check').addEventListener('click',()=>{
  const check=presence(entries()),missing=FIELDS.filter(({id})=>check.missingFields.includes(id)).map(({label})=>label);
  checkStatus.textContent=check.nonWhitespaceFields+'/'+check.totalFields+' 栏已填写非空白文字。'+PRESENCE_NOTICE+(missing.length?' 仍为空白（可保留）：'+missing.join('；')+'。':'');
 });
 get('download-md').addEventListener('click',()=>download('md'));
 get('download-json').addEventListener('click',()=>download('json'));
 win.addEventListener('pagehide',release);
 form.hidden=false;get('jump').hidden=false;
 return Object.freeze({release});
}
const api=Object.freeze({FIELDS,MAX_FIELD_LENGTH,MAX_SEARCH_LENGTH,selectTopic,presence,makeRecord,toMarkdown,init});
if(typeof module==='object'&&module.exports)module.exports=api;
if(root){root.LearnerNotebook=api;init(root.document,root);}
})(typeof window==='object'?window:null);
