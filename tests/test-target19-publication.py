import copy,hashlib,importlib.util,json,pathlib,re,subprocess,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('projector',ROOT/'scripts/publish-target19.py');M=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(M)
class Projection(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.r=pathlib.Path(self.tmp.name);self.src=self.r/'input';self.src.mkdir();self.source=self.r/'source';(self.source/'build').mkdir(parents=True)
  self.cfg=json.loads((ROOT/'build/publication-target19.json').read_text());self.files={};self.entries=[]
  self.cfg.update(basicPages=['index.html','foundations.html','near-field.html'],basicRuntimeOwners=[],sharedRuntimeOwners=['shared'],excludedPages=[],excludedAssetPrefixes=['labs/near-field/research/'])
  for i,p in enumerate(self.cfg['modules']):
   p.update(href='near-field.html' if p['id']=='supplement-case-near-field' else f'paper-{i}.html',bindingComplete=True,runtimeOwners=[],sharedAssetPrefixes=['labs/near-field/research/'] if p['id']=='supplement-case-near-field' else [],sharedPageSections=[],exactPublicFiles=[],exactPublicHashes={})
   p['currentSummary']['evidence']=[p['href']]
   self.add(p['href'],'<!doctype html><title>Lesson</title><main id="content">Real fixture content</main>')
   if p['id'] in ['channels-sensing-communication-mapping-2026','bistatic-ofdm-clock-measurement-2023','supplement-case-near-field']:
    file='labs/near-field/research/runtime.mjs' if p['id']=='supplement-case-near-field' else f'bound-{i}.mjs';self.add(file,'export const real=1;');p['exactPublicFiles']=[file];p['exactPublicHashes']={file:hashlib.sha256(self.files[file].encode()).hexdigest()}
  self.cfg['compatibilityModules'][0].update(runtimeOwners=[],exactPublicFiles=[])
  self.add('otfs-sensing-assisted.html','<!doctype html><title>Legacy</title><p>Qualified historical content, not twentieth.</p>')
  self.add('near-field.html','<!doctype html><title>NF</title><!-- NFR:LEGACY-PREREQUISITE:START --><input id="legacy-control"><!-- NFR:LEGACY-PREREQUISITE:END --><script type="module" src="labs/near-field/research/runtime.mjs"></script>')
  ids=[p['id'] for p in self.cfg['modules']]+[M.LEGACY_ID]
  tree={'papers':[{'id':i,'title':i,'directionIds':['d']} for i in ids],'problems':[{'id':'q'+i,'paperId':i} for i in ids],'directions':[{'id':'d'}],'edges':[]}
  self.add('reading.html','<script data-tree-data>'+json.dumps(tree)+'</script>')
  f={'nodes':[{'id':'n'+i,'canonicalPaperId':i} for i in ids],'curves':[],'branchPlanes':[{'directionId':'d'}]}
  self.add('research-tree-model.js','const FROZEN='+json.dumps(f)+';\n','shared');self.add('research-tree.js','const SKY_LABELS=Object.freeze('+json.dumps({i:i for i in ids})+');','shared')
  self.add('legacy-routes.js','const routes={};function redirect(){}','shared')
  for p in ['index.html','foundations.html','experiments.html','learn.html','overview.html','research.html','practice.html']:self.add(p,'<!doctype html><title>Basic</title><main>basic</main>')
  for p in ['site.css','course.css','research-tree.css','theory.css','near-field.css','near-field-core.js','near-field.js']:self.add(p,'/* static */','shared')
  self.add('.nojekyll','')
  otfs=next(p for p in self.cfg['modules'] if p['id']=='otfs-joint-estimation-2020');self.add(otfs['href'],self.files[otfs['href']]+'<iframe title="real" src="embedded/index.html"></iframe>')
  self.add('embedded/index.html','<script type="module" src="runtime/ui.mjs"></script>')
  self.add('embedded/runtime/ui.mjs',"import './core.mjs';fetch('./runtime/data.json');new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});")
  self.add('embedded/runtime/worker.mjs',"fetch('./worker-data.json');")
  self.add('embedded/runtime/core.mjs','export const x=1;');self.add('embedded/runtime/data.json','{}','shared');self.add('embedded/runtime/worker-data.json','{}')
 def tearDown(self):self.tmp.cleanup()
 def add(self,p,s,owner='fixture'):
  self.files[p]=s
  if not any(e['public']==p for e in self.entries):self.entries.append({'public':p,'owner':owner})
 def run_projection(self,cfg=None,ok=True,draft=True):
  cfg=cfg or self.cfg
  for p,s in self.files.items():t=self.src/p;t.parent.mkdir(parents=True,exist_ok=True);t.write_text(s)
  (self.source/'build/compatibility-manifest.json').write_text(json.dumps({'entries':self.entries}))
  manifest=self.r/'cfg.json';manifest.write_text(json.dumps(cfg));out=self.r/'out'
  r=subprocess.run([sys.executable,str(ROOT/'scripts/publish-target19.py'),'--input',str(self.src),'--output',str(out),'--manifest',str(manifest),'--source-root',str(self.source)]+(['--local-draft'] if draft else []),capture_output=True,text=True,timeout=20)
  if ok:self.assertEqual(r.returncode,0,r.stderr)
  else:self.assertNotEqual(r.returncode,0);return r
  return out
 def ids(self,out):return {p['id'] for p in json.loads(re.search(r'data-tree-data>(.*?)</script>',(out/'reading.html').read_text()).group(1))['papers']}
 def test_contextual_citations_keep_all_eight_labels_and_surrounding_prose(self):
  ids=['Q1','Q2','Q3','D1']
  refs=''.join('<article id="ref-'+i+'"><a href="https://example.org/'+i+'">source</a></article>' for i in ids)
  prose=''.join('<p>参考 <a href="reading.html#ref-'+i+'">['+i+']</a>；物理说明。</p>' for i in ids for _ in range(2))
  self.files['foundations.html']+=prose+refs
  # Reading now contains only local relocation notices, not external citations.
  self.files['reading.html']+=''.join('<p id="ref-'+i+'"><a href="foundations.html#ref-'+i+'">已迁移</a></p>' for i in ids)
  out=self.run_projection();page=(out/'foundations.html').read_text()
  for i in ids:
   self.assertEqual(page.count('href="foundations.html#ref-'+i+'"'),2)
   self.assertEqual(page.count('['+i+']'),2)
  self.assertEqual(page.count('；物理说明。'),8)
 def test_external_citation_keeps_label_when_directory_is_projected(self):
  self.files['foundations.html']+='<p>模型 <a href="reading.html#ref-S1">[S1]</a> 的范围。</p>'
  self.files['reading.html']+='<article id="ref-S1"><a href="https://arxiv.org/pdf/2108.07165">source</a></article>'
  page=(self.run_projection()/'foundations.html').read_text()
  self.assertIn('<a href="https://arxiv.org/pdf/2108.07165">[S1]</a> 的范围。',page)
 def test_exact19_and_legacy_compatibility(self):
  out=self.run_projection();self.assertEqual(self.ids(out),M.TARGET_IDS);self.assertTrue((out/'otfs-sensing-assisted.html').exists());self.assertNotIn(M.LEGACY_ID,(out/'research-tree.js').read_text());self.assertIn('legacy-control',(out/'near-field.html').read_text());self.assertTrue((out/'embedded/runtime/worker-data.json').exists())
 def test_otfs_site_role_exact_unique_node_only(self):
  old='<p class="site-role">有界论文算法 · 单路径有限网格感知与完美CSI的MP-G/完整LMMSE通信</p>'
  self.assertIn('原式 21 仍未确认',M.project_otfs_role(old))
  for bad in ['',old+old,old.replace('单路径','unknown'),old.replace('<p','<div').replace('</p>','</div>')]:self.assertRaises(ValueError,M.project_otfs_role,bad)
 def test_current_summaries_replace_tree_fallback_and_problem_consistently(self):
  import html
  marker='Current <tag> & "quoted" </script><script>alert(1)</script>'
  for module in self.cfg['modules']:
   module['currentSummary']['question']=marker+' question '+module['id']
   module['currentSummary']['boundary']=marker+' boundary '+module['id']
  self.files['research-tree.js']+='\n// 本课：当前状态已知（§IV，p=q=1/4）；下方问题来自严格因果导读'
  out=self.run_projection();page=(out/'reading.html').read_text()
  projected_script=(out/'research-tree.js').read_text();self.assertNotIn('下方问题来自严格因果导读',projected_script);self.assertIn('严格因果 Fig. 2 不在本课范围',projected_script)
  tree=json.loads(re.search(r'data-tree-data>(.*?)</script>',page,re.S).group(1))
  problems={p['paperId']:p for p in tree['problems']}
  self.assertNotIn('</script><script>alert(1)</script>',page)
  for paper in tree['papers']:
   expected=next(p['currentSummary'] for p in self.cfg['modules'] if p['id']==paper['id'])
   self.assertEqual(paper['question'],expected['question']);self.assertEqual(paper['boundary'],expected['boundary'])
   self.assertEqual(paper['tutorials'][0]['scope'],expected['boundary']);self.assertEqual(problems[paper['id']]['title'],expected['question'])
   self.assertIn(html.escape(expected['question']),page);self.assertIn(html.escape(expected['boundary']),page)
 def test_missing_malformed_or_unsourced_current_summary_rejected(self):
  for summary in [None,{}, {'question':'q','boundary':'b','evidence':[]}, {'question':'','boundary':'b','evidence':['review.json']}, {'question':'q','boundary':'b','evidence':['../review.json']}, {'question':'q','boundary':'b','evidence':['review.json'],'extra':'unreviewed'}]:
   with self.subTest(summary=summary):
    cfg=copy.deepcopy(self.cfg);cfg['modules'][0]['currentSummary']=summary
    self.run_projection(cfg,ok=False)
 def test_draft_and_release_wording_are_distinct_without_deployment_claim(self):
  out=self.run_projection();self.assertIn('本地候选（未发布）',(out/'reading.html').read_text())
  cfg=copy.deepcopy(self.cfg);cfg['releaseReady']=True
  for p in cfg['modules']:p['coreReady']=True
  out=self.run_projection(cfg,draft=False);html=(out/'reading.html').read_text();self.assertIn('目标论文有界核心教学',html);self.assertNotIn('未发布',html);self.assertNotIn('已部署',html)
 def test_exact18_nearfield_plugout(self):
  p=next(p for p in self.cfg['modules'] if p['id']=='supplement-case-near-field');p['enabled']=False
  out=self.run_projection();self.assertEqual(self.ids(out),M.TARGET_IDS-{'supplement-case-near-field'});self.assertIn('legacy-control',(out/'near-field.html').read_text());self.assertFalse((out/'labs/near-field/research/runtime.mjs').exists());self.assertTrue((out/'otfs-sensing-assisted.html').exists())
 def test_each_exact19_to18_plugout(self):
  for pid in M.TARGET_IDS:
   with self.subTest(id=pid):
    cfg=copy.deepcopy(self.cfg);next(p for p in cfg['modules'] if p['id']==pid)['enabled']=False
    out=self.run_projection(cfg);self.assertEqual(self.ids(out),M.TARGET_IDS-{pid});self.assertTrue((out/'otfs-sensing-assisted.html').exists())
 def test_missing_discovery_identity_rejected(self):
  self.files['research-tree.js']=self.files['research-tree.js'].replace('"optimal_waveform": "optimal_waveform", ','')
  r=self.run_projection(ok=False);self.assertIn('Search labels missing',r.stderr)
 def test_classic_worker_and_shared_page_plugout(self):
  p=next(p for p in self.cfg['modules'] if p['id']=='bistatic-ofdm-clock-measurement-2023');p.update(href='network-clock.html#bistatic-core',sharedPageSections=['bistatic-core'],sharedAssetPrefixes=['bistatic-ui.js','bistatic-worker.js','bistatic-core.js','bistatic.css'])
  p['currentSummary']['evidence']=[p['href']]
  self.cfg['basicPages'].append('network-clock.html')
  self.add('network-clock.html','<title>Clock</title><input id="old-clock"><section id="bistatic-core">new lesson</section><link rel="stylesheet" href="bistatic.css"><script src="bistatic-ui.js"></script>')
  data={'bistatic-ui.js':"new Worker('bistatic-worker.js');",'bistatic-worker.js':"importScripts('bistatic-core.js');",'bistatic-core.js':'const core=1;','bistatic.css':'/* real */'}
  for f,text in data.items():self.add(f,text)
  p['exactPublicFiles']=list(data);p['exactPublicHashes']={f:hashlib.sha256(t.encode()).hexdigest() for f,t in data.items()}
  out=self.run_projection();self.assertTrue((out/'bistatic-core.js').exists())
  p['enabled']=False;out=self.run_projection();self.assertIn('old-clock',(out/'network-clock.html').read_text());self.assertNotIn('bistatic-core',(out/'network-clock.html').read_text());self.assertFalse((out/'bistatic-core.js').exists());self.assertEqual(self.ids(out),M.TARGET_IDS-{p['id']})
 def test_nested_existing_extension_remains_same_paper(self):
  p=next(p for p in self.cfg['modules'] if p['id']=='crb')
  self.files[p['href']]+='<a href="extended/prototype/index.html">Existing extended scope</a>'
  data={'extended/prototype/index.html':'<script src="app.js"></script>','extended/prototype/app.js':"new Worker('worker.js');",'extended/prototype/worker.js':"importScripts('../a.js','../b.js','../c.js');",'extended/a.js':'const a=1;','extended/b.js':'const b=2;','extended/c.js':'const c=3;'}
  for f,t in data.items():self.add(f,t)
  p['exactPublicFiles']=list(data);p['exactPublicHashes']={f:hashlib.sha256(t.encode()).hexdigest() for f,t in data.items()}
  out=self.run_projection();self.assertEqual(self.ids(out),M.TARGET_IDS);self.assertIn('extended/prototype/index.html',(out/p['href']).read_text());self.assertTrue((out/'extended/prototype/index.html').exists())
  files={f.relative_to(out).as_posix() for f in out.rglob('*') if f.is_file()};files.remove('extended/c.js')
  with self.assertRaisesRegex(ValueError,'Missing runtime dependency'):M.validate_runtime_closure(out,files)
 def test_unready_release_rejected(self):
  unready=copy.deepcopy(self.cfg);unready['releaseReady']=False
  with self.assertRaisesRegex(ValueError,'All19'):M.validate_config(unready,False)
  original=json.loads((ROOT/'build/publication-target19.json').read_text())
  original['modules'][0]['bindingComplete']=False
  with self.assertRaisesRegex(ValueError,'Unfrozen'):M.validate_config(original,True)
 def test_three_readiness_false_missing_and_nonboolean_values_reject(self):
  ready=copy.deepcopy(self.cfg);ready['releaseReady']=True
  for p in ready['modules']:p['coreReady']=True
  M.validate_config(ready,False)
  for key in ['releaseReady','coreReady','bindingComplete']:
   for value in [False,None,'true',1]:
    c=copy.deepcopy(ready);obj=c if key=='releaseReady' else c['modules'][0]
    if value is None:obj.pop(key)
    else:obj[key]=value
    with self.subTest(key=key,value=value):self.assertRaises(ValueError,M.validate_config,c,False)
 def test_wrong_identity_and_deployed_rejected(self):
  c=copy.deepcopy(self.cfg);c['modules'][0]['id']='wrong';self.assertRaises(ValueError,M.validate_config,c,True)
  c=copy.deepcopy(self.cfg);c['deployed']=True;self.assertRaises(ValueError,M.validate_config,c,True)
 def test_missing_frozen_file_rejected(self):
  self.files.pop('bound-2.mjs');self.run_projection(ok=False)
 def test_missing_iframe_dependency_rejected(self):
  self.files.pop('embedded/runtime/worker-data.json');r=self.run_projection(ok=False);self.assertIn('Missing runtime dependency',r.stderr)
 def course_loader_fixture(self):
  folder=self.r/'loader';folder.mkdir(exist_ok=True)
  source=ROOT/'features/foundations/course.js'
  if not source.exists():source=ROOT/'course.js'
  (folder/'index.html').write_text('<script src="course.js"></script>')
  (folder/'course.js').write_bytes(source.read_bytes())
  for name in ['course-ui.js','velocity-core.js','velocity-bridge.js']:(folder/name).write_text('// exact graph fixture')
  return folder,{'index.html','course.js','course-ui.js','velocity-core.js','velocity-bridge.js'}
 def test_exact_course_directory_base_enumerates_actual_loads(self):
  folder,files=self.course_loader_fixture();result=M.validate_runtime_closure(folder,files);self.assertEqual(result['runtimeContexts'],4)
  for missing in ['course-ui.js','velocity-core.js','velocity-bridge.js']:
   with self.subTest(missing=missing):self.assertRaisesRegex(ValueError,'Missing runtime dependency',M.validate_runtime_closure,folder,files-{missing})
  (folder/'course-ui.js').write_text("fetch('missing-data.json');")
  self.assertRaisesRegex(ValueError,'missing-data.json',M.validate_runtime_closure,folder,files)
 def test_unknown_loader_and_real_directory_loads_still_fail_closed(self):
  folder,files=self.course_loader_fixture();original=(folder/'course.js').read_bytes()
  for changed in [original+b'\n// changed',original.replace(b'\n',b'\r\n')]:
   (folder/'course.js').write_bytes(changed)
   with self.subTest(rawHash=hashlib.sha256(changed).hexdigest()):self.assertRaisesRegex(ValueError,'Unreviewed classic',M.validate_runtime_closure,folder,files)
  (folder/'index.html').write_text('<script src="other.mjs"></script>')
  for text in ["fetch('.');","import './';","const base=new URL('.',import.meta.url);","new Worker(new URL('./',import.meta.url));"]:
   (folder/'other.mjs').write_text(text)
   with self.subTest(text=text):self.assertRaisesRegex(ValueError,'Missing runtime dependency',M.validate_runtime_closure,folder,{'index.html','other.mjs'})
 def test_path_escape_rejected(self):
  self.assertRaises(ValueError,M.local,'index.html','../outside.js')
if __name__=='__main__':unittest.main(verbosity=2)
