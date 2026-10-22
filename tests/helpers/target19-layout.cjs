"use strict";
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function stripSite(s){
 const tokens=[...s.matchAll(/<!-- SITE:[^]*?-->/g)],expected=['HEADER:START','HEADER:END','CONTEXT:START','CONTEXT:END','NEXT:START','NEXT:END'];
 assert.deepEqual(tokens.map(x=>x[0]),expected.map(x=>'<!-- SITE:'+x+' -->'),'exact ordered, paired SITE markers required');
 const opens=[...s.matchAll(/<body(?:\s[^>]*|)>/gi)],closes=[...s.matchAll(/<\/body\s*>/gi)];assert.equal(opens.length,1);assert.equal(closes.length,1);
 const lo=opens[0].index+opens[0][0].length,hi=closes[0].index;let result=s;
 for(let i=4;i>=0;i-=2){const a=tokens[i],b=tokens[i+1],end=b.index+b[0].length;assert(a.index>=lo&&end<=hi,'SITE regions must stay inside body');const region=s.slice(a.index,end);assert(!/<\/?(?:body|html|head)(?:\s|>)/i.test(region),'SITE cannot cross document boundaries');result=result.slice(0,a.index)+a[0]+b[0]+result.slice(end);}
 return result;
}
function reader(root,base=root){
 const expected='49d097094248d4a73ff0634c400ab64c22b53cff4dff8ad564a135dce2d6b1d9',side=fs.readFileSync(path.join(root,'tests/helpers/target19-layout-manifest.json'));assert.equal(sha(side),expected,'exact staged mapping sidecar hash');
 const original=path.join(root,'build/compatibility-manifest.json');if(fs.existsSync(original)){const T=require('./target19-source-identity.cjs');try{T.assertCurrentClosure(root);assert(T.teachingBefore('build/compatibility-manifest.json',fs.readFileSync(original)).equals(side),'source manifest exact198 teaching predecessor must match immutable staged sidecar');}catch(error){assert.fail('source manifest current identity rejected: '+error.message);}}
 const manifest=JSON.parse(side);
 return p=>{if(p==='build/compatibility-manifest.json')return side;for(const dir of [root,base]){const direct=path.join(dir,p);if(fs.existsSync(direct))return fs.readFileSync(direct);const e=manifest.entries.find(e=>e.source===p);if(e&&e.compatibility&&fs.existsSync(path.join(dir,e.compatibility)))return fs.readFileSync(path.join(dir,e.compatibility));}throw Error('Unmapped target19 input: '+p);};
}
function assertPage(s,{root,source,full,body}){assert.equal(sha(stripSite(s)),body,'unchanged scientific body outside exact SITE regions');if(fs.existsSync(path.join(root,source)))assert.equal(sha(s),full,'authored exact full bytes');}
function assertState(config){assert.equal(typeof config.releaseReady,'boolean');assert.equal(config.deployed,false);assert.equal(config.modules.length,19);for(const m of config.modules){for(const k of ['enabled','coreReady','bindingComplete'])assert.equal(typeof m[k],'boolean');if(m.enabled)assert.equal(m.bindingComplete,true);}if(config.releaseReady)assert(config.modules.every(m=>m.enabled&&m.coreReady&&m.bindingComplete));}
module.exports={reader,stripSite,assertPage,assertState,sha};
