from pathlib import Path
import importlib.util,json,copy,numpy as np,os
ROOT=Path('/workspace/shared/isac-paper-execution');OUT=ROOT/'joint-beamforming-review'
spec=importlib.util.spec_from_file_location('checker',Path(os.environ.get('CHECKER_PATH',str(OUT/'export-checker-initial-snapshot.py'))));c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
radar=json.loads((ROOT/'joint-beamforming-browser-prototype/results/js-radar/m10.json').read_text())
zf=json.loads((OUT/'js-v03-regression-fixtures/trial-00-gamma-12-zf.json').read_text())
sdr=json.loads((OUT/'js-v03-regression-fixtures/trial-00-gamma-12-sdr.json').read_text())
def pack(a):return {'real':np.asarray(a).real.tolist(),'imag':np.asarray(a).imag.tolist()}
results=[]
def run(name,document,expected_pass=False,detail=None):
 r=c.audit_document(document);results.append({'name':name,'expected_pass':expected_pass,'actual_pass':r['passed'],'caught_as_expected':r['passed']==expected_pass,'detail':detail,'audit':r});return r
run('valid_radar',radar,True);run('valid_sdr',sdr,True);run('valid_zf',zf,True)
malformed=copy.deepcopy(radar);del malformed['H'];run('mixed_envelope_silently_skips_missing_H',{'results':[radar,malformed]})
x=copy.deepcopy(radar);x['settings']['tolerance']=1.;run('trusts_unvalidated_loose_tolerance',x)
x=copy.deepcopy(radar);x['Wc']['imag']=[];run('broadcasts_mismatched_matrix_shapes',x)
x=copy.deepcopy(radar);m=x['M'];d=m*m;rho=x['finalState']['rho'];weight=x['settings']['linearWeight'];x['finalState']['w'][0]+=10/rho;x['finalState']['w'][d]-=10/(weight*rho);run('accepts_w_with_wrong_projection_but_same_ATdual',x,detail='Changed w by A-transpose nullspace vector; z no longer equals projection_C(w).')
x=copy.deepcopy(zf);Wc=c.decode(x['Wc']);Wr=c.decode(x['Wr']);H=c.decode(x['H']);theta=.05;U=np.array([[np.cos(theta),-np.sin(theta)],[np.sin(theta),np.cos(theta)]]);Wc=Wc@U;x['Wc']=pack(Wc);Fc=H@Wc;Fr=H@Wr;sig=abs(np.diag(Fc))**2;inter=np.sum(abs(Fc)**2,axis=1)-sig;rad=np.sum(abs(Fr)**2,axis=1);sinr=sig/(inter+rad+.01);fm=x['metrics']['factor'];fm['Fc']=pack(Fc);fm['Fr']=pack(Fr);fm['users']=[dict(desired=float(sig[j]),interuser=float(inter[j]),radar=float(rad[j]),noise=.01,sinr=float(sinr[j]),sinrDb=float(10*np.log10(sinr[j]))) for j in range(2)];fm['minSinrDb']=float(10*np.log10(sinr.min()));fm['relativeSinrShortfall']=max(0.,float((x['gammaLinear']-sinr.min())/x['gammaLinear']));run('accepts_non_ZF_rotated_communication_factors',x,detail={'HWc_offdiag_max':float(np.max(abs(Fc-np.diag(np.diag(Fc))))),'min_sinr_db':fm['minSinrDb']})
x=copy.deepcopy(sdr);H=c.decode(x['H']);R=c.decode(x['R']);Rks=[c.decode(v) for v in x['Rks']];h=H[0].conj();v=np.eye(len(h),dtype=complex)[:,0];v-=h*np.vdot(h,v)/np.vdot(h,h);v/=np.linalg.norm(v);N=np.outer(v,v.conj());Rks[0]+=N;x['Rks'][0]=pack(Rks[0]);m=x['M'];d=m*m;B,A,lo,eq,blocks=c.setup(m,H,'sdr',x['gammaLinear'],x['settings']['linearWeight']);xx=np.asarray(x['finalState']['x']);xx[d:2*d]=np.einsum('bij,ji->b',B,Rks[0]).real
st=np.exp(1j*np.pi*np.outer(np.sin(np.deg2rad(c.ANGLES)),np.arange(m)));tt=np.exp(1j*np.pi*np.outer(np.sin(np.deg2rad(c.TARGETS)),np.arange(m)));pat=np.sum(st.conj()*(R@st.T).T,axis=1).real;alpha=c.D@pat/(c.D@c.D);G=2*(st.T*(pat-alpha*c.D))@st.conj()/len(c.D);corr=tt.conj()@R@tt.T
for p,q in c.PAIRS:
 C=np.outer(tt[p],tt[q].conj());G+=(corr[q,p].conjugate()*C+corr[q,p]*C.conj().T)/3
grad=np.zeros_like(xx);grad[:d]=np.einsum('bij,ji->b',B,G).real;zz=A@xx;yy=-A@np.linalg.solve(A.T@A,grad);ww=zz+yy/x['finalState']['rho'];x['finalState'].update(x=xx.tolist(),z=zz.tolist(),w=ww.tolist());x['residuals']['primalInf']=0.;x['residuals']['stationarityInf']=float(np.max(abs(grad+A.T@yy)));run('accepts_nonPSD_SDR_remainder_and_forged_cone_state',x,detail={'remainder_min_eigenvalue':float(np.linalg.eigvalsh(c.herm(R-sum(Rks))).min())})
run('valid_result_wrapper_with_method_status',{'methods':[{'method':'sdr','status':'completed','attempted':True,'result':sdr}]},True)
run('mixed_attempted_missing_result',{'results':[radar], 'other':{'attempted':True}})
run('mixed_attempted_scalar_result',{'results':[radar], 'other':{'attempted':True,'result':'corrupt'}})
run('mixed_attempted_list_result',{'results':[radar], 'other':{'attempted':True,'result':[]}})
run('valid_with_unattempted_null_slot',{'results':[radar], 'other':{'attempted':False,'result':None}},True)
x=copy.deepcopy(radar);x['optimizationCertificate']['stationarityOperatorNorms'].append(0.);run('extra_operator_penalty_component',x)
x=copy.deepcopy(radar);x['metrics']['factor']['Fc']={'real':[[1.]],'imag':[[0.]]};run('radar_invented_effective_communication_matrix',x)
x=copy.deepcopy(radar);del x['H'];x['attempted']=False;x['result']=None;run('raw_result_hidden_by_unattempted_wrapper_flags',{'valid':radar,'hidden':x})
x=copy.deepcopy(radar);x['M']=1000000;run('oversized_dimension_fails_before_setup',x)
(OUT/os.environ.get('CHECKER_AUDIT_OUTPUT','export_checker_initial_mutation_audit.json')).write_text(json.dumps(results,indent=2)+'\n');print(json.dumps([{k:r[k] for k in ['name','expected_pass','actual_pass','caught_as_expected','detail']} for r in results],indent=2))
