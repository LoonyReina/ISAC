import {caseConfig,CANDIDATE_VERSION} from './config.mjs';
import {generateCase} from './generator.mjs';
import {infer} from './inference.mjs';
import {evaluate} from './evaluation.mjs';
export function solveCase(input={}){
  const config=caseConfig(input),generated=generateCase(config);
  const inference=infer(generated.observations,config);
  const evaluation=evaluate(inference,generated.truth);
  return {schema_version:'channel-mapping-run-v1',config,...generated,inference,evaluation,validation_status:'new candidate; independent numerical and native browser validation required'};
}
export function solveCaptured(observations,config={},truth=null){
  const inference=infer(observations,config);
  return {schema_version:'channel-mapping-run-v1',provenance:{candidate_version:CANDIDATE_VERSION,source:'captured-observations-no-regeneration',historical_evidence_inherited:false},observations,inference,...(truth?{truth,evaluation:evaluate(inference,truth)}:{}),validation_status:'captured input does not imply historical provenance or acceptance'};
}
