import {Worker} from 'node:worker_threads';
export const workerFactory=url=>new Worker(url,{type:'module',execArgv:[]});
