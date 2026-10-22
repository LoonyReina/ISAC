"use strict";
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const s=fs.readFileSync(path.resolve(__dirname,'../.github/workflows/pages.yml'),'utf8');
test('current target19 workflow is exact reviewed bytes with isolated permissions and pinned actions',()=>{
 a.equal(crypto.createHash('sha256').update(s).digest('hex'),'db403ee62770f30dba88ab293020b91d4f1001dd3ed9f151c68c58e5cff7df81');
 a.match(s,/^permissions: \{\}$/m);a.match(s,/persist-credentials: false/);a.match(s,/    permissions:\n      contents: read/);
 const actions=[...s.matchAll(/uses: (\S+)/g)].map(x=>x[1]);a.equal(actions.length,5);for(const x of actions)a.match(x,/@[a-f0-9]{40}$/);
 const deploy=s.split('\n  deploy:\n')[1];a.match(deploy,/needs: build/);a.match(deploy,/pages: write\n      id-token: write/);a.doesNotMatch(deploy,/\brun:|actions\/checkout/);
 const gate="if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";a.equal(s.split(gate).length,3);
});
test('strict main state gate precedes full validation and exact19 projection while PR stays draft',()=>{
 a.ok(s.indexOf('target19.validate_config')<s.indexOf('--test --reproducible'));a.match(s,/draft=os.environ\['GITHUB_EVENT_NAME'\]=='pull_request'/);
 a.match(s,/if \[ "\$GITHUB_EVENT_NAME" = 'pull_request' \]; then draft='--local-draft'; fi/);
 for(const name of ['otfs-integration','nearfield-integration','bistatic-integration','otfs-alias','layout','pages-security'])a.ok(s.includes('tests/target19-'+name+'.test.cjs'));
 a.ok(s.includes('python tests/test-target19-publication.py'));a.ok(s.indexOf('git diff --exit-code')<s.indexOf('python scripts/publish-target19.py'));
 a.equal(s.split('python scripts/publish-target19.py').length,3);a.doesNotMatch(s,/python scripts\/(?:publish-accepted|test-publication)\.py/);a.match(s,/first!=second/);a.match(s,/path: published/);
});
