#!/usr/bin/env python3
"""Execute the actual standalone JavaScript core and independently audit X.

Run from a built site or pass --core explicitly. NumPy/SciPy plus Node required.
Input fixtures are test evidence only; the browser core never loads them.
"""
import argparse,hashlib,json,subprocess
from pathlib import Path
import numpy as np
from scipy import linalg
from reference import solve,unpack,pack,evaluate,problem_parts,norm2,input_hash
ROOT=Path(__file__).resolve().parent
CORE_SHA='70f720a7f67f95b139f31171370d86e9e348bf9a91b4a0d0c38717a66cf5a6a3'
REFERENCE_SHA='5871d0a8ae481a723f662c120e87e24f8ef8534ebc5d88c8a63ce9bea987e880'
def cn(rng,shape):return (rng.normal(size=shape)+1j*rng.normal(size=shape))/np.sqrt(2)
def main():
    p=argparse.ArgumentParser();p.add_argument('--core',type=Path,default=ROOT.parents[3]/'weighted-core.js');p.add_argument('--output',type=Path,default=Path('weighted-cross-language-result.json'));p.add_argument('--fresh',type=int,default=128);args=p.parse_args()
    if not 0<=args.fresh<=256:raise ValueError('Fresh validation count must be0..256')
    if hashlib.sha256(args.core.read_bytes()).hexdigest()!=CORE_SHA:raise ValueError('Core differs from reviewed identity')
    if hashlib.sha256((ROOT/'reference.py').read_bytes()).hexdigest()!=REFERENCE_SHA:raise ValueError('Reference differs from reviewed identity')
    inputs=[x['input'] for x in json.loads((ROOT/'fixtures.json').read_text())['fixtures']]
    rng=np.random.default_rng(171105232)
    for j in range(args.fresh):
        n=int(rng.integers(1,17));k=int(rng.integers(1,9));l=int(rng.integers(max(1,n),65));Pt=float(10**rng.uniform(-2,1))
        H=cn(rng,(k,n));S=cn(rng,(k,l));X0=cn(rng,(n,l));X0*=np.sqrt(l*Pt/norm2(X0))
        rho=[0,.001,.1,.5,.9,1-1e-10,1][j%7]
        inputs.append({'name':'portable-fresh-'+str(j),'H':pack(H),'S':pack(S),'X0':pack(X0),'rho':rho,'Pt':Pt,'tieBreak':'radar-closest' if j%2 else 'canonical','provenance':'General supplied-reference validation, not source strict-covariance generation'})
    script="const c=require(process.argv[1]);let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const a=JSON.parse(s);process.stdout.write(JSON.stringify(a.map(p=>c.solve(p.H,p.S,p.X0,p.rho,p.Pt,{tieBreak:p.tieBreak||'canonical'}))));});"
    cp=subprocess.run(['node','-e',script,str(args.core.resolve())],input=json.dumps(inputs),text=True,capture_output=True,check=True)
    outputs=json.loads(cp.stdout);rows=[]
    for p,a in zip(inputs,outputs):
        H,S,X0=(unpack(p[k]) for k in ['H','S','X0']);X=unpack(a['X']);r=solve(H,S,X0,p['rho'],p['Pt'],tie_break=p.get('tieBreak','canonical'));m=evaluate(H,S,X0,p['rho'],p['Pt'],X);E=p['Pt']*S.shape[1]
        scale=r['certificate'].get('objectiveCertificateScale',max(1,m['weightedObjective']));gap=m['weightedObjective']-r['metrics']['weightedObjective']
        assert m['energyResidualRelative']<2e-10 and abs(gap)<2e-9*scale,p['name']
        if E:
            Q,G,c=problem_parts(H,S,X0,p['rho']);lam=a['certificate']['lambda'];res=linalg.norm((Q+lam*np.eye(Q.shape[0]))@X-G,'fro');psd=linalg.eigvalsh(Q+lam*np.eye(Q.shape[0]))[0]
            bound=4*E*max(0,-psd)+4*np.sqrt(E)*res+abs(lam)*abs(norm2(X)-E)
            assert bound<2e-8*scale,p['name']
        else:bound=0
        rows.append({'name':p['name'],'inputSha256':input_hash(p),'branch':a['branch'],'energyRelativeResidual':m['energyResidualRelative'],'objectiveGapRelativeToCertificateScale':gap/scale,'independentBoundGapRelativeToCertificateScale':bound/scale,'elapsedComputeMs':a['elapsedComputeMs']})
    result={'status':'passed','coreSHA256':CORE_SHA,'referenceSHA256':REFERENCE_SHA,'fixtureCases':len(inputs)-args.fresh,'freshCases':args.fresh,'seed':171105232,'cases':len(rows),'maxEnergyRelativeResidual':max(x['energyRelativeResidual'] for x in rows),'maxObjectiveRelativeGap':max(abs(x['objectiveGapRelativeToCertificateScale']) for x in rows),'maxIndependentBoundRelativeGap':max(x['independentBoundGapRelativeToCertificateScale'] for x in rows),'scope':'Actual fresh JavaScript X audited by separate Python objective, equality energy, PSD/KKT and independently accepted reference. No UI/browser/figure-reproduction claim.','rows':rows}
    args.output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='rows'},indent=2))
if __name__=='__main__':main()
