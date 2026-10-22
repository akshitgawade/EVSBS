'use strict';
exports.register=async context=>{const{router,services}=context,s=require('./domain/service').createService(context);for(const name of ["isOccupied"])services.provide('bookings.'+name,s[name]);router.use(services.get('auth.requireActiveCustomer'));router.post('/',async(req,res)=>res.status(201).json({data:await s.create(req.user._id,req.body)}));};
