/* Strict, bounded Worker protocol. Fresh receiver validation runs before an
 * accepted request can supersede work or alter held state. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../js/codec.js'):root.NetworkedSyncCodec);if(typeof module==='object'&&module.exports)module.exports=api;else root.NetworkedSyncWorkerProtocol=api;}(globalThis,function(codec){
'use strict';
const limits=Object.freeze({maxRequests:10000,maxIdLength:128,maxWallMs:120000});
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id);
function fail(code,message){const e=new Error(message);e.code=code;throw e;}
function validateRequest(x,kernel,held){
  codec.keys(x,['id','type','request','record','observationId','config','mode','targetId'],['id','type'],'message');
  if(!validId(x.id))fail('INVALID_ID','Request id must be 1..128 safe ASCII characters');
  const fields={run:['request'],process:['observationId','config'],import:['record'],export:['observationId','mode'],release:[],cancel:['targetId']};
  if(typeof x.type!=='string'||!Object.prototype.hasOwnProperty.call(fields,x.type))fail('UNKNOWN_TYPE','Unsupported Worker operation');
  codec.keys(x,['id','type'].concat(fields[x.type]),['id','type'].concat(fields[x.type]),'message');
  // Serialized imports have a larger string allowance than ordinary fields.
  if(x.type==='import'&&typeof x.record==='string'){
    if(x.record.length>codec.limits.maxBytes||codec.utf8Length(x.record)>codec.limits.maxBytes)fail('INPUT_LIMIT','Import exceeds UTF-8 byte budget');
  }else codec.preflight(x);
  const req={id:x.id,type:x.type};
  if(x.type==='run'){
    codec.keys(x.request,['operation','config','observation'],['operation'],'request');
    if(x.request.config!==undefined)codec.keys(x.request.config,['shape','rank','iterations','tolerance','projectionOversampling','bandwidthHz','carrierHz','spacingWavelengths','seed','snrDb','offsetS','cfoHz','scenario','trace'],[],'config');
    if(x.request.operation==='held')codec.validateObservation(x.request.observation);
    req.request=kernel.validateRequest(x.request);
  }
  if(x.type==='import'){
    // Verify structure and semantic receiver validity synchronously before acceptance.
    let r=x.record;
    if(typeof r==='string'){try{r=JSON.parse(r);}catch(_){fail('INVALID_JSON','Invalid JSON record');}}
    codec.preflight(r);codec.keys(r,['schema','mode','config','observation','identity','historical'],['schema','mode','config','observation','identity'],'record');
    if(r.schema!==codec.schema||!['raw','history'].includes(r.mode))fail('INVALID_SCHEMA','Invalid record schema/mode');
    codec.validateObservation(r.observation);codec.validateConfig(r.config,r.observation);
    codec.keys(r.identity,['config_sha256','sample_sha256'],['config_sha256','sample_sha256'],'identity');
    for(const k of ['config_sha256','sample_sha256'])if(typeof r.identity[k]!=='string'||! /^[0-9a-f]{64}$/.test(r.identity[k]))fail('INVALID_HASH','Invalid SHA256 identity');
    if(r.mode==='raw'&&Object.prototype.hasOwnProperty.call(r,'historical'))fail('INVALID_RECORD','Raw record has historical content');
    if(r.mode==='history'){codec.keys(r.historical,['label','freshExecution','result'],['label','freshExecution','result'],'historical');if(r.historical.label!==codec.historicalLabel||r.historical.freshExecution!==false)fail('INVALID_HISTORY','Historical record must disclaim fresh execution');}
    kernel.validateRequest({operation:'held',config:r.config,observation:r.observation});req.record=r;
  }
  if(x.type==='process'||x.type==='export'){
    if(!validId(x.observationId))fail('INVALID_ID','Invalid observation id');
    if(!held||held.id!==x.observationId)fail('OBSERVATION_NOT_HELD','Observation is not held by this Worker');
    req.observationId=x.observationId;
    if(x.type==='process'){
      codec.keys(x.config,['shape','rank','iterations','tolerance','projectionOversampling','bandwidthHz','carrierHz','spacingWavelengths','seed','snrDb','offsetS','cfoHz','scenario','trace'],[],'config');
      req.request=kernel.validateRequest({operation:'held',config:Object.assign({},held.config,x.config),observation:held.observation});
    }else{if(!['raw','history'].includes(x.mode))fail('INVALID_MODE','mode must be raw or history');if(x.mode==='history'&&!held.result)fail('NO_HISTORY','No completed receiver result is held');req.mode=x.mode;}
  }
  if(x.type==='cancel'){if(!validId(x.targetId))fail('INVALID_ID','Invalid cancellation target');req.targetId=x.targetId;}
  return req;
}
return Object.freeze({name:'networked-sync-worker-v1',limits,validId,validateRequest});
}));
