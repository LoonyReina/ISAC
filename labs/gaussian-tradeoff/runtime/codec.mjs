/** Strict Gaussian ISAC record codec, v1.
 * Descriptor-first preflight and UTF-8 checks are adapted from first-party
 * networked-sync-browser-prototype/js/codec.js, independently reviewed in
 * networked-sync-port-review/worker-review/WORKER-REVIEW.md. This port deliberately
 * rejects typed arrays and nonstandard prototypes, dangerous keys, and accessors.
 * NEW wire encoding: canonical tagged JSON; every number is its 16 lowercase
 * big-endian IEEE-754 binary64 hex digits. Thus -0 survives snapshots AND text.
 * SHA-256 uses platform WebCrypto (Node's crypto fallback only outside browsers).
 * Limits bound our traversal/encoding, not the platform's initial structured clone.
 */
export const limits = Object.freeze({maxBytes:64*1024*1024,maxNodes:2000000,maxDepth:48,maxArrayLength:1000000,maxObjectKeys:128,maxStringBytes:65536,maxKeyBytes:128});
export const schema = 'gaussian-isac-run-record-v1';
export const encoding = 'tagged-json-f64be-v1';
export const historicalLabel = 'historical-import-not-fresh-execution';
const dangerous = new Set(['__proto__','prototype','constructor']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export function fail(code,message) { const e=new Error(message); e.name='GaussianRecordError';e.code=code;throw e; }
export function utf8Length(s) {
  if(typeof s!=='string')fail('INVALID_STRING','Expected a string');
  let n=0;
  for(let i=0;i<s.length;i++) {
    const c=s.charCodeAt(i);
    if(c<128)n++;else if(c<2048)n+=2;
    else if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))fail('INVALID_UNICODE','Unpaired UTF-16 surrogate');n+=4;}
    else if(c>=0xdc00&&c<=0xdfff)fail('INVALID_UNICODE','Unpaired UTF-16 surrogate');else n+=3;
  }
  return n;
}
function stringBytes(s,key=false){const n=utf8Length(s);if(n>(key?limits.maxKeyBytes:limits.maxStringBytes))fail('INPUT_LIMIT',key?'Key byte limit exceeded':'String byte limit exceeded');if(key&&dangerous.has(s))fail('DANGEROUS_KEY','Dangerous object key');return n;}
export function isRecord(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);}
export function keys(x,allowed,required=allowed,label='object') {
  if(!isRecord(x))fail('INVALID_RECORD',label+' must be a plain object');
  for(const k of Reflect.ownKeys(x)){
    if(typeof k!=='string'||!allowed.includes(k))fail('UNKNOWN_FIELD',label+' has an unknown field');
    const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!('value'in d)||!d.enumerable)fail('INVALID_RECORD',label+' requires enumerable data properties');
  }
  for(const k of required)if(!own(x,k))fail('MISSING_FIELD',label+'.'+k+' is required');
}
/** Own and recursively freeze every value synchronously before an async boundary.
 * Repeated acyclic references are copied independently; object identity is not
 * part of the format. Proxies cannot be generically detected in portable JS;
 * callers must not treat in-process hostile proxy traps as a sandbox boundary.
 */
