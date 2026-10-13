import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
test('Node VM browser branch: UMD load order and browser-message wrappers solve/receive; NOT browser validation',async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('browser-branch-runner.mjs',import.meta.url))],{timeout:60000,maxBuffer:1024*1024});
 const result=JSON.parse(stdout.trim());assert.equal(result.kind,'node_vm_browser_branch_not_browser_execution');assert.equal(result.acceptance,'accepted_numerical_candidate');assert.equal(result.receiver,'ok');assert.equal(result.loaderOrder.length,7);
});
