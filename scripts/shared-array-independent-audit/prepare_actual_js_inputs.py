#!/usr/bin/env python3
"""Prepare deterministic audit requests, without importing the production model."""
from pathlib import Path
import argparse, json, math, random
import numpy as np
OUT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--fixtures',type=Path,default=OUT.parent/'shared-array'/'fixtures.json');parser.add_argument('--output',type=Path,default=OUT/'actual-js-inputs.json');args=parser.parse_args()
fixture=json.loads(args.fixtures.read_text())
cases=[{'id':'fixture/'+name,'config':x['config'],'expected':'ok'} for name,x in fixture['cases'].items()]
def config(**kw):
 c=dict(n=8,nr=4,total_power=1.,radar_fraction=.5,noise_power=.05,channel_gain=1.,channel_phase=.37,user_u=0.,target_u=.25,qos_linear=20.)
 c.update(kw);return c
rng=random.Random(581004)
for i in range(160):
 n=rng.randint(3,16);nr=rng.randint(1,n-1)
 cases.append({'id':f'random/{i:03}','expected':'ok','config':config(n=n,nr=nr,user_u=rng.uniform(-1,1),target_u=rng.uniform(-1,1),total_power=rng.uniform(.1,3),radar_fraction=rng.random(),channel_gain=rng.uniform(0,5),channel_phase=rng.uniform(-math.pi,math.pi),noise_power=rng.uniform(.01,.5),qos_linear=rng.uniform(0,100))})
extra=[dict(n=2,nr=1,channel_gain=0),dict(nr=1,radar_fraction=0),dict(channel_gain=0,radar_fraction=1),dict(channel_gain=0,qos_linear=0),dict(radar_fraction=0,qos_linear=0),dict(user_u=1,target_u=-1),dict(qos_linear=math.nextafter(40,0),target_u=.5),dict(qos_linear=math.nextafter(40,math.inf),target_u=.5),dict(user_u=1,target_u=math.nextafter(-1,0)),dict(user_u=math.nextafter(-1,0),target_u=1),dict(user_u=math.nextafter(1,0),target_u=-1)]
for i,kw in enumerate(extra):cases.append({'id':f'boundary/{i:02}','expected':'ok','config':config(**kw)})
for uu in [0.,.37,-.83]:
 for d in [1e-6,1e-9,1e-12,1e-14,1e-16]:cases.append({'id':f'near/{uu}/{d}','expected':'ok','config':config(user_u=uu,target_u=uu+d)})
for d in [1e-150,1e-154,1e-155,1e-156,1e-160,1e-163,1e-200]:
 cases.append({'id':f'extreme/{d}','expected':'ok' if d>=1e-154 else 'numerical_error','config':config(target_u=d)})
for d in [1e-155,1e-200]:cases.append({'id':f'zero-radar-diagnostic-domain/{d}','expected':'numerical_error','config':config(target_u=d,radar_fraction=0)})
def encode(x):
 a=np.asarray(x);return np.stack((a.real,a.imag),axis=-1).tolist()
dirs=np.linspace(-1,1,33).tolist()+[-.875,-.37,.11,.42,.9375]
matrices=[]
rg=np.random.default_rng(771922)
for n in [2,4,8,13]:
 for rank in sorted(set([1,2,n])):
  z=rg.normal(size=(n,rank))+1j*rg.normal(size=(n,rank));r=z@z.conj().T;z/=np.sqrt(np.trace(r).real);r=z@z.conj().T
  matrices.append({'id':f'psd/n{n}/rank{rank}','kind':'psd','factors':encode(z.T),'covariance':encode(r),'n':n,'trace':1.,'directions':dirs})
 for uu,ut in [(.17,.61),(-.93,.78),(0.,.25)]:
  a=np.exp(1j*np.pi*np.arange(n)*uu);z=rg.normal(size=(n,n))+1j*rg.normal(size=(n,n));z=(np.eye(n)-np.outer(a,a.conj())/n)@z;r=z@z.conj().T;z*=np.sqrt(.5/np.trace(r).real);r=z@z.conj().T
  matrices.append({'id':f'null-psd/n{n}/{uu}/{ut}','kind':'radar_null_psd','factors':encode(z.T),'covariance':encode(r),'n':n,'trace':.5,'user_u':uu,'target_u':ut,'directions':dirs+[uu,ut]})
matrices.append({'id':'zero-psd','kind':'psd','n':8,'trace':0.,'factors':encode(np.zeros((1,8),complex)),'covariance':encode(np.zeros((8,8),complex)),'directions':dirs})
out={'schema':'shared-array-actual-js-audit-v1','seed':581004,'cases':cases,'directions':dirs,'matrix_cases':matrices,'source_conditional':{'N':20,'NR':14,'PR':.5,'PC':.5,'P0':1.,'radar_trace_literal':.35,'split_trace_upper_bound':.85,'shared_trace':1.,'claim_kind':'conditional printed-equation arithmetic, not observed simulation power'}}
args.output.write_text(json.dumps(out,indent=2,allow_nan=False)+'\n')
print(json.dumps({'cases':len(cases),'fixtures':len(fixture['cases']),'matrix_cases':len(matrices),'numeric_error_cases':sum(x['expected']=='numerical_error' for x in cases)}))
