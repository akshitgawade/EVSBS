'use strict';
exports.register=async context=>{require('./api/registration').registration(context);require('./api/login').login(context);require('./api/guards').guards(context);context.services.provide('auth.seedAccounts',require('./domain/seed').seedAccounts(context));};
