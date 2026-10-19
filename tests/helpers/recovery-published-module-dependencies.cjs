'use strict';
// Explicit HISTORICAL/GENERIC fixture validator. This evaluates the exact actual
// published parser; production continues importing scripts/build/module-dependencies.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const projection=require('./recovery-published-baseline-projection.cjs');
const filename=path.resolve(__dirname,'../../scripts/build/module-dependencies.cjs');
projection.assertCurrentClosure();
const source=projection.projectFile('scripts/build/module-dependencies.cjs',fs.readFileSync(filename));
const historical=new Module(filename,module);historical.filename=filename;historical.paths=Module._nodeModulePaths(path.dirname(filename));historical._compile(source.toString(),filename);
module.exports=historical.exports;
