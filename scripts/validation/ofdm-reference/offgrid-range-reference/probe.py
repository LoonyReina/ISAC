import numpy as np, math
MASK=(1<<32)-1
class Rng:
 def __init__(self,seed,domain):
  h=2166136261
  for c in domain: h=((h^ord(c))*16777619)&MASK
  z=seed^h
  def mix():
   nonlocal z
   z=(z+0x9e3779b9)&MASK;v=z;v=((v^(v>>16))*0x21f0aaad)&MASK;v=((v^(v>>15))*0x735a2d97)&MASK
   return (v^(v>>15))&MASK
  self.state=[mix() for _ in range(4)];self.spare=None
 def u(self):
  a,b,c,d=self.state
  rot=lambda v,k:((v<<k)|(v>>(32-k)))&MASK
  v=(rot((b*5)&MASK,7)*9)&MASK;t=(b<<9)&MASK;c^=a;d^=b;b^=c;a^=d;c^=t;d=rot(d,11);self.state=[a,b,c,d]
  return (v+.5)/(1<<32)
 def n(self):
  if self.spare is not None: z=self.spare;self.spare=None;return z
  r=math.sqrt(-2*math.log(self.u()));p=2*math.pi*self.u();self.spare=r*math.sin(p);return r*math.cos(p)
X=np.array([1,1j,-1,-1j,1j,1,-1j,-1,-1,1j,1,-1j,1,-1,-1j,1j])/4
k=np.arange(16);gr=np.arange(241)*.5;A=X[:,None]*np.exp(-2j*np.pi*k[:,None]*1e6*(2*gr[None,:]/3e8))
for seed in [7,31,2026]:
 for truth in [25.1,43.7,50.1,60.1,75.1,90.1]:
  for snr in [-10,-5]:
   rows=[]
   for b in range(1000):
    rng=Rng(seed,f'offgrid-range-v1/noise/trial/{b}')
    z=np.array([complex(rng.n(),rng.n()) for _ in range(16)])
    y=np.exp(.7j)*X*np.exp(-2j*np.pi*k*1e6*(2*truth/3e8))+math.sqrt(1/(16*10**(snr/10))/2)*z
    sc=abs(A.conj().T@y)**2
    coarse=gr[::10][np.argmax(sc[::10])];fine=gr[np.argmax(sc)]
    rows.append([coarse-truth,fine-truth])
   rows=np.array(rows);rm=np.sqrt(np.mean(rows**2,axis=0));print(seed,truth,snr,rm,np.sum(abs(rows)>9.375,axis=0),flush=True)
