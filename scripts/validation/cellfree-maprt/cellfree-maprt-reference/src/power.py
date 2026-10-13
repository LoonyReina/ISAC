"""Eqs. 34–50 CCP power allocation with convex subproblem certificates.

SciPy SLSQP solves the source SOC constraints directly with analytic Jacobians.
The positive t variable is eliminated at its exact optimum for each CCP tangent.
This reduces each source Eq.49 to a convex quadratic objective over a convex set.
All solver returns are retained, including unsuccessful candidates and caps.
"""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np
from scipy.optimize import minimize, nnls


@dataclass
class PowerProblem:
    A: np.ndarray
    B: np.ndarray
    noise_energy: float
    b: np.ndarray
    a: np.ndarray
    power_coeff: np.ndarray
    cap: float
    gamma: float

    def __post_init__(self):
        for name in ['A','B','b','a','power_coeff']:
            setattr(self,name,np.asarray(getattr(self,name),float))
        j=self.A.shape[0]
        if self.A.shape!=(j,j) or self.B.shape!=(j,j) or self.b.shape!=(j-1,) or self.a.shape!=(j-1,j) or self.power_coeff.ndim!=2 or self.power_coeff.shape[1]!=j:
            raise ValueError('power problem dimensions are inconsistent')
        for name in ['A','B']:
            x=getattr(self,name)
            scale=max(np.linalg.norm(x),np.finfo(float).tiny)
            if not np.isfinite(x).all() or np.max(np.abs(x-x.T))>1e-10*scale or np.linalg.eigvalsh(x).min() < -1e-10*scale:
                raise ValueError(f'{name} must be finite real positive semidefinite')
        if not all(np.isfinite(x).all() for x in [self.a,self.b,self.power_coeff]) or np.any(self.a<0) or np.any(self.b<=0) or np.any(self.power_coeff<0) or np.any(self.power_coeff.sum(axis=0)<=0):
            raise ValueError('invalid communication/power coefficients')
        if not all(np.isfinite(x) and x>0 for x in [self.noise_energy,self.cap,self.gamma]):
            raise ValueError('noise, cap, gamma must be positive')
        self.An=self.A/self.noise_energy
        self.Bn=self.B/self.noise_energy
        self.upper=np.array([np.min(np.sqrt(self.cap/self.power_coeff[self.power_coeff[:,i]>0,i])) for i in range(j)])

    def sinr(self,p):
        p=np.asarray(p)
        return float(p@self.An@p/(1+p@self.Bn@p))

    def metrics(self,p):
        p=np.asarray(p)
        return {'sensing_sinr':self.sinr(p),'communication_sinr':((self.b*p[1:])**2/(1+(self.a*p[None,:])**2@np.ones(len(p)))).tolist(),
                'per_ap_power_w':(self.power_coeff@p**2).tolist(),'total_power_w':float(np.sum(self.power_coeff@p**2))}

    def constraints(self,p):
        # Noise normalized to one in each communication denominator.
        norms=np.sqrt(1+np.sum((self.a*p[None,:])**2,axis=1))
        return np.r_[self.b*p[1:]/np.sqrt(self.gamma)-norms,self.cap-self.power_coeff@p**2]

    def jacobian(self,p):
        norms=np.sqrt(1+np.sum((self.a*p[None,:])**2,axis=1))
        jc=-self.a**2*p[None,:]/norms[:,None]
        jc[np.arange(len(self.b)),np.arange(1,len(p))]+=self.b/np.sqrt(self.gamma)
        return np.r_[jc,-2*self.power_coeff*p[None,:]]

    def certificate(self,p,fun,jac,free):
        """Numerical global gap for a convex subproblem via Lagrange lower bound.

        Bound uses nonnegative multipliers plus minimum of residual supporting
        plane over a provable per-stream box. It does not certify the original
        nonconvex ratio optimum. Arithmetic is double precision, not interval.
        """
        c=self.constraints(p); J=self.jacobian(p)[:,free]
        z=p[free]; ub=self.upper[free]
        allc=np.r_[c,z,ub-z]
        allJ=np.r_[J,np.eye(len(free)),-np.eye(len(free))]
        active=allc<=1e-6
        multipliers=np.zeros(len(allc))
        if active.any():
            try:
                multipliers[active]=nnls(allJ[active].T,jac(z),maxiter=10000)[0]
            except RuntimeError:
                pass  # the zero dual remains valid, but likely yields a loose gap
        residual=jac(z)-allJ.T@multipliers
        lower=fun(z)-multipliers@allc+np.sum(np.minimum(-residual*z,residual*(ub-z)))
        return {'objective':float(fun(z)),'lagrange_box_lower_bound':float(lower),
                'global_subproblem_gap_upper':float(fun(z)-lower),
                'minimum_primal_slack':float(min(np.min(allc),0.)),
                'stationarity_infinity':float(np.max(np.abs(residual))),
                'complementarity_infinity':float(np.max(np.abs(multipliers*allc))),
                'multipliers':multipliers.tolist(),'arithmetic':'double-precision numerical certificate; not directed rounding'}

    def _solve(self,quadratic,linear,initial,allow_sensing,maxiter=400):
        free=np.arange(len(self.b)+1) if allow_sensing else np.arange(1,len(self.b)+1)
        def expand(z):
            p=np.zeros(len(self.b)+1);p[free]=z;return p
        q=quadratic[np.ix_(free,free)];lin=linear[free]
        def fun(z):return float(z@q@z+lin@z)
        def jac(z):return 2*q@z+lin
        z0=np.clip(np.asarray(initial)[free],0,self.upper[free])
        def attempt(initial_z):
            res=minimize(fun,initial_z,jac=jac,bounds=[(0,u) for u in self.upper[free]],
                         constraints={'type':'ineq','fun':lambda z:self.constraints(expand(z)),
                                      'jac':lambda z:self.jacobian(expand(z))[:,free]},
                         method='SLSQP',options={'maxiter':maxiter,'ftol':1e-11,'disp':False})
            p=expand(res.x)
            cert=self.certificate(p,fun,jac,free)
            gap_limit=2e-6*max(1.,abs(cert['objective']))
            cert['global_subproblem_gap_acceptance_limit']=gap_limit
            cert['global_subproblem_gap_accepted']=bool(cert['global_subproblem_gap_upper']<=gap_limit)
            valid=bool(res.success and cert['minimum_primal_slack']>=-2e-7 and np.isfinite(p).all() and cert['global_subproblem_gap_accepted'])
            return {'p':p.tolist(),'solver_success':bool(res.success),'accepted':valid,'status':int(res.status),
                    'message':str(res.message),'iterations':int(res.nit),'certificate':cert,'metrics':self.metrics(p),
                    'initial_free_amplitudes':np.asarray(initial_z).tolist()}
        first=attempt(z0);attempts=[first]
        # Status 8 can occur at an almost feasible optimum due to line-search
        # roundoff. One fresh solve from that candidate is allowed, preserving
        # the same objective/constraints and requiring genuine solver success.
        if first['status']==8 and first['certificate']['minimum_primal_slack']>=-2e-7 and first['certificate']['global_subproblem_gap_accepted']:
            candidate=np.array(first['p'])[free]
            retry_initial=np.clip(candidate*(1-1e-7),0,self.upper[free])
            attempts.append(attempt(retry_initial))
        chosen=attempts[-1]
        return chosen | {'solver_attempts':attempts,'retry_policy':'at most one status-8 retry from 1e-7 inward-scaled amplitudes with passing primal/gap checks; no tolerance relaxation'}

    def communication_centric(self,initial=None,allow_sensing=False,maxiter=400):
        if initial is None:initial=self.upper*.5
        return self._solve(np.diag(self.power_coeff.sum(axis=0)),np.zeros(len(self.b)+1),initial,allow_sensing,maxiter)

    def ccp(self,initial,allow_sensing=True,max_iterations=100,tolerance=1e-8,subproblem_maxiter=400):
        p=np.asarray(initial,float).copy()
        if not allow_sensing:p[0]=0
        if np.min(self.constraints(p)) < -2e-7 or np.min(p)<0:
            return {'accepted':False,'termination':'infeasible_initial','initial':p.tolist(),'iterations':[],'final':None}
        history=[];initial_p=p.copy()
        for it in range(max_iterations):
            t=1+p@self.Bn@p;num=p@self.An@p
            # Eq.49 with t_new minimized to its active lower bound.
            q=(num/t**2)*self.Bn
            lin=-2*self.An@p/t
            record=self._solve(q,lin,p,allow_sensing,subproblem_maxiter)
            pnew=np.asarray(record['p'])
            tnew=1+pnew@self.Bn@pnew
            # Source Algorithm 1 step 4: tangent increment, not raw iterate distance.
            gain=float((2*(pnew-p)-(tnew-t)/t*p)@self.An@p/t)
            record.update({'iteration':it+1,'p_previous':p.tolist(),'t_previous':float(t),'t_new':float(tnew),
                           'source_tangent_improvement':gain,'actual_sinr_improvement':self.sinr(pnew)-self.sinr(p)})
            history.append(record)
            if not record['accepted']:
                return {'accepted':False,'termination':'subproblem_failure','initial':initial_p.tolist(),'iterations':history,'final':None}
            if gain < -2e-7 or record['actual_sinr_improvement'] < -2e-7:
                return {'accepted':False,'termination':'nonmonotone_numerical_failure','initial':initial_p.tolist(),'iterations':history,'final':None}
            p=pnew
            if gain<=tolerance:
                return {'accepted':True,'termination':'source_tangent_tolerance','initial':initial_p.tolist(),'iterations':history,'final':record,
                        'global_original_optimality':'not claimed; local stationary candidate'}
        return {'accepted':False,'termination':'iteration_cap','initial':initial_p.tolist(),'iterations':history,'final_candidate':history[-1] if history else None,'final':None}

    def direct_ratio(self,initial,allow_sensing=True,maxiter=500):
        """Independent nonlinear SLSQP ratio optimization; validation only."""
        free=np.arange(len(self.b)+1) if allow_sensing else np.arange(1,len(self.b)+1)
        def expand(z):
            p=np.zeros(len(self.b)+1);p[free]=z;return p
        def objective(z):return -self.sinr(expand(z))
        # Finite-difference objective/constraint derivatives deliberately independent.
        res=minimize(objective,np.asarray(initial)[free],method='SLSQP',
                     bounds=[(0,u) for u in self.upper[free]],
                     constraints={'type':'ineq','fun':lambda z:self.constraints(expand(z))},
                     options={'maxiter':maxiter,'ftol':1e-11})
        p=expand(res.x)
        return {'p':p.tolist(),'success':bool(res.success),'status':int(res.status),'message':str(res.message),
                'minimum_slack':float(min(0,np.min(self.constraints(p)))),'iterations':int(res.nit),'metrics':self.metrics(p)}
