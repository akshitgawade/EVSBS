'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const{createApp}=require('../../src/core/app'),{memoryDb}=require('../fixtures/memory-db');
test('module registration is atomic on failure',async()=>{
 const work=path.resolve(__dirname,'../../.test-work');await fs.mkdir(work,{recursive:true});const root=await fs.mkdtemp(path.join(work,'failure-'));
 await fs.cp(path.join(__dirname,'../fixtures/broken-module'),path.join(root,'broken'),{recursive:true});
 const loaded=await createApp({...memoryDb(),config:{origin:'http://localhost'},moduleRoot:root});assert.equal(loaded.records[0].state,'failed');assert.equal(loaded.services.get('broken.partial'),undefined);
 const server=loaded.app.listen(0);await new Promise(r=>server.once('listening',r));try{assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/broken/partial`)).status,404);}finally{await new Promise(r=>server.close(r));}
});
