/* Original ideal monostatic OFDM cuts, not hardware measurements or paper reproduction. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SBFD=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const cfg=Object.freeze({c:299792458,N:2048,Fs:20e6,df:20e6/2048,fc:6.8e9,To:128e-6,nulls:254});
function validK(K){if(!Number.isInteger(K)||K<128||K>880)throw new RangeError('K must be an integer in [128,880]');}
function validM(M){if(!Number.isInteger(M)||M<128||M>2432)throw new RangeError('M must be an integer in [128,2432]');}
function allocation(K=598){validK(K);let start=1;return [['null',64],['sense1',K],['null',63],['sense2',K],['null',63],['comm',1794-2*K],['null',64]].map(([kind,count])=>{const block={kind,start,end:start+count-1,count};start+=count;return block;});}
function metrics(K=598,M=1216){validK(K);validM(M);return {K,M,Kc:1794-2*K,width:K*cfg.df,span:(K-1)*cfg.df,rangeNull:cfg.c/(2*K*cfg.df),cpi:M*cfg.To,velocityNull:cfg.c/(2*cfg.fc*M*cfg.To),occupied:1794,nulls:254};}
// cycles = phase increment / (2 pi). Reduce at integer aliases for stable limits.
function power(count,cycles){if(!Number.isInteger(count)||count<1||!Number.isFinite(cycles))throw new RangeError('Invalid coherent sum');const u=cycles-Math.round(cycles);if(Math.abs(u)<1e-14)return 1;const ratio=Math.sin(Math.PI*count*u)/(count*Math.sin(Math.PI*u));return Math.min(1,ratio*ratio);}
function rangePower(offset,K){if(!Number.isFinite(offset))throw new RangeError('Invalid range offset');return power(K,2*cfg.df*offset/cfg.c);}
function velocityPower(offset,M){if(!Number.isFinite(offset))throw new RangeError('Invalid velocity offset');return power(M,2*cfg.fc*offset*cfg.To/cfg.c);}
function db(p){return 10*Math.log10(Math.max(1e-6,p));}
function cut(kind,count,extent,samples=601){if(!['range','velocity'].includes(kind)||!Number.isFinite(extent)||extent<=0||!Number.isInteger(samples)||samples<2)throw new RangeError('Invalid cut');const fn=kind==='range'?rangePower:velocityPower;return Array.from({length:samples},(_,i)=>{const x=-extent+2*extent*i/(samples-1),p=fn(x,count);return {x,power:p,db:db(p)};});}
return {cfg,allocation,metrics,power,rangePower,velocityPower,db,cut};
});
