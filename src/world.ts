import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEROES, HERO_MAP, LANES, type Hero } from './data';
import { Battle, type Unit, type GameEvent } from './simulation';

const materialCache=new Map<string,THREE.MeshLambertMaterial>();
const geometryCache=new Map<string,THREE.BufferGeometry>();
const heroStaticCache=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material}[]>();
const unitRingGeometry=new THREE.RingGeometry(.43,.5,24);
const healthGeometry=new THREE.PlaneGeometry(1,1);
const teamRings=[0x68e5d0,0xff8e81].map(color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.8}));
const healthMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
function mat(color:number,emissive=0){const key=`${color}/${emissive}`;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshLambertMaterial({color,flatShading:true,emissive:color,emissiveIntensity:emissive}));return materialCache.get(key)!;}
function geo(kind:string){if(!geometryCache.has(kind))geometryCache.set(kind,kind==='box'?new THREE.BoxGeometry(1,1,1):kind==='orb'?new THREE.IcosahedronGeometry(1,1):kind==='cone'?new THREE.ConeGeometry(1,1,6):kind==='crystal'?new THREE.OctahedronGeometry(1):kind==='ring'?new THREE.TorusGeometry(1,.04,4,32):new THREE.CylinderGeometry(1,1,1,8));return geometryCache.get(kind)!;}
function part(parent:THREE.Object3D,kind:string,color:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,emissive=0){const mesh=new THREE.Mesh(geo(kind),mat(color,emissive));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function seeded(){let seed=45198;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

export function createHero(h:Hero,side=0){
  const group=new THREE.Group();const body=new THREE.Group();group.add(body);
  const bulk=h.role==='guardian'?1.25:h.id==='nyx'?.8:1;
  const armor=h.color,trim=h.accent,dark=0x263842,skin=h.id==='brann'?0x9a7c53:0xd6ba9e;
  // Hand-built low-poly miniatures: independent limbs, armour, cloaks and weapons.
  const leftLeg=part(body,'box',dark,-.18,.37,0,.22,.62,.26),rightLeg=part(body,'box',dark,.18,.37,0,.22,.62,.26);
  part(body,'box',armor,-.19,.13,.09,.27,.2,.45);part(body,'box',armor,.19,.13,.09,.27,.2,.45);
  part(body,'cone',armor,0,.78,0,.43,.55,.35).rotation.z=Math.PI;
  part(body,'box',armor,0,1.12,0,.64*bulk,.7,.42*bulk);
  part(body,'box',trim,0,.91,.03,.7*bulk,.1,.48);
  part(body,'crystal',trim,0,1.25,.24,.12,.18,.08,.25);
  part(body,'orb',armor,-.43*bulk,1.34,0,.24,.19,.25);part(body,'orb',armor,.43*bulk,1.34,0,.24,.19,.25);
  part(body,'box',skin,0,1.69,0,.4,.42,.36);
  part(body,'cone',dark,0,1.9,-.02,.34,.38,.3);
  part(body,'box',trim,-.105,1.72,.19,.095,.055,.035,1);part(body,'box',trim,.105,1.72,.19,.095,.055,.035,1);
  const cape=part(body,'box',armor,0,1.03,-.27,.65,1.05,.06);cape.rotation.x=-.15;
  const armL=new THREE.Group();armL.position.set(-.43,1.26,0);body.add(armL);part(armL,'box',armor,0,-.2,0,.2,.5,.22);part(armL,'orb',skin,0,-.47,.03,.12,.13,.12);
  const armR=new THREE.Group();armR.position.set(.43,1.26,0);body.add(armR);part(armR,'box',armor,0,-.2,0,.2,.5,.22);part(armR,'orb',skin,0,-.47,.03,.12,.13,.12);
  if(h.weapon==='sword'||h.weapon==='daggers'){
    part(armR,'box',0xe0e7de,.03,-.14,.27,.11,h.weapon==='daggers'?.58:1.1,.09).rotation.x=.22;
    part(armR,'box',trim,.03,-.5,.22,.38,.08,.12);
    if(h.weapon==='daggers')part(armL,'box',trim,0,-.14,.27,.1,.65,.09,.15);
    else{part(armL,'box',armor,-.07,-.32,.19,.48,.68,.12);part(armL,'crystal',trim,-.07,-.3,.29,.21,.32,.05,.15);}
  }else if(h.weapon==='bow'){
    const bow=part(armL,'ring',trim,-.12,-.2,.22,.42,.68,.5);bow.rotation.y=Math.PI/2;
    part(armL,'box',0xbecbc6,-.12,-.2,.22,.025,1.22,.025);
    const quiver=part(body,'cylinder',dark,.23,1.15,-.4,.17,.8,.17);quiver.rotation.z=.25;
    for(let i=0;i<3;i++)part(body,'box',trim,.12+i*.09,1.64,-.4,.02,.52,.02);
  }else if(h.weapon==='staff'){
    part(armR,'cylinder',0x9c855a,.08,-.05,.2,.045,1.95,.045);
    part(armR,'ring',trim,.08,.9,.2,.25,.3,.25,.2);
    part(armR,'crystal',trim,.08,.91,.2,.18,.32,.18,.8);
    part(body,'cone',armor,0,1.98,0,.36,.55,.36);
  }else{
    part(armR,'cylinder',0x816844,.15,-.24,.23,.07,1.4,.07).rotation.z=-.25;
    part(armR,'box',armor,.25,.36,.23,.68,.43,.48);part(armR,'crystal',trim,.25,.36,.48,.18,.19,.05,.4);
  }
  if(h.id==='brann'){for(const s of [-1,1]){const branch=part(body,'cone',0x80664c,s*.35,2.01,-.02,.09,.68,.08);branch.rotation.z=-s*.6;part(body,'orb',0x799852,s*.53,2.25,0,.32,.22,.29);}}
  if(h.id==='kael')for(const s of [-1,1])part(body,'crystal',trim,s*.3,1.9,0,.09,.36,.1,.2).rotation.z=-s*.35;
  if(h.id==='aurelia'){const halo=part(body,'ring',trim,0,2.15,-.04,.36,.36,.36,.6);halo.rotation.x=.2;}
  const fixed=body.children.filter(o=>o instanceof THREE.Mesh&&o!==leftLeg&&o!==rightLeg&&o!==cape) as THREE.Mesh[];
  if(!heroStaticCache.has(h.id)){
    body.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const o of fixed){const m=o.material as THREE.Material,g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(g);}
    const cached:{geometry:THREE.BufferGeometry;material:THREE.Material}[]=[];
    for(const[m,gs]of batches){const merged=mergeGeometries(gs);if(merged)cached.push({geometry:merged,material:m});gs.forEach(g=>g.dispose());}heroStaticCache.set(h.id,cached);
  }
  for(const o of fixed)body.remove(o);
  for(const b of heroStaticCache.get(h.id)!){const mesh=new THREE.Mesh(b.geometry,b.material);mesh.castShadow=true;mesh.receiveShadow=true;body.add(mesh);}
  const ring=new THREE.Mesh(unitRingGeometry,teamRings[side]);ring.rotation.x=-Math.PI/2;ring.position.y=.035;group.add(ring);
  group.userData={body,leftLeg,rightLeg,armL,armR,cape,ring};return group;
}

interface Visual {group:THREE.Group;bar:THREE.Mesh;shield:THREE.Mesh;unit:Unit}
interface Effect {mesh:THREE.Object3D;start:number;duration:number;kind:string;x:number;toX:number;z:number;side:number}
export class World {
  scene=new THREE.Scene();camera:THREE.OrthographicCamera;renderer:THREE.WebGLRenderer;
  canvas:HTMLCanvasElement;units=new Map<number,Visual>();towerMeshes=new Map<string,THREE.Group>();coreCrystals:THREE.Mesh[]=[];
  effects:Effect[]=[];lastEvent=0;clock=0;quality:'high'|'low'='high';ray=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);pointer=new THREE.Vector2();
  unitBatches=new Map<string,{mesh:THREE.InstancedMesh;count:number}>();
  instanceColor=new THREE.Color();
  deployZone=new THREE.Group();hoverRing:THREE.Mesh;selected=false;selectedLane=-1;stats={calls:0,triangles:0,geometries:0,textures:0};
  constructor(container:HTMLElement){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.canvas=this.renderer.domElement;
    this.canvas.setAttribute('aria-label','Chiến trường 3D: chọn thẻ rồi chạm vùng bên trái để thả quân');this.canvas.tabIndex=0;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    container.appendChild(this.canvas);this.scene.background=new THREE.Color(0x142c31);this.scene.fog=new THREE.FogExp2(0x142c31,.011);
    this.camera=new THREE.OrthographicCamera(-20,20,12,-12,.1,150);this.camera.position.set(0,28,25);this.camera.lookAt(0,0,0);
    this.scene.add(new THREE.HemisphereLight(0xe6fff3,0x324436,2.7));
    const sun=new THREE.DirectionalLight(0xffe3ab,3.2);sun.position.set(-12,24,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;sun.shadow.normalBias=.06;this.scene.add(sun);
    const rim=new THREE.DirectionalLight(0x79dacc,1.5);rim.position.set(6,10,-14);this.scene.add(rim);
    this.buildEnvironment();
    for(let lane=0;lane<3;lane++){
      const zone=new THREE.Mesh(new THREE.PlaneGeometry(7.7,2.9),new THREE.MeshBasicMaterial({color:0x77e9c4,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}));zone.rotation.x=-Math.PI/2;zone.position.set(-9.65,.05,LANES[lane]);this.deployZone.add(zone);
      const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.7,2.9)),new THREE.LineBasicMaterial({color:0x99f6cc,transparent:true,opacity:.75}));edge.rotation.x=-Math.PI/2;edge.position.copy(zone.position).add(new THREE.Vector3(0,.01,0));this.deployZone.add(edge);
    }
    this.scene.add(this.deployZone);this.deployZone.visible=false;
    this.hoverRing=new THREE.Mesh(new THREE.RingGeometry(.65,.73,40),new THREE.MeshBasicMaterial({color:0xa2ffdd,transparent:true,opacity:.85,side:THREE.DoubleSide}));this.hoverRing.rotation.x=-Math.PI/2;this.hoverRing.visible=false;this.scene.add(this.hoverRing);
    new ResizeObserver(()=>this.resize(container)).observe(container);this.resize(container);
  }
  resize(el:HTMLElement){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h;const width=Math.max(36,20*aspect);this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=width/aspect/2;this.camera.bottom=-width/aspect/2;this.camera.updateProjectionMatrix();}
  buildEnvironment(){
    const staticGroup=new THREE.Group();this.scene.add(staticGroup);const rand=seeded();
    const floor=part(staticGroup,'cylinder',0x365449,0,-.75,0,22,1.5,12);floor.rotation.y=Math.PI/8;
    part(staticGroup,'box',0x43634d,0,-.17,0,33,.55,17.5);
    part(staticGroup,'box',0x2d5756,0,.001,0,3.4,.05,19);
    for(let i=0;i<30;i++){const ripple=part(staticGroup,'box',i%2?0x427a73:0x355f61,(rand()-.5)*2.8,.037,(rand()-.5)*18,.025,.01,.3+rand()*1.5);ripple.rotation.y=.16;}
    for(let lane=0;lane<3;lane++){
      const z=LANES[lane];part(staticGroup,'box',0x7e8976,0,.02,z,28,.18,2.7);
      for(let x=-13;x<14;x+=.95)for(let r=0;r<3;r++){const tile=part(staticGroup,'box',[0x999e85,0x8a947d,0x85907c][Math.floor(rand()*3)],x,.14,z+(r-1)*.79,.87,.09,.72);tile.rotation.y=(rand()-.5)*.04;}
      for(const x of [-1.65,1.65]){part(staticGroup,'box',0xb5b49a,x,.29,z,.16,.5,3.3);for(const dz of [-1.65,1.65]){part(staticGroup,'box',0x747f6b,x,.68,z+dz,.32,1.25,.32);part(staticGroup,'cone',0xccc9aa,x,1.4,z+dz,.29,.25,.29);}}
      // Carved approach lines and team insignias.
      for(const side of [0,1]){
        const color=side===0?0x83dac4:0xd68d7b,sign=side===0?-1:1;
        for(let i=0;i<3;i++)part(staticGroup,'crystal',color,sign*(5.5+i*.45),.22,z,.1,.035,.2,.25);
      }
    }
    for(let i=0;i<145;i++){
      const x=(rand()-.5)*40,z=(rand()-.5)*23;
      if(Math.abs(x)<15.5&&LANES.some(l=>Math.abs(z-l)<1.9))continue;
      if(Math.abs(x)<2||Math.abs(x)>21||Math.abs(x)>13.5&&Math.abs(z)<3.3)continue;
      const size=.6+rand()*1.05;
      part(staticGroup,'cylinder',0x5c5340,x,.65*size,z,.15*size,1.4*size,.15*size);
      const colors=[0x365f4b,0x426f4e,0x547c55,0x617e52,0x2f6757];
      if(i%3===0){for(let j=0;j<3;j++)part(staticGroup,'cone',colors[i%5],x,(1.15+j*.6)*size,z,(1.0-j*.2)*size,1.4*size,(1-j*.2)*size);}
      else{part(staticGroup,'orb',colors[i%5],x,1.7*size,z,1.0*size,1.1*size,.9*size);part(staticGroup,'orb',colors[(i+1)%5],x+.35*size,2.25*size,z-.1,.7*size,.7*size,.7*size);}
      part(staticGroup,'orb',0x647364,x+.4,.14,z+.5,.35,.25,.4);
    }
    for(let i=0;i<60;i++){const x=(rand()-.5)*33,z=(rand()-.5)*17;if(LANES.some(l=>Math.abs(z-l)<1.7)||Math.abs(x)<2)continue;part(staticGroup,'orb',0x597354,x,.13,z,.45,.2,.4);if(i%3===0)part(staticGroup,'crystal',0x8fb4a7,x,.37,z,.09,.22,.08,.2);}
    // The two bases belong to a new fantasy world; no imported commercial assets.
    for(const side of [0,1]){
      const x=side===0?-15:15,color=side===0?0x65dccc:0xe5a287;
      part(staticGroup,'cylinder',0x647c75,x,.05,0,2.7,.65,3);
      part(staticGroup,'cylinder',0xb4b49a,x,.47,0,1.85,.25,2.15);
      part(staticGroup,'cylinder',0x627675,x,.8,0,1.25,.6,1.4);
      for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;part(staticGroup,'box',0x8e9c8c,x+Math.cos(a)*1.45,1.2,Math.sin(a)*1.45,.36,1.6,.36);part(staticGroup,'crystal',color,x+Math.cos(a)*1.45,2.25,Math.sin(a)*1.45,.27,.6,.27,.4);}
      const crystal=part(this.scene,'crystal',color,x,2.25,0,.8,1.55,.8,.5);this.coreCrystals.push(crystal);
      const orbit=part(this.scene,'ring',color,x,1.7,0,1.55,1.55,1.55,.5);orbit.rotation.x=Math.PI/2;
      for(const z of [-6.8,6.8]){part(staticGroup,'box',0x64736a,x,1.1,z,.8,2.5,.8);const banner=part(staticGroup,'box',side===0?0x3b8682:0x965c55,x+.6,1.5,z,1.2,1.5,.07);banner.rotation.y=.12;part(staticGroup,'crystal',0xdcd0aa,x+.6,1.58,z+.06,.2,.38,.04);}
      for(let lane=0;lane<3;lane++){
        const tower=new THREE.Group();tower.position.set(side===0?-9:9,0,LANES[lane]);
        part(tower,'cylinder',0x5b6c66,0,.12,0,.67,.32,.67);part(tower,'cylinder',0x9aab9a,0,.66,0,.43,.9,.43);part(tower,'cylinder',0xbec2a7,0,1.15,0,.65,.24,.65);part(tower,'crystal',color,0,1.83,0,.38,.65,.38,.35);
        for(const a of [-1,1])part(tower,'box',0x697d75,a*.44,1.42,0,.14,.65,.16);
        this.scene.add(tower);this.towerMeshes.set(`${side}-${lane}`,tower);
      }
    }
    // Merge static props per material: hundreds of terrain objects become a few draw calls.
    staticGroup.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    staticGroup.traverse(o=>{if(o instanceof THREE.Mesh){const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);const m=o.material as THREE.Material;if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(g);}});
    this.scene.remove(staticGroup);
    for(const [m,geometries]of batches){const g=mergeGeometries(geometries);if(g){const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);}geometries.forEach(g=>g.dispose());}
  }
  portrait(h:Hero){
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x1b343b);const model=createHero(h);model.rotation.y=-.3;scene.add(model);
    scene.add(new THREE.HemisphereLight(0xe3ffff,0x3a4045,3));const sun=new THREE.DirectionalLight(0xffe8c2,4);sun.position.set(-3,6,5);scene.add(sun);
    const camera=new THREE.PerspectiveCamera(30,1,.1,20);camera.position.set(2,2.25,4.1);camera.lookAt(0,1.15,0);
    const oldSize=this.renderer.getSize(new THREE.Vector2()),ratio=this.renderer.getPixelRatio();this.renderer.setPixelRatio(1);this.renderer.setSize(256,256,false);this.renderer.render(scene,camera);
    const url=this.canvas.toDataURL('image/webp');this.renderer.setPixelRatio(ratio);this.renderer.setSize(oldSize.x,oldSize.y,false);
    return url;
  }
  pick(clientX:number,clientY:number){const r=this.canvas.getBoundingClientRect();this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());if(!hit)return null;const lane=LANES.reduce((best,l,i)=>Math.abs(hit.z-l)<Math.abs(hit.z-LANES[best])?i:best,0);return{x:hit.x,z:hit.z,lane,valid:hit.x>=-13.5&&hit.x<=-5.8&&Math.abs(hit.z-LANES[lane])<1.55};}
  setHover(clientX:number,clientY:number,ability=false){const p=this.pick(clientX,clientY);this.hoverRing.visible=!!p&&(ability||p.valid);if(p){this.hoverRing.position.set(ability?0:p.x,.27,LANES[p.lane]);this.selectedLane=p.lane;}return p;}
  setQuality(q:'high'|'low'){this.quality=q;this.renderer.setPixelRatio(Math.min(devicePixelRatio,q==='high'?1.25:.85));this.renderer.shadowMap.enabled=q==='high';this.renderer.shadowMap.needsUpdate=true;}
  reset(){for(const v of this.units.values()){this.scene.remove(v.group,v.bar,v.shield);this.disposeUnit(v);}this.units.clear();for(const e of this.effects)this.scene.remove(e.mesh);this.effects=[];this.lastEvent=0;for(const t of this.towerMeshes.values()){t.visible=true;t.scale.setScalar(1);}}
  disposeUnit(_v:Visual){/* Geometry and materials belong to shared caches and instance batches. */}
  addUnit(u:Unit){const group=createHero(HERO_MAP[u.heroId],u.side);group.rotation.y=u.side===0?Math.PI/2:-Math.PI/2;
    const bar=new THREE.Mesh(healthGeometry,healthMaterial);bar.position.set(0,2.6,0);bar.quaternion.copy(this.camera.quaternion);bar.scale.set(.94,.085,1);
    const shield=new THREE.Mesh(healthGeometry,healthMaterial);shield.scale.set(.94,.038,1);const v={group,bar,shield,unit:u};this.units.set(u.id,v);return v;}
  batchUnitMesh(o:THREE.Mesh,color=0xffffff){
    const material=o.material as THREE.Material,key=`${o.geometry.uuid}/${material.uuid}`;
    let batch=this.unitBatches.get(key);
    if(!batch){const mesh=new THREE.InstancedMesh(o.geometry,material,1024);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.count=0;this.scene.add(mesh);batch={mesh,count:0};this.unitBatches.set(key,batch);}
    if(batch.count>=1024)return;
    batch.mesh.setMatrixAt(batch.count,o.matrixWorld);this.instanceColor.setHex(color);batch.mesh.setColorAt(batch.count,this.instanceColor);batch.count++;
  }
  syncUnitBatches(){
    for(const b of this.unitBatches.values())b.count=0;
    for(const v of this.units.values()){
      v.group.updateMatrixWorld(true);v.group.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible)this.batchUnitMesh(o);});
      v.bar.updateMatrixWorld(true);this.batchUnitMesh(v.bar,v.unit.side===0?0x95f4c8:0xff998b);
      if(v.shield.visible){v.shield.updateMatrixWorld(true);this.batchUnitMesh(v.shield,0xffe4a3);}
    }
    for(const b of this.unitBatches.values()){b.mesh.count=b.count;b.mesh.visible=b.count>0;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;}
  }
  effect(e:GameEvent){
    const color=e.type==='heal'?0x83ffc2:e.side===0?0xb4ffde:0xffb4a0;
    if(e.type==='hit'||e.type==='core')return;
    const kind=e.type==='projectile'?'bolt':e.type==='pulse'?'pulse':e.type==='death'?'death':'ring';
    const mesh=kind==='bolt'?part(this.scene,'orb',color,e.x,1.25,LANES[e.lane],.13,.13,.13,1):part(this.scene,'ring',e.heroId?HERO_MAP[e.heroId].accent:color,e.x,.3,LANES[e.lane],.5,.5,.5,.8);
    if(kind!=='bolt')mesh.rotation.x=-Math.PI/2;
    this.effects.push({mesh,start:this.clock,duration:kind==='bolt'?.28:kind==='pulse'?1.2:.75,kind,x:e.x,toX:e.toX??e.x,z:LANES[e.lane],side:e.side});
  }
  render(battle:Battle,dt:number,selected:boolean){
    this.clock+=dt;this.deployZone.visible=selected&&battle.phase==='playing';if(!selected)this.hoverRing.visible=false;
    const ids=new Set(battle.units.map(u=>u.id));for(const[id,v]of this.units)if(!ids.has(id)){this.scene.remove(v.group,v.bar,v.shield);this.disposeUnit(v);this.units.delete(id);}
    for(const u of battle.units){
      const v=this.units.get(u.id)||this.addUnit(u);v.unit=u;const z=LANES[u.lane]+((u.id%3)-1)*.32;
      const targetX=u.x;v.group.position.x=THREE.MathUtils.lerp(v.group.position.x||targetX,targetX,Math.min(1,dt*18));v.group.position.z=z;
      const born=Math.min(1,(battle.time-u.born)*3+.15);v.group.scale.setScalar(born);
      const d=v.group.userData,moving=u.state==='move'&&battle.phase==='playing',t=battle.time*9+u.id;
      d.leftLeg.rotation.x=moving?Math.sin(t)*.45:0;d.rightLeg.rotation.x=moving?-Math.sin(t)*.45:0;
      d.body.position.y=moving?Math.abs(Math.sin(t))*.06:Math.sin(this.clock*2+u.id)*.025;
      const strike=Math.max(0,1-(battle.time-u.attackAt)/.35);d.armR.rotation.x=-strike*1.5;d.armL.rotation.x=-strike*.4;
      d.cape.rotation.x=-.15+Math.sin(this.clock*3+u.id)*.08;
      v.bar.position.set(v.group.position.x,2.6,z);v.bar.quaternion.copy(this.camera.quaternion);v.bar.scale.x=.94*Math.max(.001,u.hp/u.maxHp);
      v.shield.position.copy(v.bar.position).add(new THREE.Vector3(0,.13,0));v.shield.quaternion.copy(this.camera.quaternion);v.shield.scale.x=.94*Math.min(1,u.shield/200);v.shield.visible=u.shield>0;
    }
    for(const t of battle.towers){const mesh=this.towerMeshes.get(t.id)!;mesh.scale.y=t.hp<=0?.22:1;mesh.rotation.z=t.hp<=0?.12:0;}
    this.coreCrystals.forEach((c,i)=>{c.rotation.y=this.clock*.35*(i===0?1:-1);c.position.y=2.25+Math.sin(this.clock*1.7+i)*.1;c.scale.set(.8,1.55,.8).multiplyScalar(battle.cores[i]<=0?.05:1);});
    for(const e of battle.events)if(e.id>this.lastEvent){this.effect(e);this.lastEvent=e.id;}
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i],p=(this.clock-e.start)/e.duration;
      if(p>=1){this.scene.remove(e.mesh);this.effects.splice(i,1);continue;}
      if(e.kind==='bolt'){e.mesh.position.x=THREE.MathUtils.lerp(e.x,e.toX,p);e.mesh.position.y=1.2+Math.sin(p*Math.PI)*.5;}
      else{e.mesh.scale.setScalar(e.kind==='pulse'?1+p*9:.2+p*2.4);e.mesh.position.y=.2+p*.45;}
    }
    this.syncUnitBatches();this.renderer.render(this.scene,this.camera);const info=this.renderer.info;this.stats={calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures};
  }
}
