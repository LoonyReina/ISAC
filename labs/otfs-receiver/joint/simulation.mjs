import {LiteralOTFS} from './joint-core.mjs';
export function simulate(x,scene,snr,seed){
 if(!Number.isFinite(snr)||snr<0||snr>30||!Number.isInteger(seed)||seed<1||seed>4294967295)throw new RangeError('SNR 0..30; seed 1..4294967295');
 const model=new LiteralOTFS(x),signal=new Float64Array(128);scene.theta.forEach((t,p)=>{const u=model.action(...t),[a,b]=scene.h[p];for(let i=0;i<u.length;i+=2){signal[i]+=a*u[i]-b*u[i+1];signal[i+1]+=a*u[i+1]+b*u[i];}});
 let state=seed>>>0;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return ((state>>>0)+.5)/4294967296;};
 const variance=signal.reduce((s,v)=>s+v*v,0)/64/10**(snr/10),y=Array.from(signal);for(let i=0;i<128;i+=2){const r=Math.sqrt(-2*Math.log(random())*variance/2),a=2*Math.PI*random();y[i]+=r*Math.cos(a);y[i+1]+=r*Math.sin(a);}
 return {receiver:{x:Array.from(x),y,P:scene.P},generation:{scene:scene.name,snr,seed,variance,noise:'xorshift32 Box-Muller, live teaching only; not NumPy C2 seed replay'},truth:{theta:scene.theta,h:scene.h}};
}
