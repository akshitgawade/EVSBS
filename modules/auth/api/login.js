'use strict';
const {randomBytes}=require('node:crypto');
const {verifyPassword,tokenHash,sign,readToken}=require('../domain/security');
const publicUser=u=>({id:String(u._id),firstName:u.firstName,lastName:u.lastName,email:u.emailNormalized,role:u.role,status:u.status});
function login({router,db,config,errors}) {
 const attempts=new Map();
 router.post('/login',async(req,res)=>{
  const b=req.body||{};
  if(typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>128)errors.fail(400,'INVALID_LOGIN','Email and password are required.');
  const now=Date.now();for(const [key,v] of attempts)if(v.until<now)attempts.delete(key);
  const key=req.ip,limit=attempts.get(key)||{count:0,until:now+600000};
  if(limit.count>=20)errors.fail(429,'TRY_LATER','Too many login attempts. Try again later.');limit.count++;attempts.set(key,limit);
  const user=await db.collection('users').findOne({emailNormalized:b.email.trim().toLowerCase()});
  const valid=await verifyPassword(b.password,user?.passwordHash||'scrypt:00000000000000000000000000000000:'+ '0'.repeat(128));
  if(!valid||!user||user.status!=='ACTIVE')errors.fail(401,'INVALID_CREDENTIALS','Unable to sign in with these credentials.');
  attempts.delete(key);
  const old=readToken(req,config.sessionSecret);if(old)await db.collection('sessions').deleteOne({tokenHash:tokenHash(old)});
  const token=randomBytes(32).toString('hex');await db.collection('sessions').insertOne({tokenHash:tokenHash(token),userId:user._id,expiresAt:new Date(now+28800000)});
  res.cookie('evsbs',`${token}.${sign(token,config.sessionSecret)}`,{httpOnly:true,sameSite:'lax',secure:config.secureCookie,path:'/',maxAge:28800000});
  res.json({data:{user:publicUser(user)}});
 });
 router.post('/logout',async(req,res)=>{const token=readToken(req,config.sessionSecret);const session=token&&await db.collection('sessions').findOne({tokenHash:tokenHash(token),expiresAt:{$gt:new Date()}});if(!session)errors.fail(401,'UNAUTHENTICATED','Sign in first.');await db.collection('sessions').deleteOne({_id:session._id});res.clearCookie('evsbs',{httpOnly:true,sameSite:'lax',secure:config.secureCookie,path:'/'});res.status(204).end();});
}
module.exports={login,publicUser};
