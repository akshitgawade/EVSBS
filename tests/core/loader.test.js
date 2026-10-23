'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const{createApp}=require('../../src/core/app'),{memoryDb}=require('../fixtures/memory-db'),{testConfig}=require('../fixtures/db-safety');
test('copied modules auto-register; absent upstream disables dependents',{skip:!require('node:fs').existsSync(path.resolve(__dirname,'../../modules/stations/module.json'))},async()=>{
 const work=path.resolve(__dirname,'../../.test-work');await fs.mkdir(work,{recursive:true});const root=await fs.mkdtemp(path.join(work,'modules-'));
 await fs.cp(path.resolve(__dirname,'../../modules/stations'),path.join(root,'stations'),{recursive:true});
 const config={origin:'http://localhost',sessionSecret:'test-only-secret-value-not-used-in-production'};
 let loaded=await createApp({...memoryDb(),config,moduleRoot:root});assert.equal(loaded.records[0].state,'disabled');
 await fs.cp(path.resolve(__dirname,'../../modules/auth'),path.join(root,'auth'),{recursive:true});
 loaded=await createApp({...memoryDb(),config,moduleRoot:root});assert.ok(loaded.records.every(r=>r.state==='active'));assert.equal(loaded.services.get('bookings.isOccupied'),undefined);
 if(!loaded.services.get('stations.parseStart'))return;
 const {fixture,future}=require('../fixtures/app'),{catalog}=require('../fixtures/catalog');const f=await fixture(memoryDb(),{moduleRoot:root});try{const user=await f.customer(),{s}=await catalog(f.db);const r=await f.request('/api/stations/'+s._id+'/availability?start='+future(),{cookie:user.cookie});assert.equal(r.status,503);assert.equal(r.body.error.code,'DEPENDENCY_UNAVAILABLE');}finally{await f.close();}
});
test('test DB safety rejects demo and non-test names',()=>{assert.equal(testConfig({}),null);assert.throws(()=>testConfig({MONGO_TEST_URI:'private',MONGO_TEST_DB:'evsbs_demo'}));assert.throws(()=>testConfig({MONGO_TEST_URI:'private',MONGO_TEST_DB:'evsbs_test_x',MONGO_DB:'evsbs_test_x'}));});
