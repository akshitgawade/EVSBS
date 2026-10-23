'use strict';
const {hashPassword}=require('../domain/security');
function registration({router,db,errors}) {
 router.post('/register',async(req,res)=>{
  const b=req.body||{};
  if(!['firstName','lastName','email','phone','password'].every(k=>typeof b[k]==='string'&&b[k].trim()))errors.fail(400,'INVALID_REGISTRATION','All registration fields are required.');
  const email=b.email.trim().toLowerCase(),phone=b.phone.replace(/[\s()-]/g,'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>120||!/^\+?[1-9]\d{7,14}$/.test(phone)||b.firstName.trim().length>50||b.lastName.trim().length>50||b.password.length<10||b.password.length>128)errors.fail(400,'INVALID_REGISTRATION','Use valid contact details and a password of 10–128 characters.');
  const user={firstName:b.firstName.trim(),lastName:b.lastName.trim(),emailNormalized:email,phoneNormalized:phone,passwordHash:await hashPassword(b.password),role:'CUSTOMER',status:'ACTIVE',createdAt:new Date(),updatedAt:new Date()};
  try{const {insertedId}=await db.collection('users').insertOne(user);res.status(201).json({data:{id:String(insertedId),firstName:user.firstName,lastName:user.lastName,email,phone,role:user.role,status:user.status}});}catch(e){if(e.code===11000)errors.fail(409,'IDENTITY_EXISTS','Email or phone is already registered.');throw e;}
 });
}
module.exports={registration};
