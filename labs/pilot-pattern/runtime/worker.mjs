import {createDispatcher} from './protocol.mjs';
const dispatcher=createDispatcher(message=>globalThis.postMessage(message));
globalThis.addEventListener('message',event=>{void dispatcher.receive(event.data);});
