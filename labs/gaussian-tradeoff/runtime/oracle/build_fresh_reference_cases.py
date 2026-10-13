"""Fresh port oracles generated from frozen reference plus independent real solves.
Never changes the frozen reference. Cases are verification inputs, not paper figures.
"""
import os
for key in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS'):
    if os.environ.get(key)!='1':raise RuntimeError(f'{key}=1 required')
import dataclasses,hashlib,json,math,sys
from pathlib import Path
import numpy as np
REF=Path(os.environ.get('GAUSSIAN_REFERENCE_DIR',str(Path(__file__).resolve().parent/'reference')))
EXPECTED='b06e329b927cda7adb1e2d38b320a1f2ca1bee287ebe8dec50d6de86fe176bb2'
assert hashlib.sha256((REF/'core.py').read_bytes()).hexdigest()==EXPECTED
sys.path.insert(0,str(REF));import core as c
HERE=Path(__file__).resolve().parent

def matrix(a):
    a=np.asarray(a);return {'re':a.real.tolist(),'im':a.imag.tolist()}

def finite(v):
    if isinstance(v,np.ndarray):return v.tolist()
    if isinstance(v,np.generic):return v.item()
    raise TypeError(type(v).__name__)

rows=[]
settings=[(1,1,2,3,.6,.8,1.7,.4),(2,2,2,5,1.1,.6,.7,2.4),(3,2,2,2,2.0,1.3,.9,.3),(4,3,2,8,1.,.7,1.,1.3),(6,4,1,9,.3,2.1,.4,3.)]
for i,(m,nc,ns,t,p,snoise,cnoise,prior) in enumerate(settings):
    seed=820410+i;rng=np.random.default_rng(seed);model=c.Model(m,ns,t,p,snoise,cnoise,prior)
    h=c.cn(rng,(nc,m))/np.sqrt(m)
    u,_=np.linalg.qr(c.cn(rng,(m,m)));vals=np.linspace(.3,1.7,m);vals*=m*p/vals.sum()
    Q=(u*vals)@u.conj().T
    X=(u*np.sqrt(vals))@c.cn(rng,(m,t))
    truth=np.sqrt(prior)*c.cn(rng,(ns,m));noise=np.sqrt(snoise)*c.cn(rng,(ns,t));Y=truth@X+noise
    estimate=c.posterior_mean(Y,X,snoise,prior)
    Ch=np.linalg.inv(np.eye(m)/prior+X.conj()@X.T/snoise)
    Cr=np.linalg.inv(np.eye(m)/prior+X@X.conj().T/snoise)
    # Independent full real-coordinate likelihood (all real rows, then all imaginary).
    A=np.kron(np.eye(ns),X.T);B=np.block([[A.real,-A.imag],[A.imag,A.real]])
    Jfull=2*(B.T@B/snoise+np.eye(2*ns*m)/prior)
    yy=Y.reshape(-1);yr=np.concatenate([yy.real,yy.imag])
    real_est=np.linalg.solve(B.T@B+snoise/prior*np.eye(2*ns*m),B.T@yr)
    real_est=(real_est[:ns*m]+1j*real_est[ns*m:]).reshape(ns,m)
    Ccomplex=np.kron(np.eye(ns),Ch);Cfull=.5*np.block([[Ccomplex.real,-Ccomplex.imag],[Ccomplex.imag,Ccomplex.real]])
    R=c.sample_covariance(X)
    direct_trace=float(np.trace(np.linalg.inv(Jfull)))
    assert np.max(abs(real_est-estimate))<1e-11
    assert np.max(abs(np.linalg.inv(Jfull)-Cfull))<1e-11
    shape=[]
    for k in [0,.1,1,10,100,math.inf]:
        sol=c.covariance_shape(h,model,k)
        shape.append({'kappa':'Infinity' if math.isinf(k) else k,'Q':matrix(sol['covariance']),
            'eigenvalues':sol['eigenvalues'],'source48_alpha':sol['source48_alpha'],'objective':sol['objective'],
            'gradient':sol['gradient'],'global_gap_bound':sol['global_gap_bound'],'budget_residual':sol['feasibility_residual'],
            'gaussian_rate_bits':c.gaussian_rate(h,sol['covariance'],cnoise),
            'covariance_outer_crb':c.conditional_crb(sol['covariance'],model)})
    rows.append({'id':f'complex-M{m}-Nc{nc}-Ns{ns}-T{t}','seed':seed,'model':dataclasses.asdict(model),
        'Hc':matrix(h),'arbitrary_Q_noncommuting':matrix(Q),'commutator_norm':float(np.linalg.norm(Q@(h.conj().T@h)-(h.conj().T@h)@Q)),
        'arbitrary_Q_rate_bits':c.gaussian_rate(h,Q,cnoise),'arbitrary_Q_crb':c.conditional_crb(Q,model),
        'X':matrix(X),'R':matrix(R),'Y':matrix(Y),'posterior_Hhat':matrix(estimate),
        'truth_only_for_scoring':matrix(truth),'squared_error':float(np.sum(abs(estimate-truth)**2)),
        'conditional_crb':c.conditional_crb(R,model),'batch_conditional_crb':float(c.crb_from_waveforms(X[None],model)[0]),
        'real_bfim_one_row':c.real_bfim(X,snoise,prior),'full_real_bfim_all_real_then_all_imag':Jfull,
        'posterior_covariance_h_column':matrix(Ch),'posterior_covariance_right_acting_row':matrix(Cr),
        'independent_full_real_posterior_covariance':Cfull,'independent_full_real_trace':direct_trace,
        'independent_real_estimator_max_error':float(np.max(abs(real_est-estimate))),
        'full_rank_fixed_covariance_realizable':t>=m,'covariance_shaping':shape})

