const $=id=>document.getElementById(id);
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const now=()=>localDate(new Date());
let selectedDate=null;
const logDate=()=>selectedDate||now();
function validLogDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00');return Number.isFinite(d.getTime())&&localDate(d)===value&&value<=now()}
function selectDate(value){if(!validLogDate(value)){notify('Choose today or a previous date');renderDate();return}selectedDate=value===now()?null:value;render()}
function dateLabel(value){return new Date(value+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}
function shiftDate(offset){const d=new Date(logDate()+'T12:00:00');d.setDate(d.getDate()+offset);selectDate(localDate(d))}
function renderDate(){const date=logDate();$('logDate').value=date;$('logDate').max=now();$('nextDay').disabled=date>=now();$('dateContext').textContent=date===now()?'Logging today':`Viewing & logging ${dateLabel(date)}`;$('journalTitle').textContent=date===now()?'Today’s journal':`Journal · ${dateLabel(date)}`;$('home').setAttribute('aria-label',`Daily summary for ${dateLabel(date)}`)}
const load=()=>{try{return JSON.parse(localStorage.getItem('pulse-data'))||{meals:[],sets:[],measurements:[],day:'gymrun'}}catch{return {meals:[],sets:[],measurements:[],day:'gymrun'}}};
let db=load(),pending=null,mediaRecorder=null,chunks=[];
const save=()=>{localStorage.setItem('pulse-data',JSON.stringify(db));render()};
const notify=(s)=>{$('notice').textContent=s;setTimeout(()=>{$('notice').textContent=''},6500)};
window.show=function(tab){for(const s of document.querySelectorAll('main>section'))s.hidden=s.id!==tab;for(const b of document.querySelectorAll('nav button')){b.classList.toggle('active',b.dataset.tab===tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}document.querySelector('nav').style.setProperty('--tab-index',[...document.querySelectorAll('nav button')].findIndex(b=>b.dataset.tab===tab));window.scrollTo({top:0,behavior:'instant'})};
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
$('logDate').onchange=e=>selectDate(e.target.value);
$('previousDay').onclick=()=>shiftDate(-1);
$('nextDay').onclick=()=>shiftDate(1);
$('todayShortcut').onclick=()=>selectDate(now());
$('yesterdayShortcut').onclick=()=>{const d=new Date();d.setDate(d.getDate()-1);selectDate(localDate(d))};
$('daytype').onchange=e=>{db.dayTypes??={};db.dayTypes[logDate()]=e.target.value;save()};
const target={gymrun:2550,gym:2350,rest:2250};
function meter(id,fill,value,max){const safe=Math.max(0,Number(value)||0);$(fill).style.width=Math.min(100,safe/max*100)+'%';$(id).setAttribute('aria-valuemax',max);$(id).setAttribute('aria-valuenow',Math.min(max,safe));$(id).setAttribute('aria-valuetext',Math.round(safe)+' of '+max)}
const row=(label,val)=>{const d=document.createElement('div');d.className='line';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=val;d.append(a,b);return d};
function render(){renderDate();const dayType=db.dayTypes?.[logDate()]||db.day||'gymrun';$('daytype').value=dayType;const meals=db.meals.filter(x=>x.date===logDate()),sets=db.sets.filter(x=>x.date===logDate());const cal=meals.reduce((v,m)=>v+Number(m.calories||0),0),protein=meals.reduce((v,m)=>v+Number(m.protein||0),0),total=target[dayType]||target.gymrun;$('cal').textContent=Math.round(cal).toLocaleString();$('prot').textContent=Math.round(protein)+'g';$('remaining').textContent=Math.abs(Math.round(total-cal)).toLocaleString();$('balanceLabel').textContent=cal>total?'Above daily goal':cal===total?'Daily goal reached':logDate()===now()?'Remaining today':'Remaining for this day';$('balanceUnit').textContent=cal>total?'kcal above your goal':cal===total?'kcal remaining':'kcal to your goal';$('energyArc').setAttribute('stroke-dasharray',Math.min(100,Math.max(0,cal/total*100))+' 100');$('energyArc').style.opacity=cal>0?'1':'0';$('calTarget').textContent=total.toLocaleString();meter('calProgress','calFill',cal,total);meter('proteinProgress','proteinFill',protein,125);$('todayDate').textContent=new Date(logDate()+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});$('setsToday').textContent=sets.reduce((sum,s)=>sum+(Array.isArray(s.setDetails)?s.setDetails.length:Number(s.sets||0)),0);meter('setsProgress','setsFill',Number($('setsToday').textContent),12);
$('proteinRemaining').textContent=Math.max(0,Math.round(125-protein));$('proteinRemainingLabel').textContent=protein>=125?'g left · done':'g left';$('proteinStatus').textContent=protein>=125?'Goal met':Math.round(protein/125*100)+'%';const setCount=Number($('setsToday').textContent);$('setsRemaining').textContent=Math.max(0,12-setCount);$('setsRemainingLabel').textContent=setCount>=12?'left · done':'sets left';$('trainingStatus').textContent=setCount>=12?'Goal met':Math.round(setCount/12*100)+'%';
renderFeed(meals,sets);renderTraining();const h=$('history');h.replaceChildren();for(const v of [...db.measurements].reverse().slice(0,14))h.append(row(v.date,v.weight+' kg · '+v.waist+' cm'));renderWellness()}

function qualityMeta(status){return {balanced:['Balanced','#b9d5b0','balanced'],mindful:['Be mindful','#edb86f','mindful'],uncertain:['Not assessed','#b9b0df','uncertain']}[status]||['Not assessed','#b9b0df','uncertain']}
function mealCard(m){const card=document.createElement('article');card.className='meal-card';const top=document.createElement('div');top.className='meal-top';const left=document.createElement('div');left.className='meal-info';const title=document.createElement('strong');title.className='meal-title';title.textContent=m.name||'Meal';const sub=document.createElement('p');sub.className='meal-sub';sub.textContent=Math.round(m.calories||0)+' kcal  ·  '+Math.round(m.protein||0)+'g protein';left.append(title,sub);const edit=document.createElement('button');edit.className='edit-meal';edit.textContent='Edit';edit.setAttribute('aria-label','Edit '+(m.name||'meal'));edit.onclick=()=>editMeal(m,card);top.append(left,edit);card.append(top);const [label,color,cls]=qualityMeta(m.quality?.status);const badge=document.createElement('span');badge.className='meal-badge '+cls;badge.textContent='● '+label;badge.style.color=color;card.append(badge);if(m.quality?.reason){const note=document.createElement('p');note.className='meal-note';note.textContent=m.quality.reason;card.append(note)}return card}
function editMeal(m,card){const form=document.createElement('div');form.className='meal-editor';const title=document.createElement('strong');title.textContent='Edit meal';form.append(title);const fields=[makeField('Meal name',m.name||''),makeField('Calories',m.calories||0,'number'),makeField('Protein (g)',m.protein||0,'number')];fields.forEach(f=>form.append(f.wrap));const date=makeField('Meal date',m.date,'date');date.input.max=now();date.input.required=true;form.append(date.wrap);const label=document.createElement('label');label.textContent='Nutrition assessment';const select=document.createElement('select');for(const [value,name] of [['balanced','Balanced'],['mindful','Be mindful'],['uncertain','Not assessed']]){const op=document.createElement('option');op.value=value;op.textContent=name;select.append(op)}select.id='review-'+(++fieldSequence);label.htmlFor=select.id;select.value=m.quality?.status||'uncertain';form.append(label,select);const actions=document.createElement('div');actions.className='editor-actions';const saveButton=document.createElement('button');saveButton.textContent='Save changes';saveButton.className='save-edit';saveButton.onclick=()=>{const [name,cal,protein]=fields.map(x=>x.input.value);if(!name.trim()||!Number.isFinite(+cal)||!Number.isFinite(+protein)||+cal<0||+protein<0){notify('Enter valid meal details');return}if(!validLogDate(date.input.value)){notify('Choose a valid meal date, today or earlier');return}m.date=date.input.value;selectedDate=m.date===now()?null:m.date;m.name=name.trim();m.calories=+cal;m.protein=+protein;m.quality={...(m.quality||{}),status:select.value};save();notify('Meal updated')};const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>render();actions.append(saveButton,cancel);form.append(actions);card.replaceChildren(form)}
function renderFeed(meals,sets){const feed=$('feed');feed.replaceChildren();if(!meals.length&&!sets.length){feed.className='feed-empty';feed.textContent='No entries for '+dateLabel(logDate())+'. Add a meal or workout for this day.';return}feed.className='meal-feed';const ordered=[...meals].reverse();for(const m of ordered)feed.append(mealCard(m));if(sets.length){const hd=document.createElement('h3');hd.className='feed-heading';hd.textContent='Workout activity';feed.append(hd);for(const x of [...sets].reverse()){feed.append(workoutCard(x))}}}

function totals(items){return ['calories','protein','carbs','fat'].reduce((a,k)=>(a[k]=items.reduce((n,it)=>n+Math.max(0,Number(it[k])||0),0),a),{})}
async function call(endpoint,data){const r=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const x=await r.json();if(!r.ok)throw Error(x.error||'Request failed');return x}
function fileB64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)})}
function button(label,fn){const b=document.createElement('button');b.className='primary';b.textContent=label;b.onclick=fn;return b}
let fieldSequence=0;
function makeField(label,value,type='text'){const wrap=document.createElement('div'),l=document.createElement('label'),i=document.createElement('input');l.textContent=label;i.id='review-'+(++fieldSequence);l.htmlFor=i.id;i.type=type;i.value=value??'';wrap.append(l,i);return {wrap,input:i}}
$('analyze').onclick=async()=>{const f=$('photo').files[0];if(!f)return notify('Choose a food photo first');const mealDate=logDate(),b=$('analyze');b.disabled=true;b.textContent='Analyzing…';try{const data=await call('photo',{image:await fileB64(f),mime:f.type,hint:$('hint').value});foodReview(data,$('foodresult'),mealDate)}catch(e){notify(e.message)}finally{b.disabled=false;b.textContent='Analyze meal'}};

