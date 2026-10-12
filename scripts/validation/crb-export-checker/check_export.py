"""Independent NumPy audit of CRB point Eq33 exported states, never an optimizer.
No JS imports/execution, CVXPY, network, stored optima, or browser provenance inference.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np

VERSION = 'crb-point-drs-v0.4-feasibility'
FORMAT = 'isac-crb-multiuser-run'
CORE_HASH = '208f4d91db12d5c24d8bff921a1f31806cea846cb3f1a3a6101f7520f2e335c1'
RUNTIME = dict(zip(['hermitian.js','linalg.js','core.js','worker.js'], [
 'da5721e4c3abfc616792c06684add0a41925f53125afc2e4abe6279e6c7bec7a',
 '11b0de23151c48a4cedcad17405bf26a610739b22db37378b2d77828af560d0d',CORE_HASH,
 'cdf0412a332c79c6e7ff6d5340285b78a434838aa6c560c9b35762ec4775520b']))
TOLERANCES = dict(rankRelative=1e-8,rankOneRelative=1e-4,powerRelative=2e-6,sinrRelative=2e-5,gapAbsolute=1e-7,gapRelative=1e-4,gapNegative=2e-7,epigraphStationarity=1e-9,physicalReplayRelative=2e-8)
TERMINAL = ['converged','iteration_limit','numerical_rejection','numerical_failure','infeasible_bound','infeasible_certificate','rank_condition_not_met','cancelled']


def require(test, message):
    if not bool(test): raise ValueError(message)


def num(v, name='number'):
    require(type(v) in (int,float) and math.isfinite(v), name+' must be finite numeric')
    return v


def close(a,b,label,atol=1e-9,rtol=2e-8):
    a,b=np.asarray(a),np.asarray(b)
    require(a.dtype.kind in 'ifc' and b.dtype.kind in 'ifc' and a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all() and np.allclose(a,b,atol=atol,rtol=rtol),label+' mismatch')


def decode(v,shape):
    require(isinstance(v,dict) and set(v)=={'real','imag'},'complex matrix encoding')
    a,b=np.asarray(v['real']),np.asarray(v['imag'])
    require(a.dtype.kind in 'if' and b.dtype.kind in 'if' and a.shape==b.shape==shape,'complex matrix shape/type')
    require(np.isfinite(a).all() and np.isfinite(b).all(),'nonfinite complex matrix')
    return a+1j*b


def coord(M):
    n=len(M)
    return np.r_[M.diagonal().real,[np.sqrt(2)*M[i,j].real for i in range(n) for j in range(i+1,n)],[np.sqrt(2)*M[i,j].imag for i in range(n) for j in range(i+1,n)]]


def mat(v,n):
    M=np.diag(np.asarray(v[:n],complex));p=n
    for i in range(n):
        for j in range(i+1,n): M[i,j]=M[j,i]=v[p]/np.sqrt(2);p+=1
    for i in range(n):
        for j in range(i+1,n): M[i,j]+=1j*v[p]/np.sqrt(2);M[j,i]-=1j*v[p]/np.sqrt(2);p+=1
    return M


def psd(M):
    ev,U=np.linalg.eigh(M)
    return (U*np.maximum(ev,0))@U.conj().T


def model(inp):
    theta=np.deg2rad(inp['thetaDegrees'])
    def steering(n):
        p=np.arange(n)-(n-1)/2;v=np.exp(1j*np.pi*p*np.sin(theta))
        return v,1j*np.pi*p*np.cos(theta)*v
    a,ad=steering(inp['Nt']);b,bd=steering(inp['Nr'])
    A=np.outer(b,a.conj());D=np.outer(bd,a.conj())+np.outer(b,ad.conj())
    sA=float(np.linalg.norm(A)**2);sD=float(np.linalg.norm(D)**2)
    return dict(A=A,D=D,a=a,ad=ad,sA=sA,sD=sD,B0=A.conj().T@A/sA,B2=D.conj().T@D/sD,B1=D.conj().T@A/np.sqrt(sA*sD))


def input_check(inp):
    require(set(inp)=={'Nt','Nr','K','L','powerMw','communicationNoiseMw','radarNoiseMw','thetaDegrees','alpha','H','gammaDb'},'input keys')
    for key in ['Nt','Nr','K','L']:require(type(inp[key]) is int,key+' integer')
    n,k,nr=inp['Nt'],inp['K'],inp['Nr']
    require(4<=n<=16 and 2<=k<=4 and k<n and n<nr<=24 and n<inp['L']<=4096,'input dimension domain')
    for key in ['powerMw','communicationNoiseMw','radarNoiseMw']:require(num(inp[key],key)>0,'positive '+key)
    require(inp['powerMw']<=1e6 and 1e-5<=inp['communicationNoiseMw']/inp['powerMw']<=1,'resource domain')
    require(-5<=num(inp['gammaDb'])<=30 and abs(num(inp['thetaDegrees']))<=60,'angle/Gamma domain')
    require(set(inp['alpha'])=={'real','imag'},'alpha encoding')
    ar,ai=[num(inp['alpha'][x]) for x in ['real','imag']]
    a2=ar*ar+ai*ai
    require(math.isfinite(a2) and a2>0,'alpha squared magnitude')
    H=decode(inp['H'],(k,n));require(np.max(abs(H))<=10,'channel magnitude domain')
    return H


def options_check(o):
    require(set(o)=={'rho','linearWeight','relaxation','memory','safeguard','maxIterations','tolerance','recordEvery'},'options keys')
    for key,lo,hi in [('rho',0,1000),('linearWeight',0,100),('relaxation',0,2),('safeguard',0,1)]:require(lo<num(o[key],key)<=hi and (key!='relaxation' or o[key]<2),'option '+key)
    require(1e-11<=num(o['tolerance'])<=1e-6,'tolerance domain')
    for key,lo,hi in [('memory',0,10),('maxIterations',1,50000),('recordEvery',1,2**53-1)]:require(type(o[key]) is int and lo<=o[key]<=hi,'option '+key)


def affine(inp,o,m):
    n,k=inp['Nt'],inp['K'];d=n*n;vlen=k*d+1;basis=[mat(np.eye(d)[i],n) for i in range(d)];rows=[];lower=[]
    for idx,B in enumerate([m['B2'],m['B0'],m['B1'],m['B1']]):
        vals=np.array([np.trace(B@b).imag if idx==3 else np.trace(B@b).real for b in basis]);row=np.r_[np.tile(vals,k),0.]
        if idx>=2:row*=np.sqrt(2)
        if idx==0:row[-1]=-1
        rows.append(row)
    def linear(row,rhs):
        norm=np.linalg.norm(row);require(norm>1e-15,'degenerate affine row')
        rows.append(row*o['linearWeight']/norm);lower.append(rhs*o['linearWeight']/norm)
    power=np.zeros(vlen)
    for j in range(k):power[j*d:j*d+n]=-1
    linear(power,-1)
    H=decode(inp['H'],(k,n));gamma=10**(inp['gammaDb']/10)
    for j,h in enumerate(H):
        hn=np.linalg.norm(h)**2;require(hn>0,'zero channel without analytical rejection')
        qc=coord(np.outer(h.conj(),h)/hn)
        linear(np.r_[np.concatenate([qc*(1/gamma if b==j else -1) for b in range(k)]),0.],inp['communicationNoiseMw']/(inp['powerMw']*hn))
    return np.vstack([np.column_stack((np.eye(k*d),np.zeros(k*d))),rows]),np.array(lower)


def radar(R,inp,m):
    A,D=m['A'],m['D'];s0=float(np.trace(A.conj().T@A@R).real);s1=np.trace(D.conj().T@A@R);s2=float(np.trace(D.conj().T@D@R).real)
    eff=s2-abs(s1)**2/s0 if s0>0 else None
    alpha=complex(inp['alpha']['real'],inp['alpha']['imag'])
    regular=s0>1e-12*inp['powerMw'] and eff is not None and eff>1e-12*max(s2,1)
    with np.errstate(over='ignore',invalid='ignore',divide='ignore'):
        crb=inp['radarNoiseMw']/(2*abs(alpha)**2*inp['L']*eff) if regular else None
    out=dict(status='regular' if regular else 'singular',s0=s0,s1=dict(real=float(s1.real),imag=float(s1.imag)),s2=s2,effectiveInformationWithoutScale=float(eff) if regular else None,crbRad2=crb,rootCrbDegrees=float(np.sqrt(crb)*180/np.pi) if crb is not None else None,normalizedInformation=float(eff/(inp['powerMw']*m['sD'])) if regular else None)
    # Full real Fisher matrix for (theta, Re alpha, Im alpha), independent Schur evaluation.
    jac=[alpha*D,A,1j*A]
    with np.errstate(over='ignore',invalid='ignore',divide='ignore'):
        F=2*inp['L']/inp['radarNoiseMw']*np.array([[np.trace(u.conj().T@v@R).real for v in jac] for u in jac])
    fisher=dict(matrix=F.tolist() if np.isfinite(F).all() else None,schurInformation=None,crbRad2=None)
    if regular and np.isfinite(F).all():
        schur=float(F[0,0]-F[0,1:]@np.linalg.solve(F[1:,1:],F[1:,0]))
        fisher.update(schurInformation=schur,crbRad2=1/schur if schur>0 else None)
        if crb is not None and math.isfinite(crb) and crb>0:close(1/schur,crb,'full Fisher versus CRB',atol=0,rtol=2e-8)
    return out,fisher


def certificate(c,inp,o,A,lower):
    n,k=inp['Nt'],inp['K'];d=n*n;off=k*d
    require(c['kind'] in ['normalized_information_upper_bound','trace_bounded_infeasibility_separator'],'certificate kind')
    objective=c['kind']=='normalized_information_upper_bound'
    y=np.asarray(c['dual']);require(y.dtype.kind in 'if' and y.shape==(len(A),) and np.isfinite(y).all(),'certificate dual shape/finite')
    require(num(c['normalization'])>0,'certificate normalization')
    if objective:close(c['normalization'],1,'objective normalization',1e-14,0)
    cones=[float(np.linalg.eigvalsh(mat(y[j*d:(j+1)*d],n)).max()) for j in range(k)]+[float(np.linalg.eigvalsh(mat(y[off:off+4],2)).max())]
    require(max(cones)<=1e-10,'certificate dual PSD signs');require(np.max(y[off+4:])<=1e-12,'certificate linear dual signs')
    if not objective:close(y[off:off+4],np.zeros(4),'separator epigraph block',1e-12,0)
    E=A.T@y
    if objective:E[-1]-=1
    mins=np.array([np.linalg.eigvalsh(mat(E[j*d:(j+1)*d],n)).min() for j in range(k)])
    claimed=np.asarray(c['stationarityMinimumEigenvalues']);require(claimed.shape==(k,) and claimed.dtype.kind in 'if' and np.isfinite(claimed).all(),'stationarity eigenvalue shape')
    require(np.all(claimed<=mins+1e-11),'nonconservative stationarity eigenvalue')
    require(np.all(abs(claimed-mins)<=2e-7*(1+abs(mins))),'unexplained stationarity eigenvalue correction')
    support=float(y[off+4:]@lower);correction=-min(0,float(min(claimed)));bound=-support-correction
    close(c['support'],support,'dual support',1e-10);close(c['traceResidualCorrection'],correction,'trace correction',1e-11)
    close(c['minimizationLowerBound'],bound,'dual lower bound',1e-10)
    close(c['tStationarityResidual'],abs(E[-1]),'t stationarity residual',1e-12);require(abs(E[-1])<=1e-9,'unbounded epigraph dual residual')
    replay_bound=-support+min(0,float(min(mins)))
    if objective:close(c['informationUpperBound'],-bound,'information bound',1e-10)
    else:require(c['informationUpperBound'] is None,'separator information bound must be null')
    require(type(c['separationPassed']) is bool and c['separationPassed']==(not objective and bound>1e-7),'separator pass mismatch')
    return dict(kind=c['kind'],dualConeMaxEigenvalues=cones,stationarityMinimumEigenvalues=mins.tolist(),support=support,traceResidualCorrection=correction,minimizationLowerBound=bound,independentlyReplayedLowerBound=replay_bound,informationUpperBound=-bound if objective else None,tStationarityResidual=float(abs(E[-1])),separationPassed=bool(not objective and bound>1e-7))


def audit_result(r):
    out=dict(status=r.get('status') if isinstance(r,dict) else None,passed=False,physicalAccepted=False,issues=[])
    try:
        require(isinstance(r,dict),'result object missing')
        require(r['version']==VERSION,'unsupported kernel version')
        status=r['status'];require(status in TERMINAL,'unknown/nonterminal status')
        inp=r['input'];H=input_check(inp);o=r['options'];options_check(o)
        n,k,P=inp['Nt'],inp['K'],inp['powerMw'];d=n*n;gamma=10**(inp['gammaDb']/10);m=model(inp)
        require(type(r['iterations']) is int and 0<=r['iterations']<=o['maxIterations'],'iterations bounds')
        gate=r['physicalGate'];require(type(gate['passed']) is bool and isinstance(gate['failures'],list) and all(type(q) is str for q in gate['failures']),'physical gate format')
        trace=r['trace'];require(isinstance(trace,list) and len(trace)<=50002,'trace must be a bounded row list')
        previous_iteration=0;previous_elapsed=0
        for row in trace:
            require(isinstance(row,dict) and set(row)=={'iteration','primalInf','stationarityInf','normalizedInformation','elapsedMs'},'trace row schema')
            require(type(row['iteration']) is int and 1<=row['iteration']<=r['iterations'] and row['iteration']>=previous_iteration,'trace iteration range/order')
            for q in ['primalInf','stationarityInf','elapsedMs']:require(num(row[q])>=0,'trace '+q)
            num(row['normalizedInformation']);require(row['elapsedMs']>=previous_elapsed,'trace elapsed order')
            previous_iteration=row['iteration'];previous_elapsed=row['elapsedMs']
        if r['iterations']>0:require(len(trace)>0,'attempted solve lacks trace')
        else:require(len(trace)==0,'zero-iteration result has trace')
        if status in ['converged','iteration_limit','numerical_rejection','numerical_failure','infeasible_certificate','rank_condition_not_met']:require(r['iterations']>=1,'terminal solve status requires positive iterations')
        for q in ['initializationMs','kernelWallMs','eigenMs']:require(num(r[q])>=0,'timing '+q)
        require(r['kernelWallMs']+1e-6>=max(r['initializationMs'],r['eigenMs'],previous_elapsed),'inconsistent kernel timings')
        for q in ['andersonAccepted','andersonRejected']:require(type(r[q]) is int and 0<=r[q]<=r['iterations'],'acceleration counter')
        if status in ['converged','iteration_limit','cancelled','infeasible_certificate','rank_condition_not_met']:require(r['failureReason'] is None,'unexpected failure reason for status')
        if status=='numerical_failure':require(isinstance(r['failureReason'],str) and len(r['failureReason'])>0,'numerical failure needs diagnostic reason')
        rank=r['rankCondition'];rankmatrix=H@np.column_stack((m['a'],m['ad']));sv=np.linalg.svd(rankmatrix,compute_uv=False);ratio=float(sv[-1]/sv[0]) if sv[0]>0 else 0
        close(decode(rank['matrix'],(k,2)),rankmatrix,'theorem rank matrix');close(rank['singularValues'],sv,'theorem singular values')
        close(rank['relativeSingularValue'],ratio,'theorem singular ratio',1e-12);close(rank['relativeRankTolerance'],1e-8,'rank tolerance',0,0)
        require(type(rank['fullColumnRank']) is bool and rank['fullColumnRank']==(ratio>1e-8),'theorem rank decision')
        out['rankCondition']=dict(singularValues=sv.tolist(),relativeSingularValue=ratio,fullColumnRank=bool(ratio>1e-8),required='rank(H[a,a_dot])=2')
        if status=='infeasible_bound':
            f=r['failureReason'];j=f['user'];require(type(j) is int and 0<=j<k,'bound user')
            upper=P*np.sum(abs(H)**2,axis=1)/inp['communicationNoiseMw'];close(f['bound'],upper[j],'individual SINR bound');close(f['requested'],gamma,'bound requested Gamma')
            require(gamma>upper[j]*(1+1e-12) and not gate['passed'],'false analytic infeasibility')
            require(r['iterations']==0,'analytical bound iterations');require(gate['failures']==['not_converged'],'analytical bound gate failures');require(not any(q in r for q in ['Wks','relaxedR','Wc','recovery','metrics','finalState','certificate','infeasibilityCertificate','residuals','relaxedInformation']),'analytical bound has unexpected numerical state');out['individualSinrUpperBounds']=upper.tolist();out['evidenceKind']='analytical_infeasibility';out['passed']=True;return out
        require('finalState' in r,'incomplete numerical evidence: finalState absent (worker cancellation may be partial)')
        A,lower=affine(inp,o,m);st=r['finalState'];x,w,z=[np.asarray(st[q]) for q in ['x','w','z']]
        require(x.shape==(k*d+1,) and w.shape==z.shape==(len(A),),'primal/dual state shape')
        require(all(v.dtype.kind in 'if' and np.isfinite(v).all() for v in [x,w,z]),'state finite numeric')
        close(st['rho'],o['rho'],'state rho',0,0)
        require(isinstance(r['Wks'],list) and len(r['Wks'])==k,'covariance block count')
        V=[decode(q,(n,n)) for q in r['Wks']];R=sum(V)
        for j,Q in enumerate(V):close(Q,P*mat(x[j*d:(j+1)*d],n),'Wk/state consistency',1e-8);close(Q,Q.conj().T,'Wk Hermitian',1e-10)
        close(decode(r['relaxedR'],(n,n)),R,'covariance sum',1e-8);close(r['relaxedInformation'],x[-1],'epigraph t',1e-12)
        zp=w.copy()
        for off,size in [(j*d,n) for j in range(k)]+[(k*d,2)]:zp[off:off+size*size]=coord(psd(mat(w[off:off+size*size],size)))
        zp[k*d+4:]=np.maximum(w[k*d+4:],lower);close(z,zp,'cone projection Pi_C(w)',1e-8)
        rawdual=o['rho']*(w-z);station=A.T@rawdual;station[-1]-=1
        primal=float(np.max(abs(A@x-z)));stat=float(np.max(abs(station)))
        proximal=A.T@(o['rho']*(A@x-(2*z-w)));proximal[-1]-=1
        require(np.max(abs(proximal))<=2e-7*(1+np.max(abs(x))),'linear proximal equation')
        close(r['residuals']['primalInf'],primal,'primal residual',1e-10);close(r['residuals']['stationarityInf'],stat,'stationarity residual',1e-10)
        out['state']=dict(primalInf=primal,stationarityInf=stat,proximalInf=float(np.max(abs(proximal))))
        ur=R/P;u0=np.trace(m['B0']@ur).real;u1=np.trace(m['B1']@ur);u2=np.trace(m['B2']@ur).real;S=np.array([[u2-x[-1],u1],[u1.conjugate(),u0]])
        relaxed_users=[float((H[j]@V[j]@H[j].conj()).real/((H[j]@(R-V[j])@H[j].conj()).real+inp['communicationNoiseMw'])/gamma) for j in range(k)]
        rm,rf=radar(R,inp,m)
        out['relaxed']=dict(powerFraction=float(np.trace(R).real/P),minimumWkEigenvalues=[float(np.linalg.eigvalsh(Q/P).min()) for Q in V],minimumSchurEigenvalue=float(np.linalg.eigvalsh(S).min()),sinrRatioToThreshold=relaxed_users,information=rm['normalizedInformation'])
        c=r['certificate'];checked=certificate(c,inp,o,A,lower) if c is not None else None;out['certificate']=checked
        if checked:require(checked['kind']=='normalized_information_upper_bound','objective certificate kind')
        sep=r.get('infeasibilityCertificate')
        if sep is not None:out['infeasibilityCertificate']=certificate(sep,inp,o,A,lower);require(sep['kind']=='trace_bounded_infeasibility_separator','infeasible certificate kind')
        if status=='infeasible_certificate':require(sep is not None and out['infeasibilityCertificate']['separationPassed'],'unproved infeasible status')
        if status=='iteration_limit':require(r['iterations']==o['maxIterations'],'cap iterations mismatch')
        if status=='cancelled':require(r['iterations']<o['maxIterations'],'cannot cancel an already capped terminal solver')
        recovered=all(q in r for q in ['Wc','recovery','metrics'])
        if status=='iteration_limit' or recovered:
            require(trace[-1]['iteration']==r['iterations'],'final convergence/cap trace row missing')
            close(trace[-1]['primalInf'],primal,'final trace primal',1e-10);close(trace[-1]['stationarityInf'],stat,'final trace stationarity',1e-10);close(trace[-1]['normalizedInformation'],x[-1],'final trace t',1e-12)
        if status=='numerical_rejection' and not recovered:require(isinstance(r['failureReason'],str) and len(r['failureReason'])>0 and gate['failures']==['recovery_exception'],'unrecovered rejection requires recovery exception diagnostic')
        if status in ['converged','rank_condition_not_met']:require(recovered,'missing recovered state')
        if any(q in r for q in ['Wc','recovery','metrics']):require(recovered,'partial recovery evidence')
        if recovered:
            W=decode(r['Wc'],(n,k));gain=abs(H@W)**2;desired=gain.diagonal();interference=gain.sum(axis=1)-desired;sinr=desired/(interference+inp['communicationNoiseMw']);power=float(np.linalg.norm(W)**2)
            met=r['metrics'];close(met['powerMw'],power,'recovered power',1e-8);close(met['powerFraction'],power/P,'power fraction',1e-10)
            require(len(met['users'])==k,'all-user metrics count')
            for j,u in enumerate(met['users']):
                for key,v in dict(desiredMw=desired[j],interferenceMw=interference[j],sinr=sinr[j],ratioToThreshold=sinr[j]/gamma).items():close(u[key],v,'user '+str(j)+' '+key,1e-8)
                if sinr[j]>0:close(u['sinrDb'],10*np.log10(sinr[j]),'user SINR dB',1e-8)
                else:require(u['sinrDb'] is None,'zero SINR dB must be null')
            rr,fisher=radar(W@W.conj().T,inp,m);reported=met['radar'];require(reported['status']==rr['status'],'radar regularity')
            for key,v in rr.items():
                if key in ['status','s1']:continue
                if v is None:require(reported[key] is None,'radar '+key+' must be null')
                elif not math.isfinite(v):require(reported[key] is None,'nonfinite radar '+key+' must be null')
                else:close(reported[key],v,'radar '+key,0,2e-8)
            for key,v in rr['s1'].items():close(reported['s1'][key],v,'radar s1 '+key,1e-7)
            require(len(r['recovery'])==k,'recovery report count');ranks=[]
            for j,Q in enumerate(V):
                ev=np.linalg.eigvalsh(Q);rankres=float(np.linalg.norm(Q-np.outer(W[:,j],W[:,j].conj()))/max(np.linalg.norm(Q),1e-30));ranks.append(rankres);q=r['recovery'][j]
                close(q['relativeRankOneResidual'],rankres,'rank one recovery residual',2e-9);close(q['minEigenvalue'],ev[0],'minimum covariance eigenvalue',1e-8);close(q['maxEigenvalue'],max(ev[-1],0),'maximum covariance eigenvalue',1e-8)
                require(np.linalg.norm(Q@W[:,j]-max(ev[-1],0)*W[:,j])<=1e-7*max(1,np.linalg.norm(Q)*np.linalg.norm(W[:,j])),'principal-eigenvector recovery')
            info=rr['normalizedInformation'];gap=checked['informationUpperBound']-info if checked and info is not None else None
            if checked and gap is not None:
                close(c['recoveredInformationGap'],gap,'recovered information gap',1e-10);close(c['relativeRecoveredGap'],gap/max(abs(info),1e-30),'relative recovered gap',1e-10)
            fails=[]
            if ratio<=1e-8:fails.append('theorem2_rank_condition')
            if max(ranks)>1e-4:fails.append('rank_one_recovery')
            if power/P>1+2e-6:fails.append('total_power')
            if min(sinr/gamma)<1-2e-5:fails.append('recovered_SINR')
            if rr['status']!='regular':fails.append('singular_Fisher_information')
            if rr['crbRad2'] is None or not math.isfinite(rr['crbRad2']) or rr['crbRad2']<=0:fails.append('invalid_CRB')
            if gap is None or gap< -2e-7 or gap>max(1e-7,1e-4*abs(info)):fails.append('dual_gap')
            if checked is None or checked['tStationarityResidual']>1e-9:fails.append('dual_epigraph_stationarity')
            require(gate['failures']==fails and gate['passed']==(len(fails)==0),'physical acceptance gate does not match recomputation')
            expected='rank_condition_not_met' if 'theorem2_rank_condition' in fails else 'numerical_rejection' if fails else 'converged'
            require(status==expected,'recovered status inconsistent with gates')
            require(max(primal,stat)<o['tolerance']+1e-10,'recovered status lacks convergence residuals')
            out['recovered']=dict(powerMw=power,powerFraction=power/P,sinr=sinr.tolist(),sinrRatioToThreshold=(sinr/gamma).tolist(),rankOneResiduals=ranks,radar=rr,fisher=fisher,informationGap=gap)
            if status=='converged' and gate['passed']:
                for key in ['s0','s2','effectiveInformationWithoutScale','crbRad2','rootCrbDegrees','normalizedInformation']:require(num(reported[key])>0,'accepted reported radar '+key+' must be positive')
                a2=inp['alpha']['real']**2+inp['alpha']['imag']**2
                require(a2>=np.finfo(float).tiny and inp['radarNoiseMw']>=np.finfo(float).tiny,'accepted record uses unsupported subnormal Fisher scales')
                require(fisher['matrix'] is not None and fisher['crbRad2'] is not None and math.isfinite(fisher['crbRad2']) and fisher['crbRad2']>0,'accepted record lacks finite full Fisher verification')
            out['physicalAccepted']=status=='converged' and gate['passed']
        else:
            require(not gate['passed'],'unrecovered result has successful gate')
            if status!='numerical_rejection':require(gate['failures']==['not_converged'],'unrecovered terminal gate failures')
        out['evidenceKind']='complete_numerical_state';out['passed']=True
    except (KeyError,ValueError,TypeError,IndexError,OverflowError,ZeroDivisionError,np.linalg.LinAlgError) as e:out['issues'].append(str(e))
    return out


def js_number(v):
    """Shortest binary64 decimal with ECMAScript exponent/decimal thresholds.
    Input numeric identities are bounded; tested against JS on fixture/edge values.
    """
    v=float(v);require(math.isfinite(v),'canonical nonfinite number')
    if v==0:return '0'
    if 1e-6<=abs(v)<1e21:return np.format_float_positional(v,unique=True,trim='-')
    s=np.format_float_scientific(v,unique=True,trim='-',exp_digits=1)
    a,b=s.split('e');e=int(b);return a+'e'+('+' if e>=0 else '-')+str(abs(e))


def canonical(v):
    if v is None:return 'null'
    if v is True:return 'true'
    if v is False:return 'false'
    if type(v) in (int,float):return js_number(v)
    if isinstance(v,str):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
    if isinstance(v,list):return '['+','.join(canonical(x) for x in v)+']'
    if isinstance(v,dict):return '{'+','.join(canonical(k)+':'+canonical(v[k]) for k in sorted(v))+'}'
    raise ValueError('canonical unsupported type')


def digest(v):return hashlib.sha256(canonical(v).encode()).hexdigest()


def audit_record(value):
    out=dict(checkerVersion='crb-export-checker-v1',passed=False,browserProvenanceEstablished=False,provenanceNote='Numerical consistency only; wrapper hashes/timing/browser labels are unauthenticated declarations. No browser execution inferred.',envelopeIssues=[])
    if isinstance(value,dict) and ('format' in value or 'schemaVersion' in value):
        try:
            require(value['format']==FORMAT and type(value['schemaVersion']) is int and value['schemaVersion']==1,'unsupported record envelope')
            require(value['modelId']=='point-unknown-complex-alpha-eq33-k2','unsupported model identifier')
            inp=value['input'];input_check(inp)
            require(inp['Nt'] in [4,6,8] and inp['Nr']==inp['Nt']+4 and inp['K']==2 and inp['L']==30 and inp['powerMw']==1000 and inp['communicationNoiseMw']==inp['radarNoiseMw']==1 and inp['alpha']==dict(real=1,imag=0) and inp['thetaDegrees'] in [0,23] and 0<=inp['gammaDb']<=20,'lesson envelope outside bounded model')
            require(digest(inp)==value['inputDigest'],'inputDigest mismatch')
            scenario={k:v for k,v in inp.items() if k!='gammaDb'};require(digest(scenario)==value['scenarioDigest'],'scenarioDigest mismatch')
            require(value['result']['input']==inp,'envelope/result input mismatch');require(value['options']==value['result']['options'],'envelope/result options mismatch')
            require(value['tolerances']==TOLERANCES,'frozen gate tolerance mismatch')
            require(value['kernel']['version']==VERSION and value['kernel']['runtimeFiles']=={'crb-multiuser/'+k:v for k,v in RUNTIME.items()},'declared kernel identity mismatch')
            require(value['source']['sha256']=='3bb9519855b92a8cca870caf603efe0d05dc1d9369cadad0fb7de20750a61e6d' and value['source']['doi']=='10.1109/TSP.2021.3135692','declared source identity mismatch')
            require(type(value['run']['id']) is int and 0<=value['run']['id']<=2**53-1,'run ID')
            if value['run']['uiTimingMs'] is not None:require(num(value['run']['uiTimingMs'])>=0,'UI timing')
            require(isinstance(value['trace'],dict) and set(value['trace'])=={'truncated','samples'} and value['trace']['truncated'] is False and type(value['trace']['samples']) is int and value['trace']['samples']==len(value['result']['trace']),'trace declaration')
            out['recordIdentity']=dict(inputDigest=value['inputDigest'],scenarioDigest=value['scenarioDigest'],runId=value['run']['id'])
        except (KeyError,ValueError,TypeError,IndexError,OverflowError) as e:out['envelopeIssues'].append(str(e))
        result=value.get('result',{})
    else:result=value
    out['result']=audit_result(result);out['passed']=not out['envelopeIssues'] and out['result']['passed'];return sanitize(out)


def sanitize(x):
    if isinstance(x,dict):return {k:sanitize(v) for k,v in x.items()}
    if isinstance(x,list):return [sanitize(v) for v in x]
    if isinstance(x,(np.bool_,)):return bool(x)
    if isinstance(x,(np.integer,)):return int(x)
    if isinstance(x,(float,np.floating)):return float(x) if math.isfinite(x) else None
    return x


def load_json(path):
    require(path.stat().st_size<=16*1024*1024,'checker input exceeds 16 MiB')
    def pairs(items):
        out={}
        for key,v in items:
            require(key not in out,'duplicate JSON key '+key);require(key not in ['__proto__','constructor','prototype'],'unsafe JSON key');out[key]=v
        return out
    return json.loads(path.read_text(),object_pairs_hook=pairs,parse_constant=lambda x:(_ for _ in ()).throw(ValueError('nonfinite JSON '+x)))


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('record',type=Path);p.add_argument('--output',type=Path);args=p.parse_args()
    if args.output:require(args.output.resolve()!=args.record.resolve(),'refusing to overwrite input')
    try:result=audit_record(load_json(args.record))
    except (ValueError,TypeError,OSError,RecursionError) as e:result=dict(passed=False,browserProvenanceEstablished=False,issues=[str(e)])
    text=json.dumps(result,indent=2,allow_nan=False)+'\n'
    if args.output:args.output.write_text(text)
    print(text,end='');return 0 if result['passed'] else 1


if __name__=='__main__':raise SystemExit(main())
