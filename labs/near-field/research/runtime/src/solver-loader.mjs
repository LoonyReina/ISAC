// Byte-preserved UMD solver works as CommonJS in Node and side-effect modules in browsers.
let kernel;
export async function loadSolver(){
 if(kernel)return kernel;
 if(typeof process!=='undefined'&&process.versions?.node){kernel=(await import('../vendor/solver/core.js')).default;}
 else{for(const name of ['linalg','hermitian','numerics','model','optimizer','metrics','core'])await import(`../vendor/solver/${name}.js`);kernel=globalThis.NearfieldCrbKernel;}
 if(!kernel?.createSolver)throw new Error('Solver kernel load failed');return kernel;
}
