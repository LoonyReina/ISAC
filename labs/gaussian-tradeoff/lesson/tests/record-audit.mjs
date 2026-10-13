/** Independent evidence-file decoder/digests. Does not import runtime codec code.
 * This is an audit of trusted local test exports, not an untrusted-input sandbox.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function canonical(value){
 if(value===null)return '["null"]';
 if(typeof value==='boolean')return '["bool",'+value+']';
 if(typeof value==='string')return '["string",'+JSON.stringify(value)+']';
 if(typeof value==='number'){assert.ok(Number.isFinite(value));const b=Buffer.alloc(8);b.writeDoubleBE(value);return '["number","'+b.toString('hex')+'"]';}
 if(Array.isArray(value))return '["array",['+value.map(canonical).join(',')+']]';
 assert.ok(value&&typeof value==='object');
 return '["object",['+Object.keys(value).sort().map(k=>'['+JSON.stringify(k)+','+canonical(value[k])+']').join(',')+']]';
}
export function decode(text){
 function walk(wire){
  assert.ok(Array.isArray(wire));const [tag,payload]=wire;
  if(tag==='null'){assert.equal(wire.length,1);return null;}
  assert.equal(wire.length,2);
  if(tag==='number'){assert.match(payload,/^[0-9a-f]{16}$/);const v=Buffer.from(payload,'hex').readDoubleBE();assert.ok(Number.isFinite(v));return v;}
  if(tag==='bool'){assert.equal(typeof payload,'boolean');return payload;}
  if(tag==='string'){assert.equal(typeof payload,'string');return payload;}
  if(tag==='array'){assert.ok(Array.isArray(payload));return payload.map(walk);}
  assert.equal(tag,'object');assert.ok(Array.isArray(payload));const out={};let previous;
  for(const pair of payload){assert.equal(pair.length,2);const [key,value]=pair;assert.equal(typeof key,'string');assert.ok(!['__proto__','prototype','constructor'].includes(key));assert.ok(previous===undefined||key>previous);out[key]=walk(value);previous=key;}
  return out;
 }
 const result=walk(JSON.parse(text));assert.equal(canonical(result),text,'record must retain exact canonical tagged spelling');return result;
}
export function audit(text){
 const record=decode(text);assert.equal(record.schema,'gaussian-isac-run-record-v1');assert.equal(record.encoding,'tagged-json-f64be-v1');assert.ok(['raw','history'].includes(record.mode));
 assert.equal(sha256(canonical(record.input)),record.inputHash,'independent input SHA-256');
 if(record.mode==='history'){assert.equal(record.historical.freshExecution,false);assert.equal(record.historical.label,'historical-import-not-fresh-execution');assert.equal(sha256(canonical(record.historical.result)),record.historical.resultHash,'independent historical result SHA-256');}
 else assert.equal('historical' in record,false);
 return record;
}
export function assertFrozen(value){if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));for(const v of Object.values(value))assertFrozen(v);}}
export const frozenRuntimeHashes=Object.freeze({
 'codec.mjs':'cd210349a1755aba09af3c8bcf0ebb046a935ca8acd3f1839a56b8a9c4f033aa',
 'runtime.mjs':'94352d73c3921f7a83b6313ccdf31d2f0aa3e311c5de342f9cf18f002e1b6758',
 'worker.mjs':'acd716f63099a6e3e773c29e51b23d5ff8f8babbfb442830bdcf55559bb9727c',
 'kernel.mjs':'0f2dc07dc891593cfe2190d09d395a6be4b7343a43c52f45dd6b1b9a6d176310',
 'math.mjs':'930bedc07777ea6c078bc742dbc4b64938cf963b8f44c35902f80967f47fd79d',
 'presets.mjs':'9a9633235b4a86aa8c084c915394d9ef004c1ca5062a8507c44ff016e22851ae',
 'vendor/linalg.js':'7d5983a18f3bf1b54db5076944bc12e84c9489059dc66481fcba277f65bdaafc'
});
