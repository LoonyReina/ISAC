'use strict';
// Remove only the explicitly reviewed additive lesson and two navigation hooks.
// Exact assertions keep this historical-fixture adapter from hiding later edits.
const a=require('node:assert/strict');
const unit={
 id:'reference-uncertainty',title:'参考不确定性与距离匹配',href:'reference-uncertainty.html#experiment',
 question:'同一份回波，参考符号知道多少？',
 prerequisites:['foundations.html#matched','pilot-design.html#experiment','offgrid-range.html#model'],
 group:'processing',primaryDirectionId:'receiver',
 action:'固定同一份复回波，比较全符号 oracle、仅导频与注入错误的参考；记录等峰、复数合向量和参考信息预算，不把小残差当作距离正确的证明。'
};
const page={
 path:'reference-uncertainty.html',title:unit.question,stage:'experiments',
 role:'基础机制 · 单目标同回波与参考信息条件消融',prerequisites:[...unit.prerequisites],
 next:'reading.html#guide-zak-otfs-semiblind-offgrid-2026',nextLabel:'沿问题读半盲估参的原文与边界'
};
const hooks=[
 {directionId:'receiver',levelId:'experiment',item:{
  label:'同一份回波，比较已知、未知与错误参考',href:unit.href,kind:'interactive',scope:'direction-specific',status:'available',
  note:'独立单目标、单站静态 OFDM 教学模型；三分支共享同一复回波，但参考信息与处理样本数不同；不是半盲联合算法或论文复现。'
 }},
 {directionId:'waveforms',levelId:'experiment',item:{
  label:'先比较导频留空与错误符号参考',href:unit.href,kind:'interactive',scope:'foundation-only',status:'available',
  note:'半盲原文阅读前的参考不确定性机制；仅比较单目标 OFDM 距离匹配，没有 OTFS/Zak-OTFS 波形或半盲联合恢复。'
 }}
];
function removeExact(items,key,expected,label){
 const indices=items.flatMap((item,index)=>item[key]===expected[key]?[index]:[]);
 a.deepEqual(indices,[items.length-1],label+' must be one exact appended addition');
 a.deepEqual(items[indices[0]],expected,label+' changed beyond the authorized additive hook');
 items.splice(indices[0],1);
}
function withoutReferenceUncertainty(registry){
 const old=registry.units.some(u=>u.id==='nearfield-gc-sage')?require('./gc-sage-preservation.cjs').withoutGCSAGERegistry(registry):structuredClone(registry);
 removeExact(old.units,'id',unit,'reference-uncertainty unit');
 removeExact(old.pages,'path',page,'reference-uncertainty page');
 for(const hook of hooks){
  const direction=old.directions.find(d=>d.id===hook.directionId);
  a.ok(direction,hook.directionId);
  const level=direction.levels.find(l=>l.id===hook.levelId);
  a.ok(level,hook.levelId);
  removeExact(level.items,'href',hook.item,hook.directionId+'/'+hook.levelId);
 }
 return old;
}
const prerequisiteHook=" 'offgrid-range.html#model':'离格测距的观测与模型',\n";
function withoutReferencePrerequisite(source){
 a.equal(source.split(prerequisiteHook).length,2,'exactly one reference-uncertainty prerequisite label');
 a.ok(source.includes('const prerequisiteTitles={\n'+prerequisiteHook),'prerequisite label stays in the declared title map');
 return source.replace(prerequisiteHook,'');
}
module.exports={unit,page,hooks,withoutReferenceUncertainty,withoutReferencePrerequisite,prerequisiteHook};
