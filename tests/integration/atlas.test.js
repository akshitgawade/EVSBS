'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const{testConfig}=require('../fixtures/db-safety'),{connect}=require('../../src/core/db'),{fixture,future}=require('../fixtures/app');
const base=testConfig(process.env);
test('Atlas isolated: true concurrent occupancy, rollback, refund and report aggregation',{skip:!base?'NOT-RUN: private MONGO_TEST_URI and distinct MONGO_TEST_DB required':false},async()=>{
 const suffix=randomBytes(5).toString('hex'),connection=await connect({...base,dbName:base.dbName+'_'+suffix});let failPayment=false;
 const db={command:(...args)=>connection.db.command(...args),collection:name=>{const c=connection.db.collection(name);return new Proxy(c,{get(target,key){if(key==='insertOne')return async(doc,...args)=>{if(name==='payments'&&failPayment){failPayment=false;throw Error('Injected payment failure');}return target.insertOne({...doc,testRunId:suffix},...args);};const value=target[key];return typeof value==='function'?value.bind(target):value;}});}};
 const f=await fixture({...connection,db});try{
  const a=await f.customer(),b=await f.customer(),admin=await f.customer('ADMIN'),{slot}=await f.station(),body={slotId:String(slot._id),start:future()};
  const r=await Promise.all([a,b].map(u=>f.request('/api/bookings/',{method:'POST',cookie:u.cookie,body})));assert.deepEqual(r.map(x=>x.status).sort(),[201,409]);assert.equal(await db.collection('bookings').countDocuments({}),1);assert.equal(await db.collection('payments').countDocuments({}),1);
  const winner=r.findIndex(v=>v.status===201),owner=[a,b][winner];assert.equal((await f.request('/api/bookings/'+r[winner].body.data.id+'/cancel',{method:'POST',cookie:owner.cookie,body:{}})).status,200);
  assert.equal((await f.request('/api/bookings/',{method:'POST',cookie:a.cookie,body})).status,201);
  failPayment=true;assert.equal((await f.request('/api/bookings/',{method:'POST',cookie:a.cookie,body:{...body,start:body.start.replace('T10:00','T11:00')}})).status,500);assert.equal(await db.collection('bookings').countDocuments({}),2);assert.equal(await db.collection('payments').countDocuments({}),2);
  assert.equal((await f.request('/api/bookings/',{method:'POST',cookie:a.cookie,body:{...body,start:body.start.replace('T10:00','T11:00')}})).status,201);
  const report=await f.request('/api/admin/reports/stations',{cookie:admin.cookie});assert.equal(report.body.data[0].grossRevenuePaise,75000);assert.equal(report.body.data[0].refundedPaise,25000);assert.equal(report.body.data[0].netRevenuePaise,50000);
 }finally{await f.close();await connection.client.close();console.log('Isolated tagged integration fixtures retained; no database drop or reset performed.');}
});
