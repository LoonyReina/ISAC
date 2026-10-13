#!/usr/bin/env python3
"""Check production teaching projections against independently reconstructed NumPy arrays.
Usage: python3 adapter-oracle.py scientific-record.json teaching-projection.json
No JavaScript math or fixtures imported; no new optimization or source authentication.
"""
import json,sys,numpy as np
record=json.load(open(sys.argv[1])); teaching=json.load(open(sys.argv[2])); c=record['settings']['config']; P=c['power']; n=c['side']**2
assert teaching['recordId']==record['runId']
axis=(np.arange(c['side'])-(c['side']-1)/2)*c['wavelength']/2
coords=np.array([[x,y,0.] for x in axis for y in axis]); points=np.array(c['users']+c['targets'])
def channel(points):
 d=np.asarray(points)[:,None,:]-coords[None,:,:];r=np.linalg.norm(d,axis=2)
 return np.sqrt(6)*d[:,:,2]*c['wavelength']/(4*np.pi*r*r)*np.exp(-2j*np.pi*r/c['wavelength'])
def mat(a):return (np.array(a['re'])+1j*np.array(a['im'])).reshape(a['rows'],a['cols'])
def equal(actual,want,label):
 a=np.asarray(actual);b=np.asarray(want);e=float(np.linalg.norm(a-b));limit=1e-11+3e-7*float(np.linalg.norm(b))
 assert np.all(np.isfinite(a)) and e<=limit,(label,e,limit)
h=channel(points);norms=np.linalg.norm(h,axis=1);H=h/norms[:,None];B=H.conj().T@np.linalg.inv(H@H.conj().T);G=B.conj().T@B
for i,ch in enumerate(teaching['projection']['geometry']['channels']):
 equal(ch['norm'],norms[i],'channel norm')
 equal([e['position'] for e in ch['elements']],coords,'element coordinates')
 equal([e['real']+1j*e['imaginary'] for e in ch['elements']],h[i],'channel entries')
for saved,view in zip(record['payload']['results'],teaching['projection']['modes']):
 assert saved['mode']==view['mode'] and saved['accepted']==view['accepted']
 if 'matrices' not in saved:assert 'matrices' not in view;continue
 m=saved['matrices'];v=view['matrices'];R=mat(m['R']);Fs=[mat(x) for x in m['F']];oldRs=R-sum(Fs);beams=mat(m['beams']);ff=[np.outer(beams[:,k],beams[:,k].conj()) for k in range(2)];lift=lambda A:P*B@A@B.conj().T
 values={'rx':mat(m['rx']),'rs':mat(m['rs']),'F1':lift(Fs[0]),'F2':lift(Fs[1]),'rsOld':lift(oldRs),'ff1':ff[0],'ff2':ff[1],'delta1':lift(Fs[0])-ff[0],'delta2':lift(Fs[1])-ff[1],'beams':beams,'basis':B,'metricG':G,'physicalH':h,'normalizedH':H,'reducedR':R,'reducedF1':Fs[0],'reducedF2':Fs[1],'reducedRs':mat(m['Rs'])}
 for key,A in values.items():equal(mat(v[key]),A,key)
 s=saved.get('sampler')
 if s and 'sampleX' in s:
  X=mat(s['sampleX']);N=mat(s['sampleNoise']);Rhat=X@X.conj().T/c['snapshots'];Rnoise=N@N.conj().T/c['snapshots']
  equal(mat(v['empirical']),Rhat,'empirical covariance');equal(mat(v['receiveEmpirical']),Rnoise,'literal receive covariance');equal(view['sampling']['txEigenvalues'],np.linalg.eigvalsh(Rhat),'tx eigenvalues');equal(view['sampling']['rxEigenvalues'],np.linalg.eigvalsh(Rnoise),'rx eigenvalues')
  assert view['sampling']['empiricalRank']<=5 and view['sampling']['literalYMinusNoiseNorm']==0
  for target in view['sampling']['literalTargets']:assert target['channelNorm']==0 and target['normalizationDenominator']==0
 sl=teaching['slice'];p=np.array([[sl['x'],y,z]for z in sl['zs']for y in sl['ys']]);ha=channel(p);hn=ha/np.linalg.norm(ha,axis=1)[:,None];a=next(a for a in sl['modes']if a['mode']==saved['mode']);Rx=values['rx']
 equal(a['physical'],np.einsum('ij,jk,ik->i',ha,Rx,ha.conj()).real,'full physical slice')
 equal(a['normalized'],np.einsum('ij,jk,ik->i',hn,Rx,hn.conj()).real,'full normalized slice')
for target in teaching['slice']['targets']:assert target['inPlane']==(abs(target['position'][0]-teaching['slice']['x'])<=1e-12)
print(json.dumps({'selfConsistent':True,'sourceAuthenticated':False,'freshSolve':False,'scope':'all teaching complex matrices, channels, empirical spectra and full illumination grids','recordId':record['runId']}))
