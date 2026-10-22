'use strict';
const {ObjectId}=require('mongodb'),{randomUUID}=require('node:crypto');
function createService({db,transaction,services,errors}){
 const bookings=db.collection('bookings'),payments=db.collection('payments');
 const id=v=>{if(!/^[a-fA-F0-9]{24}$/.test(String(v)))errors.fail(400,'INVALID_ID','Invalid booking ID.');return new ObjectId(String(v));};
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
 return{create,isOccupied};
}
module.exports={createService};
