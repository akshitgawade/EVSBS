'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const{fixture,future}=require('../../fixtures/app');
test('FR07–12 mocked: conflict, rollback, isolation, refund, rebook, completion',async()=>{const f=await fixture();try{
 const a=await f.customer(),b=await f.customer(),{slot}=await f.station(),body={slotId:String(slot._id),start:future(),amountPaise:1,userId:String(b._id)};
 const results=await Promise.all([a,b].map(u=>f.request('/api/bookings/',{method:'POST',cookie:u.cookie,body})));assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 const winner=results.findIndex(r=>r.status===201),owner=[a,b][winner],other=[a,b][1-winner],booking=results[winner].body.data;assert.equal(booking.payment.amountPaise,25000);assert.equal(booking.userId,String(owner._id));
 assert.equal((await f.request('/api/bookings/my',{cookie:other.cookie})).body.data.length,0);assert.equal((await f.request('/api/bookings/'+booking.id+'/cancel',{method:'POST',cookie:other.cookie,body:{}})).status,404);
 assert.equal((await f.request('/api/bookings/'+booking.id+'/cancel',{method:'POST',cookie:owner.cookie,body:{}})).status,200);assert.equal((await f.request('/api/bookings/'+booking.id+'/cancel',{method:'POST',cookie:owner.cookie,body:{}})).status,409);
 const rebook=await f.request('/api/bookings/',{method:'POST',cookie:other.cookie,body});assert.equal(rebook.status,201);
 f.failNextPayment();assert.equal((await f.request('/api/bookings/',{method:'POST',cookie:a.cookie,body:{...body,start:future().replace('T10:00','T11:00')}})).status,500);assert.equal(await f.db.collection('bookings').countDocuments({}),2);assert.equal(await f.db.collection('payments').countDocuments({}),2);
 const {ObjectId}=require('mongodb');await f.db.collection('bookings').updateOne({_id:new ObjectId(rebook.body.data.id)},{$set:{startTime:new Date(Date.now()-7200000),endTime:new Date(Date.now()-3600000)}});
 assert.equal((await f.request('/api/bookings/'+rebook.body.data.id+'/cancel',{method:'POST',cookie:other.cookie,body:{}})).status,409);const history=await f.request('/api/bookings/my',{cookie:other.cookie});assert.equal(history.body.data[0].status,'COMPLETED');
}finally{await f.close();}});
