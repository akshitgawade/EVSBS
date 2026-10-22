'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
async function loadModules(app,root,context) {
  const records = [], registry = new Map();
  const entries = await fs.readdir(root,{withFileTypes:true}).catch(e => {if(e.code==='ENOENT') return []; throw e;});
  for (const dir of entries.filter(d=>d.isDirectory())) {
    const record = {id:dir.name,version:'unknown',state:'disabled'};
    records.push(record);
    try {
      const folder = path.join(root,dir.name);
      const manifest = JSON.parse(await fs.readFile(path.join(folder,'module.json'),'utf8'));
      if (!/^[a-z][a-z0-9-]*$/.test(manifest.id) || manifest.id!==dir.name || manifest.contractVersion!==1 || !/^\d+\.\d+\.\d+$/.test(manifest.version) || !Array.isArray(manifest.dependsOn) || !manifest.dependsOn.every(d=>typeof d==='string') || typeof manifest.enabled!=='boolean' || manifest.entry!=='index.js') throw Error('Invalid manifest');
      const realRoot = await fs.realpath(root), realFolder = await fs.realpath(folder);
      if (!realFolder.startsWith(realRoot+path.sep)) throw Error('Unsafe folder');
      Object.assign(record,{version:manifest.version,manifest,folder});
      if (!manifest.enabled) record.reason='Disabled by manifest';
    } catch { record.state='failed'; record.reason='Invalid or missing manifest'; }
  }
  let pending = records.filter(r=>r.manifest?.enabled);
  while (pending.length) {
    let progressed=false;
    for (const record of [...pending]) {
      const deps = record.manifest.dependsOn.map(id=>records.find(r=>r.id===id));
      if (deps.some(d=>!d || d.state==='failed' || (d.state==='disabled' && !pending.includes(d)))) {
        record.reason='Required dependency unavailable'; pending=pending.filter(r=>r!==record); progressed=true; continue;
      }
      if (!deps.every(d=>d.state==='active')) continue;
      progressed=true; pending=pending.filter(r=>r!==record);
      const staged = new Map(), router = express.Router();
      const services = {get:name=>staged.get(name)??registry.get(name),provide:(name,value)=>{if(!name.startsWith(record.id+'.') || staged.has(name) || registry.has(name)) throw Error('Invalid service registration'); staged.set(name,value);}};
      try {
        const entry=await fs.realpath(path.join(record.folder,'index.js'));
        if (!entry.startsWith((await fs.realpath(record.folder))+path.sep)) throw Error('Unsafe entry');
        const feature=require(entry);
        if(typeof feature.register!=='function') throw Error('Missing register');
        await feature.register({...context,services,router});
        for(const [key,value] of staged) registry.set(key,value);
        app.use(`/api/${record.id}`,router);
        app.use(`/modules/${record.id}`,express.static(path.join(record.folder,'ui'),{dotfiles:'deny'}));
        record.state='active';
      } catch {record.state='failed';record.reason='Module registration failed';}
    }
    if(!progressed){for(const r of pending){r.state='failed';r.reason='Dependency cycle';} break;}
  }
  return {records:records.map(({id,version,state,reason,manifest})=>({id,version,state,...(reason?{reason}:{}),...(state==='active'?{nav:{label:manifest.nav?.label||id,path:`/modules/${id}/`}}:{})})),services:{get:name=>registry.get(name)}};
}
module.exports={loadModules};
