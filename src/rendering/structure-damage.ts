import * as THREE from 'three';
import type { Tower } from '../core/types';
import type { ContentConfig } from '../data/content';
import { LANES } from '../data/map';

const vertex =
  'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fracture = `varying vec2 vUv; uniform float opacity;
void main(){
  vec2 p=vUv*2.-1.; float r=length(p), a=atan(p.y,p.x);
  float seam=abs(sin(a*6.+sin(r*19.)*.19));
  float line=1.-smoothstep(.015,.055+fwidth(seam),seam);
  float mask=smoothstep(.33,.48,r)*(1.-smoothstep(.88,1.,r));
  gl_FragColor=vec4(.035,.025,.02,line*mask*opacity);
  #include <colorspace_fragment>
}`;
const impact = `varying vec2 vUv; uniform float opacity; uniform float progress; uniform vec3 team;
void main(){
  vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);
  float radius=.24+progress*.5;
  float ring=1.-smoothstep(.035,.065+fwidth(r),abs(r-radius));
  float spokes=pow(abs(cos(a*4.)),24.)*(1.-smoothstep(.25,.9,r))*smoothstep(.05,.2,r);
  float mask=max(ring*.8,spokes)*(1.-smoothstep(.9,1.,r));
  gl_FragColor=vec4(mix(team,vec3(1.),.65),mask*opacity);
  #include <colorspace_fragment>
}`;

/** Six reusable, visual-only HP indicators; initial snapshots never replay a hit. */
export class StructureDamage {
  readonly root = new THREE.Group();
  private geometry = new THREE.PlaneGeometry(1, 1);
  private slots: {
    id: string;
    hp: number;
    age: number;
    cooldown: number;
    static: boolean;
    floor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    hit: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  }[] = [];
  private disposed = false;
  constructor() {
    this.root.name = 'StructureDamage';
    for (let i = 0; i < 6; i++) {
      const floor = new THREE.Mesh(
        this.geometry,
        new THREE.ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: fracture,
          uniforms: { opacity: { value: 0 } },
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      floor.name = 'TowerFoundationFractures';
      floor.rotation.x = -Math.PI / 2;
      const hit = new THREE.Mesh(
        this.geometry,
        new THREE.ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: impact,
          uniforms: { opacity: { value: 0 }, progress: { value: 0 }, team: { value: new THREE.Color() } },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      hit.name = 'TowerDamageImpact';
      hit.renderOrder = 12;
      floor.visible = hit.visible = false;
      this.slots.push({ id: '', hp: 0, age: Infinity, cooldown: 0, static: false, floor, hit });
      this.root.add(floor, hit);
    }
  }
  update(
    towers: readonly Tower[],
    height: number,
    dt: number,
    camera: THREE.Camera,
    vfx: ContentConfig['vfx'],
    reducedMotion = false,
  ) {
    if (this.disposed) return;
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const live = new Set(towers.map((t) => t.id));
    for (const slot of this.slots) if (!live.has(slot.id)) this.clear(slot);
    const style = vfx.readability?.events.hit;
    const duration = Math.min(0.35, vfx.readability?.maxDuration ?? 0.35);
    for (const tower of towers) {
      if (
        !Number.isFinite(tower.hp) ||
        !Number.isFinite(tower.maxHp) ||
        tower.maxHp <= 0 ||
        !Number.isFinite(tower.x) ||
        LANES[tower.lane] === undefined
      ) {
        const invalid = this.slots.find((slot) => slot.id === tower.id);
        if (invalid) this.clear(invalid);
        continue;
      }
      const slot = this.slots.find((s) => s.id === tower.id) ?? this.slots.find((s) => !s.id);
      if (!slot) continue;
      const initial = !slot.id;
      if (initial) {
        slot.id = tower.id;
        slot.hp = tower.hp;
      }
      slot.age += delta;
      slot.cooldown = Math.max(0, slot.cooldown - delta);
      if (tower.hp < slot.hp && slot.cooldown === 0) {
        slot.age = 0;
        slot.cooldown = style?.cooldown ?? 0.09;
        slot.static = reducedMotion;
      }
      slot.hp = tower.hp;
      if (reducedMotion) slot.static = true;
      const damage = 1 - THREE.MathUtils.clamp(tower.hp / tower.maxHp, 0, 1);
      slot.floor.position.set(tower.x, 0.085, LANES[tower.lane]);
      slot.floor.scale.set(3.5, 3.1, 1);
      slot.floor.material.uniforms.opacity.value = damage * (vfx.readability?.events.death.opacity ?? 0.6);
      slot.floor.visible = slot.floor.material.uniforms.opacity.value > 0;
      slot.hit.visible = !initial && slot.age < duration && (style?.opacity ?? 1) > 0;
      slot.hit.position.set(tower.x, 0.48 + height * 0.55, LANES[tower.lane]);
      slot.hit.quaternion.copy(camera.quaternion);
      slot.hit.scale.setScalar(1.6 * (style?.scale ?? 1));
      slot.hit.material.blending =
        style?.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
      const progress = THREE.MathUtils.clamp(slot.age / duration, 0, 1);
      slot.hit.material.uniforms.progress.value = slot.static ? 0.35 : progress;
      slot.hit.material.uniforms.opacity.value = (style?.opacity ?? 1) * (slot.static ? 0.65 : 1 - progress);
      slot.hit.material.uniforms.team.value.set(tower.side ? vfx.enemy : vfx.ally);
    }
  }
  private clear(slot: (typeof this.slots)[number]) {
    slot.id = '';
    slot.hp = 0;
    slot.age = Infinity;
    slot.cooldown = 0;
    slot.static = false;
    slot.floor.visible = slot.hit.visible = false;
  }
  reset() {
    this.slots.forEach((slot) => this.clear(slot));
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.root.removeFromParent();
    this.geometry.dispose();
    this.slots.forEach((slot) => {
      slot.floor.material.dispose();
      slot.hit.material.dispose();
    });
    this.root.clear();
  }
}
