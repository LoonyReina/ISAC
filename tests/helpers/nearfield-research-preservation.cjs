'use strict';
// Exact reverse of reviewed, enumerated near-field metadata edits. Every
// changed leaf is checked before restoring its historical value; unrelated
// fields remain visible to the older immutable hash contracts.
const a=require('node:assert/strict');
const I=require('./ofdm-ici-preservation.cjs');
const changes=require('./nearfield-research-changes.json'),suffixes=require('./nearfield-research-suffixes.json');
function reverse(data,entries){const prior=structuredClone(data);for(const change of [...entries].reverse()){let parent=prior;for(const k of change.path.slice(0,-1)){a.ok(parent&&Object.hasOwn(parent,k),'near-field reviewed parent present');parent=parent[k];}const k=change.path.at(-1);a.ok(Object.hasOwn(parent,k),'near-field reviewed field present');if(change.append){a.ok(Array.isArray(parent[k]));a.ok(parent[k].length>=change.lengthBefore+change.append.length,'near-field reviewed appended records present');a.deepEqual(parent[k].slice(change.lengthBefore,change.lengthBefore+change.append.length),change.append,'exact near-field appended records');parent[k].splice(change.lengthBefore,change.append.length);continue;}a.deepEqual(parent[k],change.after,'exact near-field metadata '+change.path.join('.'));if(change.added)delete parent[k];else parent[k]=structuredClone(change.before);}return prior;}
const withoutNearfieldRegistry=r=>reverse(I.maybeWithoutIciRegistry(r),changes.registry),withoutNearfieldGuides=g=>{g=I.maybeWithoutIciGuides(g);const indices=g.cards.flatMap((c,i)=>c.id==='nearfield-double-array-ispac'?[i]:[]);a.equal(indices.length,1,'one original near-field guide');return reverse(g,changes.guides.map(ch=>({...ch,path:['cards',indices[0],...ch.path.slice(2)]})));},withoutNearfieldBacklog=b=>reverse(I.maybeWithoutIciBacklog(b),changes.backlog);
const maybeWithoutNearfieldRegistry=r=>r.cases.some(c=>c.id==='case-near-field'&&Object.hasOwn(c,'learningEntry'))?withoutNearfieldRegistry(r):structuredClone(r);
const maybeWithoutNearfieldGuides=g=>g.cards.some(c=>c.id==='nearfield-double-array-ispac'&&c.prerequisites.some(x=>x.href==='near-field.html#research-experiment'))?withoutNearfieldGuides(g):structuredClone(g);
function suffix(source,key){a.ok(source.endsWith(suffixes[key]),'exact near-field appended '+key);a.equal(source.split(suffixes[key]).length,2,'one near-field appended '+key);return source.slice(0,-suffixes[key].length);}
const withoutNearfieldReadingMap=s=>suffix(I.maybeWithoutIciReadingMap(s),'readingMap'),withoutNearfieldPlan=s=>suffix(I.maybeWithoutIciPlan(s),'plan'),maybeWithoutNearfieldReadingMap=s=>s.includes('## Near-field bounded research extension (2026-10-12)')?withoutNearfieldReadingMap(s):s;
module.exports={changes,suffixes,withoutNearfieldRegistry,withoutNearfieldGuides,withoutNearfieldBacklog,maybeWithoutNearfieldRegistry,maybeWithoutNearfieldGuides,withoutNearfieldReadingMap,withoutNearfieldPlan,maybeWithoutNearfieldReadingMap};

const prerequisiteBefore='const prerequisiteTitles={\n',prerequisiteAfter="const prerequisiteTitles={\n 'near-field.html#experiment':'近场一程无噪声曲率先修',\n";
function withoutNearfieldPrerequisiteTitle(source){source=require('./networked-sync-preservation.cjs').maybeWithoutSyncPrerequisiteTitle(source);a.equal(source.split(prerequisiteAfter).length,2,'exact near-field old-anchor prerequisite subject');return source.replace(prerequisiteAfter,prerequisiteBefore);}
module.exports.withoutNearfieldPrerequisiteTitle=withoutNearfieldPrerequisiteTitle;
module.exports.maybeWithoutNearfieldPrerequisiteTitle=source=>source.includes("'near-field.html#experiment':")?withoutNearfieldPrerequisiteTitle(source):source;
