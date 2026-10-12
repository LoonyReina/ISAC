#!/usr/bin/env python3
"""Independent exact teaching model; not the paper's multi-user SDR or simulations.
Run: python3 scripts/validate-crb-beamforming.py [--check]
Requires NumPy only. Computes independently of JavaScript; --check verifies the saved snapshot.
"""
import json
import sys
import math
from pathlib import Path
import numpy as np

NT, NR, L = 8, 12, 64
P, SIGMA_C2, SIGMA_R2, ALPHA = 1.0, 0.01, 100.0, 1.0 + 0j
TOL = 1e-10

def steering(n, theta):
    """Radians; centered half-wave ULA; unnormalized norm sqrt(n)."""
    m = np.arange(n) - (n-1)/2
    a = np.exp(1j*np.pi*m*np.sin(theta))
    ad = 1j*np.pi*m*np.cos(theta)*a
    return a, ad

def modes(n):
    m = np.arange(n)-(n-1)/2
    return np.ones(n)/np.sqrt(n), m/np.linalg.norm(m)

U,V=modes(NT)
A0,AD0=steering(NT,0)
B0,BD0=steering(NR,0)
DT,DB=float(np.vdot(AD0,AD0).real),float(np.vdot(BD0,BD0).real)
C=2*abs(ALPHA)**2*L/SIGMA_R2
J0=C*DB*NT*P
CRB0=1/J0

# Orthonormal finite block. Main case uses only its first unit-power row.
# The second row is an exactly orthogonal known illustrative waveform.
S=np.stack([np.ones(L),(-1.0)**np.arange(L)]).astype(complex)
assert np.max(abs(S@S.conj().T/L-np.eye(2)))<TOL


def covariance_metrics(R, theta=0, alpha=ALPHA, nr=NR, sigma_r2=SIGMA_R2, snapshots=L):
    a,ad=steering(R.shape[0],theta)
    b,bd=steering(nr,theta)
    aa=np.outer(b,a.conj())
    aad=np.outer(bd,a.conj())+np.outer(b,ad.conj())
    s0=float(np.trace(aa.conj().T@aa@R).real)
    s1=complex(np.trace(aad.conj().T@aa@R))
    s2=float(np.trace(aad.conj().T@aad@R).real)
    scale=2*abs(alpha)**2*snapshots/sigma_r2
    known=scale*s2
    if s0 <= 1e-12 or abs(alpha)==0 or abs(np.cos(theta))<1e-12:
        return dict(status='nonregular_or_unidentifiable', S0=s0, S2=s2,
                    known_alpha_information=known, nuisance_loss=None,
                    effective_information=None, crb_rad2=None, root_crb_deg=None)
    loss=scale*abs(s1)**2/s0
    effective=max(0.0,known-loss)
    crb=None if effective<=1e-12 else 1/effective
    return dict(status='regular' if crb else 'unidentifiable',S0=s0,S2=s2,
                known_alpha_information=known,nuisance_loss=loss,
                effective_information=effective,crb_rad2=crb,
                root_crb_deg=None if crb is None else np.sqrt(crb)*180/np.pi)


def real_fim(X,theta=0,alpha=ALPHA,nr=NR,sigma_r2=SIGMA_R2):
    a,ad=steering(X.shape[0],theta)
    b,bd=steering(nr,theta)
    A=np.outer(b,a.conj())
    Ad=np.outer(bd,a.conj())+np.outer(b,ad.conj())
    D=np.stack([(alpha*Ad@X).ravel(),(A@X).ravel(),(1j*A@X).ravel()],axis=1)
    F=2/sigma_r2*(D.conj().T@D).real
    if np.linalg.eigvalsh(F[1:,1:]).min()<=1e-10:
        return F,None
    return F,float(F[0,0]-F[0,1:]@np.linalg.solve(F[1:,1:],F[1:,0]))


def optimum(rho,q,power=P):
    if not (0<=rho<=1) or q<0 or not np.isfinite(q):
        raise ValueError('rho must be in [0,1], q must be finite and nonnegative')
    if q>1:
        return None
    beta=np.arccos(rho)
    phi=max(0.0,float(beta-np.arccos(np.sqrt(q))))
    w=np.sqrt(power)*(np.cos(phi)*U+np.sin(phi)*V)
    # Exact endpoint avoids a misleading epsilon-sized illuminated null.
    if rho==0 and q==1:
        w=np.sqrt(power)*V.copy()
    return w,phi


