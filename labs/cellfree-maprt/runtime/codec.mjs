// Portable finite JSON contract. No silent NaN/Infinity-to-null conversion.
const TAG='complex-matrix-f64-json-v1', LIMIT=64*1024*1024;
function matrix(v){
 if(!Number.isInteger(v.rows)||!Number.isInteger(v.cols)||v.rows<0||v.cols<0||v.rows>4096||v.cols>4096||v.rows*v.cols>200000||!(Array.isArray(v.re)||v.re instanceof Float64Array)||!(Array.isArray(v.im)||v.im instanceof Float64Array)||v.re.length!==v.rows*v.cols||v.im.length!==v.re.length||!v.re.every(Number.isFinite)||!v.im.every(Number.isFinite))throw Error('invalid matrix');
}
function size(text){if(typeof text!=='string'||text.length>LIMIT||new TextEncoder().encode(text).length>LIMIT)throw Error('record exceeds 64 MiB');}
export function encode(value){let text=JSON.stringify(value,(_,v)=>{
 if(typeof v==='number'&&!Number.isFinite(v))throw Error('nonfinite number');
 if(v&&Number.isInteger(v.rows)&&Number.isInteger(v.cols)&&v.re instanceof Float64Array&&v.im instanceof Float64Array){matrix(v);return {type:TAG,rows:v.rows,cols:v.cols,re:Array.from(v.re),im:Array.from(v.im)};}
 if(ArrayBuffer.isView(v))return Array.from(v);return v;
 });size(text);return text;}
export function decode(text){size(text);return JSON.parse(text,(_,v)=>{
 if(typeof v==='number'&&!Number.isFinite(v))throw Error('nonfinite number');
 if(v?.type===TAG){matrix(v);return {rows:v.rows,cols:v.cols,re:Float64Array.from(v.re),im:Float64Array.from(v.im)};}return v;
 });}
