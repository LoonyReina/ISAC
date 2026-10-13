import assert from 'node:assert/strict';
import {DOMAIN,settings,replay} from '../runtime.mjs';
import {encode,decode} from '../codec.mjs';
import {readFileSync} from 'node:fs';
assert(Object.isFrozen(DOMAIN));for(let v of Object.values(DOMAIN))assert(Object.isFrozen(v));assert(Object.isFrozen(settings()));assert.throws(()=>{DOMAIN.channelSamples[1]=1e9;});
for(let s of [null,[],5,'x',{constructor:2},{__proto__:null,toString:1},{seed:0},{seed:2**32},{channelSamples:512.1},{pfa:NaN}])assert.throws(()=>settings(s));
for(let v of [NaN,Infinity,-Infinity,{x:NaN}])assert.throws(()=>encode(v),/nonfinite/);
assert.throws(()=>decode('{"v":1e400}'),/nonfinite/);
for(let v of [{rows:0,cols:1e20,re:[],im:[]},{rows:1,cols:1,re:[0],im:null},{rows:1,cols:1,re:[null],im:[0]}])assert.throws(()=>decode(JSON.stringify({type:'complex-matrix-f64-json-v1',...v})),/invalid matrix/);
const raw=readFileSync(new URL('./fresh-run.json',import.meta.url),'utf8');
for(let change of [r=>r.results=[],r=>r.results[0].detectors.AP.h0[0]=NaN,r=>r.results[0].detectors.AP.decision0.push(0),r=>r.results[0].detectors.AP.pfa=99,r=>r.results[0].detectors.AP.pdInterval=[0,1],r=>r.results[0].detectors.AP.threshold.order_k++,r=>delete r.results[0].detectors.SP,r=>r.raw.calibration.noise.cols++,r=>r.results[0].name='invented']){let r=decode(raw);change(r);assert.throws(()=>replay(r));}
assert(replay(decode(raw)).accepted);
console.log('deep immutable domain/settings, finite codec, bounded matrices and adversarial replay contracts passed');
