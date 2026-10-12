/* Reduced GC-SAGE lesson: synthetic observations and evaluation ONLY.
 * No estimator is imported; never pass truth or ledger.evaluation_only to a fit.
 * Pure UMD module: no storage, network, timers, or ambient random state.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.GCSAGEObservations = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'reduced-gc-sage-observations/1.0.0';
  const GEOMETRY_VERSION = 'reduced-gc-sage-2d/0.2.0-all-channel-region';
  const GENERATOR_VERSION = 'mulberry32-midpoint-box-muller/1';
  const C = 299792458, TAU = 2 * Math.PI, Q = 48, P = 64;
  const DEFAULT_CONFIG = Object.freeze({snrDb:15, aperture:1.49146747855,
    bandwidthHz:1e9, seed:260501162, scene:'normal'});
  const OFFERED = Object.freeze({snrDb:Object.freeze([5,10,15,20]),
    aperture:Object.freeze([.05,.35,.75,1.49146747855]),
    bandwidthHz:Object.freeze([20e6,100e6,250e6,500e6,1e9]),
    scene:Object.freeze(['normal','reference-blind'])});
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function keys(value, allowed, name) {
    assert(value && typeof value === 'object' && !Array.isArray(value), name+' must be an object');
    for (const key of Object.keys(value)) assert(allowed.includes(key), 'Unknown '+name+' field: '+key);
  }
  function vector(v, length, name) {
    assert((Array.isArray(v) || ArrayBuffer.isView(v)) && v.length===length && Array.from(v).every(finite), name+' must have '+length+' finite entries');
  }
  function point(v, name) { vector(v,2,name); }
  function finiteOutput(value) {
    if(typeof value==='number')assert(Number.isFinite(value),'Computed evaluation/display output overflowed');
    else if(value&&typeof value==='object')for(const v of Object.values(value))finiteOutput(v);
    return value;
  }
  function matrix(rows,cols) { return {rows,cols,real:new Float64Array(rows*cols),imag:new Float64Array(rows*cols)}; }
  function checkMatrix(y,name) {
    keys(y,['rows','cols','real','imag'],name);
    assert(Number.isSafeInteger(y.rows)&&y.rows>0&&Number.isSafeInteger(y.cols)&&y.cols>0,name+' shape must be positive integers');
    vector(y.real,y.rows*y.cols,name+'.real');vector(y.imag,y.rows*y.cols,name+'.imag');
    return y;
  }
  function energy(y) { let sum=0;for(let i=0;i<y.real.length;i++)sum+=y.real[i]**2+y.imag[i]**2;return sum; }
  function squaredError(a,b) { let sum=0;for(let i=0;i<a.real.length;i++)sum+=(a.real[i]-b.real[i])**2+(a.imag[i]-b.imag[i])**2;return sum; }
  function linspace(lo,hi,n) { const a=new Array(n),step=(hi-lo)/(n-1);for(let i=0;i<n;i++)a[i]=lo+i*step;a[n-1]=hi;return a; }
  function configWithDefaults(input={}) {
    keys(input,Object.keys(DEFAULT_CONFIG),'configuration');const config={...DEFAULT_CONFIG,...input};
    for(const name of Object.keys(OFFERED)) assert(OFFERED[name].includes(config[name]),'Unsupported '+name+'; use one of '+OFFERED[name].join(', '));
    assert(Number.isInteger(config.seed)&&config.seed>=0&&config.seed<=0xffffffff,'seed must be a uint32 integer');
    return config;
  }
  // A fresh state per generate(). Midpoint uniforms are strictly inside (0,1).
  // Box-Muller emits cosine then sine; draws fill all real samples, then imag.
  function normalGenerator(seed) {
    let state=seed>>>0,spare=null;
    function uniform() {
      state=(state+0x6D2B79F5)>>>0;let t=state;
      t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
      return (((t^(t>>>14))>>>0)+.5)/4294967296;
    }
    return function normal() {
      if(spare!==null){const value=spare;spare=null;return value;}
      const radius=Math.sqrt(-2*Math.log(uniform())),angle=TAU*uniform();
      spare=radius*Math.sin(angle);return radius*Math.cos(angle);
    };
  }
  function validateDeclaredModel(y,m) {
    keys(m,['tx','rx','frequencies','region','reference_pair','path_count','max_delay_ns'],'model');
    for(const key of ['tx','rx']) assert(Array.isArray(m[key])&&m[key].length>0&&m[key].every(v=>Array.isArray(v)&&v.length===2&&v.every(finite)),key+' must contain finite 2-D coordinates');
    vector(m.frequencies,y.cols,'frequencies');
    assert(y.rows===m.tx.length*m.rx.length,'Observation shape must equal (M*N, P)');
    assert(m.path_count===2 && y.cols>2,'This evaluator supports known L=2 and at least three tones');
    assert(Number.isInteger(m.reference_pair)&&m.reference_pair>=0&&m.reference_pair<y.rows,'Invalid reference_pair');
    vector(m.region,4,'region');assert(m.region[0]<m.region[1]&&m.region[2]<m.region[3],'Invalid region');
    assert(finite(m.max_delay_ns)&&m.max_delay_ns>0,'Invalid delay prior');
    const sorted=Array.from(m.frequencies).sort((a,b)=>a-b),diff=sorted.slice(1).map((v,i)=>v-sorted[i]),base=Math.min(...diff);
    assert(base>0,'Frequencies must be distinct');
    assert(diff.every(d=>Math.abs(d/base-Math.round(d/base))<=1e-8*(1+Math.abs(Math.round(d/base)))),'Unsupported tone lattice');
    const alias=1e9/base;assert(m.max_delay_ns<alias,'Delay prior reaches a tone-grid alias class');
    const referenceTx=m.tx[Math.floor(m.reference_pair/m.rx.length)],referenceRx=m.rx[m.reference_pair%m.rx.length];
    assert(m.max_delay_ns>Math.hypot(referenceTx[0]-referenceRx[0],referenceTx[1]-referenceRx[1])/C*1e9+1e-5,'No physical reference-delay interval');
    return alias;
  }
  function generate(input={}) {
    const config=configWithDefaults(input),x=linspace(2,2+config.aperture,Q),frequencies=linspace(-config.bandwidthHz/2,config.bandwidthHz/2,P);
    const model={tx:[[1,0]],rx:x.map(v=>[v,0]),frequencies,region:[0,6.5,.05,6.5],reference_pair:23,path_count:2,max_delay_ns:55};
    const clean=matrix(Q,P),unblocked=matrix(Q,P),noise=matrix(Q,P),observations=matrix(Q,P);
    const delays=[new Float64Array(Q),new Float64Array(Q)],gains=[{real:new Float64Array(Q),imag:new Float64Array(Q)},{real:new Float64Array(Q),imag:new Float64Array(Q)}];
    const visibility=[new Array(Q).fill(true),new Array(Q)],bounce_points=[new Array(Q),new Array(Q)];
    const reflectionReal=.8*Math.cos(.7),reflectionImag=.8*Math.sin(.7);
    for(let q=0;q<Q;q++) {
      delays[0][q]=(1+Math.hypot(x[q]-1,1))/C;
      delays[1][q]=Math.hypot(x[q]-1,4)/C;
      // Tx image (1,4), receiver (x,0): ray parameter 1/2 at y=2.
      const bounce=[1+.5*(x[q]-1),2],position=bounce[0]-1.5;
      const visible=position>=-1e-10&&position<=.5+1e-10&&(config.scene!=='reference-blind'||q<Math.max(1,Math.floor(.2*Q)));
      visibility[1][q]=visible;bounce_points[0][q]=[1,1];bounce_points[1][q]=bounce;
      gains[0].real[q]=1;gains[1].real[q]=visible?reflectionReal:0;gains[1].imag[q]=visible?reflectionImag:0;
      for(let p=0;p<P;p++) {
        const i=q*P+p,a=(-TAU*delays[0][q])*frequencies[p],b=(-TAU*delays[1][q])*frequencies[p];
        const pr=Math.cos(a),pi=Math.sin(a),rr=reflectionReal*Math.cos(b)-reflectionImag*Math.sin(b),ri=reflectionReal*Math.sin(b)+reflectionImag*Math.cos(b);
        unblocked.real[i]=pr+rr;unblocked.imag[i]=pi+ri;
        clean.real[i]=pr+(visible?rr:0);clean.imag[i]=pi+(visible?ri:0);
      }
    }
    const unblockedEnergy=energy(unblocked),sigma2=unblockedEnergy/(Q*P)*10**(-config.snrDb/10),scale=Math.sqrt(sigma2/2),normal=normalGenerator(config.seed);
    for(let i=0;i<Q*P;i++)noise.real[i]=scale*normal();
    for(let i=0;i<Q*P;i++)noise.imag[i]=scale*normal();
    for(let i=0;i<Q*P;i++){observations.real[i]=clean.real[i]+noise.real[i];observations.imag[i]=clean.imag[i]+noise.imag[i];}
    const alias=validateDeclaredModel(observations,model),cleanEnergy=energy(clean),noiseEnergy=energy(noise),reference=model.rx[23].slice();
    const truth={evaluation_only:true,scene:{...config},clean,noise,noise_variance:sigma2,point:[1,1],surface_point:[1.5,2],surface_normal:[0,1],surface_end:[2,2],kinds:['scattering','reflection'],delays,gains,visibility,bounce_points};
    const ledger={simulator_version:VERSION,geometry_version:GEOMETRY_VERSION,generator_version:GENERATOR_VERSION,
      seed:config.seed,nominal_snr_db:config.snrDb,noise_calibration:'Unblocked two-path clean mean power; finite support/blockage does not rescale noise',
      noise_variance:sigma2,complex_observations:Q*P,real_scalar_observations:2*Q*P,free_complex_path_gains:2*Q,
      samples:Q,tones:P,known_path_count:2,rx_aperture_m:config.aperture,rx_endpoints_m:[model.rx[0].slice(),model.rx[Q-1].slice()],virtual_rx_spacing_m:config.aperture/(Q-1),
      aperture_convention:'Left endpoint fixed at x=2 m; changing span moves receivers/reference and changes finite-segment support, not a pure fixed-viewpoint aperture experiment',
      reference_pair:23,reference_rx_m:reference,bandwidth_hz:config.bandwidthHz,frequency_spacing_hz:frequencies[1]-frequencies[0],delay_alias_period_ns:alias,
      inverse_bandwidth_ns:1e9/config.bandwidthHz,max_delay_prior_ns:55,carrier_control:false,
      carrier_disclosure:'Independent complex channel gains absorb frequency-independent carrier phase; centered tone offsets carry broadband slope information',
      energy_scope:'Normalized channel-observation squared magnitudes only; no calibrated transmit joules, pilot energy, throughput, or hardware efficiency claim',
      evaluation_only:{unblocked_clean_energy:unblockedEnergy,unblocked_clean_mean_power:unblockedEnergy/(Q*P),clean_energy:cleanEnergy,clean_mean_power:cleanEnergy/(Q*P),noise_energy:noiseEnergy,
        expected_noise_energy:Q*P*sigma2,observed_energy:energy(observations),realized_received_snr_db:10*Math.log10(cleanEnergy/noiseEnergy),expected_received_snr_db:10*Math.log10(cleanEnergy/(Q*P*sigma2)),
        reference_truth_visibility:visibility.map(v=>v[23]),reflection_visible_samples:visibility[1].filter(Boolean).length}};
    return {simulator_version:VERSION,config,observations,model,truth,ledger};
  }
  // Small shortest-augmenting-path assignment, including dummy rows/columns.
  // Reverse remaining-column order and free-column tie preference match SciPy's
  // rectangular shortest-augmenting-path convention, tested against SciPy 1.17.
  function assignment(cost) {
    const n=cost.length,u=new Array(n).fill(0),v=new Array(n).fill(0),row4col=new Array(n).fill(-1),col4row=new Array(n).fill(-1);
    for(let current=0;current<n;current++) {
      let i=current,min=0,sink=-1,count=n;const remaining=Array.from({length:n},(_,j)=>n-j-1),shortest=new Array(n).fill(Infinity),path=new Array(n).fill(-1),sr=new Array(n).fill(false),sc=new Array(n).fill(false);
      while(sink<0) {
        let index=-1,lowest=Infinity;sr[i]=true;
        for(let at=0;at<count;at++) {
          const j=remaining[at],r=min+cost[i][j]-u[i]-v[j];
          if(r<shortest[j]){path[j]=i;shortest[j]=r;}
          if(shortest[j]<lowest||(shortest[j]===lowest&&row4col[j]<0)){lowest=shortest[j];index=at;}
        }
        min=lowest;const j=remaining[index];if(row4col[j]<0)sink=j;else i=row4col[j];
        sc[j]=true;remaining[index]=remaining[--count];
      }
      u[current]+=min;
      for(let row=0;row<n;row++)if(sr[row]&&row!==current)u[row]+=min-shortest[col4row[row]];
      for(let col=0;col<n;col++)if(sc[col])v[col]-=min-shortest[col];
      let j=sink;
      for(;;){const row=path[j];row4col[j]=row;const old=col4row[row];col4row[row]=j;j=old;if(row===current)break;}
    }
    return col4row;
  }
  function associateDelays(actual,estimated,present) {
    vector(actual,2,'actual reference delays');vector(estimated,2,'estimated reference delays');
    assert(Array.isArray(present)&&present.length===2&&present.every(x=>typeof x==='boolean'),'present must be two booleans');
    const targets=[0,1].filter(i=>present[i]),k=targets.length,l=2,n=k+l,tolerance=.5;
    const cost=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>r<k?(c<l?Math.abs(actual[targets[r]]-estimated[c])*1e9:tolerance/2):(c<l?tolerance/2:0)));
    assert(cost.every(row=>row.every(finite)),'Reference-delay matching cost overflowed');
    const columns=assignment(cost),associations=[null,null];
    for(let r=0;r<k;r++)if(columns[r]<l&&cost[r][columns[r]]<=tolerance)associations[targets[r]]=columns[r];
    return {association:associations,unmatched_estimate_indices:[0,1].filter(i=>!associations.includes(i)),evaluation_association_tolerance_ns:tolerance,
      association_rule:'Minimum total reference-delay cost with 0.25 ns unmatched-end costs, then <=0.5 ns gate; labels excluded; exact boundary ties may remain unmatched'};
  }
  function checkTruth(truth,y) {
    assert(truth&&typeof truth==='object','truth must be separate evaluation input');
    checkMatrix(truth.clean,'truth.clean');assert(truth.clean.rows===y.rows&&truth.clean.cols===y.cols,'Truth clean shape mismatch');
    assert(finite(truth.noise_variance)&&truth.noise_variance>=0,'Invalid truth noise variance');
    for(const name of ['point','surface_point','surface_normal'])point(truth[name],'truth.'+name);
    assert(Math.abs(Math.hypot(...truth.surface_normal)-1)<1e-8,'Truth normal must be unit length');
    assert(Array.isArray(truth.kinds)&&truth.kinds.length===2&&truth.kinds[0]==='scattering'&&truth.kinds[1]==='reflection','Truth must contain point then reflection');
    for(const name of ['delays','visibility','bounce_points'])assert(Array.isArray(truth[name])&&truth[name].length===2,'Truth needs two '+name+' arrays');
    for(let i=0;i<2;i++) {
      vector(truth.delays[i],y.rows,'truth.delays');
      assert(Array.isArray(truth.visibility[i])&&truth.visibility[i].length===y.rows&&truth.visibility[i].every(x=>typeof x==='boolean'),'Truth visibility must be boolean');
      assert(Array.isArray(truth.bounce_points[i])&&truth.bounce_points[i].length===y.rows,'Truth bounce shape');truth.bounce_points[i].forEach(p=>point(p,'truth.bounce_points'));
    }
  }
  function checkResult(result,y) {
    assert(result&&['scattering','hybrid'].includes(result.mode),'Invalid result mode');
    assert(Array.isArray(result.states)&&result.states.length===2,'Evaluation requires exactly two estimated paths');
    checkMatrix(result.prediction,'prediction');assert(result.prediction.rows===y.rows&&result.prediction.cols===y.cols,'Prediction shape mismatch');
    for(const s of result.states) {
      assert(['unlocalized','scattering','reflection'].includes(s.kind)&&finite(s.reference_delay),'Invalid path kind or reference delay');vector(s.delays,y.rows,'state.delays');
      assert(s.gains&&typeof s.gains==='object','State gains required');vector(s.gains.real,y.rows,'gains.real');vector(s.gains.imag,y.rows,'gains.imag');
      for(const name of ['point','normal'])if(s[name]!=null)point(s[name],'state.'+name);
      if(s.normal!=null)assert(s.point!=null&&s.kind==='reflection'&&Math.abs(Math.hypot(...s.normal)-1)<1e-8,'Estimated normal requires reflection point and unit direction');
      if(s.bounce_points!=null){assert(Array.isArray(s.bounce_points)&&s.bounce_points.length===y.rows,'Estimated bounce shape');s.bounce_points.forEach(p=>point(p,'state.bounce_points'));}
    }
  }
  function conditionalDesign(states,frequencies) {
    let minimum=Infinity,maximum=0,rank=2;
    for(let q=0;q<states[0].delays.length;q++) {
      let re=0,im=0;const angles=frequencies.map(f=>(-TAU*(states[1].delays[q]-states[0].delays[q]))*f);
      assert(Array.from(angles).every(finite),'Conditional design phase overflowed');
      for(const a of angles){re+=Math.cos(a);im+=Math.sin(a);}
      const magnitude=Math.hypot(re,im),phase=magnitude>0?Math.atan2(im,re):0;
      // Direct differences avoid subtracting rounded near-unit correlations.
      let difference=0;for(const a of angles)difference+=(1-Math.cos(a-phase))**2+Math.sin(a-phase)**2;
      const small=Math.sqrt(difference/(2*frequencies.length)),large=Math.sqrt(Math.max(0,2-small*small));
      minimum=Math.min(minimum,small);maximum=Math.max(maximum,small>0?large/small:Infinity);rank=Math.min(rank,(small>1e-10?1:0)+(large>1e-10?1:0));
    }
    return {scope:'Linear gain identifiability conditional on fitted geometry; not a proof of geometric or mechanism identifiability',min_normalized_singular_value:minimum,
      max_condition_number:Number.isFinite(maximum)?maximum:null,condition_number_null_reason:Number.isFinite(maximum)?null:'Singular conditional design (infinite condition number)',minimum_channel_rank:rank};
  }
  function evaluate(result,observations,model,truth,options={}) {
    keys(options,['visibilityHeuristic'],'evaluation options');const heuristic=options.visibilityHeuristic===undefined?false:options.visibilityHeuristic;assert(typeof heuristic==='boolean','visibilityHeuristic must be boolean');
    const y=checkMatrix(observations,'observations');validateDeclaredModel(y,model);checkTruth(truth,y);checkResult(result,y);
    const actual=truth.delays.map(d=>d[model.reference_pair]),estimated=result.states.map(s=>s.reference_delay),present=truth.visibility.map(v=>v.some(Boolean)),association=associateDelays(actual,estimated,present);
    const sse=squaredError(y,result.prediction),cleanError=squaredError(truth.clean,result.prediction),cleanEnergy=energy(truth.clean),observedEnergy=energy(y);
    const threshold=-Math.log(.01)*truth.noise_variance/y.cols;
    const output={evaluation_only:true,mode:result.mode,sse,observed_energy:observedEnergy,clean_error_energy:cleanError,clean_energy:cleanEnergy,
      relative_residual_db:observedEnergy>0?10*Math.log10(Math.max(sse,1e-300)/observedEnergy):null,
      relative_residual_null_reason:observedEnergy>0?null:'Zero observed energy',clean_nmse_db:cleanEnergy>0?10*Math.log10(Math.max(cleanError,1e-300)/cleanEnergy):null,
      clean_nmse_null_reason:cleanEnergy>0?null:'Zero clean-channel energy',converged:result.converged??null,stopping_reason:result.stopping_reason??null,
      sweeps:Array.isArray(result.trace)&&result.trace.length?result.trace[result.trace.length-1].sweep:null,
      true_reference_delays_ns:actual.map(d=>d*1e9),...association,conditional_gain_design:conditionalDesign(result.states,model.frequencies),
      visibility_heuristic:{enabled:heuristic,scope:'Simulator-known variance; matched-filter gain-power display heuristic, not a paper detector, optimizer input, or calibrated global false-alarm rate',false_alarm_heuristic:.01,power_threshold:heuristic?threshold:null,effective_power_threshold:heuristic?Math.max(threshold,1e-12):null},paths:[]};
    for(let target=0;target<2;target++) {
      const mask=truth.visibility[target],count=mask.filter(Boolean).length,index=association.association[target];
      const entry={truth_kind:truth.kinds[target],target_present:present[target],estimated_index:index,estimated_kind:null,matched:index!==null,
        reference_delay_error_ns:null,estimated_point:null,estimated_normal:null,visible_fraction_truth:count/y.rows,
        visible_fraction_estimate:null,visibility_accuracy:null,gain_power:null,visibility_threshold_power:heuristic?threshold:null,
        interaction_rmse_m:null,point_error_m:null,normal_error_deg:null,plane_distance_error_m:null,geometry_null_reason:null};
      if(index===null)entry.geometry_null_reason=present[target]?'No delay-associated estimate':'Truth path absent';
      else {
        const s=result.states[index];entry.estimated_kind=s.kind;entry.reference_delay_error_ns=(s.reference_delay-actual[target])*1e9;
        entry.estimated_point=s.point==null?null:Array.from(s.point);entry.estimated_normal=s.normal==null?null:Array.from(s.normal);
        entry.gain_power=Array.from(s.gains.real,(r,q)=>r*r+s.gains.imag[q]*s.gains.imag[q]);
        if(heuristic){const visible=entry.gain_power.map(power=>power>Math.max(threshold,1e-12));entry.visible_fraction_estimate=visible.filter(Boolean).length/y.rows;entry.visibility_accuracy=visible.filter((v,q)=>v===mask[q]).length/y.rows;}
        if(s.bounce_points!=null&&count>0){let sum=0;for(let q=0;q<y.rows;q++)if(mask[q])sum+=(s.bounce_points[q][0]-truth.bounce_points[target][q][0])**2+(s.bounce_points[q][1]-truth.bounce_points[target][q][1])**2;entry.interaction_rmse_m=Math.sqrt(sum/count);}
        if(target===0&&s.point!=null)entry.point_error_m=Math.hypot(s.point[0]-truth.point[0],s.point[1]-truth.point[1]);
        if(target===1&&s.normal!=null&&s.point!=null) {
          const dot=s.normal[0]*truth.surface_normal[0]+s.normal[1]*truth.surface_normal[1];entry.normal_error_deg=Math.acos(Math.max(-1,Math.min(1,Math.abs(dot))))*180/Math.PI;
          // Normal orientation has no effect on absolute distance. Unlike sign(0)
          // multiplication, this remains meaningful for perpendicular normals.
          entry.plane_distance_error_m=Math.abs(s.normal[0]*(s.point[0]-truth.surface_point[0])+s.normal[1]*(s.point[1]-truth.surface_point[1]));
        }
        if(s.bounce_points==null)entry.geometry_null_reason='Associated path has no localized interaction geometry';
        else if(target===1&&s.normal==null)entry.geometry_null_reason='Associated family has no reflecting line; normal and line-offset errors are undefined';
      }
      output.paths.push(entry);
    }
    output.mechanisms_correct=result.mode==='hybrid'?!association.unmatched_estimate_indices.length&&output.paths.every(p=>!p.target_present||(p.matched&&p.truth_kind===p.estimated_kind)):null;
    output.mechanism_score_applicable=result.mode==='hybrid';output.mechanism_score_reason=result.mode==='hybrid'?'Labels checked only after delay-based partial association':'Scattering-only comparator cannot output a reflection label';
    return finiteOutput(output);
  }
  function matchedDelay(observations,model,options={}) {
    keys(options,['points','minDelayNs','maxDelayNs','floorDb'],'display options');const y=checkMatrix(observations,'observations');validateDeclaredModel(y,model);
    const o={points:256,minDelayNs:0,maxDelayNs:model.max_delay_ns,floorDb:-60,...options};
    assert(Number.isInteger(o.points)&&o.points>=2&&o.points<=2048,'Display points must be 2…2048');
    assert(finite(o.minDelayNs)&&finite(o.maxDelayNs)&&o.minDelayNs>=0&&o.maxDelayNs>o.minDelayNs&&o.maxDelayNs<=model.max_delay_ns,'Display delay grid outside declared prior');
    assert(finite(o.floorDb)&&o.floorDb<=0&&o.floorDb>=-300,'Display floor must be −300…0 dB');
    const delays=linspace(o.minDelayNs,o.maxDelayNs,o.points),values=new Float64Array(y.rows*o.points),db=new Float64Array(values.length);let peak=0;
    for(let q=0;q<y.rows;q++)for(let d=0;d<o.points;d++) {
      let re=0,im=0;for(let p=0;p<y.cols;p++){const a=TAU*(delays[d]*1e-9)*model.frequencies[p],co=Math.cos(a),si=Math.sin(a),i=q*y.cols+p;re+=y.real[i]*co-y.imag[i]*si;im+=y.real[i]*si+y.imag[i]*co;}
      const power=(re*re+im*im)/(y.cols*y.cols);assert(finite(power),'Matched-delay power overflowed');values[q*o.points+d]=power;peak=Math.max(peak,power);
    }
    for(let i=0;i<values.length;i++)db[i]=peak>0&&values[i]>0?Math.max(o.floorDb,10*Math.log10(values[i]/peak)):o.floorDb;
    const offset=model.reference_pair*o.points;
    return {delays_ns:delays,power:{rows:y.rows,cols:o.points,values},relative_power_db:{rows:y.rows,cols:o.points,values:db},reference_power:values.slice(offset,offset+o.points),reference_relative_power_db:db.slice(offset,offset+o.points),
      reference_pair:model.reference_pair,peak_power:peak,floor_db:o.floorDb,scope:'Observed-data normalized matched-delay response |sum_p Y[q,p] exp(+i2πν[p]τ)/P|²; not a detected target list or spatial image',db_reference:'One global matched-power maximum in this observation run; zero-power run shown at visual floor'};
  }
  return Object.freeze({VERSION,GEOMETRY_VERSION,GENERATOR_VERSION,C,DEFAULT_CONFIG,OFFERED,configWithDefaults,generate,evaluate,associateDelays,matchedDelay});
}));
