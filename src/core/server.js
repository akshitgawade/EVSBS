'use strict';
const {configFromEnv}=require('./config');
const {connect}=require('./db');
const {createApp}=require('./app');
async function main(){const config=configFromEnv();const connection=await connect(config);const {app,records}=await createApp({...connection,config});const server=app.listen(config.port,()=>console.log(`EVSBS listening on port ${config.port}; ${records.filter(r=>r.state==='active').length} active modules.`));for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(async()=>{await connection.client.close();process.exit(0);}));}
main().catch(()=>{console.error('Startup failed. Check required environment, database access and module configuration. No credentials are logged.');process.exitCode=1;});
