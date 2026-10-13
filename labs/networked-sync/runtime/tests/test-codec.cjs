'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),crypto=require('node:crypto'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const C=require('../js/codec.js'),S=require('../js/sha256.js');
function fixture(extra={}){
 const shape=[4,8,5],n=shape.reduce((a,b)=>a*b,1),p=shape[1]*shape[2];
 const config={shape,rank:1,iterations:2,tolerance:1e-4,projectionOversampling:16,bandwidthHz:1e7,carrierHz:28e9,spacingWavelengths:.5,seed:7,snrDb:5,offsetS:35e-9,cfoHz:320,scenario:'ordinary',trace:'summary',...extra};
 const observation={shape:[...shape],observations:[Array(2*n).fill(0),Array(2*n).fill(0)],pilots:[Array.from({length:2*p},(_,i)=>i%2?0:1),Array.from({length:2*p},(_,i)=>i%2?0:1)],configPhysics:{bandwidthHz:1e7,carrierHz:28e9,spacingWavelengths:.5},generationConfig:{seed:7,snrDb:5,offsetS:35e-9,cfoHz:320,scenario:'ordinary'}};
 observation.observations[0][0]=.25;observation.observations[1][1]=-.125;return {config,observation};
}
const cp=x=>JSON.parse(JSON.stringify(x));
test('SHA256 agrees with Node crypto across empty/UTF8/boundary/chunked vectors',()=>{
 for(const bytes of [Buffer.alloc(0),Buffer.from('abc'),Buffer.from('汉字🙂 café'),Buffer.alloc(55,255),Buffer.alloc(56,17),Buffer.alloc(64,8),Buffer.alloc(100001,199)]){
  const expected=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(S.hash(bytes),expected);const h=new S.SHA256();for(let i=0;i<bytes.length;i+=13)h.update(bytes.subarray(i,i+13));assert.equal(h.digest(),expected);assert.throws(()=>h.digest());assert.throws(()=>h.update(new Uint8Array()));
 }
 assert.throws(()=>S.hash('abc'));
});
test('canonical config orders keys, preserves finite tiny/huge values and normalizes signed zero',()=>{
 assert.equal(C.canonicalStringify({z:-0,a:'汉字🙂',b:5e-324,c:Number.MAX_VALUE}),C.canonicalStringify({c:Number.MAX_VALUE,b:5e-324,a:'汉字🙂',z:0}));
 assert.equal(C.utf8Length('汉字🙂'),10);assert.throws(()=>C.canonicalStringify('\ud800'),{code:'INVALID_UNICODE'});assert.throws(()=>C.canonicalStringify('\udc00'),{code:'INVALID_UNICODE'});
});
test('dual hashes match independently constructed config UTF8 and sample binary bytes',async()=>{
 const {config,observation}=fixture(),actual=await C.identity(config,observation);
 const metadata={shape:observation.shape,configPhysics:observation.configPhysics,generationConfig:observation.generationConfig};
 const expectedConfig=crypto.createHash('sha256').update(C.canonicalStringify({config,observation_metadata:metadata}),'utf8').digest('hex');
 const parts=[Buffer.from('networked-sync-samples-f64le-zero-normalized-v1\0')],header=Buffer.alloc(12);observation.shape.forEach((v,i)=>header.writeUInt32LE(v,i*4));parts.push(header);
 for(const field of ['observations','pilots'])for(const vector of observation[field]){const b=Buffer.alloc(vector.length*8);vector.forEach((v,i)=>b.writeDoubleLE(v===0?0:v,i*8));parts.push(b);}
 assert.deepEqual(actual,{config_sha256:expectedConfig,sample_sha256:crypto.createHash('sha256').update(Buffer.concat(parts)).digest('hex')});
});
test('raw record deterministic canonical round trip through objects and UTF8 JSON',async()=>{
 const input=fixture(),a=await C.encodeRecord(input),b=await C.encodeRecord(input);
 assert.equal(C.canonicalStringify(a),C.canonicalStringify(b));assert.deepEqual(await C.decodeRecord(a),a);assert.deepEqual(await C.decodeRecord(C.canonicalStringify(a)),a);assert.equal('historical'in a,false);
});
test('signed-zero and Float64Array representations share sample identity',async()=>{
 const a=fixture(),b=fixture();b.observation.observations=b.observation.observations.map(x=>Float64Array.from(x,v=>v===0?-0:v));b.observation.pilots=b.observation.pilots.map(x=>Float64Array.from(x,v=>v===0?-0:v));
 assert.deepEqual(await C.identity(a.config,a.observation),await C.identity(b.config,b.observation));const r=await C.encodeRecord(b);assert.equal(Object.is(r.observation.pilots[0][1],-0),false);
});
test('sample, pilot, shape, solver config and metadata tampering are detected',async()=>{
 const record=await C.encodeRecord(fixture());
 for(const alter of [r=>r.observation.observations[0][5]=.3,r=>r.observation.pilots[0][0]=-1,r=>r.config.iterations++,r=>r.observation.configPhysics.bandwidthHz++,r=>r.observation.generationConfig.seed++]){const r=cp(record);alter(r);await assert.rejects(C.decodeRecord(r),{code:'HASH_MISMATCH'});}
 const s=cp(record);s.observation.shape[0]++;await assert.rejects(C.decodeRecord(s),{code:'INVALID_OBSERVATION'});
});
test('historical results retain explicit no-fresh-execution label and do not imply verified computation',async()=>{
 const record=await C.encodeRecord({...fixture(),result:{status:'fresh-execution',note:'汉字🙂',methods:{scpd:{numerical_success:true}}}},'history');
 const decoded=await C.decodeRecord(record);assert.equal(decoded.historical.freshExecution,false);assert.equal(decoded.historical.label,C.historicalLabel);assert.equal(decoded.historical.result.status,'fresh-execution');
 const bad=cp(record);bad.historical.freshExecution=true;await assert.rejects(C.decodeRecord(bad),{code:'INVALID_HISTORY'});
 // Digests identify config and raw data; they are not authentication of history.
 const amended=cp(record);amended.historical.result.note='edited';assert.equal((await C.decodeRecord(amended)).historical.freshExecution,false);
});
test('unknown schema/fields/modes, malformed hashes and historical promotion rejected',async()=>{
 const record=await C.encodeRecord(fixture());
 for(const edit of [r=>r.schema='other',r=>r.extra=1,r=>r.mode='fresh',r=>r.identity.config_sha256='a'.repeat(63),r=>r.historical={label:C.historicalLabel,freshExecution:false,result:{}}]){const r=cp(record);edit(r);await assert.rejects(C.decodeRecord(r));}
 await assert.rejects(C.encodeRecord(fixture(),'history'),{code:'MISSING_FIELD'});await assert.rejects(C.decodeRecord('{no'),{code:'INVALID_JSON'});
});
test('dense finite arrays required: sparse/nonfinite/huge/tiny shape/zero pilot rejected',async()=>{
 for(const edit of [o=>delete o.observations[0][1],o=>o.observations[0][0]=NaN,o=>o.observations[0][0]=Infinity,o=>o.observations[0][0]='1',o=>o.shape[0]=1,o=>o.shape[0]=1e9,o=>o.pilots[0][0]=0,o=>o.observations[0].push(0)]){const f=fixture();edit(f.observation);assert.throws(()=>C.validateObservation(f.observation));}
});
test('finite extreme sample bit patterns hash exactly; receiver semantic limits remain separate',async()=>{
 const f=fixture();f.observation.observations[0][0]=Number.MIN_VALUE;f.observation.observations[1][0]=Number.MAX_VALUE;const r=await C.encodeRecord(f);assert.deepEqual((await C.decodeRecord(r)).identity,r.identity);
});
test('structural budgets reject huge sparse arrays before traversal, nested records and UTF8 overflow',()=>{
 assert.throws(()=>C.preflight(new Array(C.limits.maxArrayLength+1)),{code:'INPUT_LIMIT'});let deep={};for(let i=0;i<30;i++)deep={deep};assert.throws(()=>C.preflight(deep),{code:'INPUT_LIMIT'});
 assert.throws(()=>C.preflight('🙂'.repeat(4097)),{code:'INPUT_LIMIT'});const cycle={};cycle.self=cycle;assert.throws(()=>C.preflight(cycle),{code:'INVALID_RECORD'});
 assert.throws(()=>C.preflight({x:undefined}));assert.throws(()=>C.preflight(1n));assert.throws(()=>C.preflight(new Date()));assert.throws(()=>C.preflight(new Float32Array(2)));
 const many=Object.fromEntries(Array.from({length:129},(_,i)=>['k'+i,1]));assert.throws(()=>C.preflight(many),{code:'INPUT_LIMIT'});
});
test('getters, symbols, prototype objects, hidden extra array fields cannot bypass validation',()=>{
 let called=0;const x={};Object.defineProperty(x,'value',{enumerable:true,get(){called++;return 1;}});assert.throws(()=>C.preflight(x));assert.equal(called,0);
 const array=[1];Object.defineProperty(array,'hidden',{value:2});assert.throws(()=>C.preflight(array));const sy=[1];sy[Symbol('x')]=0;assert.throws(()=>C.preflight(sy));assert.throws(()=>C.preflight(Object.create({x:1})));
 const typed=new Float64Array(2);typed.extra=1;assert.throws(()=>C.preflight(typed));if(typeof SharedArrayBuffer==='function')assert.throws(()=>C.preflight(new Float64Array(new SharedArrayBuffer(16))));
});
test('checkpoints report bounded numeric hashing work and preserve caller input',async()=>{
 const f=fixture(),before=JSON.stringify(f),events=[];const r=await C.encodeRecord(f,'raw',{checkpoint:async(stage,d)=>events.push({stage,...d})});assert.equal(JSON.stringify(f),before);assert.equal(events.at(-1).stage,'export-record');const sample=events.filter(x=>x.stage==='hash-samples');assert.ok(sample.length);assert.equal(sample.at(-1).done,sample.at(-1).total);assert.equal(r.observation.observations[0]===f.observation.observations[0],false);
});
test('separate browser-loader VM executes codec and SHA UMD branch; not real-browser evidence',async()=>{
 const context=vm.createContext({TextEncoder,TextDecoder});for(const f of ['sha256.js','codec.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f),'utf8'),context);
 const r=await context.NetworkedSyncCodec.encodeRecord(fixture());assert.equal(r.identity.sample_sha256,(await C.encodeRecord(fixture())).identity.sample_sha256);
});

test('maximum raw tensor dimensions fit serialization budget with deterministic typed-array round trip',async()=>{
 const f=fixture();f.config.shape=[10,36,20];f.observation.shape=[10,36,20];f.observation.observations=[new Float64Array(14400),new Float64Array(14400)];f.observation.pilots=[Float64Array.from({length:1440},(_,i)=>i%2?0:1),Float64Array.from({length:1440},(_,i)=>i%2?0:1)];
 const r=await C.encodeRecord(f),text=C.canonicalStringify(r);assert.ok(Buffer.byteLength(text)<C.limits.maxBytes);assert.deepEqual((await C.decodeRecord(text)).identity,r.identity);assert.equal(r.observation.observations[1].length,14400);
});

test('object decode snapshots config, samples, identity and history before its first await',async()=>{
 const r=await C.encodeRecord({...fixture(),result:{status:'fresh-execution',value:1}},'history'),before=structuredClone(r),pending=C.decodeRecord(r);r.config.rank=9;r.observation.observations[0][0]++;r.identity.sample_sha256='0'.repeat(64);r.historical.result.value=99;assert.deepEqual(await pending,before);
});
test('public identity snapshots all input vectors and metadata before asynchronous hashing',async()=>{
 const f=fixture(),expected=await C.identity(f.config,f.observation),pending=C.identity(f.config,f.observation);f.config.rank=9;f.observation.observations[1][0]=55;f.observation.pilots[1][0]=-1;f.observation.configPhysics.carrierHz++;assert.deepEqual(await pending,expected);
});
test('history encode snapshots result as well as raw data before asynchronous hashing',async()=>{
 const input={...fixture(),result:{status:'fresh-execution',values:[1,2]}},before=structuredClone(input),pending=C.encodeRecord(input,'history');input.config.rank=9;input.observation.observations[1][0]=123;input.result.values[0]=99;const r=await pending;assert.deepEqual(r.config,before.config);assert.deepEqual(r.observation,before.observation);assert.deepEqual(r.historical.result,before.result);assert.deepEqual((await C.decodeRecord(r)).identity,r.identity);
});

test('descriptor-first validation never evaluates custom toStringTag, length, buffer or iterator getters',()=>{
 let hits=0;for(const value of [{},new Float64Array(2),[1]]){Object.defineProperty(value,Symbol.toStringTag,{get(){hits++;return 'Object';}});assert.throws(()=>C.preflight(value),{code:'INVALID_RECORD'});}
 for(const key of ['length','buffer']){const value=new Float64Array(2);Object.defineProperty(value,key,{get(){hits++;return key==='length'?2:new ArrayBuffer(16);}});assert.throws(()=>C.preflight(value),{code:'INVALID_RECORD'});}
 // Even inherited inspection/iteration hooks are ignored when an otherwise
 // admissible native vector or dense array is serialized by indexed values.
 const typed=new Float64Array([1,2]),tp=Object.create(Object.getPrototypeOf(typed));Object.defineProperty(tp,Symbol.toStringTag,{get(){hits++;return 'Evil';}});Object.defineProperty(tp,Symbol.iterator,{get(){hits++;throw Error('iterator');}});Object.setPrototypeOf(typed,tp);assert.equal(C.canonicalStringify(typed),'[1,2]');
 const arr=[1,2],ap=Object.create(Array.prototype);Object.defineProperty(ap,Symbol.iterator,{get(){hits++;throw Error('iterator');}});Object.setPrototypeOf(arr,ap);assert.equal(C.canonicalStringify(arr),'[1,2]');
 class Changed extends Array {*[Symbol.iterator](){hits++;yield NaN;}}
 const changed=new Changed();changed.push(1);assert.equal(C.canonicalStringify(changed),'[1]');
 const f=fixture();Object.setPrototypeOf(f.observation.observations,Changed.prototype);Object.setPrototypeOf(f.observation.pilots,Changed.prototype);assert.equal(C.validateObservation(f.observation),f.observation);assert.equal(hits,0);
});

test('exported validators use indexed dimensions, never subclass reduce or some methods',()=>{
 let calls=0;class Shape extends Array {reduce(){calls++;return 0;}some(){calls++;return false;}}
 const good=fixture();good.observation.shape=new Shape(4,8,5);assert.equal(C.validateObservation(good.observation),good.observation);good.config.shape=new Shape(4,8,5);assert.equal(C.validateConfig(good.config,good.observation),good.config);
 const bad=fixture();bad.observation.shape=new Shape(4,8,5);bad.observation.observations=[[],[]];assert.throws(()=>C.validateObservation(bad.observation),{code:'INVALID_OBSERVATION'});good.config.shape=new Shape(5,8,5);assert.throws(()=>C.validateConfig(good.config,good.observation),{code:'INVALID_SHAPE'});assert.equal(calls,0);
});
