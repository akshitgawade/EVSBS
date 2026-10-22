'use strict';
const {ObjectId}=require('mongodb'),{randomUUID}=require('node:crypto');
function createService({db,transaction,services,errors}){
 const bookings=db.collection('bookings'),payments=db.collection('payments');
 const id=v=>{if(!/^[a-fA-F0-9]{24}$/.test(String(v)))errors.fail(400,'INVALID_ID','Invalid booking ID.');return new ObjectId(String(v));};
 const complete=()=>bookings.updateMany({status:'CONFIRMED',endTime:{$lte:new Date()}},{$set:{status:'COMPLETED',updatedAt:new Date()}});
 const isOccupied=async(slotId,startUtc,session)=>!!await bookings.findOne({slotId:id(slotId),startTime:startUtc,status:'CONFIRMED'},{session});
 async function create(userId,body){
  const bookingId=new ObjectId(),paymentId=new ObjectId(),reference='MOCK-'+randomUUID();
  try{return await transaction(async session=>{
   const{slot,startTime,endTime}=await services.get('stations.requireReservableSlot')(body?.slotId,body?.start,session);
   const now=new Date(),booking={_id:bookingId,slotId:slot._id,userId:id(userId),startTime,endTime,ratePerHourPaise:slot.hourlyRatePaise,status:'CONFIRMED',createdAt:now,updatedAt:now};
   const payment={_id:paymentId,bookingId,amountPaise:slot.hourlyRatePaise,method:'MOCK',status:'PAID',transactionReference:reference,paidAt:now,updatedAt:now};
   await bookings.insertOne(booking,{session});await payments.insertOne(payment,{session});
   return{id:String(bookingId),slotId:String(slot._id),userId:String(userId),startTime,endTime,ratePerHourPaise:slot.hourlyRatePaise,status:'CONFIRMED',payment:{id:String(paymentId),amountPaise:payment.amountPaise,status:'PAID',transactionReference:reference}};
  });}catch(e){if(e.code===11000&&(e.message?.includes('uniq_confirmed_slot_start')||e.keyPattern?.slotId))errors.fail(409,'SLOT_UNAVAILABLE','This charger is already booked for that hour.');throw e;}
 }
 function dateFilter(query={}){const filter={};for(const k of ['from','to'])if(query[k]!=null){const v=query[k];if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))errors.fail(400,'INVALID_DATE','Use YYYY-MM-DD report dates.');const d=new Date(v+'T00:00:00+05:30');if(!Number.isFinite(+d)||new Date(+d+19800000).toISOString().slice(0,10)!==v)errors.fail(400,'INVALID_DATE','Invalid date.');filter[k==='from'?'$gte':'$lt']=k==='to'?new Date(+d+86400000):d;}if(filter.$gte&&filter.$lt&&filter.$gte>=filter.$lt)errors.fail(400,'INVALID_DATE','From date must not follow to date.');return Object.keys(filter).length?{paidAt:filter}:{};}
 async function enrich(b){const{slot,station}=await services.get('stations.getSlotWithStation')(b.slotId),p=await payments.findOne({bookingId:b._id});return{id:String(b._id),userId:String(b.userId),station:{id:String(station._id),name:station.name},slot:{id:String(slot._id),slotNumber:slot.slotNumber,connectorType:slot.connectorType},startTime:b.startTime,endTime:b.endTime,status:b.status,amountPaise:p?.amountPaise??null,paymentStatus:p?.status??null};}
 async function history(userId){await complete();return Promise.all((await bookings.find({userId:id(userId)}).sort({startTime:-1,_id:-1}).toArray()).map(enrich));}
 async function listPayments(query={}){const rows=await payments.find(dateFilter(query)).sort({paidAt:-1}).toArray();return rows.map(({_id,...p})=>({id:String(_id),...p}));}
 async function listAll(query={}){await complete();const ps=await payments.find(dateFilter(query)).toArray();return Promise.all((await bookings.find({_id:{$in:ps.map(p=>p.bookingId)}}).sort({startTime:-1,_id:-1}).toArray()).map(enrich));}
 async function reportStationCohorts(query={}){
  await complete();
  // Single payment-linked cohort; station inventory is obtained through its public service.
  const rows=await payments.aggregate([{$match:dateFilter(query)},{$lookup:{from:'bookings',localField:'bookingId',foreignField:'_id',as:'booking'}},{$unwind:'$booking'},{$group:{_id:{slotId:'$booking.slotId',status:'$booking.status'},total:{$sum:1},gross:{$sum:'$amountPaise'},refunded:{$sum:{$cond:[{$eq:['$status','REFUNDED']},'$amountPaise',0]}}}}]).toArray();
  const stations=await services.get('stations.listStations')({all:true}),map=new Map(stations.map(s=>[String(s._id),{stationId:String(s._id),stationName:s.name,totalBookings:0,confirmedBookings:0,completedBookings:0,cancelledBookings:0,grossRevenuePaise:0,refundedPaise:0,netRevenuePaise:0}]));
  for(const row of rows){const slot=await services.get('stations.findSlot')(row._id.slotId),r=map.get(String(slot.stationId));if(!r)continue;r.totalBookings+=row.total;const key={CONFIRMED:'confirmedBookings',COMPLETED:'completedBookings',CANCELLED:'cancelledBookings'}[row._id.status];if(key)r[key]+=row.total;r.grossRevenuePaise+=row.gross;r.refundedPaise+=row.refunded;r.netRevenuePaise=r.grossRevenuePaise-r.refundedPaise;}return[...map.values()];
 }
 return{create,history,complete,isOccupied,listAll,listPayments,reportStationCohorts,dateFilter};
}
module.exports={createService};
