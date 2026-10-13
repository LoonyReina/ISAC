"""Independent NumPy augmented least-squares oracle for production UI exports.
No production JavaScript factor/fit/score is used as the expected answer.
"""
import json,sys,pathlib,numpy as np
root=pathlib.Path(sys.argv[1]);raw=json.loads((root/'cellfree-maprt-current.json').read_text())
def matrix(a):
    return np.array(a['re']).reshape(a['rows'],a['cols'])+1j*np.array(a['im']).reshape(a['rows'],a['cols'])
errors=[]
for file in sorted(root.glob('*-cellfree-maprt-teaching-decomposition.json')):
    rec=json.loads(file.read_text());s=rec['selection'];out=rec['receiver'];a=next(x for x in raw['results'] if x['name']==s['allocation']);d=a['design'];noise=d['noise'];g=matrix(d['g']);x=matrix(d['x']) if s['detector']=='AP' else np.zeros((40,0));rh=matrix(d['rH']) if s['detector']=='AP' else np.zeros((0,0));ra=matrix(d['rAlpha']);la=np.linalg.cholesky(ra);lh=np.linalg.cholesky(rh);u=x@lh/np.sqrt(noise);v=g@la/np.sqrt(noise);y=matrix(out['y']);yn=y/np.sqrt(noise)
    costs=[]
    for hyp,w,fitkey,reskey in [(0,u,'fit0','residual0'),(1,np.column_stack([v,u]),'fit1','residual1')]:
        z=np.linalg.lstsq(np.vstack([w,np.eye(w.shape[1])]),np.vstack([yn,np.zeros((w.shape[1],1))]),rcond=None)[0]
        fitted=np.sqrt(noise)*w@z;res=y-fitted
        errors.extend([float(np.max(np.abs(fitted-matrix(out[fitkey]))))/np.sqrt(noise),float(np.max(np.abs(res-matrix(out[reskey]))))/np.sqrt(noise)])
        costs.append(float(np.vdot(res,res).real/noise+np.vdot(z,z).real))
    q=costs[0]-costs[1];errors.extend([abs(q-out['Q']),abs(costs[0]-out['costs']['J0']),abs(costs[1]-out['costs']['J1'])])
    sigma0=x@rh@x.conj().T+noise*np.eye(40);sigma1=sigma0+g@ra@g.conj().T
    errors.extend([float(np.max(np.abs(sigma0-matrix(out['sigma0']))))/noise,float(np.max(np.abs(sigma1-matrix(out['sigma1']))))/noise])
    qmatrix=noise*(np.linalg.inv(sigma0)-np.linalg.inv(sigma1));errors.append(float(np.max(np.abs(qmatrix-matrix(out['qMatrix'])))))
    truth=rec['generationTruth'];regen=matrix(truth['target'])+matrix(truth['clutter'])+matrix(truth['noise']);errors.append(float(np.max(np.abs(regen-y)))/np.sqrt(noise))
assert max(errors)<1e-8,max(errors)
report={'scope':'independent NumPy augmented least-squares, covariance and truth reconstruction of four actual UI handler decomposition exports','cases':4,'comparisons':len(errors),'max_normalized_or_absolute_error':max(errors),'accepted':True,'actual_browser':False}
(root/'adapter-oracle-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
