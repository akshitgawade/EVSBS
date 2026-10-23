'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const files=[];function walk(dir){if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(p.endsWith('.test.js'))files.push(p);}}
walk('tests/core');walk('tests/modules');const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});process.exitCode=result.status??1;
