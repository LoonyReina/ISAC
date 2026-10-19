import {siteRoot,sourceURL,outputURL,outputRoot,fixture} from './paths.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';const {mounted,change,download}=await import(new URL('./mounted.mjs',import.meta.url));const {checkRecord}=await import(sourceURL('labs/pilot-pattern/runtime/records.mjs'));
const h=mounted({canvas:false});const reports=[];try{
for(const preset of ['calibrated-D','calibrated-A','calibrated-H0','calibrated-close']){
 await change(h,'preset',preset,'change');await h.app.generate();assert.equal(h.app.state.status,'completed');assert.equal(h.app.renderError,null);
 const record=h.app.state.record;assert.ok(record.results.calibration.branches.at(-1).available);for(const a of ['0.01','0.05']){await change(h,'alpha',a,'change');assert.ok(h.get('pp-calibration-status').textContent.includes('条件绑定有效'));assert.ok(h.get('pp-calibration-status').textContent.includes(`名义 α=${Number(a)*100}%`));assert.equal(h.app.state.record,record);}
 await checkRecord(JSON.parse(await download(h)));reports.push(preset);
}
await change(h,'variance',0);assert.ok(h.get('pp-calibration-status').textContent.includes('过期'));assert.equal(h.get('pp-calibrated-candidates').textContent,'');await h.app.generate();assert.ok(h.get('pp-calibration-status').textContent.includes('不可用'));
console.log('PASS mounted calibrated presets, alpha, exports, stale, zero variance',reports);fs.writeFileSync(new URL('independent-ui-report.json',outputURL),JSON.stringify({status:'pass',presets:reports,checks:['alpha both','actual same record','v2 export replay','stale clears candidates','zero variance unavailable']}));
}finally{await h.cleanup()}
