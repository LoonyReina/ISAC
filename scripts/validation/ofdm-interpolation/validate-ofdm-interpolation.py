#!/usr/bin/env python3
"""Independent educational reference; not an LTE/NR or hardware replication.

Portable independent reference. All processors consume identical active observations.
Python/Numpy double precision; exact formulas and separate direct-loop checks.
"""
import json, math, hashlib
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'data'
C=3e8; FC=5e9; DF=1e6; TR=0.5e-3; N=32; M=33
TU=1/DF; CP=1e-6

class XorShift32:
    def __init__(self, seed):
        if not isinstance(seed,int) or not 0<seed<2**32: raise ValueError('seed must be uint32 and nonzero')
        self.s=seed
    def uniform(self):
        s=self.s; s^=(s<<13)&0xffffffff; s^=s>>17; s^=(s<<5)&0xffffffff
        self.s=s&0xffffffff
        return (self.s+0.5)/4294967296
    def complex_normal(self):
        r=math.sqrt(-2*math.log(self.uniform())); p=2*math.pi*self.uniform()
        return complex(r*math.cos(p),r*math.sin(p))/math.sqrt(2)

def geometry(gap):
    if gap not in (2,4,8,16): raise ValueError('gap must be 2,4,8,16')
    a,b=16-gap//2,16+gap//2
    active=np.ones((M,N),dtype=bool); active[a+1:b,10:22]=False
    return active,a,b

def phasor(range_m,fd_hz,phase=0):
    if not 0<=range_m<150: raise ValueError('range must lie in [0,150) m')
    if not -800<=fd_hz<=800: raise ValueError('Doppler outside teaching domain')
    if not math.isfinite(phase): raise ValueError('phase must be finite')
    return np.exp(1j*(phase-2*np.pi*np.arange(N)[None,:]*DF*2*range_m/C+2*np.pi*fd_hz*np.arange(M)[:,None]*TR))

def interpolate(observed,active):
    """Never extrapolate. Null cells require bracketing active time samples."""
    out=np.array(observed,complex,copy=True)
    if out.shape!=active.shape: raise ValueError('shape mismatch')
    for k in range(N):
        present=np.flatnonzero(active[:,k])
        for m in np.flatnonzero(~active[:,k]):
            below=present[present<m]; above=present[present>m]
            if not len(below) or not len(above): raise ValueError('missing bracketing sample; no extrapolation')
            lo,hi=int(below[-1]),int(above[0]); u=(m-lo)/(hi-lo)
            out[m,k]=(1-u)*observed[lo,k]+u*observed[hi,k]
    return out

def lift_adjoint(template,active):
    """L^H template on original observed coordinates; zeros elsewhere."""
    z=np.where(active,template,0).astype(complex)
    for k in range(N):
        present=np.flatnonzero(active[:,k])
        for m in np.flatnonzero(~active[:,k]):
            lo=int(present[present<m][-1]); hi=int(present[present>m][0]); u=(m-lo)/(hi-lo)
            z[lo,k]+=(1-u)*template[m,k]; z[hi,k]+=u*template[m,k]
    return z

def observe(range_m=37.5,fd_hz=0,gap=8,snr_db=None,phase=0.37,seed=20261011):
    active,a,b=geometry(gap); h=phasor(range_m,fd_hz,phase)
    sigma=0 if snr_db is None else 10**(-float(snr_db)/20)
    rng=XorShift32(seed)
    noise=np.array([rng.complex_normal() for _ in range(N*M)]).reshape(M,N)*sigma
    powers=(np.arange(N)[None,:]+3*np.arange(M)[:,None])%4
    x=np.where(active,1j**powers,0)
    y=x*h+noise
    observed=np.zeros_like(h)
    # Crucial: array division only on active indices, never 0/0 or w/0.
    observed[active]=y[active]/x[active]
    filled=interpolate(observed,active)
    return dict(active=active,a=a,b=b,h=h,x=x,y=y,observed=observed,filled=filled,sigma2=sigma*sigma,seed=seed)

