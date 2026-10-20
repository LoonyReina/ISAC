#!/usr/bin/env python3
"""Acceptance gates for the physically projected public artifact; no solver starts."""
import argparse, hashlib, importlib.util, json, pathlib, re, subprocess, tempfile
spec=importlib.util.spec_from_file_location('projection',pathlib.Path(__file__).with_name('publish-accepted.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def check(value,message):
    if not value:raise AssertionError(message)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--output',required=True);a=ap.parse_args();src=pathlib.Path(a.input).resolve();out=pathlib.Path(a.output).resolve()
    cfg=json.loads((m.ROOT/'build/publication-allowlist.json').read_text());ids={p['id'] for p in [p for p in cfg['modules'] if p['enabled']]};files={p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file()}
    check(len(ids)==17,'17 unique identities');check(not any(p.startswith(('site/','tests/','scripts/','build/')) for p in files),'Private registry/build/test source leaked')
    for p in cfg['excludedPages']:check(p not in files,'Excluded paper page '+p)
    for prefix in cfg['excludedAssetPrefixes']:check(not any(p.startswith(prefix) for p in files),'Excluded asset prefix '+prefix)
    reading=(out/'reading.html').read_text();tree=json.loads(re.search(r'data-tree-data>(.*?)</script>',reading,re.S).group(1));check({p['id'] for p in tree['papers']}==ids,'Tree identities differ from allowlist')
    check(len(tree['papers'])==17,'Tree duplicates');check(tree['counts']=={'papers':17,'guides':0},'Stale tree count');check({p['paperId'] for p in tree['problems']}==ids,'Question identity leakage')
    check(set(re.findall(r'data-paper-id="([^"]+)"',reading))==ids,'Fallback list differs from constellation')
    model=(out/'research-tree-model.js').read_text();f=json.loads(re.search(r'const FROZEN=(.*?);\n',model).group(1));check({n['canonicalPaperId'] for n in f['nodes'] if n.get('canonicalPaperId')}==ids,'Frozen coordinates leak')
    labels=json.loads(re.search(r'const SKY_LABELS=Object.freeze\((.*?)\);',(out/'research-tree.js').read_text(),re.S).group(1));check(set(labels)==ids,'Search/labels leak')
    htmlfiles={p:(out/p).read_text() for p in files if p.endswith('.html')};anchors={p:{n['attrs']['id'] for n in m.Elements(s).nodes if n['attrs'].get('id')} for p,s in htmlfiles.items()}
    links=0
    for p,s in htmlfiles.items():
        for n in m.Elements(s).nodes:
            for key in ('href','src'):
                if key not in n['attrs']:continue
                v=m.local(p,n['attrs'][key])
                if v:
                    check(v[0] in files,f'Missing local dependency {p}: {v}');links+=1
                    if v[1] and v[0] in anchors:check(v[1] in anchors[v[0]],f'Missing anchor {p}: {v}')
    for p in files:
        if p.endswith('.parts.json'):
            archive=json.loads((out/p).read_text());joined=hashlib.sha256();total=0
            for part in archive['parts']:
                path=out/pathlib.Path(p).parent/part['file'];check(path.is_file(),'Missing archive chunk '+str(path))
                data=path.read_bytes();check(len(data)==part['bytes'] and hashlib.sha256(data).hexdigest()==part['sha256'],'Archive chunk mismatch');joined.update(data);total+=len(data)
            check(total==archive['archiveBytes'] and joined.hexdigest()==archive['archiveSha256'],'Reassembled archive mismatch')
    # Literal static/dynamic module edges and stylesheet URLs, without executing lesson modules.
    modules=0
    for p in files:
        if not p.endswith(('.js','.mjs','.css')):continue
        s=(out/p).read_text()
        refs=re.findall(r'''(?:from\s*|import\s*\(|import\s+|new URL\s*\(|fetch\s*\(|require\s*\()\s*["']([^"']+)["']''',s)
        if p.endswith('.css'):refs+=re.findall(r'''url\(["']?([^\s)"']+)''',s)
        for ref in refs:
            if ref in {'.','./'} or ref.startswith(('node:','data:','#')):continue
            v=m.local(p,ref)
            if v and (ref.startswith('.') or '/' in ref or re.search(r'\.(?:js|mjs|css|json|csv)$',ref)):
                check(v[0] in files,f'Missing runtime dependency {p}: {ref}');modules+=1
    for p in [p for p in cfg['modules'] if p['enabled']]:
        v=m.local('reading.html',p['href']);check(v[0] in htmlfiles,'Allowed lesson missing')
        if v[1]:check(v[1] in anchors[v[0]],'Allowed experiment anchor missing')
    # Numerical/runtime bytes are unchanged. Only discovery/redirect presentation may differ.
    immutable=0
    for p in files:
        if p.endswith(('.js','.mjs')) and p not in {'research-tree.js','research-tree-model.js','legacy-routes.js'}:
            check(digest(out/p)==digest(src/p),'Runtime changed '+p);immutable+=1
    for p in ['foundations.html','sandbox.html','resolution.html','near-field.html']:
        source=(src/p).read_text();before={n['attrs']['id'] for n in m.Elements(source).nodes if n['tag'] in {'input','select','button'} and n['attrs'].get('id')};after={n['attrs']['id'] for n in m.Elements(htmlfiles[p]).nodes if n['tag'] in {'input','select','button'} and n['attrs'].get('id')}
        if p=='near-field.html':before={v for v in before if v.startswith('nf-')}
        check(before<=after,'Basic controls lost '+p)
    check('labs/near-field/research/' not in htmlfiles['near-field.html'],'Unpublished near-field research leaked')
    # Independent fresh projection must be byte-for-byte deterministic.
    with tempfile.TemporaryDirectory(prefix='accepted-publication-') as temp:
        again=pathlib.Path(temp)/'published';subprocess.run(['python',str(m.ROOT/'scripts/publish-accepted.py'),'--input',str(src),'--output',str(again)],check=True,capture_output=True)
        check({p.relative_to(again).as_posix():digest(p) for p in again.rglob('*') if p.is_file()}=={p:digest(out/p) for p in files},'Nonreproducible publication')
    # Plug-out is fail-closed and removes discovery, exclusive pages and runtime ownership.
    with tempfile.TemporaryDirectory(prefix='publication-toggle-') as temp:
        temp=pathlib.Path(temp)
        for identity in ['otfs-joint-estimation-2020','nearfield-mechanism-aware-mapping-2026','tradeoffs-feedback-capacity-distortion-2018']:
            changed=json.loads(json.dumps(cfg));module=next(p for p in changed['modules'] if p['id']==identity);module['enabled']=False
            config=temp/'manifest.json';config.write_text(json.dumps(changed));dest=temp/identity
            subprocess.run(['python',str(m.ROOT/'scripts/publish-accepted.py'),'--input',str(src),'--output',str(dest),'--manifest',str(config)],check=True,capture_output=True)
            data=json.loads(re.search(r'data-tree-data>(.*?)</script>',(dest/'reading.html').read_text(),re.S).group(1))
            check(len(data['papers'])==16 and identity not in {p['id'] for p in data['papers']},'Disabled module remains discoverable')
            if not module['sharedPageSections']:check(not (dest/module['href']).exists(),'Disabled module page retained')
            else:
                body=(dest/module['href'].split('#')[0]).read_text();check(all(section not in {n['attrs'].get('id') for n in m.Elements(body).nodes} for section in module['sharedPageSections']),'Disabled shared section retained')
            for prefix in module['sharedAssetPrefixes']:check(not any(p.relative_to(dest).as_posix().startswith(prefix) for p in dest.rglob('*') if p.is_file()),'Disabled module runtime retained')
        invalid=json.loads(json.dumps(cfg));invalid['modules'][0]['publication']='local-only';config.write_text(json.dumps(invalid))
        result=subprocess.run(['python',str(m.ROOT/'scripts/publish-accepted.py'),'--input',str(src),'--output',str(temp/'invalid'),'--manifest',str(config)],capture_output=True)
        check(result.returncode!=0 and not (temp/'invalid').exists(),'Local-only module enabled')
    print(json.dumps({'pass':True,'papers':17,'files':len(files),'localLinks':links,'runtimeEdges':modules,'unchangedRuntimeFiles':immutable,'fullOriginalPaperReproductions':0}))
if __name__=='__main__':main()
