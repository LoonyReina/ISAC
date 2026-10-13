"""Disclosed bounded physical-geometry specialization, not source Fig.2 data.

Synthetic free-space-times-attenuation covariances are intentional replacements
for unrecovered source 3GPP/local-scattering choices. Noise/power units remain SI.
"""
from __future__ import annotations
import numpy as np
from scipy.linalg import block_diag
from .maprt import cn, steering, bistatic_gains, clutter_covariance


def precoders(estimated_channels,h0,regularizer):
    """Eqs.6–7, global normalization and literal printed h0 convention."""
    h=np.asarray(estimated_channels,complex)
    if h.ndim!=2 or h.shape[0]<1 or h.shape[1]<1 or np.shape(h0)!=(h.shape[0],) or not np.isfinite(h).all() or not np.isfinite(h0).all() or not np.isfinite(regularizer) or regularizer<=0:
        raise ValueError('finite channel matrix, matching target vector and positive regularizer required')
    if np.linalg.norm(h0)==0:raise ValueError('target steering channel must be nonzero')
    n,u=h.shape
    comm=np.linalg.solve(h@h.conj().T+regularizer*np.eye(n),h)
    lengths=np.linalg.norm(comm,axis=0)
    if np.any(lengths==0):raise ValueError('each communication channel estimate must be nonzero')
    comm/=lengths
    basis,singular,_=np.linalg.svd(h,full_matrices=False)
    rank=int(np.sum(singular>max(h.shape)*np.finfo(float).eps*singular[0]))
    q=basis[:,:rank]
    sensing=h0-q@(q.conj().T@h0)
    length=np.linalg.norm(sensing)
    if length<1e-12*np.linalg.norm(h0):
        raise ValueError('target direction is entirely in estimated UE subspace')
    return np.column_stack([sensing/length,comm])


