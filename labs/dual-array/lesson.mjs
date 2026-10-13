import {mountLesson} from './lesson/mount.mjs';
let mounted=null;
function start(){if(!mounted&&document.getElementById('da-form'))mounted=mountLesson(document);}
function stop(){mounted?.dispose();mounted=null;}
if(typeof document!=='undefined'){start();window.addEventListener('pagehide',stop);window.addEventListener('pageshow',()=>start());}
