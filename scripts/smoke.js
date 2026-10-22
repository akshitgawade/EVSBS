'use strict';
(async()=>{const origin=process.env.APP_ORIGIN||'http://localhost:3000';for(const route of ['/','/api/health','/api/modules']){const response=await fetch(origin+route);if(!response.ok)throw Error(`Smoke failed: ${route}`);console.log(`PASS ${route}`);}})().catch(()=>{console.error('Smoke failed; start the configured server first.');process.exitCode=1;});
