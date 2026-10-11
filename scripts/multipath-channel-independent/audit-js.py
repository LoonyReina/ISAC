#!/usr/bin/env python3
"""Portable independent audit of the actual JavaScript two-path core.

Python 3 + Node.js, standard libraries only. No network or browser required.
Usage:
 python audit-js.py --core ./multipath-channel-core.js \
   --reference ./scripts/multipath-channel-reference/reference.py \
   --fixtures ./scripts/multipath-channel-reference/fixtures.json \
   --output ./audit-js-results.json

The Python reference must be the independently validated frozen baseline;
additional expected values are computed with direct cmath exponentials here.
No absolute input paths are included in the resulting report.
"""
import argparse, cmath, hashlib, importlib.util, json, math, pathlib, subprocess, sys, time

REFERENCE_SHA='b6f457769d20ee437f7ed0e8011e12b5948e2077df889024d3964649720bbc50'
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--core',required=True,type=pathlib.Path)
p.add_argument('--reference',required=True,type=pathlib.Path)
p.add_argument('--fixtures',required=True,type=pathlib.Path)
p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('audit-js-results.json'))
a=p.parse_args(); start=time.time(); sys.dont_write_bytecode=True
reference_sha=hashlib.sha256(a.reference.read_bytes()).hexdigest()
if reference_sha!=REFERENCE_SHA:raise SystemExit('Reference identity differs from the validated frozen baseline')
spec=importlib.util.spec_from_file_location('audited_reference',a.reference)
r=importlib.util.module_from_spec(spec);sys.modules[spec.name]=r;spec.loader.exec_module(r)
fixtures=json.loads(a.fixtures.read_text())
configs=[dict(h=s['scene']['h'],b=s['scene']['b'],rho=s['scene']['rho'],psi=s['scene']['psi'],commonPhase=s['scene']['common_phase']) for s in fixtures['scenes']]
configs += [dict(h=h,b=b,rho=rho,psi=psi,commonPhase=common) for h,b,rho,psi,common in [
 (.10001,1,1,math.pi,.37),(6,1,1,-math.pi,2*math.pi),(2.71828,.63,.93,-1.89,1.11),(1,1,.7,0,0),(1,1,.7,0,1.23)]]
