#!/usr/bin/env python3
"""Independent derivation checks. Imports no producer or repository code.
Noise variance means E|z|^2; theta and derivatives use radians.
Run: python3 scripts/validate-crb-beamforming-independent.py [--check]
Source hash is the recorded independent 2026-10-10 audit, not re-downloaded by this script.
"""
import json, math, sys
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parents[1]/'data/crb-beamforming-independent.json'
rng = np.random.default_rng(20261010)
checks, stats = [], {}

def record(name, condition, **details):
    assert condition, (name, details)
    checks.append({'name':name,'passed':True,**details})

def close(x,y,rtol=1e-9,atol=1e-9):
    return bool(np.allclose(x,y,rtol=rtol,atol=atol))

def ula(n,theta,offset=0):
    m=np.arange(n)-(n-1)/2+offset
    a=np.exp(1j*np.pi*m*np.sin(theta))
    da=1j*np.pi*np.cos(theta)*m*a
    return a,da

def model(nt,nr,theta,tx_offset=0,rx_offset=0):
    a,da=ula(nt,theta,tx_offset)
    b,db=ula(nr,theta,rx_offset)
    A=np.outer(b,a.conj())
    dA=np.outer(db,a.conj())+np.outer(b,da.conj())
    return a,da,b,db,A,dA

def exact_waveform(R,L):
    # Exactly XX^H/L=R, using unit-energy orthogonal temporal rows.
    vals,U=np.linalg.eigh(R)
    vals=np.maximum(vals,0)
    rows=np.exp(2j*np.pi*np.arange(len(vals))[:,None]*np.arange(L)[None,:]/L)
    return (U*np.sqrt(vals))@rows

def real_fim(A,dA,X,alpha=.7+.4j,noise_var=1):
    v=(A@X).reshape(-1,order='F')
    dv=(dA@X).reshape(-1,order='F')
    D=np.stack([alpha*dv,v,1j*v],axis=1)
    return 2*np.real(D.conj().T@D)/noise_var

def schur_info(F):
    # No pseudoinverse: endpoint with no illumination is explicitly singular.
    if np.min(np.linalg.eigvalsh(F[1:,1:])) <= 1e-12:
        return None
    return float(F[0,0]-F[0,1:]@np.linalg.solve(F[1:,1:],F[1:,0]))

def eq7_info(A,dA,R,L,alpha=.7+.4j,noise_var=1):
    s=float(np.trace(A.conj().T@A@R).real)
    if s <= 1e-12:
        return None
    d=float(np.trace(dA.conj().T@dA@R).real)
    c=np.trace(dA.conj().T@A@R)
    return float(2*abs(alpha)**2*L/noise_var*(d-abs(c)**2/s))

def centered_info(a,da,b,db,R,L,alpha=.7+.4j,noise_var=1):
    q=float(np.vdot(a,R@a).real)
    if q <= 1e-12:
        return None
    tx=float(np.vdot(da,R@da).real)-abs(np.vdot(a,R@da))**2/q
    return float(2*abs(alpha)**2*L/noise_var*(np.vdot(db,db).real*q+np.vdot(b,b).real*tx))

def unit_complex(n):
    u=rng.normal(size=n)+1j*rng.normal(size=n)
    return u/np.linalg.norm(u)

# Direct FIM versus original matrix expression for independent random PSD matrices.
max_rel=0
for k in range(120):
    nt=int(rng.integers(2,10)); nr=int(rng.integers(nt+1,16)); L=32
    theta=float(rng.uniform(-1.2,1.2))
    a,da,b,db,A,dA=model(nt,nr,theta)
    rank=int(rng.integers(1,nt+1))
    B=rng.normal(size=(nt,rank))+1j*rng.normal(size=(nt,rank))
    R=B@B.conj().T; R/=np.trace(R).real
    X=exact_waveform(R,L)
    alpha=complex(*rng.normal(size=2)); nv=float(10**rng.uniform(-2,2))
    F=real_fim(A,dA,X,alpha,nv)
    j=schur_info(F); jt=eq7_info(A,dA,R,L,alpha,nv)
    jc=centered_info(a,da,b,db,R,L,alpha,nv)
    max_rel=max(max_rel,abs(j-jt)/max(1,abs(j)),abs(j-jc)/max(1,abs(j)))
    record(f'random_general_fim_{k}',close(j,jt) and close(j,jc) and close(X@X.conj().T/L,R))
    if k<8:
        eps=1e-6
        Ap=model(nt,nr,theta+eps)[4]; Am=model(nt,nr,theta-eps)[4]
        dAfd=(Ap-Am)/(2*eps)
        record(f'finite_difference_radian_derivative_{k}',close(dA,dAfd,rtol=2e-8,atol=2e-8))
