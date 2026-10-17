'use strict';
// Current-code closure. No historical projection or fixture is used by this gate.
const a=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const contract={
  "entryPoint": "full-duplex-cancellation.html",
  "normalizedPageSha256": "09a8aa804f9ed0a61b62fdaffa3879f8fbf82c6328b4abd41111ab31e0320417",
  "modules": [
    {
      "public": "full-duplex/app.mjs",
      "sha256": "a62542a870285ce442b3937faec12fe1af2619b77d89e929340e9e8b23e43280",
      "runtimeEdges": [
        {
          "kind": "worker",
          "url": "./worker.mjs",
          "literal": "new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})"
        }
      ],
      "runtimePolicy": "literal-workers",
      "unverifiedInputs": [],
      "staticSpecifiers": [
        "./controller.mjs"
      ]
    },
    {
      "public": "full-duplex/controller.mjs",
      "sha256": "0df645720137d7ccf60168c675bfab4279bd4cdb72ad2dd7fb754b6a5d33ab41",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": []
    },
    {
      "public": "full-duplex/worker.mjs",
      "sha256": "f9a80eac9832bb1aff68fd4a2b71005ce16ce6e8b67d859ab8c1ab096dc60cea",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": [
        "./kernel.mjs",
        "./controller.mjs"
      ]
    },
    {
      "public": "full-duplex/kernel.mjs",
      "sha256": "441bf5a359dba43b3abcad1bc8289708da34680928901104463714f146a2fbe0",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": []
    }
  ],
  "assets": [
    {
      "public": "full-duplex/style.css",
      "sha256": "fc13631826dcee9114b321af81a8f252590b1bc6c0e8152bc69765df2227abc7"
    }
  ],
  "pageScripts": [
    "<script type=\"module\" src=\"full-duplex/app.mjs\"></script>"
  ],
  "pageStyles": [
    "<link rel=\"stylesheet\" href=\"course.css\">",
    "<link rel=\"stylesheet\" href=\"site.css?v=knowledge-map-v1\">",
    "<link rel=\"stylesheet\" href=\"full-duplex/style.css\">"
  ]
};
const normalizePage=s=>s.replace(/<!-- SITE:(HEADER|CONTEXT|NEXT):START -->[\s\S]*?<!-- SITE:\1:END -->/g,(_,key)=>'<!-- SITE:'+key+' -->');
const reviewedProfiles=contract.modules.map(m=>[m.public,{sha256:m.sha256,runtimePolicy:m.runtimePolicy,sourceLiterals:[],edgeKind:'reviewed-full-duplex-module',runtimeEdges:m.runtimeEdges}]);
function fullDuplexDependencies(modules,identities,pages,parse){
 const files=[...contract.modules,...contract.assets],expected=new Map(files.map(f=>[f.public,f])),ids=new Map(),sources=new Map();
 for(const id of identities){a.deepEqual(Object.keys(id).sort(),['file','sha256']);a.ok(!ids.has(id.file),'Unique full-duplex identity');ids.set(id.file,id.sha256);
  if(id.file.startsWith('full-duplex/'))a.ok(expected.has(id.file),'Unlisted full-duplex public dependency '+id.file);
  for(const f of files)if(f.sha256===id.sha256)a.equal(id.file,f.public,'Moved or duplicate full-duplex dependency');
 }
 for(const f of files)a.equal(ids.get(f.public),f.sha256,'Missing or changed full-duplex dependency '+f.public);
 for(const m of modules){a.deepEqual(Object.keys(m).sort(),['file','source']);a.ok(!sources.has(m.file));sources.set(m.file,m.source);}
 a.deepEqual([...sources.keys()].sort(),contract.modules.map(m=>m.public).sort(),'Complete full-duplex module inventory');
 const edges=[];
 for(const m of contract.modules){const source=sources.get(m.public);a.equal(sha(source),m.sha256,'Exact full-duplex source');for(const e of m.runtimeEdges){a.equal(source.split(e.literal).length,2,'Exact full-duplex Worker constructor');edges.push({from:m.public,url:e.url,kind:'full-duplex-'+e.kind});}}
 for(const item of parse(modules)){a.deepEqual(item.specifiers,contract.modules.find(m=>m.public===item.file).staticSpecifiers,'Exact full-duplex static imports');for(const url of item.specifiers)edges.push({from:item.file,url,kind:'full-duplex-static-module'});}
 for(const e of edges){a.ok(e.url.startsWith('./')&&!/[?#\\\s]/.test(e.url),'Local full-duplex edge');const target=path.posix.normalize(path.posix.join(path.posix.dirname(e.from),e.url));a.ok(expected.has(target),'Mapped full-duplex edge');}
 const matches=pages.filter(p=>p.file===contract.entryPoint);a.equal(matches.length,1,'One full-duplex page');const page=matches[0].source;
 a.equal(ids.get(contract.entryPoint),sha(page),'Exact mapped full-duplex page identity');
 a.equal(sha(normalizePage(page)),contract.normalizedPageSha256,'Exact full-duplex teaching page outside generated shell');
 a.deepEqual([...page.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]),contract.pageScripts,'Exact full-duplex page scripts');
 a.deepEqual([...page.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)].map(m=>m[0]),contract.pageStyles,'Exact full-duplex page styles');
 a.ok(!/<(?:base|iframe)\b|\son\w+\s*=/i.test(page),'No injected full-duplex active content');
 for(const file of ['full-duplex/app.mjs','full-duplex/style.css'])edges.push({from:contract.entryPoint,url:file,kind:'full-duplex-page'});
 return edges;
}
module.exports={fullDuplexDependencies,contract,reviewedProfiles,normalizePage};
