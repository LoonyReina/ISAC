#!/usr/bin/env python3
"""Fail-closed checker for the separate, local-only mapping preview.
Prepared but not run as part of overlay creation. No solver or network action.
"""
import argparse, hashlib, html, json, pathlib, re
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import posixpath
ROOT=pathlib.Path(__file__).resolve().parent.parent
PID='channels-sensing-communication-mapping-2026'
def require(value, reason):
    if not value: raise ValueError(reason)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return json.loads(p.read_text())
def inventory(root):
    require(root.is_dir() and not root.is_symlink(), 'Expected regular directory')
    paths=[]
    for p in root.rglob('*'):
        require(not p.is_symlink(), 'Symlink not allowed: '+str(p))
        if p.is_file(): paths.append(p.relative_to(root).as_posix())
    return set(paths)
def one(pattern,text):
    matches=list(re.finditer(pattern,text,re.S));require(len(matches)==1,'Expected one bounded source region: '+pattern)
    return matches[0]
def tree(root): return json.loads(one(r'<script[^>]*data-tree-data[^>]*>(.*?)</script>',(root/'reading.html').read_text()).group(1))
def model(root): return json.loads(one(r'const FROZEN=(.*?);\n',(root/'research-tree-model.js').read_text()).group(1))
def labels(root): return json.loads(one(r'const SKY_LABELS=Object.freeze\((.*?)\);',(root/'research-tree.js').read_text()).group(1))
def normalize_shell(s):
    for key in ['HEADER','CONTEXT','NEXT']:
        pattern=r'<!-- SITE:'+key+r':START -->[\s\S]*?<!-- SITE:'+key+r':END -->'
        require(len(re.findall(pattern,s))==1,'Missing/duplicate shell region '+key)
        s=re.sub(pattern,'<!-- SITE:'+key+' -->',s)
    return s.rstrip()+'\n'
def local(base,href):
    u=urlsplit(html.unescape(href))
    if u.scheme or u.netloc or href.startswith('//'): return None
    p=posixpath.normpath(posixpath.join(posixpath.dirname(base),unquote(u.path))) if u.path else base
    require(not p.startswith(('../','/')), 'Reference escapes project prefix')
    return p,unquote(u.fragment)
class Tags(HTMLParser):
    def __init__(self,s):
        super().__init__();self.tags=[];self.feed(s)
    def handle_starttag(self,tag,attrs):self.tags.append((tag,dict(attrs)))
def inputs(dist,accepted):
    cfg=load(ROOT/'build/local-candidate-allowlist.json')
    expected_public={'channel-mapping.html':'content/pages/channel-mapping.html','channel-mapping/styles.css':'labs/channel-mapping/styles.css','channel-mapping/site-integration.css':'labs/channel-mapping/site-integration.css','assets/data/channel-mapping/acceptance-summary.json':'assets/data/channel-mapping/acceptance-summary.json'}
    expected_public.update({'channel-mapping/src/'+name+'.mjs':'labs/channel-mapping/src/'+name+'.mjs' for name in ['app','config','evaluation','experiment','generator','geometry','inference','worker']})
    require({name:row['source'] for name,row in cfg['newPublicFiles'].items()}==expected_public,'Local asset allowlist widened')
    require(cfg['allowedChangedExistingPreviewFiles']==['reading.html','research-tree-model.js','research-tree.js'],'Existing-file edit scope widened')
    require(cfg['candidate']['enabled'] is True,'Candidate unexpectedly disabled')
    require(sha(ROOT/'build/publication-allowlist.json')==cfg['officialAllowlistSha256'],'Official allowlist changed')
    require(sha(ROOT/'scripts/publish-accepted.py')==cfg['officialProjectorSha256'],'Official publication policy changed')
    require(cfg['candidate']['id']==PID and cfg['candidate']['acceptance']=='local-core-accepted' and cfg['candidate']['publication']=='not-deployed' and cfg['candidate']['integration']=='not-verified','Candidate status widened')
    ids=cfg['carriedForwardDeployedIds'];require(len(ids)==17 and len(set(ids))==17 and PID not in ids,'Baseline identity scope changed')
    require({p['id'] for p in load(ROOT/'build/publication-allowlist.json')['modules'] if p['enabled']}==set(ids),'Deployed policy and local carry-forward differ')
    disposition=ROOT/'labs/channel-mapping/evidence/acceptance/DISPOSITION.json'
    require(sha(disposition)==cfg['freeze']['dispositionSha256'],'Final acceptance evidence changed')
    for name,digest in cfg['freeze']['core'].items():require(sha(ROOT/'labs/channel-mapping'/name)==digest,'Scientific core changed: '+name)
    for name,digest in cfg['freeze']['ui'].items():require(sha(ROOT/'labs/channel-mapping'/name)==digest,'Frozen UI changed: '+name)
    afiles=inventory(accepted);inventory(dist)
    require('.accepted-publication' in afiles and '.local-mapping-candidate' not in afiles,'Not the unchanged 17-module projection')
    require({p['id'] for p in tree(accepted)['papers']}==set(ids),'Unexpected accepted preview scope')
    official=load(ROOT/'build/publication-allowlist.json')
    expected_html=set(official['basicPages'])|{p['href'].split('#')[0] for p in official['modules'] if p['enabled']}|{'reading.html','experiments.html','learn.html','overview.html','research.html','practice.html'}
    require({p for p in afiles if p.endswith('.html')}==expected_html,'Unaccepted HTML page leaked into accepted input')
    require(not any(p.startswith(('site/','scripts/','tests/','build/')) for p in afiles),'Private source path leaked into accepted input')
    require(not any(p in afiles for p in official['excludedPages']),'Excluded lesson present')
    require(not any(p.startswith(tuple(official['excludedAssetPrefixes'])) for p in afiles),'Excluded runtime present')
    require(not set(cfg['newPublicFiles']) & afiles,'Candidate route collision')
    for name,row in cfg['newPublicFiles'].items():
        require(sha(ROOT/row['source'])==row['sha256'],'Authored candidate asset changed: '+name)
        if name.endswith('.html'):
            require(normalize_shell((dist/name).read_text())==normalize_shell((ROOT/row['source']).read_text()),'Generated page changed outside shell')
        else:require(sha(dist/name)==row['sha256'],'Built candidate asset changed: '+name)
    return cfg,afiles

