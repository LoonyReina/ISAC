#!/usr/bin/env python3
"""Independent high-precision two-receiver Gaussian detection oracle.
Research only; no repository or site imports. Python >=3.10, mpmath.
Inputs are decimal strings where exact intended decimal values matter.
"""
from __future__ import annotations
import argparse
import json
import mpmath as mp

mp.mp.dps = 100


def m(x):
    return mp.mpf(str(x))


def tail(t, u, v):
    """P(u X+v Y>t), X,Y iid Exp(1), includes degenerate atom at zero."""
    t, u, v = map(m, (t,u,v))
    if min(u,v) < 0:
        raise ValueError('Nonnegative weights required')
    if t < 0:
        return mp.mpf(1)
    if u == v == 0:
        return mp.mpf(0)  # Strict tail, including t==0.
    if t == 0:
        return mp.mpf(1)
    if u == v:
        return mp.exp(-t/u)*(1+t/u)
    if u == 0:
        return mp.exp(-t/v)
    if v == 0:
        return mp.exp(-t/u)
    return (u*mp.exp(-t/u)-v*mp.exp(-t/v))/(u-v)


def quantile(p, u, v):
    """Threshold with strict upper-tail p; arbitrary precision normalized bisection."""
    p, u, v = map(m,(p,u,v))
    if not 0 < p < 1 or min(u,v)<0 or max(u,v)==0:
        raise ValueError('Nondegenerate weights and interior probability required')
    scale=max(u,v)
    u, v = u/scale, v/scale
    lo, hi = mp.mpf(0), max(mp.mpf(1),-2*mp.log(p))
    while tail(hi,u,v) > p:
        hi*=2
    for _ in range(220):
        mid=(lo+hi)/2
        if tail(mid,u,v)>p:
            lo=mid
        else:
            hi=mid
    return (lo+hi)/2*scale


def parameters(rho,kappa):
    rho,kappa=map(m,(rho,kappa))
    if rho<0 or not 0<=kappa<=1:
        raise ValueError('Invalid rho or kappa')
    b=[rho*(1+kappa),rho*(1-kappa)]
    a=[x/(1+x) for x in b]
    c=[1+x for x in b]
    return a,b,c


def result(rho,kappa,pfa):
    rho,kappa,pfa=map(m,(rho,kappa,pfa))
    a,b,c=parameters(rho,kappa)
    gamma_e=quantile(pfa,1,1)
    if rho==0:
        return {'rho':rho,'kappa':kappa,'pfa':pfa,'a':a,'b':b,
                'joint_threshold':mp.mpf(0),'joint_pd':pfa,
                'requires_randomization':True,'energy_threshold':gamma_e,'energy_pd':pfa}
    gamma_q=quantile(pfa,*a)
    return {'rho':rho,'kappa':kappa,'pfa':pfa,'a':a,'b':b,
            'joint_threshold':gamma_q,'joint_pd':tail(gamma_q,*b),
            'joint_pfa':tail(gamma_q,*a),'requires_randomization':False,
            'energy_threshold':gamma_e,'energy_pd':tail(gamma_e,*c)}


def q_eigen(z1,z2,rho,kappa):
    a,_,_=parameters(rho,kappa)
    return a[0]*abs(z1+z2)**2/2+a[1]*abs(z1-z2)**2/2


def energy_log_lrt(e1,e2,rho,kappa):
    e1,e2,rho,kappa=map(m,(e1,e2,rho,kappa))
    a,_,c=parameters(rho,kappa)
    det=c[0]*c[1]
    beta=(a[0]-a[1])/2
    return -mp.log(det)+(a[0]+a[1])*(e1+e2)/2+mp.log(mp.besseli(0,2*beta*mp.sqrt(e1*e2)))


def encode(x):
    if isinstance(x,mp.mpf): return mp.nstr(x,65)
    if isinstance(x,list): return [encode(y) for y in x]
    if isinstance(x,dict): return {k:encode(v) for k,v in x.items()}
    return x


def fixtures():
    rhos=['0','1e-10','1e-8','.001','1','3','1e4']
    kappas=['0','1e-12','1e-8','.25','.75','.99999999','.999999999999','1']
    pfas=['1e-12','1e-6','.05','.5','.999999','.999999999999']
    return [result(r,k,p) for r in rhos for k in kappas for p in pfas]


if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--fixtures',type=str,help='Write complete grid to JSON')
    ap.add_argument('--rho',default='3');ap.add_argument('--kappa',default='.75');ap.add_argument('--pfa',default='.05')
    args=ap.parse_args()
    if args.fixtures:
        with open(args.fixtures,'w') as f:
            json.dump({'precision_decimal_digits':mp.mp.dps,'cases':encode(fixtures())},f,indent=2)
    else:
        print(json.dumps(encode(result(args.rho,args.kappa,args.pfa)),indent=2))
