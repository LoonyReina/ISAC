from pathlib import Path
import importlib.util,json,hashlib,collections
ROOT=Path('/workspace/shared/isac-paper-execution');OUT=ROOT/'joint-beamforming-review';src=OUT/'export-checker-reviewed-snapshot.py';spec=importlib.util.spec_from_file_location('reviewed_checker',src);c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
records=[];issues=[];statuses=collections.Counter()
for folder in ['js-benchmark','js-extra','js-radar','js-ui-budgets']:
 for p in sorted((ROOT/'joint-beamforming-browser-prototype/results'/folder).glob('*.json')):
  r=json.loads(p.read_text())
  if not isinstance(r,dict) or 'method' not in r:continue
  direct=c.audit_document(r);wrapped=c.audit_document({'methods':[{'method':r['method'],'status':'completed','attempted':True,'result':r}], 'unattempted':{'attempted':False,'result':None}})
  statuses[r['status']]+=1;entry={'fixture':folder+'/'+p.name,'fixture_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'status':r['status'],'direct_passed':direct['passed'],'wrapped_passed':wrapped['passed']};records.append(entry)
  if not direct['passed'] or not wrapped['passed']:issues.append({'fixture':entry['fixture'],'direct':direct,'wrapped':wrapped})
mut=json.loads((OUT/'export_checker_final_mutation_audit.json').read_text());mut_ok=all(x['caught_as_expected'] for x in mut);report={'checker_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'unchanged_from_reviewed_checker':src.read_bytes()==(ROOT/'joint-beamforming-export-checker/check_export.py').read_bytes(),'fixtures':len(records),'direct_and_wrapped_checks':2*len(records),'statuses':dict(statuses),'mutation_checks':len(mut),'valid_control_documents':sum(x['expected_pass'] for x in mut),'hostile_or_missing_field_mutations':sum(not x['expected_pass'] for x in mut),'all_mutation_expectations_met':mut_ok,'issues':issues,'all_passed':not issues and mut_ok,'records':records}
(OUT/'export_checker_final_fixture_audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='records'},indent=2))
