'use strict';
// Exact current receiver contract. This gate runs beside, never instead of, the
// existing ESM/classic scanners. Historical inverse helpers are never imported.
// The reviewed scripts have no dynamic imports/fetches. Controller injection is
// bound to the exact UI Worker constructor; Blob URLs only download local export.
// Code-owned complete identities make unknown/dynamic source changes fail closed,
// even if an attacker updates the data contract to match the changed file.
const a=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const reviewed={
  "schemaVersion": 1,
  "scripts": [
    {
      "public": "crb-receiver/runtime-manifest.js",
      "sha256": "12a9d7b8ecb0a26da7da2d78903f18a15c9a9158ed3cc77241a80b7f2e56c1a1",
      "runtimePolicy": "exact-reviewed-crb-receiver-classic",
      "runtimeEdges": []
    },
    {
      "public": "crb-receiver/core.js",
      "sha256": "3e8fa25e75ad5cd645a2b314d2c2c3938c6d6a944e94235e019008444db35c0c",
      "runtimePolicy": "exact-reviewed-crb-receiver-classic",
      "runtimeEdges": [
        {
          "url": "../crb-multiuser-model.js",
          "resolutionFrom": "crb-receiver/core.js",
          "kind": "reviewed-crb-receiver-require",
          "literal": "require('../crb-multiuser-model.js')"
        },
        {
          "url": "./runtime-manifest.js",
          "resolutionFrom": "crb-receiver/core.js",
          "kind": "reviewed-crb-receiver-require",
          "literal": "require('./runtime-manifest.js')"
        }
      ]
    },
    {
      "public": "crb-receiver/worker.js",
      "sha256": "fe90009ab6a5f24337a16844fe12b976be7e19ce5352764bb1c4b514db2be06e",
      "runtimePolicy": "exact-reviewed-crb-receiver-classic",
      "runtimeEdges": [
        {
          "url": "../crb-multiuser-data.js",
          "resolutionFrom": "crb-receiver/worker.js",
          "kind": "reviewed-crb-receiver-importScripts",
          "literal": "importScripts('../crb-multiuser-data.js','../crb-multiuser-model.js','runtime-manifest.js','core.js')"
        },
        {
          "url": "../crb-multiuser-model.js",
          "resolutionFrom": "crb-receiver/worker.js",
          "kind": "reviewed-crb-receiver-importScripts",
          "literal": "importScripts('../crb-multiuser-data.js','../crb-multiuser-model.js','runtime-manifest.js','core.js')"
        },
        {
          "url": "runtime-manifest.js",
          "resolutionFrom": "crb-receiver/worker.js",
          "kind": "reviewed-crb-receiver-importScripts",
          "literal": "importScripts('../crb-multiuser-data.js','../crb-multiuser-model.js','runtime-manifest.js','core.js')"
        },
        {
          "url": "core.js",
          "resolutionFrom": "crb-receiver/worker.js",
          "kind": "reviewed-crb-receiver-importScripts",
          "literal": "importScripts('../crb-multiuser-data.js','../crb-multiuser-model.js','runtime-manifest.js','core.js')"
        }
      ]
    },
    {
      "public": "crb-receiver/controller.js",
      "sha256": "37c50a668e1f4ae830f78749d7ab0b7e5adc1a4dce686ecf5aa1ffec00cbefb3",
      "runtimePolicy": "exact-reviewed-crb-receiver-classic",
      "runtimeEdges": []
    },
    {
      "public": "crb-receiver/ui.js",
      "sha256": "0a0c9205882ccd1cebaf75277059642fd113304234ab8734178ccdc985f07ce0",
      "runtimePolicy": "exact-reviewed-crb-receiver-classic",
      "runtimeEdges": [
        {
          "url": "crb-receiver/worker.js",
          "resolutionFrom": "crb-beamforming.html",
          "kind": "reviewed-crb-receiver-worker",
          "literal": "new win.Worker('crb-receiver/worker.js')"
        }
      ]
    }
  ],
  "assets": [
    {
      "public": "crb-receiver/ui.css",
      "sha256": "6add9b17ceb6ee96868573d07060be72eff5c42def358bf764ae1c0704f46a7f"
    }
  ],
  "boundExistingFiles": [
    {
      "public": "crb-multiuser-data.js",
      "sha256": "86449971fd360039e6e231be1cf490f422e6852c0c4e012071d08c1f001d20f6"
    },
    {
      "public": "crb-multiuser-model.js",
      "sha256": "2e4715bc18a1e7948cc0111755f6cccda5a2e991b31de6d0a16b7957e88161da"
    },
    {
      "public": "crb-multiuser.js",
      "sha256": "e886e8d94a381504776ee105f7e875dee637fc71a9e3a485a2900cdb2a1a96c5"
    },
    {
      "public": "crb-multiuser/hermitian.js",
      "sha256": "da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a"
    },
    {
      "public": "crb-multiuser/linalg.js",
      "sha256": "11b0de23151c48a4cedcad17405bf26a610739b22db37378b2d77828af560d0d"
    },
    {
      "public": "crb-multiuser/core.js",
      "sha256": "208f4d91db12d5c24d8bff921a1f31806cea846cb3f1a3a6101f7520f2e335c1"
    },
    {
      "public": "crb-multiuser/worker.js",
      "sha256": "cdf0412a332c79c6e7ff6d5340285b78a434838aa6c560c9b35762ec4775520b"
    }
  ],
  "entryPoint": "crb-beamforming.html",
  "scriptOrder": [
    "crb-multiuser-data.js",
    "crb-multiuser-model.js",
    "crb-receiver/runtime-manifest.js",
    "crb-receiver/core.js",
    "crb-receiver/controller.js",
    "crb-receiver/ui.js",
    "crb-multiuser.js"
  ],
  "stylesheet": "crb-receiver/ui.css",
  "entryHead": {
    "bytes": 1179,
    "sha256": "3b90b5b8d7301e19721b9262cb153c01a582607ae083522f50f0fcee0f2b14e3"
  }
};
function fields(x,keys,label){a.ok(x&&typeof x==='object'&&!Array.isArray(x),label);a.deepEqual(Object.keys(x).sort(),[...keys].sort(),'Invalid '+label+' fields');}
function receiverDependencies(scripts,contract,identities,pages){
 a.deepEqual(contract,reviewed,'Unreviewed CRB receiver contract: exact code-owned files and edges required');
 a.ok(Array.isArray(scripts)&&Array.isArray(identities)&&Array.isArray(pages),'Complete receiver inputs required');
 const owned=[...reviewed.scripts,...reviewed.assets],bound=[...owned,...reviewed.boundExistingFiles],expected=new Map(owned.map(x=>[x.public,x])),ids=new Map(),actual=new Map();
 for(const x of identities){fields(x,['file','sha256'],'receiver public identity');a.ok(typeof x.file==='string'&&/^[a-f0-9]{64}$/.test(x.sha256)&&!ids.has(x.file),'Invalid or duplicate receiver public identity');ids.set(x.file,x.sha256);if(x.file.toLowerCase().startsWith('crb-receiver/'))a.ok(expected.has(x.file),'Unreviewed CRB receiver public path '+x.file);for(const p of owned)if(p.sha256===x.sha256)a.equal(x.file,p.public,'CRB receiver bytes moved to unreviewed public path');}
 for(const p of bound)a.equal(ids.get(p.public),p.sha256,'Missing or changed current CRB receiver dependency '+p.public);
 for(const x of scripts){fields(x,['file','source'],'receiver script');a.ok(typeof x.file==='string'&&typeof x.source==='string'&&!actual.has(x.file),'Invalid or duplicate CRB receiver script');actual.set(x.file,x.source);}
 a.deepEqual([...actual.keys()].sort(),reviewed.scripts.map(x=>x.public).sort(),'Missing or unreviewed CRB receiver script');
 const edges=[];
 for(const p of reviewed.scripts){const source=actual.get(p.public);a.equal(sha(source),p.sha256,'Unreviewed CRB receiver source hash '+p.public);new vm.Script(source,{filename:p.public});for(const literal of new Set(p.runtimeEdges.map(x=>x.literal)))a.equal(source.split(literal).length,2,'Exact CRB receiver runtime literal '+p.public);for(const e of p.runtimeEdges){a.ok(ids.has(e.resolutionFrom),'Missing CRB receiver resolution context '+e.resolutionFrom);edges.push({from:e.resolutionFrom,url:e.url,kind:e.kind});}}
 const page=pages.filter(p=>p.file===reviewed.entryPoint);a.equal(page.length,1,'One current CRB receiver entry page');fields(page[0],['file','source'],'receiver entry page');
 // Bind the actual canonical preamble and complete head, not regex-implied attrs.
 // Any comment/raw-text/inert wrapper, duplicate attr, async/module/nomodule,
 // base insertion or stylesheet loading-policy change fails this exact identity.
 const end=page[0].source.indexOf('</head>');a.ok(end>=0,'Current CRB receiver head required');
 const head=page[0].source.slice(0,end+7);a.equal(Buffer.byteLength(head),reviewed.entryHead.bytes,'Exact CRB receiver entry head length');a.equal(sha(head),reviewed.entryHead.sha256,'Exact CRB receiver entry head identity');
 const tags=[...page[0].source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)],positions=[];
 for(const file of reviewed.scriptOrder){const matches=tags.flatMap((t,i)=>t[1]===file?[i]:[]);a.equal(matches.length,1,'Exactly one CRB receiver page script '+file);a.match(tags[matches[0]][0],/\bdefer\b/,'Deferred CRB receiver load order');positions.push(matches[0]);edges.push({from:reviewed.entryPoint,url:file,kind:'reviewed-crb-receiver-page-script'});}
 a.ok(positions.every((x,i)=>i===0||x>positions[i-1]),'CRB receiver page script order');
 a.equal([...page[0].source.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/g)].filter(t=>t[1]===reviewed.stylesheet).length,1,'Exactly one CRB receiver stylesheet');edges.push({from:reviewed.entryPoint,url:reviewed.stylesheet,kind:'reviewed-crb-receiver-stylesheet'});
 return edges;
}
module.exports={receiverDependencies};
