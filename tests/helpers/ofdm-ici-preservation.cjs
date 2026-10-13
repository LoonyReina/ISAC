'use strict';
// Exact inverse of the enumerated OFDM ICI registration/evidence changes.
// Old hashes stay immutable; altered reviewed records and unrelated additions
// remain errors, rather than disappearing behind a broad path exclusion.
const a=require('node:assert/strict');
const changes=require('./ofdm-ici-changes.json'),suffixes=require('./ofdm-ici-suffixes.json');
function reverse(data,entries){const prior=structuredClone(data);for(const change of [...entries].reverse()){let p=prior;for(const k of change.path.slice(0,-1)){a.ok(p&&Object.hasOwn(p,k),'ICI reviewed parent present');p=p[k];}const k=change.path.at(-1);a.ok(Object.hasOwn(p,k),'ICI reviewed field present');if(change.append){a.ok(Array.isArray(p[k]));a.ok(p[k].length>=change.lengthBefore+change.append.length,'ICI appended records present');a.deepEqual(p[k].slice(change.lengthBefore,change.lengthBefore+change.append.length),change.append,'exact ICI appended records');p[k].splice(change.lengthBefore,change.append.length);}else{a.deepEqual(p[k],change.after,'exact ICI field '+change.path.join('.'));if(change.added)delete p[k];else p[k]=structuredClone(change.before);}}return prior;}
const withoutIciRegistry=r=>reverse(r,changes.registry),withoutIciBacklog=b=>reverse(b,changes.backlog);
function withoutIciGuides(g){const indices=g.cards.flatMap((c,i)=>c.id==='ofdm-ici-aware-receiver-2021'?[i]:[]);if(!indices.length)return structuredClone(g);a.equal(indices.length,1,'unique original ICI guide');return reverse(g,changes.guides.map(c=>({...c,path:['cards',indices[0],...c.path.slice(2)]})));}
const maybeWithoutIciRegistry=r=>r.units.some(u=>u.id==='ofdm-ici-receiver')?withoutIciRegistry(r):structuredClone(r);
const maybeWithoutIciGuides=g=>g.cards.some(c=>c.id==='ofdm-ici-aware-receiver-2021'&&c.notebookTopicId==='ofdm-ici-receiver')?withoutIciGuides(g):structuredClone(g);
const maybeWithoutIciBacklog=b=>b.papers.some(p=>p.id==='ofdm-ici-aware-receiver-2021'&&p.canonicalReferences.caseIds.includes('case-ofdm-ici-receiver'))?withoutIciBacklog(b):structuredClone(b);
function suffix(s,key){a.ok(s.endsWith(suffixes[key]),'exact appended ICI '+key);a.equal(s.split(suffixes[key]).length,2,'one ICI appended '+key);return s.slice(0,-suffixes[key].length);}
const withoutIciReadingMap=s=>suffix(s,'readingMap');
function withoutIciPlan(source){source=suffix(source,'plan');const c=suffixes.planClarification;a.equal(source.split(c.after).length,2,'exact historical queue clarification before the original table');return source.replace(c.after,c.before);}
const maybeWithoutIciReadingMap=s=>s.includes('## OFDM ICI bounded receiver extension (2026-10-12)')?withoutIciReadingMap(s):s;
const maybeWithoutIciPlan=s=>s.includes('## OFDM ICI bounded receiver integration (2026-10-12)')?withoutIciPlan(s):s;
function withoutIciHomeShell(html,count){const current=`<strong>${count}</strong> 个机制实验`;a.equal(html.split(current).length,2,'one ICI lesson count');return html.replace(current,`<strong>${count-1}</strong> 个机制实验`);}
module.exports={changes,suffixes,withoutIciRegistry,withoutIciGuides,withoutIciBacklog,maybeWithoutIciRegistry,maybeWithoutIciGuides,maybeWithoutIciBacklog,withoutIciReadingMap,withoutIciPlan,maybeWithoutIciReadingMap,maybeWithoutIciPlan,withoutIciHomeShell};

// Accepted Python-formatted JSON contains one exponent with a leading zero.
// Preserve that exact lexical form for the raw-byte historical fingerprint.
function baselineBacklogText(data){const s=JSON.stringify(withoutIciBacklog(data),null,2)+'\n',short='\"maximumRateErrorBitsPerUse\": 2.591e-9,';a.equal(s.split(short).length,2,'one unchanged historical capacity rate-error field');return s.replace(short,'\"maximumRateErrorBitsPerUse\": 2.591e-09,');}
module.exports.baselineBacklogText=baselineBacklogText;
