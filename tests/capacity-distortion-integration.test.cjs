'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const tags='<link rel="stylesheet" href="capacity-distortion.css?v=finite-ba-v1"><script defer src="capacity-distortion-core.js?v=finite-ba-v1"></script><script defer src="experiment-record.js?v=record-preview-v1"></script><script defer src="capacity-distortion.js?v=finite-ba-v2"></script>';
function originalTheory(html){
 for(const marker of ['<!-- CAPACITY-DISTORTION:START -->','<!-- CAPACITY-DISTORTION:END -->'])a.equal(html.split(marker).length,2,'one exact lesson block boundary');
 a.equal(html.split(tags).length,2,'one scoped asset bundle');a.equal(html.split('五个可复算实验').length,2,'one updated local experiment count');
 return html.replace(/<!-- CAPACITY-DISTORTION:START -->[\s\S]*?<!-- CAPACITY-DISTORTION:END -->\n/,'').replace(tags,'').replace('五个可复算实验','四个可复算实验');
}
test('new optimizer preserves the existing theory science outside its explicit block and asset hooks',()=>{
 const html=read('theory.html'),baseline='2a4a08c66d256e5118a5c37cd8b25539e240501e0336ec573d3c542fb9720b1c';
 a.equal(hash(originalTheory(html)),baseline);
 const mutated=html.replace('两个点不是完整 Pareto 边界','两个点就是完整 Pareto 边界');a.notEqual(mutated,html);a.notEqual(hash(originalTheory(mutated)),baseline);
 a.throws(()=>originalTheory(html.replace(tags,'')));a.throws(()=>originalTheory(html+tags));
 for(const file of ['theory-core.js','theory.js','estimator-core.js','estimator.js'])a.doesNotMatch(read(file),/CapacityDistortion|capacity-distortion/,'old runtime does not acquire a new numerical dependency');
});
test('the computed Fig2 sweep runs the actual core and checks every iteration against an independent oracle',()=>{
 const result=JSON.parse(cp.execFileSync(process.execPath,['scripts/validation/capacity-distortion/validate-capacity-distortion.cjs'],{cwd:root,encoding:'utf8'}));
 a.equal(result.solverPoints.length,49);a.ok(result.solverPoints.every(p=>p.status==='converged'&&p.gapNats<=1.01e-10));
 a.ok(result.maximumRateError<1e-7);a.ok(result.maximumDistortionError<1e-7);a.ok(result.maximumIterationProbabilityError<1e-11);
 a.equal(result.completePaperReproduced,false);a.equal(result.runtime.browserLatencyMeasured,false);
 a.match(result.exactSensingEndpoint.origin,/not a finite-mu/);a.match(result.plateau,/slack/);a.match(result.paperSeparationPolicy,/does not use feedback/);
 a.equal(result.originalFigureBudgetAnchors.at(-1).allowedDistortion,.4);a.equal(result.originalFigureBudgetAnchors.at(-1).paperSeparationRateBits,.4);
});
test('independent numerical evidence identifies the actual core and preserves the uncompleted Gaussian gate',()=>{
 const evidence=JSON.parse(read('scripts/validation/capacity-distortion/production_crosscheck_results.json')).summary;
 a.equal(evidence.production_core_sha256,hash(read('capacity-distortion-core.js')));a.equal(evidence.production_runs,150);a.deepEqual(evidence.failures,[]);
 a.ok(evidence.max_objective_error<2e-7);a.ok(evidence.max_certificate_gap<=1.01e-10);
 const audit=read('docs/CAPACITY-DISTORTION-NUMERICAL-AUDIT.md');a.match(audit,/Figure 3/);a.match(audit,/3501/);a.match(audit,/bisection fallback/);a.doesNotMatch(audit,/\/workspace\/|\/tmp\//);
 const fixture=JSON.parse(read('scripts/validation/capacity-distortion/independent-reference-fixtures.json'));
 a.ok(Math.abs(fixture.gaussian_separate_gate.literal_model_gaussian_capacity_bits-1.252699474402693)<1e-12);
 a.equal(fixture.gaussian_separate_gate.paper_reported_gaussian_capacity_bits,1.213);
});
