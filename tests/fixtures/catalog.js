'use strict';
const {ObjectId}=require('mongodb');
exports.catalog=async db=>{const s={_id:new ObjectId(),name:'Fixture station',address:'Fixture road',city:'Pune',state:'MH',postalCode:'411001',openingTime:'00:00',closingTime:'24:00',timeZone:'Asia/Kolkata',status:'ACTIVE'};const slot={_id:new ObjectId(),stationId:s._id,slotNumber:1,connectorType:'CCS2',maxPowerKw:60,hourlyRatePaise:25000,status:'ACTIVE'};await db.collection('ev_stations').insertOne(s);await db.collection('charging_slots').insertOne(slot);return{s,slot};};
