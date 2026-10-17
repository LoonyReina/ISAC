import assert from 'node:assert/strict';
import {createController} from '../controller.mjs';
import {createScheduler} from '../request-scheduler.mjs';
import {experiment} from '../subset-adapter.mjs';
import {PRESETS} from '../presets.mjs';
const config={stations:PRESETS.three.stations,m:2,psi:2,seed:20261016};
let queue=[];const controller=createController(createScheduler,()=>{},()=>new Promise(resolve=>queue.push(resolve)));
controller.configure(config);assert.equal(controller.state().phase,'ready');
let pending=controller.run(1000);queue.shift()();await Promise.resolve();await Promise.resolve();assert.equal(controller.state().snapshot.total,128);controller.cancel();assert.equal(controller.state().phase,'partial');queue.shift()();await pending;assert.equal(controller.state().snapshot.total,128);assert.equal(controller.state().snapshot.cancelled,true);
controller.configure(config);pending=controller.run(1000);controller.configure({...config,seed:1});queue.shift()();await pending;assert.equal(controller.state().snapshot.total,0);assert.equal(controller.state().snapshot.seed,1);assert.equal(controller.state().phase,'ready');
pending=controller.run(1);queue.shift()();await pending;assert.equal(controller.state().phase,'complete');assert.equal(controller.state().snapshot.total,1);
controller.configure({...config,m:NaN});assert.equal(controller.state().snapshot,null);assert.equal(controller.state().phase,'invalid');
const a=createScheduler(config.stations,2,2,123),b=createScheduler(config.stations,2,2,123);a.chunk(128);for(let i=0;i<128;i++)b.step();assert.deepEqual(a.snapshot(),b.snapshot());
const rare=experiment(PRESETS.three.stations,1e-100,32);assert.equal(rare.outageProbability,0);assert.equal(rare.positiveOutage,true);assert.equal(rare.unconditionalStatus,'infinite_unidentifiable');assert(Number.isFinite(rare.logOutageProbability));
for(const [key,p] of Object.entries(PRESETS)){const e=experiment(p.stations,2,2);assert(Math.abs(e.subsets.reduce((a,b)=>a+b.probability,0)-1)<1e-12);assert(e.subsets.every(s=>s.rank<2?s.inverseTrace===null:s.inverseTrace!==null));if(key==='collinear'){assert.equal(e.outageProbability,1);assert.equal(e.conditionalStatus,'unavailable');}}
console.log('PASS: cancel, stale generation, restart, invalid input, bounded chunk replay, rare event semantics, all preset subset normalization/rank invariants');
