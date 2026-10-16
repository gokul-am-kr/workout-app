// A procedural, symbolic mannequin. No external models or user data are loaded.
const stage=document.getElementById('bodyStage'),panel=document.getElementById('weeklyBodyPanel');
const fallback=document.getElementById('bodyFallback'),hint=document.getElementById('bodyRenderHint');
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
let animate=!reduce.matches,view='front',target=0,renderer,scene,camera,body,meshes=[],initializing=false,failed=false,visible=false,frame=0,then=0,state=window.weeklyBodyState;
function motionLabel(){const b=document.getElementById('bodyMotion');b.textContent=animate?'Pause motion':'Resume motion';b.setAttribute('aria-pressed',String(animate));fallback.style.animationPlayState=animate?'running':'paused'}
motionLabel();
function active(){return visible&&panel.open&&!document.hidden&&!document.getElementById('workout').hidden}
function viewState(next){view=next;target=next==='back'?Math.PI:0;document.getElementById('bodyFront').setAttribute('aria-pressed',String(next==='front'));document.getElementById('bodyBack').setAttribute('aria-pressed',String(next==='back'));document.getElementById('fallbackFront').style.display=next==='front'?'':'none';document.getElementById('fallbackBack').style.display=next==='back'?'':'none';if(body&&!animate){body.rotation.y=target;draw(0)}sync()}
document.getElementById('bodyFront').onclick=()=>viewState('front');
document.getElementById('bodyBack').onclick=()=>viewState('back');
document.getElementById('bodyMotion').onclick=()=>{animate=!animate;motionLabel();sync()};
reduce.addEventListener('change',()=>{animate=!reduce.matches;motionLabel();sync()});
function applyState(){
  if(!renderer||!state)return;const max=Math.max(1,...Object.values(state.counts));
  for(const mesh of meshes){const key=mesh.userData.muscle,count=state.counts[key]||0;mesh.userData.active=count>0;const selected=state.selected===key;mesh.material.color.set(selected?'#ffe1ad':count?'#c89653':'#67705c');if(count&&!selected)mesh.material.color.multiplyScalar(.65+.35*count/max);if(state.selected&&!selected)mesh.material.color.multiplyScalar(.55);mesh.material.emissive.set(count?'#b8752a':'#000000');mesh.material.emissiveIntensity=count ? .13 : 0}
  if(!animate)draw(0);sync();
}
function draw(time){
  if(!renderer)return;
  const moving=animate;
  body.rotation.y=moving?body.rotation.y+(target-body.rotation.y)*.09:target;
  body.position.y=moving?Math.sin(time*.0008)*.018:0;
  for(const mesh of meshes)if(mesh.userData.active)mesh.material.emissiveIntensity=moving ? .13+Math.sin(time*.002)*.045 : .13;
  renderer.render(scene,camera);
}
function loop(time){frame=0;if(!active()||!animate)return;if(time-then>32){draw(time);then=time}frame=requestAnimationFrame(loop)}
function sync(){
  if(!active()){if(frame)cancelAnimationFrame(frame);frame=0;return}
  if(!renderer&&!initializing&&!failed){init();return}
  if(renderer){resize();if(animate&&!frame)frame=requestAnimationFrame(loop);if(!animate){if(frame)cancelAnimationFrame(frame);frame=0;draw(0)}}
}
function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight-48;if(!w||h<=0)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=camera.aspect<.75?8.5:7.6;camera.updateProjectionMatrix()}
async function init(){
  initializing=true;
  try{
    const THREE=await import('/vendor/three.module.js');
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Interactive symbolic 3D body. Highlighted regions show logged training coverage.');renderer.domElement.style.touchAction='pan-y';
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,40);camera.position.set(0,.6,7.6);camera.lookAt(0,.48,0);
    scene.add(new THREE.HemisphereLight(0xffedcf,0x242d22,2));
    const key=new THREE.DirectionalLight(0xffe5bf,3.4);key.position.set(-3,4,4);scene.add(key);
    const rim=new THREE.DirectionalLight(0xc5c0ef,3.3);rim.position.set(3,2,-3);scene.add(rim);
    const fill=new THREE.DirectionalLight(0xb9d5b0,1);fill.position.set(0,1,4);scene.add(fill);
    body=new THREE.Group();scene.add(body);
    const geometry=new THREE.SphereGeometry(1,28,20);
    function part(muscle,x,y,z,sx,sy,sz,angle=0){const material=new THREE.MeshStandardMaterial({color:muscle?0x67705c:0x343d30,roughness:.36,metalness:.28});const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.z=angle;mesh.userData.muscle=muscle;if(muscle)meshes.push(mesh);body.add(mesh);return mesh}
    part(null,0,2.22,0,.24,.31,.225);part(null,0,1.87,0,.13,.18,.13);
    part(null,0,1.15,0,.44,.63,.23);part(null,0,.5,0,.34,.25,.23);
    for(const side of [-1,1]){
      part('chest',side*.245,1.45,.185,.275,.265,.145,side*.08);
      part('shoulders',side*.55,1.59,0,.225,.235,.24,-side*.2);
      part(null,side*.70,1.17,0,.145,.38,.15,side*.22);
      part('biceps',side*.70,1.19,.095,.14,.29,.12,side*.22);
      part('triceps',side*.70,1.2,-.1,.145,.30,.115,side*.22);
      part('forearms',side*.84,.61,.02,.115,.32,.13,side*.19);
      part(null,side*.91,.23,.035,.102,.17,.085,side*.1);
      part('back',side*.225,1.30,-.17,.26,.44,.13,-side*.12);
      part('glutes',side*.17,.39,-.15,.19,.23,.18);
      part(null,side*.22,-.15,0,.205,.55,.21);
      part('quads',side*.22,-.1,.115,.18,.48,.15,-side*.025);
      part('hamstrings',side*.22,-.13,-.12,.175,.46,.14);
      part(null,side*.23,-.65,.02,.135,.14,.145);
      part(null,side*.24,-1.04,.035,.115,.38,.13);
      part('calves',side*.24,-.98,-.075,.13,.30,.145);
      part(null,side*.24,-1.46,.12,.14,.10,.26);
    }
    for(const y of [1.12,.91,.71])for(const side of [-1,1])part('core',side*.112,y,.224,.105,.101,.066);
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(.83,.92,.06,64),new THREE.MeshStandardMaterial({color:0x343d2b,metalness:.55,roughness:.5}));platform.position.y=-1.62;scene.add(platform);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.87,.009,8,80),new THREE.MeshBasicMaterial({color:0xab8b5e,transparent:true,opacity:.65}));ring.rotation.x=Math.PI/2;ring.position.y=-1.58;scene.add(ring);
    body.rotation.y=target;stage.append(renderer.domElement);fallback.hidden=true;fallback.style.display='none';hint.textContent='Drag to rotate · tap a muscle';stage.dataset.renderer='webgl';
    let down=null;const raycaster=new THREE.Raycaster();
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,last:e.clientX,moved:0};renderer.domElement.setPointerCapture(e.pointerId)});
    renderer.domElement.addEventListener('pointermove',e=>{if(!down)return;const delta=e.clientX-down.last;down.moved+=Math.abs(delta);target+=delta*.012;down.last=e.clientX;if(down.moved>6){document.getElementById('bodyFront').setAttribute('aria-pressed','false');document.getElementById('bodyBack').setAttribute('aria-pressed','false')}if(!animate){body.rotation.y=target;renderer.render(scene,camera)}});
    renderer.domElement.addEventListener('pointerup',e=>{if(down&&down.moved<6&&Math.abs(e.clientY-down.y)<6){const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(body.children,false)[0];if(hit?.object.userData.muscle)window.dispatchEvent(new CustomEvent('muscle-pick',{detail:hit.object.userData.muscle}))}down=null});
    renderer.domElement.addEventListener('pointercancel',()=>{down=null});
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(frame)cancelAnimationFrame(frame);frame=0;renderer.domElement.style.display='none';fallback.hidden=false;fallback.style.display='';hint.textContent='Muscle map · 3D unavailable';failed=true;renderer=null});
    resize();applyState();draw(0);initializing=false;sync();
  }catch(error){if(renderer){renderer.dispose();renderer.domElement.remove()}renderer=null;initializing=false;failed=true;fallback.hidden=false;fallback.style.display='';hint.textContent='Muscle map · 3D unavailable';stage.dataset.renderer='fallback'}
}
window.addEventListener('weekly-muscles',e=>{const picked=e.detail.selected;if(picked&&picked!==state?.selected)viewState(['back','triceps','glutes','hamstrings','calves'].includes(picked)?'back':'front');state=e.detail;applyState()});
document.addEventListener('visibilitychange',sync);panel.addEventListener('toggle',sync);
new MutationObserver(sync).observe(document.getElementById('workout'),{attributes:true,attributeFilter:['hidden']});
new ResizeObserver(()=>{resize();if(renderer&&!animate)draw(0)}).observe(stage);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{rootMargin:'100px'}).observe(stage);
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0});
