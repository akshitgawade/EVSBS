'use strict';
function testConfig(env){if(!env.MONGO_TEST_URI||!env.MONGO_TEST_DB)return null;if(!/^evsbs_test_[a-zA-Z0-9_]+$/.test(env.MONGO_TEST_DB)||env.MONGO_TEST_DB===(env.MONGO_DB||'evsbs_demo'))throw Error('Unsafe test database configuration. Use a separate evsbs_test_<suffix> database.');return{mongoUri:env.MONGO_TEST_URI,dbName:env.MONGO_TEST_DB};}
module.exports={testConfig};
