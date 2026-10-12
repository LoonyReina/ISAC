import os
os.environ['OPENBLAS_NUM_THREADS']='1'
import sys
sys.dont_write_bytecode=True
import json,subprocess,hashlib,math
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment
ROOT=Path(__file__).resolve().parent
SITE=ROOT.parents[3]
def runtime(name):
    return SITE/name if (SITE/name).exists() else SITE/'labs/near-field'/name

rng=np.random.default_rng(142857)
assignment=[]
for i in range(5000):
    if i<2500:
        a=rng.integers(-20,21,2)*.25e-9;e=rng.integers(-20,21,2)*.25e-9
    else:
        a=rng.uniform(5,50,2)*1e-9;e=a+rng.normal(0,.7e-9,2)
    present=rng.integers(0,2,2).astype(bool);assignment.append({'actual':a.tolist(),'estimated':e.tolist(),'present':present.tolist()})
configs=[{'aperture':a,'bandwidthHz':b,'snrDb':s,'seed':seed,'scene':scene} for a,b,s,seed,scene in [
 (1.49146747855,1e9,15,73,'normal'),(1.49146747855,1e9,15,73,'reference-blind'),
 (.05,20e6,5,9923,'normal'),(.35,100e6,20,123456789,'normal'),
 (.75,250e6,10,31415926,'normal'),(.75,500e6,20,27182818,'reference-blind')]]
script=r'''
const fs=require('fs'),O=require(process.argv[1]),G=require(process.argv[2]),p=JSON.parse(fs.readFileSync(0,'utf8'));
const cases=p.configs.map((c,i)=>{const s=O.generate(c),out={sample:s};if(i<4){const options={angle_grid:128,max_sweeps:6},init=G.initialize(s.observations,s.model,options);out.fits={};for(const mode of ['scattering','hybrid']){const r=G.fit(s.observations,s.model,mode,options,init);out.fits[mode]={result:r,metrics:O.evaluate(r,s.observations,s.model,s.truth,{visibilityHeuristic:true})};}}return out;});
let n=0,sum=0,sq=0,fourth=0,cross=0;
for(let seed=201;seed<225;seed++){const s=O.generate({seed}),d=Math.sqrt(s.truth.noise_variance/2),r=s.truth.noise.real,im=s.truth.noise.imag;for(let i=0;i<r.length;i++){const a=r[i]/d,b=im[i]/d;sum+=a+b;sq+=a*a+b*b;fourth+=a**4+b**4;cross+=a*b;n+=2;}}
process.stdout.write(JSON.stringify({associations:p.assignments.map(a=>O.associateDelays(a.actual,a.estimated,a.present).association),cases,normal_stats:{n,mean:sum/n,variance:sq/n-(sum/n)**2,fourth_moment:fourth/n,cross:cross/(n/2)}},(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
'''
raw=subprocess.run(['node','-e',script,str(runtime('nearfield-gc-sage-observations.js')),str(runtime('nearfield-gc-sage-core.js'))],input=json.dumps({'assignments':assignment,'configs':configs}),text=True,capture_output=True,check=True)
r=json.loads(raw.stdout)
for a,match in zip(assignment,r['associations']):
    present=np.flatnonzero(a['present']);k=len(present);cost=np.zeros((k+2,k+2));cost[:k,:2]=abs(np.array(a['actual'])[present,None]-np.array(a['estimated'])[None,:])*1e9;cost[:k,2:]=.25;cost[k:,:2]=.25
    rows,cols=linear_sum_assignment(cost);expected=[None,None]
    for row,col in zip(rows,cols):
        if row<k and col<2 and cost[row,col]<=.5:expected[present[row]]=int(col)
    assert match==expected,(a,match,expected)
def unpack(z):return (np.array(z['real'])+1j*np.array(z['imag'])).reshape(z['rows'],z['cols'])
errs={'clean':0.,'noise_variance':0.,'observed_sse':0.,'clean_nmse_db':0.,'conditional_singular':0.}
for item in r['cases']:
    s=item['sample'];c=s['config'];t=s['truth'];m=s['model'];x=np.array(m['rx'])[:,0];f=np.array(m['frequencies']);d0=(1+np.sqrt((x-1)**2+1))/299792458;d1=np.sqrt((x-1)**2+16)/299792458
    support=(x<=3+2e-10)
    if c['scene']=='reference-blind':support &= np.arange(48)<9
    point=np.exp(-2j*np.pi*d0[:,None]*f);reflection=.8*np.exp(.7j-2j*np.pi*d1[:,None]*f);clean=point+support[:,None]*reflection
    sigma=float(np.mean(abs(point+reflection)**2)*10**(-c['snrDb']/10))
    errs['clean']=max(errs['clean'],float(np.max(abs(clean-unpack(t['clean'])))));errs['noise_variance']=max(errs['noise_variance'],abs(sigma-t['noise_variance']))
    assert np.array_equal(support,t['visibility'][1]);assert m['reference_pair']==23;assert m['max_delay_ns']==55
    np.testing.assert_array_equal(unpack(s['observations']),unpack(t['clean'])+unpack(t['noise']))
    assert np.max(abs(np.array(t['bounce_points'][1])-np.column_stack(((1+x)/2,np.full(48,2)))))==0
    for mode,fit in item.get('fits',{}).items():
        result=fit['result'];e=fit['metrics'];pred=unpack(result['prediction']);y=unpack(s['observations']);sse=float(np.sum(abs(y-pred)**2));nmse=10*np.log10(np.sum(abs(clean-pred)**2)/np.sum(abs(clean)**2))
        errs['observed_sse']=max(errs['observed_sse'],abs(sse-e['sse']));errs['clean_nmse_db']=max(errs['clean_nmse_db'],abs(nmse-e['clean_nmse_db']))
        delays=np.array([z['delays'] for z in result['states']]).T;A=np.exp(-2j*np.pi*delays[:,None,:]*f[None,:,None])/8;sing=np.linalg.svd(A,compute_uv=False);errs['conditional_singular']=max(errs['conditional_singular'],abs(np.min(sing[:,-1])-e['conditional_gain_design']['min_normalized_singular_value']))
        if mode=='scattering':assert e['mechanisms_correct'] is None
        else: assert e['mechanisms_correct']==(not e['unmatched_estimate_indices'] and all(not p['target_present'] or p['matched'] and p['truth_kind']==p['estimated_kind'] for p in e['paths']))
    if item.get('fits'):assert item['fits']['scattering']['result']['observation_sha256']==item['fits']['hybrid']['result']['observation_sha256']
np.testing.assert_array_equal(unpack(r['cases'][0]['sample']['truth']['noise']),unpack(r['cases'][1]['sample']['truth']['noise']))
assert errs['clean']<1e-12 and errs['noise_variance']<1e-12 and errs['observed_sse']<1e-8 and errs['clean_nmse_db']<1e-8 and errs['conditional_singular']<1e-10
st=r['normal_stats'];assert abs(st['mean'])<.02 and abs(st['variance']-1)<.04 and abs(st['cross'])<.03 and abs(st['fourth_moment']-3)<.15
out={'pass':True,'runtime_sha256':hashlib.sha256((runtime('nearfield-gc-sage-observations.js')).read_bytes()).hexdigest(),'assignment_cases':len(assignment),'fresh_configs':len(configs),'fresh_fits':8,'max_errors':errs,'noise_sanity':st,'scope':'Reviewer fresh read-only checks; no package or repository mutation; broad owner evidence separately inspected'}
(ROOT/'results/independent-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
