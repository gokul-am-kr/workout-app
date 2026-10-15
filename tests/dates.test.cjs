const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const root=path.join(__dirname,'..');
function setup(){
 const {window}=parseHTML(fs.readFileSync(path.join(root,'public/index.html'),'utf8'));
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||''},set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.value===v)}});
 let stored=JSON.stringify({day:'gymrun',meals:[{date:'2024-02-29',name:'Old lunch',calories:600,protein:30}],sets:[],measurements:[]});
 const sample={mealName:'Chicken and rice',items:[{name:'Chicken and rice',calories:700,protein:45}],foodQuality:{status:'balanced'}};
 let pendingResolve;
 const sandbox={window,document:window.document,Date,console,setTimeout:()=>0,Blob,URL,
 localStorage:{getItem:()=>stored,setItem:(key,value)=>{assert.equal(key,'pulse-data');stored=value}},
 navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}},
 File:class{},FileReader:class{readAsDataURL(){this.result='data:audio/mp4;base64,YQ==';this.onload()}},
 fetch:async()=>new Promise(resolve=>{pendingResolve=()=>resolve({ok:true,json:async()=>sample})})};
 sandbox.MediaRecorder=class{static isTypeSupported(){return true}constructor(){sandbox.recorder=this;this.state='inactive'}start(){this.state='recording'}stop(){this.state='inactive';this.onstop()}};
 window.scrollTo=()=>{};vm.createContext(sandbox);
 const run=code=>vm.runInContext(code,sandbox);
 run(fs.readFileSync(path.join(root,'public/app.js'),'utf8'));sandbox.show=window.show;
 return {run,$:id=>window.document.getElementById(id),window,sandbox,read:()=>JSON.parse(stored),resolve:()=>pendingResolve(),sample};
}
test('date navigation, local calendar dates, legacy data and independent daily goals',()=>{
 const {run,$}=setup();const today=run('now()');assert.equal($('logDate').value,today);assert.equal($('logDate').max,today);
 run("selectDate('2024-03-01')");$('previousDay').onclick();assert.equal($('logDate').value,'2024-02-29');assert.equal($('cal').textContent,'600');assert.equal($('prot').textContent,'30g');
 $('daytype').onchange({target:{value:'rest'}});assert.equal($('calTarget').textContent,'2,250');
 $('nextDay').onclick();assert.equal($('cal').textContent,'0');assert.equal($('calTarget').textContent,'2,550');
 run("selectDate('2024-02-30')");assert.equal($('logDate').value,'2024-03-01');
 run("selectDate('2999-01-01')");assert.equal($('logDate').value,'2024-03-01');
 $('todayShortcut').onclick();assert.equal($('logDate').value,today);assert.equal($('nextDay').disabled,true);
 $('yesterdayShortcut').onclick();assert.notEqual($('logDate').value,today);$('nextDay').onclick();assert.equal($('logDate').value,today);
});
test('review and edit meal dates, invalid dates rejected, today remains unchanged',()=>{
 const t=setup(),{run,$,read,window}=t;
 run("selectDate('2024-02-29')");t.sandbox.sample=t.sample;run("foodReview(sample,$('foodVoiceResult'))");
 const host=$('foodVoiceResult');assert.equal(host.querySelector('input[type=date]').value,'2024-02-29');
 host.querySelector('input[type=date]').value='2999-01-01';host.querySelector('button').onclick();assert.equal(read().meals.length,1);
 host.querySelector('input[type=date]').value='2024-02-29';host.querySelector('button').onclick();assert.equal(read().meals.length,2);assert.equal($('cal').textContent,'1,300');assert.equal($('prot').textContent,'75g');
 window.document.querySelector('.edit-meal').onclick();const editor=window.document.querySelector('.meal-editor');editor.querySelector('input[type=date]').value='2024-02-28';editor.querySelector('.save-edit').onclick();assert.equal(read().meals.at(-1).date,'2024-02-28');assert.equal($('cal').textContent,'700');
 run("selectDate('2024-02-29')");assert.equal($('cal').textContent,'600');$('todayShortcut').onclick();assert.equal($('cal').textContent,'0');
});
test('text/photo/voice retain starting date across asynchronous analysis',async()=>{
 for(const kind of ['text','photo','voice']){
  const t=setup(),{run,$}=t;run("selectDate('2024-02-29')");let task;
  if(kind==='text'){$('foodDescription').value='Chicken and rice';task=$('foodParse').onclick()}
  if(kind==='photo'){$('photo').files=[{type:'image/jpeg'}];task=$('analyze').onclick();await Promise.resolve();await Promise.resolve()}
  if(kind==='voice'){await $('foodRecord').onclick();task=t.sandbox.recorder.onstop();await Promise.resolve();await Promise.resolve()}
  run("selectDate('2024-03-01')");t.resolve();await task;
  const host=$(kind==='photo'?'foodresult':'foodVoiceResult');assert.equal(host.querySelector('input[type=date]').value,'2024-02-29',kind);host.querySelector('button').onclick();assert.equal(t.read().meals.at(-1).date,'2024-02-29',kind);assert.equal($('cal').textContent,'1,300',kind);
 }
});
test('selected-day wellness and workout entries stay isolated',()=>{
 const {run,$,read,window}=setup();run("selectDate('2024-02-29')");$('quickWater').onclick();assert.equal($('waterValue').textContent,'250 ml');
 run("selectDate('2024-03-01')");assert.equal($('waterValue').textContent,'0 ml');
 run("selectDate('2024-02-29');workoutForm({exercise:'Squat',sets:2,reps:10,weight:40})");$('workoutresult').querySelector('button').onclick();assert.equal(read().sets[0].date,'2024-02-29');assert.equal($('setsToday').textContent,'2');
 for(const tab of ['home','food','workout','wellness','progress']){window.show(tab);assert.equal($(tab).hidden,false);assert.equal($('logDate').value,'2024-02-29')}
});
