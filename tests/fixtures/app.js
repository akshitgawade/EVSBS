'use strict';
const {createApp}=require('../../src/core/app');
const {memoryDb}=require('./memory-db');
const {randomBytes}=require('node:crypto');
async function fixture(connection=memoryDb(),options={}){
 const config={origin:'http://localhost',sessionSecret:randomBytes(32).toString('hex'),secureCookie:false};
 const loaded=await createApp({...connection,config,...options});
 const server=loaded.app.listen(0);await new Promise(r=>server.once('listening',r));const origin=`http://127.0.0.1:${server.address().port}`;
 async function request(route,{method='GET',body,cookie,origin:override}={}){const r=await fetch(origin+route,{method,headers:{Origin:override??config.origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:r.status===204?null:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 let counter=0;
 async function customer(role='CUSTOMER'){counter++;const body={firstName:'Test',lastName:'Person',email:`person${counter}@example.test`,phone:`+91912345${String(counter).padStart(4,'0')}`,password:'Example-password-123!'};const registered=await request('/api/auth/register',{method:'POST',body});if(registered.status!==201)throw Error('Test registration failed');const user=await connection.db.collection('users').findOne({emailNormalized:body.email});if(role==='ADMIN')await connection.db.collection('users').updateOne({_id:user._id},{$set:{role}});const login=await request('/api/auth/login',{method:'POST',body:{email:body.email,password:body.password}});return{...user,role,cookie:login.cookie,input:body};}
 async function station(){const s=await loaded.services.get('stations.createStation')({name:'Test station',address:'Test Road',city:'Pune',state:'Maharashtra',postalCode:'411001',openingTime:'00:00',closingTime:'24:00',timeZone:'Asia/Kolkata'});const slot=await loaded.services.get('stations.createSlot')(s._id,{slotNumber:1,connectorType:'CCS2',maxPowerKw:60,hourlyRatePaise:25000});return{s,slot};}
 return{...connection,...loaded,request,customer,station,close:()=>new Promise(r=>server.close(r))};
}
const future=()=>new Date(Date.now()+3*86400000+19800000).toISOString().slice(0,10)+'T10:00';
module.exports={fixture,future};
