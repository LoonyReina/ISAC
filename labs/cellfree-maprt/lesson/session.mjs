// UI lifecycle policy, independently testable without a browser.
export class Session {
 constructor(client){this.client=client;this.generation=0;this.state='idle';this.record=null;this.text=null;this.imported=null;this.closed=false;}
 invalidate(reason='edited'){this.generation++;this.client.cancel();this.state=reason;this.record=null;this.text=null;this.imported=null;}
 async run(settings,decode){if(this.closed)throw Error('会话已关闭');if(this.state==='running')return null;const token=++this.generation;this.state='running';this.record=null;this.text=null;this.imported=null;try{const text=await this.client.run(settings);if(token!==this.generation||this.closed)return null;const record=decode(text);this.record=record;this.text=text;this.state=record.accepted?'complete':'failed';return record;}catch(e){if(token!==this.generation)return null;this.state='error';throw e;}}
 async importFile(file,decode){this.invalidate('importing');const token=this.generation;if(!file||file.size>64*1024*1024)throw Error('文件超过64 MiB上限');const text=await file.text();if(token!==this.generation||this.closed)return null;const record=decode(text);if(record?.schema!=='cellfree-maprt-run-v1')throw Error('不支持的记录类型');this.imported={text,record};this.state='historical';return record;}
 async replay(decode){if(!this.imported||this.closed||this.state==='replaying')return null;const token=++this.generation,text=this.imported.text;this.state='replaying';try{const answer=decode(await this.client.replay(text));if(token!==this.generation||this.closed)return null;this.state='historical-checked';return answer;}catch(e){if(token!==this.generation)return null;this.state='historical-rejected';throw e;}}
 destroy(){this.invalidate('closed');this.client.destroy();this.closed=true;}
 canExport(){return this.record!==null&&this.text!==null&&['complete','failed'].includes(this.state);}
}