stats['max_relative_fim_trace_decomposition_error']=max_rel

# General receive-projected decomposition, with arbitrary steering/derivative vectors.
max_arbitrary_rel=0
for k in range(40):
    nt=5; nr=7; L=16
    a=rng.normal(size=nt)+1j*rng.normal(size=nt)
    da=rng.normal(size=nt)+1j*rng.normal(size=nt)
    b=rng.normal(size=nr)+1j*rng.normal(size=nr)
    db=rng.normal(size=nr)+1j*rng.normal(size=nr)
    B=rng.normal(size=(nt,3))+1j*rng.normal(size=(nt,3))
    R=B@B.conj().T; R/=np.trace(R).real
    A=np.outer(b,a.conj()); dA=np.outer(db,a.conj())+np.outer(b,da.conj())
    j=schur_info(real_fim(A,dA,exact_waveform(R,L)))
    Q=np.vdot(a,R@a).real
    U=np.vdot(da,R@da).real
    V=np.vdot(a,R@da)
    br=np.vdot(db,db).real-abs(np.vdot(b,db))**2/np.vdot(b,b).real
    formula=2*abs(.7+.4j)**2*L*(br*Q+np.vdot(b,b).real*(U-abs(V)**2/Q))
    max_arbitrary_rel=max(max_arbitrary_rel,abs(j-formula)/max(1,abs(j)))
    record(f'arbitrary_steering_projected_decomposition_{k}',close(j,formula))
stats['max_relative_arbitrary_steering_projection_error']=max_arbitrary_rel

# Rank-one cancellation does NOT require centered TX; general RX uses projected derivative.
max_rank_rel=0
for k in range(100):
    nt=8; nr=12; L=64
    theta=float(rng.uniform(-1.1,1.1))
    a,da,b,db,A,dA=model(nt,nr,theta,tx_offset=float(rng.uniform(-3,3)),rx_offset=float(rng.uniform(-3,3)))
    w=unit_complex(nt); R=np.outer(w,w.conj()); X=exact_waveform(R,L)
    F=real_fim(A,dA,X)
    j=schur_info(F)
    q=abs(np.vdot(a,w))**2
    rperp=np.vdot(db,db).real-abs(np.vdot(b,db))**2/np.vdot(b,b).real
    formula=2*abs(.7+.4j)**2*L*q*rperp
    max_rank_rel=max(max_rank_rel,abs(j-formula)/max(1,abs(j)))
    record(f'rank_one_uncentered_{k}',close(j,formula,rtol=5e-9,atol=1e-7))
stats['max_relative_rank_one_projection_error']=max_rank_rel

# Units and noise/snapshot factors.
a,da,b,db,A,dA=model(8,12,.2)
w=unit_complex(8); R=np.outer(w,w.conj())
F=real_fim(A,dA,exact_waveform(R,64)); j=schur_info(F)
Fdeg=real_fim(A,dA*np.pi/180,exact_waveform(R,64))
record('degree_squared_conversion',close((1/schur_info(Fdeg))/(1/j),(180/np.pi)**2))
record('snapshot_scaling',close(schur_info(real_fim(A,dA,exact_waveform(R,128))),2*j))
record('noise_variance_scaling',close(schur_info(real_fim(A,dA,exact_waveform(R,64),noise_var=3)),j/3))
record('known_alpha_information_is_no_less',F[0,0]>=j)

# General complex target/channel exact optimizer and independent feasible samples.
def optimum(a,h,P,Gamma,noise_c):
    if P<=0 or noise_c<=0: raise ValueError('positive P and noise variance required')
    hn=np.linalg.norm(h); an=np.linalg.norm(a)
    if hn==0:
        if Gamma>0: return None
        return np.sqrt(P)*a/an
    q=Gamma*noise_c/(P*hn**2)
    if q>1+1e-12: return None
    q=float(np.clip(q,0,1))
    t=a/an; u=h/hn; z=np.vdot(u,t); rho=abs(z)
    if q<=rho*rho+1e-14: return np.sqrt(P)*t
    # In active branch rho<1; zero overlap permits arbitrary relative phase.
    v=(t-z*u)/np.sqrt(max(0,1-rho*rho))
    phase=z/rho if rho>1e-14 else 1
    return np.sqrt(P)*(np.sqrt(q)*phase*u+np.sqrt(1-q)*v)

