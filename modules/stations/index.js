'use strict';
const {createService,publicRow}=require('./domain/service');
exports.register=async context=>{
 const{router,services,errors}=context,s=createService(context);for(const[name,value]of Object.entries(s))services.provide('stations.'+name,value);
 router.use(services.get('auth.requireUser'));
 router.get('/',async(req,res)=>{const rows=(await s.listStations({city:req.query.city,name:req.query.name})).map(publicRow);res.json({data:rows,meta:{count:rows.length}});});
 router.get('/:stationId',async(req,res)=>{const station=await s.findStation(req.params.stationId);res.json({data:{...publicRow(station),slots:(await s.listSlots(station._id)).map(publicRow)}});});
 router.get('/:stationId/availability',async(req,res)=>{const station=await s.findStation(req.params.stationId),times=s.parseStart(station,req.query.start),occupied=services.get('bookings.isOccupied');if(!occupied)errors.fail(503,'DEPENDENCY_UNAVAILABLE','Booking availability is not installed yet.');const slots=[];for(const slot of await s.listSlots(station._id)){const reason=station.status!=='ACTIVE'?'STATION_INACTIVE':slot.status!=='ACTIVE'?'SLOT_INACTIVE':await occupied(slot._id,times.startTime)?'ALREADY_BOOKED':null;slots.push({slotId:String(slot._id),available:!reason,reason});}res.json({data:{stationId:String(station._id),...times,slots}});});
};
