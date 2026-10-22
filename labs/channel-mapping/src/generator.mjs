import {C, GENERATOR_VERSION, CANDIDATE_VERSION, generatorConfig} from './config.mjs';

// Independent implementation from the public portable-generator specification.
export function fnv1a32(text) {
  let state = 2166136261;
  for (const byte of new TextEncoder().encode(text)) state = Math.imul((state ^ byte) >>> 0, 16777619) >>> 0;
  return state;
}
export function createNamedStream(seed, scene, name) {
  generatorConfig({seed, scene, noise:0});
  if (typeof name !== 'string' || !/^[\x20-\x7e]+$/.test(name)) throw new TypeError('stream name must be printable ASCII');
  let state = fnv1a32(`${GENERATOR_VERSION}|${seed}|${scene}|${name}`);
  return {
    nextUint32() { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state; },
    next() { return this.nextUint32() / 4294967296; },
    uniform(low, high) { return low + (high-low)*this.next(); }
  };
}
export function nearestDelayBin(delays, value) {
  let best = 0;
  for (let i=1; i<delays.length; i++) if (Math.abs(delays[i]-value) < Math.abs(delays[best]-value)) best=i;
  return best;
}
export function generateCase(input = {}) {
  const {scene, seed, noise} = generatorConfig(input);
  const coordinates = scene === 'delay_ambiguous' ? [[1.2,.8],[2.8,-.8],[2,2.6]] : [[1.2,.65],[2.8,-1.3],[2,2.5]];
  const objects = coordinates.map(([x,y], i) => ({id: 'ABC'[i], x, y, sensing_visible: !(scene === 'sensing_missing' && i === 1), identifiable: !(scene === 'delay_ambiguous' && i < 2), true_excess_ns: (Math.sqrt(x*x+y*y)+Math.sqrt((4-x)**2+y*y)-4)*1e9/C}));
  const angles_deg = Array.from({length:25}, (_,i) => -60+5*i);
  const delays_ns = Array.from({length:161}, (_,i) => i*.25);
  const stations = [1,2].map(id => {
    const floor = createNamedStream(seed, scene, `floor/station-${id}`);
    const power_db = angles_deg.map(() => delays_ns.map(() => -85+noise*floor.uniform(-1,1)));
    power_db.forEach(row => {row[4]=-20;});
    objects.forEach((object, index) => {
      if (!object.sensing_visible) return;
      const inward = id === 1 ? object.x : 4-object.x;
      const r = Math.sqrt(inward*inward+object.y*object.y);
      const theta = Math.atan2(-object.y, inward)*180/Math.PI;
      const time = 2*r*1e9/C + noise*createNamedStream(seed,scene,`sensing-time/station-${id}/${object.id}`).uniform(-.1,.1);
      const bin = nearestDelayBin(delays_ns, time);
      angles_deg.forEach((angle,row) => {
        const power = [-38,-42,-45][index] - 12*((angle-theta)/12)**2;
        power_db[row][bin] = Math.max(power_db[row][bin],power);
      });
    });
    return {id, position_m: id===1 ? [0,0] : [4,0], angles_deg:[...angles_deg], delays_ns:[...delays_ns], power_db};
  });
  const communication = objects.map((object,i) => ({id:`mpc${i}`, excess_ns:object.true_excess_ns+noise*createNamedStream(seed,scene,`communication-time/${object.id}`).uniform(-.05,.05)}));
  communication.push({id:'mpc3',excess_ns:18});
  return {
    provenance:{candidate_version:CANDIDATE_VERSION, generator_version:GENERATOR_VERSION, source:'new-synthetic-observations', scene,seed,noise, historical_evidence_inherited:false},
    observations:{schema_version:'channel-mapping-observations-v1', delay_origin:'absolute-calibrated-round-trip-ns', communication_origin:'excess-relative-to-los-ns', stations,communication},
    truth:{objects, communication:[...objects.map((o,i)=>({id:`mpc${i}`,object_id:o.id,identifiable:o.identifiable})),{id:'mpc3',object_id:null,identifiable:false}]}
  };
}
