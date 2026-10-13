"""Independent SciPy source solver comparison, no changes to reference files."""
from pathlib import Path
import sys,json
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
REFERENCE=ROOT.parent/'cellfree-maprt-reference'
sys.path.insert(0,str(REFERENCE))
from src.power import PowerProblem
from scripts.run_reference import feasible_starts

def main():
    data=np.load(REFERENCE/'evidence/selected/design_and_channel_moments.npz')
    settings=json.loads((REFERENCE/'evidence/selected/settings.json').read_text())
    cases=[]
    # The control values and congruence factors are fresh, continuously valued
    # inputs, not saved allocation tables or hard-coded output powers.
    for name,db,cap,af,bf,leak in [('fresh_a',2.73,.913,[1.031,.982,1.014],1.173,.937),('fresh_b',3.17,1.087,[.973,1.027,.989],.843,1.041),('fresh_c',2.91,.967,[1.016,.991,1.034],1.071,1.023),('fresh_sensing',3.083,.953,[1.731,.979,1.012],.913,.983)]:
        D=np.diag(af);A=D@data['A_rcs0']@D;B=data['B']*bf
        args=dict(A=A,B=B,noise_energy=settings['tau_s']*settings['Nrx']*settings['M']*settings['noise_variance_w'],b=data['b'],a=data['a']*leak,power_coeff=data['power_coeff'],cap=cap,gamma=10**(db/10))
        p=PowerProblem(**args);comm=p.communication_centric()
        starts={};ccp={};direct={}
        for with_sensing in [False,True]:
            key='with_sensing' if with_sensing else 'without_sensing'
            starts[key]=[v.tolist() for v in feasible_starts(p,comm,with_sensing)]
            ccp[key]=[p.ccp(v,allow_sensing=with_sensing) for v in starts[key]]
            direct[key]=[p.direct_ratio(v,allow_sensing=with_sensing) for v in starts[key]]
        cases.append(dict(name=name,problem={k:v.tolist() if isinstance(v,np.ndarray) else v for k,v in args.items()},scipy_communication=comm,starts=starts,scipy_ccp=ccp,scipy_direct_ratio=direct))
    out=ROOT/'tests/power_oracle_cases.json';out.write_text(json.dumps(dict(source='Independent invocation of unmodified Python/SciPy src/power.py; fresh continuous input cases',cases=cases),indent=2,allow_nan=False)+'\n')
    print(out)
if __name__=='__main__':main()