wishart=[]
for m,t,q,ns,noise,prior in [(1,1,1,1,1,1),(1,4,.7,2,.6,2),(2,1,1,1,1,1),(2,8,1,2,1,10),(3,6,2,2,.7,.4),(4,8,1,4,1,1),(6,24,1,6,1,.1)]:
    wishart.append({'M':m,'T':t,'q':q,'Ns':ns,'noise':noise,'prior':prior,
        'finite_expectation':c.isotropic_gaussian_crb(m,t,q,ns,noise,prior),
        'mp_approx':noise*ns/t*m/q*c.mp_resolvent(m/t,noise/(t*prior*q))})

out={'schema':'fresh-complex-matrix-port-golden-v1','status':'fresh independent inputs; reference outputs and independent full-real-solve crosschecks',
 'source_core_sha256':EXPECTED,'reference_manifest_sha256':'716560ac0ecb32689ad187b6866f7ead4e07fe76d21e4490991bde5c4110ddad',
 'generator_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'complex_matrix_encoding':{'re':'real 2D array','im':'imaginary 2D array'},
 'full_real_coordinate_order':'[Re(vec(Hs^T)); Im(vec(Hs^T))], equivalently all row-major real coefficients followed by all imaginary coefficients',
 'units':{'rate':'bits per complex channel use','error':'sum squared complex coefficients'},
 'cases':rows,'isotropic_wishart_cases':wishart,
 'limitations':['T<M proper-prior case validates posterior/outer calculations; full-rank fixed covariance is not a realizable sample covariance for that T',
 'No finite-SNR full-MIMO Stiefel MI','Full real checks are independent linear solves; source48 values use the frozen validated reference solver']}
(HERE/'fresh_reference_cases.json').write_text(json.dumps(out,indent=2,default=finite,allow_nan=False)+'\n')
print(json.dumps({'cases':len(rows),'shapes':sum(len(r['covariance_shaping']) for r in rows),'wishart':len(wishart),
 'output_sha256':hashlib.sha256((HERE/'fresh_reference_cases.json').read_bytes()).hexdigest(),
 'max_real_estimator_error':max(r['independent_real_estimator_max_error'] for r in rows)},indent=2))
