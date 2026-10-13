// Local untrusted JSON: reject duplicate keys before JSON.parse can erase them.
export function parseRecordJSON(text, maximum=16000000) {
  if(typeof text!=='string'||text.length>maximum||new TextEncoder().encode(text).length>maximum)throw Error('文件超过 16 MB 本地预算');
  let i=0; const primitive=/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y; const ws=()=>{while(/[\t\r\n ]/.test(text[i]||'x'))i++;};
  function string(){const start=i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"')return JSON.parse(text.slice(start,i));}throw Error('JSON 字符串未结束');}
  function value(depth=0){if(depth>64)throw Error('JSON 嵌套超过 64 层');ws();const c=text[i];if(c==='"'){string();return;}if(c==='{'||c==='['){const object=c==='{',end=object?'}':']',seen=new Set();i++;ws();if(text[i]===end){i++;return;}while(i<text.length){if(object){if(text[i]!=='"')throw Error('JSON 对象键无效');const key=string();if(seen.has(key))throw Error('JSON 重复对象键: '+key);seen.add(key);ws();if(text[i++]!==':')throw Error('JSON 缺少冒号');}value(depth+1);ws();if(text[i]===end){i++;return;}if(text[i++]!==',')throw Error('JSON 缺少逗号');ws();}throw Error('JSON 容器未结束');}primitive.lastIndex=i;const m=primitive.exec(text);if(!m)throw Error('JSON 值无效');i+=m[0].length;}
  value();ws();if(i!==text.length)throw Error('JSON 尾部多余内容');const result=JSON.parse(text);if(!result||Array.isArray(result)||typeof result!=='object')throw Error('需要 JSON 记录对象');return result;
}
