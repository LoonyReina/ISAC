import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {defaultSpec} from '../defaults.mjs';
import {validateDesign,validateScene,validateReceiver,validateSolverOptions} from '../runtime/src/contract.mjs';
const root=new URL('../',import.meta.url),runtime=new URL('runtime/',root);
const read=p=>readFile(new URL(p,runtime));
test('21 runtime/freeze files are byte-preserved and the one codec delta reverses to its historical identity',async()=>{
 const freeze=JSON.parse(await read('CHAIN-FREEZE.json'));assert.equal(Object.keys(freeze.runtimeFiles).length,22);
 const patch=JSON.parse(await readFile(new URL('IMPLEMENTATION-FREEZE.json',root))).runtimeBoundaryPatch;
 assert.equal(patch.path,'src/replay.mjs');assert.equal(patch.historicalSha256,freeze.runtimeFiles[patch.path]);
 for(const [path,expected]of Object.entries(freeze.runtimeFiles)){
  let data=await read(path);
  if(path===patch.path){assert.equal(createHash('sha256').update(data).digest('hex'),patch.currentSha256);let text=data.toString();for(const delta of [...patch.replacements].reverse()){assert.equal(text.split(delta.after).length,2);text=text.replace(delta.after,delta.before);}data=Buffer.from(text);}
  assert.equal(createHash('sha256').update(data).digest('hex'),expected,path);
 }
});
test('default raw source channels are fixture-identical; scene prior truth and grids remain distinct',async()=>{
 const fixture=JSON.parse(await read('fixtures/source-input.json')),s=defaultSpec();assert.deepEqual(s.designInput,fixture);validateDesign(s.designInput);validateScene(s.scene);validateReceiver(s.receiver);validateSolverOptions(s.solverOptions);
 assert.deepEqual(s.scene.truthXY,[14.2,14]);assert.equal(s.scene.seed,230201153);assert.notEqual(Math.hypot(...s.scene.truthXY),s.designInput.geometry.targetRangeM);
 assert.ok(s.scene.truthXY.every(x=>Math.abs(x/.2-Math.round(x/.2))<1e-12));assert.ok(s.scene.truthXY.some(x=>Math.abs(x/.08-Math.round(x/.08))>.1));assert.equal(s.receiver.options.returnSpectrum,true);
 const edited=defaultSpec();edited.designInput.channels.re[0][0]=123;assert.deepEqual(defaultSpec().designInput,fixture);
});
test('frozen factories and dynamic imports are narrowly documented; UI imports canonical Experiment',async()=>{
 const controller=await readFile(new URL('controller.mjs',root),'utf8');assert.match(controller,/import \{Experiment\} from '\.\/runtime\/src\/experiment.mjs'/);assert.doesNotMatch(controller,/extends Experiment|Object\.create\(Experiment/);
 const clients=(await read('src/worker-client.mjs')).toString();assert.match(clients,/createModuleWorker\('\.\/solver-worker\.mjs'\)/);assert.match(clients,/createModuleWorker\('\.\/receiver-worker\.mjs'\)/);
});
