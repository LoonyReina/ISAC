"""Equivalent real-coordinate QSDP with explicit real PSD cones.
This is a supplementary certification attempt; primary outcomes remain immutable.
"""
from reference import *
from experiment import accepted
ROOT=Path(__file__).parent
class PSDDual:
    def __init__(self,c,m): self.c=c;self.m=m
    @property
    def dual_value(self):
        z=np.asarray(self.c.dual_value);m=self.m
        return herm(z[:m,:m]+z[m:,m:]+1j*(z[m:,:m]-z[:m,m:]))
    def violation(self): return self.c.violation()

class RealConeSolver(Solver):
    def __init__(self,model,kind,H=None):
        self.model=model;self.kind=kind;self.H=H;m=model.cfg.antennas;cfg=model.cfg
        self.alpha=cp.Variable(name='alpha'); x=cp.Variable(m*m,name='R_coordinates')
        def matrix(t): return cp.reshape(model.basis.real.reshape(m*m,m*m).T@t,(m,m),order='C')+1j*cp.reshape(model.basis.imag.reshape(m*m,m*m).T@t,(m,m),order='C')
        def psd(t):
            a=cp.real(t); b=cp.imag(t); return cp.bmat([[a,-b],[b,a]]) >> 0
        self.R=matrix(x)
        cons=[psd(self.R),x[:m]==cfg.total_power/m];psds=[0]
        self.Rks=[];self.p=None;self.sinr_cons=[]
        self.g=cp.Parameter(nonneg=True,value=1);self.a=cp.Parameter(nonneg=True,value=2);self.b=cp.Parameter(nonneg=True,value=1)
        if kind=='sdr':
            self.Rks=[matrix(cp.Variable(m*m,name=f'R{k}_coordinates')) for k in range(len(H))]
            cons += [psd(self.R-sum(self.Rks))]+[psd(r) for r in self.Rks]
            psds += list(range(2,3+len(H)))
            for j,r in enumerate(self.Rks):
                h=H[j].conj();cons.append(self.a*cp.real(H[j]@r@h)-self.b*cp.real(H[j]@self.R@h)>=self.b*cfg.noise)
        elif kind=='zf':
            self.p=cp.Variable(len(H));cons += [H@self.R@H.conj().T==cp.diag(self.p),self.p>=self.g*cfg.noise]
        self.problem=cp.Problem(cp.Minimize(cp.sum_squares(model.QR@cp.hstack((x,self.alpha)))),cons)
        self.constraints=[PSDDual(c,m) if i in psds else c for i,c in enumerate(cons)]
    def solve(self,*args,**kwargs):
        result=super().solve(*args,**kwargs)
        result['formulation']='explicit-real-Hermitian-basis-and-real-PSD-cones'
        if 'kkt' in result: result['kkt']['complex_psd_dual_convention']='Adjoint of explicit realification, Z=A+D+j(C-B)'
        return result

if __name__=='__main__':
    model=RadarModel();R0=matrix_from_json(json.loads((ROOT/'results/radar.json').read_text())['R'])
    for trial,gd in [(2,22),(6,22),(0,24)]:
        r=RealConeSolver(model,'sdr',rng_channel(2026101201+trial)).solve(gd,'CLARABEL',R0=R0)
        r['accepted'],r['gate_failures']=accepted(r)
        save_json(ROOT/f'results/refinement-probe-{trial:03d}-{gd}.json',r)
        print(trial,gd,r['status'],r['accepted'],r['gate_failures'],r['elapsed_seconds'],r.get('kkt'),flush=True)
