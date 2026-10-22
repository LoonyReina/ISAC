import {finiteRange, inferenceConfig} from './config.mjs';
import {distance, rangeFromNs, backproject, excessDelayNs} from './geometry.mjs';
import {C} from './config.mjs';

export function validateObservations(obs) {
  if (!obs || obs.schema_version !== 'channel-mapping-observations-v1') throw new TypeError('Unsupported observation schema');
  if (obs.delay_origin !== 'absolute-calibrated-round-trip-ns' || obs.communication_origin !== 'excess-relative-to-los-ns') throw new TypeError('Delay calibration origins must be explicit');
  if (!Array.isArray(obs.stations) || obs.stations.length !== 2) throw new TypeError('Exactly two opposing stations are required');
  obs.stations.forEach((s, index) => {
    if (s.id !== index+1 || !Array.isArray(s.position_m) || s.position_m.length!==2 || !s.position_m.every(Number.isFinite)) throw new TypeError('Invalid station identity or position');
    if (!Array.isArray(s.angles_deg) || s.angles_deg.length<1 || s.angles_deg.length>181 || !s.angles_deg.every(Number.isFinite)) throw new TypeError('Invalid angle grid');
    if (!Array.isArray(s.delays_ns) || s.delays_ns.length<3 || s.delays_ns.length>4096 || !s.delays_ns.every((v,i,a)=>Number.isFinite(v) && v>=0 && (!i || v>a[i-1]))) throw new TypeError('Delay grid must be finite, nonnegative and increasing');
    if (!Array.isArray(s.power_db) || s.power_db.length!==s.angles_deg.length || !s.power_db.every(row=>Array.isArray(row) && row.length===s.delays_ns.length && row.every(Number.isFinite))) throw new TypeError('Invalid calibrated power matrix');
  });
  if (distance(obs.stations[0].position_m,obs.stations[1].position_m)===0) throw new RangeError('Station positions must differ');
  if (!Array.isArray(obs.communication) || obs.communication.length>1024 || !obs.communication.every(m=>typeof m.id==='string' && Number.isFinite(m.excess_ns)) || new Set(obs.communication.map(m=>m.id)).size!==obs.communication.length) throw new TypeError('Invalid communication observations');
  return obs;
}
// Equal-height interior plateaus select the leftmost bin, never both edges.
export function localMaxima(row) {
  const peaks=[];
  for(let i=1;i<row.length-1;) {
    const first=i, value=row[i];
    while(i+1<row.length && row[i+1]===value) i++;
    if(i<row.length-1 && value>row[first-1] && value>row[i+1]) peaks.push(first);
    i++;
  }
  return peaks;
}
export function detectPeaks(station, config) {
  const peaks=[];
  const row_counts=[];
  station.power_db.forEach((row,row_index)=>{
    const maxima=localMaxima(row);
    const above=maxima.filter(bin=>row[bin]>=config.minPowerDb).sort((a,b)=>row[b]-row[a] || a-b);
    const separated=[];
    above.forEach(bin=>{if(separated.every(other=>Math.abs(station.delays_ns[bin]-station.delays_ns[other])>=config.minSeparationNs)) separated.push(bin);});
    const ranged=separated.filter(bin=>rangeFromNs(station.delays_ns[bin])>=config.minRangeM);
    const kept=ranged.slice(0,config.maxPeaksPerAngle).sort((a,b)=>a-b);
    row_counts.push({row_index,local_maxima:maxima.length,above_height:above.length,after_separation:separated.length,after_range:ranged.length,kept:kept.length});
    kept.forEach(bin_index=>{
      const angle_deg=station.angles_deg[row_index], delay_ns=station.delays_ns[bin_index], range_m=rangeFromNs(delay_ns);
      peaks.push({id:`s${station.id}-r${row_index}-b${bin_index}`,station_id:station.id,row_index,bin_index,angle_deg,delay_ns,range_m,power_db:row[bin_index],point_m:backproject(station.id,station.position_m,angle_deg,range_m)});
    });
  });
  return {peaks,row_counts};
}
export function groupDetections(detections, radiusM) {
  finiteRange(radiusM,0,2,'clusterRadiusM');
  const parent=detections.map((_,i)=>i);
  function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
  function join(a,b){const ra=find(a),rb=find(b);if(ra!==rb)parent[Math.max(ra,rb)]=Math.min(ra,rb);}
  // Spatial cells avoid an all-pairs blow-up when teaching gates admit noise peaks.
  const cellSize=radiusM || 1, cells=new Map();
  detections.forEach((d,i)=>{
    const x=Math.floor(d.point_m[0]/cellSize), y=Math.floor(d.point_m[1]/cellSize);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of cells.get(`${x+dx},${y+dy}`)||[]) if(distance(d.point_m,detections[j].point_m)<=radiusM)join(i,j);
    const key=`${x},${y}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
  });
  const buckets=new Map();
  detections.forEach((d,i)=>{const key=find(i);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(d);});
  return [...buckets.values()].map((members,index)=>{
    const representatives=[1,2].map(id=>members.filter(d=>d.station_id===id).sort((a,b)=>b.power_db-a.power_db || a.row_index-b.row_index || a.bin_index-b.bin_index)[0]).filter(Boolean);
    const point_m=[0,1].map(axis=>representatives.reduce((total,p)=>total+p.point_m[axis],0)/representatives.length);
    return {id:`group-${index+1}`,point_m,representatives:representatives.map(p=>({...p})),member_ids:members.map(p=>p.id),member_count:members.length,station_count:representatives.length};
  });
}
export function associate(communication,predictions,gateNs) {
  return communication.map(mpc=>{
    const candidates=predictions.filter(p=>p.excess_ns!==null && Math.abs(p.excess_ns-mpc.excess_ns)<=gateNs).map(p=>({group_id:p.group_id,predicted_ns:p.excess_ns,residual_ns:p.excess_ns-mpc.excess_ns}));
    return {mpc_id:mpc.id,observed_ns:mpc.excess_ns,status:candidates.length===1?'unique':candidates.length>1?'ambiguous':'unmatched',assigned_group_id:candidates.length===1?candidates[0].group_id:null,candidates};
  });
}
export function infer(observations, overrides={}) {
  validateObservations(observations);
  const config=inferenceConfig(overrides), extracted=observations.stations.map(s=>detectPeaks(s,config));
  const detections=extracted.flatMap(s=>s.peaks),groups=groupDetections(detections,config.clusterRadiusM);
  const p1=observations.stations[0].position_m,p2=observations.stations[1].position_m,baseline=distance(p1,p2);
  const branches={};
  for(const branch of ['coordinate','paired_range','zero_angle']) {
    const predictions=groups.map(group=>{
      let point_m=group.point_m, excess_ns=null, unavailable_reason=null;
      if(branch==='paired_range') {
        if(group.station_count===2)excess_ns=(group.representatives.reduce((sum,p)=>sum+p.range_m,0)-baseline)*1e9/C;
        else unavailable_reason='Both station representatives are required';
        point_m=null;
      } else {
        if(branch==='zero_angle')point_m=[0,1].map(axis=>group.representatives.reduce((sum,p)=>sum+backproject(p.station_id,observations.stations[p.station_id-1].position_m,0,p.range_m)[axis],0)/group.station_count);
        excess_ns=excessDelayNs(point_m,p1,p2);
      }
      return {group_id:group.id,point_m,excess_ns,unavailable_reason};
    });
    branches[branch]={kind:branch==='zero_angle'?'destructive-ablation':branch==='paired_range'?'shared-group-fair-baseline':'coordinate-reconstruction',predictions,associations:associate(observations.communication,predictions,config.associationGateNs)};
  }
  return {schema_version:'channel-mapping-inference-v1',config,detections,groups,scan_trace:extracted.map((s,i)=>({station_id:i+1,row_counts:s.row_counts})),branches};
}
