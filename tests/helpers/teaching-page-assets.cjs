'use strict';
// Test-only exact current teaching resource boundary; never used by production.
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),T=require('./target19-source-identity.cjs');
module.exports=function teachingPageAssets(root,file,html){
 a.equal(typeof root,'string');root=path.resolve(root);T.assertCurrentClosure(root);
 a.equal(fs.readFileSync(T.regular(root,file),'utf8'),html,'Actual current page read required');
 const source=T.sourceLayout(root),names=['manual.js','guided-lesson.css','integration.css','lessons.js','receiver-adapters.js','receiver-views.js','theory-adapters.js','theory-views.js','engine.js'];
 const tags=names.map(n=>n.endsWith('.css')?`<link rel="stylesheet" href="features/teaching19/${n}">`:`<script ${n==='manual.js'?'':'defer '}src="features/teaching19/${n}"></script>`),bundle=tags.join('');
 if(source){a.ok(!html.includes('features/teaching19/'),'Handwritten source remains generator-owned');return {scriptTags:[],styleTags:[],scriptUrls:[],deferUrls:[]};}
 a.equal(html.split(bundle).length,2,'Exactly one complete approved teaching bundle in declared load order');
 const actual=html.match(/<(?:script|link)\b[^>]*(?:src|href)="features\/teaching19\/[^\"]+"[^>]*>(?:<\/script>)?/g)||[];
 a.deepEqual(actual,tags,'No partial duplicate unknown or reordered teaching references');
 // T.assertCurrentClosure above binds each of the nine actual asset bytes.
 return {scriptTags:tags.filter(x=>x.startsWith('<script')),styleTags:tags.filter(x=>x.startsWith('<link')),scriptUrls:names.filter(n=>n.endsWith('.js')).map(n=>'features/teaching19/'+n),deferUrls:names.filter(n=>n.endsWith('.js')&&n!=='manual.js').map(n=>'features/teaching19/'+n)};
};
