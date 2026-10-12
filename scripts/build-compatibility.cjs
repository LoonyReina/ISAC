#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{build}=require('./build/compatibility.cjs');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);let output=path.join(root,'dist');
for(let i=0;i<args.length;i++){if(args[i]==='--out'){if(!args[i+1])throw Error('--out requires a path');output=path.resolve(args[++i]);}else if(!['--check','--test','--reproducible'].includes(args[i]))throw Error('Unknown option: '+args[i]);}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'build/compatibility-manifest.json'),'utf8'));
const result=build({root,manifest,output,runTests:args.includes('--test'),reproducible:args.includes('--reproducible'),check:args.includes('--check')});
if(result.tests)process.stdout.write(result.tests);const {tests,...summary}=result;console.log(JSON.stringify({...summary,legacyTestsRun:tests!==null},null,2));
