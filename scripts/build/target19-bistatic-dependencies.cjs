'use strict';
const requiredFiles={
  "bistatic-core.js": "a95a5adc73ba1384627d7323c601ccb255f53a9eb29ed3c542e79a5cd7d38771",
  "bistatic-worker.js": "bad47fca67ce38f7e481c5f7b24a0ad6fdc44d517afebad619a86f4d21c69dc5",
  "bistatic-ui.js": "71e2a1abd07d9b89a800940c15b399e98097cfb5fb78a91d7d73243cce22c540",
  "bistatic.css": "9c62b02ed320d76dc6b178c3aad21b2e3e2f7ff18531aca0566f68eb4e9673b3"
};
function target19BistaticDependencies({identities,pages,read}){
 const files=new Map(identities.map(e=>[e.file,e.sha256]));for(const [file,h] of Object.entries(requiredFiles))if(files.get(file)!==h)throw Error('Target19 bistatic missing/changed '+file);
 const page=pages.find(p=>p.file==='network-clock.html');if(!page||!page.source.includes('id="bistatic-core"')||!page.source.includes('src="bistatic-ui.js"')||!page.source.includes('href="bistatic.css"'))throw Error('Target19 bistatic mount missing');
 const ui=read('bistatic-ui.js'),worker=read('bistatic-worker.js');
 if(ui.split("new Worker('bistatic-worker.js')").length!==2||worker.split("importScripts('bistatic-core.js')").length!==2)throw Error('Target19 bistatic runtime shape changed');
 return [{from:'network-clock.html',url:'bistatic-ui.js',kind:'target19-classic-script'},{from:'network-clock.html',url:'bistatic.css',kind:'target19-css'},{from:'network-clock.html',url:'bistatic-worker.js',kind:'target19-classic-worker-document'},{from:'bistatic-worker.js',url:'bistatic-core.js',kind:'target19-importScripts'}];
}
module.exports={requiredFiles,target19BistaticDependencies};
