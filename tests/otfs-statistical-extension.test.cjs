'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'labs/otfs-receiver/statistics');
const page=fs.readFileSync(fs.existsSync(path.join(root,'content/pages/otfs-receiver.html'))?path.join(root,'content/pages/otfs-receiver.html'):path.join(root,'otfs-receiver.html'),'utf8');
test('OTFS statistics remain inside same page and distinguish offline and live solvers',()=>{
 for(const value of ['id="statistics"','1,400','2,985','39','19','122','L-BFGS-B','模式搜索','不是原文 Fig.4','非置信区域','1.25 MHz','51.2 μs','0.025'])assert.ok(page.includes(value),value);
 assert.ok(page.includes('stats-live-result" hidden'));
 const m=fs.readFileSync(path.join(base,'statistics.mjs'),'utf8');assert.match(m,/worker\?\.terminate\(\)/);assert.match(m,/worker!==current/);assert.match(m,/result=null/);assert.doesNotMatch(m,/localStorage|sessionStorage/);
});
test('offline compact summary retains all SNRs, bootstrap and failure policy counts',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(base,'offline-summary.json')));assert.deepEqual(d.summary.map(r=>r.snr_db),[-25,-20,-15,-10,0,10,20]);assert.equal(d.summary.reduce((a,r)=>a+r.trials,0),1400);assert.equal(d.failed_local_attempts,39);assert.equal(d.total_local_attempts,2985);assert.equal(d.selected_failed_status_candidates,19);assert.equal(d.selected_grid_candidates,122);
 for(const row of d.summary)for(const method of Object.values(row.methods)){assert.equal(method.rmse_95_bootstrap_interval_qa.length,2);assert.ok(method.rmse_qa.every(x=>x>0));}
 assert.ok(d.summary.find(r=>r.snr_db===0).methods.coarse.rmse_qa[0]<d.summary.find(r=>r.snr_db===0).methods.fine.rmse_qa[0]);
});
test('browser statistical kernel uses same y with nested grid, repeatable seeds, bounded local score fallback',async()=>{
 const {createTeachingEngine}=await import(path.join(base,'otfs-core.mjs')),fixture=JSON.parse(fs.readFileSync(path.join(base,'fixed-frame.json'))),engine=createTeachingEngine(fixture);
 assert.deepEqual((await import(path.join(base,'fixed-frame.mjs'))).default,fixture,'browser static fixture is exact original JSON');
 const a=engine.run(20,1910),b=engine.run(20,1910);assert.deepEqual(a.observation,b.observation);assert.deepEqual(a.local,b.local);assert.equal(a.heatmap.length,6561);assert.ok(a.fine.score+1e-10>=a.coarse.score);assert.ok(a.local.score+1e-10>=a.fine.score);assert.equal(a.crb.ok,true);
 assert.ok(a.statuses.length>=2);for(const t of a.statuses){assert.ok(t.result[0]>=t.bounds[0][0]&&t.result[0]<=t.bounds[0][1]);assert.ok(t.result[1]>=-1&&t.result[1]<=1);}
 assert.throws(()=>engine.run(21,1));assert.throws(()=>engine.run(0,-1));assert.throws(()=>engine.estimate(new Float64Array(1)));
});
test('offline SVG coordinates are calculated from every summary SNR, never from a live observation',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(base,'offline-summary.json'))),svg=fs.readFileSync(path.join(base,'offline-rmse.svg'),'utf8');
 const traces=[...svg.matchAll(/<polyline points="([^"]+)"/g)].map(m=>m[1]);assert.equal(traces.length,8);
 for(let dim=0;dim<2;dim++)for(const [mi,method]of ['coarse','fine','refined','crb'].entries()){
  const points=d.summary.map(row=>{const x=65+dim*550+(row.snr_db+25)/45*445,v=method==='crb'?Math.sqrt(row.local_crb_qa[dim]):row.methods[method].rmse_qa[dim],y=75+(Math.log10(3)-Math.log10(v))/(Math.log10(3)-Math.log10(.003))*265;return `${x.toFixed(3)},${y.toFixed(3)}`;}).join(' ');
  assert.equal(traces[dim*4+mi],points);
 }
});
