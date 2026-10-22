'use strict';
const {MongoClient} = require('mongodb');
async function bootstrap(db) {
  const definitions={
    users:{required:['_id','firstName','lastName','emailNormalized','phoneNormalized','passwordHash','role','status'],properties:{role:{enum:['CUSTOMER','ADMIN']},status:{enum:['ACTIVE','BLOCKED']},passwordHash:{bsonType:'string'}}},
    ev_stations:{required:['_id','name','address','city','openingTime','closingTime','timeZone','status'],properties:{timeZone:{enum:['Asia/Kolkata']},status:{enum:['ACTIVE','MAINTENANCE','INACTIVE']}}},
    charging_slots:{required:['_id','stationId','slotNumber','connectorType','maxPowerKw','hourlyRatePaise','status'],properties:{stationId:{bsonType:'objectId'},hourlyRatePaise:{bsonType:['int','long','double'],minimum:0,multipleOf:1},status:{enum:['ACTIVE','MAINTENANCE','INACTIVE']}}},
    bookings:{required:['_id','userId','slotId','startTime','endTime','ratePerHourPaise','status'],properties:{userId:{bsonType:'objectId'},slotId:{bsonType:'objectId'},startTime:{bsonType:'date'},endTime:{bsonType:'date'},ratePerHourPaise:{bsonType:['int','long','double'],minimum:0,multipleOf:1},status:{enum:['CONFIRMED','CANCELLED','COMPLETED']}}},
    payments:{required:['_id','bookingId','amountPaise','status','transactionReference','paidAt'],properties:{bookingId:{bsonType:'objectId'},amountPaise:{bsonType:['int','long','double'],minimum:0,multipleOf:1},status:{enum:['PAID','REFUNDED']},paidAt:{bsonType:'date'}}}
  };
  for(const[name,schema]of Object.entries(definitions)){
    const validator={$jsonSchema:{bsonType:'object',...schema}};
    const existing=await db.listCollections({name}).toArray();
    if(!existing.length)await db.createCollection(name,{validator});
    else if(JSON.stringify(existing[0].options?.validator)!==JSON.stringify(validator))throw new Error('Existing collection validator differs. Explicit migration review required.');
  }
  const indexes = {
    users: [[{emailNormalized:1},{unique:true}],[{phoneNormalized:1},{unique:true}]],
    ev_stations: [[{city:1,name:1},{}]],
    charging_slots: [[{stationId:1,slotNumber:1},{unique:true}],[{stationId:1,status:1},{}]],
    bookings: [[{slotId:1,startTime:1},{unique:true,partialFilterExpression:{status:'CONFIRMED'},name:'uniq_confirmed_slot_start'}],[{userId:1,startTime:-1},{}],[{slotId:1,startTime:1,endTime:1,status:1},{}]],
    payments: [[{bookingId:1},{unique:true}],[{transactionReference:1},{unique:true}],[{status:1,paidAt:1},{}]],
    sessions: [[{tokenHash:1},{unique:true}],[{expiresAt:1},{expireAfterSeconds:0}]]
  };
  for (const [name, specs] of Object.entries(indexes)) for (const [key,options] of specs) await db.collection(name).createIndex(key,options);
}
async function connect(config) {
  const client = new MongoClient(config.mongoUri,{serverSelectionTimeoutMS:8000});
  try {
    await client.connect();
    const db = client.db(config.dbName);
    const hello = await db.admin().command({hello:1});
    if ((!hello.setName && hello.msg !== 'isdbgrid') || hello.logicalSessionTimeoutMinutes == null) throw new Error('Transactions require a replica set or sharded deployment.');
    await bootstrap(db);
    await client.withSession(session=>session.withTransaction(()=>db.collection('users').findOne({},{session}),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}}));
    return {db,client,transaction:fn => client.withSession(session => session.withTransaction(() => fn(session),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}}))};
  } catch { await client.close(); throw new Error('Database startup failed. Check connectivity, transaction support and index compatibility privately.'); }
}
module.exports = {connect,bootstrap};
