#!/usr/bin/env python3
"""Finite strict-covariance Procrustes experiment, no runtime solver required.
Regenerate: python3 scripts/generate-waveform.py. Validate: add --check.
Dependencies: NumPy and SciPy (versions recorded in validation artifact).
"""
import json, pathlib, sys
import numpy as np
import scipy
from scipy.optimize import minimize
ROOT = pathlib.Path(__file__).resolve().parents[1]
SEED = 20182847648
rng = np.random.default_rng(SEED)

def pack(x):
    return np.stack([np.real(x), np.imag(x)], axis=-1).tolist()

def unpack(x):
    a = np.asarray(x); return a[...,0] + 1j*a[...,1]

def solve(H, S, R):
    n, l = R.shape[0], S.shape[1]
    if l < n: raise ValueError('Full-rank covariance requires L >= N')
    F = np.linalg.cholesky(R)
    C = F.conj().T @ H.conj().T @ S
    U, sv, Vh = np.linalg.svd(C, full_matrices=False)
    X = np.sqrt(l) * F @ U @ Vh
    bound = l*np.trace(H@R@H.conj().T).real + np.linalg.norm(S)**2 - 2*np.sqrt(l)*sum(sv)
    return X, F, C, sv, bound

def metrics(H,S,R,X):
    return dict(error=float(np.linalg.norm(H@X-S)**2), energy=float(np.linalg.norm(X)**2), covarianceResidual=float(np.linalg.norm(X@X.conj().T/S.shape[1]-R)))

n,k,l,pt=4,2,8,1
S = ((2*rng.integers(0,2,(k,l))-1)+1j*(2*rng.integers(0,2,(k,l))-1))/np.sqrt(2)
q = np.exp(2j*np.pi*np.outer(np.arange(n),np.arange(n))/n)/np.sqrt(n)
Hgeneric=(rng.normal(size=(k,n))+1j*rng.normal(size=(k,n)))
Hgeneric /= np.linalg.norm(Hgeneric,axis=1)[:,None]
channels={'orthogonal': q[:2], 'correlated':np.vstack([q[0],0.95*q[0]+np.sqrt(1-.95**2)*q[1]]), 'complex':Hgeneric}
Zref=np.exp(2j*np.pi*np.outer(np.arange(n),np.arange(l))/l)/np.sqrt(l)
states=[]
worst=dict(covariance=0., lowerBound=0., eigenNuclear=0., energy=0.)
for name,H in channels.items():
 for beta in [0,.4,.8]:
  for angle in [-30,0,30]:
   a=np.exp(1j*np.pi*np.arange(n)*np.sin(np.deg2rad(angle)))
   R=pt/n*((1-beta)*np.eye(n)+beta*np.outer(a,a.conj()))
   X,F,C,sv,bound=solve(H,S,R); ref=np.sqrt(l)*F@Zref
   assert np.min(np.linalg.eigvalsh(R))>0
   assert np.linalg.norm(R-R.conj().T)<1e-12
   for label,x in [('reference',ref),('optimal',X)]:
    m=metrics(H,S,R,x)
    worst['covariance']=max(worst['covariance'],m['covarianceResidual'])
    worst['energy']=max(worst['energy'],abs(m['energy']-l*pt))
   worst['lowerBound']=max(worst['lowerBound'],abs(metrics(H,S,R,X)['error']-bound))
   # Independent Hermitian eigensolver, not the SVD values used for optimization.
   nuclear=sum(np.sqrt(np.maximum(np.linalg.eigvalsh(C@C.conj().T),0)))
   worst['eigenNuclear']=max(worst['eigenNuclear'],abs(nuclear-sum(sv)))
   assert metrics(H,S,R,X)['error'] <= metrics(H,S,R,ref)['error']+1e-10
   for _ in range(20):
    Q,_=np.linalg.qr(rng.normal(size=(l,n))+1j*rng.normal(size=(l,n)))
    candidate=np.sqrt(l)*F@Q.conj().T
    assert np.linalg.norm(H@candidate-S)**2 >= bound-1e-10
   states.append(dict(id=f'{name}:{beta:g}:{angle}',channel=name,beta=beta,angle=angle,R=pack(R),reference=pack(ref),optimal=pack(X),singularValues=sv.tolist(),lowerBound=float(bound)))