qvals=[0.,1.,-2.,.5,.1,.001,1e-8,1e-12,1e-20,1e-30,math.nextafter(1,0),math.nextafter(1,2),99.000001,-98.999999,1e-155,1e-160,1e-200,5e-324]
probes=[0.,r.FIRST_NULL_LENGTH,-r.FIRST_NULL_LENGTH,7.3,-4.2,r.ALIAS_LENGTH,r.ALIAS_LENGTH+r.FIRST_NULL_LENGTH,99*r.ALIAS_LENGTH+.327,-99*r.ALIAS_LENGTH+.327,math.nextafter(r.ALIAS_LENGTH,0),1e-10]
node_source=r'''
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const input=JSON.parse(fs.readFileSync(0,'utf8')),source=fs.readFileSync(input.core,'utf8'),C=require(input.core),checks=[];
function check(name,passed,details={}){checks.push({name,passed:!!passed,...details});}
function rejects(name,fn){let yes=false;try{fn();}catch(e){yes=e instanceof Error;}check(name,yes);}
const physical=input.configs.map(s=>C.simulate(s));
const baseline=physical[0].receiverInput;
for(const key of ['Y','X','f','candidates']){const n=baseline[key].length;
 for(const variant of ['all','first','last','interior']){
  let v=variant==='all'?Array(n):baseline[key].slice();if(variant!=='all')delete v[variant==='first'?0:variant==='last'?n-1:Math.floor(n/2)];
  rejects(`receiver_sparse_${key}_${variant}`,()=>C.receive({...baseline,[key]:v}));
 }
}
for(const [name,fn]of[
 ['sparse_lengths',()=>C.synthesizeTaps(Array(1),[[1,0]])],['sparse_coefficients',()=>C.synthesizeTaps([1],Array(1))],
 ['sparse_powers',()=>C.singleMaximum([1,2],Array(2))],['sparse_first_power',()=>C.singleMaximum([1,2],[,1])],
 ['sparse_wall',()=>C.geometry(4,Array(2))],['sparse_analytic_candidates',()=>C.analyticResponse(Array(2),[1],[[1,0]])],
 ['sparse_analytic_lengths',()=>C.analyticResponse([1],Array(1),[[1,0]])],['sparse_interval_X',()=>C.intervalEnergy(0,1,Array(128))],
 ['bad_scene_unknown_key',()=>C.normalize({height:4})],['bad_scene_unknown_resource',()=>C.normalize({N:64})],['bad_scene_nan',()=>C.normalize({h:NaN})],['bad_scene_infinity',()=>C.normalize({psi:Infinity})],['bad_scene_boolean',()=>C.normalize({b:true})],
 ['bad_scene_string',()=>C.normalize({h:'4'})],['bad_scene_high_h',()=>C.normalize({h:6.1})],['bad_scene_low_h',()=>C.normalize({h:0})],
 ['bad_scene_gain',()=>C.normalize({rho:1.001})],['bad_scene_phase',()=>C.normalize({psi:2*Math.PI+.001})],
 ['bad_freq_grid',()=>C.receive({...baseline,f:baseline.f.map(x=>x+1)})],
 ['bad_pilot',()=>C.receive({...baseline,X:baseline.X.map(z=>[z[0]*2,z[1]*2])})],
 ['truth_enriched_grid',()=>C.receive({...baseline,candidates:[...baseline.candidates,physical[0].generatorOnly.geometry.directLength].sort((a,b)=>a-b)})],
 ['candidate_limit',()=>C.matchedSum({...baseline,candidates:Array(10001).fill(0)})],
 ['candidate_range',()=>C.matchedSum({...baseline,candidates:[C.ALIAS_LENGTH*101]})],
 ['path_count_limit',()=>C.synthesizeTaps(Array(10001).fill(1),Array(10001).fill([1,0]))],
 ['q_range',()=>C.gramFromSeparationCycles(101)],['q_infinite',()=>C.gramFromSeparationCycles(Infinity)],
 ['time_range',()=>C.normalizedWaveform(101)],['interval_infinite',()=>C.intervalEnergy(0,Infinity)]
])rejects(name,fn);
// Array prototype entries do not substitute for missing own samples.
const inheritedGrid=baseline.candidates.slice();delete inheritedGrid[3];const proto=Object.create(Array.prototype);proto[3]=baseline.candidates[3];Object.setPrototypeOf(inheritedGrid,proto);
rejects('receiver_inherited_sample_rejected',()=>C.receive({...baseline,candidates:inheritedGrid}));
function inheritedPair(pair,missing){const out=pair.slice(),value=out[missing];delete out[missing];const p=Object.create(Array.prototype);p[missing]=value;Object.setPrototypeOf(out,p);return out;}
for(const key of ['X','Y'])for(const missing of [0,1]){const array=baseline[key].map(v=>v.slice());array[0]=inheritedPair(array[0],missing);rejects(`nested_inherited_${key}_${missing}`,()=>C.receive({...baseline,[key]:array}));}
for(const missing of [0,1])rejects(`nested_inherited_coefficient_${missing}`,()=>C.synthesizeTaps([1],[inheritedPair([1,.2],missing)]));
function explicitRange(name,fn){try{const o=fn(),status=o&&(o.status||o.numericStatus||o.receiver&&o.receiver.status);check(name,typeof status==='string'&&/range|underflow/.test(status),{outcome:'returned',status:status||null});}catch(e){check(name,e instanceof RangeError&&/range|underflow|numerical/i.test(e.message),{outcome:'rejected',error:e.name,message:e.message});}}
explicitRange('tiny_positive_scene_power_underflow',()=>C.simulate({h:4,b:1e-170,rho:0}));
explicitRange('tiny_positive_coefficient_underflow',()=>C.generateScene({h:4,b:Number.MIN_VALUE,rho:0}));
explicitRange('tiny_positive_reflection_underflow',()=>C.generateScene({h:4,b:0,rho:Number.MIN_VALUE}));
explicitRange('external_nonzero_Y_power_underflow',()=>C.receive({...baseline,Y:Array.from({length:128},()=>[1e-200,0])}));
const zeroScene=C.simulate({b:0,rho:0});
check('exact_zero_scene_genuine_no_response',zeroScene.receiver.status==='no_response'&&zeroScene.receiver.estimate===null&&zeroScene.receiverInput.Y.every(v=>v[0]===0&&v[1]===0));
function finiteOrReject(name,fn){try{const out=fn();let okay=true;function scan(v){if(typeof v==='number'&&!Number.isFinite(v))okay=false;else if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object')Object.values(v).forEach(scan);}scan(out);check(name,okay,{outcome:'returned'});}catch(e){check(name,true,{outcome:'rejected'});}}
finiteOrReject('generic_tiny_X_large_Y',()=>C.matchedSum({X:Array.from({length:128},()=>[1e-160,0]),Y:Array.from({length:128},()=>[1e100,0]),f:C.FREQUENCIES,candidates:[0]}));
finiteOrReject('generic_tiny_path_length',()=>C.gains({}, {directLength:Number.MIN_VALUE,reflectedLength:1,directDelay:0,reflectedDelay:0}));
check('exact_tie_rule',JSON.stringify(C.singleMaximum([1,2,3],[2,2,1]))===JSON.stringify({index:0,apparentDistanceM:1,power:2,exactTieCount:2}));
check('exact_zero_rule',C.singleMaximum([1,2],[0,0])===null);
check('receiver_keys',Object.keys(baseline).sort().join(',')==='X,Y,candidates,f');
// Instrument source in memory only: a receiver must never call truth helpers.
let instrumented=source;
for(const sig of ['function geometry(h=4,wall=WALL){','function gains(input,g){','function generateScene(input={}){','function synthesizeTaps(lengths,coefficients,X=pilots()){','function dirichlet(lengthOffset){','function analyticResponse(candidates,lengths,coefficients){','function sceneDiagnostics(scene,g,coefficients,Y){']){
 if(!instrumented.includes(sig))throw Error('Instrumentation signature changed: '+sig);
 instrumented=instrumented.replace(sig,sig+"throw new Error('Truth helper entered by receiver');");
}
const context={module:{exports:{}},Math,Number,Object,Array,RangeError,Error};vm.createContext(context);vm.runInContext(instrumented,context);
let independentReceiver;try{independentReceiver=context.module.exports.receive(JSON.parse(JSON.stringify(baseline)));check('instrumented_truth_isolation',JSON.stringify(independentReceiver)===JSON.stringify(physical[0].receiver));}catch(e){check('instrumented_truth_isolation',false,{message:e.message});}
const algebra=[{lengths:[3,3],coeff:[[.2,-.1],[-.13,.21]]},{lengths:[3,3],coeff:[[.2,-.1],[-.2,.1]]},{lengths:[3,3+C.ALIAS_LENGTH],coeff:[[.2,-.1],[-.13,.21]]}].map(o=>({...o,...C.synthesizeTaps(o.lengths,o.coeff)}));
const out={coreSha256:crypto.createHash('sha256').update(source).digest('hex'),checks,physical,geometry:Array.from({length:101},(_,i)=>C.geometry(.1+i*5.9/100)),kernels:input.probes.map(u=>({u,value:C.dirichlet(u)})),gram:input.qvals.map(q=>({q,...C.gramFromSeparationCycles(q)})),samples:C.usefulSamples(),ledger:C.resourceLedger(),algebra};
process.stdout.write(JSON.stringify(out));
'''
run=subprocess.run(['node','-e',node_source],input=json.dumps(dict(core=str(a.core.resolve()),configs=configs,qvals=qvals,probes=probes)),text=True,capture_output=True)
if run.returncode:raise SystemExit('Node audit runner failed: '+run.stderr)
jo=json.loads(run.stdout);checks=jo['checks'];metrics={}
def check(name,okay,**details):checks.append(dict(name=name,passed=bool(okay),**details))
def z(v):return complex(v[0],v[1])
def maxerr(xs,ys):return max((abs(x-y) for x,y in zip(xs,ys)),default=0.)
def relerr(x,y):return abs(x/y-1) if y else abs(x-y)
# Independent pilot, geometry, carrier-frequency and direct matched sums.
C=299792458.;N=128;DF=2e6;FC=6e9;F=tuple(k*DF for k in range(-64,64));grid=tuple(i/100 for i in range(1401))
seed=0x5EED1234;X=[]
for _ in range(N):seed=(1664525*seed+1013904223)&0xffffffff;X.append((1,1j,-1,-1j)[seed>>30]/math.sqrt(N))
max_y=max_z=max_power=max_ref_z=max_geometry=max_carrier=0.;all_peaks=True;scene_rows=[]
for idx,(cfg,j) in enumerate(zip(configs,jo['physical'])):
 sc=r.Scene(h=cfg['h'],b=cfg['b'],rho=cfg['rho'],psi=cfg['psi'],common_phase=cfg['commonPhase'])
 inp,truth=r.generate_scene(sc);rr=r.receive(**inp)
 h=cfg['h'];L=[math.sqrt(36+(h-2)**2),math.sqrt(36+(h+2)**2)]
 coeff=[cfg['b']/L[0],cfg['rho']*cmath.exp(1j*cfg['psi'])/L[1]]
 oracleY=[x*cmath.exp(1j*cfg['commonPhase'])*sum(g*cmath.exp(-2j*math.pi*(FC+f)*ell/C) for g,ell in zip(coeff,L)) for x,f in zip(X,F)]
 jy=list(map(z,j['receiverInput']['Y']));jz=list(map(z,j['receiver']['z']));jpower=j['receiver']['power']
 max_y=max(max_y,maxerr(jy,inp['Y']));max_carrier=max(max_carrier,maxerr(jy,oracleY))
 max_ref_z=max(max_ref_z,maxerr(jz,rr['z']));max_power=max(max_power,maxerr(jpower,rr['power']))
 # Independent direct receiver uses observed JS Y, not any generator values.
 products=[x.conjugate()*y for x,y in zip(X,jy)];energy=math.fsum(abs(x)**2 for x in X)
 expected=[sum(p*cmath.exp(2j*math.pi*f*d/C) for p,f in zip(products,F))/energy for d in grid]
 max_z=max(max_z,maxerr(jz,expected))
 expect=rr['estimate'];actual=j['receiver']['estimate']
 all_peaks &= ((expect is None and actual is None and j['receiver']['status']=='no_response') or
               (expect is not None and actual is not None and expect['index']==actual['index'] and expect['exact_tie_count']==actual['exactTieCount'] and j['receiver']['status']=='single_grid_maximum'))
 check('physical_receiver_grid_'+str(idx),tuple(j['receiverInput']['candidates'])==grid and tuple(j['receiverInput']['f'])==F and maxerr(map(z,j['receiverInput']['X']),X)<1e-16)
 check('physical_energy_and_scale_'+str(idx),max(jpower)<=.12 and abs(math.fsum(abs(v)**2 for v in jy)-j['generatorOnly']['diagnostics']['analyticReceivedUsefulEnergy'])<2e-13)
 scene_rows.append(dict(index=idx,config=cfg,status=j['receiver']['status'],peak=actual))
