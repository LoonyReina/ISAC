#!/usr/bin/env python3
"""Fail-closed public projection AFTER the unchanged full compatibility build.
Private sources and full dist are never edited. No third-party dependencies.
"""
import argparse, hashlib, html, json, pathlib, re, shutil
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
ROOT = pathlib.Path(__file__).resolve().parent.parent
VOID=set('area base br col embed hr img input link meta param source track wbr'.split())
class Elements(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False); self.text=text; self.nodes=[]; self.stack=[]
        self.lines=[0]+[m.end() for m in re.finditer('\n',text)]; self.feed(text)
    def pos(self):
        row,col=self.getpos(); return self.lines[row-1]+col
    def handle_starttag(self, tag, attrs):
        n={'tag':tag,'attrs':dict(attrs),'start':self.pos(),'openEnd':self.pos()+len(self.get_starttag_text()),'parent':self.stack[-1] if self.stack else None}
        self.nodes.append(n)
        if tag in VOID:n['end']=n['openEnd']
        else:self.stack.append(n)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.stack.pop()['end']=self.pos()+len(self.get_starttag_text())
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:
                end=self.text.find('>',self.pos())+1
                for n in self.stack[i:]:n['end']=end
                del self.stack[i:]; break
    def content(self,n): return self.text[n['start']:n['end']]
def edits(text, replacements):
    # Outermost replacement wins; never serialize/reformat numerical scripts.
    end=-1; selected=[]
    for a,b,value in sorted(replacements,key=lambda v:(v[0],-v[1])):
        if a>=end:selected.append((a,b,value));end=b
    for a,b,v in reversed(selected):text=text[:a]+v+text[b:]
    return text
def local(base,href):
    u=urlsplit(html.unescape(href));
    if u.scheme or u.netloc or href.startswith('//'):return None
    import posixpath
    p=posixpath.normpath(posixpath.join(posixpath.dirname(base),unquote(u.path))) if u.path else base
    if p.startswith('../') or p.startswith('/'):return None
    return p,unquote(u.fragment)
