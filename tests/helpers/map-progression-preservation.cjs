'use strict';
// Reverse only this reviewed selection and its three generator hooks. Historical
// hashes still cover every other field and byte; no baseline is refreshed here.
const a=require('node:assert/strict');
const {withoutCapacityExecutionRenderer}=require('./capacity-execution-preservation.cjs');
const {withoutPilotContinuation}=require('./pilot-continuation-preservation.cjs');
const {withoutNetworkProgression}=require('./network-context-preservation.cjs');
const progression={nodeId:'known-pilots',unitId:'pilot',guideId:'ofdm-passive-atomic-errors-2017',nextGuideId:'zak-otfs-semiblind-offgrid-2026'};
const progressions=[progression,
 {nodeId:'angle',unitId:'array',guideId:'channels-shared-clusters-2024',nextGuideId:'channels-sensing-communication-mapping-2026'},
 {nodeId:'echo',unitId:'echo',guideId:'channels-target-environment-coupling-2025',nextGuideId:'channels-sensing-communication-mapping-2026'},
 {nodeId:'beam-design',unitId:'array',guideId:'mimo-ofdm-realtime-testbed-2023',nextGuideId:'sbfd-resource-synchronization-2026'}
];
function withoutMapProgressions(registry){
 const old=withoutNetworkProgression(registry),map=old.knowledgeMap;
 a.equal(Object.keys(map).at(-1),'progressions','map progression is an appended key');
 a.deepEqual(map.progressions,progressions,'exactly four reviewed map progressions');
 delete map.progressions;
 return old;
}
const guideDeclaration='const researchGuides=buildResearchGuides(JSON.parse(read(registry.researchGuidesFile)),registry);\n';
const homeDeclaration="const home=pageFor('index.html');\n";
const directionDeclaration='function directionCard(d){\n';
const mapCall="homeBody+=require(path.join(__dirname,'knowledge-map.cjs'))(registry,researchGuides);\n";
const oldMapCall="homeBody+=require(path.join(__dirname,'knowledge-map.cjs'))(registry);\n";
const homeEmit='emit(\'index.html\',document(home,homeBody,{legacy:true,styles:\'<link rel="stylesheet" href="knowledge-map.css?v=map-progression-v1">\',scripts:\'<script defer src="knowledge-map.js?v=knowledge-map-v3"></script>\'}));\n';
function once(source,hook,label){a.equal(source.split(hook).length,2,'exactly one '+label);}
function withoutMapProgressionGenerator(source){
 for(const [hook,label]of [[guideDeclaration,'validated guide declaration'],[homeDeclaration,'home declaration'],[directionDeclaration,'direction renderer'],[mapCall,'map guide argument'],[homeEmit,'home stylesheet hook']])once(source,hook,label);
 a.ok(source.includes(guideDeclaration+homeDeclaration),'validated guides are immediately before the home declaration');
 a.ok(source.includes(mapCall+'homeBody+=`<section class="site-section" id="curriculum">'),'map call remains immediately before curriculum');
 once(source,'knowledge-map.css?v=map-progression-v1','map stylesheet version');
 return source.replace(guideDeclaration+homeDeclaration,homeDeclaration)
  .replace(directionDeclaration,guideDeclaration+directionDeclaration)
  .replace(mapCall,oldMapCall)
  .replace(homeEmit,homeEmit.replace('map-progression-v1','learning-entry-v1'));
}

