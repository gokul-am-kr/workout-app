import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
test('3D assets and local library imports are served behind sign-in',async()=>{
  const password=randomBytes(24).toString('hex'),port=41000+Math.floor(Math.random()*10000);
  const child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,APP_USERNAME:'asset-test',APP_PASSWORD:password,OPENAI_API_KEY:'',PORT:String(port)},stdio:['ignore','pipe','pipe']});
  try{
    await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)))});
    const base='http://127.0.0.1:'+port;
    const blocked=await fetch(base+'/vendor/three.module.js',{redirect:'manual'});assert.equal(blocked.status,302);
    const headers={Authorization:'Basic '+Buffer.from('asset-test:'+password).toString('base64')};
    for(const file of ['/body3d.js','/muscles.js','/body3d.css','/vendor/three.module.js','/vendor/three.core.js']){const r=await fetch(base+file,{headers});assert.equal(r.status,200,file);assert.match(r.headers.get('content-type'),file.endsWith('.css')?/text\/css/:/text\/javascript/);assert.ok((await r.text()).length>0)}
    const html=await (await fetch(base,{headers})).text();assert.match(html,/body3d\.css/);assert.match(html,/type="module" src="\/body3d.js"/);
    assert.equal((await fetch(base+'/vendor/package.json',{headers})).status,404);
  }finally{child.kill()}
});
