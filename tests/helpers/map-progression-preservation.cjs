'use strict';
// Reverse only this reviewed selection and its three generator hooks. Historical
// hashes still cover every other field and byte; no baseline is refreshed here.
const a=require('node:assert/strict');
const progression={nodeId:'known-pilots',unitId:'pilot',guideId:'ofdm-passive-atomic-errors-2017',nextGuideId:'zak-otfs-semiblind-offgrid-2026'};
const progressions=[progression,
 {nodeId:'angle',unitId:'array',guideId:'channels-shared-clusters-2024',nextGuideId:'channels-sensing-communication-mapping-2026'},
 {nodeId:'echo',unitId:'echo',guideId:'channels-target-environment-coupling-2025',nextGuideId:'channels-sensing-communication-mapping-2026'},
 {nodeId:'beam-design',unitId:'array',guideId:'mimo-ofdm-realtime-testbed-2023',nextGuideId:'sbfd-resource-synchronization-2026'}
];
function withoutMapProgressions(registry){
 const old=structuredClone(registry),map=old.knowledgeMap;
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
module.exports={withoutMapProgressions,withoutMapProgressionGenerator,progression,progressions,guideDeclaration,homeDeclaration,directionDeclaration,mapCall,homeEmit};