// Reverse only the exact reviewed render-before-validation hooks. Each full
// string must occur once and in its reviewed order before any replacement.
// All other bytes remain subject to the original historical digest guards.
const buildLinkValidationHooks={
 "scripts/generate-site.cjs":[
  {
   before:"const check=process.argv.includes('--check'), changed=[];\n",
   after:"const check=process.argv.includes('--check'), changed=[],outputs=new Map();\n"
  },
  {
   before:[
    "const {createLearningEntryResolver}=require(path.join(__dirname,'learning-entry.cjs'));\n",
    "const learningEntries=createLearningEntryResolver(registry);\n"
   ].join(''),
   after:[
    "const {createLearningEntryResolver,createBuildLinkValidationContext}=require(path.join(__dirname,'learning-entry.cjs'));\n",
    "const linkValidation=createBuildLinkValidationContext();\n",
    "const learningEntries=createLearningEntryResolver(registry,linkValidation);\n"
   ].join('')
  },
  {
   before:"const notebookTopics=buildNotebookTopics(registry);\n",
   after:"const notebookTopics=buildNotebookTopics(registry,linkValidation);\n"
  },
  {
   before:"function emit(file,text){text=text.trimEnd()+'\\n';if(!fs.existsSync(path.join(root,file))||read(file)!==text){changed.push(file);if(!check)fs.writeFileSync(path.join(root,file),text);}}\n",
   after:[
    "// Rendering stages bytes from handwritten sources. Generated-only outputs are\n",
    "// never inputs; no output is written before complete link/duplicate-ID validation.\n",
    "function emit(file,text){if(outputs.has(file))throw new Error('Duplicate generated output: '+file);outputs.set(file,text.trimEnd()+'\\n');}\n"
   ].join('')
  },
  {
   before:"const researchGuides=buildResearchGuides(JSON.parse(read(registry.researchGuidesFile)),registry);\n",
   after:"const researchGuides=buildResearchGuides(JSON.parse(read(registry.researchGuidesFile)),registry,linkValidation);\n"
  },
  {
   before:"homeBody+=require(path.join(__dirname,'knowledge-map.cjs'))(registry,researchGuides);\n",
   after:"homeBody+=require(path.join(__dirname,'knowledge-map.cjs'))(registry,researchGuides,linkValidation);\n"
  },
  {
   before:[
    "reading+=renderComparisonGroups(registry);\n",
    "reading+=renderResearchDirectory(researchDirectory,registry,file=>fs.existsSync(path.join(root,file)));\n"
   ].join(''),
   after:[
    "reading+=renderComparisonGroups(registry,linkValidation);\n",
    "reading+=renderResearchDirectory(researchDirectory,registry,file=>registry.pages.some(page=>page.path===file),linkValidation);\n"
   ].join('')
  },
  {
   before:"if(changed.length){console.log((check?'Out of date: ':'Generated: ')+changed.join(', '));if(check)process.exitCode=1;}else console.log('Generated site is current.');\n",
   after:[
    "linkValidation.validateOutputs(outputs);\n",
    "for(const [file,text]of outputs)if(!fs.existsSync(path.join(root,file))||read(file)!==text){changed.push(file);if(!check)fs.writeFileSync(path.join(root,file),text);}\n",
    "if(changed.length){console.log((check?'Out of date: ':'Generated: ')+changed.join(', '));if(check)process.exitCode=1;}else console.log('Generated site is current.');\n"
   ].join('')
  },
 ],
 "scripts/knowledge-map.cjs":[
  {
   before:"module.exports=function renderMap(r,researchGuides){\n",
   after:"module.exports=function renderMap(r,researchGuides,validationContext){\n"
  },
  {
   before:" const learningEntries=createLearningEntryResolver(r);\n",
   after:" const learningEntries=createLearningEntryResolver(r,validationContext);\n"
  },
  {
   before:" const guides=new Map((researchGuides||[]).map(g=>[g.id,g])),local=createLearningEntryResolver({units:[],cases:[]});\n",
   after:" const guides=new Map((researchGuides||[]).map(g=>[g.id,g])),local=createLearningEntryResolver({units:[],cases:[]},validationContext);\n"
  },
 ],
 "scripts/learning-entry.cjs":[
  {
   before:"function createLearningEntryResolver(registry){\n",
   after:[
    "\n",
    "// One generator invocation owns one context. The ordinary resolver below still\n",
    "// checks real files immediately; only an explicitly injected build context may\n",
    "// defer target existence until the complete rendered site is available.\n",
    "class BuildLinkValidationContext{\n",
    " #buildContext=true;\n",
    " static is(value){return value!==null&&typeof value==='object'&&#buildContext in value;}\n",
    " constructor(){\n",
    " const queued=[];let finalPages;\n",
    " const target=(pages,page,fragment,label)=>{\n",
    "  if(!pages.has(page))throw new Error('Missing '+label+' page: '+page);\n",
    "  if(fragment!==null&&!pages.get(page).has(fragment))throw new Error('Missing '+label+' fragment: '+page+'#'+fragment);\n",
    " };\n",
    " const queueTarget=(page,fragment,label)=>{\n",
    "  if(finalPages)target(finalPages,page,fragment,label);\n",
    "  else queued.push({page,fragment,label});\n",
    " };\n",
    " function validateOutputs(outputs){\n",
    "  if(finalPages)throw new Error('Build link validation is already complete');\n",
    "  const pages=new Map(),references=[];\n",
    "  for(const [file,html]of outputs){\n",
    "   if(!file.endsWith('.html'))continue;\n",
    "   if(!/^[A-Za-z0-9_-]+\\.html$/.test(file)||typeof html!=='string'||pages.has(file))throw new Error('Invalid or duplicate rendered page: '+file);\n",
    "   const ids=new Set();pages.set(file,ids);\n",
    "   for(const attributes of htmlAttributes(html)){\n",
    "    if(attributes.has('id')){\n",
    "     const id=attributes.get('id');\n",
    "     if(ids.has(id))throw new Error('Duplicate rendered HTML ID: '+file+'#'+id);\n",
    "     ids.add(id);\n",
    "    }\n",
    "    for(const attribute of ['href','src'])if(attributes.has(attribute))references.push({file,href:attributes.get(attribute)});\n",
    "   }\n",
    "  }\n",
    "  for(const {page,fragment,label}of queued)target(pages,page,fragment,label);\n",
    "  for(const {file,href}of references){\n",
    "   if(/^(?:[a-z][a-z0-9+.-]*:|\\/\\/)/i.test(href))continue;\n",
    "   if(href.startsWith('/')||/[\\u0000-\\u0020\\u007f\\\\]/.test(href))throw new Error('Invalid rendered local link: '+file+' → '+href);\n",
    "   let url,page,fragment;\n",
    "   try{\n",
    "    url=new URL(href,'https://rendered.invalid/ISAC/'+file);\n",
    "    page=decodeURIComponent(url.pathname.slice('/ISAC/'.length))||'index.html';\n",
    "    fragment=url.hash?decodeURIComponent(url.hash.slice(1)):null;\n",
    "   }catch{throw new Error('Invalid rendered local link: '+file+' → '+href);}\n",
    "   if(url.origin!=='https://rendered.invalid'||!url.pathname.startsWith('/ISAC/'))throw new Error('Invalid rendered local link: '+file+' → '+href);\n",
    "   // Assets and documents keep their separate compatibility dependency checks.\n",
    "   if(!page.endsWith('.html'))continue;\n",
    "   target(pages,page,fragment,'rendered local link from '+file);\n",
    "  }\n",
    "  // Publish the index only after every check succeeds. Render helpers called\n",
    "  // again after completion must validate new targets against this same index.\n",
    "  finalPages=pages;queued.length=0;\n",
    " }\n",
    " Object.assign(this,{queueTarget,validateOutputs});Object.freeze(this);\n",
    " }\n",
    "}\n",
    "Object.freeze(BuildLinkValidationContext);Object.freeze(BuildLinkValidationContext.prototype);\n",
    "function createBuildLinkValidationContext(){return new BuildLinkValidationContext();}\n",
    "\n",
    "// Read attributes from actual tags, not comments or embedded script/style text.\n",
    "// Single/double quotes, unquoted values, and character references are supported.\n",
    "function* htmlAttributes(html){\n",
    " const tags=/<!--[^]*?-->|<![^>]*>|<\\/[^>]*>|<([A-Za-z][A-Za-z0-9:-]*)(\\s+(?:\"[^\"]*\"|'[^']*'|[^'\">])*)?\\s*\\/?>/g;\n",
    " let tag;\n",
    " while((tag=tags.exec(html))){\n",
    "  if(!tag[1])continue;\n",
    "  const attributes=new Map(),source=tag[2]||'';\n",
    "  const pattern=/([^\\s=/>]+)(?:\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+)))?/g;\n",
    "  let attribute;\n",
    "  while((attribute=pattern.exec(source))){\n",
    "   const name=attribute[1].toLowerCase();\n",
    "   if(!attributes.has(name))attributes.set(name,decodeHtmlAttribute(attribute[2]??attribute[3]??attribute[4]??''));\n",
    "  }\n",
    "  yield attributes;\n",
    "  if(/^(?:script|style|textarea|title)$/i.test(tag[1])){\n",
    "   const close=new RegExp('</'+tag[1]+'\\\\s*>','ig');close.lastIndex=tags.lastIndex;\n",
    "   const end=close.exec(html);tags.lastIndex=end?close.lastIndex:html.length;\n",
    "  }\n",
    " }\n",
    "}\n",
    "function decodeHtmlAttribute(value){\n",
    " const entities={amp:'&',AMP:'&',quot:'\"',QUOT:'\"',apos:\"'\",lt:'<',LT:'<',gt:'>',GT:'>'};\n",
    " return value.replace(/&(#(?:[xX][0-9A-Fa-f]+|[0-9]+)|amp|AMP|quot|QUOT|apos|lt|LT|gt|GT);/g,(whole,entity)=>{\n",
    "  if(entity[0]!=='#')return entities[entity];\n",
    "  const code=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));\n",
    "  return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'\\ufffd';\n",
    " });\n",
    "}\n",
    "\n",
    "function createLearningEntryResolver(registry,validationContext){\n",
    " if(validationContext!==undefined&&!BuildLinkValidationContext.is(validationContext))throw new Error('Invalid build link validation context');\n"
   ].join('')
  },
  {
   before:"  if(!pageIds.has(entry[1])){\n",
   after:[
    "  if(validationContext){validationContext.queueTarget(entry[1],fragment,label);return href;}\n",
    "  if(!pageIds.has(entry[1])){\n"
   ].join('')
  },
  {
   before:"module.exports={createLearningEntryResolver};\n",
   after:"module.exports={createLearningEntryResolver,createBuildLinkValidationContext};\n"
  },
 ],
 "scripts/notebook-topics.cjs":[
  {
   before:[
    "function buildNotebookTopics(registry){\n",
    " const entries=createLearningEntryResolver(registry);\n"
   ].join(''),
   after:[
    "function buildNotebookTopics(registry,validationContext){\n",
    " const entries=createLearningEntryResolver(registry,validationContext);\n"
   ].join('')
  },
  {
   before:" const canonical=createLearningEntryResolver({units:[],cases:[]});\n",
   after:" const canonical=createLearningEntryResolver({units:[],cases:[]},validationContext);\n"
  },
 ],
 "scripts/paper-comparison-groups.cjs":[
  {
   before:[
    "function buildComparisonGroups(registry){\n",
    " const entries=createLearningEntryResolver(registry),canonical=createLearningEntryResolver({units:[],cases:[]});\n"
   ].join(''),
   after:[
    "function buildComparisonGroups(registry,validationContext){\n",
    " const entries=createLearningEntryResolver(registry,validationContext),canonical=createLearningEntryResolver({units:[],cases:[]},validationContext);\n"
   ].join('')
  },
  {
   before:[
    "function renderComparisonGroups(registry){\n",
    " const groups=buildComparisonGroups(registry);if(!groups.length)return '';\n"
   ].join(''),
   after:[
    "function renderComparisonGroups(registry,validationContext){\n",
    " const groups=buildComparisonGroups(registry,validationContext);if(!groups.length)return '';\n"
   ].join('')
  },
 ],
 "scripts/render-research-directory.cjs":[
  {
   before:[
    "function renderResearchDirectory(data, registry, exists){\n",
    " const learningEntries=createLearningEntryResolver(registry);\n"
   ].join(''),
   after:[
    "function renderResearchDirectory(data, registry, exists, validationContext){\n",
    " const learningEntries=createLearningEntryResolver(registry,validationContext);\n"
   ].join('')
  },
 ],
 "scripts/research-guides.cjs":[
  {
   before:"function buildResearchGuides(data,registry){\n",
   after:"function buildResearchGuides(data,registry,validationContext){\n"
  },
  {
   before:" const local=createLearningEntryResolver({units:[],cases:[]});\n",
   after:" const local=createLearningEntryResolver({units:[],cases:[]},validationContext);\n"
  },
 ],
};
function withoutBuildLinkValidation(file,source){
 source=require('./ofdm-false-alarm-integration-preservation.cjs').withoutFile(file,Buffer.from(source)).toString();
 if(file==='site/registry.json')return JSON.stringify(require('./gc-sage-preservation.cjs').withoutGCSAGERegistry(JSON.parse(source)),null,2)+'\n';
 // Remove only the exact reviewed shell and executable-guide additions before
 // reversing deferred hooks; every historical digest stays fixed.
 if(file==='scripts/render-research-directory.cjs')source=require('./waveform-live-preservation.cjs').withoutWaveformLiveRenderer(source);
 if(file==='scripts/generate-site.cjs')source=withoutPilotContinuation(source);
 if(file==='scripts/research-guides.cjs')source=withoutCapacityExecutionRenderer(source);
 const hooks=buildLinkValidationHooks[file];if(!hooks)return source;
 let previous=-1;
 for(const [index,{after}]of hooks.entries()){
  once(source,after,file+' render-before-validation hook '+(index+1));
  const offset=source.indexOf(after);a.ok(offset>previous,file+' reviewed hook order');previous=offset;
 }
 for(const {before,after}of hooks)source=source.replace(after,()=>before);
 return source;
}
module.exports={withoutBuildLinkValidation,buildLinkValidationHooks,withoutMapProgressions,withoutMapProgressionGenerator,progression,progressions,guideDeclaration,homeDeclaration,directionDeclaration,mapCall,homeEmit};
