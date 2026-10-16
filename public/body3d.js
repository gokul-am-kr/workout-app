// Flat SVG muscle map. Existing IDs preserve workout-log integration.
const svg=document.getElementById('bodyFallback');
const stage=document.getElementById('bodyStage');
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
let motion=!reduce.matches;
const paths={
shoulders:'M73 76 Q52 78 48 103 L61 108 Q64 88 79 88Z',
chest:'M98 83 Q83 79 70 92 L65 111 Q80 120 98 110Z',
biceps:'M59 111 Q48 108 44 125 L39 143 Q48 150 54 136 L61 119Z',
forearms:'M40 146 Q32 151 29 170 L22 190 30 194 Q42 181 47 159Z',
core:'M98 116 Q87 113 82 119 L84 131 98 132Z M98 136 L85 135 86 147 98 149Z M98 153 L86 151 88 166 98 171Z M98 175 L89 171 91 187 98 199Z M79 120 L70 116 73 148 84 165 81 143Z',
quads:'M77 202 Q66 221 68 247 L75 278 Q84 271 85 246 L85 212Z M87 216 L87 251 81 280 Q92 280 94 260 L96 231Z',
calves:'M75 292 Q66 310 75 337 L81 350 85 326 83 296Z',
back:'M98 80 L80 78 68 93 76 111 98 125Z M69 116 L78 150 91 170 98 145 98 130Z M98 151 L89 176 91 197 98 202Z',
triceps:'M58 111 Q48 109 43 128 L39 145 Q49 151 55 134Z',
glutes:'M96 202 Q80 191 74 208 L72 228 Q83 239 97 226Z',
hamstrings:'M74 234 Q68 253 76 279 L84 283 88 263 88 238Z M92 234 L91 269 86 284 94 280 97 246Z'
};
function region(key,d){return '<g data-muscle="'+key+'"><path d="'+d+'"/><path d="'+d+'" transform="translate(200 0) scale(-1 1)"/></g>'}
const outline='M89 61 L88 72 Q62 72 51 85 Q43 95 42 114 L33 145 25 171 17 191 Q10 199 14 207 Q18 214 24 207 L32 198 42 178 54 153 63 129 69 151 74 181 69 207 63 236 68 274 70 290 66 317 73 351 72 365 63 375 Q61 380 69 381 L87 379 89 368 89 344 94 309 95 284 100 246 105 284 106 309 111 344 111 368 113 379 131 381 Q139 380 137 375 L128 365 127 351 134 317 130 290 132 274 137 236 131 207 126 181 131 151 137 129 146 153 158 178 168 198 176 207 Q182 214 186 207 Q190 199 183 191 L175 171 167 145 158 114 Q157 95 149 85 Q138 72 112 72 L111 61Z';
svg.innerHTML='<title>Weekly training muscle map</title><path class="body-outline" d="'+outline+'"/><path class="body-head" d="M100 12 Q80 12 81 34 L83 47 91 60 109 60 117 47 119 34 Q120 12 100 12Z"/><g id="fallbackFront">'+['shoulders','chest','biceps','forearms','core','quads','calves'].map(k=>region(k,paths[k])).join('')+'</g><g id="fallbackBack" style="display:none">'+['shoulders','back','triceps','forearms','glutes','hamstrings','calves'].map(k=>region(k,paths[k])).join('')+'</g>';
stage.dataset.renderer='svg';
document.getElementById('bodyRenderHint').textContent='Tap a muscle to explore';
function view(next){
document.getElementById('fallbackFront').style.display=next==='front'?'':'none';
document.getElementById('fallbackBack').style.display=next==='back'?'':'none';
for(const side of ['Front','Back'])document.getElementById('body'+side).setAttribute('aria-pressed',String(side.toLowerCase()===next));
svg.setAttribute('aria-label',next+' muscle map. Highlighted regions show logged sets.');
}
function paint(state){
if(!state)return;
const max=Math.max(1,...Object.values(state.counts));
for(const part of svg.querySelectorAll('[data-muscle]')){
 const key=part.dataset.muscle,count=state.counts[key]||0,selected=state.selected===key;
 part.style.fill=count?'hsl(212 88% '+(42+22*count/max)+'%)':'#454653';
 part.style.opacity=state.selected&&!selected?'.32':'1';
 part.style.filter='none';
 part.classList.toggle('is-selected',selected);
 part.setAttribute('role','button');part.setAttribute('tabindex','0');
 part.setAttribute('aria-label',window.WorkoutMuscles.groups[key]+': '+count+' logged sets');
 part.setAttribute('aria-pressed',String(selected));
}
}
function pick(e){const part=e.target.closest('[data-muscle]');if(part)window.dispatchEvent(new CustomEvent('muscle-pick',{detail:part.dataset.muscle}))}
svg.addEventListener('click',pick);
svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e)}});
document.getElementById('bodyFront').onclick=()=>view('front');
document.getElementById('bodyBack').onclick=()=>view('back');
function updateMotion(){const b=document.getElementById('bodyMotion');b.textContent=motion?'Pause highlights':'Animate highlights';b.setAttribute('aria-pressed',String(motion));stage.classList.toggle('animate-highlights',motion)}
document.getElementById('bodyMotion').onclick=()=>{motion=!motion;updateMotion()};
reduce.addEventListener('change',()=>{motion=!reduce.matches;updateMotion()});
window.addEventListener('weekly-muscles',e=>{
 if(e.detail.selected&&e.detail.selected!==window.bodyMapSelection)view(['back','triceps','glutes','hamstrings'].includes(e.detail.selected)?'back':'front');
 window.bodyMapSelection=e.detail.selected;paint(e.detail);
});
view('front');updateMotion();paint(window.weeklyBodyState);
