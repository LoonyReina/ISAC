'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..');
test('OTFS versioned portable rejection contract retains eleven paths and rejects changed metrics evidence checker and numerical claims',{timeout:180000},()=>{
 const env={...process.env,PYTHONDONTWRITEBYTECODE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'};delete env.NODE_TEST_CONTEXT;
 const r=cp.spawnSync('python3',[path.join(root,'scripts/validation/sensing-assisted-otfs/parity-boundary-v2/test-boundary-v2.py')],{cwd:os.tmpdir(),env,encoding:'utf8',timeout:170000,maxBuffer:1024*1024});
 if(r.error)throw r.error;a.equal(r.status,0,r.stdout+'\n'+r.stderr);a.match(r.stderr,/Ran 7 tests/);a.match(r.stderr,/\nOK\n/);
});
