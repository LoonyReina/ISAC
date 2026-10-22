// New 2026-10-21 restoration, not the missing October-20 UI. Never upgrades historical optimizer trust.
import {fieldsFromSpec} from './controller.mjs';
export const PRECOMPUTED = Object.freeze({sha256:'6b349173fa6f16abe3828a508a74f85e22b4f9a6485500d7514664f0e488590e', bytes:3443319, url:new URL('./precomputed/source-chain.json',import.meta.url)});
export async function loadPrecomputed(controller, fetcher=fetch) {
 controller.assertReady();
 const settings=fieldsFromSpec(controller.experiment.spec);
 const result=await controller.importFile({size:PRECOMPUTED.bytes,async text(){
  const response=await fetcher(PRECOMPUTED.url);if(!response.ok)throw Error(`预计算文件无法读取：HTTP ${response.status}`);
  const text=await response.text(),bytes=new TextEncoder().encode(text);
  if(bytes.length!==PRECOMPUTED.bytes)throw Error('预计算文件长度校验失败');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==PRECOMPUTED.sha256)throw Error('预计算文件 SHA-256 校验失败');return text;
 }});
 if(result.status!=='imported')return result;
 const e=controller.experiment;
 for(const group of ['scene','receiver'])if(!controller.edit(group,settings[group]))throw Error('当前场景或接收机设置不合法');
 const revision=e.revision;
 const observation=await controller.action('regenerate');
 if(e!==controller.experiment||e.revision!==revision||!controller.hasRaw)return {status:'superseded'};
 if(e.trust.optimizer!=='historical_unverified')throw Error('预计算设计不能标为当前优化');
 return {status:'precomputed_observation_ready',observation};
}
