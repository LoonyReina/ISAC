/** Mapping-only adapter to the actual SharedArrayCore public API. */
import {createRequire} from 'node:module';
export async function bindCore(corePath){
 const require=createRequire(import.meta.url);
 const core=require(corePath);
 for(const name of ['evaluate','pattern','covariance'])if(typeof core[name]!=='function')throw new Error('Missing actual export '+name);
 return {
  evaluate:config=>core.evaluate(config),
  recipePattern:(snapshot,name,u)=>core.pattern([snapshot.recipes[name].wc,snapshot.recipes[name].wr],u),
  factorCovariance:factors=>core.covariance(factors),
  factorPattern:(factors,u)=>core.pattern(factors,u)
 };
}
