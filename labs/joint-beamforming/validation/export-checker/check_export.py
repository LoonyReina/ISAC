"""Independent NumPy audit of raw kernel results or a UI envelope containing them.
No JavaScript helper, saved answer, CVXPY solve, or browser automation is imported.
"""
from pathlib import Path
import argparse, json
import numpy as np
ANGLES=np.arange(1801)/10-90
TARGETS=np.array([-40.,0.,40.]);D=np.any(abs(ANGLES[:,None]-TARGETS)<=5+1e-12,axis=1).astype(float)
PAIRS=[(0,1),(0,2),(1,2)]
def decode(v):
 re,im=np.asarray(v['real'],float),np.asarray(v['imag'],float)
 if re.shape!=im.shape:raise ValueError('Real/imaginary shape mismatch')
 a=re+1j*im
 if not np.isfinite(a).all():raise ValueError('Nonfinite complex matrix')
 return a

def herm(a):return (a+a.conj().T)/2

def basis(m):
 B=[]
 for i in range(m):
  a=np.zeros((m,m),complex);a[i,i]=1;B.append(a)
 for imaginary in [False,True]:
  for i in range(m):
   for j in range(i+1,m):
    a=np.zeros((m,m),complex);a[i,j]=(1j if imaginary else 1)/np.sqrt(2);a[j,i]=a[i,j].conjugate();B.append(a)
 return np.asarray(B)

def setup(m,H,kind,gamma,weight):
 B=basis(m);d=m*m;blocks=3 if kind=='sdr' else 1;n=blocks*d;rows=[];lower=[];eq=[]
 def row(a,b,equal,normed=False):
  scale=np.linalg.norm(a) if normed else 1
  if scale<1e-14:
   if equal and abs(b)<1e-14:return
   if not equal and b<=0:return
   raise ValueError('Degenerate non-redundant affine row')
  rows.append(a*weight/scale);lower.append(b*weight/scale);eq.append(equal)
 for i in range(m):
  a=np.zeros(n);a[i]=1;row(a,1/m,True)
 if kind=='sdr':
  for j in range(2):
   h=np.einsum('bij,ji->b',B,np.outer(H[j].conj(),H[j])).real;a=np.zeros(n);a[:d]=-gamma/max(1,gamma)*h;a[(j+1)*d:(j+2)*d]=(1+gamma)/max(1,gamma)*h;row(a,gamma/max(1,gamma)*.01,False,True)
 elif kind=='zf':
  c=np.einsum('i,bij,j->b',H[0],B,H[1].conj());row(c.real,0,True,True);row(c.imag,0,True,True)
  for j in range(2):row(np.einsum('bij,ji->b',B,np.outer(H[j].conj(),H[j])).real,gamma*.01,False,True)
 Aps=np.eye(n)
 if kind=='sdr':
  for k in range(1,blocks):Aps[:d,k*d:(k+1)*d]=-np.eye(d)
 return B,np.vstack((Aps,rows)),np.asarray(lower),np.asarray(eq),blocks

