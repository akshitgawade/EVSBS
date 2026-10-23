'use strict';
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const name=process.argv[2];if(!/^[a-z]+$/.test(name||''))throw Error('Provide a module name');
const dir=path.join('tests','modules',name);const files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.js')).map(f=>path.join(dir,f));
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});process.exitCode=result.status??1;
