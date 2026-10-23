'use strict';
const {readToken,tokenHash}=require('../domain/security');
const {publicUser}=require('./login');
function guards({router,db,config,errors,services}){
 const currentUser=async req=>{const token=readToken(req,config.sessionSecret);if(!token)return null;const session=await db.collection('sessions').findOne({tokenHash:tokenHash(token),expiresAt:{$gt:new Date()}});if(!session)return null;return db.collection('users').findOne({_id:session.userId});};
 const requireUser=async(req,res,next)=>{const user=await currentUser(req);if(!user)errors.fail(401,'UNAUTHENTICATED','Sign in first.');if(user.status!=='ACTIVE')errors.fail(403,'ACCOUNT_BLOCKED','This account is blocked.');req.user=user;next();};
 const role=expected=>async(req,res,next)=>requireUser(req,res,()=>{if(req.user.role!==expected)errors.fail(403,'FORBIDDEN','This action is not allowed for your role.');next();});
 services.provide('auth.currentUser',currentUser);services.provide('auth.requireUser',requireUser);services.provide('auth.requireAdmin',role('ADMIN'));services.provide('auth.requireActiveCustomer',role('CUSTOMER'));
 router.get('/me',requireUser,(req,res)=>res.json({data:publicUser(req.user)}));
}
module.exports={guards};
