"""Independent-formula replay of actual production Blob downloads, not UI helpers.
No JS/core/reference imports; NumPy reconstructs every raw-only receiver/map/candidate.
This is author QA, distinct from an external independent acceptance and browser QA.
"""
import hashlib, json, pathlib, sys
import numpy as np
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/pilot-pattern-lesson-tests')
checks=0; max_error=0.
def check(actual,expected,name,tol=1e-10):
 global checks,max_error
 checks+=1
 a=np.asarray(actual); b=np.asarray(expected)
 if a.shape!=b.shape: raise AssertionError((name,a.shape,b.shape))
 err=float(np.max(np.abs(a-b))) if a.size else 0.
 max_error=max(max_error,err)
 # Coherent sums near zero use the declared array-scale residual, not a
 # component-relative test that amplifies cancellation roundoff.
 scale=float(np.max(np.abs(b))) if b.size else 0.
 if err>1e-12+tol*scale: raise AssertionError((name,err,scale))
def z(values):
 a=np.asarray(values,dtype=float);return a[::2]+1j*a[1::2]
def flat(a):
 return np.stack([a.real,a.imag],axis=-1).reshape(-1)
def pick(power,ds,fs):
 mx=float(np.max(power)); eps=1e-12*mx
 if mx<=0:return []
 raw=[]
 for fi in range(len(fs)):
  for di in range(len(ds)):
   p=float(power[fi,di])
   if p<.05*mx:continue
   hood=power[max(0,fi-1):fi+2,max(0,di-1):di+2]
   if np.all(p>=hood-eps):raw.append((p,fi,di))
 raw.sort(key=lambda v:(-v[0],v[1],v[2])); grouped=[];i=0
 while i<len(raw):
  end=i+1
  while end<len(raw) and raw[i][0]-raw[end][0]<=eps:end+=1
  for p,fi,di in sorted(raw[i:end],key=lambda v:(v[1],v[2])):grouped.append((p,fi,di,end-i))
  i=end
 chosen=[]
 for p,fi,di,size in grouped:
  d=float(ds[di]); f=float(fs[fi])
  if any(abs(c['delay_samples']-d)<=2 and abs(c['doppler_hz']-f)<=150 for c in chosen):continue
  chosen.append(dict(delay_samples=d,doppler_hz=f,power=p,near_tie_group_size=size,near_tie_power_tolerance=eps))
  if len(chosen)==8:break
 return chosen
records=[]
for pathname in sorted(root.glob('*.json')):
 if pathname.name in ['results.json','independent-formula-replay.json']:continue
 rec=json.loads(pathname.read_text());o=rec['observation'];spec=o['grid'];N=spec['N'];cp=spec['Ncp'];S=spec['S'];J=spec['J'];df=spec['delta_f'];F=np.asarray(spec['offsets']);M=len(F);K=N//S;B=N+cp;T=B/(N*df)
 y=z(o['y']);pilots=z(o['pilots']).reshape(M,K);ds=np.asarray(rec['processing']['axes']['delay_samples']);fs=np.asarray(rec['processing']['axes']['doppler_hz']);tones=np.arange(K)[None,:]*S+F[:,None]
 expected_alias=[[a,b]for a in range(1,S)for b in range(S)if all((i*b-(int(F[i])-int(F[0]))*a)%S==0 for i in range(M))]
 assert rec['results']['aliases']['witnesses']==expected_alias;checks+=1
 branch_results=[]
 for b in rec['results']['branches']:
  ell=b['ell'];L=N-ell*K;n=(1+np.arange(M)[:,None]*J)*B+cp+ell*K+np.arange(L)[None,:];ret=y[n];rot=ret*np.exp(-2j*np.pi*F[:,None]*(ell*K+np.arange(L)[None,:])/N);short=np.fft.fft(rot,axis=1)/N;bins=(S-ell)*np.arange(K);selected=short[:,bins];H=selected*N/L/pilots
  for name,value in [('indices',n.reshape(-1)),('retained',flat(ret)),('derotated',flat(rot)),('short_fft',flat(short)),('selected_bins',bins),('tones',tones.reshape(-1)),('selected_before_restore',flat(selected))]:check(b['trace'][name],value,name)
  check(b['H'],flat(H),'H');Z=np.exp(-2j*np.pi*fs[:,None]*np.arange(M)[None,:]*J*T)@np.sum(H[:,:,None]*np.exp(2j*np.pi*tones[:,:,None]*ds[None,None,:]/N),axis=1);P=np.abs(Z)**2/(M*K)**2
  check(b['map']['Z'],flat(Z),'Z');check(b['map']['raw_power'],np.abs(Z).reshape(-1)**2,'raw power');check(b['map']['normalized_power'],P.reshape(-1),'normalized power');check(b['trace']['retained_received_energy'],np.sum(np.abs(ret)**2),'received energy');check(b['budget']['noise_variance_amplification'],N/L,'noise amplification')
  candidates=pick(P,ds,fs);assert len(candidates)==len(b['candidates']);checks+=1
  for actual,want in zip(b['candidates'],candidates):
   for name,value in want.items():check(actual[name],value,'candidate '+name)
  if o['generator']:
   gen=o['generator'];clean=z(gen['clean']);noise=z(gen['noise']);check(y,clean+noise,'clean+noise raw');x=z(gen['x']);check(b['budget']['retained_actual_transmit_energy'],np.sum(np.abs(x[n])**2),'retained transmit energy');var=gen['config']['noise_variance'];check(b['noise_variance_cells'],(var/(L*np.abs(pilots)**2)).reshape(-1),'unequal pilot noise');check(gen['ledger']['frame_energy'],np.sum(np.abs(x)**2),'whole frame energy');full=(1+np.arange(M)[:,None]*J)*B+np.arange(B)[None,:];check(gen['receive_ledger']['clean_mean_power'],np.mean(np.abs(clean[full])**2),'live SNR plane')
  if rec['evaluation_scene'] is not None:
   scene=rec['evaluation_scene'];ideal=np.zeros((M,K),complex)
   for delay,f,gain in zip(scene['delays_samples'],scene['dopplers_hz'],z(scene['gains'])):ideal+=gain*np.exp(-2j*np.pi*tones*delay/N)*np.exp(2j*np.pi*f*np.arange(M)[:,None]*J*T)
   den=np.sum(np.abs(ideal)**2)
   if den==0:assert b['evaluation']['cell_nmse_source_ideal'] is None;checks+=1
   else:check(b['evaluation']['cell_nmse_source_ideal'],np.sum(np.abs(H-ideal)**2)/den,'evaluation NMSE')
  else:assert b['evaluation'] is None;checks+=1
  branch_results.append({'ell':ell,'retained':L,'candidates':len(candidates),'map':[len(fs),len(ds)]})
 records.append({'file':pathname.name,'sha256':hashlib.sha256(pathname.read_bytes()).hexdigest(),'observation_kind':o['kind'],'branches':branch_results})
result={'status':'passed','checks':checks,'maximum_absolute_difference':max_error,'scope':'raw-only NumPy formulas, full trace/H/Z/power/candidates, aliases, optional noise/energy/NMSE; no author numerical helper imports','separate_external_review':False,'browser_engine':False,'records':records}
(root/'independent-formula-replay.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
