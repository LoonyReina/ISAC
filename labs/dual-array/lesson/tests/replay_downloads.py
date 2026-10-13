"""Independent scalar/formula replay of actual production Blob-download records.
Imports no producer JS, Python reference, materializer or prior oracle.
This is owner-authored independent-formula evidence, not independent acceptance.
"""
import sys,json,hashlib,math,pathlib
import numpy as np
from scipy.linalg import eigh
root=pathlib.Path(sys.argv[1]); checks=0; worst=0.; cases=[]
def cmp(a,b,name,rtol=1e-9,scale=None):
 global checks,worst
 aa=np.asarray(a,float);bb=np.asarray(b,float);assert aa.shape==bb.shape,(name,aa.shape,bb.shape)
 sc=float(np.max(np.abs(bb),initial=0)) if scale is None else float(scale)
 err=float(np.max(np.abs(aa-bb),initial=0));checks+=aa.size or 1
 assert err <= rtol*sc+1e-290,(name,err,sc,rtol)
 if sc:worst=max(worst,err/sc)
def cm(m):return np.asarray(m['data'],float).reshape(m['rows'],m['cols'],2).view(np.complex128).reshape(m['rows'],m['cols'])
def packed(a):return np.stack([a.real,a.imag],axis=-1).reshape(-1).tolist()
def sha(m):return hashlib.sha256(f"({m['rows']}, {m['cols']})|".encode()+np.asarray(m['data'],dtype='<f8').tobytes()).hexdigest()
def templ(X,g,t,r):
 k=2*np.pi/g['wavelength'];s=math.sin(t);c=math.cos(t)
 a=np.asarray([complex(math.cos(k*(n*g['da']*s-(n*g['da'])**2*c*c/(2*r))),math.sin(k*(n*g['da']*s-(n*g['da'])**2*c*c/(2*r)))) for n in range(g['na'])])
 b=np.asarray([complex(math.cos(k*n*g['db']*s),math.sin(k*n*g['db']*s)) for n in range(g['nb'])])
 u=a@X;return np.outer(b,u),a,b,u
