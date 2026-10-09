/* Entry point: retain the tested textbook UI, then add the velocity-matching
   explanation. All assets are same-origin and no experiment data is sent. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src);
 function load(name){return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=new URL(name+'?v=velocity-bridge-1',base).href;
  script.onload=resolve;
  script.onerror=()=>reject(new Error('Unable to load '+name));
  document.head.appendChild(script);
 });}
 window.ISACCourseReady=(async()=>{
  await load('course-ui.js');
  await load('velocity-core.js');
  await load('velocity-bridge.js');
 })();
 window.ISACCourseReady.catch(error=>{
  console.error(error);
  const note=document.createElement('p');note.className='callout';
  note.setAttribute('role','alert');
  note.textContent='交互资源未完整加载。正文仍可阅读；请刷新页面后重试。';
  (document.querySelector('main')||document.body).prepend(note);
 });
})();