def make_scenario(seed=2026101301,channel_samples=512):
    if channel_samples<2:raise ValueError('at least two channel samples required')
    rng=np.random.default_rng(seed)
    tx=np.array([[175,215,15],[325,215,15],[190,325,15],[315,315,15]],float)
    rx=np.array([[225,255,15],[275,245,15]],float)
    target=np.array([250,250,1.5])
    ue=np.array([[180,190,1.5],[325,335,1.5]],float)
    k,r,m,u,tau=4,2,2,2,10
    fc=1.9e9; wavelength=299792458/fc;noise=10**((-94-30)/10)
    atx=steering(target-tx,m);arx=steering(rx-target,m)
    # Eq.7 uses a target channel constructed from the printed steering vectors.
    target_fs=(wavelength/(4*np.pi*np.linalg.norm(target-tx,axis=1)))**2
    h0=(np.sqrt(target_fs)[:,None]*atx).ravel()
    cov=[];hat=[];err=[]
    for user in ue:
        blocks=[]
        for ap in tx:
            direction=user-ap;distance=np.linalg.norm(direction)
            gain=(wavelength/(4*np.pi*distance))**2*1e-3/noise
            phase=np.pi*direction[1]/distance
            idx=np.arange(m)
            corr=.45**np.abs(idx[:,None]-idx[None,:])*np.exp(1j*phase*(idx[:,None]-idx[None,:]))
            blocks.append(gain*corr)
        ri=block_diag(*blocks)
        # Orthogonal-pilot Gaussian MMSE: normalized thermal variance 1/(tau_p Pul).
        rhat=ri@np.linalg.solve(ri+.5*np.eye(k*m),ri)
        cov.append(ri);hat.append((rhat+rhat.conj().T)/2);err.append((ri-rhat+(ri-rhat).conj().T)/2)
    cov,hat,err=map(np.array,[cov,hat,err])
    lh=np.linalg.cholesky(hat);le=np.linalg.cholesky(err)
    estimates=np.einsum('uij,nuj->nui',lh,cn(rng,(channel_samples,u,k*m)))
    errors=np.einsum('uij,nuj->nui',le,cn(rng,(channel_samples,u,k*m)))
    beam_samples=[];effective=[];sensing_leak=[]
    for hhat,error in zip(estimates,errors):
        beam=precoders(hhat.T,h0,1.)
        beam_samples.append(beam)
        effective.append((hhat+error).conj()@beam)
        sensing_leak.append(error.conj()@beam[:,0])
    beams=np.array(beam_samples);effective=np.array(effective);sensing_leak=np.array(sensing_leak)
    b=np.abs(np.mean(effective[:,np.arange(u),np.arange(1,u+1)],axis=0))
    second=np.mean(np.abs(effective)**2,axis=0)
    a2=second.copy();a2[:,0]=np.mean(np.abs(sensing_leak)**2,axis=0)
    a2[np.arange(u),np.arange(1,u+1)]-=b**2
    if np.any(a2<-1e-10):raise ValueError('negative empirical variance')
    a=np.sqrt(np.maximum(a2,0))
    f=np.mean(np.sum(np.abs(beams.reshape(channel_samples,k,m,u+1))**2,axis=2),axis=0)
    # Independent design block, never reused in communication-moment fit.
    hhat=lh@cn(rng,(u,k*m,1));hhat=hhat[:,:,0].T
    beam=precoders(hhat,h0,1.)
    w=beam.reshape(k,m,u+1)
    symbols=np.exp(1j*(np.pi/4+np.pi/2*rng.integers(0,4,(tau,u+1))))
    rtx=np.empty((r,k,m,m),complex);rrx=np.empty_like(rtx)
    for ri in range(r):
        for ki in range(k):
            direction=rx[ri]-tx[ki];dist=np.linalg.norm(direction)
            physical_gain=.3*1e-4*(wavelength/(4*np.pi*dist))**2
            idx=np.arange(m);d=idx[:,None]-idx[None,:]
            rtx[ri,ki]=.35**np.abs(d)*np.exp(1j*np.pi*direction[1]/dist*d)
            rrx[ri,ki]=physical_gain*.25**np.abs(d)*np.exp(-1j*np.pi*direction[1]/dist*d)
    rh=clutter_covariance(rtx,rrx)
    settings={'seed':seed,'Ntx':k,'Nrx':r,'M':m,'Nue':u,'tau_s':tau,'tau_c':200,'tau_p':10,
              'carrier_hz':fc,'bandwidth_hz':20e6,'noise_variance_w':noise,'noise_dbm':-94,
              'per_ap_cap_w':1.,'pilot_power_w':.2,'communication_gamma_db':3.,
              'communication_gamma':10**.3,'channel_moment_samples':channel_samples,
              'target_location_samples':1,'target_fixed':True,'RZF_regularizer_noise_normalized':1.,
              'communication_covariance':'synthetic free-space attenuation 1e-3, Toeplitz 0.45 and geometry phase',
              'clutter_covariance':'synthetic free-space attenuation 1e-4 times source default s=0.3; Toeplitz tx=0.35, rx=0.25',
              'pilot_model':'orthogonal Gaussian MMSE, no contamination; different from unrecovered source pilot assignment',
              'symbols':'known independent unit-modulus QPSK; stored realized block',
              'R_rcs':'identity, independent normalized Swerling-I, constant over each block',
              'steering':'literal source Eq.4/Eq.7; horizontal ULA along y, half-wavelength',
              'geometry':'explicit synthetic coordinates, not digitized source Fig.2','scope':'reduced-dimensional conditional algorithm reference, not a paper-curve reproduction'}
    return dict(settings=settings,tx=tx,rx=rx,target=target,ue=ue,atx=atx,arx=arx,w=w,symbols=symbols,
                r_alpha=np.eye(k*r),r_h=rh,rtx=rtx,rrx=rrx,b=b,a=a,power_coeff=f,
                channel_covariances=cov,estimate_covariances=hat,error_covariances=err,
                moment_effective_channels=effective,moment_sensing_leak=sensing_leak,moment_precoders=beams,
                design_estimated_channels=hhat)