def check(dist,accepted,out):
    cfg,afiles=inputs(dist,accepted);ofiles=inventory(out)
    expected=(afiles-{'.accepted-publication'})|set(cfg['newPublicFiles'])|{'.local-mapping-candidate'}
    require(ofiles==expected,'Local preview added or removed unexpected paths')
    ids=set(cfg['carriedForwardDeployedIds'])|{PID};data=tree(out)
    require(len(data['papers'])==18 and {p['id'] for p in data['papers']}==ids,'Exact visible paper set changed')
    require(data['counts']=={'papers':18,'guides':0},'Incorrect local entry count')
    require({p['paperId'] for p in data['problems']}==ids,'Question identity leakage')
    candidate=next(p for p in data['papers'] if p['id']==PID)
    require(candidate['acceptance']=='local-core-accepted' and candidate['publication']=='not-deployed','False publication status')
    require(candidate['tutorials'][0]['href']=='channel-mapping.html#top','Noncanonical mapping entry')
    f=model(out);require({n['canonicalPaperId'] for n in f['nodes'] if n.get('canonicalPaperId')}==ids,'Frozen constellation identity leakage')
    require(set(labels(out))==ids,'Search label identity leakage')
    before_nodes={n['id']:n for n in model(accepted)['nodes']};after_nodes={n['id']:n for n in f['nodes']}
    require(all(after_nodes.get(k)==v for k,v in before_nodes.items()),'Existing constellation coordinates changed')
    require(len([n for n in f['nodes'] if n.get('canonicalPaperId')==PID])==2,'Expected exactly mapping question and paper nodes')
    reading=(out/'reading.html').read_text();require(reading.count('data-research-tree ')==1 and reading.count('data-tree-app')==1,'Lost single-window constellation')
    require(set(re.findall(r'data-paper-id="([^"]+)"',reading))==ids,'No-JS fallback differs')
    require('17 篇既有公开课' in reading and '1 篇新重建本地核心' in reading and '未部署' in reading,'Missing separate acceptance dimensions')
    changed=[]
    for p in afiles-{'.accepted-publication'}:
        if sha(accepted/p)!=sha(out/p):changed.append(p)
    require(set(changed)==set(cfg['allowedChangedExistingPreviewFiles']),'Unexpected existing preview bytes changed')
    for p in cfg['newPublicFiles']:require(sha(dist/p)==sha(out/p),'Candidate transformed by projection: '+p)
    htmls={p:(out/p).read_text() for p in ofiles if p.endswith('.html')}
    anchors={p:{a['id'] for _,a in Tags(s).tags if 'id' in a} for p,s in htmls.items()}
    edges=0
    for p,s in htmls.items():
        nav=one(r'<nav class="site-nav"[\s\S]*?</nav>',s).group(0)
        require(re.findall(r'href="([^"]+)"',nav)==['foundations.html','reading.html'],'Navigation changed: '+p)
        for _,attrs in Tags(s).tags:
            for key in ['href','src']:
                if key not in attrs:continue
                ref=local(p,attrs[key])
                if ref:
                    require(ref[0] in ofiles,'Missing local dependency: '+p+' -> '+str(ref))
                    if ref[1] and ref[0] in htmls:require(ref[1] in anchors[ref[0]],'Missing anchor: '+str(ref))
                    edges+=1
    app=(out/'channel-mapping/src/app.mjs').read_text();page=htmls['channel-mapping.html']
    require("new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'})" in app,'Worker constructor changed')
    require("worker-src 'self'" in page and "connect-src 'none'" in page and "script-src 'self'" in page,'CSP weakened')
    require('URL.createObjectURL(blob)' in app and 'application/json;charset=utf-8' in app,'Local JSON export changed')
    for p in cfg['newPublicFiles']:
        if p.endswith('.mjs'):
            for ref in re.findall(r'''(?:from\s*|import\s*\(|new URL\s*\()\s*['"]([^'"]+)['"]''',(out/p).read_text()):
                value=local(p,ref)
                if value:require(value[0] in ofiles,'Missing static module or Worker edge: '+p+' -> '+ref)
    return {'status':'LOCAL_STATIC_PROJECTION_CHECKED_NOT_BROWSER_ACCEPTED','visibleEntries':18,'carriedForwardDeployed':17,'newLocalCore':1,'newGlobalPaperAcceptanceCount':False,'changedExistingPreviewFiles':sorted(changed),'previewFiles':len(ofiles),'localHtmlEdges':edges,'browserRun':False,'deploymentRun':False}
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--accepted-input',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
    print(json.dumps(check(pathlib.Path(a.input).resolve(),pathlib.Path(a.accepted_input).resolve(),pathlib.Path(a.output).resolve()),ensure_ascii=False,indent=2))
