'use strict';
const {hashPassword}=require('./security');
exports.seedAccounts=({db,errors})=>async env=>{
 for(const[role,prefix,phone]of [['ADMIN','SEED_ADMIN','+919000000001'],['CUSTOMER','SEED_CUSTOMER','+919000000002']]){
  const email=env[prefix+'_EMAIL']?.trim().toLowerCase(),password=env[prefix+'_PASSWORD'];
  if(!email||!password||password.length<10||password.length>128||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.fail(400,'SEED_CONFIG','Provide valid private seed identities and passwords of 10–128 characters.');
  const existing=await db.collection('users').findOne({emailNormalized:email});
  if(existing){if(existing.role!==role)errors.fail(409,'SEED_IDENTITY_CONFLICT','Seed identity already exists with a different role.');continue;}
  await db.collection('users').insertOne({firstName:'Demo',lastName:role==='ADMIN'?'Administrator':'Customer',emailNormalized:email,phoneNormalized:phone,passwordHash:await hashPassword(password),role,status:'ACTIVE',seedCreated:true,createdAt:new Date(),updatedAt:new Date()});
 }
};
