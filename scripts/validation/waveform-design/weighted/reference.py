#!/usr/bin/env python3
"""Section IV weighted equality-energy reference, arXiv:1711.05220v1.

Implements the paper's eigendecomposition/secular equation on the regular
branch, plus explicitly identified minimum-eigenspace completion at a hard
case. This file does not implement the strict-covariance solver again.
"""
from __future__ import annotations
import argparse, hashlib, json, time
from pathlib import Path
import numpy as np
from scipy import linalg, optimize

ID='weighted-equality-trs-eigh-brentq-with-hard-case-completion-v3'
EPS=np.finfo(float).eps
LIMITS={'N':32,'K':32,'L':128,'maxEntryMagnitude':1e6,
        'minPositiveBlockEnergy':1e-12,'maxBlockEnergy':1e12,
        'energyRelativeTolerance':2e-10,'kktRelativeTolerance':2e-9,
        'gapRelativeTolerance':2e-9}

def pack(a):
    a=np.asarray(a,dtype=np.complex128)
    return np.stack([a.real,a.imag],axis=-1).tolist()

def unpack(a):
    a=np.asarray(a,dtype=float)
    if a.ndim!=3 or a.shape[-1]!=2: raise ValueError('Expected [rows][columns][real,imag]')
    return a[...,0]+1j*a[...,1]

def matrix(a,name,*,output_roundoff_allowance=False):
    a=np.asarray(a,dtype=np.complex128)
    if a.ndim!=2 or not all(a.shape): raise ValueError(name+' must be a nonempty rectangular matrix')
    if not np.all(np.isfinite(a)): raise ValueError(name+' must be finite')
    cap=LIMITS['maxEntryMagnitude']*(1+64*EPS*max(a.shape)) if output_roundoff_allowance else LIMITS['maxEntryMagnitude']
    if np.max(np.abs(a))>cap: raise ValueError(name+' exceeds declared numerical magnitude limit')
    return a

def norm2(a): return float(np.vdot(a,a).real)

def validate(H,S,X0,rho,Pt):
    H,S,X0=(matrix(a,n) for a,n in ((H,'H'),(S,'S'),(X0,'X0')))
    k,n=H.shape; ell=S.shape[1]
    if S.shape[0]!=k or X0.shape!=(n,ell): raise ValueError('Incompatible H/S/X0 dimensions')
    if n>32 or k>32 or ell>128: raise ValueError('Dimensions exceed reference implementation limits')
    if not np.isscalar(rho) or not np.isfinite(rho) or not 0<=rho<=1: raise ValueError('rho must be in [0,1]')
    if not np.isscalar(Pt) or not np.isfinite(Pt) or Pt<0: raise ValueError('Pt must be finite and nonnegative')
    energy=float(ell*Pt)
    if not np.isfinite(energy) or energy>1e12 or (energy>0 and energy<1e-12): raise ValueError('Block energy outside declared numerical range')
    return H,S,X0,float(rho),float(Pt),energy

def problem_parts(H,S,X0,rho):
    Q=rho*(H.conj().T@H)+(1-rho)*np.eye(H.shape[1])
    Q=(Q+Q.conj().T)*0.5
    G=rho*(H.conj().T@S)+(1-rho)*X0
    c=rho*norm2(S)+(1-rho)*norm2(X0)
    return Q,G,c

def evaluate(H,S,X0,rho,Pt,X):
    H,S,X0,rho,Pt,E=validate(H,S,X0,rho,Pt)
    X=matrix(X,'X',output_roundoff_allowance=True)
    if X.shape!=X0.shape: raise ValueError('X has wrong shape')
    mui=norm2(H@X-S); distance=norm2(X-X0); energy=norm2(X)
    return {'mui':mui,'radarWaveformDistance':distance,
            'weightedObjective':rho*mui+(1-rho)*distance,
            'energy':energy,'requiredEnergy':E,'energyResidual':energy-E,
            'energyResidualRelative':abs(energy-E)/E if E else abs(energy),
            'muiPerUser':np.mean(np.abs(H@X-S)**2,axis=1).tolist(),
            'covariance':pack(X@X.conj().T/S.shape[1])}

