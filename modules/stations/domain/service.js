'use strict';
const {ObjectId}=require('mongodb');
function createService({db,errors}){
 const id=value=>{if(!/^[a-fA-F0-9]{24}$/.test(String(value)))errors.fail(400,'INVALID_ID','Invalid resource ID.');return new ObjectId(String(value));};
 const stationC=db.collection('ev_stations'),slotC=db.collection('charging_slots');
 const findStation=async(value,session)=>{const s=await stationC.findOne({_id:id(value)},{session});if(!s)errors.fail(404,'STATION_NOT_FOUND','Station not found.');return s;};
 const findSlot=async(value,session)=>{const s=await slotC.findOne({_id:id(value)},{session});if(!s)errors.fail(404,'SLOT_NOT_FOUND','Charger not found.');return s;};
 const getSlotWithStation=async(value,session)=>{const slot=await findSlot(value,session);return{slot,station:await findStation(slot.stationId,session)};};
 function parseStart(station,start,now=new Date()){
  if(station.timeZone!=='Asia/Kolkata')errors.fail(400,'INVALID_TIMEZONE','Only Asia/Kolkata is supported.');
  if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(start))errors.fail(400,'INVALID_TIME','Choose a future start on the hour.');
  const utc=new Date(start+':00+05:30');
  if(!Number.isFinite(+utc)||new Date(+utc+19800000).toISOString().slice(0,16)!==start||utc<=now)errors.fail(400,'INVALID_TIME','Choose a valid future date and hour.');
  const minute=Number(start.slice(11,13))*60,toMinute=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
  if(minute<toMinute(station.openingTime)||minute+60>toMinute(station.closingTime))errors.fail(400,'OUTSIDE_HOURS','The entire hour must be within station opening hours.');
  return{startTime:utc,endTime:new Date(+utc+3600000)};
 }
 const requireReservableSlot=async(value,start,session)=>{
  const {slot,station}=await getSlotWithStation(value,session);
  if(station.status!=='ACTIVE')errors.fail(409,'STATION_INACTIVE','Station is not active.');if(slot.status!=='ACTIVE')errors.fail(409,'SLOT_INACTIVE','Charger is not active.');
  const times=parseStart(station,start);
  if(session){await stationC.updateOne({_id:station._id},{$inc:{bookingGuard:1}},{session});await slotC.updateOne({_id:slot._id},{$inc:{bookingGuard:1}},{session});}
  return{slot,station,...times};
 };
 const clean=(b,allowed)=>{if(!b||typeof b!=='object'||Array.isArray(b))errors.fail(400,'INVALID_FIELDS','Provide an object.');return Object.fromEntries(allowed.filter(k=>Object.hasOwn(b,k)).map(k=>[k,b[k]]));};
 function stationFields(b,existing={}){
  const v={...existing,...clean(b,['name','address','city','state','postalCode','openingTime','closingTime','timeZone','status','latitude','longitude'])};v.timeZone??='Asia/Kolkata';v.status??='ACTIVE';
  if(!['name','address','city','state','postalCode'].every(k=>typeof v[k]==='string'&&v[k].trim()&&v[k].length<=255))errors.fail(400,'INVALID_STATION','Station address fields are required.');
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.openingTime)||!/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(v.closingTime)||v.openingTime>=v.closingTime||v.timeZone!=='Asia/Kolkata'||!['ACTIVE','MAINTENANCE','INACTIVE'].includes(v.status))errors.fail(400,'INVALID_STATION','Use valid same-day hours, Asia/Kolkata, and station status.');
  for(const [key,limit] of [['latitude',90],['longitude',180]])if(v[key]!=null&&(typeof v[key]!=='number'||!Number.isFinite(v[key])||Math.abs(v[key])>limit))errors.fail(400,'INVALID_STATION','Invalid coordinates.');
  for(const k of ['name','address','city','state','postalCode'])v[k]=v[k].trim();return v;
 }
 function slotFields(b,existing={}){const v={...existing,...clean(b,['slotNumber','connectorType','maxPowerKw','hourlyRatePaise','status'])};v.status??='ACTIVE';if(!Number.isSafeInteger(v.slotNumber)||v.slotNumber<1||!['CCS2','CHAdeMO','TYPE2','GB_T'].includes(v.connectorType)||typeof v.maxPowerKw!=='number'||!Number.isFinite(v.maxPowerKw)||v.maxPowerKw<=0||!Number.isSafeInteger(v.hourlyRatePaise)||v.hourlyRatePaise<0||!['ACTIVE','MAINTENANCE','INACTIVE'].includes(v.status))errors.fail(400,'INVALID_SLOT','Provide valid charger number, connector, power, price in paise, and status.');return v;}
 const safe=async fn=>{try{return await fn();}catch(e){if(e.code===11000)errors.fail(409,'SLOT_NUMBER_EXISTS','Charger number already exists at this station.');throw e;}};
 const createStation=async(b,session)=>{const s={...stationFields(b),createdAt:new Date(),updatedAt:new Date()};s._id=(await stationC.insertOne(s,{session})).insertedId;return s;};
 const updateStation=async(value,b,session)=>{const old=await findStation(value,session),v=stationFields(b,old);delete v._id;delete v.bookingGuard;await stationC.updateOne({_id:old._id},{$set:{...v,updatedAt:new Date()},$inc:{bookingGuard:1}},{session});return{...v,_id:old._id};};
 const createSlot=async(value,b,session)=>safe(async()=>{const station=await findStation(value,session),s={...slotFields(b),stationId:station._id,createdAt:new Date(),updatedAt:new Date()};s._id=(await slotC.insertOne(s,{session})).insertedId;return s;});
 const updateSlot=async(value,b,session)=>safe(async()=>{const old=await findSlot(value,session),v=slotFields(b,old);delete v._id;delete v.bookingGuard;await slotC.updateOne({_id:old._id},{$set:{...v,updatedAt:new Date()},$inc:{bookingGuard:1}},{session});return{...v,_id:old._id};});
 const listStations=async({city='',name='',all=false}={})=>{if(typeof city!=='string'||typeof name!=='string'||city.length>255||name.length>255)errors.fail(400,'INVALID_SEARCH','Invalid station search.');const rows=await stationC.find(all?{}:{status:'ACTIVE'}).toArray();return rows.filter(s=>s.city.toLowerCase().includes(city.trim().toLowerCase())&&s.name.toLowerCase().includes(name.trim().toLowerCase()));};
 const listSlots=(value,session)=>slotC.find({stationId:id(value)},{session}).toArray();
 return{findStation,findSlot,getSlotWithStation,requireReservableSlot,parseStart,createStation,updateStation,createSlot,updateSlot,listStations,listSlots};
}
const publicRow=row=>{const{_id,bookingGuard,...rest}=row;return{id:String(_id),...rest};};
module.exports={createService,publicRow};