def complex_pair(z): return [float(np.real(z)),float(np.imag(z))]
def at_candidate(o,r,f):
    s=phasor(r,f); k=int(o['active'].sum()); j=N*M
    z0=np.vdot(s,o['observed'])/k; z1=np.vdot(s,o['filled'])/j
    b=lift_adjoint(s,o['active']); v0=1/k; v1=float(np.vdot(b,b).real)/(j*j)
    return dict(range_m=r,fd_hz=f,velocity_mps=f*C/(2*FC),masked=complex_pair(z0),interpolated=complex_pair(z1),masked_power=float(abs(z0)**2),interpolated_power=float(abs(z1)**2),masked_noise_factor=v0,interpolated_noise_factor=v1,interpolated_noise_relative_to_iid_full_grid=v1*j,masked_standardized_power=None if o['sigma2']==0 else float(abs(z0)**2/(o['sigma2']*v0)),interpolated_standardized_power=None if o['sigma2']==0 else float(abs(z1)**2/(o['sigma2']*v1)))

def profile(o,rs,fs):
    # Brute candidates, not labels centered on truth.
    return [at_candidate(o,float(r),float(f)) for r,f in zip(rs,fs)]

def metrics(o,range_m,fd_hz):
    mid=(o['a']+o['b'])//2; k=14
    err=o['filled'][~o['active']]-o['h'][~o['active']]
    missing_nmse=float(np.mean(abs(err)**2))
    row=at_candidate(o,range_m,fd_hz)
    row.update(active_count=int(o['active'].sum()),filled_count=int((~o['active']).sum()),total_transmit_energy_units=int(o['active'].sum()),missing_cell_nmse=missing_nmse,midpoint_ratio=complex_pair(o['filled'][mid,k]/o['h'][mid,k]),midpoint_true=complex_pair(o['h'][mid,k]),midpoint_filled=complex_pair(o['filled'][mid,k]),left_endpoint=complex_pair(o['observed'][o['a'],k]),right_endpoint=complex_pair(o['observed'][o['b'],k]))
    return row