def solve(H,S,X0,rho,Pt,*,root_method='brentq',tie_break='canonical'):
    start=time.perf_counter()
    if tie_break not in ('canonical','radar-closest'): raise ValueError('Unknown hard-case tie break')
    H,S,X0,rho,Pt,E=validate(H,S,X0,rho,Pt)
    Q,G,c=problem_parts(H,S,X0,rho)
    n,ell=X0.shape
    if E==0:
        X=np.zeros_like(X0)
        return {'schemaVersion':1,'solver':ID,'status':'certified-singleton',
                'branch':'zero-energy-singleton','tieBreak':{'requested':tie_break,'applied':False,'reason':'Singleton feasible set'},'X':pack(X),'metrics':evaluate(H,S,X0,rho,Pt,X),
                'certificate':{'lowerBound':c,'signedGap':0.,'note':'Feasible set is {0}; equality constraint gradient vanishes, finite-multiplier KKT is not required.'},
                'elapsedMs':1000*(time.perf_counter()-start)}
    r=np.sqrt(E)
    # Unit sphere and common objective scaling make tolerances dimensionless.
    scale=max(float(linalg.norm(Q,2))*E,float(linalg.norm(G,'fro'))*r,np.finfo(float).tiny)
    # Multiply before dividing: E/scale can overflow for zero or tiny Q.
    if not np.any(Q) and not np.any(G): scale=1.
    A=(Q*E)/scale; B=(G*r)/scale
    q,V=linalg.eigh(A,driver='evd',check_finite=True)
    Z=V.conj().T@B
    gaps=q-q[0]
    eig_tol=64*EPS*max(1,n)*max(1.,float(np.max(np.abs(q))))
    min_mask=gaps<=eig_tol
    g_tol=64*EPS*max(n,ell)*max(1.,float(linalg.norm(B,'fro')))
    min_g_norm=float(linalg.norm(Z[min_mask],'fro'))
    # Only hard-case candidates use the numerical minimum-eigenspace cluster.
    # Regular solves retain every actual eigenvalue gap and projection.
    pseudo=np.zeros_like(Z)
    pseudo[~min_mask]=Z[~min_mask]/gaps[~min_mask,None]
    endpoint_energy=norm2(pseudo)
    numerically_orthogonal=min_g_norm<=g_tol
    is_hard=numerically_orthogonal and endpoint_energy<=1+8*EPS*max(n,ell)
    iterations=0; evaluations=0; t=0.
    tie_info={'requested':tie_break,'applied':False,'primaryObjective':'weighted Eq16 objective','secondaryObjective':'Frobenius distance squared to X0','selectionSpace':'declared-numerical-minimum-eigenvalue-cluster','exactSolutionSetRequiresExactClusterAndRange':True}
    if is_hard:
        Ycoord=pseudo.copy()
        # Orthogonal eigenspace completion; never rescale the pseudoinverse.
        completion_energy=max(0.,1-endpoint_energy)
        if tie_break=='radar-closest' and completion_energy>0:
            projected=(V.conj().T@(X0/r))[min_mask]
            projected_norm=float(linalg.norm(projected,'fro'))
            projected_tol=64*EPS*max(n,ell)*max(1.,float(linalg.norm(X0/r,'fro')))
            tie_info.update({'applied':True,'projectedReferenceNormScaled':projected_norm,
                             'projectedReferenceZeroTolerance':projected_tol,
                             'uniqueAtNumericalProjectionThreshold':bool(projected_norm>projected_tol)})
            if projected_norm>projected_tol:
                Ycoord[min_mask]=np.sqrt(completion_energy)*projected/projected_norm
                tie_info['selection']='reference-aligned-minimum-eigenspace-completion'
            else:
                Ycoord[np.flatnonzero(min_mask)[0],0]=np.sqrt(completion_energy)
                tie_info['selection']='canonical-fallback-reference-projection-numerically-zero'
                tie_info['secondaryOptimalityToleranceBound']=4*np.sqrt(completion_energy)*projected_norm*E
        else:
            Ycoord[np.flatnonzero(min_mask)[0],0]=np.sqrt(completion_energy)
            tie_info['selection']='canonical-minimum-eigenvector-first-time-coordinate'

        branch='hard-case-completion' if completion_energy>8*EPS*max(n,ell) else 'singular-boundary-no-completion'
    else:
        rownorms=linalg.norm(Z,axis=1)
        def residual(t):
            nonlocal evaluations
            evaluations+=1
            den=gaps+t
            if np.any((den==0)&(rownorms>0)): return np.inf
            ratio=np.divide(rownorms,den,out=np.zeros_like(rownorms),where=den>0)
            # Norm, rather than its square, avoids an unnecessary overflow.
            return float(linalg.norm(ratio))-1.
        hi=max(float(linalg.norm(B,'fro')),np.finfo(float).tiny)
        while residual(hi)>0: hi*=2
        if root_method=='brentq':
            t,root=optimize.brentq(residual,0.,hi,xtol=np.nextafter(0.,1.),rtol=8*EPS,maxiter=1024,full_output=True)
            if not root.converged: raise ArithmeticError('Secular solve did not converge')
            iterations=root.iterations
        elif root_method=='bisect':
            lo=0.
            for iterations in range(1,1075):
                t=lo+(hi-lo)/2
                val=residual(t)
                if abs(val)<=8*EPS or t==lo or t==hi: break
                if val>0: lo=t
                else: hi=t
            if t<=0: raise ArithmeticError('Root not representable')
        else: raise ValueError('Unknown root method')
        Ycoord=Z/(gaps+t)[:,None]
        branch='regular-secular'
        completion_energy=0.
    Y=V@Ycoord
    X=r*Y
    # The source's multiplier is lambda; t=lambda+lambda_min in scaled units.
    nu=float(t-q[0]); multiplier=nu*scale/E
    M=A+nu*np.eye(n)
    stationarity=M@Y-B
    kkt=float(linalg.norm(stationarity,'fro'))
    psd_min=float(linalg.eigvalsh(M)[0])
    met=evaluate(H,S,X0,rho,Pt,X)
    # A finite, explicit lower bound from approximate stationarity, valid for
    # every unit-sphere competitor (up to reported floating-point evaluation).
    # f(W)-f(Y)=d^H M d+2 Re <d,R> + nu (||Y||^2-1).
    ynorm=float(linalg.norm(Y,'fro'))
    rad=1+ynorm
    rho_bound=(max(0.,-psd_min)*rad*rad+2*rad*kkt+abs(nu)*abs(1-norm2(Y)))*scale
    residual_bound=met['weightedObjective']-rho_bound
    # Direct source dual expression; range consistency is separately exposed
    # in singular cases. This value is diagnostic if projected G is nonzero.
    if is_hard:
        dual=c+scale*(-nu-float(np.vdot(Z,pseudo).real))
    else:
        dual=c+scale*(-nu-float(np.sum(np.abs(Z)**2/(gaps+t)[:,None])))
    certscale=max(1.,c,scale,met['weightedObjective'])
    signed_gap=met['weightedObjective']-dual
    accepted=met['energyResidualRelative']<=2e-10 and kkt<=2e-9 and rho_bound<=2e-9*certscale
    out={'schemaVersion':1,'solver':ID,'status':'certified' if accepted else 'numerical-check-failed',
         'branch':branch,'tieBreak':tie_info,'dimensions':{'N':n,'K':H.shape[0],'L':ell},'rho':rho,'Pt':Pt,'X':pack(X),
         'metrics':met,'certificate':{'sourceDualValue':dual,'signedSourceDualGap':signed_gap,
             'residualLowerBound':residual_bound,'residualBoundGap':rho_bound,
             'objectiveCertificateScale':certscale,'lambda':multiplier,'scaledLambda':nu,
             'scaledShiftFromPSDLimit':float(t),'stationarityNormScaled':kkt,
             'minimumShiftedEigenvalueScaled':psd_min,
             'hardCaseRangeResidualScaled':min_g_norm if is_hard else 0.},
         'diagnostics':{'objectiveScaling':scale,'scaledEigenvalues':q.tolist(),
             'scaledEigenvalueGaps':gaps.tolist(),'minimumEigenvalueClusterTolerance':eig_tol,
             'minimumEigenvalueClusterDimension':int(np.sum(min_mask)),
             'minimumClusterProjectionNorm':min_g_norm,'rangeZeroTolerance':g_tol,
             'endpointPseudoinverseEnergyRelative':endpoint_energy,
             'completionEnergy':completion_energy*E,
             'hardCaseNumericalClassification':bool(is_hard),
             'strictlyStructuralHardCaseNotInferredFromTolerance':True,
             'rootMethod':root_method,'rootIterations':int(iterations),'secularEvaluations':evaluations},
         'elapsedMs':1000*(time.perf_counter()-start)}
    if not all_finite(out): raise ArithmeticError('Nonfinite result; no solution certified')
    return out

def all_finite(x):
    if isinstance(x,dict): return all(all_finite(v) for v in x.values())
    if isinstance(x,list): return all(all_finite(v) for v in x)
    return bool(np.isfinite(x)) if isinstance(x,(float,np.floating)) else True

def input_hash(p):
    return hashlib.sha256(json.dumps(p,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('input'); parser.add_argument('--output')
    args=parser.parse_args(); p=json.loads(Path(args.input).read_text())
    out=solve(*(unpack(p[key]) for key in ['H','S','X0']),p['rho'],p['Pt'],tie_break=p.get('tieBreak','canonical'))
    out['inputSha256']=input_hash(p)
    text=json.dumps(out,indent=2,allow_nan=False)+'\n'
    if args.output: Path(args.output).write_text(text)
    else: print(text)
if __name__=='__main__': main()
