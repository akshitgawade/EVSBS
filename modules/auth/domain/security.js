'use strict';
const {scrypt,randomBytes,timingSafeEqual,createHash,createHmac}=require('node:crypto');
const derive=require('node:util').promisify(scrypt);
async function hashPassword(password){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64);return `scrypt:${salt}:${key.toString('hex')}`;}
async function verifyPassword(password,stored){try{const [scheme,salt,hash]=stored.split(':');if(scheme!=='scrypt'||!salt||!hash)return false;const key=await derive(password,salt,64);const expected=Buffer.from(hash,'hex');return key.length===expected.length&&timingSafeEqual(key,expected);}catch{return false;}}
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
const sign=(token,secret)=>createHmac('sha256',secret).update(token).digest('hex');
function readToken(req,secret){const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('evsbs='))?.slice(6);if(!value)return null;const [token,signature]=value.split('.');if(!/^[a-f0-9]{64}$/.test(token||'')||!/^[a-f0-9]{64}$/.test(signature||''))return null;return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(token,secret),'hex'))?token:null;}
module.exports={hashPassword,verifyPassword,tokenHash,sign,readToken};