check('all_full_JS_Y_against_frozen_reference',max_y<1e-12,max_absolute_error=max_y)
check('independent_RF_carrier_once',max_carrier<2e-13,max_absolute_error=max_carrier)
check('all_full_JS_z_against_frozen_reference',max_ref_z<1e-12,max_absolute_error=max_ref_z)
check('all_full_JS_z_against_independent_receiver',max_z<1e-12,max_absolute_error=max_z)
check('all_full_JS_powers_against_reference',max_power<1e-13,max_absolute_error=max_power)
check('all_fixed_grid_peaks_and_flags',all_peaks)
for gj in jo['geometry']:
 h=gj['terminal'][1];qx=12/(h+2);L0=math.sqrt(36+(h-2)**2);broken=math.hypot(qx,2)+math.hypot(6-qx,h)
 max_geometry=max(max_geometry,abs(gj['reflection'][0]-qx),abs(gj['directLength']-L0),abs(gj['reflectedLength']-broken),abs(gj['incidenceAngle']-gj['reflectionAngle']))
check('101_geometries_and_angles',max_geometry<1e-13,max_error=max_geometry)
# Explicit causal fractional-delay waveform and DFT, independent of JS synthesis.
time_error=0.;time_support=True
for cfg,j in [list(zip(configs,jo['physical']))[i] for i in [0,1,len(configs)-4]]:
 h=cfg['h'];Ls=[math.sqrt(36+(h-2)**2),math.sqrt(36+(h+2)**2)]
 amps=[cmath.exp(1j*cfg['commonPhase'])*cfg['b']/Ls[0]*cmath.exp(-2j*math.pi*FC*Ls[0]/C),
       cmath.exp(1j*(cfg['commonPhase']+cfg['psi']))*cfg['rho']/Ls[1]*cmath.exp(-2j*math.pi*FC*Ls[1]/C)]
 tt=[]
 for n in range(N):
  vals=[]
  for L,amp in zip(Ls,amps):
   q=n/N-L/C*DF;time_support &= -.25<=q<1
   vals.append(amp*sum(x*cmath.exp(2j*math.pi*k*q) for k,x in zip(range(-64,64),X))/math.sqrt(N))
  tt.append(sum(vals))
 recovered=[sum(v*cmath.exp(-2j*math.pi*k*n/N) for n,v in enumerate(tt))/math.sqrt(N) for k in range(-64,64)]
 time_error=max(time_error,maxerr(recovered,map(z,j['receiverInput']['Y'])))
