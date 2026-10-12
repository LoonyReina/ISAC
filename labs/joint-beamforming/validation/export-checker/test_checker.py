from pathlib import Path
import copy,json
from check_export import audit_result,audit_document
ROOT=Path(__file__).resolve().parent;P=ROOT.parent/'joint-beamforming-browser-prototype';checks=[]
for folder in ['js-benchmark','js-extra','js-radar','js-ui-budgets']:
 for p in sorted((P/'results'/folder).glob('*.json')):
  r=json.loads(p.read_text())
  if not isinstance(r,dict) or 'method' not in r:continue
  a=audit_result(r);assert a['passed'],(str(p),a['issues']);checks.append({'file':str(p.relative_to(P)),'passed':True,'status':r['status']})
base=json.loads((P/'results/js-benchmark/trial-00-gamma-12-sdr.json').read_text());radar=json.loads((P/'results/js-radar/m10.json').read_text());cert=json.loads((P/'results/js-benchmark/infeasible-trial-06-zf.json').read_text())
mutations=[]
def mutation(name,source,fn):
 r=copy.deepcopy(source);fn(r);a=audit_result(r);assert not a['passed'],name;mutations.append({'name':name,'rejected':True,'issues':a['issues']})
mutation('objective altered',base,lambda r:r['metrics'].__setitem__('objective',0))
mutation('H changed without rerun',base,lambda r:r['H']['imag'][0].__setitem__(0,1))
mutation('user SINR fabricated',base,lambda r:r['metrics']['factor']['users'][0].__setitem__('sinr',1e6))
mutation('factor altered',base,lambda r:r['Wc']['real'][0].__setitem__(0,1))
mutation('final x altered',base,lambda r:r['finalState']['x'].__setitem__(0,1))
mutation('final z altered',base,lambda r:r['finalState']['z'].__setitem__(0,1))
mutation('final state removed',base,lambda r:r.pop('finalState'))
mutation('gate removed',base,lambda r:r.pop('physicalGate'))
mutation('false gate',base,lambda r:r['physicalGate'].__setitem__('passed',False))
mutation('lower bound overstated',base,lambda r:r['optimizationCertificate'].__setitem__('lowerBound',1e6))
mutation('dual sign/values altered',base,lambda r:r['optimizationCertificate']['dual'].__setitem__(0,1e6))
mutation('certificate removed',cert,lambda r:r.pop('infeasibilityCertificate'))
mutation('invalid certificate asserted',cert,lambda r:r['infeasibilityCertificate'].__setitem__('certificatePassed',False))
mutation('radar SINR invented',radar,lambda r:r['metrics']['factor'].__setitem__('minSinrDb',0))
mutation('radar communications flag wrong',radar,lambda r:r.__setitem__('communicationConstraintsApplied',True))
mutation('radar communications flag missing',radar,lambda r:r.pop('communicationConstraintsApplied'))
mutation('oversized M immediately rejected',radar,lambda r:r.__setitem__('M',100000000))
mutation('loose tolerance rejected',radar,lambda r:r['settings'].__setitem__('tolerance',1))
mutation('empty Wc shapes disagree',radar,lambda r:r['Wc'].__setitem__('imag',[]))
mutation('extra operator penalty',radar,lambda r:r['optimizationCertificate']['stationarityOperatorNorms'].append(0))
mutation('radar invented Fc',radar,lambda r:r['metrics']['factor'].__setitem__('Fc',{'real':[[1]],'imag':[[0]]}))
for bad in [{'attempted':True},{'attempted':True,'result':None},{'attempted':True,'result':'corrupt'},{'attempted':True,'result':[]}]:assert not audit_document({'good':radar,'bad':bad})['passed']
malformed=copy.deepcopy(radar);del malformed['H'];malformed.update(attempted=False,result=None);assert not audit_document({'good':radar,'bad':malformed})['passed']
assert audit_document({'methods':{'sdr':{'method':'sdr','status':'completed','attempted':True,'result':base}}})['passed']
assert audit_document({'good':radar,'other':{'attempted':False,'result':None}})['passed']
assert not audit_document({})['passed'];assert audit_document({'methods':{'sdr':{'result':base}},'baseline':{'result':radar}})['passed']
report={'passed':True,'fixtureCount':len(checks),'mutationCount':len(mutations),'checks':checks,'mutations':mutations};(ROOT/'CHECKER-TESTS.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['checks','mutations']}))
