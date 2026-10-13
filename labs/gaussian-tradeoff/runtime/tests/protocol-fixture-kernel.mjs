// Test-only injectable kernel. Production worker.mjs never imports this file.
export function validateInput(x){
  if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['value','steps','badResult','throwError'].includes(k)))throw new Error('Invalid fixture fields');
  if(typeof x.value!=='number'||!Number.isFinite(x.value))throw new Error('value must be finite');
  const steps=x.steps??1;if(!Number.isInteger(steps)||steps<1||steps>1000)throw new Error('steps must be 1..1000');
  return {value:x.value,steps,badResult:x.badResult??false,throwError:x.throwError??false};
}
export async function run(input,{checkpoint,progress}){
  for(let i=0;i<input.steps;i++){await checkpoint('work',{done:i,total:input.steps});progress('work',{done:i+1,total:input.steps});}
  if(input.throwError)throw new Error('Deliberate fixture failure');
  return {answer:input.badResult?Infinity:input.value,steps:input.steps,negativeZero:-0};
}
