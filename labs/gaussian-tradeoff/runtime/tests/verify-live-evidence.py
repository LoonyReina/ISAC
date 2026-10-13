"""Direct independent NumPy posterior/KKT audit of freshly executed JS outputs.
No reference core import; all operations are performed on the actual JS matrices.
"""
import os
for key in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):os.environ[key]='1'
import numpy as np,json,pathlib,math
p=pathlib.Path(__file__).resolve().parents[1];cases=json.loads((p/'reports/live-evidence.json').read_text());stats={'checks':0,'max_relative_error':0,'cases':[]}
def mat(a):return np.array(a['re'])+1j*np.array(a['im'])
def close(a,b,tol=1e-9):
 a=np.asarray(a);b=np.asarray(b);e=float(np.max(abs(a-b))/max(1.,float(np.max(abs(b)))))
 assert e<=tol,(e,tol);stats['checks']+=a.size;stats['max_relative_error']=max(stats['max_relative_error'],e)
for case in cases:
 r=case['result'];m=r['input']['model'];M=m['m'];Ns=m['ns'];T=m['t'];pt=m['powerPerAntenna'];sn=m['sensingNoise'];cn=m['communicationNoise'];prior=m['priorVariance'];H=mat(r['input']['H']);delta=sn/(T*prior*pt);A=H*np.sqrt(pt/cn)
 for row in r['shapes']:
  Q=mat(row['covariance']);W=Q/pt;C=np.linalg.inv(W+delta*np.eye(M));B=np.eye(H.shape[0])+A@W@A.conj().T;com=A.conj().T@np.linalg.solve(B,A);kap=row['kappa']
  G=-com if kap=='communication-only' else -C@C-kap*com
  f=-np.linalg.slogdet(B)[1] if kap=='communication-only' else np.trace(C).real-kap*np.linalg.slogdet(B)[1]
  gap=np.trace(G@W).real-M*np.linalg.eigvalsh(G)[0]
  close(mat(row['matrixGradient']),G);close(row['objective'],f);assert gap/max(1,abs(f))<1e-8
  close(row['gaussianRate'],np.linalg.slogdet(np.eye(H.shape[0])+H@Q@H.conj().T/cn)[1]/np.log(2));close(row['covarianceOuterError'],sn*Ns/T*np.trace(np.linalg.inv(Q+sn/(T*prior)*np.eye(M))).real)
  close(np.trace(Q).real,M*pt);assert np.linalg.eigvalsh(Q)[0]>-1e-9
  # Fresh arbitrary complex PSD competitors, independent from the source core.
  rng=np.random.default_rng(554014)
  for j in range(20):
   Z=rng.normal(size=(M,M))+1j*rng.normal(size=(M,M));D=Z@Z.conj().T;D*=M/np.trace(D).real
   ld=np.linalg.slogdet(np.eye(H.shape[0])+A@D@A.conj().T)[1];other=-ld if kap=='communication-only' else np.trace(np.linalg.inv(D+delta*np.eye(M))).real-kap*ld
   assert f<=other+1e-7*max(1,abs(other));stats['checks']+=1
  for law in ['gaussian','stiefel']:
   vals=np.array(row[law]['raw']['error']);en=np.array(row[law]['raw']['energy']);close(row[law]['conditionalError']['mean'],vals.mean());close(row[law]['conditionalError']['standardError'],vals.std(ddof=1)/len(vals)**.5);close(row[law]['blockEnergy']['mean'],en.mean())
 for law,first in r['firstBlock'].items():
  X=mat(first['X']);Y=mat(first['Y']);truth=mat(first['evaluationOnly']['truth']);noise=mat(first['evaluationOnly']['noise']);R=X@X.conj().T/T
  close(Y,truth@X+noise);close(mat(first['sampleCovariance']),R)
  inv=np.linalg.inv(X@X.conj().T+sn/prior*np.eye(M));hat=Y@X.conj().T@inv;close(mat(first['posterior']['estimate']),hat)
  col=np.linalg.inv(np.eye(M)/prior+X.conj()@X.T/sn);close(mat(first['posterior']['posteriorCovarianceColumn']),col);close(mat(first['posterior']['posteriorCovarianceRow']),col.T)
  real=np.block([[X.T.real,-X.T.imag],[X.T.imag,X.T.real]]);J=2*(real.T@real/sn+np.eye(2*M)/prior)
  close(first['posterior']['realBFIM'],J);close(first['conditionalError'],Ns*np.trace(np.linalg.inv(J)));close(first['posterior']['conditionalTrace'],Ns*np.trace(col).real);close(first['evaluationOnly']['squaredError'],np.sum(abs(truth-hat)**2));close(first['energy'],np.sum(abs(X)**2))
  if law=='stiefel':close(R,mat(r['shapes'][r['selectedIndex']]['covariance']))
 stats['cases'].append(case['name'])
(p/'reports/live-direct-oracle.json').write_text(json.dumps(stats,indent=2)+'\n');print(json.dumps(stats))