function foodQualityCard(data,host){const q=data.foodQuality||{};const states={balanced:['Balanced choice','#b9d5b0'],mindful:['Worth a look','#edb86f'],uncertain:['Needs more detail','#b9b0df']};const [label,color]=states[q.status]||states.uncertain;const box=document.createElement('div');box.className='quality-card';const head=document.createElement('strong');head.textContent='● '+label;head.style.color=color;box.append(head);for(const [prefix,value] of [['',q.reason],['Good: ',q.positive],['Consider: ',q.watchOut],['Try: ',q.suggestion]]){if(typeof value!=='string'||!value.trim())continue;const p=document.createElement('p');p.className='small muted';p.style.margin='9px 0 0';p.textContent=prefix+value;box.append(p)}if(!q.reason){const p=document.createElement('p');p.className='small muted';p.textContent='Food quality could not be assessed confidently. Ingredients, portions and preparation matter.';box.append(p)}host.append(box)}
function foodReview(data,host,mealDate=logDate()){host.replaceChildren();const items=Array.isArray(data.items)?data.items:[];if(!items.length){notify('Could not identify food; add more details');return}const macro=totals(items);const heading=document.createElement('p');heading.className='muted small';heading.textContent=data.transcript?'Heard: '+data.transcript:'';host.append(heading);for(const it of items)host.append(row(it.name||'Food',Math.round(Number(it.calories)||0)+' kcal'));foodQualityCard(data,host);const name=makeField('Meal name',data.mealName||'Meal'),cal=makeField('Calories (editable)',Math.round(macro.calories),'number'),protein=makeField('Protein g (editable)',Math.round(macro.protein),'number');const date=makeField('Meal date',mealDate,'date');date.input.max=now();date.input.required=true;host.append(date.wrap,name.wrap,cal.wrap,protein.wrap);const note=document.createElement('p');note.className='muted small';note.textContent='Estimate only. '+(typeof data.assumptions==='string'?data.assumptions:'Confirm portions, oils, and quantities before saving.');host.append(note);host.append(button('Confirm and add meal',()=>{if(!validLogDate(date.input.value))return notify('Choose a valid meal date, today or earlier');if(!name.input.value.trim()||!Number.isFinite(+cal.input.value)||!Number.isFinite(+protein.input.value)||+cal.input.value<0||+protein.input.value<0)return notify('Enter valid meal details');db.meals.push({date:date.input.value,name:name.input.value,calories:+cal.input.value,protein:+protein.input.value,quality:data.foodQuality||{status:'uncertain'}});selectedDate=date.input.value===now()?null:date.input.value;save();host.replaceChildren();notify('Meal saved for '+dateLabel(date.input.value))}))}
$('foodParse').onclick=async()=>{const text=$('foodDescription').value.trim();if(!text)return notify('Describe your food first');const mealDate=logDate(),buttonEl=$('foodParse');buttonEl.disabled=true;try{foodReview(await call('food-text',{text}),$('foodVoiceResult'),mealDate)}catch(e){notify(e.message)}finally{buttonEl.disabled=false}};
let foodRecorder=null,foodStream=null,foodChunks=[];
$('foodRecord').onclick=async()=>{const btn=$('foodRecord');if(foodRecorder&&foodRecorder.state==='recording'){foodRecorder.stop();btn.textContent='● Start voice logging';return}const mealDate=logDate();try{foodStream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw Error('Recording not supported in this browser');foodChunks=[];foodRecorder=new MediaRecorder(foodStream,{mimeType:mime});foodRecorder.ondataavailable=e=>{if(e.data.size)foodChunks.push(e.data)};foodRecorder.onstop=async()=>{foodStream.getTracks().forEach(t=>t.stop());$('foodRecordStatus').textContent='Transcribing and estimating food…';try{const f=new File(foodChunks,'meal',{type:mime});const result=await call('food-voice',{audio:await fileB64(f),mime});$('foodDescription').value=result.transcript||'';foodReview(result,$('foodVoiceResult'),mealDate);$('foodRecordStatus').textContent='Review your meal before saving'}catch(e){notify(e.message);$('foodRecordStatus').textContent='Could not analyze; try text entry'}};foodRecorder.start();btn.textContent='■ Stop & analyze';$('foodRecordStatus').textContent='Recording your meal…'}catch(e){notify(e.message)}};

