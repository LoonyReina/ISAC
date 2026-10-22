#!/usr/bin/env python3
"""Add exactly one accepted local mapping lesson to a 17-module public projection.
Does not call the builder, upload, edit the official allowlist, or touch input trees.
Requires fresh separate output. Prepared only; not executed by overlay creation.
"""
import argparse,copy,html,importlib.util,json,pathlib,re,shutil,tempfile,os
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('mapping_check',ROOT/'scripts/check-local-mapping.py');C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)
spec=importlib.util.spec_from_file_location('accepted_projection',ROOT/'scripts/publish-accepted.py');P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
def replace_region(text,pattern,value):
    m=C.one(pattern,text);return text[:m.start(1)]+value+text[m.end(1):]
def compact(data):return json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--accepted-input',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
    dist=pathlib.Path(a.input).resolve();accepted=pathlib.Path(a.accepted_input).resolve();out=pathlib.Path(a.output).absolute()
    C.require(not out.exists(),'Refuse existing output; no old preview will be overwritten')
    C.require(out.parent.is_dir() and out.parent.resolve()==out.parent,'Use an existing real output parent')
    for source in [ROOT,dist,accepted]:C.require(out!=source and source not in out.parents and out not in source.parents,'Output must be separate from sources and inputs')
    cfg,afiles=C.inputs(dist,accepted);pid=C.PID;ids=set(cfg['carriedForwardDeployedIds'])|{pid}
    full=C.tree(dist);data=copy.deepcopy(C.tree(accepted));candidate=copy.deepcopy(next(p for p in full['papers'] if p['id']==pid))
    C.require(sum(p['id']==pid for p in full['papers'])==1,'Canonical paper identity must already exist exactly once')
    boundary='新重建本地核心已验收；此集成页待验、未部署。标量合成扫描，不是原作者测量或整篇论文复现；严格逐值比较 FAIL 保留。'
    candidate.update({'tutorials':[{'href':'channel-mapping.html#top','label':'进入新重建本地核心（集成页待验、未部署）','kind':'algorithm','scope':boundary}],'guideIds':[],'catalogIds':[],'caseIds':[],'status':'bounded-core','acceptance':'local-core-accepted','publication':'not-deployed','boundary':boundary})
    data['papers'].append(candidate)
    problem=copy.deepcopy(next(p for p in full['problems'] if p['paperId']==pid));data['problems'].append(problem)
    directions={d for p in data['papers'] for d in p['directionIds']}
    data['directions']=[d for d in full['directions'] if d['id'] in directions]
    valid=ids|{p['id'] for p in data['problems']}|directions
    data['edges']=[e for e in full['edges'] if e['from'] in valid and e['to'] in valid]
    data['lineage']=[];data['counts']={'papers':18,'guides':0};data['note']='17 篇既有公开课（沿用公开范围，未在本次重新验收）＋1 篇新重建本地核心（集成页待验、未部署）；不表示18篇重新验收或完整论文复现。'
    byid={p['id']:p for p in C.tree(accepted)['papers']};byid[pid]=candidate
    cards=''.join('<li data-paper-id="'+html.escape(p['id'])+'" id="paper-'+html.escape(p['id'])+'"><h3>'+html.escape(p['title'])+'</h3><p>'+html.escape(p['question'])+'</p><p>'+html.escape(p['boundary'])+'</p><a href="'+html.escape(p['tutorials'][0]['href'])+'">'+html.escape(p['tutorials'][0]['label'])+'</a></li>' for p in data['papers'])
    body='<h1 id="reading">论文阅读</h1><p>'+html.escape(data['note'])+'</p><section class="research-tree" data-research-tree aria-labelledby="research-tree-title"><div class="rt-heading"><h2 id="research-tree-title">从研究方向找到问题，再选择论文</h2><p>18 个本地阅读入口 · '+str(len(directions))+' 个研究方向</p></div><div data-tree-app></div><details class="rt-fallback" open><summary>全部论文与入口（无 JavaScript 也可用）</summary><ol>'+cards+'</ol></details><script type="application/json" data-tree-data>'+compact(data)+'</script></section>'
    reading=P.shell('论文阅读 · 本地候选',body,'<script defer src="research-tree-model.js"></script><script defer src="research-tree.js"></script>')
    frozen=C.model(dist);frozen['nodes']=[n for n in frozen['nodes'] if (n.get('kind')=='direction' and n['directionId'] in directions) or n.get('canonicalPaperId') in ids]
    nid={n['id'] for n in frozen['nodes']}|{'root'};frozen['curves']=[c for c in frozen['curves'] if c['a'] in nid and c['b'] in nid];frozen['branchPlanes']=[d for d in frozen['branchPlanes'] if d['directionId'] in directions]
    model=replace_region((accepted/'research-tree-model.js').read_text(),r'const FROZEN=(.*?);\n',compact(frozen))
    labels=C.labels(dist);labels={k:v for k,v in labels.items() if k in ids};js=replace_region((accepted/'research-tree.js').read_text(),r'const SKY_LABELS=Object.freeze\((.*?)\);',compact(labels))
    temp=pathlib.Path(tempfile.mkdtemp(prefix='.mapping-local-pending-',dir=out.parent))
    try:
        for name in sorted(afiles-{'.accepted-publication'}):
            target=temp/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(accepted/name,target)
        for name in cfg['newPublicFiles']:
            target=temp/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(dist/name,target)
        (temp/'reading.html').write_text(reading);(temp/'research-tree-model.js').write_text(model);(temp/'research-tree.js').write_text(js)
        (temp/'.local-mapping-candidate').write_text('Local only. Mapping core accepted; integrated UI and whole site pending; not deployed.\n')
        result=C.check(dist,accepted,temp)
        C.require(not out.exists(),'Output appeared during work; refuse overwrite');os.rename(temp,out)
        print(json.dumps({**result,'output':str(out)},ensure_ascii=False,indent=2))
    finally:
        if temp.exists():shutil.rmtree(temp)
if __name__=='__main__':main()
