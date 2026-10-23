'use strict';
// Behavioral fake for fast tests, not evidence of MongoDB transaction correctness.
const {ObjectId,BSON}=require('mongodb');
const clone=v=>BSON.deserialize(BSON.serialize({v})).v;
const eq=(a,b)=>a instanceof Date&&b instanceof Date?+a===+b:a instanceof ObjectId||b instanceof ObjectId?String(a)===String(b):a===b;
const matches=(row,q)=>Object.entries(q).every(([k,v])=>{
 if(v&&typeof v==='object'&&!(v instanceof Date)&&!(v instanceof ObjectId))return Object.entries(v).every(([op,val])=>op==='$gt'?row[k]>val:op==='$gte'?row[k]>=val:op==='$lt'?row[k]<val:op==='$lte'?row[k]<=val:op==='$in'?val.some(x=>eq(row[k],x)):false);
 return eq(row[k],v);
});
function memoryDb(){
 let data={},tail=Promise.resolve(),failPayment=false;
 const unique=(name,row,ignore)=>{const specs={users:[['emailNormalized'],['phoneNormalized']],charging_slots:[['stationId','slotNumber']],payments:[['bookingId'],['transactionReference']],sessions:[['tokenHash']],bookings:row.status==='CONFIRMED'?[['slotId','startTime']]:[]};for(const keys of specs[name]||[])if((data[name]||[]).some(r=>!eq(r._id,ignore)&&(name!=='bookings'||r.status==='CONFIRMED')&&keys.every(k=>eq(r[k],row[k])))){const e=Error(name==='bookings'?'uniq_confirmed_slot_start':'duplicate');e.code=11000;e.keyPattern=Object.fromEntries(keys.map(k=>[k,1]));throw e;}};
 const collection=name=>{
  data[name]??=[];
  return{
   createIndex:async()=>'',
   findOne:async(q={})=>clone((data[name]||[]).find(r=>matches(r,q))||null),
   find(q={}){let rows=(data[name]||[]).filter(r=>matches(r,q));return{sort(spec){rows.sort((a,b)=>{for(const[k,order]of Object.entries(spec)){if(a[k]>b[k])return order;if(a[k]<b[k])return-order;}return 0;});return this;},toArray:async()=>clone(rows)};},
   async insertOne(row){if(name==='payments'&&failPayment){failPayment=false;throw Error('Injected payment write failure');}row._id??=new ObjectId();unique(name,row);data[name].push(clone(row));return{insertedId:row._id};},
   async updateOne(q,u){const i=data[name].findIndex(r=>matches(r,q));if(i<0)return{matchedCount:0,modifiedCount:0};const row=clone(data[name][i]);Object.assign(row,u.$set||{});for(const[k,v]of Object.entries(u.$inc||{}))row[k]=(row[k]||0)+v;unique(name,row,row._id);data[name][i]=row;return{matchedCount:1,modifiedCount:1};},
   async updateMany(q,u){let n=0;for(const row of [...data[name]])if(matches(row,q)){await this.updateOne({_id:row._id},u);n++;}return{matchedCount:n};},
   async deleteOne(q){const i=data[name].findIndex(r=>matches(r,q));if(i<0)return{deletedCount:0};data[name].splice(i,1);return{deletedCount:1};},
   async countDocuments(q={}){return data[name].filter(r=>matches(r,q)).length;},
   aggregate(pipeline){return{toArray:async()=>{if(name!=='payments')throw Error('Unsupported fake aggregation');const groups=new Map();for(const p of data.payments.filter(r=>matches(r,pipeline[0].$match))){const b=data.bookings.find(b=>eq(b._id,p.bookingId));if(!b)continue;const key=String(b.slotId)+b.status,r=groups.get(key)||{_id:{slotId:b.slotId,status:b.status},total:0,gross:0,refunded:0};r.total++;r.gross+=p.amountPaise;if(p.status==='REFUNDED')r.refunded+=p.amountPaise;groups.set(key,r);}return clone([...groups.values()]);}};}
  };
 };
 return{db:{collection,command:async()=>({ok:1})},failNextPayment:()=>{failPayment=true;},transaction:async fn=>{const previous=tail;let release;tail=new Promise(r=>release=r);await previous;const snapshot=clone(data);try{return await fn({mock:true});}catch(e){data=snapshot;throw e;}finally{release();}}};
}
module.exports={memoryDb};