for projection in json.load(open(root/'mounted-projections.json')):
 raw=(root/projection['filename']).read_bytes();assert hashlib.sha256(raw).hexdigest()==projection['sha256'];record=json.loads(raw);e=record['execution'];req=e['request'];o=e['result'];g=req['geometry'];X=cm(req['X']);Y=cm(req['Y']);ts=req['theta_grid_rad'];rs=req['range_grid_m'];na,nb,T=g['na'],g['nb'],X.shape[1]
 assert sha(req['X'])==o['x_sha256'];assert sha(req['Y'])==o['y_sha256'];assert record['record_sha256']==projection['record_sha256'];
 Ry=Y@Y.conj().T/T;ev,V=eigh(Ry);Pn=V[:,:-1]@V[:,:-1].conj().T
 cmp(o['eigenvalues'],ev,'eigenvalues');cmp(req['X']['data'],packed(X),'actual-X');cmp(e['result']['surfaces']['covariance']['data'],packed(Ry),'covariance');cmp(e['result']['surfaces']['noise_projector']['data'],packed(Pn),'noise projector',rtol=1e-8)
 music=[];scores=np.empty((len(ts),len(rs)));betas=np.zeros_like(scores,dtype=complex);null=np.zeros_like(scores,dtype=bool);limit=128*np.finfo(float).eps*math.sqrt(na*nb*np.vdot(X,X).real)
 for i,t in enumerate(ts):
  _,_,b,_=templ(X,g,t,rs[0]);music.append(float(np.vdot(b,Pn@b).real))
  for j,r in enumerate(rs):
   d,_,_,_=templ(X,g,t,r);den=float(np.vdot(d,d).real)
   if math.sqrt(den)<=limit:null[i,j]=True;scores[i,j]=np.nan;continue
   num=np.vdot(d,Y);scores[i,j]=abs(num)**2/den;betas[i,j]=num/den
 cmp(o['surfaces']['music'],music,'music',rtol=1e-8,scale=nb)
 saved=np.asarray([np.nan if x is None else x for x in o['surfaces']['profile_scores']]).reshape(scores.shape);assert np.array_equal(np.isnan(saved),null);cmp(saved[~null],scores[~null],'complete profile surface',rtol=1e-9)
 def first_tie(values,maximize):
  flat=np.asarray(values).reshape(-1);good=np.isfinite(flat)
  if not np.any(good):return None,0,None
  best=np.max(flat[good]) if maximize else np.min(flat[good]);ids=np.flatnonzero(good&(np.abs(flat-best)<=1e-12*np.max(np.abs(flat[good]))));return int(ids[0]),len(ids),[int(ids[0]),int(ids[-1])]
 ai,_,_=first_tie(music,False);ri,rc,span=first_tie(scores[ai],True);ji,jc,jspan=first_tie(scores,True)
 for key,i,j,count,span in [('two_stage',ai,ri,rc,span),('joint',None if ji is None else ji//len(rs),None if ji is None else ji%len(rs),jc,jspan)]:
  est=o[key]
  if j is None:assert est['status']=='all-templates-null';continue
  assert (est['theta_index'],est['range_index'])==(i,j),(key,est,(i,j));assert est['ties']==count;assert est['tie_index_span']==span
  cmp(est['score'],scores[i,j],key+'score');cmp(est['beta'],[betas[i,j].real,betas[i,j].imag],key+'gain');cmp(est['profile_residual'],np.vdot(Y,Y).real-scores[i,j],key+'residual',scale=np.vdot(Y,Y).real)
 # Actual mounted projection and selected candidate use the same finite arrays.
 cell=projection['cell'];M={'X':X,'Y':Y,'Ry':Ry,'Pn':Pn}[projection['matrix']];z=M[cell['row'],cell['col']];cmp([cell['re'],cell['im']],[z.real,z.imag],'mounted complex cell')
 c=projection['candidate'];d,a,b,u=templ(X,g,c['theta_rad'],c['range_m']);cmp(c['template']['a'],packed(a),'candidate a');cmp(c['template']['b'],packed(b),'candidate b');cmp(c['template']['aTX'],packed(u),'candidate ordinary transpose aTX');cmp(c['template']['delta']['data'],packed(d),'candidate delta')
 if e['generation'] is not None:
  gen=e['generation'];scene=gen['scene'];beta=complex(*scene['beta']);sig=scene['sigma2'];t=scene['theta_rad'];r=scene['range_m'];d,*_=templ(X,g,t,r);mean=beta*d;cmp(gen['mean']['data'],packed(mean),'actual mean');cmp(gen['energy']['total_energy'],np.vdot(X,X).real,'energy');cmp(gen['energy']['per_antenna_average_power'],np.sum(abs(X)**2,axis=1)/T,'antenna powers')
  if sig>0:
   cmp(gen['source_snr_linear'],abs(beta)**2*np.vdot(X,X).real/T/sig,'source SNR');cmp(gen['received_target_mean_sample_snr_linear'],np.vdot(mean,mean).real/(nb*T*sig),'receive SNR')
   ht=1e-5;hr=max(1e-5,abs(r)*1e-5)
   dt=(-templ(X,g,t+2*ht,r)[0]+8*templ(X,g,t+ht,r)[0]-8*templ(X,g,t-ht,r)[0]+templ(X,g,t-2*ht,r)[0])/(12*ht)
   dr=(-templ(X,g,t,r+2*hr)[0]+8*templ(X,g,t,r+hr)[0]-8*templ(X,g,t,r-hr)[0]+templ(X,g,t,r-2*hr)[0])/(12*hr)
   G=np.stack([(beta*dt).reshape(-1),(beta*dr).reshape(-1),d.reshape(-1),(1j*d).reshape(-1)],axis=1);GR=np.concatenate([G.real,G.imag],axis=0);J=2/sig*(GR.T@GR);f=gen['finite_X_crb']
   cmp(f['full_fim'],J,'finite difference real FIM',rtol=2e-6)
   if np.vdot(d,d).real>0 and 'position_information' in f:
    Q,_=np.linalg.qr(GR[:,2:]);D=GR[:,:2]-Q@(Q.T@GR[:,:2]);info=2/sig*(D.T@D)
    cmp(f['position_information'],info,'real nuisance QR information',rtol=2e-5,scale=max(np.max(np.abs(info)),1e-25))
    if f['status']=='regular':C=np.linalg.inv(info);cmp(f['crb'],C,'CRB',rtol=2e-5);cmp([f['rcrb']['angle_deg'],f['rcrb']['range_m']],[math.sqrt(C[0,0])*180/math.pi,math.sqrt(C[1,1])],'RCRB units',rtol=2e-5)
 if projection['name']=='same-y-coarse':
  a=json.load(open(root/'rank2-nonreal-gain.json'));assert a['execution']['result']['x_sha256']==o['x_sha256'];assert a['execution']['result']['y_sha256']==o['y_sha256'];assert e['generation'] is None
 cases.append({'case':projection['name'],'full_grid_candidates':len(ts)*len(rs),'status':o['joint']['status'],'record_sha256':record['record_sha256']})
a=json.load(open(root/'alias-witness.json'));X=cm(a['X']);p1,p2=a['points'];d1,*_=templ(X,a['geometry'],math.radians(p1[0]),p1[1]);d2,*_=templ(X,a['geometry'],math.radians(p2[0]),p2[1]);rel=np.linalg.norm(d1-d2)/np.linalg.norm(d1);assert rel<a['threshold'];
report={'status':'passed','owner_authored_independent_formula_replay':True,'browser_acceptance':False,'numeric_values_compared':checks,'maximum_normalized_error':worst,'alias_template_relative_residual':float(rel),'cases':cases};(root/'independent-formula-replay.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
