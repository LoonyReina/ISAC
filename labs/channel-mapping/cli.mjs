import {readFile} from 'node:fs/promises';
import {generateCase,createNamedStream} from './src/generator.mjs';
import {solveCase,solveCaptured} from './src/experiment.mjs';
const mode=process.argv[2]||'solve';
try{
  const input=process.argv[3] ? JSON.parse(process.argv[3]) : {};
  let result;
  if(mode==='generate')result=generateCase(input);
  else if(mode==='solve')result=solveCase(input);
  else if(mode==='stream'){const stream=createNamedStream(input.seed,input.scene,input.name);result=Array.from({length:input.count??8},()=>stream.nextUint32());}
  else if(mode==='captured'){const file=JSON.parse(await readFile(input.path,'utf8'));result=solveCaptured(file.observations??file,input.config??{},file.truth??null);}
  else throw new Error('Modes: generate, solve, stream, captured');
  process.stdout.write(JSON.stringify(result)+'\n');
}catch(error){process.stderr.write(String(error.stack||error)+'\n');process.exitCode=1;}
