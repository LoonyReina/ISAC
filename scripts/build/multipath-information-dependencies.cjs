'use strict';
// Current-code closure for the bounded multipath information lesson. This checker
// never projects historical bytes and binds all eight assets, Worker and page.
const a=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const contract={
  "schemaVersion": 1,
  "entryPoint": "multipath-channel.html",
  "normalizedPageSha256": "d0b91d02bb278909bf99f56c2b66a241f19b4439e679e915bd5740a20933b2f6",
  "modules": [
    {
      "public": "multipath-information-core/multipath-fisher-core.mjs",
      "sha256": "7323407f2d76c34c9fd30661d43905bb237c2fe93c4ab719b98a565e0a3a15eb",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": [
        "./numerical-kernel.mjs",
        "./provenance.mjs"
      ]
    },
    {
      "public": "multipath-information-core/multipath-fisher-worker.mjs",
      "sha256": "11adc46037725ee03dc5e7f64eb1608a49f9b6124e36686d1957d2d06aa479fb",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": [
        "./multipath-fisher-core.mjs"
      ]
    },
    {
      "public": "multipath-information-core/numerical-kernel.mjs",
      "sha256": "4f6e5ca347b0ac055362abf1f976b821b91cc40f9640be70b6be458ffbd1daa5",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": []
    },
    {
      "public": "multipath-information-core/provenance.mjs",
      "sha256": "bbd4fcb81bdce145f9f7c2da7faf4fe6afa10694c14f5273e053cd80c23aeea0",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": []
    },
    {
      "public": "multipath-information-ui.mjs",
      "sha256": "27982b9fa8730d093be5131af3605e2e4368bce78b419e806a1524f5d78b090c",
      "runtimeEdges": [
        {
          "kind": "worker",
          "url": "./multipath-information-core/multipath-fisher-worker.mjs",
          "literal": "new Worker(new URL('./multipath-information-core/multipath-fisher-worker.mjs',import.meta.url),{type:'module'})"
        }
      ],
      "runtimePolicy": "literal-workers",
      "unverifiedInputs": [],
      "staticSpecifiers": [
        "./multipath-information-core/multipath-fisher-core.mjs",
        "./multipath-information-controller.mjs",
        "./multipath-information-views.mjs"
      ]
    },
    {
      "public": "multipath-information-controller.mjs",
      "sha256": "92b90527881ad3b6f3ffb5c3f9620cdb21178ba44562f27faaaa4b008fe48320",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": []
    },
    {
      "public": "multipath-information-views.mjs",
      "sha256": "efd73a88af2b4acc77718beef8c47ca6f53a1cea404b4187c8b7d301d6cba9d2",
      "runtimeEdges": [],
      "runtimePolicy": "no-runtime-loads",
      "unverifiedInputs": [],
      "staticSpecifiers": []
    }
  ],
  "assets": [
    {
      "public": "multipath-information.css",
      "sha256": "c95f00a8a2b3c3cdf009a75444243359cda37b0334c7d82c4369acc415f2696d"
    }
  ],
  "pageScripts": [
    "<script defer src=\"multipath-channel-core.js?v=multipath-channel-v1\"></script>",
    "<script defer src=\"experiment-record.js?v=record-preview-v1\"></script>",
    "<script defer src=\"multipath-channel.js?v=multipath-channel-v2-axis-label\"></script>",
    "<script defer src=\"reflection-aperture-core.js?v=reflection-aperture-v1\"></script>",
    "<script defer src=\"reflection-aperture.js?v=reflection-aperture-v1\"></script>",
    "<script type=\"module\" src=\"multipath-information-ui.mjs?v=mpi-20261015-v1\"></script>"
  ],
  "pageStyles": [
    "<link rel=\"stylesheet\" href=\"course.css\">",
    "<link rel=\"stylesheet\" href=\"site.css?v=knowledge-map-v1\">",
    "<link rel=\"stylesheet\" href=\"multipath-channel.css?v=multipath-channel-v1\">",
    "<link rel=\"stylesheet\" href=\"reflection-aperture.css?v=reflection-aperture-v1\">",
    "<link rel=\"stylesheet\" href=\"multipath-information.css?v=mpi-20261015-v1\">"
  ]
};
const normalizePage=s=>s.replace(/<!-- SITE:(HEADER|CONTEXT|NEXT):START -->[\s\S]*?<!-- SITE:\1:END -->/g,(_,key)=>'<!-- SITE:'+key+' -->');
const runtimeProfiles=contract.modules.map(m=>({public:m.public,sha256:m.sha256,runtimeEdges:m.runtimeEdges,runtimePolicy:m.runtimePolicy,unverifiedInputs:m.unverifiedInputs}));
function multipathDependencies(modules,identities,pages,parse){
 const files=[...contract.modules,...contract.assets],expected=new Map(files.map(f=>[f.public,f])),ids=new Map(),sources=new Map();
 for(const id of identities){a.deepEqual(Object.keys(id).sort(),['file','sha256']);a.ok(!ids.has(id.file),'unique multipath identity');ids.set(id.file,id.sha256);
  if(/^multipath-information/i.test(id.file))a.ok(expected.has(id.file),'Unlisted multipath public dependency '+id.file);
  for(const f of files)if(id.sha256===f.sha256)a.equal(id.file,f.public,'Moved multipath source');
 }
 for(const f of files)a.equal(ids.get(f.public),f.sha256,'Missing or changed multipath dependency '+f.public);
 for(const m of modules){a.deepEqual(Object.keys(m).sort(),['file','source']);a.ok(!sources.has(m.file));sources.set(m.file,m.source);}
 a.deepEqual([...sources.keys()].sort(),contract.modules.map(m=>m.public).sort(),'Complete multipath module inventory');
 const edges=[];
 for(const m of contract.modules){const source=sources.get(m.public);a.equal(sha(source),m.sha256,'Exact multipath source');for(const e of m.runtimeEdges){a.equal(source.split(e.literal).length,2,'Exact multipath Worker constructor');edges.push({from:m.public,url:e.url,kind:'reviewed-multipath-'+e.kind});}}
 for(const item of parse(modules)){a.deepEqual(item.specifiers,contract.modules.find(m=>m.public===item.file).staticSpecifiers,'Exact multipath static imports');for(const url of item.specifiers)edges.push({from:item.file,url,kind:'multipath-static-module'});}
 for(const e of edges){a.ok(e.url.startsWith('./')&&!/[?#\\\s]/.test(e.url),'Local multipath edge');const target=path.posix.normalize(path.posix.join(path.posix.dirname(e.from),e.url));a.ok(expected.has(target),'Mapped multipath edge');}
 const matches=pages.filter(p=>p.file===contract.entryPoint);a.equal(matches.length,1,'One multipath page');const page=matches[0].source;
 a.equal(ids.get(contract.entryPoint),sha(page),'Exact mapped multipath page identity');
 a.equal(sha(normalizePage(page)),contract.normalizedPageSha256,'Exact multipath scientific page outside generated shell');
 a.deepEqual([...page.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]),contract.pageScripts,'Exact multipath page scripts');
 a.deepEqual([...page.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)].map(m=>m[0]),contract.pageStyles,'Exact multipath page styles');
 a.ok(!/<(?:base|iframe)\b|\son\w+\s*=/i.test(page),'No injected multipath active content');
 for(const file of ['multipath-information-ui.mjs','multipath-information.css'])edges.push({from:contract.entryPoint,url:file,kind:'multipath-page'});
 return edges;
}
module.exports={multipathDependencies,contract,runtimeProfiles,normalizePage};
