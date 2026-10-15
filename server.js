import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||3000),secret=process.env.APP_PASSWORD||'';
if(secret.length<16){console.error('Set APP_PASSWORD (minimum 16 characters)');process.exit(1)}
const type={'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const budget=Number(process.env.MONTHLY_AI_BUDGET_USD||5),usageFile=path.join(root,'.ai-usage.json');
const send=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
async function getUsage(){let data={month:'',spent:0};try{data=JSON.parse(await fs.readFile(usageFile,'utf8'))}catch{}return data.month===new Date().toISOString().slice(0,7)?data:{month:new Date().toISOString().slice(0,7),spent:0}}
let queue=Promise.resolve();
async function charge(amount){queue=queue.then(async()=>{const v=await getUsage();v.spent+=amount;await fs.writeFile(usageFile,JSON.stringify(v))});await queue}
function allowed(req){let auth=req.headers.authorization||'';if(!auth.startsWith('Basic '))return false;try{let decoded=Buffer.from(auth.slice(6),'base64').toString();let i=decoded.indexOf(':');if(i<0||decoded.slice(0,i)!==(process.env.APP_USERNAME||'platewise'))return false;const a=Buffer.from(decoded.slice(i+1)),b=Buffer.from(secret);return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}
async function body(req,limit=9000000){let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>limit)throw Error('File too large');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString())}
async function completion(messages){const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',response_format:{type:'json_object'},messages})});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'AI request failed');const u=data.usage||{};await charge(((u.prompt_tokens||0)*0.4+(u.completion_tokens||0)*1.6)/1000000);return JSON.parse(data.choices[0].message.content)}
const parsePrompt='Parse spoken or typed gym exercises into JSON object with keys exercise, sets, reps, weight, warning. Kilograms. Interpret "2 reps" as one set of two reps; "2 sets of 10 reps" as two sets. For missing numbers use 0 and explain warning. No invented values. One exercise per log.';
const server=http.createServer(async(req,res)=>{try{
if(!allowed(req)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Platewise"','Cache-Control':'no-store'});return res.end('Login required')}
if(req.url==='/api/status')return send(res,200,{configured:!!process.env.OPENAI_API_KEY,usage:await getUsage(),budget});
if(req.url?.startsWith('/api/')){
if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
if(!process.env.OPENAI_API_KEY)return send(res,503,{error:'Configure OPENAI_API_KEY in Render'});
if((await getUsage()).spent>=budget-0.1)return send(res,429,{error:'Estimated monthly AI allowance reached. Use manual logging.'});
if(req.url==='/api/photo'){const {image,mime,hint}=await body(req,12000000);if(!['image/jpeg','image/png','image/webp'].includes(mime)||!image||Buffer.byteLength(image,'base64')>8e6)throw Error('Choose JPG, PNG, or WebP under 8 MB');
const result=await completion([{role:'system',content:'Analyze meal photographs. Respond in JSON with mealName, items array of {name,calories,protein,carbs,fat}, assumptions, confidence. Calories in kcal, macros in grams. Portions estimated only. Account for cooking oil, coconut and sauces in Kerala meals. Do not pretend to know unseen ingredients.'},{role:'user',content:[{type:'text',text:'Estimate food nutrition. Portion notes: '+String(hint||'').slice(0,300)},{type:'image_url',image_url:{url:'data:'+mime+';base64,'+image,detail:'low'}}]}]);return send(res,200,result)}
if(req.url==='/api/parse'){const {text}=await body(req,20000);const result=await completion([{role:'system',content:parsePrompt},{role:'user',content:String(text||'').slice(0,500)}]);return send(res,200,{...result,transcript:text})}
if(req.url==='/api/voice'){const {audio,mime}=await body(req,11000000);const format=/mp4|m4a/.test(mime)?'m4a':/webm/.test(mime)?'webm':null;if(!format||!audio||Buffer.byteLength(audio,'base64')>7e6)throw Error('Unsupported recording');const f=new FormData();f.append('model','whisper-1');f.append('file',new Blob([Buffer.from(audio,'base64')],{type:format==='m4a'?'audio/mp4':'audio/webm'}),'set.'+format);const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:f});const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Transcription failed');await charge(.006);const p=await completion([{role:'system',content:parsePrompt},{role:'user',content:String(v.text||'').slice(0,500)}]);return send(res,200,{...p,transcript:v.text})}
return send(res,404,{error:'Unknown API'})}
if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
let requested=decodeURIComponent(req.url.split('?')[0]);if(requested==='/')requested='/index.html';const base=path.join(root,'public'),file=path.resolve(base,'.'+requested);if(!file.startsWith(base+path.sep))return send(res,403,{error:'Forbidden'});const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':type[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes)
}catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.message||'Request failed'})}});
server.listen(port,()=>console.log('Platewise on port '+port));