def shell(title,body,scripts=''):
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+' | ISAC</title><link rel="stylesheet" href="site.css"><link rel="stylesheet" href="course.css"><link rel="stylesheet" href="research-tree.css">'+scripts+'</head><body><header class="site-header"><a class="site-brand" href="index.html">ISAC 交互学习</a><nav class="site-nav"><a href="foundations.html">基础知识</a><a href="reading.html">论文阅读</a></nav></header><main class="site-main" id="site-main">'+body+'</main></body></html>\n'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--output',required=True);ap.add_argument('--manifest',default=str(ROOT/'build/publication-allowlist.json'));a=ap.parse_args()
    src=pathlib.Path(a.input).resolve();out=pathlib.Path(a.output).resolve()
    if out==src or out in src.parents or src in out.parents:raise ValueError('Input and output must be separate siblings')
    cfg=json.loads(pathlib.Path(a.manifest).read_text()); modules=cfg['modules']
    if len({p['id'] for p in modules})!=len(modules):raise ValueError('Duplicate module identity')
    for p in modules:
        if not isinstance(p['enabled'],bool):raise ValueError('Module enabled flag must be boolean')
        if p['enabled'] and (p['acceptance']!='bounded-accepted' or p['publication']!='deployed'):raise ValueError('Enabled module must be accepted and deployed')
    papers=[p for p in modules if p['enabled']];ids={p['id'] for p in papers};count=len(papers)
    runtimeOwners=set(cfg['basicRuntimeOwners']+cfg['sharedRuntimeOwners'])|{o for p in papers for o in p['runtimeOwners']}
    registry=json.loads((ROOT/'content/data/registry.json').read_text())
    manifest=json.loads((ROOT/'build/compatibility-manifest.json').read_text())
    allfiles={p.relative_to(src).as_posix() for p in src.rglob('*') if p.is_file()}
    pages=set(cfg['basicPages'])|{p['href'].split('#')[0] for p in papers}|{'reading.html','experiments.html','learn.html','overview.html','research.html','practice.html'}
    if pages & set(cfg['excludedPages']):raise ValueError('Excluded lesson in allowlist')
    disabled=[p for p in modules if not p['enabled']]
    disabledOwners={o for p in disabled for o in p['runtimeOwners']}-runtimeOwners
    disabledAssets={e['public'] for e in manifest['entries'] if e.get('public') and e['owner'] in disabledOwners}
    excluded=tuple(cfg['excludedAssetPrefixes']+[prefix for p in disabled for prefix in p['sharedAssetPrefixes']])
    selected=set(pages)|{'.nojekyll'}
    # Runtime owners are explicit; raw registries, generators, tests and blanket evidence archives never ship.
    for e in manifest['entries']:
        p=e.get('public');owner=e['owner']
        if p and p in allfiles and not p.endswith('.html') and not p.startswith(excluded) and p not in disabledAssets and owner in runtimeOwners:
            if not re.search(r'(^|/)(?:tests?|scripts|docs)/|FREEZE|MANIFEST|README|\.test\.',p,re.I):selected.add(p)
    texts={p:(src/p).read_text() for p in pages if (src/p).exists()}
    for module in disabled:
        page=module['href'].split('#')[0]
        if page in texts and module['sharedPageSections']:
            t=texts[page];texts[page]=edits(t,[(n['start'],n['end'],'') for n in Elements(t).nodes if n['attrs'].get('id') in module['sharedPageSections']])
    original=texts['reading.html'];match=re.search(r'<script[^>]*data-tree-data[^>]*>(.*?)</script>',original,re.S);tree=json.loads(match.group(1))
    tree['papers']=[p for p in tree['papers'] if p['id'] in ids]
    byid={p['id']:p for p in papers}
    citations={}
    for node in Elements(original).nodes:
        if node['attrs'].get('id','').startswith('ref-') and 'end' in node:
            fragment=original[node['start']:node['end']]
            external=re.search(r'href="(https?://[^"]+)"',fragment)
            if external:citations[node['attrs']['id']]=external.group(1)
    for p in tree['papers']:
        p['tutorials']=[{'href':byid[p['id']]['href'],'label':'进入有界实验与原文边界','kind':'algorithm','scope':p.get('boundary','有界核心，不等于整篇复现')}]
        p['guideIds']=[];p['catalogIds']=[];p['caseIds']=[];p['status']='bounded-core'
    tree['problems']=[p for p in tree['problems'] if p['paperId'] in ids]
    directions={d for p in tree['papers'] for d in p['directionIds']}
    tree['directions']=[d for d in tree['directions'] if d['id'] in directions]
    valid=ids|{p['id'] for p in tree['problems']}|directions
    tree['edges']=[e for e in tree['edges'] if e['from'] in valid and e['to'] in valid];tree['lineage']=[];tree['counts']={'papers':count,'guides':0}
    tree['note']='仅列出已验收并已发布的有界论文教学；均不代表整篇原文复现。'
    cards=''.join('<li data-paper-id="'+html.escape(p['id'])+'" id="paper-'+html.escape(p['id'])+'"><h3>'+html.escape(p['title'])+'</h3><p>'+html.escape(p.get('question',''))+'</p><p>'+html.escape(p.get('boundary',''))+'</p><a href="'+html.escape(byid[p['id']]['href'])+'">进入有界实验与原文边界</a></li>' for p in tree['papers'])
    texts['reading.html']=shell('论文阅读','<h1>论文阅读</h1><p>'+str(count)+' 篇已验收并发布的有界论文教学。实验范围与未完成项见各课正文；不是整篇论文复现。</p><section class="research-tree" data-research-tree aria-labelledby="research-tree-title"><div class="rt-heading"><h2 id="research-tree-title">从研究方向找到问题，再选择论文</h2><p>'+str(count)+' 篇独立论文 · '+str(len(directions))+' 个研究方向</p></div><div data-tree-app></div><details class="rt-fallback" open><summary>全部论文与入口（无 JavaScript 也可用）</summary><ol>'+cards+'</ol></details><script type="application/json" data-tree-data>'+json.dumps(tree,ensure_ascii=False).replace('</','<\\/')+'</script></section>','<script defer src="research-tree-model.js"></script><script defer src="research-tree.js"></script>')
    # The near-field paper is local-only. Preserve the already deployed basic curvature experiment verbatim.
    n=texts['near-field.html'];legacy=re.search(r'<!-- NFR:LEGACY-PREREQUISITE:START -->(.*?)<!-- NFR:LEGACY-PREREQUISITE:END -->',n,re.S)
    if not legacy:raise ValueError('Expected frozen near-field prerequisite markers')
    texts['near-field.html']=shell('近场曲率先修','<h1>同一个方向，为什么还可能分出远近？</h1><p>无噪声几何先修实验；不计作论文复现。</p>'+legacy.group(1),'<link rel="stylesheet" href="theory.css"><link rel="stylesheet" href="near-field.css"><script defer src="near-field-core.js"></script><script defer src="near-field.js"></script>')
    # Keep the basic learning map and controls; remove its research branch's private templates.
    parser=Elements(texts['index.html']);rs=[]
    for n in parser.nodes:
        at=n['attrs']
        if at.get('class') in {'map-deep','map-direction-depth'}:
            rs.append((n['start'],n['end'],''))
        elif at.get('id')=='map-group-research' or (n['tag']=='template' and 'direction:' in str(at)):
            rs.append((n['start'],n['end'],'<p><a href="reading.html">查看 '+str(count)+' 篇已发布论文教学</a></p>' if n['tag']!='template' else ''))
    texts['index.html']=edits(texts['index.html'],rs)
    texts['index.html']=texts['index.html'].replace('<strong>8</strong> 个研究方向','<strong>'+str(len(directions))+'</strong> 个研究方向').replace('<strong>41</strong> 个教学入口','<strong>'+str(count)+'</strong> 篇有界论文').replace('41 个实验 · 25 个专题','基础机制与已发布论文')
    basics=''.join('<li><a href="'+p+'">'+html.escape(re.sub('<.*?>','',re.search(r'<title>(.*?)</title>',texts[p],re.S).group(1)).split('|')[0])+'</a></li>' for p in cfg['basicPages'] if p not in {'index.html'})
    texts['experiments.html']=shell('基础实验','<h1>基础机制实验</h1><p>这些先修工具不计作论文复现。</p><ul>'+basics+'</ul><a href="reading.html">已发布论文教学</a>')
    for p in ['learn.html','overview.html','research.html','practice.html']:
        texts[p]=shell('学习入口','<h1>学习入口</h1><p><a href="foundations.html">基础知识</a> · <a href="experiments.html">基础实验</a> · <a href="reading.html">'+str(count)+' 篇已发布论文教学</a></p>')
    # Preserve explicitly linked source/validation downloads, never blanket-copy documentation or registry.
    pending=list(selected);contents=dict(texts)
    while pending:
        p=pending.pop();s=contents.get(p)
        if s is None:
            try:s=(src/p).read_text()
            except (UnicodeError,FileNotFoundError):continue
        refs=re.findall(r'''["'(]([^\s"'<>]+\.(?:mjs|js|css|json|csv|zip|gz|svg|png|jpg|md|txt)(?:[?#][^\s"'<>]*)?)["')]''',s)
        if p.endswith('.parts.json'):
            chunkManifest=json.loads(s)
            refs += [part['file'] for part in chunkManifest['parts']]
        for ref in refs:
            v=local(p,ref)
            if v and v[0] in allfiles and not v[0].startswith(excluded) and v[0] not in disabledAssets and v[0] not in selected and not v[0].startswith(('site/','scripts/','tests/')):
                selected.add(v[0]);pending.append(v[0])
        if p in texts:continue
    # Static runtime modules can use computed sibling names; preserve each allowed runtime owner's bytes.
    for p in selected-pages:
        if p not in contents:
            try:contents[p]=(src/p).read_text()
            except UnicodeError:pass
    # Remove hidden paper coordinates and labels from delivered scripts as well as tree data.
    p='research-tree-model.js';s=contents[p];m=re.search(r'const FROZEN=(.*?);\n',s);f=json.loads(m.group(1))
    f['nodes']=[n for n in f['nodes'] if (n.get('kind')=='direction' and n['directionId'] in directions) or n.get('canonicalPaperId') in ids]
    nid={n['id'] for n in f['nodes']}|{'root'};f['curves']=[e for e in f['curves'] if e['a'] in nid and e['b'] in nid];f['branchPlanes']=[d for d in f['branchPlanes'] if d['directionId'] in directions]
    contents[p]=s[:m.start(1)]+json.dumps(f,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
    p='research-tree.js';s=contents[p];m=re.search(r'const SKY_LABELS=Object.freeze\((.*?)\);',s,re.S);labels=json.loads(m.group(1));contents[p]=s[:m.start(1)]+json.dumps({k:v for k,v in labels.items() if k in ids},ensure_ascii=False)+s[m.end(1):]
    contents[p]=contents[p].replace("p.id==='networks-cooperative-clusters-2024'?'局部模型实验 · 理论下界，非定位接收机':",'')
    # Navigation is projected physically, never CSS-hidden. Remove links to omitted documents/anchors.
    anchors={p:{n['attrs']['id'] for n in Elements(s).nodes if n['attrs'].get('id')} for p,s in texts.items()}
    p='legacy-routes.js';s=contents[p];m=re.search(r'const routes=(.*?);function redirect',s,re.S);routes=json.loads(m.group(1))
    routes={k:{key:v for key,v in table.items() if (local(k,v)[0] in pages and (not local(k,v)[1] or local(k,v)[1] in anchors.get(local(k,v)[0],set())))} for k,table in routes.items() if k in pages}
    contents[p]=s[:m.start(1)]+json.dumps(routes,ensure_ascii=False)+s[m.end(1):]
    for p,s in texts.items():
        rs=[]
        for n in Elements(s).nodes:
            if n['tag'] not in {'a','script','link'}:continue
            attribute='src' if n['tag']=='script' else 'href'
            if attribute not in n['attrs']:continue
            v=local(p,n['attrs'][attribute])
            if v and (v[0] not in selected or (v[1] and v[0] in anchors and v[1] not in anchors[v[0]])):
                if n['tag']=='a' and v[0]=='reading.html' and v[1] in citations:
                    tag=s[n['start']:n['openEnd']];tag=re.sub(r'href=([\"\'])(.*?)\1','href="'+citations[v[1]]+'"',tag)
                    rs.append((n['start'],n['openEnd'],tag))
                else:rs.append((n['start'],n.get('end',n['openEnd']),''))
        contents[p]=edits(s,rs)
        contents[p]=re.sub(r'<p class="sources">原文接力：[\s·、；，]*</p>','',contents[p])
        contents[p]=re.sub(r'<li>\s*</li>','',contents[p])
        if p=='index.html':contents[p]=contents[p].replace('已经有一篇论文或一个疑问？<br></p>','已经有一篇论文或一个疑问？<br><a href="reading.html">查看已发布论文教学 →</a></p>')
    if out.exists():
        if not (out/'.accepted-publication').exists():raise ValueError('Refuse to replace an unowned output directory')
        shutil.rmtree(out)
    out.mkdir(parents=True);(out/'.accepted-publication').write_text('generated accepted-only artifact\n')
    for p in sorted(selected):
        target=out/p;target.parent.mkdir(parents=True,exist_ok=True)
        if p in contents:target.write_text(contents[p])
        elif (src/p).exists():shutil.copyfile(src/p,target)
        else:raise ValueError('Missing selected file '+p)
    print(json.dumps({'papers':count,'files':len(selected),'output':str(out)},ensure_ascii=False))
if __name__=='__main__':main()