def audit_result(r):
 issues=[];out={'version':r.get('version'),'method':r.get('method'),'status':r.get('status')}
 def require(test,message):
  if not bool(test):raise ValueError(message)
 def close(a,b,label,atol=1e-8,rtol=1e-9):
  a,b=np.asarray(a),np.asarray(b)
  require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all() and np.allclose(a,b,atol=atol,rtol=rtol),label)
 try:
  m=r['M'];k=r['K'];kind=r['method'];gamma=r['gammaLinear'];H=decode(r['H']);status=r['status']
  require(r['version'] in ['joint-covariance-drs-v0.2-prototype','joint-covariance-drs-v0.3-prototype'],'unreviewed version identifier')
  opts=r['settings'];require(set(opts)=={'rho','relaxation','linearWeight','memory','safeguard','maxIterations','tolerance','recordEvery'},'unknown/missing settings')
  for key,lo,hi in [('rho',0,1000),('relaxation',0,2),('linearWeight',0,100),('safeguard',0,1)]:
   require(isinstance(opts[key],(int,float)) and not isinstance(opts[key],bool) and np.isfinite(opts[key]) and lo<opts[key]<=hi and (key!='relaxation' or opts[key]<2),'setting bound '+key)
  require(isinstance(opts['tolerance'],(int,float)) and not isinstance(opts['tolerance'],bool) and 1e-11<=opts['tolerance']<=1e-6,'setting tolerance bound')
  for key,lo,hi in [('memory',0,10),('maxIterations',1,50000),('recordEvery',1,None)]:require(type(opts[key]) is int and lo<=opts[key] and (hi is None or opts[key]<=hi),'setting integer bound '+key)
  require(type(r['iterations']) is int and 0<=r['iterations']<=opts['maxIterations'],'iteration count bound')
  require(type(m) is int and m in range(4,11) and type(k) is int and k==2 and kind in ['sdr','zf','radar'],'unsupported dimensions/method')
  require(H.shape==(k,m) and np.max(abs(H))<=10,'H domain')
  require(4<=r['gammaDb']<=24,'Gamma domain');close(gamma,10**(r['gammaDb']/10),'linear/dB Gamma mismatch',1e-12)
  require(status in ['converged','iteration_limit','cancelled','numerical_failure','numerical_rejection','infeasible_bound','infeasible_certificate'],'unknown/nonterminal status')
  if 'v0.3' in str(r.get('version','')):require('communicationConstraintsApplied' in r,'missing communication flag')
  if 'communicationConstraintsApplied' in r:require(r['communicationConstraintsApplied']==(kind!='radar'),'wrong communication flag')
  if status=='infeasible_bound':
   upper=np.sum(abs(H),axis=1)**2/(m*.01);reason=r['failureReason'];j=reason['user']
   require(kind!='radar' and j in range(k) and gamma>upper[j]*(1+1e-12),'invalid analytical infeasibility claim')
   close(reason['upperBound'],upper[j],'reported analytical bound');close(reason['requestedSinr'],gamma,'requested SINR bound metadata')
   require(not r.get('physicalGate',{}).get('passed',False),'analytical infeasible result has success gate')
   out['independentUpperBounds']=upper.tolist();out['issues']=issues;out['passed']=not issues;return out
  B,A,lower,eq,blocks=setup(m,H,kind,gamma,r['settings']['linearWeight']);d=m*m;n=blocks*d
  R=decode(r['R']);require(R.shape==(m,m),'R shape');close(R,R.conj().T,'R Hermitian',1e-10)
  state=r['finalState'];x,z,w=[np.asarray(state[key],float) for key in ['x','z','w']];rho=state['rho'];close(rho,r['settings']['rho'],'rho mismatch')
  require(x.shape==(n,) and z.shape==(A.shape[0],) and w.shape==z.shape,'state shape')
  require(all(np.isfinite(a).all() for a in [x,z,w]),'state nonfinite')
  close(R,np.einsum('b,bij->ij',x[:d],B),'R/finalState mismatch',1e-11)
  zp=np.array(w,copy=True)
  for j in range(blocks):
   Q=herm(np.einsum('b,bij->ij',w[j*d:(j+1)*d],B));ev,U=np.linalg.eigh(Q);Qp=(U*np.maximum(ev,0))@U.conj().T;zp[j*d:(j+1)*d]=np.einsum('bij,ji->b',B,Qp).real
  zp[n:]=np.where(eq,lower,np.maximum(w[n:],lower));close(z,zp,'cone-projection state mismatch',1e-8)
  Rks=[decode(v) for v in r['Rks']];require(len(Rks)==(k if kind=='sdr' else 0),'Rks count')
  for j,Rk in enumerate(Rks):close(Rk,np.einsum('b,bij->ij',x[(j+1)*d:(j+2)*d],B),'Rk/finalState mismatch',1e-11)
  steering=np.exp(1j*np.pi*np.outer(np.sin(np.deg2rad(ANGLES)),np.arange(m)));targets=np.exp(1j*np.pi*np.outer(np.sin(np.deg2rad(TARGETS)),np.arange(m)))
  pattern=np.sum(steering.conj()*(R@steering.T).T,axis=1).real;alpha=float(D@pattern/(D@D));corr=targets.conj()@R@targets.T
  l1=float(np.mean((pattern-alpha*D)**2));l2=float(sum(abs(corr[q,p])**2 for p,q in PAIRS)/3);f=l1+l2
  for key,value in [('pattern',pattern),('alpha',alpha),('patternLoss',l1),('crossLoss',l2),('objective',f),('diagonalError',float(np.max(abs(np.diag(R)-1/m))))]:close(r['metrics'][key],value,'reported '+key,1e-9)
  G=2*(steering.T*(pattern-alpha*D))@steering.conj()/len(D)
  for p,q in PAIRS:
   C=np.outer(targets[p],targets[q].conj());G+=(corr[q,p].conjugate()*C+corr[q,p]*C.conj().T)/3
  grad=np.zeros_like(x);grad[:d]=np.einsum('bij,ji->b',B,G).real
  residual=A@x-z;station=grad+A.T@(rho*(w-z));primal=float(np.max(abs(residual)));stat=float(np.max(abs(station)));eigmin=float(np.linalg.eigvalsh(herm(R)).min())
  close(r['residuals']['primalInf'],primal,'reported primal residual',1e-10);close(r['residuals']['stationarityInf'],stat,'reported stationarity residual',1e-10);close(r['residuals']['minCovarianceEigenvalue'],eigmin,'reported min covariance eigenvalue',1e-9)
  out.update(objective=f,primalInf=primal,stationarityInf=stat,minimumCovarianceEigenvalue=eigmin)
  require('optimizationCertificate' in r,'missing objective certificate')
  if status=='infeasible_certificate':require('infeasibilityCertificate' in r,'missing infeasibility certificate')
  for name,objective_mode in [('optimizationCertificate',True),('infeasibilityCertificate',False)]:
   if name not in r:continue
   cert=r[name];reported_ops=cert['stationarityOperatorNorms'];require(len(reported_ops)==blocks and all(isinstance(v,(int,float)) and np.isfinite(v) and v>=0 for v in reported_ops),name+' invalid operator penalty vector');y=np.asarray(cert['dual'],float);require(y.shape==z.shape and np.isfinite(y).all(),'dual shape/finite')
   E=A.T@y+(grad if objective_mode else 0);support=float(y[n:]@lower)
   op=[float(np.linalg.norm(herm(np.einsum('b,bij->ij',E[j*d:(j+1)*d],B)),2)) for j in range(blocks)]
   eigmax=[float(np.linalg.eigvalsh(herm(np.einsum('b,bij->ij',y[j*d:(j+1)*d],B))).max()) for j in range(blocks)]
   scalarmax=float(np.max(y[n:][~eq])) if np.any(~eq) else 0.
   lb=-(f if objective_mode else 0)-support-sum(op)-sum(max(0,v) for v in eigmax)
   require(scalarmax<=0 and max(eigmax)<=1e-10,name+' dual cone sign')
   require(cert['lowerBound']<=lb+1e-9,name+' lower bound overstated');close(cert['support'],support,name+' support',1e-9)
   close(cert['residualPenalty'],sum(cert['stationarityOperatorNorms']),name+' penalty sum',1e-12)
   require(all(a>=b-1e-9 for a,b in zip(cert['stationarityOperatorNorms'],op)),name+' operator penalty understated')
   close(cert['lowerBound'],-(f if objective_mode else 0)-support-cert['residualPenalty'],name+' arithmetic',1e-9)
   v={'independentLowerBound':lb,'reportedLowerBound':cert['lowerBound'],'dualConeMaxEigenvalues':eigmax,'dualLowerInequalityMax':scalarmax}
   if objective_mode:
    v['independentApproximatePrimalGap']=f-lb;close(cert['approximatePrimalGap'],f-cert['lowerBound'],'reported approximate gap',1e-9)
   else:
    v['positiveSeparator']=bool(lb>1e-7 and scalarmax<=0 and max(eigmax)<=1e-10)
    if status=='infeasible_certificate':require(v['positiveSeparator'] and cert['certificatePassed'] is True,'invalid numerical infeasibility claim')
   out[name]=v
  if status=='converged':
   require(r['physicalGate']['passed'] is True and r['physicalGate']['failures']==[],'missing/false accepted physical gate')
   Wc,Wr=decode(r['Wc']),decode(r['Wr']);kc=0 if kind=='radar' else k
   require(Wc.shape==(m,kc) and Wr.shape==(m,m),'factor shape');Rw=Wc@Wc.conj().T+Wr@Wr.conj().T
   cov=float(np.linalg.norm(Rw-R));diag=float(np.max(abs(np.diag(Rw)-1/m)));fm=r['metrics']['factor']
   close(fm['covarianceError'],cov,'reported factor covariance error',1e-10);close(fm['diagonalError'],diag,'reported factor diagonal error',1e-10)
   require(cov<=1e-5 and diag<=2e-6 and eigmin>=-2e-6 and np.max(abs(np.diag(R)-1/m))<=2e-6,'physical power/PSD/factor gates')
   require(max(primal,stat)<r['settings']['tolerance']*(1+1e-4)+1e-12,'accepted internal residual')
   require(out['optimizationCertificate']['independentApproximatePrimalGap']<=2e-5+1e-9,'accepted objective bound gap')
   if kind=='sdr':
    require(all(np.linalg.eigvalsh(herm(v)).min()>=-2e-6 for v in Rks),'accepted Rk PSD')
    require(np.linalg.eigvalsh(herm(R-sum(Rks))).min()>=-2e-6,'accepted residual radar covariance PSD')
    for j,Rk in enumerate(Rks):require(((1+gamma)/gamma*(H[j]@Rk@H[j].conj())-H[j]@R@H[j].conj()).real>=.01-2e-6,'accepted covariance SINR inequality')
   if kind=='zf':
    C=H@R@H.conj().T;require(np.max(abs(C-np.diag(np.diag(C))))<=2e-6,'accepted Eq40 off-diagonal constraint');require(np.min(np.diag(C).real)>=gamma*.01-2e-6,'accepted Eq40 user-power constraint')
   if kind=='radar':
    require(fm['Fc']=={'real':[],'imag':[]} and fm['Fr']=={'real':[],'imag':[]},'radar channel products must be empty')
    require(fm['users']==[] and fm['minSinrDb'] is None and fm['relativeSinrShortfall'] is None,'radar reports invented communication metrics')
   else:
    Fc,Fr=H@Wc,H@Wr;sig=abs(np.diag(Fc))**2;inter=np.sum(abs(Fc)**2,axis=1)-sig;rad=np.sum(abs(Fr)**2,axis=1);sinr=sig/(inter+rad+.01);short=float(max(0,(gamma-sinr.min())/max(1,gamma)))
    close(decode(fm['Fc']),Fc,'reported HWc',1e-9);close(decode(fm['Fr']),Fr,'reported HWr',1e-9)
    for j,u in enumerate(fm['users']):
     for key,value in [('desired',sig[j]),('interuser',inter[j]),('radar',rad[j]),('noise',.01),('sinr',sinr[j]),('sinrDb',10*np.log10(sinr[j]))]:close(u[key],value,'reported user '+str(j)+' '+key,1e-8)
    require(len(fm['users'])==k and short<=2e-5,'accepted recovered SINR');close(fm['relativeSinrShortfall'],short,'reported SINR shortfall',1e-10);close(fm['minSinrDb'],10*np.log10(sinr.min()),'reported minimum SINR',1e-8)
    if kind=='zf':
     C=H@R@H.conj().T;target=np.diag(np.sqrt(np.maximum(np.diag(C).real,0)))
     require(np.linalg.norm(Fc-target)<=1e-5*max(1,np.linalg.norm(target)),'Eq42 diagonal/positive-phase recovery')
     require(np.linalg.norm(Fr)<=1e-8*(1+np.linalg.norm(H)*np.linalg.norm(Wr)),'Eq42 radar channel nullspace')
    if kind=='sdr':
     for j,Rk in enumerate(Rks):close(Wc[:,j],Rk@H[j].conj()/np.sqrt((H[j]@Rk@H[j].conj()).real),'Eq33 rank-one recovery',1e-8)
    out['sinrLinear']=sinr.tolist();out['relativeSinrShortfall']=short
   out['factorCovarianceFro']=cov;out['factorDiagonalMaxError']=diag
  else:require(not r.get('physicalGate',{}).get('passed',False),'unsuccessful state has successful physical gate')
 except (KeyError,ValueError,TypeError,IndexError,OverflowError,np.linalg.LinAlgError) as e:issues.append('Incomplete/invalid exported evidence: '+str(e))
 out['issues']=issues;out['passed']=not issues;return out

