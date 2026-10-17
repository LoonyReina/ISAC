import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {load} from '../load-adapter.mjs';
import {experiment} from '../subset-adapter.mjs';
import {createScheduler} from '../request-scheduler.mjs';
import {PRESETS} from '../presets.mjs';
const require=createRequire(import.meta.url),src='../reference/';
const originalLoad=require(src+'load-adapter.cjs').load;
const originalExperiment=require(src+'subset-adapter.cjs').experiment;
const originalScheduler=require(src+'request-scheduler.cjs').createScheduler;
let checks=0;
for(const m of [0,1e-100,1e-8,.1,2,15,100])for(const psi of [1,2,15,32]){assert.deepEqual(load(m,psi),originalLoad(m,psi));checks++;for(const p of Object.values(PRESETS)){assert.deepEqual(experiment(p.stations,m,psi),originalExperiment(p.stations,m,psi));checks++;}}
for(const p of Object.values(PRESETS)){const a=createScheduler(p.stations,2,2,20261016),b=originalScheduler(p.stations,2,2,20261016);assert.deepEqual(a.chunk(256),b.chunk(256));checks++;}
console.log(`PASS ${checks} exact CJS↔ESM output parity checks`);
