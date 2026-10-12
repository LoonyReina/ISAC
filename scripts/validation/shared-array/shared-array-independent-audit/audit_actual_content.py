#!/usr/bin/env python3
"""Reproducible static safeguards accompanying a manual source/content review.
These text assertions are not browser QA and do not replace the PDF visual audit.
"""
import argparse,hashlib,json,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--report',type=Path,required=True);a=p.parse_args()
html=a.repo/'shared-array.html';renderer=a.repo/'shared-array.js';audit=a.repo/'scripts/shared-array-reference/source-audit.md';meta=a.repo/'data/shared-array-sources.json'
s=html.read_text();js=renderer.read_text();findings=[]
def check(name,condition):findings.append({'check':name,'passed':bool(condition)})
for name,tokens in {
 'conditional printed normalization':['diag(R₁)=Pᵣ·1/N','Nᵣ×Nᵣ','tr(R₁)=NᵣPᵣ/N','0.35P₀','总迹≤0.85P₀','共享式(20c)规定总迹 P₀'],
 'no author implementation accusation':['条件推算','不是作者实际执行了不公平仿真的证据','未检查作者代码或勘误','不能断言其实际实现'],
 'source version and locators':['10.1109/TWC.2018.2803045','1707.00519v1','p.2757','p.2758','p.2759','p.2760','未核实为接受稿'],
 'channel conjugation declaration':['原论文采用 hᵀx','原文信道的共轭','不能再重复共轭','不对子阵另行归一化'],
 'independent stream distinction':['本页的 2018 共享模型只使用通信符号','那一页在共享阵列上另加独立雷达流','没有另一个独立符号 s'],
 'no optimized architecture ordering':['不是优化后的 Pareto 边界','不是整体分离/共享最优比较','某个配方失败，不证明该架构的所有设计都无解'],
 'total trace and per-element disclaimer':['只约束总功率','没有每天线相等','不能声称满足相同的每天线额定上限'],
 'raw-power diagnostic excluded':['不能放入同预算排行榜','不绘成同预算主方向图'],
 'projection and architecture feasibility separated':['B 的 0/0 归一化未定义','当前固定分组子问题不可行','零空间仍存在'],
 'unknown reflection and receiver limits':['目标反射系数 β','不是把它们偷偷固定为 1','不等于回波 SNR、CRB、检测概率'],
 'analytical vs direct numerical diagnostics':['解析因子恒等式','*_direct','不是精确重合','不用 epsilon 抬高 q'],
}.items():check(name,all(x in s for x in tokens))
check('actual directional calls use u', 'C.pattern([R[key].wc,R[key].wr],Math.sin(theta*Math.PI/180))' in js)
check('graph common fixed scale', 'height=300,max=8' in js and '不按各条曲线的峰值归一化' in s)
check('raw recipe absent from graph mapping', "const names={split_no_null:'A',split_null_fixed_power:'B',shared_aim_user:'C',shared_aim_target:'D'}" in js)
check('undefined recipes filtered from graphs', "R[key].feasible_recipe" in js)
check('QoS numerical-boundary display preserved', "r.qos_status==='numerical_boundary'" in js)
check('actual graph samples included in record', 'pattern_samples:samples' in js)
bundle=list((a.repo/'scripts/shared-array-reference').rglob('*'))+[meta]
public_text='\n'.join(x.read_text() for x in bundle if x.is_file() and x.suffix in ['.md','.json','.py'])
check('public bundle omits private execution paths',not any('/'+prefix+'/' in public_text for prefix in ['workspace','root']) and not ('/'+'tmp/'+'shared-array') in public_text)
x=json.loads(meta.read_text());note=x['printed_normalization_ambiguity']
check('metadata says implementation unverified','unverified' in note['author_simulation_implementation'])
check('source metadata preserves version count',len(x['editions'])==2)
check('bibliography snapshot not silently refreshed',x['retained_bibliography_snapshot']['refreshed'] is False)
result={'status':'PASS' if all(x['passed'] for x in findings) else 'FAIL','checks':findings,'scope':'static scientific/source safeguards only; manual source review performed separately; no browser or publication','sha256':{str(x.relative_to(a.repo)):hashlib.sha256(x.read_bytes()).hexdigest() for x in [html,renderer,audit,meta]}}
a.report.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'status':result['status'],'checks':len(findings),'failed':[x for x in findings if not x['passed']]},indent=2));raise SystemExit(result['status']!='PASS')
