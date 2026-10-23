'use strict';
const publicRow=({_id,bookingGuard,...rest})=>({id:String(_id),...rest});
exports.register=async({router,services,transaction})=>{
 router.use(services.get('auth.requireAdmin'));
 const get=name=>services.get(name);
 router.get('/stations',async(req,res)=>{const data=(await get('stations.listStations')({all:true})).map(publicRow);res.json({data,meta:{count:data.length}});});
 router.post('/stations',async(req,res)=>res.status(201).json({data:publicRow(await transaction(session=>get('stations.createStation')(req.body,session)))}));
 router.patch('/stations/:stationId',async(req,res)=>res.json({data:publicRow(await transaction(session=>get('stations.updateStation')(req.params.stationId,req.body,session)))}));
 router.post('/stations/:stationId/slots',async(req,res)=>res.status(201).json({data:publicRow(await transaction(session=>get('stations.createSlot')(req.params.stationId,req.body,session)))}));
 router.patch('/slots/:slotId',async(req,res)=>res.json({data:publicRow(await transaction(session=>get('stations.updateSlot')(req.params.slotId,req.body,session)))}));
 for(const[route,service]of [['/bookings','listAll'],['/payments','listPayments'],['/reports/stations','reportStationCohorts']])router.get(route,async(req,res)=>{const data=await get('bookings.'+service)(req.query);res.json({data,meta:{count:data.length}});});
};
