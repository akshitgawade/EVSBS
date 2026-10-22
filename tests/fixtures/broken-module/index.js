exports.register=({router,services})=>{router.get('/partial',(req,res)=>res.json({data:'bad'}));services.provide('broken.partial',true);throw Error('Intentional fixture failure');};