# Degeneracy and dimensional boundary checks. Objectives, not singular vectors, are unique.
edge=[]
for label,Hx,Sx,Rx in [
 ('zero-channel',np.zeros((2,4)),S,np.eye(4)/4),
 ('rank-one-channel',np.vstack([q[0],q[0]]),S,np.eye(4)/4),
 ('square-block',Hgeneric,S[:,:4],np.eye(4)/4),
 ('zero-symbols',Hgeneric,np.zeros_like(S),np.eye(4)/4),
 ('near-degenerate',np.eye(2),np.diag([1+1e-12,1j]),np.eye(2)/2)]:
 X,F,C,sv,b=solve(Hx,Sx,Rx);m=metrics(Hx,Sx,Rx,X)
 assert m['covarianceResidual']<1e-10 and abs(m['error']-b)<1e-10
 edge.append(dict(name=label,metrics=m,boundResidual=float(abs(m['error']-b))))
for label,Hx,Sx,Rx in [('short-block',Hgeneric,S[:,:3],np.eye(4)/4),('singular-covariance',Hgeneric,S,np.diag([1,0,0,0]))]:
 try: solve(Hx,Sx,Rx)
 except (ValueError,np.linalg.LinAlgError): edge.append(dict(name=label,rejected=True))
 else: raise AssertionError(label)
# Independent constrained optimizer on three small complex problems, random feasible start.
small=[]
for trial in range(3):
 H=(rng.normal(size=(1,2))+1j*rng.normal(size=(1,2)))
 T=(rng.normal(size=(1,3))+1j*rng.normal(size=(1,3)))
 R=np.array([[.6,.1j],[-.1j,.4]])
 opt,F,_,_,b=solve(H,T,R)
 def decode(v): return v[:6].reshape(2,3)+1j*v[6:].reshape(2,3)
 def encode(x):return np.r_[x.real.ravel(),x.imag.ravel()]
 def cons(v):
  d=decode(v)@decode(v).conj().T/3-R
  return np.array([d[0,0].real,d[1,1].real,d[0,1].real,d[0,1].imag])
 Q,_=np.linalg.qr(rng.normal(size=(3,2))+1j*rng.normal(size=(3,2)))
 result=minimize(lambda v:np.linalg.norm(H@decode(v)-T)**2,encode(np.sqrt(3)*F@Q.conj().T),method='SLSQP',constraints={'type':'eq','fun':cons},options={'ftol':1e-12,'maxiter':2000})
 assert result.success and max(abs(cons(result.x)))<1e-8 and abs(result.fun-b)<1e-7
 small.append(dict(trial=trial,success=bool(result.success),objectiveGap=float(result.fun-b),constraintResidual=float(max(abs(cons(result.x))))))
artifact=dict(schemaVersion=1,seed=SEED,dimensions=dict(N=n,K=k,L=l,Pt=pt),complexEncoding='Each scalar is [real, imaginary]; H maps X directly, no extra conjugation.',channels={name:pack(H) for name,H in channels.items()},symbols=pack(S),states=states)
# Round trip verifies the exact serialized arrays rather than only in-memory outputs.
roundtrip=json.loads(json.dumps(artifact))
for st in roundtrip['states']:
 H=unpack(roundtrip['channels'][st['channel']]); Sx=unpack(roundtrip['symbols']); R=unpack(st['R']); X=unpack(st['optimal'])
 m=metrics(H,Sx,R,X)
 assert m['covarianceResidual']<1e-10 and abs(m['error']-st['lowerBound'])<1e-10
validation=dict(generator='scripts/generate-waveform.py',numpy=np.__version__,scipy=scipy.__version__,seed=SEED,states=len(states),randomFeasibleChecks=540,worstResiduals=worst,edgeCases=edge,independentSLSQP=small,tolerances=dict(covariance=1e-10,objective=1e-10,SLSQP=1e-7,eigenNuclear=1e-6),note='Hermitian eigenvalue nuclear norm check has sqrt sensitivity near zero eigenvalues; SVD and direct objective agree at tighter tolerance. These are independent synthetic mechanism checks, not paper-figure reproduction.')
assert worst['eigenNuclear']<1e-6
for path,value in [('data/waveform-states.json',artifact),('data/waveform-validation.json',validation)]:
 text=json.dumps(value,ensure_ascii=False,indent=2)+'\n'
 if '--check' in sys.argv:
  # BLAS sign choices may vary: the checked-in experiment remains canonical.
  if path.endswith('states.json'):
   existing=json.loads((ROOT/path).read_text())
   for st in existing['states']:
    H=unpack(existing['channels'][st['channel']]); T=unpack(existing['symbols']);R=unpack(st['R']);X=unpack(st['optimal'])
    _,_,_,_,b=solve(H,T,R)
    assert metrics(H,T,R,X)['covarianceResidual']<1e-10 and abs(np.linalg.norm(H@X-T)**2-b)<1e-10
 else: (ROOT/path).write_text(text)
print(json.dumps(validation,ensure_ascii=False,indent=2))