check('JS_Y_from_explicit_fractional_delay_CP_and_DFT',time_support and time_error<3e-14,max_error=time_error)
base=jo['physical'][-2]['receiver'];rot=jo['physical'][-1]['receiver']
check('JS_common_phase_rotation_invariance',maxerr(map(z,rot['z']),(z(v)*cmath.exp(1.23j) for v in base['z']))<1e-13 and maxerr(rot['power'],base['power'])<1e-13)

# Kernel independent explicit sum plus fixed Python baseline near alias ranges.
kerr=max(abs(z(row['value'])-sum(cmath.exp(2j*math.pi*f*row['u']/C) for f in F)/N) for row in jo['kernels'])
kref=max(abs(z(row['value'])-r.dirichlet(row['u'])) for row in jo['kernels'])
check('JS_complex_kernel_direct_sum',kerr<7e-12 and kref<1e-13,max_direct_error=kerr,max_reference_error=kref)
# Gram stable metrics, plus ordinary off diagonal computed from columns.
logerr=lerr=offerr=0.;statuses=True
for gj in jo['gram']:
 gr=r.gram_from_separation_cycles(gj['q']);statuses &= gj['exactlySingular']==gr['exactly_singular'] and gj['numericStatus']==gr['numeric_status'] and ((gj['condition'] is None)==(gr['condition'] is None))
 if gr['log_condition'] is not None:logerr=max(logerr,abs(gj['logCondition']-gr['log_condition']))
 if gr['lambda_min']>1e-307:lerr=max(lerr,relerr(gj['lambdaMin'],gr['lambda_min']))
 offerr=max(offerr,abs(z(gj['offDiagonal'])-gr['off_diagonal']))
