'use strict';
// Build-time only: browsers receive resolved links, never filesystem logic.
// Generic teaching entries share this resolver; explicit experiment CTAs use unit.href.
const fs=require('node:fs'),path=require('node:path');

// One generator invocation owns one context. The ordinary resolver below still
// checks real files immediately; only an explicitly injected build context may
// defer target existence until the complete rendered site is available.
class BuildLinkValidationContext{
 #buildContext=true;
 static is(value){return value!==null&&typeof value==='object'&&#buildContext in value;}
 constructor(){
 const queued=[];let finalPages;
 const target=(pages,page,fragment,label)=>{
  if(!pages.has(page))throw new Error('Missing '+label+' page: '+page);
  if(fragment!==null&&!pages.get(page).has(fragment))throw new Error('Missing '+label+' fragment: '+page+'#'+fragment);
 };
 const queueTarget=(page,fragment,label)=>{
  if(finalPages)target(finalPages,page,fragment,label);
  else queued.push({page,fragment,label});
 };
 function validateOutputs(outputs){
  if(finalPages)throw new Error('Build link validation is already complete');
  const pages=new Map(),references=[];
  for(const [file,html]of outputs){
   if(!file.endsWith('.html'))continue;
   if(!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.html$/.test(file)||typeof html!=='string'||pages.has(file))throw new Error('Invalid or duplicate rendered page: '+file);
   const ids=new Set();pages.set(file,ids);
   for(const attributes of htmlAttributes(html)){
    if(attributes.has('id')){
     const id=attributes.get('id');
     if(ids.has(id))throw new Error('Duplicate rendered HTML ID: '+file+'#'+id);
     ids.add(id);
    }
    for(const attribute of ['href','src'])if(attributes.has(attribute))references.push({file,href:attributes.get(attribute)});
   }
  }
  for(const {page,fragment,label}of queued)target(pages,page,fragment,label);
  for(const {file,href}of references){
   if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href))continue;
   if(href.startsWith('/')||/[\u0000-\u0020\u007f\\]/.test(href))throw new Error('Invalid rendered local link: '+file+' → '+href);
   let url,page,fragment;
   try{
    url=new URL(href,'https://rendered.invalid/ISAC/'+file);
    page=decodeURIComponent(url.pathname.slice('/ISAC/'.length))||'index.html';
    fragment=url.hash?decodeURIComponent(url.hash.slice(1)):null;
   }catch{throw new Error('Invalid rendered local link: '+file+' → '+href);}
   if(url.origin!=='https://rendered.invalid'||!url.pathname.startsWith('/ISAC/'))throw new Error('Invalid rendered local link: '+file+' → '+href);
   // Assets and documents keep their separate compatibility dependency checks.
   if(!page.endsWith('.html'))continue;
   target(pages,page,fragment,'rendered local link from '+file);
  }
  // Publish the index only after every check succeeds. Render helpers called
  // again after completion must validate new targets against this same index.
  finalPages=pages;queued.length=0;
 }
 Object.assign(this,{queueTarget,validateOutputs});Object.freeze(this);
 }
}
Object.freeze(BuildLinkValidationContext);Object.freeze(BuildLinkValidationContext.prototype);
function createBuildLinkValidationContext(){return new BuildLinkValidationContext();}

// Read attributes from actual tags, not comments or embedded script/style text.
// Single/double quotes, unquoted values, and character references are supported.
function* htmlAttributes(html){
 const tags=/<!--[^]*?-->|<![^>]*>|<\/[^>]*>|<([A-Za-z][A-Za-z0-9:-]*)(\s+(?:"[^"]*"|'[^']*'|[^'">])*)?\s*\/?>/g;
 let tag;
 while((tag=tags.exec(html))){
  if(!tag[1])continue;
  const attributes=new Map(),source=tag[2]||'';
  const pattern=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let attribute;
  while((attribute=pattern.exec(source))){
   const name=attribute[1].toLowerCase();
   if(!attributes.has(name))attributes.set(name,decodeHtmlAttribute(attribute[2]??attribute[3]??attribute[4]??''));
  }
  yield attributes;
  if(/^(?:script|style|textarea|title)$/i.test(tag[1])){
   const close=new RegExp('</'+tag[1]+'\\s*>','ig');close.lastIndex=tags.lastIndex;
   const end=close.exec(html);tags.lastIndex=end?close.lastIndex:html.length;
  }
 }
}
function decodeHtmlAttribute(value){
 const entities={amp:'&',AMP:'&',quot:'"',QUOT:'"',apos:"'",lt:'<',LT:'<',gt:'>',GT:'>'};
 return value.replace(/&(#(?:[xX][0-9A-Fa-f]+|[0-9]+)|amp|AMP|quot|QUOT|apos|lt|LT|gt|GT);/g,(whole,entity)=>{
  if(entity[0]!=='#')return entities[entity];
  const code=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));
  return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'\ufffd';
 });
}

function createLearningEntryResolver(registry,validationContext){
 if(validationContext!==undefined&&!BuildLinkValidationContext.is(validationContext))throw new Error('Invalid build link validation context');
 const pageIds=new Map();
 function validate(href,label,canonicalPage){
  const entry=typeof href==='string'&&href.match(/^([A-Za-z0-9_-]+\.html)#([A-Za-z0-9_.:%-]+)$/);
  // Require the whole string, including any trailing newline, before reading a file.
  if(!entry||entry[0]!==href||canonicalPage&&entry[1]!==canonicalPage)throw new Error('Invalid '+label+' (expected same canonical local page and fragment)');
  let fragment;try{fragment=decodeURIComponent(entry[2]);}catch{throw new Error('Invalid '+label+' fragment');}
  if(validationContext){validationContext.queueTarget(entry[1],fragment,label);return href;}
  if(!pageIds.has(entry[1])){
   const file=path.join(__dirname,'..',entry[1]);
   if(!fs.existsSync(file))throw new Error('Missing '+label+' page');
   pageIds.set(entry[1],new Set([...fs.readFileSync(file,'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])));
  }
  if(!pageIds.get(entry[1]).has(fragment))throw new Error('Missing '+label+' fragment');
  return href;
 }
 function caseEntry(c){
  const u=registry.units.find(u=>u.id===c.unit);
  if(!u)throw new Error('Invalid case unit reference: '+c.id);
  return Object.hasOwn(c,'learningEntry')
   ?validate(c.learningEntry,'case learningEntry',u.href.split('#')[0])
   :validate(u.href,'case unit entry');
 }
 function unitEntry(u){
  const c=registry.cases.find(c=>c.unit===u.id);
  return c?caseEntry(c):validate(u.href,'unit learning entry');
 }
 return {caseEntry,unitEntry};
}
module.exports={createLearningEntryResolver,createBuildLinkValidationContext};
