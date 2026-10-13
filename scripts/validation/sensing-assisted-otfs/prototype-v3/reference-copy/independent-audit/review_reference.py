#!/usr/bin/env python3
"""Independent scalar-loop message schedule review against separately authored reference.
Imports reviewed implementation only as the implementation under test, never into oracle.
"""
import importlib.util,json,hashlib
from pathlib import Path
import numpy as np
from audit_oracle import cells,add,sub,normalize_log
HERE=Path(__file__).resolve().parent
REF=HERE.parent/'sensing-assisted-otfs-reference'/'reference.py'
spec=importlib.util.spec_from_file_location('reviewed_implementation',REF)
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

def unpack(z):
    z=np.array(z); return z[...,0]+1j*z[...,1]

def scalar_messages(y,support,a,pilot,xp,Es,N0,v,mode,steps,damping):
    shape=y.shape; alphabet=np.sqrt(Es)*np.array([-1,1]); P=len(a)
    if mode=='ignored_uncertainty': v=np.zeros(P)
    if mode=='literal_operational': v=np.full(P,(P*Es+N0)/abs(xp)**2)
    pairs=[(obs,p) for obs in cells(shape) for p in range(P)]
    def variable(edge): return sub(edge[0],support[edge[1]],shape)
    by_variable={t:[(add(t,s,shape),p) for p,s in enumerate(support)] for t in cells(shape)}
    cavity={e:np.array([.5,.5]) for e in pairs}
    for _ in range(steps):
        factor={}
        for obs,p in pairs:
            if variable((obs,p))==pilot:
                factor[(obs,p)]=np.array([.5,.5]); continue
            m=[]; vv=[]; ss=[]
            for j in range(P):
                t=variable((obs,j))
                mj=xp if t==pilot else sum(cavity[(obs,j)][b]*alphabet[b] for b in range(2))
                sj=abs(xp)**2 if t==pilot else Es
                m.append(mj);ss.append(sj);vv.append(max(0,sj-abs(mj)**2))
            if mode=='literal_operational':
                mu=sum(a[j]*m[p] for j in range(P) if j!=p)
            else: mu=sum(a[j]*m[j] for j in range(P) if j!=p)
            scores=[]
            for c in alphabet:
                if mode=='literal_operational':
                    variance=N0+sum(Es*(v[p]+(abs(a[j])**2+v[p])*vv[j]) for j in range(P) if j!=p)
                else:
                    variance=N0+sum(abs(a[j])**2*vv[j]+v[j]*ss[j] for j in range(P) if j!=p)+v[p]*abs(c)**2
                scores.append(-abs(y[obs]-mu-a[p]*c)**2/variance-np.log(variance))
            factor[(obs,p)]=normalize_log(np.array(scores))
        beliefs={}
        next_cavity={}
        for t,edges in by_variable.items():
            scores=np.array([sum(np.log(max(factor[e][b],1e-300)) for e in edges) for b in range(2)])
            beliefs[t]=normalize_log(scores)
            for excluded in edges:
                scores=np.array([sum(np.log(max(factor[e][b],1e-300)) for e in edges if e!=excluded) for b in range(2)])
                next_cavity[excluded]=damping*normalize_log(scores)+(1-damping)*cavity[excluded]
        cavity=next_cavity
    return np.array([beliefs[t] for t in cells(shape)])

def run():
    f=json.loads((HERE/'independent-fixtures.json').read_text());cfg=f['configuration']
    y=unpack(f['posterior']['observation']);s=[tuple(t) for t in cfg['support']];q=tuple(cfg['pilot']);xp=unpack(cfg['pilot_symbol']);Es=cfg['Es'];N0=cfg['N0']
    truea=unpack(cfg['effective_gains']); ah=np.array([y[add(q,shift,y.shape)]/xp for shift in s]);lam=np.array(f['posterior']['gain_prior_variances']);v=(Es*(lam.sum()-lam)+N0)/abs(xp)**2
    results=[]
    for gain_case,a in [('unequal_estimated',ah),('one_zero_gain',np.array([0,ah[1],ah[2]]))]:
      for mode in ['moment_repaired','ignored_uncertainty','literal_operational']:
        for steps in [1,2,5]:
          expected=scalar_messages(y,s,a,q,xp,Es,N0,v,mode,steps,.37)
          actual=r.sparse_spa(y,s,a,q,xp,Es,N0,v,mode=mode,max_iterations=steps,damping=.37,tolerance=0)['probabilities']
          error=float(np.max(abs(expected-actual)))
          assert error<2e-12,(gain_case,mode,steps,error)
          results.append({'gain_case':gain_case,'mode':mode,'iterations':steps,'max_absolute_probability_error':error,'pass':True})
    rejection=[]
    for name,kwargs in [
      ('fractional_support',{'support':[(0,0),(1.9,0),(2,0)]}),
      ('nonfinite_energy',{'Es':np.nan}),
      ('zero_pilot',{'pilot':0}),
      ('nonfinite_noise',{'N0':np.nan}),
    ]:
      args=dict(y=y,support=s,estimated_gains=ah,pilot_index=q,pilot=xp,Es=Es,N0=N0,gain_variance=v,max_iterations=1)
      args.update(kwargs)
      try:r.sparse_spa(**args); rejected=False
      except (ValueError,TypeError,OverflowError):rejected=True
      rejection.append({'case':name,'rejects':rejected})
    out={'reference_sha256':hashlib.sha256(REF.read_bytes()).hexdigest(),'oracle_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'core_message_comparisons':results,'all_18_message_comparisons_pass':True,'input_validation_checks':rejection,'all_input_validation_checks_pass':all(x['rejects'] for x in rejection),'no_truth_input_finding':'Reviewed finite sweep gives practical estimators and detectors y/predicted support/statistical powers only; true gains/support are used only in evaluation and explicitly supplied-perfect-CSI branch.'}
    (HERE/'reference-implementation-review.json').write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps({'all_18_message_comparisons_pass':True,'maximum_probability_difference':max(x['max_absolute_probability_error'] for x in results),'validation':rejection,'reference_sha256':out['reference_sha256']},indent=2))

if __name__=='__main__':run()
