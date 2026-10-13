/* Bounded deterministic networked ISAC record codec. Original implementation.
 * SHA-256 dependency has explicit first-party provenance in sha256.js.
 * Raw numeric order: link, m, n, k, real/imag; pilots: link, n, k, real/imag.
 */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./sha256.js') : root.NetworkedSyncSHA256);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NetworkedSyncCodec = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (SHA) {
  'use strict';
  const limits = Object.freeze({maxBytes:64*1024*1024,maxNodes:4000000,maxDepth:24,maxArrayLength:1000000,maxObjectKeys:128,maxStringBytes:16384,maxComplexSamples:14400});
  const schema = 'networked-sync-record-v1';
  const historicalLabel = 'historical-import-not-fresh-execution';
  const configFields = ['shape','rank','iterations','tolerance','projectionOversampling','bandwidthHz','carrierHz','spacingWavelengths','seed','snrDb','offsetS','cfoHz','scenario','trace'];
  const physicsFields = ['bandwidthHz','carrierHz','spacingWavelengths'];
  const generationFields = ['seed','snrDb','offsetS','cfoHz','scenario'];
  const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const encoder = new TextEncoder();
  // Brand/length/buffer inspection uses captured native accessors, never a
  // caller's Symbol.toStringTag, length, buffer, or iterator properties.
  const typedPrototype=Object.getPrototypeOf(Float64Array.prototype);
  const typedTag=Object.getOwnPropertyDescriptor(typedPrototype,Symbol.toStringTag).get;
  const typedLength=Object.getOwnPropertyDescriptor(typedPrototype,'length').get;
  const typedBuffer=Object.getOwnPropertyDescriptor(typedPrototype,'buffer').get;
  const arrayBufferBytes=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get;
  function isFloat64(x){return ArrayBuffer.isView(x)&&typedTag.call(x)==='Float64Array';}
  function nonsharedBuffer(x){try{arrayBufferBytes.call(typedBuffer.call(x));return true;}catch(_){return false;}}
  function fail(code,message) {const e=new Error(message);e.code=code;throw e;}
  function isRecord(x) { if(x===null || typeof x!=='object') return false; const p=Object.getPrototypeOf(x);return p===null || Object.getPrototypeOf(p)===null; }
  function keys(x,allowed,required,label) {
    if(!isRecord(x)) fail('INVALID_RECORD',label+' must be a plain object');
    for(const k of Reflect.ownKeys(x)) {const d=Object.getOwnPropertyDescriptor(x,k);if(typeof k!=='string'||!allowed.includes(k))fail('UNKNOWN_FIELD',label+' has an unknown field');if(!d||!('value'in d)||!d.enumerable)fail('INVALID_RECORD',label+' must use enumerable data properties');}
    for(const k of required||[])if(!has(x,k))fail('MISSING_FIELD',label+'.'+k+' is required');
  }
  function utf8Length(s) {
    let n=0;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))fail('INVALID_UNICODE','Unpaired UTF-16 surrogate');n+=4;}else if(c>=0xdc00&&c<=0xdfff)fail('INVALID_UNICODE','Unpaired UTF-16 surrogate');else n+=3;}return n;
  }
  // Counts before allocating canonical output. Structured clone necessarily occurs
  // before a Worker can preflight; these limits bound subsequent work, not cloning.
  function preflight(value) {
    const seen=new Set();let bytes=0,nodes=0;
    function visit(x,depth){
      if(++nodes>limits.maxNodes||depth>limits.maxDepth)fail('INPUT_LIMIT','Record exceeds structural budget');
      if(x===null||typeof x==='boolean')bytes+=5;
      else if(typeof x==='number'){if(!Number.isFinite(x))fail('NONFINITE','All numbers must be finite');bytes+=25;}
      else if(typeof x==='string'){const n=utf8Length(x);if(n>limits.maxStringBytes)fail('INPUT_LIMIT','String exceeds UTF-8 budget');bytes+=n*6+2;}
      else if(typeof x==='object'){
        if(seen.has(x))fail('INVALID_RECORD','Cycles are not supported');seen.add(x);
        if(ArrayBuffer.isView(x)){
          if(!isFloat64(x)||!nonsharedBuffer(x))fail('INVALID_RECORD','Only non-shared Float64Array views are supported');
          const length=typedLength.call(x);
          if(length>limits.maxArrayLength||nodes+length>limits.maxNodes)fail('INPUT_LIMIT','Array exceeds bound');
          // Reject all attached fields before looking up any indexed sample.
          for(const k of Reflect.ownKeys(x))if(typeof k!=='string'||! /^(0|[1-9][0-9]*)$/.test(k)||+k>=length)fail('INVALID_RECORD','Typed array has extra properties');
          for(let i=0;i<length;i++){if(!Number.isFinite(x[i]))fail('NONFINITE','All samples must be finite');}
          nodes+=length;bytes+=25*length+2;
        }else if(Array.isArray(x)){
          if(x.length>limits.maxArrayLength||nodes+x.length>limits.maxNodes)fail('INPUT_LIMIT','Array exceeds bound');
          for(const k of Reflect.ownKeys(x))if(k!=='length'&&(typeof k!=='string'||! /^(0|[1-9][0-9]*)$/.test(k)||+k>=x.length))fail('INVALID_RECORD','Array has extra properties');
          bytes+=2;for(let i=0;i<x.length;i++){const d=Object.getOwnPropertyDescriptor(x,String(i));if(!d||!('value'in d)||!d.enumerable)fail('INVALID_RECORD','Arrays must be dense enumerable data');visit(d.value,depth+1);bytes++;}
        }else{
          if(!isRecord(x))fail('INVALID_RECORD','Unsupported object');const names=Reflect.ownKeys(x);if(names.length>limits.maxObjectKeys)fail('INPUT_LIMIT','Object has too many fields');bytes+=2;
          for(const k of names){if(typeof k!=='string'||utf8Length(k)>128)fail('INVALID_RECORD','Invalid key');const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!('value'in d)||!d.enumerable)fail('INVALID_RECORD','Properties must be enumerable data');bytes+=utf8Length(k)*6+4;visit(d.value,depth+1);}
        }
        seen.delete(x);
      }else fail('INVALID_RECORD','Unsupported value');
      if(bytes>limits.maxBytes)fail('INPUT_LIMIT','Record exceeds 64 MiB conservative JSON budget');
    }
    visit(value,0);return {bytes,nodes};
  }
  function canonicalStringify(value) {
    preflight(value);
    function emit(x){if(x===null||typeof x!=='object')return JSON.stringify(typeof x==='number'&&x===0?0:x);if(Array.isArray(x)||ArrayBuffer.isView(x)){const length=Array.isArray(x)?x.length:typedLength.call(x),parts=new Array(length);for(let i=0;i<length;i++)parts[i]=emit(x[i]);return '['+parts.join(',')+']';}return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+emit(x[k])).join(',')+'}';}
    const text=emit(value);if(utf8Length(text)>limits.maxBytes)fail('INPUT_LIMIT','Encoded record exceeds UTF-8 byte budget');return text;
  }
  function normalized(value){return JSON.parse(canonicalStringify(value));}
  function shape(s){if(!Array.isArray(s)||s.length!==3)fail('INVALID_SHAPE','shape must contain three dimensions');for(let i=0;i<3;i++)if(!Number.isInteger(s[i])||s[i]<[4,8,5][i]||s[i]>[10,36,20][i])fail('INVALID_SHAPE','shape exceeds [4..10,8..36,5..20]');return s;}
  function validateObservation(o){
    preflight(o);keys(o,['shape','observations','pilots','configPhysics','generationConfig'],['shape','observations','pilots'],'observation');shape(o.shape);
    if(o.configPhysics!==undefined){keys(o.configPhysics,physicsFields,physicsFields,'configPhysics');for(const k of physicsFields)if(typeof o.configPhysics[k]!=='number'||!Number.isFinite(o.configPhysics[k])||o.configPhysics[k]<=0)fail('INVALID_CONFIG','Invalid physical metadata');}
    if(o.generationConfig!==undefined){keys(o.generationConfig,generationFields,[],'generationConfig');}
    const n=o.shape[0]*o.shape[1]*o.shape[2],p=o.shape[1]*o.shape[2];
    for(const [field,count]of [['observations',n],['pilots',p]]){
      if(!Array.isArray(o[field])||o[field].length!==2)fail('INVALID_OBSERVATION',field+' must contain two reciprocal links');
      for(let link=0;link<2;link++){
        const vector=o[field][link];
        if(!(Array.isArray(vector)||isFloat64(vector)))fail('INVALID_OBSERVATION',field+' must contain numeric vectors');
        const length=Array.isArray(vector)?vector.length:typedLength.call(vector);
        if(length!==2*count)fail('INVALID_OBSERVATION',field+' vector length mismatch');
        for(let i=0;i<length;i++)if(typeof vector[i]!=='number'||!Number.isFinite(vector[i]))fail('NONFINITE','Sample vectors must contain finite numbers');
        if(field==='pilots')for(let i=0;i<length;i+=2)if(Math.hypot(vector[i],vector[i+1])<1e-12)fail('INVALID_PILOT','Known nonzero pilots are required');
      }
    }
    return o;
  }
  function validateConfig(c,o){preflight(c);keys(c,configFields,['shape','rank'],'config');shape(c.shape);if(!Number.isInteger(c.rank)||c.rank<1||c.rank>3)fail('INVALID_CONFIG','rank must be 1..3');if(o)for(let i=0;i<3;i++)if(c.shape[i]!==o.shape[i])fail('INVALID_SHAPE','Config and observation shapes differ');return c;}
  async function checkpoint(hooks,stage,done,total){if(hooks&&typeof hooks.checkpoint==='function')await hooks.checkpoint(stage,{done,total});}
  async function identity(config,observation,hooks){
    // Own every byte/metadata value before the first asynchronous checkpoint.
    // Public callers can otherwise mutate an input while its digest is pending.
    config=normalized(config);observation=normalized(observation);
    validateObservation(observation);validateConfig(config,observation);
    const metadata={shape:observation.shape};for(const k of ['configPhysics','generationConfig'])if(has(observation,k))metadata[k]=observation[k];
    const configText=canonicalStringify({config,observation_metadata:metadata});
    const config_sha256=SHA.hash(encoder.encode(configText));
    const h=new SHA.SHA256();h.update(encoder.encode('networked-sync-samples-f64le-zero-normalized-v1\u0000'));
    const header=new Uint8Array(12),hv=new DataView(header.buffer);observation.shape.forEach((v,i)=>hv.setUint32(4*i,v,true));h.update(header);
    const count=observation.observations.reduce((s,a)=>s+a.length,0)+observation.pilots.reduce((s,a)=>s+a.length,0);let done=0;
    const chunk=new Uint8Array(32768),view=new DataView(chunk.buffer);
    for(const field of ['observations','pilots'])for(const vector of observation[field]){
      for(let start=0;start<vector.length;start+=4096){const n=Math.min(4096,vector.length-start);for(let i=0;i<n;i++)view.setFloat64(i*8,vector[start+i]===0?0:vector[start+i],true);h.update(chunk.subarray(0,n*8));done+=n;await checkpoint(hooks,'hash-samples',done,count);}
    }
    return {config_sha256,sample_sha256:h.digest()};
  }
  async function encodeRecord(input,mode,hooks){
    mode=mode===undefined?'raw':mode;if(!['raw','history'].includes(mode))fail('INVALID_MODE','mode must be raw or history');
    keys(input,['config','observation','result'],['config','observation'],'input');preflight(input);
    const config=normalized(input.config),observation=normalized(input.observation);validateObservation(observation);validateConfig(config,observation);
    if(mode==='history'&&!has(input,'result'))fail('MISSING_FIELD','History requires a result');
    const historicalResult=mode==='history'?normalized(input.result):null;
    const record={schema,mode,config,observation,identity:await identity(config,observation,hooks)};
    if(mode==='history'){
      record.historical={label:historicalLabel,freshExecution:false,result:historicalResult};
    }
    preflight(record);await checkpoint(hooks,'export-record',1,1);return record;
  }
  async function decodeRecord(input,hooks){
    let record=input;
    if(typeof input==='string'){if(input.length>limits.maxBytes||utf8Length(input)>limits.maxBytes)fail('INPUT_LIMIT','Import exceeds 64 MiB UTF-8 budget');try{record=JSON.parse(input);}catch(e){if(e.code)throw e;fail('INVALID_JSON','Record is not valid JSON');}}
    // Snapshot object imports (and parsed text) before identity() can yield.
    record=normalized(record);
    keys(record,['schema','mode','config','observation','identity','historical'],['schema','mode','config','observation','identity'],'record');
    if(record.schema!==schema)fail('INVALID_SCHEMA','Unsupported record schema');if(!['raw','history'].includes(record.mode))fail('INVALID_MODE','Invalid record mode');
    if(record.mode==='raw'&&has(record,'historical'))fail('INVALID_RECORD','Raw record must not contain historical results');
    if(record.mode==='history'){keys(record.historical,['label','freshExecution','result'],['label','freshExecution','result'],'historical');if(record.historical.label!==historicalLabel||record.historical.freshExecution!==false)fail('INVALID_HISTORY','History must explicitly disclaim fresh execution');}
    keys(record.identity,['config_sha256','sample_sha256'],['config_sha256','sample_sha256'],'identity');for(const k of ['config_sha256','sample_sha256'])if(typeof record.identity[k]!=='string'||! /^[0-9a-f]{64}$/.test(record.identity[k]))fail('INVALID_HASH','Invalid SHA-256 identity');
    validateObservation(record.observation);validateConfig(record.config,record.observation);
    const actual=await identity(record.config,record.observation,hooks);for(const k of Object.keys(actual))if(actual[k]!==record.identity[k])fail('HASH_MISMATCH',k+' does not match record contents');
    await checkpoint(hooks,'import-record',1,1);return record;
  }
  return Object.freeze({schema,historicalLabel,limits,keys,isRecord,preflight,utf8Length,canonicalStringify,validateConfig,validateObservation,identity,encodeRecord,decodeRecord});
}));
