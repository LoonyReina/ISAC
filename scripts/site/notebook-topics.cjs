'use strict';
// Build-time topic data comes only from the registry. Browser/query input never
// participates in these links; the existing learning-entry resolver stays strict.
const {createLearningEntryResolver}=require('./learning-entry.cjs');
const unitIdPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateUnitId(id){
 const match=typeof id==='string'&&id.match(unitIdPattern);
 if(!match||match[0]!==id||id.length>64)throw new Error('Invalid notebook unit ID');
 return id;
}

function notebookHref(unitId){return 'practice.html?topic='+validateUnitId(unitId)+'#notebook';}

function buildNotebookTopics(registry,validationContext){
 const entries=createLearningEntryResolver(registry,validationContext);
 // Case evidence/boundary and explicit experiment links also have to resolve to
 // an existing local page and fragment, without weakening query rejection.
 const canonical=createLearningEntryResolver({units:[],cases:[]},validationContext);
 const units=new Set(),cases=new Map();
 for(const unit of registry.units){
  const id=validateUnitId(unit.id);
  if(units.has(id))throw new Error('Duplicate notebook unit ID: '+id);
  units.add(id);
 }
 for(const topic of registry.cases){
  if(!units.has(topic.unit))throw new Error('Invalid notebook case unit reference: '+topic.id);
  if(cases.has(topic.unit))throw new Error('Duplicate notebook case unit reference: '+topic.unit);
  cases.set(topic.unit,topic);
 }
 return registry.units.map(unit=>{
  for(const field of ['title','question','action'])if(typeof unit[field]!=='string')throw new Error('Invalid notebook '+field+': '+unit.id);
  const topic={id:unit.id,title:unit.title,question:unit.question,action:unit.action,
   teachingHref:entries.unitEntry(unit),experimentHref:canonical.unitEntry({href:unit.href})};
  const source=cases.get(unit.id);
  if(source){
   topic.evidenceHref=canonical.unitEntry({href:source.paper});
   topic.boundaryHref=canonical.unitEntry({href:source.next});
  }
  return topic;
 });
}

const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function renderNotebookOptions(topics){
 return topics.map(topic=>`<option value="${escapeHtml(validateUnitId(topic.id))}">${escapeHtml(topic.title)}</option>`).join('\n');
}
function renderNotebookData(topics){
 // Escape HTML delimiters even inside JSON strings so user-visible registry
 // prose cannot terminate the inert script element or create HTML comments.
 const escapes={'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'};
 const json=JSON.stringify(topics).replace(/[<>&\u2028\u2029]/g,char=>escapes[char]);
 return '<script type="application/json" id="notebook-topics">'+json+'</script>';
}

module.exports={buildNotebookTopics,notebookHref,renderNotebookOptions,renderNotebookData};
