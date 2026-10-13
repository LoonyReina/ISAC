import {LIMITS,keys,preflight,fail} from '../js/validation.js';
import {validateExperimentConfig} from '../js/evaluation.js';
import {practicalReceiverInput,validateReceiverInput} from '../js/receiver.js';
export {LIMITS};
export const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id);
export function validateRequest(x,held){
 keys(x,['id','type','config','input','targetId','resultId'],['id','type'],'request');
 if(!validId(x.id))fail('INVALID_ID','Use a fresh 1–128 character ASCII request id');
 const fields={run:['config'],receive:['input'],cancel:['targetId'],export:['resultId'],release:[]};
 if(typeof x.type!=='string'||!Object.hasOwn(fields,x.type))fail('UNKNOWN_TYPE','Unsupported request type');
 keys(x,['id','type',...fields[x.type]],['id','type',...fields[x.type]],'request');preflight(x);
 const out={id:x.id,type:x.type};
 if(x.type==='run')out.config=validateExperimentConfig(x.config);
 else if(x.type==='receive'){const i=practicalReceiverInput(x.input);validateReceiverInput(i);out.input=x.input;}
 else if(x.type==='cancel'){if(!validId(x.targetId))fail('INVALID_ID','Valid targetId required');out.targetId=x.targetId;}
 else if(x.type==='export'){if(!validId(x.resultId)||!held||held.id!==x.resultId)fail('RESULT_NOT_HELD','Requested result is not retained');out.resultId=x.resultId;}
 return out;
}
