'use strict';
// Compose the record leaf before the still-frozen timer adapter, for provenance only.
const prior=require('./dual-array-current-runtime-preservation.cjs');
const records=require('./dual-array-record-portability-preservation.cjs');
const supportPaths=Object.freeze([...prior.supportPaths,
 'tests/helpers/dual-array-record-leaf-preservation.cjs',
 'tests/helpers/dual-array-record-leaf-delta.json',
 'tests/helpers/dual-array-record-portability-preservation.cjs',
 'tests/helpers/dual-array-record-portability-delta.json',
 'build/dual-array-record-portability-mappings.json',
 'tests/helpers/dual-array-record-runtime-preservation.cjs',
]);
const adaptedPaths=prior.adaptedPaths;
const withoutAdapter=(file,bytes)=>prior.withoutAdapter(file,records.maybeWithoutFile(file,bytes));
const historicalBytes=(file,bytes)=>prior.historicalBytes(file,file==='labs/dual-array/runtime/records.mjs'?records.leaf.withoutFile(file,bytes):records.maybeWithoutFile(file,bytes));
module.exports={sha:records.sha,supportPaths,adaptedPaths,withoutAdapter,historicalBytes};