check('JS_Gram_exact_near_alias_and_range_status',statuses and logerr<2e-12 and lerr<2e-12 and offerr<1e-13,max_log_error=logerr,max_lambda_relative_error=lerr,max_offdiagonal_error=offerr)
# CP independent IDFT and exact termwise interval integral (no SUT kernel).
qs=[sum(x*cmath.exp(2j*math.pi*k*n/N) for k,x in zip(range(-64,64),X))/math.sqrt(N) for n in range(N)]
cpd=math.fsum(abs(v)**2 for v in qs[-32:])
def integrate_mode(m):return .25 if m==0 else (1-cmath.exp(-.5j*math.pi*m))/(2j*math.pi*m)
cpc=sum(x*y.conjugate()*integrate_mode(k-l) for k,x in zip(range(-64,64),X) for l,y in zip(range(-64,64),X)).real
ledger=jo['ledger'];check('JS_IDFT_and_actual_CP_energies',maxerr(map(z,jo['samples']),qs)<1e-13 and abs(ledger['continuousCpEnergy']-cpc)<2e-13 and abs(ledger['discreteCpSampleEnergy']-cpd)<2e-13,continuous_cp=cpc,discrete_cp=cpd)
check('JS_resource_invariants',ledger['totalBurstDurationS']==r.TU+r.CP and ledger['maximumAbsoluteDelayS']<ledger['cpDurationS'] and ledger['candidateCount']==1401 and ledger['noiseVariance']==0 and ledger['fixedPlotPowerMax']==.12 and ledger['meanOffsetHz']==-1e6 and ledger['endpointSpanHz']==254e6 and ledger['dftBandwidthHz']==256e6)
# Relative phase changes received energy under exactly the same pilot resource.
constructive=jo['physical'][7];destructive=jo['physical'][8]
ep=constructive['generatorOnly']['diagnostics']['receivedUsefulEnergy'];em=destructive['generatorOnly']['diagnostics']['receivedUsefulEnergy']
check('JS_relative_phase_interference_same_resources',ep>100*em and constructive['resources']==destructive['resources'] and constructive['receiverInput']['X']==destructive['receiverInput']['X'],constructive_energy=ep,destructive_energy=em)
# Entire ledger consistency with explicit camelCase/snake_case mapping.
ledger_ref=r.resource_ledger();mapping={'deltaFHz':'delta_f_hz','referenceCarrierHz':'reference_carrier_hz','minimumOffsetHz':'minimum_offset_hz','maximumOffsetHz':'maximum_offset_hz','meanOffsetHz':'mean_offset_hz','endpointSpanHz':'endpoint_span_hz','dftBandwidthHz':'dft_bandwidth_hz','sampleRateHz':'sample_rate_hz','sampleIntervalS':'sample_interval_s','usefulDurationS':'useful_duration_s','cpDurationS':'cp_duration_s','totalBurstDurationS':'total_burst_duration_s','cpSamples':'cp_samples','usefulEnergy':'useful_energy','continuousCpEnergy':'continuous_cp_energy','continuousTotalBurstEnergy':'continuous_total_burst_energy','discreteUsefulSampleEnergy':'discrete_useful_sample_energy','discreteCpSampleEnergy':'discrete_cp_sample_energy','discreteTotalSampleEnergy':'discrete_total_sample_energy','receiverWindowStartS':'receiver_window_start_s','receiverWindowStopS':'receiver_window_stop_s','candidateMinM':'candidate_min_m','candidateMaxM':'candidate_max_m','candidateStepM':'candidate_step_m','candidateCount':'candidate_count','noiseVariance':'noise_variance','receiverElements':'receiver_elements','oneWayFirstNullM':'one_way_first_null_m','delayPeriodS':'delay_period_s','pathLengthPeriodM':'path_length_period_m','maximumPathLengthM':'maximum_path_length_m','maximumAbsoluteDelayS':'maximum_absolute_delay_s','fixedPlotPowerMax':'fixed_plot_power_max','scenePowerBound':'scene_power_bound','pilotSeedUint32':'pilot_seed_uint32'}
check('JS_full_numeric_ledger_matches_reference',all(abs(ledger[k]-ledger_ref[v])<=max(1e-14,abs(ledger_ref[v])*1e-13) for k,v in mapping.items()))
for i,row in enumerate(jo['algebra']):
 yy,_=r.synthesize_taps(row['lengths'],list(map(z,row['coeff'])))
 check('JS_algebra_'+str(i),maxerr(map(z,row['Y']),yy)<1e-13 and (i!=1 or all(v==[0,0] for v in row['Y'])))
check('source_frozen_during_audit',hashlib.sha256(a.core.read_bytes()).hexdigest()==jo['coreSha256'])
failed=[c['name'] for c in checks if not c['passed']]
report=dict(status='FAIL' if failed else 'PASS',core_file=a.core.name,core_sha256=jo['coreSha256'],reference_file=a.reference.name,reference_sha256=reference_sha,fixtures_sha256=hashlib.sha256(a.fixtures.read_bytes()).hexdigest(),check_count=len(checks),failed_checks=failed,checks=checks,scene_count=len(configs),scene_results=scene_rows,elapsed_s=time.time()-start,scope='Actual JavaScript scientific core and helper guards; no browser, UI interaction, repository regression suite, publication, or hardware validation')
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
print(json.dumps({k:report[k] for k in ['status','core_sha256','check_count','failed_checks','scene_count','elapsed_s']},indent=2))
sys.exit(bool(failed))
