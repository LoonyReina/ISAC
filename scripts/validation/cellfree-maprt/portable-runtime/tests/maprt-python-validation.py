import json,numpy as np
from pathlib import Path
p=Path(__file__).parent

def decode(o):
 if isinstance(o,dict) and o.get('type')=='complex-matrix-f64-json-v1':return (np.array(o['re'])+1j*np.array(o['im'])).reshape(o['rows'],o['cols'])
 return o
cases=json.loads((p/'maprt-fresh-cases.json').read_text(),object_hook=decode);errors=[]
for c in cases:
 g,x,ra,rh,y=[c[k] for k in ['g','x','ra','rh','y']];n=c['noise'];C0=n*np.eye(len(g))+x@rh@x.conj().T;C1=C0+g@ra@g.conj().T
 # Independent observation covariance solves, not JS prior-space Schur formula.
 q=np.real(np.sum(y.conj()*(np.linalg.solve(C0,y)-np.linalg.solve(C1,y)),axis=0));lc=-g.shape[1]*np.log(np.pi)-np.linalg.slogdet(ra)[1];ld=np.linalg.slogdet(C0)[1]-np.linalg.slogdet(C1)[1]
 errors.extend(np.abs(q+lc-c['score']));errors.extend(np.abs(q+ld-c['lrt']))
assert max(errors)<2e-11,max(errors)
result={'cases':len(cases),'scores':len(errors),'maximum_absolute_error':float(max(errors)),'oracle':'independent NumPy observation-covariance inverse difference','passed':True}
(p/'maprt-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