def main_case(rho,q):
    result=optimum(rho,q)
    base=dict(rho=float(rho),q=float(q),required_snr_linear=float(q*P/SIGMA_C2),
              required_snr_db=None if q==0 else float(10*np.log10(q*P/SIGMA_C2)))
    if result is None:
        return dict(**base,status='communication_infeasible',bound_reason='Gamma > P ||h||^2 / sigma_C^2')
    w,phi=result
    h=rho*U+np.sqrt(1-rho*rho)*V
    R=np.outer(w,w.conj())
    measured=float(abs(np.vdot(h,w))**2/SIGMA_C2)
    g=float(abs(np.vdot(A0,w))**2/(NT*P))
    if rho==0 and q==1: g=0.0
    met=covariance_metrics(R)
    F,schur=real_fim(w[:,None]*S[0:1,:])
    assert abs(np.trace(R)-P)<TOL
    assert measured+1e-9>=q*P/SIGMA_C2
    if met['status']=='regular':
        assert np.isclose(met['effective_information'],J0*g,rtol=2e-10,atol=2e-8)
        assert np.isclose(schur,met['effective_information'],rtol=2e-10,atol=2e-8)
    else:
        assert rho==0 and q==1
    analytic_g=1.0 if q<=rho*rho else (rho*np.sqrt(q)+np.sqrt(1-rho*rho)*np.sqrt(1-q))**2
    assert abs(g-analytic_g)<TOL
    return dict(**base,**met,phi_degrees=float(phi*180/np.pi),g=g,
                actual_snr_linear=measured,actual_snr_db=float(10*np.log10(measured)) if measured>1e-25 else None,
                normalized_crb=None if g==0 else 1/g, normalized_information=g,
                coefficient_u=float(np.real(np.vdot(U,w))),coefficient_v=float(np.real(np.vdot(V,w))),
                power=float(np.trace(R).real),fim=F.tolist())


def companion(p,kappa):
    if not (0<p<=1 and 0<=kappa<=1):
        raise ValueError('Use p in (0,1], kappa in [0,1]; p=0 has singular nuisance FIM')
    wc=np.sqrt(P)*(np.sqrt(p)*U+kappa*np.sqrt(1-p)*V)
    wr=np.sqrt(P*(1-p)*(1-kappa*kappa))*V
    W=np.column_stack([wc,wr])
    R=W@W.conj().T
    h=U
    met=covariance_metrics(R)
    analytic=C*P*(NT*DB*p+NR*DT*(1-p)*(1-kappa*kappa))
    F,schur=real_fim(W@S)
    assert abs(np.trace(R)-P)<TOL
    assert np.linalg.norm(R-(W@S)@(W@S).conj().T/L)<TOL
    assert abs(np.vdot(h,wr))<TOL
    assert np.isclose(met['effective_information'],analytic,rtol=1e-10,atol=2e-8)
    assert np.isclose(schur,analytic,rtol=1e-10,atol=2e-8)
    angle=np.linspace(-np.pi/2,np.pi/2,1801)
    m=np.arange(NT)-(NT-1)/2
    Avec=np.exp(1j*np.pi*m[:,None]*np.sin(angle))
    pattern=np.einsum('ij,ij->j',Avec.conj(),R@Avec).real
    reference=P*(p*abs(Avec.conj().T@U)**2+(1-p)*abs(Avec.conj().T@V)**2)
    assert np.max(abs(pattern-reference))<1e-12
    return dict(p=float(p),kappa=float(kappa),**met,power=float(np.trace(R).real),
                data_stream_power=float(np.vdot(wc,wc).real),auxiliary_stream_power=float(np.vdot(wr,wr).real),
                communication_signal_power=float(abs(np.vdot(h,wc))**2),
                communication_interference_power=float(abs(np.vdot(h,wr))**2),
                communication_snr=float(abs(np.vdot(h,wc))**2/SIGMA_C2),
                max_pattern_error=float(np.max(abs(pattern-reference))),
                eigenvalues=np.linalg.eigvalsh(R).tolist(),per_antenna_power=np.diag(R).real.tolist(),fim=F.tolist())


