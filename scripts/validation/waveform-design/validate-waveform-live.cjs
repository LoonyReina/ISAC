#!/usr/bin/env node
'use strict';
// Run only against the compatibility build, where runtime paths are explicit.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),Core=require(path.join(root,'procrustes-core.js')),Model=require(path.join(root,'waveform-live-model.js'));
const fixturePath=path.join(__dirname,'waveform-live-fixtures.json'),referencePath=path.join(__dirname,'independent_procrustes_reference.py');
const fixtures=JSON.parse(fs.readFileSync(fixturePath,'utf8')).fixtures;
const cases=fixtures.map(f=>({id:f.id,input:f.input}));
for(let j=0;j<32;j++){const N=[2,4,8,16][j%4],K=[1,2,4,8][(j>>2)%4],L=Math.max(N,8+j%13),settings={N,K,L,seed:171105226+j,Pt:[.1,1,10][j%3],beta:[0,.4,.8,.95][j%4],angle:-60+j%25*5};const value=Model.generated(settings);cases.push({id:'fresh-generated-'+j,input:{H:value.H,S:value.S,R:value.R}});}
const python=String.raw`
import importlib.util,json,sys,numpy as np
spec=importlib.util.spec_from_file_location('reference',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
rows=[]
for c in json.load(sys.stdin):
 H,S,R=[m.unpack(c['input'][k]) for k in ('H','S','R')]
 result=m.solve(H,S,R)
 rows.append({'id':c['id'],'objective':result['metrics']['objective'],'bound':result['globalObjectiveBound'],'tolerance':result['diagnostics']['objectiveCertificateTolerance']})
print(json.dumps(rows,allow_nan=False))
`;
const child=cp.spawnSync('python3',['-c',python,referencePath],{input:JSON.stringify(cases),encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1'},maxBuffer:8*1024*1024});
if(child.status!==0)throw new Error('Independent Python oracle failed: '+child.stderr);
const oracle=JSON.parse(child.stdout),rows=[];
for(let i=0;i<cases.length;i++){const c=cases[i],o=oracle[i];assert.equal(c.id,o.id);const r=Core.solve(c.input.H,c.input.S,c.input.R);assert.equal(r.status,'certified');assert.ok(r.metrics.covarianceResidualRelative<=2e-10);assert.ok(Math.abs(r.metrics.objective-o.objective)<=o.tolerance,c.id);assert.ok(Math.abs(r.globalObjectiveBound-o.bound)<=o.tolerance,c.id);rows.push({id:c.id,covarianceResidualRelative:r.metrics.covarianceResidualRelative,objectiveError:r.metrics.objective-o.objective,independentObjectiveTolerance:o.tolerance});}
const summary={status:'passed',scope:'fresh runtime solves versus re-executed independent Python oracle; not browser acceptance',fixedFixtures:fixtures.length,freshGeneratedProblems:cases.length-fixtures.length,coreSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'procrustes-core.js'))).digest('hex'),referenceSha256:crypto.createHash('sha256').update(fs.readFileSync(referencePath)).digest('hex'),maximumCovarianceResidualRelative:Math.max(...rows.map(r=>r.covarianceResidualRelative)),checks:rows};
console.log(JSON.stringify(summary,null,2));
