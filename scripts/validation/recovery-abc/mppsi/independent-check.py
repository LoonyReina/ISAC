import json, math, cmath, pathlib, os
root=pathlib.Path(__file__).parent
fixtures=json.loads(pathlib.Path(os.environ.get('ISAC_MPPSI_FIXTURES',str(root/'fixtures.json'))).read_text())
worst=0.; comparisons=0

def close(a,b):
 global worst,comparisons
 if isinstance(a,list):
  assert len(a)==len(b)
  for x,y in zip(a,b):close(x,y)
 else:
  err=abs(a-b);worst=max(worst,err);comparisons+=1
  assert err<3e-11,(a,b,err)
def cx(z):return complex(z['re'],z['im'])
def soft(l):
 m=max(l); w=[math.exp(x-m) for x in l];s=sum(w);return [x/s for x in w]
def reference(i):
 H=[[cx(z) for z in row] for row in i['H']];y=list(map(cx,i['y']));s=list(map(cx,i['constellation']));R=len(H);C=len(H[0]);Q=len(s)
 cfg=i['settings'];delta=cfg.get('damping',.7);gamma=cfg.get('gamma',.01);drop=cfg.get('drop',.2);cap=cfg['maxIterations'];p=[[[1/Q]*Q for c in range(C)] for d in range(R)];prev=0;maximum=0;selected=None;hist=[];trace=[]
 for it in range(1,cap+1):
  ll=[[[0.]*Q for c in range(C)] for d in range(R)]; moments={}
  for d in range(R):
   for c in range(C):
    # Direct sum over OTHER symbols (no total-minus-self); residual-square likelihood.
    mu=0j;v=i['noiseVariance']
    for j in range(C):
     if j==c:continue
     mean=sum(p[d][j][a]*s[a] for a in range(Q))
     var=sum(p[d][j][a]*abs(s[a]-mean)**2 for a in range(Q))
     mu+=H[d][j]*mean;v+=abs(H[d][j])**2*var
    ll[d][c]=[-abs(y[d]-mu-H[d][c]*a)**2/v for a in s] if H[d][c] else [0.]*Q
    moments[d,c]=(mu,v)
  post=[soft([sum(ll[d][c][a] for d in range(R)) for a in range(Q)]) for c in range(C)]
  ext=[[soft([sum(ll[j][c][a] for j in range(R) if j!=d) for a in range(Q)]) for c in range(C)] for d in range(R)]
  new=[[[delta*ext[d][c][a]+(1-delta)*p[d][c][a] if H[d][c] else 1/Q for a in range(Q)] for c in range(C)] for d in range(R)]
  eta=sum(max(row)>=1-gamma for row in post)/C;maximum=max(maximum,eta);update=eta>prev
  if selected is None:selected=post;selected_it=it;fallback=not update
  if update:selected=post;selected_it=it;fallback=False
  status='all_confident' if eta==1 else 'confidence_drop' if eta<maximum-drop else 'iteration_cap' if it==cap else 'running'
  edge=next(((d,c) for d in range(R) for c in range(C) if H[d][c]),(0,0));d,c=edge
  hist.append((post,moments[edge],ext[d][c],new[d][c],p[d][c]))
  trace.append((eta,maximum,update,status));p=new;prev=eta
  if status!='running':break
 return selected,post,selected_it,fallback,status,hist,trace
for f in fixtures['cases']:
 r=f['result'];sel,post,it,fb,status,hist,trace=reference(f['input'])
 close(sel,r['probabilities']);close(post,r['final_probabilities']);assert (it,fb,status)==(r['selected_iteration'],r['fallback_used'],r['status'])
 for (post,(mu,var),ext,msg,old),h,t,rt in zip(hist,r['history'],trace,r['trace']):
  close(post,h['posterior']);close(mu,cx(h['edge0']['mean']));close(var,h['edge0']['variance']);close(ext,h['edge0']['extrinsic']);close(msg,h['edge0']['messages']);close(old,h['edge0']['oldMessage'])
  assert t==(rt['eta'],rt['max_eta'],rt['updated_decision'],rt['status'])
 if f.get('exactDiagonal'):
  i=f['input'];exact=[soft([-abs(cx(i['y'][c])-cx(i['H'][c][c])*cx(a))**2/i['noiseVariance'] for a in i['constellation']]) for c in range(2)];close(exact,r['probabilities'])
result={'independent_reference':'Python complex arithmetic, direct exclusion sums and residual-square likelihood','cases':len(fixtures['cases']),'scalar_comparisons':comparisons,'max_absolute_error':worst,'tolerance':3e-11,'all_passed':True,'original_1000_frame_study_replayed':False}
pathlib.Path(os.environ.get('ISAC_MPPSI_REPORT',str(root/'numerical-report.json'))).write_text(json.dumps(result,indent=2));print(json.dumps(result))