def validate():
    checks=[]
    def check(name,condition,detail):
        if not bool(condition): raise AssertionError((name,detail))
        checks.append(dict(name=name,passed=True,detail=detail))
    # Multiple independent comparisons across the full proposed control domain.
    worst_mid=worst_active=worst_adjoint=worst_direct=0.0
    examples=[]
    for gap in (2,4,8,16):
      for fd in (0,31.25,62.5,125,250,500,800,-800):
        for phase in (0,.37,math.pi/2):
          o=observe(fd_hz=fd,gap=gap,phase=phase)
          mid=16; ratio=o['filled'][mid,14]/o['h'][mid,14]
          expected=math.cos(math.pi*fd*gap*TR)
          worst_mid=max(worst_mid,abs(ratio-expected))
          worst_active=max(worst_active,float(np.max(abs(o['filled'][o['active']]-o['observed'][o['active']]))))
          s=phasor(42.25,73.1)
          adj=lift_adjoint(s,o['active'])
          worst_adjoint=max(worst_adjoint,abs(np.vdot(s,o['filled'])-np.vdot(adj,o['observed'])))
          z=0j
          for m in range(M):
            for k in range(N):
              if o['active'][m,k]: z+=o['observed'][m,k]*complex(math.cos(2*math.pi*(k*DF*2*42.25/C-73.1*m*TR)),math.sin(2*math.pi*(k*DF*2*42.25/C-73.1*m*TR)))
          worst_direct=max(worst_direct,abs(z/np.sum(o['active'])-np.vdot(s,o['observed'])/np.sum(o['active'])))
          if gap==8 and phase==.37: examples.append(metrics(o,37.5,fd))
    check('midpoint chord identity',worst_mid<2e-13,{'max_absolute_error':worst_mid,'states':96})
    check('observed cells unchanged',worst_active==0,{'max_absolute_error':worst_active})
    check('interpolation adjoint identity',worst_adjoint<2e-12,{'max_absolute_error':worst_adjoint})
    check('independent scalar matched sum',worst_direct<2e-13,{'max_absolute_error':worst_direct})
    o=observe(fd_hz=0,phase=.37)
    check('static missing cells recovered algebraically in noiseless constant channel',np.max(abs(o['filled']-o['h']))<2e-13,{'maximum_error':float(np.max(abs(o['filled']-o['h'])))})
    check('null transmit symbols never divided',np.isfinite(o['observed']).all() and np.all(o['x'][~o['active']]==0),{'null_cells':84,'active_cells':972})
    # Small exact linear transform: two endpoints -> three displayed values.
    l=np.array([[1.,0.],[.5,.5],[0.,1.]])
    cov=l@l.T
    check('filled covariance rank equals input count',np.linalg.matrix_rank(cov)==2,{'covariance_sigma2_one':cov.tolist(),'rank':2,'displayed_cells':3})
    # Equality of likelihoods uses transformed template Ls, not the untransformed phasor.
    g=np.array([1+.3j,-.5+.9j]); sm=np.exp(1j*np.array([0.,.83])); afit=np.vdot(sm,g)/2
    r=g-afit*sm; lhs=np.vdot(l@r,np.linalg.pinv(cov)@(l@r)).real; rhs=np.vdot(r,r).real
    check('correct covariance and transformed template preserve residual',abs(lhs-rhs)<1e-13,{'original_squared_residual':float(rhs),'lifted_mahalanobis_residual':float(lhs)})
    # Temporal ambiguity persists if every original observation is on an even time index.
    even=np.arange(0,9,2); f1=-375; f2=f1+1/(2*TR)
    orig1=np.exp(2j*np.pi*f1*even*TR); orig2=np.exp(2j*np.pi*f2*even*TR)
    check('interpolation cannot separate identical observed sequences',np.max(abs(orig1-orig2))<1e-13,{'dopplers_hz':[f1,f2],'observed_times_m':even.tolist(),'max_observed_difference':float(np.max(abs(orig1-orig2)))})
    # Unit-variance proper noise covariance, deterministic seeded MC for one gap column.
    rng=XorShift32(8675309); trials=60000
    noise=np.array([[rng.complex_normal(),rng.complex_normal()] for _ in range(trials)])
    fill=noise@l.T
    empirical=(fill.T@fill.conj())/trials
    cov_err=float(np.max(abs(empirical-cov)))
    check('noise-only covariance Monte Carlo',cov_err<.025,{'seed':8675309,'trials':trials,'maximum_absolute_error':cov_err,'acceptance_tolerance':.025,'expected_covariance':cov.tolist(),'empirical_covariance_real':empirical.real.tolist(),'empirical_covariance_imag':empirical.imag.tolist()})
    # False-alarm calibration is pointwise; do not infer independent search bins.
    # Static sum: midpoint creates a duplicated average; true variance 4.5, naive iid sum variance 2.5.
    sums=fill.sum(axis=1); true_var=4.5; iid_marginal_var=2.5; alpha=.01
    correct_pfa=float(np.mean(abs(sums)**2>-math.log(alpha)*true_var))
    wrong_pfa=float(np.mean(abs(sums)**2>-math.log(alpha)*iid_marginal_var))
    wrong_expected=alpha**(iid_marginal_var/true_var)
    se=math.sqrt(alpha*(1-alpha)/trials)
    check('pointwise threshold accounts for covariance',abs(correct_pfa-alpha)<5*se,{'trials':trials,'target_pfa':alpha,'observed_correct_pfa':correct_pfa,'binomial_standard_error':se,'wrong_independent_marginal_pfa':wrong_pfa,'wrong_model_expected_pfa':wrong_expected,'true_sum_variance':true_var,'wrong_independent_sum_variance':iid_marginal_var})
    # Full-model exact noise variance checked through independent original-observation weights.
    o=observe(snr_db=0); s=phasor(37.5,0); b=lift_adjoint(s,o['active']);
    observed_factor=1/int(o['active'].sum()); filled_factor=float(np.vdot(b,b).real)/(N*M)**2
    check('fill does not create coherent SNR advantage over observed ML at a known template',filled_factor>=observed_factor,{'static_observed_noise_factor':observed_factor,'static_interpolated_noise_factor':filled_factor,'naive_iid_full_grid_factor':1/(N*M)})
    # Closed-form noise amplification and pointwise Cauchy-Schwarz bound.
    closed_error=0.; bound_excess=0.
    for gap in (2,4,8,16):
      o=observe(gap=gap)
      b=lift_adjoint(phasor(37.5,0),o['active'])
      closed_error=max(closed_error,abs(float(np.vdot(b,b).real)-(1050+6*gap*gap)))
      for f in (-800,-375,0,31.25,125,250,800):
        so=phasor(37.5,f); b=lift_adjoint(so,o['active']); true_signal=np.where(o['active'],so,0)
        effective=abs(np.vdot(b,true_signal))**2/np.vdot(b,b).real
        bound_excess=max(bound_excess,float(effective-o['active'].sum()))
    check('closed-form static filled noise norm',closed_error<1e-9,{'maximum_absolute_error':closed_error,'formula':'1050+6*G^2'})
    check('pointwise noncentrality cannot exceed observed-data matched statistic',bound_excess<1e-9,{'maximum_positive_excess':bound_excess,'states':28})
    # Reject invalid observations and do not make up unbracketed boundary values.
    errors=0
    for gap in (0,3,32):
      try: geometry(gap)
      except ValueError: errors+=1
    edge=geometry(8)[0]; edge[0,14]=False
    try: interpolate(np.zeros((M,N),complex),edge)
    except ValueError: errors+=1
    check('invalid gap and unbracketed cells rejected',errors==4,{'expected_rejections':4,'actual_rejections':errors})
    return checks,examples

