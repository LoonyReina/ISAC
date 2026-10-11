/* Bounded, clearly marked previews. Complete JSON stays in memory and downloads locally. */
(()=>{'use strict';
const MAX_PREVIEW_CHARACTERS=12000;
const stringify=value=>JSON.stringify(value,(_key,x)=>typeof x==='number'&&!Number.isFinite(x)?String(x):x,2);
function summarize(value,limit){
 if(Array.isArray(value)){
  // Keep short coordinates/complex pairs intact; summarize every collection of rows.
  if(value.length<=4&&value.every(x=>x===null||typeof x!=='object'))return value.slice();
  const firstItems=value.slice(0,limit).map(x=>summarize(x,limit));
  return {previewType:'array',totalItems:value.length,shownItems:firstItems.length,omittedItems:value.length-firstItems.length,firstItems};
 }
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,x])=>[key,summarize(x,limit)]));
 return value;
}
function preview(record){
 const info={kind:'preview-only',completeRecord:false,notice:'仅为限长预览；复现请下载完整 JSON。数组 firstItems 只含开头的项目；省略数量见 omittedItems。',nonFiniteNumbers:'Infinity, -Infinity and NaN are strings, never null',maxCharacters:MAX_PREVIEW_CHARACTERS};
 for(const limit of [2,1,0]){
  const text=stringify({previewInfo:{...info,maxCollectionItemsShown:limit},record:summarize(record,limit)});
  if(text.length<=MAX_PREVIEW_CHARACTERS)return text;
 }
 // If a future schema has very large scalar fields, do not truncate JSON syntax.
 const fields=Object.keys(record),text=stringify({previewInfo:info,recordOmitted:true,omittedFieldCount:fields.length,omittedTopLevelFields:fields});
 if(text.length>MAX_PREVIEW_CHARACTERS)throw new RangeError('Record schema exceeds preview budget');
 return text;
}
function create({disclosure,output,button,status}){
 let fullText='',previewText='',filename='';const urls=new Set();
 function revoke(url){if(urls.delete(url))URL.revokeObjectURL(url);}
 function release(){for(const url of [...urls])revoke(url);}
 function refresh(){output.textContent=disclosure.open?previewText:'';}
 function clear(){release();fullText='';previewText='';filename='';output.textContent='';button.disabled=true;status.textContent='';}
 function update(record,name){
  // Prepare both from the same successful render before replacing the old snapshot.
  const nextFull=stringify(record),nextPreview=preview(record);
  fullText=nextFull;previewText=nextPreview;filename=name;button.disabled=false;status.textContent='';refresh();
 }
 button.addEventListener('click',()=>{
  if(!fullText)return;
  let url,anchor;
  try{
   url=URL.createObjectURL(new Blob([fullText],{type:'application/json;charset=utf-8'}));urls.add(url);
   anchor=document.createElement('a');anchor.hidden=true;anchor.href=url;anchor.download=filename;
   document.body.append(anchor);anchor.click();
   status.textContent='已请求浏览器下载完整 JSON；若未收到文件，请检查浏览器下载提示后重试。页面仍只显示预览。';
   setTimeout(()=>revoke(url),1000);
  }catch{
   if(url)revoke(url);
   status.textContent='完整 JSON 下载未能启动。页面只有预览，不能代替完整记录；请重试或换用支持本地文件下载的浏览器。';
  }finally{if(anchor)anchor.remove();}
 });
 disclosure.addEventListener('toggle',refresh);
 window.addEventListener('pagehide',release);
 clear();return {update,clear,refresh};
}
window.ExperimentRecord=Object.freeze({create,preview,stringify,MAX_PREVIEW_CHARACTERS});
})();
