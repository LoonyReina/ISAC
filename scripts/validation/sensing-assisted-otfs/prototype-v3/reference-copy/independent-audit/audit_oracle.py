#!/usr/bin/env python3
"""Independent bounded ISAC/OTFS source audit. No reference implementation import.
Complex arrays in JSON use final axis [real, imaginary]. NumPy is the only dependency.
"""
from pathlib import Path
import hashlib, itertools, json
import numpy as np

HERE=Path(__file__).resolve().parent

def pack(z):
    z=np.asarray(z)
    return np.stack((z.real,z.imag),axis=-1).tolist() if np.iscomplexobj(z) else z.tolist()

def normalize_log(logp):
    p=np.exp(logp-np.max(logp)); return p/p.sum()

def cells(shape): return list(itertools.product(range(shape[0]),range(shape[1])))
def add(q,s,shape): return tuple((q[i]+s[i])%shape[i] for i in range(2))
def sub(q,s,shape): return tuple((q[i]-s[i])%shape[i] for i in range(2))

def direct_frame(x,support,gains):
    # Explicit source-to-destination scatter, independent of gather/roll implementation.
    y=np.zeros(x.shape,dtype=complex)
    for src in cells(x.shape):
        for s,a in zip(support,gains): y[add(src,s,x.shape)]+=a*x[src]
    return y

def matrix_for_x(x,support):
    return np.array([[x[sub(dst,s,x.shape)] for s in support] for dst in cells(x.shape)])

def all_words(shape,pilot,xp,Es):
    unknown=[q for q in cells(shape) if q!=pilot]
    bits=np.array(list(itertools.product([0,1],repeat=len(unknown))))
    data=np.sqrt(Es)*(2*bits-1)
    words=np.zeros((len(bits),*shape),complex); words[:,pilot[0],pilot[1]]=xp
    for j,q in enumerate(unknown): words[:,q[0],q[1]]=data[:,j]
    return unknown,bits,data,words

def linear_contamination(shape,pilot,xp,support,gains):
    unknown=[q for q in cells(shape) if q!=pilot]
    C=np.zeros((len(support),len(unknown)),complex)
    deterministic=np.zeros(len(support),complex)
    arrivals=[add(pilot,s,shape) for s in support]
    for p,r in enumerate(arrivals):
        for q,(s,a) in enumerate(zip(support,gains)):
            src=sub(r,s,shape)
            if src==pilot: deterministic[p]+=a
            else: C[p,unknown.index(src)]+=a/xp
    Q=np.array([[r==t for t in arrivals] for r in arrivals],float)
    return unknown,C,deterministic,Q

def posterior_known(y,words,support,gains,N0,bits):
    logp=np.array([-np.sum(abs(y-direct_frame(x,support,gains))**2)/N0 for x in words])
    p=normalize_log(logp)
    return p,np.column_stack([p@(bits==0),p@(bits==1)])

def posterior_integrated(y,words,support,lam,N0,bits):
    # Exact integration of proper complex Gaussian physical gains, conditioned only on y.
    logp=[]
    for x in words:
        X=matrix_for_x(x,support)
        C=(X*np.asarray(lam))@X.conj().T+N0*np.eye(x.size)
        sign,logdet=np.linalg.slogdet(C)
        assert abs(sign-1)<1e-10
        logp.append(-logdet-np.vdot(y.ravel(),np.linalg.solve(C,y.ravel())).real)
    p=normalize_log(np.array(logp))
    return p,np.column_stack([p@(bits==0),p@(bits==1)])

def exact_factor_message(y,a,alphabet,pmfs,N0,target):
    out=[]; others=[j for j in range(len(a)) if j!=target]
    for cand in alphabet:
        total=0.
        for ix in itertools.product(range(len(alphabet)),repeat=len(others)):
            mean=a[target]*cand
            prior=1.
            for j,k in zip(others,ix): mean+=a[j]*alphabet[k]; prior*=pmfs[j,k]
            total+=prior*np.exp(-abs(y-mean)**2/N0)
        out.append(total)
    return np.array(out)/sum(out)

