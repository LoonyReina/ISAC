import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {snapshot,canonicalStringify,parseCanonical,hashCanonical,encodeRecord,decodeRecord,limits,utf8Length} from '../codec.mjs';
const throws=(fn,code)=>assert.throws(fn,e=>e.code===code);

test('canonical tagged f64 exactly round-trips signed zero and finite extremes',async()=>{
  const input={z:-0,p:0,small:Number.MIN_VALUE,large:Number.MAX_VALUE,arr:[null,true,false,'🛰️',-1.25]};
  const text=canonicalStringify(input),out=parseCanonical(text);
  assert(Object.is(out.z,-0));assert(Object.is(out.p,0));assert.deepEqual(out,input);assert(Object.isFrozen(out));assert(Object.isFrozen(out.arr));
  assert.notEqual(canonicalStringify(-0),canonicalStringify(0));
  assert.equal(await hashCanonical(input),createHash('sha256').update(text).digest('hex'));
  assert.notEqual(await hashCanonical(-0),await hashCanonical(0));
});
test('canonical identity ignores insertion order, snapshots alias-free values',()=>{
  assert.equal(canonicalStringify({z:2,a:1}),canonicalStringify({a:1,z:2}));
  const a={x:1},copy=snapshot({a,b:a});a.x=4;assert.equal(copy.a.x,1);assert.notEqual(copy.a,copy.b);assert.throws(()=>{copy.a.x=3;},TypeError);
});
test('rejects sparse arrays, nonfinite values and unsupported primitives',()=>{
  for(const bad of [[,1],[1,,],NaN,Infinity,-Infinity,undefined,1n,Symbol('x'),()=>1])throws(()=>snapshot(bad),typeof bad==='number'?'NONFINITE':'INVALID_RECORD');
});
test('rejects prototypes, typed arrays, accessors, symbols and nonenumerable fields without invoking getters',()=>{
  let calls=0;const getter={get x(){calls++;return 1;}};
  const getterArray=[0];Object.defineProperty(getterArray,'0',{get(){calls++;return 1;},enumerable:true});
  const tag={};Object.defineProperty(tag,Symbol.toStringTag,{get(){calls++;return 'Object';}});
  const proto=Object.create({inherited:true});proto.x=1;
  class A extends Array{};class O{};
  const extra=[1];extra.foo=2;const nonenum={};Object.defineProperty(nonenum,'x',{value:2});
  for(const value of [getter,getterArray,tag,proto,new A(1),new O(),new Float64Array([1]),new Date(),new Map(),extra,nonenum,{[Symbol('x')]:2}])throws(()=>snapshot(value),'INVALID_RECORD');
  assert.equal(calls,0);assert.deepEqual(snapshot(Object.assign(Object.create(null),{x:1})),{x:1});
});
test('rejects cycles, dangerous keys and malformed Unicode',()=>{
  const cycle={};cycle.x=cycle;throws(()=>snapshot(cycle),'INVALID_RECORD');
  for(const key of ['__proto__','prototype','constructor']){const bad={};Object.defineProperty(bad,key,{value:1,enumerable:true});throws(()=>snapshot(bad),'DANGEROUS_KEY');}
  for(const s of ['\ud800','\udc00','a\ud800b'])throws(()=>snapshot(s),'INVALID_UNICODE');
  throws(()=>snapshot({'\ud800':1}),'INVALID_UNICODE');assert.equal(utf8Length('aé🛰'),7);
});
test('structural and conservative canonical resource budgets are enforced',()=>{
  throws(()=>snapshot(new Array(limits.maxArrayLength+1)),'INPUT_LIMIT');
  throws(()=>snapshot('x'.repeat(limits.maxStringBytes+1)),'INPUT_LIMIT');
  throws(()=>snapshot({['x'.repeat(limits.maxKeyBytes+1)]:1}),'INPUT_LIMIT');
  throws(()=>snapshot(Object.fromEntries(Array.from({length:limits.maxObjectKeys+1},(_,i)=>['k'+i,1]))),'INPUT_LIMIT');
  let deep=0;for(let i=0;i<limits.maxDepth+1;i++)deep=[deep];throws(()=>snapshot(deep),'INPUT_LIMIT');
  const million=Array(limits.maxArrayLength).fill(1);throws(()=>snapshot([million,million]),'INPUT_LIMIT');
  const large='x'.repeat(limits.maxStringBytes);throws(()=>snapshot(Array(180).fill(large)),'INPUT_LIMIT');
});
test('parser rejects noncanonical, extra-tag, duplicate-key, forbidden and nonfinite encodings',()=>{
  for(const text of ['{}','["number","7ff0000000000000"]','["number","7FF0000000000000"]','["bool",1]','["null",0]','["array",{}]','["unknown",1]','["object",[["x",["null"]],["x",["null"]]]]','["object",[["z",["null"]],["a",["null"]]]]','["object",[["__proto__",["null"]]]]','["string","\\ud800"]'])assert.throws(()=>parseCanonical(text));
  throws(()=>parseCanonical(' '+canonicalStringify(1)),'NONCANONICAL');throws(()=>parseCanonical('["string","\\u0061"]'),'NONCANONICAL');
  throws(()=>parseCanonical('x'.repeat(limits.maxBytes+1)),'INPUT_LIMIT');
});
test('raw and historical records are frozen, hash-checked, exact and explicitly historical',async()=>{
  const input={x:-0},result={answer:2,trace:[1,2]};const raw=await encodeRecord({input,result},'raw');
  assert(!Object.hasOwn(raw,'historical'));assert(Object.isFrozen(raw.input));
  const history=await encodeRecord({input,result},'history'),text=canonicalStringify(history),decoded=await decodeRecord(text);
  assert.equal(decoded.historical.freshExecution,false);assert.equal(decoded.historical.label,'historical-import-not-fresh-execution');assert.deepEqual(decoded,history);
  assert(Object.is(decoded.input.x,-0));assert(Object.isFrozen(decoded.historical.result.trace));
  await assert.rejects(decodeRecord({...history,input:{x:1}}),{code:'HASH_MISMATCH'});
  await assert.rejects(decodeRecord({...history,historical:{...history.historical,result:{answer:3}}}),{code:'HASH_MISMATCH'});
  await assert.rejects(decodeRecord({...history,historical:{...history.historical,freshExecution:true}}),{code:'INVALID_HISTORY'});
  await assert.rejects(decodeRecord({...raw,extra:1}),{code:'UNKNOWN_FIELD'});
  await assert.rejects(decodeRecord(JSON.stringify(history))); // Plain JSON is not tagged canonical text.
});
test('async hashes, exports and object imports snapshot before yielding',async()=>{
  const input={x:[-0]},result={answer:[1]};const pending=encodeRecord({input,result},'history');input.x[0]=8;result.answer[0]=9;
  const record=await pending;assert(Object.is(record.input.x[0],-0));assert.equal(record.historical.result.answer[0],1);
  const mutable=structuredClone(record),decoded=decodeRecord(mutable);mutable.input.x[0]=7;mutable.historical.result.answer[0]=8;
  const out=await decoded;assert(Object.is(out.input.x[0],-0));assert.equal(out.historical.result.answer[0],1);
  const hashInput={a:[1]},expected=await hashCanonical(hashInput),h=hashCanonical(hashInput);hashInput.a[0]=2;assert.equal(await h,expected);
});