const exerciseKey=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function previousExercise(name,date=logDate()){
  return [...db.sets].reverse().filter(x=>x.date<date&&exerciseKey(x.exercise)===exerciseKey(name)).sort((a,b)=>b.date.localeCompare(a.date))[0];
}
function weightBasis(mode){return mode==='per_side'?'per side':mode==='total'?'total weight':'as entered'}
let selectedMuscle=null;
function selectMuscle(group){selectedMuscle=group;renderWeeklyMuscles()}
function drawMuscleMapping(){
  const host=$('muscleMappingChoices');host.replaceChildren();const name=$('mappingExercise').value;
  const mapped=window.WorkoutMuscles.infer(name,db.muscleOverrides||{});
  for(const [key,label] of Object.entries(window.WorkoutMuscles.groups)){
    const row=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=mapped.includes(key);row.append(input,document.createTextNode(label));host.append(row);
  }
  $('saveMuscleMapping').disabled=!name;$('resetMuscleMapping').disabled=!name;
}
$('mappingExercise').onchange=drawMuscleMapping;
$('saveMuscleMapping').onclick=()=>{const name=$('mappingExercise').value;if(!name)return;db.muscleOverrides??={};db.muscleOverrides[window.WorkoutMuscles.key(name)]=[...$('muscleMappingChoices').querySelectorAll('input')].filter(x=>x.checked).map(x=>x.value);save();notify('Muscle mapping updated')};
$('resetMuscleMapping').onclick=()=>{const name=$('mappingExercise').value;if(!name)return;delete (db.muscleOverrides||{})[window.WorkoutMuscles.key(name)];save();notify('Automatic muscle mapping restored')};
function renderWeeklyMuscles(){
  const data=window.WorkoutMuscles.summarize(db.sets,logDate(),db.muscleOverrides||{});
  window.weeklyBodyState={...data,selected:selectedMuscle};
  $('muscleWeekRange').textContent=dateLabel(data.start)+' – '+dateLabel(data.end);
  $('muscleCoverage').textContent=data.covered+' / '+Object.keys(data.counts).length+' groups';
  $('muscleWeekTotals').textContent=data.totalSets+' logged sets · '+data.days+' training days';
  const list=$('muscleGroupButtons');list.replaceChildren();
  for(const [key,label] of [[null,'All muscles'],...Object.entries(window.WorkoutMuscles.groups)]){
    const b=document.createElement('button');b.textContent=label+(key?' · '+data.counts[key]:'');b.setAttribute('aria-pressed',String(key===selectedMuscle));b.className=key&&data.counts[key]?'muscle-chip trained':'muscle-chip';b.onclick=()=>selectMuscle(key);list.append(b);
  }
  const info=$('muscleSelection');info.replaceChildren();const title=document.createElement('strong');title.textContent=selectedMuscle?window.WorkoutMuscles.groups[selectedMuscle]+' · '+data.counts[selectedMuscle]+' sets involving this muscle':data.totalSets?'Your week, in motion':'No workouts logged in this period';info.append(title);
  const text=document.createElement('p');text.textContent=selectedMuscle?(data.sources[selectedMuscle].map(x=>x.exercise+' ('+x.sets+' sets, '+dateLabel(x.date)+')').join(' · ')||'No mapped sets recorded for this muscle in this period.'):'Tap a body region or muscle name to see the exercises behind it.';info.append(text);
  $('muscleUnknown').textContent=data.unknown.length?'Not mapped: '+[...new Set(data.unknown.map(x=>x.exercise))].join(', ')+'. Use Adjust muscle mapping below.':'';
  const max=Math.max(1,...Object.values(data.counts));
  for(const part of document.querySelectorAll('#bodyFallback [data-muscle]')){const key=part.dataset.muscle;part.style.fill=data.counts[key]?'#edb86f':'#59614f';part.style.opacity=data.counts[key]?String(.45+.55*data.counts[key]/max):'.35';part.style.filter=selectedMuscle===key?'drop-shadow(0 0 5px #ffe4b6)':'none'}
  const select=$('mappingExercise'),previous=select.value;select.replaceChildren();
  for(const name of [...new Set(db.sets.filter(x=>x.date>=data.start&&x.date<=data.end).map(x=>x.exercise))]){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option)}
  if([...select.querySelectorAll('option')].some(x=>x.value===previous))select.value=previous;drawMuscleMapping();
  window.dispatchEvent(new window.CustomEvent('weekly-muscles',{detail:window.weeklyBodyState}));
}
window.addEventListener('muscle-pick',e=>selectMuscle(e.detail));
function renderTraining(){
  renderWeeklyMuscles();
  const entries=db.sets.filter(x=>x.date===logDate());
  $('trainingDate').textContent=logDate()===now()?'Today’s training':dateLabel(logDate());
  $('trainingExercises').textContent=entries.length;
  $('trainingSets').textContent=entries.reduce((n,x)=>n+workoutSetRows(x).length,0);
  const host=$('trainingExercisesList');host.replaceChildren();
  if(!entries.length){const empty=document.createElement('div');empty.className='training-empty';const title=document.createElement('strong');title.textContent='Your next set starts here.';const copy=document.createElement('p');copy.textContent='Add an exercise, log each set, and keep your previous numbers in view.';empty.append(title,copy);host.append(empty)}
  for(const [i,x] of entries.entries())host.append(trainingCard(x,i+1));
  const recent=$('recentExercises');recent.replaceChildren();
  const seen=new Set();
  for(const x of [...db.sets].reverse().filter(x=>x.date<logDate()).sort((a,b)=>b.date.localeCompare(a.date))){
    const key=exerciseKey(x.exercise);if(!key||seen.has(key))continue;seen.add(key);if(seen.size>4)break;
    const b=document.createElement('button');b.className='repeat-exercise';b.textContent='+ '+x.exercise;b.setAttribute('aria-label','Repeat '+x.exercise+' from '+dateLabel(x.date));b.onclick=()=>{workoutForm({...x,transcript:'',warning:''},logDate());$('workoutresult').scrollIntoView?.({behavior:'smooth',block:'start'})};recent.append(b);
  }
  $('recentExerciseSection').hidden=!recent.childNodes.length;
}
function trainingCard(x,number){
  const card=document.createElement('article');card.className='glass training-exercise';
  const header=document.createElement('div');header.className='training-exercise-heading';
  const badge=document.createElement('span');badge.className='exercise-number';badge.textContent=String(number).padStart(2,'0');
  const title=document.createElement('h2');title.textContent=x.exercise;
  const edit=document.createElement('button');edit.className='edit-meal';edit.textContent='Edit sets';edit.setAttribute('aria-label','Edit sets for '+x.exercise);edit.onclick=()=>{workoutForm(x,x.date,x);$('workoutresult').scrollIntoView?.({behavior:'smooth',block:'start'})};header.append(badge,title,edit);card.append(header);
  const previous=previousExercise(x.exercise,x.date);
  const caption=document.createElement('p');caption.className='training-comparison small muted';caption.textContent=previous?'Previous: '+dateLabel(previous.date)+' · '+weightBasis(previous.weightMode):'First log for this exercise';card.append(caption);
  const table=document.createElement('table');table.className='training-set-table';
  const thead=document.createElement('thead');const labels=document.createElement('tr');
  for(const text of ['Set','Previous',x.weightMode==='per_side'?'Kg / side':'Kg','Reps']){const th=document.createElement('th');th.scope='col';th.textContent=text;labels.append(th)}thead.append(labels);table.append(thead);
  const tbody=document.createElement('tbody'),oldRows=previous?workoutSetRows(previous):[];
  for(const [i,s] of workoutSetRows(x).entries()){
    const tr=document.createElement('tr');
    for(const [j,text] of [String(i+1),oldRows[i]?oldRows[i].weight+' × '+oldRows[i].reps:'—',String(s.weight),String(s.reps)].entries()){const td=document.createElement(j===0?'th':'td');if(j===0)td.scope='row';td.textContent=text;tr.append(td)}tbody.append(tr);
  }table.append(tbody);card.append(table);
  const footer=document.createElement('div');footer.className='training-card-footer';const count=document.createElement('span');count.textContent=workoutSetRows(x).length+' sets logged · '+weightBasis(x.weightMode);
  const add=document.createElement('button');add.className='training-add-set';add.textContent='+ Add set';add.onclick=()=>{workoutForm(x,x.date,x);$('workoutresult').querySelector('.add-set').onclick();$('workoutresult').scrollIntoView?.({behavior:'smooth',block:'start'})};footer.append(count,add);card.append(footer);return card;
}
function workoutSetRows(x){
  const details=Array.isArray(x.setDetails)?x.setDetails:[];
  const count=Math.min(50,Math.max(1,details.length,Number.isInteger(+x.sets)&&+x.sets>0?+x.sets:0));
  return Array.from({length:count},(_,i)=>details.length?{weight:details[i]?.weight??'',reps:details[i]?.reps??''}:{weight:x.weight??'',reps:x.reps??''});
}
function workoutForm(x,workoutDate=logDate(),existing=null){
  const host=$('workoutresult');host.replaceChildren();
  const title=document.createElement('h2');title.textContent=existing?'Edit exercise':'Review your sets';host.append(title);
  const dateText=document.createElement('p');dateText.className='small muted';dateText.textContent='Workout date: '+dateLabel(workoutDate);host.append(dateText);
  if(x.transcript){const heard=document.createElement('p');heard.className='small muted';heard.textContent='Heard: '+x.transcript;host.append(heard)}
  const exercise=makeField('Exercise',x.exercise||'');exercise.input.setAttribute('list','knownExercises');host.append(exercise.wrap);
  const suggestions=document.createElement('datalist');suggestions.id='knownExercises';
  for(const name of [...new Set(db.sets.map(s=>s.exercise).filter(Boolean))]){const option=document.createElement('option');option.value=name;suggestions.append(option)}host.append(suggestions);
  const previousPanel=document.createElement('div');previousPanel.className='previous-session';host.append(previousPanel);
  const basisLabel=document.createElement('label');basisLabel.textContent='How is the weight recorded?';
  const basis=document.createElement('select');basis.id='weight-basis-'+(++fieldSequence);basisLabel.htmlFor=basis.id;
  for(const [value,label] of [['unspecified','As entered (basis not specified)'],['per_side','Per side / each side'],['total','Total weight']]){const option=document.createElement('option');option.value=value;option.textContent=label;basis.append(option)}
  basis.value=['per_side','total'].includes(x.weightMode)?x.weightMode:'unspecified';host.append(basisLabel,basis);
  const note=document.createElement('p');note.className='small muted';note.textContent='For 20 kg on each side, enter 20 and choose Per side. Bar weight is not added automatically.';host.append(note);
  if(x.warning){const warning=document.createElement('p');warning.className='small workout-warning';warning.textContent=x.warning;host.append(warning)}
  const list=document.createElement('div');list.className='set-editor';host.append(list);
  const rows=[];
  const add=document.createElement('button');add.className='secondary add-set';add.textContent='+ Add set';
  function refresh(){rows.forEach((r,i)=>{r.number.textContent='Set '+(i+1);r.remove.setAttribute('aria-label','Remove set '+(i+1));r.remove.disabled=rows.length===1});add.disabled=rows.length>=50}
  function addRow(values){
    const line=document.createElement('div');line.className='set-editor-row';
    const number=document.createElement('strong');number.className='set-number';
    const weight=makeField('Weight (kg)',values.weight,'number'),reps=makeField('Reps',values.reps,'number');
    weight.input.min='0';weight.input.step='0.5';weight.input.required=true;reps.input.min='1';reps.input.step='1';reps.input.required=true;
    const remove=document.createElement('button');remove.className='remove-set';remove.textContent='×';
    const item={line,number,weight,reps,remove};remove.onclick=()=>{if(rows.length===1)return;rows.splice(rows.indexOf(item),1);line.remove();refresh()};
    line.append(number,weight.wrap,reps.wrap,remove);list.append(line);rows.push(item);refresh();
  }
  add.onclick=()=>{if(rows.length<50)addRow({weight:'',reps:''})};
  for(const values of workoutSetRows(x))addRow(values);
  host.append(add);
  function showPrevious(){
    previousPanel.replaceChildren();const old=previousExercise(exercise.input.value,workoutDate);previousPanel.hidden=!old;if(!old)return;
    const label=document.createElement('strong');label.textContent='Last time · '+dateLabel(old.date);const copy=document.createElement('p');copy.textContent=workoutSetRows(old).map(s=>s.weight+' kg × '+s.reps).join(' · ')+' ('+weightBasis(old.weightMode)+')';previousPanel.append(label,copy);
    if(!existing){const reuse=document.createElement('button');reuse.className='secondary';reuse.textContent='Use last session’s sets';reuse.onclick=()=>{rows.splice(0,rows.length);list.replaceChildren();basis.value=['per_side','total'].includes(old.weightMode)?old.weightMode:'unspecified';for(const s of workoutSetRows(old))addRow(s)};previousPanel.append(reuse)}
  }
  exercise.input.onchange=showPrevious;showPrevious();
  const saveButton=button(existing?'Save workout changes':'Confirm and save workout',()=>{
    const setDetails=rows.map(r=>({weight:Number(r.weight.input.value),reps:Number(r.reps.input.value)}));
    if(!exercise.input.value.trim()||rows.some(r=>!r.weight.input.value.trim()||!r.reps.input.value.trim())||setDetails.some(s=>!Number.isFinite(s.weight)||s.weight<0||!Number.isInteger(s.reps)||s.reps<1))return notify('Enter an exercise and valid weight and reps for every set. Use 0 kg for bodyweight.');
    const entry={date:workoutDate,exercise:exercise.input.value.trim(),sets:setDetails.length,weightMode:basis.value,setDetails};
    if(existing)Object.assign(existing,entry);else db.sets.push(entry);
    selectedDate=workoutDate===now()?null:workoutDate;save();host.replaceChildren();$('quickWorkoutLog').open=false;show('workout');notify(existing?'Workout updated':'Workout saved');
  });saveButton.classList.add('workout-save');host.append(saveButton);
  const cancel=document.createElement('button');cancel.className='secondary workout-cancel';cancel.textContent='Cancel';cancel.onclick=()=>{host.replaceChildren();show('workout')};host.append(cancel);
  host.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function workoutCard(x){
  const item=document.createElement('article');item.className='workout-row';
  const head=document.createElement('div');head.className='meal-top';
  const title=document.createElement('strong');title.textContent=x.exercise||'Workout';
  const edit=document.createElement('button');edit.className='edit-meal edit-workout';edit.textContent='Edit';edit.setAttribute('aria-label','Edit '+(x.exercise||'workout'));edit.onclick=()=>{show('workout');workoutForm(x,x.date,x)};
  head.append(title,edit);item.append(head);
  const detail=document.createElement('p');detail.className='small muted';const suffix=x.weightMode==='per_side'?'per side':x.weightMode==='total'?'total':'as entered';
  detail.textContent=(Array.isArray(x.setDetails)?x.setDetails.length:x.sets)+' sets · Weight '+suffix;item.append(detail);
  const list=document.createElement('ol');list.className='logged-sets';
  for(const [i,s] of workoutSetRows(x).entries()){
    const line=document.createElement('li');const label=document.createElement('span');label.textContent='Set '+(i+1);
    const value=document.createElement('strong');value.textContent=s.weight+' kg'+(x.weightMode==='per_side'?' per side':'')+' × '+s.reps+' reps';line.append(label,value);list.append(line);
  }
  item.append(list);return item;
}
$('manualWorkout').onclick=()=>workoutForm({});
$('openQuickLog').onclick=()=>{$('quickWorkoutLog').open=true;$('quickWorkoutLog').scrollIntoView?.({behavior:'smooth',block:'start'})};
$('parse').onclick=async()=>{const workoutDate=logDate();try{const text=$('transcript').value.trim();if(!text)return notify('Type an exercise first');workoutForm(await call('parse',{text}),workoutDate)}catch(e){notify(e.message)}};
$('record').onclick=async()=>{const b=$('record');if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.stop();b.textContent='● Start recording';return}const workoutDate=logDate();try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw Error('Your browser does not support audio recording');chunks=[];mediaRecorder=new MediaRecorder(stream,{mimeType:mime});mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mediaRecorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());$('recordstatus').textContent='Transcribing your set…';try{const f=new File(chunks,'workout',{type:mime});const result=await call('voice',{audio:await fileB64(f),mime});$('transcript').value=result.transcript||'';workoutForm(result,workoutDate);$('recordstatus').textContent='Review the result before saving'}catch(e){notify(e.message);$('recordstatus').textContent='Try again or type your exercise'}};mediaRecorder.start();b.textContent='■ Stop & analyze';$('recordstatus').textContent='Recording… speak your set'}catch(e){notify(e.message)}};
$('saveprogress').onclick=()=>{const weight=Number($('weight').value),waist=Number($('waist').value);if(weight<=0||waist<=0)return notify('Enter valid weight and waist measurements');db.measurements.push({date:logDate(),weight,waist});save();notify('Progress saved')};
$('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download='platewise-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

const defaultSkin={am:['Cleanser','Moisturizer','Sunscreen'],pm:['Cleanser','Moisturizer']};
function dayWellness(){db.wellness??={goal:2500,habits:[{id:'read',name:'Read 15 minutes'},{id:'stretch',name:'Stretch or mobility'},{id:'sleep',name:'Bedtime routine'}],skin:defaultSkin,days:{}};db.wellness.days??={};db.wellness.days[logDate()]??={water:0,checks:{}};return db.wellness.days[logDate()]}
function checkRow(container,key,label){const line=document.createElement('div');line.className='habit-row';const cb=document.createElement('input');cb.type='checkbox';cb.id=key;cb.checked=!!dayWellness().checks[key];cb.onchange=()=>{dayWellness().checks[key]=cb.checked;save()};const name=document.createElement('label');name.textContent=label;name.htmlFor=key;line.append(cb,name);container.append(line)}
function renderWellness(){let d=dayWellness(),w=db.wellness;w.goal=Number(w.goal)||2500;w.skin??=defaultSkin;w.habits??=[];const water=Math.max(0,Number(d.water)||0);$('waterValue').textContent=water+' ml';$('waterGoalLabel').textContent=' / '+w.goal+' ml';$('waterGoal').value=w.goal;$('waterBar').style.width=Math.min(100,100*water/w.goal)+'%';let skeys=[];for(const period of ['am','pm']){let host=$(period==='am'?'skinAM':'skinPM');host.replaceChildren();for(const [i,label] of w.skin[period].entries()){const key='skin:'+period+':'+i;skeys.push(key);checkRow(host,key,label)}}let list=$('habitList');list.replaceChildren();for(const h of w.habits)checkRow(list,'habit:'+h.id,h.name);$('skinCount').textContent=skeys.filter(k=>d.checks[k]).length+'/'+skeys.length;$('habitCount').textContent=w.habits.filter(h=>d.checks['habit:'+h.id]).length+'/'+w.habits.length;const liters=ml=>Number((ml/1000).toFixed(2)).toLocaleString();$('waterRemaining').textContent=water>=w.goal?'Goal met':liters(w.goal-water)+' L left';$('waterHomeTotal').textContent=liters(water)+' / '+liters(w.goal)+' L';meter('waterHomeProgress','waterHomeFill',water,w.goal);document.querySelector('.hydration-card').classList.toggle('has-water',water>0);document.querySelector('.hydration-card').style.setProperty('--water-level',Math.min(52,52*water/w.goal)+'%');$('homeHabits').textContent=$('habitCount').textContent;$('homeSkin').textContent=$('skinCount').textContent}
$('addWater').onclick=()=>{let d=dayWellness();d.water=(Number(d.water)||0)+250;save()};
$('quickWater').onclick=()=>{$('addWater').onclick();notify('Added 250 ml of water')};
$('undoWater').onclick=()=>{let d=dayWellness();d.water=Math.max(0,(Number(d.water)||0)-250);save()};
$('waterGoal').onchange=e=>{let g=Number(e.target.value);if(g<250||g>6000||!Number.isFinite(g)){notify('Enter a goal between 250 and 6000 ml');return}dayWellness();db.wellness.goal=g;save()};
$('addHabit').onclick=()=>{let name=$('newHabit').value.trim();if(!name)return;dayWellness();db.wellness.habits.push({id:'h'+Date.now(),name});$('newHabit').value='';save()};

if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
render();
