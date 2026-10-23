'use strict';
function configFromEnv(env = process.env) {
  if (!env.MONGO_URI || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('Set MONGO_URI and a SESSION_SECRET of at least 32 characters.');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  const origin = env.APP_ORIGIN || `http://localhost:${port}`;
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('APP_ORIGIN must be an exact HTTP(S) origin.');
  const dbName = env.MONGO_DB || 'evsbs_demo';
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName)) throw new Error('Invalid MONGO_DB.');
  return {mongoUri:env.MONGO_URI,dbName,sessionSecret:env.SESSION_SECRET,port,origin,secureCookie:url.protocol === 'https:' || env.COOKIE_SECURE === 'true'};
}
module.exports = {configFromEnv};
