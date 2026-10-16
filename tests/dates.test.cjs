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
 run(fs.readFileSync(path.join(root,'public/muscles.js'),'utf8'));run(fs.readFileSync(path.join(root,'public/app.js'),'utf8'));sandbox.show=window.show;
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
 run("selectDate('2024-02-29');workoutForm({exercise:'Squat',sets:2,reps:10,weight:40})");$('workoutresult').querySelector('.workout-save').onclick();assert.equal(read().sets[0].date,'2024-02-29');assert.equal($('setsToday').textContent,'2');
 for(const tab of ['home','food','workout','wellness','progress']){window.show(tab);assert.equal($(tab).hidden,false);assert.equal($('logDate').value,'2024-02-29')}
});
test('different weights/reps per set persist with per-side basis and can be edited',()=>{
 const {run,$,read,window}=setup();
 run("selectDate('2024-02-29');workoutForm({exercise:'Incline chest press',sets:3,weightMode:'per_side',setDetails:[{weight:20,reps:15},{weight:25,reps:10},{weight:25,reps:8}]})");
 $('workoutresult').querySelector('.workout-save').onclick();
 const saved=read().sets[0];assert.equal(saved.weightMode,'per_side');assert.equal(saved.sets,3);assert.deepEqual(saved.setDetails,[{weight:20,reps:15},{weight:25,reps:10},{weight:25,reps:8}]);
 assert.equal($('setsToday').textContent,'3');assert.match($('feed').textContent,/20 kg per side × 15 reps/);assert.match($('feed').textContent,/25 kg per side × 10 reps/);
 window.document.querySelector('.edit-workout').onclick();const rows=$('workoutresult').querySelectorAll('.set-editor-row');rows[1].querySelector('input').value='27.5';$('workoutresult').querySelector('.workout-save').onclick();
 assert.equal(read().sets.length,1);assert.equal(read().sets[0].setDetails[1].weight,27.5);assert.equal(read().sets[0].setDetails[0].weight,20);
});
test('missing third set is blank and must be entered rather than guessed',()=>{
 const {run,$,read}=setup();
 run("workoutForm({exercise:'Incline chest press',sets:3,weightMode:'per_side',setDetails:[{weight:20,reps:15},{weight:25,reps:10}]})");
 const rows=$('workoutresult').querySelectorAll('.set-editor-row');assert.equal(rows.length,3);assert.equal(rows[2].querySelector('input').value,'');
 $('workoutresult').querySelector('.workout-save').onclick();assert.equal(read().sets.length,0);
 const inputs=rows[2].querySelectorAll('input');inputs[0].value='25';inputs[1].value='8';$('workoutresult').querySelector('.workout-save').onclick();assert.equal(read().sets[0].setDetails[2].reps,8);
});
test('manual set rows support adding/removing and validate weights and reps',()=>{
 const {run,$,read}=setup();$('manualWorkout').onclick();
 const host=$('workoutresult');host.querySelector('input').value='Push up';
 host.querySelector('.add-set').onclick();assert.equal(host.querySelectorAll('.set-editor-row').length,2);
 host.querySelector('.remove-set').onclick();assert.equal(host.querySelectorAll('.set-editor-row').length,1);assert.equal(host.querySelector('.remove-set').disabled,true);
 const inputs=host.querySelector('.set-editor-row').querySelectorAll('input');
 inputs[0].value='-1';inputs[1].value='10';host.querySelector('.workout-save').onclick();assert.equal(read().sets.length,0);
 inputs[0].value='0';inputs[1].value='1.5';host.querySelector('.workout-save').onclick();assert.equal(read().sets.length,0);
 inputs[1].value='15';host.querySelector('.workout-save').onclick();assert.equal(read().sets[0].setDetails[0].weight,0);assert.equal(read().sets[0].sets,1);
});
test('old uniform workout logs still render and contribute correct set count',()=>{
 const {run,$}=setup();run("db.sets.push({date:logDate(),exercise:'Bench press',sets:3,reps:10,weight:60});render()");
 assert.equal($('setsToday').textContent,'3');assert.equal($('feed').querySelectorAll('.logged-sets li').length,3);assert.match($('feed').textContent,/60 kg × 10 reps/);
});
test('workout parsing retains selected date while response is pending',async()=>{
 const t=setup(),{run,$}=t;Object.assign(t.sample,{exercise:'Incline chest press',sets:2,weightMode:'per_side',setDetails:[{weight:20,reps:15},{weight:25,reps:10}]});
 run("selectDate('2024-02-29')");$('transcript').value='Incline chest press 20 kg per side 15 reps then 25 kg 10 reps';const task=$('parse').onclick();run("selectDate('2024-03-01')");t.resolve();await task;
 $('workoutresult').querySelector('.workout-save').onclick();assert.equal(t.read().sets[0].date,'2024-02-29');assert.equal($('logDate').value,'2024-02-29');assert.equal(t.read().sets[0].setDetails[1].weight,25);
});
test('Train screen shows prior-session rows and ignores same-day/future history',()=>{
 const {run,$}=setup();
 run("selectDate('2024-03-03');db.sets=[{date:'2024-03-04',exercise:'Incline chest press',sets:1,weight:99,reps:99},{date:'2024-02-29',exercise:'Incline chest press',sets:1,weight:15,reps:15},{date:'2024-03-01',exercise:'incline chest press',sets:1,weightMode:'total',weight:18,reps:12},{date:'2024-03-03',exercise:'Incline chest press',sets:1,weightMode:'per_side',setDetails:[{weight:20,reps:15}]}];render()");
 assert.equal($('trainingExercises').textContent,'1');assert.equal($('trainingSets').textContent,'1');
 const card=$('trainingExercisesList').querySelector('article');assert.match(card.textContent,/18 × 12/);assert.doesNotMatch(card.textContent,/99/);assert.match(card.textContent,/total weight/);assert.match(card.textContent,/Kg \/ side/);
 assert.equal($('recentExercises').querySelectorAll('button').length,1);
});
test('repeat and use-last-sets actions require review and preserve historical data',()=>{
 const {run,$,read}=setup();
 run("selectDate('2024-03-03');db.sets=[{date:'2024-03-01',exercise:'Chest press',sets:2,weightMode:'per_side',setDetails:[{weight:20,reps:15},{weight:25,reps:10}]}];save()");
 $('recentExercises').querySelector('button').onclick();assert.equal(read().sets.length,1);assert.equal($('workoutresult').querySelectorAll('.set-editor-row').length,2);
 $('workoutresult').querySelector('.workout-cancel').onclick();assert.equal(read().sets.length,1);
 $('manualWorkout').onclick();const name=$('workoutresult').querySelector('input');name.value='Chest press';name.onchange();
 const panel=$('workoutresult').querySelector('.previous-session');assert.equal(panel.hidden,false);panel.querySelector('button').onclick();assert.equal($('workoutresult').querySelectorAll('.set-editor-row').length,2);
 $('workoutresult').querySelector('.workout-save').onclick();const data=read();assert.equal(data.sets.length,2);assert.equal(data.sets[0].date,'2024-03-01');assert.equal(data.sets[1].date,'2024-03-03');assert.equal(data.sets[1].setDetails[1].weight,25);assert.equal(data.sets[1].weightMode,'per_side');
});
test('card Add set opens editor without mutating saved workout until confirmation',()=>{
 const {run,$,read}=setup();run("db.sets=[{date:logDate(),exercise:'Squat',sets:1,reps:10,weight:40}];save()");
 $('trainingExercisesList').querySelector('.training-add-set').onclick();assert.equal($('workoutresult').querySelectorAll('.set-editor-row').length,2);assert.equal(read().sets[0].sets,1);
 $('workoutresult').querySelector('.workout-cancel').onclick();assert.equal($('workoutresult').textContent,'');assert.equal(read().sets[0].sets,1);
 $('openQuickLog').onclick();assert.equal($('quickWorkoutLog').open,true);
});
test('weekly body updates with selected date and user-corrected muscle mappings',()=>{
 const {run,$,read}=setup();run("db.sets=[{date:'2024-03-01',exercise:'Custom exercise',sets:3,reps:10,weight:20}];selectDate('2024-03-01')");
 assert.match($('muscleUnknown').textContent,/Custom exercise/);assert.equal($('muscleCoverage').textContent,'0 / 11 groups');
 const chest=$('muscleMappingChoices').querySelector('input[value=chest]');chest.checked=true;$('saveMuscleMapping').onclick();assert.equal(read().muscleOverrides['custom exercise'][0],'chest');assert.equal($('muscleCoverage').textContent,'1 / 11 groups');
 run("selectMuscle('chest')");assert.match($('muscleSelection').textContent,/3 sets involving this muscle/);
 run("selectDate('2024-03-08')");assert.equal($('muscleCoverage').textContent,'0 / 11 groups');
});