def main():
    checks,examples=validate()
    fixture=[]
    for args in [dict(fd_hz=0,gap=8),dict(fd_hz=31.25,gap=8),dict(fd_hz=125,gap=8),dict(fd_hz=250,gap=8),dict(fd_hz=31.25,gap=16),dict(fd_hz=-125,gap=4),dict(fd_hz=31.25,gap=8,snr_db=0,seed=20261011)]:
        o=observe(**args); r=37.5; f=args['fd_hz']
        cell_indices=[(12,14),(13,14),(16,14),(19,14),(20,14),(16,9),(16,22)]
        cells=[dict(m=m,k=k,active=bool(o['active'][m,k]),x=complex_pair(o['x'][m,k]),y=complex_pair(o['y'][m,k]),observed=complex_pair(o['observed'][m,k]),filled=complex_pair(o['filled'][m,k]),truth_for_display_only=complex_pair(o['h'][m,k])) for m,k in cell_indices]
        cand=[(37.5,f),(42.1875,f),(37.5,f+1/(M*TR)),(40.,70.),(75.,0.)]
        fixture.append(dict(input=dict({'range_m':r,'phase':.37,'snr_db':None,'seed':20261011},**args),metrics=metrics(o,r,f),cells=cells,candidates=[at_candidate(o,rr,ff) for rr,ff in cand]))
    configs=dict(c_mps=C,carrier_hz=FC,subcarrier_spacing_hz=DF,N=N,M=M,probe_start_interval_s=TR,useful_duration_s=TU,cp_s=CP,frequency_span_hz=(N-1)*DF,nominal_grid_bandwidth_hz=N*DF,first_last_time_span_s=(M-1)*TR,dft_duration_s=M*TR,range_dft_spacing_m=C/(2*N*DF),doppler_dft_spacing_hz=1/(M*TR),velocity_dft_spacing_mps=C/(2*FC*M*TR),range_alias_period_m=C/(2*DF),doppler_alias_period_hz=1/TR,velocity_alias_period_mps=C/(2*FC*TR))
    report=dict(schema='ofdm-interpolation-reference-v1',scope='Independent analytical teaching model; no hardware/NR replication',config=configs,validation=checks,examples=examples,fixtures=fixture)
    out=ROOT/'ofdm-interpolation-validation.json'; out.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
    print(json.dumps(dict(path=str(out),tests_passed=len(checks),config=configs,examples=examples),indent=2))
if __name__=='__main__': main()
