'use strict';
// Build-time only: browsers receive resolved links, never filesystem logic.
// Generic teaching entries share this resolver; explicit experiment CTAs use unit.href.
const fs=require('node:fs'),path=require('node:path');
function createLearningEntryResolver(registry){
 const pageIds=new Map();
 function validate(href,label,canonicalPage){
  const entry=typeof href==='string'&&href.match(/^([A-Za-z0-9_-]+\.html)#([A-Za-z0-9_.:%-]+)$/);
  // Require the whole string, including any trailing newline, before reading a file.
  if(!entry||entry[0]!==href||canonicalPage&&entry[1]!==canonicalPage)throw new Error('Invalid '+label+' (expected same canonical local page and fragment)');
  let fragment;try{fragment=decodeURIComponent(entry[2]);}catch{throw new Error('Invalid '+label+' fragment');}
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
module.exports={createLearningEntryResolver};