opt_summaries=[]
worst_dense_gap=0; worst_random_excess=0
for i,rho in enumerate([0,.1,.45,.8,.99,1]):
    nt=8; t=unit_complex(nt)
    z=unit_complex(nt); z-=t*np.vdot(t,z); z/=np.linalg.norm(z)
    phase=np.exp(1j*.713)
    h=phase*(rho*t+np.sqrt(max(0,1-rho*rho))*z)
    a=np.sqrt(nt)*t; P=1.7; noise_c=.03
    for q in [0,.001,.05,.25,.64,.95,1]:
        Gamma=q*P/noise_c
        w=optimum(a,h,P,Gamma,noise_c)
        g=abs(np.vdot(a,w))**2/(P*nt)
        expected=1 if q<=rho*rho else (rho*np.sqrt(q)+np.sqrt(1-rho*rho)*np.sqrt(1-q))**2
        record(f'optimizer_closed_{i}_{q}',close(g,expected) and close(np.vdot(w,w).real,P) and abs(np.vdot(h,w))**2>=q*P-1e-11)
        # Dense 2D span samples vary channel-projection power AND relative complex phase.
        u=h/np.linalg.norm(h); zc=np.vdot(u,t)
        if abs(zc)<1-1e-12:
            v=(t-zc*u)/np.linalg.norm(t-zc*u)
            s=np.linspace(q,1,501)
            phases=np.linspace(-np.pi,np.pi,721)
            inner=(np.vdot(t,u)*np.sqrt(s)[:,None]*np.exp(1j*phases)[None,:]
                   +np.vdot(t,v)*np.sqrt(1-s)[:,None])
            dense=float(np.max(abs(inner)**2))
            worst_dense_gap=max(worst_dense_gap,g-dense)
            record(f'optimizer_dense_span_{i}_{q}',dense<=g+1e-10 and g-dense<.002,analytic=g,dense_max=dense)
        # Entire complex sphere samples conditioned to satisfy SINR, plus powers below budget.
        Z=rng.normal(size=(3000,nt))+1j*rng.normal(size=(3000,nt))
        Z-=np.outer(Z@u.conj(),u); Z/=np.linalg.norm(Z,axis=1)[:,None]
        s=q+(1-q)*rng.random(3000)
        V=np.sqrt(s)[:,None]*np.exp(2j*np.pi*rng.random(3000))[:,None]*u+np.sqrt(1-s)[:,None]*Z
        gains=abs(V@t.conj())**2
        worst_random_excess=max(worst_random_excess,float(np.max(gains)-g))
        record(f'optimizer_dense_fullspace_{i}_{q}',np.max(gains)<=g+1e-10)
        opt_summaries.append({'rho':rho,'q':q,'g_opt':g,'sinr':float(abs(np.vdot(h,w))**2/noise_c)})
record('optimizer_infeasible',optimum(a,h,P,1.01*P/noise_c,noise_c) is None)
record('zero_channel_positive_threshold_infeasible',optimum(a,np.zeros_like(h),P,1,noise_c) is None)
record('zero_channel_zero_threshold_radar_optimum',close(optimum(a,np.zeros_like(h),P,0,noise_c),np.sqrt(P)*a/np.linalg.norm(a)))
stats['max_analytic_minus_dense_span_gain']=worst_dense_gap
stats['max_random_gain_excess']=worst_random_excess

