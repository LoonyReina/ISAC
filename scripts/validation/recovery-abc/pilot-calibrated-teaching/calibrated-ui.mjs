import {siteRoot,sourceURL,outputURL,outputRoot,fixture} from './paths.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const {mounted,change,download}=await import(new URL('./mounted.mjs',import.meta.url));
const {absoluteCandidates}=await import(sourceURL('labs/pilot-pattern/runtime/calibration.mjs'));
const h=mounted({canvas:false});let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++};
try{
 ok(h.get('pp-preset').value==='default','initial preset agrees with default values');
 await change(h,'preset','calibrated-D','change');await h.app.generate();ok(h.app.state.status==='completed','D completes');let r=h.app.state.record;
 ok(r.results.calibration.branches.every(b=>b.available),'D0/D5 calibrated');ok(h.get('pp-calibration-status').textContent.includes('条件绑定有效'),'valid visible');
 const before=JSON.stringify(r),sent=h.sent.length;await change(h,'alpha','0.05','change');ok(JSON.stringify(r)===before,'alpha never mutates retained record');ok(sent===h.sent.length,'alpha re-extracts from current score without regenerating y');
 const b=r.results.calibration.branches.at(-1),raw=r.results.branches.at(-1),expected=absoluteCandidates(raw.map.raw_power.map(v=>v/b.noise_map_variance),r.processing.axes.delay_samples,r.processing.axes.doppler_hz,b.decisions['0.05'].threshold);ok(h.get('pp-calibrated-candidates').querySelectorAll('tbody').flatMap(e=>e.querySelectorAll('tr')).length===expected.length,'current alpha candidate table');
 const exported=JSON.parse(await download(h));ok(exported.schema==='pilot-pattern-raw-record-v2','v2 export');ok(exported.results.calibration.branches.every(b=>b.decisions['0.01'].threshold>0),'both threshold sets exported');
 await change(h,'txseed',7);ok(h.get('pp-calibration-status').textContent.includes('过期'),'editing revokes claim');ok(h.get('pp-download').disabled,'stale no export');await h.app.generate();ok(h.get('pp-calibration-status').textContent.includes('waveform-seed'),'invalid binding exact reason');
 await change(h,'preset','calibrated-A','change');await h.app.generate();ok(h.app.state.record.results.calibration.branches.find(b=>b.ell===5).available,'A5 valid');ok(!h.app.state.record.results.calibration.branches.find(b=>b.ell===0).available,'A0 not accepted');
 await change(h,'preset','calibrated-H0','change');await h.app.generate();ok(h.app.state.record.evaluation_scene.delays_samples.length===0,'live pure noise scene');ok(h.app.state.record.results.calibration.branches.every(b=>b.available),'H0 valid');
 const pending=h.app.checkedDownload(true),n=h.downloads.length;await change(h,'variance',0);await pending;ok(h.downloads.length===n,'edit cancels in-flight export');await h.app.generate();ok(h.get('pp-calibration-status').textContent.includes('positive-known-time-noise-variance-required'),'zero unavailable');
 h.get('pp-file').files=[{name:'v2.json',size:JSON.stringify(exported).length,async text(){return JSON.stringify(exported)}}];await h.get('pp-file').fire('change');await h.get('pp-raw-import').fire('click');ok(h.app.state.record.results.calibration.branches.every(b=>!b.available),'raw-only unknown noise disabled');ok(h.get('pp-calibration-status').textContent.includes('unknown-noise'),'raw provenance reason visible');
 const running=h.app.generate();await h.get('pp-cancel').fire('click');await running;ok(!h.app.state.active&&h.get('pp-download').disabled,'cancel fences export');
 fs.writeFileSync(new URL('calibrated-ui-report.json',outputURL),JSON.stringify({status:'pass',checks,actualNodeWorker:true,productionDOMController:true,browserEngine:false},null,2));console.log('PASS UI',checks);
}finally{await h.cleanup();}