def collect_results(value,path='$'):
 """Handle wrapper slots first; reject incomplete attempted numerical results."""
 if isinstance(value,dict):
  if any(key in value for key in ['finalState','optimizationCertificate','physicalGate']):
   yield path,value
  elif 'result' in value or 'attempted' in value:
   result=value.get('result')
   if isinstance(result,dict):yield path+'.result',result
   elif value.get('attempted') is True or result is not None:
    yield path+'.result',{'invalidResult':'Attempted or non-null result is not a complete numerical object'}
   for key,v in value.items():
    if key not in ['result','attempted']:yield from collect_results(v,path+'.'+key)
  else:
   strong=('finalState' in value or 'optimizationCertificate' in value or 'physicalGate' in value)
   signature=sum(key in value for key in ['version','method','status','H'])
   if strong or signature>=2:yield path,value
   else:
    for key,v in value.items():yield from collect_results(v,path+'.'+key)
 elif isinstance(value,list):
  for i,v in enumerate(value):yield from collect_results(v,path+'['+str(i)+']')

def audit_document(value):
 records=[dict(location=path,**audit_result(r)) for path,r in collect_results(value)]
 return {'passed':bool(records) and all(r['passed'] for r in records),'records':records,'notice':'passed means evidence-consistency audit passed, not optimizer convergence; capped/cancelled outcomes retain their unsuccessful state. Audits supplied numerical result evidence, not actual browser interaction, code delivery identity, envelope provenance or UI stale-state behavior. Missing attempted numerical results fail; unattempted null slots are not treated as solved.'}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('files',nargs='+',type=Path);p.add_argument('--output',type=Path);args=p.parse_args();reports=[]
 for file in args.files:
  try:report=audit_document(json.loads(file.read_text()))
  except (OSError,json.JSONDecodeError) as e:report={'passed':False,'error':str(e)}
  reports.append({'file':str(file),**report})
 result={'passed':all(r['passed'] for r in reports),'files':reports};s=json.dumps(result,indent=2,allow_nan=False)+'\n'
 if args.output:args.output.write_text(s)
 print(s);raise SystemExit(0 if result['passed'] else 1)
