'use strict';
class AppError extends Error {
  constructor(status, code, message, details = []) { super(message); Object.assign(this, {status, code, details}); }
}
const fail = (status, code, message) => { throw new AppError(status, code, message); };
function handler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof AppError) return res.status(error.status).json({error:{code:error.code,message:error.message,details:error.details}});
  if (error.type === 'entity.parse.failed') return res.status(400).json({error:{code:'INVALID_JSON',message:'Malformed JSON.',details:[]}});
  if (/Mongo(Network|ServerSelection|PoolCleared)/.test(error.name || '')) return res.status(503).json({error:{code:'DATABASE_UNAVAILABLE',message:'Database is unavailable.',details:[]}});
  res.status(500).json({error:{code:'INTERNAL_ERROR',message:'The operation could not be completed.',details:[]}});
}
module.exports = {AppError, fail, handler};
