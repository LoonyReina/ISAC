import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {computeSingleComparison, batchComparison} from '../labs/cooperative-clusters/cooperative-fim-model.mjs';
import {runFixtureBatch} from '../labs/cooperative-clusters/cooperative-fim-core.mjs';
import {geometrySVG,boundSVG,formatNumber,statusLabel} from '../labs/cooperative-clusters/cooperative-fim-view.mjs';
const fixture=JSON.parse(await readFile(new URL('../assets/data/cooperative-fim-retained-coordinates.json',import.meta.url),'utf8'));
const page=await readFile(new URL('../content/pages/cooperative-clusters.html',import.meta.url),'utf8');
const css=await readFile(new URL('../labs/cooperative-clusters/cooperative-fim.css',import.meta.url),'utf8');
const ui=await readFile(new URL('../labs/cooperative-clusters/cooperative-fim-ui.mjs',import.meta.url),'utf8');
const one=state=>computeSingleComparison(state,fixture);

test('finite SVG paths are generated from exact shared-scale eigenpairs, including thin ellipse',()=>{
 for(const state of [{preset:'symmetric',n:4},{preset:'collinear',epsilon:'0.001'},{preset:'network'}]){
  const result=one(state),svg=boundSVG(result),scales=[];
  for(const path of svg.matchAll(/<path data-side="(\d)" data-status="finite" data-semimajor="([^"]+)" data-semiminor="([^"]+)" data-shared-scale="([^"]+)" d="([^"]+)"/g)){
   const [,index,long,short,scale,d]=path,a=result.sides[Number(index)].result.analysis,F=result.sides[Number(index)].result.fim;
   assert.equal(Number(long),a.bound_region_semiaxes[0]);assert.equal(Number(short),a.bound_region_semiaxes[1]);scales.push(Number(scale));
   const points=[...d.matchAll(/[ML]([^, ]+),([^ Z]+)/g)].map(m=>[(Number(m[1])-250)/Number(scale),(135-Number(m[2]))/Number(scale)]);
   assert.equal(points.length,161);
   for(const[x,y]of points){const q=x*(F[0][0]*x+F[0][1]*y)+y*(F[1][0]*x+F[1][1]*y);assert.ok(Math.abs(q-1)<1e-8,`ellipse equation ${q}`);}
  }
  assert.equal(scales.length,2);assert.equal(scales[0],scales[1]);assert.ok(!/NaN|undefined/.test(svg));
 }
});
test('certified singular bound draws an unbounded strip, rejected inverse only direction',()=>{
 const singular=boundSVG(one({n:1}));assert.match(singular,/<polygon data-side="1" data-status="singular"/);assert.match(singular,/沿 y 无界/);assert.doesNotMatch(singular,/data-side="1" data-status="finite"/);
 for(const epsilon of ['1e-05','1e-07']){const result=one({preset:'collinear',epsilon}),svg=boundSVG(result);assert.doesNotMatch(svg,/data-side="1" data-status="finite"/);assert.match(svg,/B 仅标弱方向/);assert.ok(!/NaN|undefined/.test(svg));}
});
test('geometry retains station numbering and first-eight display without full sample data',()=>{
 const network=geometrySVG(one({preset:'network'}));const labels=[...network.matchAll(/class="cf-svg-label"[^>]*>(\d+)<\/text>/g)].map(m=>+m[1]);assert.deepEqual(labels,[1,2,3,4,5,6,7,8]);assert.match(network,/位置坐标 x 与 y 等比例/);assert.ok(network.length<18000);
 const cardinal=geometrySVG(one({n:1}));assert.match(cardinal,/stroke-dasharray="2 2"/);assert.ok(!/NaN|undefined/.test(cardinal));
});
test('averages draw actual mean bars, no average information ellipse',async()=>{
 const state={preset:'network',view:'average',trials:64};const batch=await runFixtureBatch({request_id:'svg-test',samples:fixture.samples,prefixes:[4,8],trial_budget:64},{yield_control:async()=>{}});
 const result=batchComparison(state,fixture,batch),svg=boundSVG(result);assert.doesNotMatch(svg,/data-semimajor|data-shared-scale|<ellipse/);assert.match(svg,/没有平均椭圆/);
 const values=[...svg.matchAll(/data-mean="([^"]+)"/g)].map(m=>+m[1]);assert.deepEqual(values,result.sides.map(s=>s.summary.mean_trace_inverse));
 const partial={...batch,complete:false,state:'cancelled'};const cancelled=boundSVG(batchComparison(state,fixture,partial));assert.doesNotMatch(cancelled,/data-mean=/);assert.match(cancelled,/未报告/);
});
test('formatting never substitutes zero for invalid/infinite or unresolved values',()=>{
 assert.equal(formatNumber(null),'未报告');assert.equal(formatNumber(NaN),'未报告');assert.equal(formatNumber('infinity'),'∞');assert.equal(formatNumber(0),'0');assert.equal(formatNumber(1e-14),'1.00000e-14');assert.match(statusLabel('singular_or_roundoff_unresolved'),/未能分辨/);
});
test('page has two top-level navigation items, labelled native controls and explicit scope',()=>{
 const nav=page.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];assert.equal((nav.match(/<a /g)||[]).length,2);assert.match(nav,/foundations.html/);assert.match(nav,/reading.html/);
 for(const id of ['cf-n','cf-epsilon','cf-view','cf-trials'])assert.match(page,new RegExp(`<label[^>]*>[\\s\\S]*?<select id="${id}"`));
 assert.equal((page.match(/data-preset=/g)||[]).length,3);assert.match(page,/id="cf-run-status"[^>]*role="status"/);assert.match(page,/id="cf-population-note"/);assert.match(page,/N=2 的总体平均为 ∞/);assert.match(page,/并不|不是|未实现/);
 assert.match(page,/arxiv.org\/pdf\/2403.20228v3#page=2/);assert.match(page,/无偏位置估计的理论界限/);assert.match(page,/没有额外的 1\/2/);assert.match(page,/no-js|noscript/);
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('UI binds every selector/action, history, stale/error/cancellation and evidence without data dumping',()=>{
 for(const id of ['cf-run','cf-cancel','cf-reset','cf-download','cf-n','cf-epsilon','cf-view','cf-trials'])assert.ok(ui.includes(id));
 assert.match(ui,/popstate/);assert.match(ui,/pushState/);assert.match(ui,/上一条件，待重算/);assert.match(ui,/phase==='error'/);assert.match(ui,/phase==='cancelled'/);assert.match(ui,/downloadJSON/);assert.match(ui,/loadRetainedFixture/);assert.match(ui,/requestAnimationFrame/);
 assert.doesNotMatch(ui,/innerHTML\s*=\s*JSON\.stringify\(.*records/);assert.doesNotMatch(ui,/localStorage|sessionStorage|fetch\([^)]*POST/);
 assert.match(css,/@media\(max-width:620px\)/);assert.match(css,/\.cf-figures\{grid-template-columns:1fr\}/);assert.match(css,/\[hidden\]\{display:none!important\}/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
