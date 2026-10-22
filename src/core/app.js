'use strict';
const express=require('express');
const path=require('node:path');
const errors=require('./errors');
const {loadModules}=require('./loader');
async function createApp({db,transaction,config,moduleRoot=path.resolve(__dirname,'../../modules')}) {
  const app=express();
  app.disable('x-powered-by');
  app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'Referrer-Policy':'same-origin','Cache-Control':'no-store'});next();});
  app.use('/api',(req,res,next)=>{
    if(['POST','PATCH','PUT','DELETE'].includes(req.method)) {
      if(req.get('origin')!==config.origin) return next(new errors.AppError(403,'CSRF_REJECTED','Request origin is not allowed.'));
      if(!req.is('application/json')) return next(new errors.AppError(400,'JSON_REQUIRED','Send application/json.'));
    }
    next();
  });
  app.use(express.json({limit:'32kb'}));
  app.get('/api/health',async(req,res)=>{try{await db.command({ping:1});res.json({data:{status:'ok',database:'connected'}});}catch{res.status(503).json({error:{code:'DATABASE_UNAVAILABLE',message:'Database is unavailable.',details:[]}});}});
  const loaded=await loadModules(app,moduleRoot,{db,transaction,config,errors,logger:{info:message=>console.log(message)}});
  app.get('/api/modules',(req,res)=>res.json({data:loaded.records}));
  app.use(express.static(path.resolve(__dirname,'../web')));
  app.use((req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Resource not found.',details:[]}}));
  app.use(errors.handler);
  return {app,...loaded};
}
module.exports={createApp};
