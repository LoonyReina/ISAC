import fs from 'node:fs';import {run} from '../kernel.mjs';import {makePreset} from '../presets.mjs';
const cases=[];
for(const name of ['teaching','figure10-total','figure10-per-antenna']){const input=makePreset(name);input.blocks=128;if(name==='teaching')input.kappas=[0,.0037,.37,3.14159,42.125,999.9,'communication-only'];input.selectedIndex=3;cases.push({name,result:await run(input)});}
fs.writeFileSync(new URL('../reports/live-evidence.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');console.log(`Wrote ${cases.length} fresh executions`);
