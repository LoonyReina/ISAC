#!/usr/bin/env node
// This process receives input observations only. Expected values are never loaded.
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../../..');
const G=require(fs.existsSync(path.join(root,'nearfield-gc-sage-core.js'))?path.join(root,'nearfield-gc-sage-core.js'):path.join(root,'labs/near-field/nearfield-gc-sage-core.js'));
const filename=process.argv[2];
if(!filename)throw new Error('Usage: node run-fixture.js input-observations.json');
const input=G.fromFixture(JSON.parse(fs.readFileSync(filename,'utf8')));
const initial=G.initialize(input.observations,input.model,input.options);
const output={initialization:initial,methods:{}};
for(const mode of ['scattering','hybrid'])output.methods[mode]=G.fit(input.observations,input.model,mode,input.options,initial);
process.stdout.write(JSON.stringify(G.serializable(output))+'\n');
