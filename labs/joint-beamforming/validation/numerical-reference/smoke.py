from reference import *
model=RadarModel(); H=rng_channel(2026101201)
print('qr loss identity',np.linalg.norm(model.QR.T@model.QR-model.D.T@model.D),flush=True)
r=Solver(model,'radar').solve(); R0=matrix_from_json(r['R']); records=[r]
print('radar',r['status'],r['elapsed_seconds'],r['metrics']['objective'],flush=True)
for kind in ['sdr','zf']:
    out=Solver(model,kind,H).solve(12,R0=R0); records.append(out)
    print(kind,out['status'],out['elapsed_seconds'],out.get('metrics',{}).get('objective'),out.get('factor_metrics',{}).get('min_sinr_db'),out.get('residuals'),flush=True)
save_json(Path(__file__).parent/'results/smoke.json',{'config':dataclasses.asdict(model.cfg),'H':matrix_json(H),'results':records})
