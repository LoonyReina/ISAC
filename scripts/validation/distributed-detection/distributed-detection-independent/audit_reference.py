#!/usr/bin/env python3
"""Independent, executable audit of frozen research reference.
No edits to producer files. Requires numpy, scipy, mpmath.
Usage: python audit_reference.py --reference /path/to/detection_reference.py
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, inspect, json, math, pathlib, random, sys
import numpy as np
import mpmath as mp
from scipy.special import i0
from scipy.integrate import quad
from scipy.stats import binomtest
from oracle import tail as hp_tail, quantile as hp_quantile, parameters as hp_parameters, energy_log_lrt

ROOT=pathlib.Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--reference',default='scripts/distributed-detection-reference/detection_reference.py')
args=parser.parse_args()
path=pathlib.Path(args.reference)
reference_sha_before=hashlib.sha256(path.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('reference',path)
r=importlib.util.module_from_spec(spec);sys.modules[spec.name]=r;spec.loader.exec_module(r)
checks=[];metrics={};failures=[]

def check(name, fn):
    try:
        result=fn()
        checks.append({'name':name,'passed':True,'detail':result})
    except Exception as e:
        failures.append(name)
        checks.append({'name':name,'passed':False,'error':repr(e)})

def exact(x): return mp.mpf(float(x))
def near(a,b,rtol=2e-12,atol=1e-14):
    assert math.isclose(float(a),float(b),rel_tol=rtol,abs_tol=atol),(a,b)


def tail_limits():
    worst=0.;worst_cdf=0.;case=None
    for ratio in [0,1e-20,1e-12,1e-6,.25,.9,1-1e-12,1]:
        for x in [1e-15,1e-12,1e-6,.01,.1,1,10,100,1000]:
            truth=hp_tail(exact(x),1,exact(ratio))
            log_truth=mp.log(truth)
            observed=r.log_tail(x,1,ratio)
            error=float(abs((mp.mpf(observed)-log_truth)/log_truth))
            if error>worst: worst,case=error,(x,ratio)
            assert error<2e-13,(x,ratio,error)
            lower_truth=1-truth
            observed_cdf=r.lower_cdf(x,1,ratio)
            error_cdf=float(abs((mp.mpf(observed_cdf)-lower_truth)/lower_truth))
            worst_cdf=max(worst_cdf,error_cdf)
            assert error_cdf<2e-13,(x,ratio,error_cdf)
            near(r.tail(x,ratio,1),r.tail(x,1,ratio),0,0)
    assert r.tail(0,0,0)==0 and r.tail(-1,0,0)==1
    assert r.tail(0,1,0)==1 and r.tail(math.inf,1,1)==0
    return {'cases':72,'max_log_tail_relative_error':worst,'max_lower_cdf_relative_error':worst_cdf,'worst_case':case}


def calibration_grid():
    worst_t=0.;worst_logp=0.;worst_pd=0.;worst_miss=0.;worstcase=None;n=0
    for rho in [0,1e-10,1e-8,.001,1,3,1e4]:
        for k in [0,1e-12,1e-8,.25,.75,1-1e-8,1-1e-12,1]:
            a,b,c=hp_parameters(exact(rho),exact(k))
            for p in [1e-12,1e-6,.05,.5,1-1e-6,1-1e-12]:
                model=r.Model(rho,k);cal=r.calibrated_detector(model,p);n+=1
                p_hp=exact(p)
                if rho==0:
                    assert cal.joint_threshold==0 and cal.joint_pd==p and cal.joint_tie_randomization==p
                    continue
                t=hp_quantile(p_hp,*a)
                err_t=float(abs(exact(cal.joint_threshold)/t-1))
                if err_t>worst_t: worst_t,worstcase=err_t,(rho,k,p)
                assert err_t<2e-13,(rho,k,p,'threshold',err_t)
                actual=hp_tail(exact(cal.joint_threshold),*a)
                # Sensitive to both extreme upper tails and small complement near Pfa=1.
                err_p=float(abs(mp.log(actual)/mp.log(p_hp)-1))
                worst_logp=max(worst_logp,err_p)
                assert err_p<5e-13,(rho,k,p,'pfa',err_p)
                pd=hp_tail(t,*b)
                err_pd=float(abs(exact(cal.joint_pd)-pd))
                worst_pd=max(worst_pd,err_pd)
                assert err_pd<2e-13,(rho,k,p,'pd',err_pd)
                err_miss=float(abs(exact(cal.joint_miss)/(1-pd)-1))
                worst_miss=max(worst_miss,err_miss)
                assert err_miss<5e-13,(rho,k,p,'miss',err_miss)
                assert cal.joint_pd+5e-14>=cal.energy_sum_pd
                te=hp_quantile(p_hp,1,1)
                near(cal.energy_threshold,te,2e-13,0)
                near(cal.energy_sum_pd,hp_tail(te,*c),2e-13,2e-14)
                if k==0: near(cal.joint_pd,cal.energy_sum_pd,2e-13,0)
    return {'cases':n,'max_threshold_relative_error':worst_t,'max_log_pfa_relative_error':worst_logp,'max_pd_absolute_error':worst_pd,'max_miss_relative_error':worst_miss,'worst_threshold_case':worstcase}


def matrix_and_phase():
    rng=np.random.default_rng(4371109);worst=0.
    for rho in [1e-10,.001,3,1e4]:
        for k in [0,1e-8,.75,1-1e-12,1]:
            model=r.Model(rho,k)
            for _ in range(12):
                z=rng.normal(size=2)+1j*rng.normal(size=2)
                q=r.quadratic_eigen(z,model);qmatrix=r.quadratic_matrix(z,model)
                near(q,qmatrix,2e-12,1e-20);worst=max(worst,abs(q-qmatrix))
                theta1,theta2=rng.uniform(-math.pi,math.pi,size=2)
                zrot=z*np.exp(1j*np.array([theta1,theta2]))
                qrot=r.quadratic_matrix(zrot,model,correlation_phase=theta1-theta2)
                near(q,qrot,2e-12,1e-20)
                near(q,r.quadratic_eigen(z*np.exp(1j*theta1),model),2e-12,1e-20)
    return {'cases':240,'max_matrix_eigen_absolute_error':worst,'coordinate_covariance':'C12 phase transforms by theta1 minus theta2'}


def raw_sufficiency():
    rng=np.random.default_rng(41917);n=0;worst=0.
    for length in [1,2,5,11]:
        s=rng.normal(size=length)+1j*rng.normal(size=length);E=np.vdot(s,s).real
        noise=.7
        for rho,k in [(0,.75),(.02,0),(3,.75),(3,1)]:
            model=r.Model(rho,k);y=rng.normal(size=(2,length))+1j*rng.normal(size=(2,length))
            z=r.matched_pair(y,s,noise)
            C0=noise*np.eye(2*length,dtype=complex)
            R=np.array([[1,k],[k,1]])
            C1=C0+(rho*noise/E)*np.kron(R,np.outer(s,s.conj()))
            Y=y.reshape(-1)
            llr=float((np.vdot(Y,np.linalg.solve(C0,Y))-np.vdot(Y,np.linalg.solve(C1,Y))).real-np.linalg.slogdet(C1)[1]+np.linalg.slogdet(C0)[1])
            observed=r.raw_log_likelihood_ratio(y,s,noise,model)
            near(observed,llr,2e-11,1e-11);worst=max(worst,abs(observed-llr))
            # Arbitrary orthogonal components have no effect on z or the LLR.
            e=rng.normal(size=(2,length))+1j*rng.normal(size=(2,length))
            for station in range(2): e[station]-=s*np.vdot(s,e[station])/E
            zres=r.matched_pair(y+e,s,noise)
            assert np.allclose(z,zres,rtol=2e-13,atol=2e-13)
            near(observed,r.raw_log_likelihood_ratio(y+e,s,noise,model),2e-12,1e-12)
            phase=.71
            near(observed,r.raw_log_likelihood_ratio(y,s*np.exp(1j*phase),noise,model),2e-12,1e-12)
            n+=1
    return {'cases':n,'max_full_dense_llr_absolute_error':worst}


def counterexamples():
    model=r.Model(3,.75);cal=r.calibrated_detector(model,.05)
    p=[math.sqrt(2),math.sqrt(2)];m=[math.sqrt(2),-math.sqrt(2)]
    assert r.local_energies(p)==r.local_energies(m)
    near(r.quadratic_eigen(p,model),3.36)
    near(r.quadratic_eigen(m,model),12/7)
    assert r.decide_joint(p,cal) and not r.decide_joint(m,cal)
    assert not r.decide_energy_sum(p,cal) and not r.decide_energy_sum(m,cal)
    le_balanced=energy_log_lrt(2,2,3,.75);le_unbalanced=energy_log_lrt(4,0,3,.75)
    assert le_balanced>le_unbalanced
    # Direct phase integration independently reconstructs the energy density ratio.
    for e1,e2 in [(2,2),(4,0),(.3,1.7)]:
        average=quad(lambda phi: math.exp(r.log_likelihood_ratio([math.sqrt(e1),math.sqrt(e2)*np.exp(1j*phi)],model)),0,2*math.pi,epsabs=1e-12)[0]/(2*math.pi)
        near(math.log(average),energy_log_lrt(e1,e2,3,.75),2e-12,1e-12)
    return {'same_energy_Q':[r.quadratic_eigen(p,model),r.quadratic_eigen(m,model)],'energy_LLR_same_sum':[float(le_balanced),float(le_unbalanced)],'interpretation':'Energy sum is not the optimal two-energy test when rho*kappa>0'}


def monte_carlo():
    rng=np.random.default_rng(843287);N=300000;rho=3;k=.75;model=r.Model(rho,k);cal=r.calibrated_detector(model,.05)
    def cn(shape): return (rng.normal(size=shape)+1j*rng.normal(size=shape))/math.sqrt(2)
    z0=cn((N,2));alpha=cn((N,2));alpha[:,1]=k*alpha[:,0]+math.sqrt(1-k*k)*alpha[:,1]
    z1=math.sqrt(rho)*alpha+cn((N,2));ap,am=model.null_weights
    rows=[]
    for name,z,truth in [('H0',z0,.05),('H1',z1,cal.joint_pd)]:
        Q=ap*abs((z[:,0]+z[:,1])/math.sqrt(2))**2+am*abs((z[:,0]-z[:,1])/math.sqrt(2))**2
        count=int(np.count_nonzero(Q>cal.joint_threshold));ci=binomtest(count,N).proportion_ci(.99)
        assert ci.low<=truth<=ci.high,(name,count/N,truth,ci)
        rows.append({'hypothesis':name,'joint_rate':count/N,'joint_count':count,'joint_99pct_exact_CI':[ci.low,ci.high],'analytic':truth})
        e=np.sum(abs(z)**2,axis=1);count_e=int(np.count_nonzero(e>cal.energy_threshold));ci_e=binomtest(count_e,N).proportion_ci(.99)
        truth_e=.05 if name=='H0' else cal.energy_sum_pd
        assert ci_e.low<=truth_e<=ci_e.high,(name,count_e/N,truth_e,ci_e)
        rows[-1].update({'energy_rate':count_e/N,'energy_count':count_e,'energy_99pct_exact_CI':[ci_e.low,ci_e.high],'energy_analytic':truth_e})
    # Generator target/noise values are unknown to detector; additionally check actual raw generator normalization.
    rg=random.Random(453893);s=r.qpsk_waveform(4,2.7)
    generated=np.array([r.matched_pair(r.generate_observations(rg,model,s,.8,target_present=True),s,.8) for _ in range(20000)])
    covariance=generated.T@generated.conj()/len(generated)
    assert np.allclose(covariance,[[1+rho,rho*k],[rho*k,1+rho]],rtol=.03,atol=.04),covariance
    return {'seed':843287,'trials_per_hypothesis':N,'interval':'99% exact Clopper-Pearson, pointwise not simultaneous','rows':rows,'raw_generator_trials':20000,'raw_generator_seed':453893,'raw_generator_covariance':[[str(v) for v in row] for row in covariance]}


def zero_and_validation():
    cal=r.calibrated_detector(r.Model(0,.75),.05)
    for u in [0,.01,.049999]: assert r.decide_joint([9,9],cal,tie_uniform=u)
    for u in [.05,.7,.9999]: assert not r.decide_joint([0,0],cal,tie_uniform=u)
    for bad in [-1,1e-12,10001,float('nan'),float('inf')]:
        try: r.Model(bad,.5)
        except ValueError: pass
        else: raise AssertionError(('rho accepted',bad))
    for bad in [-1e-10,1.00001,float('nan')]:
        try: r.Model(1,bad)
        except ValueError: pass
        else: raise AssertionError(('kappa accepted',bad))
    assert list(inspect.signature(r.decide_joint).parameters)==['z','calibration','tie_uniform']
    assert 'target_present' not in inspect.signature(r.raw_log_likelihood_ratio).parameters
    return {'rho_zero':'Exact Pfa requires external independent uniform; statistical independence cannot be enforced by function signature','input_guards':'Declared finite ranges checked','truth_firewall':'Detector signatures take observations/model only; simulation labels remain generator inputs'}


def ledger():
    led=r.resource_ledger(16,blocks=7,template_mode='once',bits_per_real=32,model_down_reals_per_update=6,model_updates=2)
    raw=led['schemes']['central_raw'];cm=led['schemes']['local_complex_match'];en=led['schemes']['local_energy_sum']
    assert raw['total_reals']==448 and cm['total_reals']==104 and en['total_reals']==90
    for x in [raw,cm,en]: assert x['payload_bits']==32*x['total_reals']
    return {'length':16,'blocks':7,'raw_reals':448,'complex_reals':104,'energy_reals':90,'scope':'Numerical payload only, center already knows template/model, unicast to two receivers, one template update and two model updates'}

for name,fn in [('tail_equal_zero_near_limits',tail_limits),('fixed_pfa_336_case_high_precision_grid',calibration_grid),('matrix_eigen_conjugation_phase',matrix_and_phase),('full_raw_gaussian_and_residual_sufficiency',raw_sufficiency),('phase_and_energy_domain_counterexamples',counterexamples),('independent_monte_carlo',monte_carlo),('zero_randomization_input_truth_contract',zero_and_validation),('finite_payload_ledger',ledger)]:
    check(name,fn)
    print(name, 'PASS' if checks[-1]['passed'] else 'FAIL',flush=True)
assert reference_sha_before==hashlib.sha256(path.read_bytes()).hexdigest(), 'Reference changed during audit; rerun against frozen bytes'
report={'reference_path':str(path),'reference_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'oracle_precision_decimal_digits':mp.mp.dps,'checks':checks,'failures':failures,'passed':not failures,'limitations':['No browser, repository edits, publishing, or paper MAPRT reproduction','Monte Carlo verifies ordinary representative probabilities, not 1e-12 tails','Numeric grid is finite; it does not prove every floating-point input','Energy-message optimal LRT is derived/phase-integrated, its full optimal ROC is not computed']}
(ROOT/'audit-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'failures':failures,'reference_sha256':report['reference_sha256']},indent=2))
sys.exit(bool(failures))