# Constructed even/odd covariance family, exact waveform and 3x3 nuisance Fisher matrix.
nt=8; nr=12; L=64; P=1; nv=100; alpha=1+.0j; nc=.01
m=np.arange(nt)-(nt-1)/2
u=np.ones(nt)/np.sqrt(nt); v=m/np.linalg.norm(m); h=u.copy()
a,da,b,db,A,dA=model(nt,nr,0)
Dt=np.vdot(da,da).real; Db=np.vdot(db,db).real
example=[]
for p in [.001,.05,.25,.5,.9,1]:
    prior=None
    for kappa in [0,.2,.5,.8,1]:
        wc=np.sqrt(P)*(np.sqrt(p)*u+kappa*np.sqrt(1-p)*v)
        wr=np.sqrt(P*(1-p)*(1-kappa*kappa))*v
        R=np.outer(wc,wc)+np.outer(wr,wr)
        # Preserve actual communication/probing column association, orthogonal temporal rows.
        rows=np.vstack([np.ones(L),np.exp(2j*np.pi*np.arange(L)/L)])
        X=np.stack([wc,wr],axis=1)@rows
        F=real_fim(A,dA,X,alpha,nv); j=schur_info(F)
        formula=2*abs(alpha)**2*L*P/nv*(nt*Db*p+nr*Dt*(1-p)*(1-kappa*kappa))
        illum=[]
        for theta in np.linspace(-np.pi/2,np.pi/2,721):
            av,dav=ula(nt,theta)
            illum.append(float(np.vdot(av,R@av).real))
        illum=np.array(illum)
        if prior is None: prior=illum
        gamma=abs(np.vdot(h,wc))**2/(abs(np.vdot(h,wr))**2+nc)
        record(f'constructed_example_{p}_{kappa}',close(j,formula) and close(j,eq7_info(A,dA,R,L,alpha,nv)) and close(illum,prior) and close(gamma,P*p/nc) and close(np.trace(R),P) and close(X@X.conj().T/L,R))
        example.append({'p':p,'kappa':kappa,'illumination_broadside':float(np.vdot(a,R@a).real),'total_power':float(np.trace(R)),'communication_sinr':float(gamma),'information_rad_inv2':j,'crb_rad2':1/j,'crb_deg2':(180/np.pi)**2/j,'sqrt_crb_deg':180/np.pi/np.sqrt(j),'FIM':F.tolist()})
x0=next(x for x in example if x['p']==.5 and x['kappa']==0)
x1=next(x for x in example if x['p']==.5 and x['kappa']==1)
ratio=x0['crb_rad2']/x1['crb_rad2']
record('constructed_default_ratio',close(ratio,143/206))
stats['constructed_default_ratio']=ratio
stats['constructed_default_independent']=x0
stats['constructed_default_coherent']=x1

# Endpoint p=0: do not use pseudo-inverse/finite limiting formula as a regular CRB.
for kappa in [0,.5,1]:
    wc=kappa*v; wr=np.sqrt(1-kappa*kappa)*v
    X=np.stack([wc,wr],axis=1)@np.vstack([np.ones(L),np.exp(2j*np.pi*np.arange(L)/L)])
    F=real_fim(A,dA,X,alpha,nv)
    record(f'zero_illumination_singular_{kappa}',schur_info(F) is None and np.linalg.matrix_rank(F,tol=1e-8)<3,FIM=F.tolist())

# Degenerate first-order angle sensitivity at endfire, zero reflection, one RX antenna.
for label,nnr,theta,al in [('endfire',12,np.pi/2,1),('zero_reflection',12,0,0),('one_receiver',1,0,1)]:
    a,da,b,db,A,dA=model(8,nnr,theta)
    w=a/np.linalg.norm(a); X=exact_waveform(np.outer(w,w.conj()),64)
    jj=schur_info(real_fim(A,dA,X,al,1))
    record(label+'_no_first_order_angle_information',abs(jj)<1e-7,information=jj)

payload={
 'status':'PASS','seed':20261010,'check_count':len(checks),
 'independence':'No imports from producer or site code. Direct real Fisher derivatives, original trace CRB, independently derived scalar forms, feasible complex vector samples.',
 'source':{'title':'Cramér-Rao Bound Optimization for Joint Radar-Communication Beamforming','journal':'IEEE Transactions on Signal Processing 70, 240-253 (2022)','doi':'10.1109/TSP.2021.3135692','pdf':'https://www.weizmann.ac.il/math/yonina/sites/math.yonina/files/Cramr-Rao_Bound_Optimization_for_Joint_Radar-Communication_Beamforming.pdf','pdf_sha256':'3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d','anchors':['II-A, equations (1)-(5)','II-B, equations (7)-(9)','III-B, equations (20)-(29)']},
 'statistics':stats,'optimizer_cases':opt_summaries,'constructed_example_cases':example,'checks':checks}
def equal(a,b):
    if isinstance(a,dict): return a.keys()==b.keys() and all(equal(a[k],b[k]) for k in a)
    if isinstance(a,list): return len(a)==len(b) and all(equal(x,y) for x,y in zip(a,b))
    if isinstance(a,(int,float)) and not isinstance(a,bool): return math.isclose(a,b,rel_tol=2e-12,abs_tol=2e-10)
    return a==b
if '--check' in sys.argv:
    assert equal(payload,json.loads(OUT.read_text())), 'Saved independent snapshot is stale'
else:
    OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False,allow_nan=False)+'\n')
print(json.dumps({'status':'PASS','check_count':len(checks),'statistics':stats,'output':str(OUT)},indent=2))