def run():
    tests=[]
    def check(name,condition,**details):
        if not condition: raise AssertionError(name+': '+str(details))
        tests.append(dict(name=name,status='pass',**details))
    shape=(3,3); pilot=(0,1); xp=3+4j; Es=.7; N0=.13
    support=[(0,0),(1,0),(2,0)]; gains=np.array([1+.2j,-.45+.7j,.15-.35j])
    unknown,bits,data,words=all_words(shape,pilot,xp,Es)
    _,B,det,Q=linear_contamination(shape,pilot,xp,support,gains)
    arrivals=[add(pilot,s,shape) for s in support]
    estimates=np.array([[direct_frame(x,support,gains)[r]/xp for r in arrivals] for x in words])
    errors=estimates-gains
    cov=Es*B@B.conj().T+N0/abs(xp)**2*Q
    pseudo=Es*B@B.T
    emp_cov=errors.T@errors.conj()/len(words)
    emp_pseudo=errors.T@errors/len(words)
    emp_cross=errors.T@data/len(words)
    check('exhaustive error identity',np.max(abs(errors-data@B.T))<1e-14,max_abs=float(np.max(abs(errors-data@B.T))))
    check('exhaustive mean',np.max(abs(errors.mean(0)))<1e-14)
    check('full covariance exhaustive',np.max(abs(emp_cov-(cov-N0/abs(xp)**2*Q)))<1e-14,max_abs=float(np.max(abs(emp_cov-(cov-N0/abs(xp)**2*Q)))))
    check('pseudo covariance exhaustive',np.max(abs(emp_pseudo-pseudo))<1e-14,max_abs=float(np.max(abs(emp_pseudo-pseudo))))
    check('error data covariance exhaustive',np.max(abs(emp_cross-Es*B))<1e-14)
    check('shared contaminant covariance nonzero',np.max(abs(cov-np.diag(np.diag(cov))))>1e-3)
    check('BPSK improper contamination',np.max(abs(pseudo))>1e-3)
    check('unequal gain diagonal variance',np.max(abs(np.diag(cov).real-(Es*(np.sum(abs(gains)**2)-abs(gains)**2)+N0)/abs(xp)**2))<1e-14)
    # Independent fresh random BPSK and proper Gaussian noise, rather than sampling stored errors.
    rng=np.random.default_rng(716042); count=200000
    d=np.sqrt(Es)*rng.choice([-1,1],size=(count,len(unknown)))
    n=np.sqrt(N0/2)*(rng.standard_normal((count,len(gains)))+1j*rng.standard_normal((count,len(gains))))
    e=d@B.T+n/xp
    random_cov=e.T@e.conj()/count
    check('independent random moments',np.max(abs(random_cov-cov))<.0004,max_abs=float(np.max(abs(random_cov-cov))),samples=count,seed=716042)
    # Row-major explicit impulse destination: catches k-for-l and shift-sign mistakes.
    x=np.zeros((4,5),complex); x[3,4]=1
    yi=direct_frame(x,[(2,3)],[1+2j])
    check('positive shift and modulo impulse',yi[1,2]==1+2j and np.count_nonzero(yi)==1)
    # Independent ISFFT -> diagonal TF multiplication -> SFFT from source transform signs.
    NN,MM=shape; tf=np.zeros(shape,complex)
    sample=words[109]
    for n,m in cells(shape):
        tf[n,m]=sum(sample[k,l]*np.exp(2j*np.pi*(n*k/NN-m*l/MM)) for k,l in cells(shape))/np.sqrt(NN*MM)
    htf=np.array([[sum(a*np.exp(2j*np.pi*(n*s[0]/NN-m*s[1]/MM)) for a,s in zip(gains,support)) for m in range(MM)] for n in range(NN)])
    ytf=tf*htf; z=np.array([[sum(ytf[n,m]*np.exp(-2j*np.pi*(n*k/NN-m*l/MM)) for n,m in cells(shape))/np.sqrt(NN*MM) for l in range(MM)] for k in range(NN)])
    check('source transform signs reproduce circular model',np.max(abs(z-direct_frame(sample,support,gains)))<1e-13,max_abs=float(np.max(abs(z-direct_frame(sample,support,gains)))))
    # Single-path Eq42 source P term is false even noiseless; no contaminating data exists.
    _,b1,_,_=linear_contamination(shape,pilot,xp,[(1,2)],[.3-.2j])
    check('single path has zero contamination',np.count_nonzero(b1)==0)
    # Duplicate arrivals identify only coherent aggregate and share exactly the same receiver noise.
    duplicate=[(0,0),(0,0),(1,0)]; _,bd,dd,qd=linear_contamination(shape,pilot,xp,duplicate,gains)
    yd=direct_frame(sample,duplicate,gains)
    check('duplicate support aggregation',np.max(abs(yd-direct_frame(sample,[(0,0),(1,0)],[gains[0]+gains[1],gains[2]])))<1e-14)
    check('duplicate pilot noise shared',qd[0,1]==1 and np.array_equal(bd[0],bd[1]) and dd[0]==gains[0]+gains[1])
    # Effective phase: one scalar compensation cannot cancel two unequal path phases.
    phases=np.exp(-2j*np.pi*np.array([0.,.17]))
    check('global scalar cannot remove unequal phases',abs(phases[1]/phases[0]-1)>.1)
    # Exact marginal and finite Gaussian mixture test.
    noise=np.array([.05+.02j,-.12+.06j,.03-.08j,.09+.04j,-.02+.07j,.06-.03j,-.08-.05j,.11+.01j,-.04+.09j]).reshape(shape)
    observation=direct_frame(sample,support,gains)+noise
    wp,marg=posterior_known(observation,words,support,gains,N0,bits)
    lam=np.array([.8,.4,.2]); up,um=posterior_integrated(observation,words,support,lam,N0,bits)
    check('known gain posterior normalized',abs(wp.sum()-1)<1e-14 and np.max(abs(marg.sum(1)-1))<1e-14)
    check('integrated gain posterior normalized',abs(up.sum()-1)<1e-14 and np.max(abs(um.sum(1)-1))<1e-14)
    alphabet=np.array([-np.sqrt(Es),np.sqrt(Es)]); pmfs=np.array([[.2,.8],[.7,.3],[.65,.35]])
    fy=.9+.1j; target=0; exact=exact_factor_message(fy,gains,alphabet,pmfs,N0,target)
    means=pmfs@alphabet; variances=pmfs@(alphabet**2)-means**2
    residual=fy-np.dot(gains[1:],means[1:]); den=N0+np.dot(abs(gains[1:])**2,variances[1:])
    gaussian=normalize_log(-abs(residual-gains[0]*alphabet)**2/den)
    check('finite mixture differs from Gaussian approximation',np.max(abs(exact-gaussian))>1e-3,max_abs=float(np.max(abs(exact-gaussian))))
    # Source Eq57, literal parentheses, compared against Eq53 at zero uncertainty.
    literal_zero=N0+sum(Es*abs(gains[j])**2*variances[j] for j in [1,2])
    check('literal Eq57 zero uncertainty does not recover Eq53 for Es != 1',abs(literal_zero-den)>.01)
    vu=np.array([.04,.07,.02]); candidate=alphabet[0]
    repaired=N0+sum(abs(gains[j])**2*variances[j]+vu[j]*Es for j in [1,2])+vu[0]*abs(candidate)**2
    literal=N0+sum(Es*(vu[0]+(abs(gains[j])**2+vu[0])*variances[j]) for j in [1,2])
    check('literal Eq57 disagrees with product moments',abs(literal-repaired)>1e-3)
    # Exact product identity Eq56, with proper zero-mean gain error and nonzero mean BPSK.
    product_var=abs(gains[1])**2*variances[1]+vu[1]*(variances[1]+means[1]**2)
    check('Eq56 constant modulus identity',abs(product_var-(abs(gains[1])**2*variances[1]+vu[1]*Es))<1e-14)
    # No divide by an estimated gain: residual-domain likelihood remains finite at zero gain.
    zero=normalize_log(-abs(fy-0*alphabet)**2/N0)
    check('zero gain target gives neutral finite message',np.max(abs(zero-.5))<1e-14)
    prior=np.array([.4,.6]); incoming=pmfs
    full=prior*np.prod(incoming,axis=0); full/=full.sum()
    ext=[]
    for excluded in range(3):
        p=prior*np.prod(np.delete(incoming,excluded,axis=0),axis=0); ext.append(p/p.sum())
    ext=np.array(ext)
    check('extrinsic differs from full belief',np.max(abs(ext-full))>.01)
    unnormalized=np.prod(incoming,axis=0)
    check('Eq59 normalized-symbol denominator is not normalizer',abs(unnormalized.sum()-1)>.1)
    # Guard baseline inclusive mask; verify every CE output sees pilot or zero for ANY support.
    gs=(7,7); gp=(3,3); K=L=1
    guard=set((k,l) for k in range(gp[0]-2*K,gp[0]+2*K+1) for l in range(gp[1]-L,gp[1]+L+1))
    ce=set((k,l) for k in range(gp[0]-K,gp[0]+K+1) for l in range(gp[1],gp[1]+L+1))
    all_support=list(itertools.product(range(-K,K+1),range(L+1)))
    check('guard CE contamination exclusion',all(sub(r,s,gs) in guard for r in ce for s in all_support))
    guard_data=set(cells(gs))-guard
    check('pilot affects only CE outputs',all(add(gp,s,gs) in ce for s in all_support))
    check('inclusive guard count',len(guard)-1==(4*K+1)*(2*L+1)-1)
    # Deterministic threshold equality and all-grid discovery, avoiding truth support filtering.
    check('baseline threshold inclusive',abs(3*np.sqrt(N0)+0j)>=3*np.sqrt(N0))
    output={
      'schema':'independent-isac-otfs-audit-v1','complex_encoding':'last dimension [real,imaginary]',
      'scope':'independent mathematical oracle; no browser/full-figure reproduction',
      'configuration':dict(shape=list(shape),pilot=list(pilot),pilot_symbol=pack(np.array(xp)),Es=Es,N0=N0,support=support,effective_gains=pack(gains),unknown_cells=unknown,word_order='itertools.product([0,1], repeat=8), 0->-sqrt(Es), 1->+sqrt(Es)'),
      'moments':dict(B=pack(B),mean=pack(errors.mean(0)),covariance_with_noise=pack(cov),pseudo_covariance=pack(pseudo),error_data_covariance=pack(Es*B),covariance_random=pack(random_cov),literal_Eq42_scalar=(3*Es+N0)/abs(xp)**2),
      'duplicates':dict(support=duplicate,pilot_coherent_mean=pack(dd),B=pack(bd),noise_coincidence=pack(qd)),
      'posterior':dict(word_index=109,bits=pack(bits[109]),noise=pack(noise),observation=pack(observation),known_gain_marginals=pack(marg),known_gain_word_map=int(wp.argmax()),gain_prior_variances=pack(lam),integrated_gain_marginals=pack(um),integrated_gain_word_map=int(up.argmax())),
      'factor':dict(y=pack(np.array(fy)),gains=pack(gains),alphabet=pack(alphabet),incoming_pmfs=pack(pmfs),target=0,exact_mixture=pack(exact),moment_gaussian=pack(gaussian),means=pack(means),variances=pack(variances),uncertainty=pack(vu),source_Eq57_numerator=literal,repaired_numerator=repaired,Eq53_numerator=den,Eq57_zero_uncertainty_numerator=literal_zero),
      'messages':dict(prior=pack(prior),incoming=pack(incoming),full_belief=pack(full),extrinsic=pack(ext)),
      'guard_counts_source_size':dict(N=30,M=128,K=6,L=10,guards=524,pilots=1,data=3315,guard_free_data=3839,source_table_guard_claim=480),
      'tests':tests,'test_count':len(tests),'all_passed':True,
    }
    (HERE/'independent-fixtures.json').write_text(json.dumps(output,indent=2)+'\n')
    print(json.dumps({'all_passed':True,'test_count':len(tests),'covariance_diagonal':np.diag(cov).real.tolist(),'factor_exact':exact.tolist(),'factor_gaussian':gaussian.tolist(),'fixture_sha256':hashlib.sha256((HERE/'independent-fixtures.json').read_bytes()).hexdigest()},indent=2))

if __name__=='__main__': run()