def tests():
    rng=np.random.default_rng(20261010)
    errors=[]
    # Independent generic complex-covariance / full real FIM comparison.
    for theta in [-.9,-.2,0,.35,.95]:
        for _ in range(12):
            W=rng.standard_normal((NT,2))+1j*rng.standard_normal((NT,2))
            W/=np.linalg.norm(W)
            R=W@W.conj().T
            alpha=.7+.4j
            met=covariance_metrics(R,theta,alpha)
            F,j=real_fim(W@S,theta,alpha)
            errors.append(abs(j-met['effective_information'])/met['effective_information'])
            assert errors[-1]<1e-12
            assert np.linalg.eigvalsh(F).min()>0
    # Differentiate the actual mean rather than reuse an A-dot formula.
    theta=.23
    W=rng.standard_normal((NT,2))+1j*rng.standard_normal((NT,2)); W/=np.linalg.norm(W)
    X=W@S; alpha=.7+.4j
    def mean(t,r,im):
        a,_=steering(NT,t);b,_=steering(NR,t)
        return (r+1j*im)*np.outer(b,a.conj())@X
    params=np.array([theta,alpha.real,alpha.imag]);delta=1e-6;ds=[]
    for i in range(3):
        e=np.zeros(3);e[i]=delta
        ds.append(((mean(*(params+e))-mean(*(params-e)))/(2*delta)).ravel())
    D=np.stack(ds,axis=1);Ffd=2/SIGMA_R2*(D.conj().T@D).real
    F,_=real_fim(X,theta,alpha)
    fd_error=float(np.linalg.norm(F-Ffd)/np.linalg.norm(F));assert fd_error<2e-9
    # Complex beam grid in the spanning plane: phase cannot beat the exact result.
    max_grid_excess=-np.inf
    phis=np.linspace(0,np.pi/2,1201)
    phases=np.linspace(-np.pi,np.pi,301)
    g_grid=np.cos(phis)**2
    for rho in [0,.1,.5,.9,1]:
        z=rho*np.cos(phis)[:,None]+np.sqrt(1-rho*rho)*np.sin(phis)[:,None]*np.exp(1j*phases)[None,:]
        q_grid=abs(z)**2
        for q in [0,.01,.2,.25,.5,.8,.95,1]:
            w,_=optimum(rho,q)
            ga=abs(np.vdot(A0,w))**2/(NT*P)
            feasible=q_grid>=q-1e-14
            if np.any(feasible):
                best=np.max(np.broadcast_to(g_grid[:,None],q_grid.shape)[feasible])
                max_grid_excess=max(max_grid_excess,best-ga)
                assert best<=ga+1e-10
    # Scaling checks preserve explicitly declared resources.
    R=np.outer(optimum(.5,.8)[0],optimum(.5,.8)[0].conj())
    ref=covariance_metrics(R)
    assert np.isclose(covariance_metrics(2*R)['crb_rad2'],ref['crb_rad2']/2)
    assert np.isclose(covariance_metrics(R,snapshots=2*L)['crb_rad2'],ref['crb_rad2']/2)
    assert np.isclose(covariance_metrics(R,sigma_r2=2*SIGMA_R2)['crb_rad2'],ref['crb_rad2']*2)
    assert np.isclose(covariance_metrics(R,alpha=2*ALPHA)['crb_rad2'],ref['crb_rad2']/4)
    assert optimum(.5,1.01) is None
    assert main_case(0,1)['status']=='nonregular_or_unidentifiable'
    assert covariance_metrics(R,alpha=0)['status']=='nonregular_or_unidentifiable'
    assert covariance_metrics(R,theta=np.pi/2)['status']=='nonregular_or_unidentifiable'
    assert covariance_metrics(np.outer(V,V))['status']=='nonregular_or_unidentifiable'
    return dict(generic_fim_cases=len(errors),max_relative_trace_schur_error=max(errors),
                finite_difference_fim_relative_error=fd_error,max_complex_grid_excess=float(max_grid_excess),
                singular_endpoints_checked=True,resource_scaling_checked=True)


if __name__=='__main__':
    check=tests()
    curves=[main_case(rho,float(q)) for rho in [0,.25,.5,.75,1] for q in np.linspace(0,1.1,111)]
    default=main_case(.5,10**(18/10)*SIGMA_C2/P)
    special=[main_case(rho,q) for rho,q in [(0,0),(0,1),(.5,.25),(.5,1),(1,0),(1,1),(.5,1.01)]]
    comps=[companion(p,float(k)) for p in [.2,.5,.8,1.0] for k in np.linspace(0,1,11)]
    c0,c1=companion(.5,0),companion(.5,1)
    out=dict(description='Exact declared single-user special case plus separately labeled constructed covariance experiment',
             settings=dict(Nt=NT,Nr=NR,L=L,P=P,sigma_C2=SIGMA_C2,sigma_R2=SIGMA_R2,alpha_real=ALPHA.real,alpha_imag=ALPHA.imag,
                           theta_radians=0,steering='exp(i*pi*(m-(N-1)/2)*sin(theta))',
                           gamma_max=P/SIGMA_C2,gamma_max_db=10*np.log10(P/SIGMA_C2),
                           Dt=DT,Db=DB,J0=J0,CRB0_rad2=CRB0,root_CRB0_deg=np.sqrt(CRB0)*180/np.pi),
             validation=check,default=default,special_cases=special,main_curves=curves,companion_sweep=comps,
             companion_default=dict(independent=c0,coherent=c1,crb_ratio_independent_to_coherent=c0['crb_rad2']/c1['crb_rad2']))
    destination=Path(__file__).resolve().parents[1]/'data/crb-beamforming-validation.json'
    def equal(a,b):
        if isinstance(a,dict): return a.keys()==b.keys() and all(equal(a[k],b[k]) for k in a)
        if isinstance(a,list): return len(a)==len(b) and all(equal(x,y) for x,y in zip(a,b))
        if isinstance(a,(int,float)) and not isinstance(a,bool): return math.isclose(a,b,rel_tol=2e-12,abs_tol=2e-10)
        return a==b
    if '--check' in sys.argv:
        assert equal(out,json.loads(destination.read_text())), 'Saved numerical snapshot is stale'
    else:
        destination.write_text(json.dumps(out,indent=2,ensure_ascii=False,allow_nan=False)+'\n')
    print(json.dumps(dict(settings=out['settings'],validation=check,default=default,
                         companion_crb_ratio=out['companion_default']['crb_ratio_independent_to_coherent'],output=str(destination)),indent=2))
