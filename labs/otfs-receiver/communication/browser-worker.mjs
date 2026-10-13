import {createController} from './protocol.mjs';
const controller=createController(record=>self.postMessage(record));
self.onmessage=event=>controller.receive(event.data);
