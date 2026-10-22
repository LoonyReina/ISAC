import {distance} from './geometry.mjs';
import {finiteRange} from './config.mjs';

// Truth enters only this evaluator, after all inference decisions are final.
export function matchGroups(groups, objects, gateM=0.6) {
  finiteRange(gateM,0,10,'truth matching gate');
  if(!Array.isArray(objects)||objects.length>12)throw new RangeError('Evaluator supports at most 12 truth objects');
  if(new Set(objects.map(o=>o.id)).size!==objects.length || !objects.every(o=>typeof o.id==='string'&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&Number.isFinite(o.true_excess_ns)))throw new TypeError('Invalid evaluation objects');
  let states=new Map([[0,{cost:0,pairs:[]}]]);
  for(const group of groups){
    const next=new Map(states);
    for(const [mask,state] of states)objects.forEach((object,index)=>{
      if(mask&(1<<index))return;
      const error=distance(group.point_m,[object.x,object.y]);if(error>gateM)return;
      const newMask=mask|(1<<index),cost=state.cost+error*error,previous=next.get(newMask);
      if(!previous||cost<previous.cost)next.set(newMask,{cost,pairs:[...state.pairs,{group_id:group.id,object_id:object.id,localization_error_m:error}]});
    });
    states=next;
  }
  let best={cost:0,pairs:[]};
  for(const state of states.values())if(state.pairs.length>best.pairs.length||(state.pairs.length===best.pairs.length&&state.cost<best.cost))best=state;
  return best.pairs;
}
function rmse(values){return values.length?Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length):null;}
export function validateTruth(inference, truth) {
  if(!truth || !Array.isArray(truth.objects) || truth.objects.length>12 || !Array.isArray(truth.communication))throw new TypeError('Evaluation requires bounded objects and communication truth arrays');
  if(!truth.objects.every(o=>o && typeof o.id==='string' && o.id.length>0 && Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.true_excess_ns) && typeof o.sensing_visible==='boolean' && typeof o.identifiable==='boolean') || new Set(truth.objects.map(o=>o.id)).size!==truth.objects.length)throw new TypeError('Truth object IDs must be unique and fields valid');
  const objects=new Map(truth.objects.map(o=>[o.id,o]));
  if(!truth.communication.every(m=>m && typeof m.id==='string' && m.id.length>0 && typeof m.identifiable==='boolean' && (m.object_id===null || typeof m.object_id==='string' && objects.has(m.object_id))))throw new TypeError('Truth MPCs require valid IDs, existing object references and boolean identifiability');
  const ids=truth.communication.map(m=>m.id);
  if(new Set(ids).size!==ids.length)throw new TypeError('Truth communication IDs must be unique');
  const branches=Object.values(inference.branches);
  if(!branches.length)throw new TypeError('Evaluation requires inferred communication paths');
  const expected=branches[0].associations.map(a=>a.mpc_id);
  if(new Set(expected).size!==expected.length || ids.length!==expected.length || !expected.every(id=>ids.includes(id)))throw new TypeError('Truth communication must cover the observed MPC IDs exactly once');
  if(!branches.every(b=>b.associations.length===expected.length && new Set(b.associations.map(a=>a.mpc_id)).size===expected.length && b.associations.every(a=>expected.includes(a.mpc_id))))throw new TypeError('All inference branches must cover the same observed MPC IDs');
  if(!truth.communication.every(m=>m.object_id===null ? m.identifiable===false : m.identifiable===objects.get(m.object_id).identifiable))throw new TypeError('Communication identifiability must agree with object truth; clutter is not identifiable');
  return truth;
}
export function evaluate(inference, truth, matchingRadiusM=0.6){
  validateTruth(inference,truth);
  const matches=matchGroups(inference.groups,truth.objects,matchingRadiusM);
  const byGroup=new Map(matches.map(m=>[m.group_id,m.object_id]));
  const objects=new Map(truth.objects.map(o=>[o.id,o]));
  const paths=new Map(truth.communication.map(m=>[m.id,m]));
  const truePaths=truth.communication.filter(m=>m.object_id!==null).length;
  const metrics={};
  for(const [name,branch] of Object.entries(inference.branches)){
    let correct_unique=0,false_unique=0,nonidentifiable_unique=0,ambiguous_abstentions=0,unmatched_abstentions=0;
    const association_details=branch.associations.map(result=>{
      const path=paths.get(result.mpc_id);if(!path)throw new TypeError('Missing truth MPC label');
      let outcome=result.status;
      if(result.status==='unique'){
        const correct=path.object_id!==null && path.identifiable===true && byGroup.get(result.assigned_group_id)===path.object_id;
        if(correct){correct_unique++;outcome='correct_unique';}else{false_unique++;outcome='false_unique';if(path.object_id!==null&&!path.identifiable)nonidentifiable_unique++;}
      }else if(result.status==='ambiguous'){ambiguous_abstentions++;}else{unmatched_abstentions++;}
      return {mpc_id:result.mpc_id,object_id:path.object_id,identifiable:path.identifiable,outcome};
    });
    const delay_errors=[],location_errors=[];
    for(const prediction of branch.predictions){
      const object=objects.get(byGroup.get(prediction.group_id));if(!object||prediction.excess_ns===null)continue;
      delay_errors.push(prediction.excess_ns-object.true_excess_ns);
      if(prediction.point_m)location_errors.push(distance(prediction.point_m,[object.x,object.y]));
    }
    metrics[name]={matched_objects:matches.length,missed_truth_objects:truth.objects.length-matches.length,extra_estimates:inference.groups.length-matches.length,physical_truth_objects:truth.objects.length,shared_group_localization_rmse_m:rmse(matches.map(m=>m.localization_error_m)),branch_location_rmse_m:rmse(location_errors),delay_rmse_ns:rmse(delay_errors),available_matched_predictions:delay_errors.length,prediction_coverage_among_matched_objects:matches.length?delay_errors.length/matches.length:null,correct_unique,false_unique,nonidentifiable_unique,ambiguous_abstentions,unmatched_abstentions,communication_observations:branch.associations.length,true_communication_observations:truePaths,recall:truePaths?correct_unique/truePaths:null,false_association_rate:correct_unique+false_unique?false_unique/(correct_unique+false_unique):null,association_details};
  }
  return {schema_version:'channel-mapping-evaluation-v1',matching_radius_m:matchingRadiusM,matching_rule:'maximum-cardinality then minimum total squared coordinate error; evaluation only',matches,metrics};
}