export function snapshot(value) {
  const stack=new Set();let nodes=0,bytes=0;
  function budget(n=0){bytes+=n;if(bytes>limits.maxBytes)fail('INPUT_LIMIT','Conservative canonical byte budget exceeded');}
  function visit(x,depth){
    if(++nodes>limits.maxNodes||depth>limits.maxDepth)fail('INPUT_LIMIT','Node or depth budget exceeded');
    if(x===null){budget(8);return null;}
    if(typeof x==='boolean'){budget(15);return x;}
    if(typeof x==='number'){if(!Number.isFinite(x))fail('NONFINITE','All numbers must be finite');budget(30);return x;}
    if(typeof x==='string'){budget(6*stringBytes(x)+14);return x;}
    if(typeof x!=='object')fail('INVALID_RECORD','Unsupported value type');
    if(stack.has(x))fail('INVALID_RECORD','Cycles are not supported');stack.add(x);
    let result;
    if(Array.isArray(x)){
      if(Object.getPrototypeOf(x)!==Array.prototype)fail('INVALID_RECORD','Array prototype must be Array.prototype');
      const length=Object.getOwnPropertyDescriptor(x,'length').value;
      if(length>limits.maxArrayLength||nodes+length>limits.maxNodes)fail('INPUT_LIMIT','Array length budget exceeded');
      const names=Reflect.ownKeys(x);
      for(const k of names)if(k!=='length'&&(typeof k!=='string'||!/^(0|[1-9][0-9]*)$/.test(k)||+k>=length))fail('INVALID_RECORD','Array has attached properties');
      if(names.length!==length+1)fail('INVALID_RECORD','Sparse arrays are not supported');
      budget(14+length);result=new Array(length);
      for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(x,String(i));if(!d||!('value'in d)||!d.enumerable)fail('INVALID_RECORD','Array entries must be enumerable data');result[i]=visit(d.value,depth+1);}
    }else{
      if(!isRecord(x))fail('INVALID_RECORD','Only plain objects and arrays are supported');
      const names=Reflect.ownKeys(x);if(names.length>limits.maxObjectKeys)fail('INPUT_LIMIT','Object key budget exceeded');
      result={};budget(15);
      for(const k of names){if(typeof k!=='string')fail('INVALID_RECORD','Symbol keys are not supported');budget(6*stringBytes(k,true)+7);const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!('value'in d)||!d.enumerable)fail('INVALID_RECORD','Object properties must be enumerable data');result[k]=visit(d.value,depth+1);}
    }
    stack.delete(x);return Object.freeze(result);
  }
  return visit(value,0);
}
export const preflight=value=>{snapshot(value);return true;};
function f64hex(value){const b=new ArrayBuffer(8),v=new DataView(b);v.setFloat64(0,value,false);let out='';for(let i=0;i<8;i++)out+=v.getUint8(i).toString(16).padStart(2,'0');return out;}
function fromhex(h){if(typeof h!=='string'||!/^[0-9a-f]{16}$/.test(h))fail('INVALID_ENCODING','Number requires sixteen lowercase hex digits');const b=new ArrayBuffer(8),v=new DataView(b);for(let i=0;i<8;i++)v.setUint8(i,parseInt(h.slice(i*2,i*2+2),16));const n=v.getFloat64(0,false);if(!Number.isFinite(n))fail('NONFINITE','Encoded number must be finite');return n;}
function emit(x){
  if(x===null)return '["null"]';
  if(typeof x==='boolean')return '["bool",'+String(x)+']';
  if(typeof x==='number')return '["number","'+f64hex(x)+'"]';
  if(typeof x==='string')return '["string",'+JSON.stringify(x)+']';
  if(Array.isArray(x)){const p=new Array(x.length);for(let i=0;i<x.length;i++)p[i]=emit(x[i]);return '["array",['+p.join(',')+']]';}
  const names=Object.keys(x).sort(),p=new Array(names.length);for(let i=0;i<names.length;i++)p[i]='['+JSON.stringify(names[i])+','+emit(x[names[i]])+']';return '["object",['+p.join(',')+']]';
}
export function canonicalStringify(value){const text=emit(snapshot(value));if(utf8Length(text)>limits.maxBytes)fail('INPUT_LIMIT','Canonical byte limit exceeded');return text;}
export function parseCanonical(text){
  if(typeof text!=='string')fail('INVALID_ENCODING','Canonical input must be a string');
  if(text.length>limits.maxBytes||utf8Length(text)>limits.maxBytes)fail('INPUT_LIMIT','Canonical input byte limit exceeded');
  let wire;try{wire=JSON.parse(text);}catch{fail('INVALID_JSON','Invalid JSON');}
  let nodes=0;
  function decode(x,depth){
    if(++nodes>limits.maxNodes||depth>limits.maxDepth)fail('INPUT_LIMIT','Decoded structural limit exceeded');
    if(!Array.isArray(x)||x.length<1||typeof x[0]!=='string')fail('INVALID_ENCODING','Malformed tagged value');
    const t=x[0];if(t==='null'){if(x.length!==1)fail('INVALID_ENCODING','Malformed null');return null;}
    if(x.length!==2)fail('INVALID_ENCODING','Malformed tagged pair');
    const v=x[1];
    if(t==='bool'){if(typeof v!=='boolean')fail('INVALID_ENCODING','Malformed boolean');return v;}
    if(t==='number')return fromhex(v);
    if(t==='string'){if(typeof v!=='string')fail('INVALID_ENCODING','Malformed string');stringBytes(v);return v;}
    if(t==='array'){
      if(!Array.isArray(v))fail('INVALID_ENCODING','Malformed array');if(v.length>limits.maxArrayLength||nodes+v.length>limits.maxNodes)fail('INPUT_LIMIT','Decoded array limit exceeded');
      const a=new Array(v.length);for(let i=0;i<v.length;i++)a[i]=decode(v[i],depth+1);return a;
    }
    if(t==='object'){
      if(!Array.isArray(v))fail('INVALID_ENCODING','Malformed object');if(v.length>limits.maxObjectKeys)fail('INPUT_LIMIT','Decoded key limit exceeded');
      const o={};let previous=null;for(let i=0;i<v.length;i++){const pair=v[i];if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string')fail('INVALID_ENCODING','Malformed object entry');const key=pair[0];stringBytes(key,true);if(previous!==null&&previous>=key)fail('INVALID_ENCODING','Object keys must be unique and sorted');previous=key;o[key]=decode(pair[1],depth+1);}return o;
    }
    fail('INVALID_ENCODING','Unknown value tag');
  }
  const result=snapshot(decode(wire,0));if(emit(result)!==text)fail('NONCANONICAL','Canonical spelling required');return result;
}
export async function hashCanonical(value){
  // Serialization completes before the first await; subsequent caller mutation
  // cannot change either the bytes or the hash they describe.
  const bytes=new TextEncoder().encode(canonicalStringify(value));let subtle=globalThis.crypto?.subtle;
  if(!subtle&&typeof process==='object'&&process.versions?.node)subtle=(await import('node:crypto')).webcrypto.subtle;
  if(!subtle)fail('HASH_UNAVAILABLE','WebCrypto SHA-256 is unavailable');
  const buffer=await subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(buffer),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function encodeRecord(source,mode='raw'){
  keys(source,['input','result'],['input'],'record source');source=snapshot(source);
  if(mode!=='raw'&&mode!=='history')fail('INVALID_MODE','Expected raw or history');
  if(mode==='history'&&!own(source,'result'))fail('MISSING_FIELD','History requires a result');
  const input=source.input,result=source.result;
  const record={schema,encoding,mode,input,inputHash:await hashCanonical(input)};
  if(mode==='history')record.historical={label:historicalLabel,freshExecution:false,result,resultHash:await hashCanonical(result)};
  return snapshot(record);
}
export async function decodeRecord(source){
  const record=typeof source==='string'?parseCanonical(source):snapshot(source);
  keys(record,['schema','encoding','mode','input','inputHash','historical'],['schema','encoding','mode','input','inputHash'],'record');
  if(record.schema!==schema||record.encoding!==encoding)fail('INVALID_SCHEMA','Unsupported record schema/encoding');
  if(record.mode!=='raw'&&record.mode!=='history')fail('INVALID_MODE','Invalid record mode');
  if(record.mode==='raw'&&own(record,'historical'))fail('INVALID_RECORD','Raw records cannot contain history');
  if(record.mode==='history'){
    keys(record.historical,['label','freshExecution','result','resultHash'],undefined,'history');
    if(record.historical.label!==historicalLabel||record.historical.freshExecution!==false)fail('INVALID_HISTORY','History must disclaim fresh execution');
  }
  for(const hash of [record.inputHash,...(record.mode==='history'?[record.historical.resultHash]:[])])if(typeof hash!=='string'||!/^[0-9a-f]{64}$/.test(hash))fail('INVALID_HASH','Invalid SHA-256 digest');
  if(await hashCanonical(record.input)!==record.inputHash)fail('HASH_MISMATCH','Input hash mismatch');
  if(record.mode==='history'&&await hashCanonical(record.historical.result)!==record.historical.resultHash)fail('HASH_MISMATCH','Historical result hash mismatch');
  return record;
}
