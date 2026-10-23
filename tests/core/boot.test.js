'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../../src/core/app');
const {configFromEnv}=require('../../src/core/config');
test('zero modules: real HTTP shell, census, health and unavailable DB',async()=>{
 let connected=true;const {app}=await createApp({db:{command:async()=>{if(!connected)throw Error();return{ok:1};}},config:{origin:'http://localhost'},moduleRoot:require('node:path').join(__dirname,'absent')});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const url=`http://localhost:${server.address().port}`;
 try{assert.equal((await fetch(url)).status,200);assert.deepEqual(await(await fetch(url+'/api/modules')).json(),{data:[]});assert.equal((await fetch(url+'/api/health')).status,200);connected=false;assert.equal((await fetch(url+'/api/health')).status,503);assert.equal((await fetch(url+'/api/nope',{method:'POST'})).status,403);}finally{await new Promise(r=>server.close(r));}
});
test('required environment fails clearly',()=>assert.throws(()=>configFromEnv({}),/MONGO_URI/));
