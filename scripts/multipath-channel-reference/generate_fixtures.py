"""Regenerate frozen JSON fixtures and resource ledger with the independent reference."""
import json
import math
from dataclasses import asdict,is_dataclass
from pathlib import Path
import reference as r

ROOT=Path(__file__).resolve().parent

def encode(value):
    if isinstance(value,complex):return [value.real,value.imag]
    if is_dataclass(value):return encode(asdict(value))
    if isinstance(value,dict):return {k:encode(v) for k,v in value.items()}
    if isinstance(value,(tuple,list)):return [encode(v) for v in value]
    return value


def write(name,value):
    (ROOT/name).write_text(json.dumps(encode(value),ensure_ascii=False,indent=2,allow_nan=False)+'\n')


def main():
    g=r.geometry(.1)
    balance=g.direct_length/g.reflected_length
    alignment=math.remainder(math.tau*(r.FC-r.DF/2)*(g.reflected_delay-g.direct_delay),math.tau)
    opposite=math.remainder(alignment+math.pi,math.tau)
    cases=[('default',r.Scene()),('height_1',r.Scene(h=1)),('height_min',r.Scene(h=.1)),
           ('height_max',r.Scene(h=6)),('no_reflection',r.Scene(rho=0)),
           ('reflection_only',r.Scene(b=0)),('zero_channel',r.Scene(b=0,rho=0)),
           ('overlap_constructive',r.Scene(h=.1,b=balance,rho=1,psi=alignment)),
           ('overlap_destructive',r.Scene(h=.1,b=balance,rho=1,psi=opposite))]
    scenes=[]
    fixed_probe_indices=(0,400,500,550,577,600,625,631,632,633,650,670,700,720,800,848,849,900,1000,1200,1400)
    for name,s in cases:
        inp,t=r.generate_scene(s)
        out=r.receive(**inp)
        g=t['geometry']
        closed=r.analytic_response(inp['candidates'],(g.direct_length,g.reflected_length),t['coefficients'])
        scenes.append(dict(id=name,scene=s,geometry=g,coefficients=t['coefficients'],
                           Y=inp['Y'],generator_contributions=t['contributions'],
                           receiver_status=out['status'],estimate=out['estimate'],
                           response_probes=[dict(index=i,d_m=r.CANDIDATES[i],z=out['z'][i],power=out['power'][i]) for i in fixed_probe_indices],
                           max_explicit_vs_analytic_abs_error=max(abs(a-b) for a,b in zip(out['z'],closed)),
                           diagnostics=r.scene_diagnostics(s,g,t['coefficients'],inp['Y'])))
    algebra=[]
    for name,lengths,coefficients in [('coincident_cancel',(6.,6.),(.2+.1j,-.2-.1j)),
                                     ('coincident_combine',(6.,6.),(.2+.1j,.3-.4j)),
                                     ('aliased_combine',(0.,r.ALIAS_LENGTH),(.2+.1j,.3-.4j))]:
        Y,_=r.synthesize_taps(lengths,coefficients)
        ds=(0.,6.,r.FIRST_NULL_LENGTH,r.ALIAS_LENGTH)
        z=r.matched_sum(Y=Y,X=r.pilots(),f=r.FREQUENCIES,candidates=ds)
        algebra.append(dict(id=name,scope='frequency-domain algebra only; not a valid geometry/CP scene',lengths_m=lengths,
                            coefficients=coefficients,Y=Y,probe_candidates_m=ds,z=z))
    write('fixtures.json',dict(version='1.0',complex_encoding='[real,imaginary]',
          grid=dict(frequency_hz=r.FREQUENCIES,pilots=r.pilots(),candidate_m=r.CANDIDATES),
          reference_scene_count=len(scenes),scenes=scenes,algebra=algebra,
          gram_limits=[dict(q=q,**r.gram_from_separation_cycles(q)) for q in (0.,1.,1/r.N,1e-8,1e-12,1e-16,1e-200)]))
    write('resource-ledger.json',r.resource_ledger())
    print('Wrote 9 scene fixtures, 3 algebra-only fixtures, 7 Gram-limit fixtures, fixed grid, pilots and resource ledger')
    for scene in scenes:
        print(scene['id'],scene['estimate'],'received energy',scene['diagnostics']['received_useful_energy'])

if __name__=='__main__': main()
