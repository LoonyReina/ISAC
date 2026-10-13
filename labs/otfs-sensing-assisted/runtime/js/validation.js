/* Structural and numerical bounds are enforced before numerical allocations.
 * Transport structuredClone occurs before Worker-side validation. */
export const LIMITS = Object.freeze({maxN:16,maxM:16,maxCells:256,maxPaths:3,maxIterations:40,maxFrames:2,maxNormalizations:2,maxRequests:10000,maxMessageBytes:2*1024*1024,maxNodes:20000,maxDepth:12,maxWallMs:30000});
export function fail(code,message){ const e=new Error(message); e.code=code; throw e; }
export function keys(x,allowed,required=[],label='input'){
  if(!x||typeof x!=='object'||Array.isArray(x)||![Object.prototype,null].includes(Object.getPrototypeOf(x))) fail('INVALID_INPUT',`${label} must be a plain object`);
  for(const k of Reflect.ownKeys(x)) {const d=Object.getOwnPropertyDescriptor(x,k);if(typeof k!=='string'||!allowed.includes(k))fail('UNKNOWN_FIELD',`${label} contains an unknown field: ${String(k)}`);if(!d||!('value' in d)||!d.enumerable)fail('INVALID_INPUT',`${label} requires enumerable data properties`);}
  for(const k of required)if(!Object.hasOwn(x,k))fail('MISSING_FIELD',`${label}.${k} is required`);
}
export function finite(x,name,min=-1e12,max=1e12){if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)fail('INVALID_INPUT',`${name} must be finite in [${min},${max}]`);return x;}
export function integer(x,name,min,max){finite(x,name,min,max);if(!Number.isInteger(x))fail('INVALID_INPUT',`${name} must be an integer`);return x;}
export function vector(x,length,name,{integerOnly=false,min=-1e12,max=1e12,type='float'}={}){
  if(!(Array.isArray(x)||x instanceof Float64Array)||x.length!==length)fail('INVALID_INPUT',`${name} must contain exactly ${length} numbers`);
  if(ArrayBuffer.isView(x)&&!(x.buffer instanceof ArrayBuffer))fail('INVALID_INPUT',`${name} cannot be a shared view`);
  const out=type==='index'?new Int32Array(length):new Float64Array(length);
  for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(x,String(i));if(!d||!('value' in d))fail('INVALID_INPUT',`${name} must be dense data`);out[i]=integerOnly?integer(d.value,name,min,max):finite(d.value,name,min,max);}return out;
}
export function pair(x,name,{integerOnly=false,min=-1e12,max=1e12}={}){return Array.from(vector(x,2,name,{integerOnly,min,max}));}
export function shapeOf(shape){const s=pair(shape,'shape',{integerOnly:true,min:1,max:16});if(s[0]*s[1]<2)fail('INVALID_INPUT','At least two frame cells are required');return s;}
export const mod=(a,n)=>((a%n)+n)%n;
export function supportOf(shape,support){
  if(!Array.isArray(support)||support.length<1||support.length>LIMITS.maxPaths)fail('INPUT_LIMIT','support must contain 1–3 distinct paths');
  const seen=new Set();return support.map(row=>{const s=pair(row,'support',{integerOnly:true,min:-1000000,max:1000000}).map((v,i)=>mod(v,shape[i]));const id=s.join(',');if(seen.has(id))fail('DUPLICATE_SUPPORT','Duplicate modulo support is unidentifiable; aggregate physical gains first');seen.add(id);return s;});
}
export function pilotIndexOf(shape,x){const q=pair(x,'pilotIndex',{integerOnly:true,min:0,max:15});if(q.some((v,i)=>v>=shape[i]))fail('INVALID_INPUT','pilotIndex outside frame');return q;}
export function pilotOf(x){const p=pair(x,'pilot',{min:-1e6,max:1e6});const ep=p[0]*p[0]+p[1]*p[1];if(ep<1e-12||ep>1e12)fail('INVALID_INPUT','Pilot energy must be in [1e-12,1e12]');return p;}
export function settingsOf(x){return {maxIterations:x.maxIterations===undefined?40:integer(x.maxIterations,'maxIterations',1,40),damping:x.damping===undefined?.5:finite(x.damping,'damping',Number.EPSILON,1),tolerance:x.tolerance===undefined?1e-7:finite(x.tolerance,'tolerance',0,1)};}
export function power(x,name){return finite(x,name,1e-12,1e12);}
export function preflight(x){let nodes=0,bytes=0;const seen=new Set();function visit(v,depth){if(++nodes>LIMITS.maxNodes||depth>LIMITS.maxDepth)fail('INPUT_LIMIT','Structural input limit exceeded');if(v===null||typeof v==='boolean')bytes+=8;else if(typeof v==='number'){if(!Number.isFinite(v))fail('INVALID_INPUT','Nonfinite input');bytes+=8;}else if(typeof v==='string'){if(v.length>1024)fail('INPUT_LIMIT','Input string too long');bytes+=v.length*2;}else if(typeof v==='object'){if(seen.has(v))fail('INVALID_INPUT','Input must be an acyclic tree without shared objects');seen.add(v);if(ArrayBuffer.isView(v)){if(!(v instanceof Float64Array)||!(v.buffer instanceof ArrayBuffer)||v.length>4096)fail('INVALID_INPUT','Only bounded nonshared Float64Array input supported');bytes+=v.byteLength;for(const q of v)if(!Number.isFinite(q))fail('INVALID_INPUT','Nonfinite input vector');}else if(Array.isArray(v)){if(v.length>4096)fail('INPUT_LIMIT','Array too long');for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!('value' in d))fail('INVALID_INPUT','Array must be dense data');visit(d.value,depth+1);}for(const k of Reflect.ownKeys(v))if(k!=='length'&&(typeof k!=='string'||!/^(0|[1-9][0-9]*)$/.test(k)||+k>=v.length))fail('INVALID_INPUT','Extra array property');}else{if(![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('INVALID_INPUT','Unsupported input object');const names=Reflect.ownKeys(v);if(names.length>32)fail('INPUT_LIMIT','Too many object fields');for(const k of names){const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||k.length>128||!d||!('value' in d)||!d.enumerable)fail('INVALID_INPUT','Invalid data property');bytes+=k.length*2;visit(d.value,depth+1);}}}else fail('INVALID_INPUT','Unsupported input value');if(bytes>LIMITS.maxMessageBytes)fail('INPUT_LIMIT','Message budget exceeded');}visit(x,0);return {nodes,bytes};}
