import * as THREE from 'three';
import type { GameEvent, SkillTarget } from '../../core/types';
import type { ContentConfig } from '../../data/content';
import type { Hero } from '../../data/types';
import { LANES } from '../../data/map';
import type { combatEventAnchors } from '../combat-anchors';

export interface SkillPoint {
  x: number;
  y?: number;
  z: number;
  height?: number;
}
const kinds: SkillTarget['effects'] = ['damage', 'heal', 'shield', 'slow', 'stun'];
const finite = (p: SkillPoint) =>
  [p.x, p.y ?? 0, p.z, p.height ?? 2.4].every(Number.isFinite) && (p.height ?? 2.4) > 0;
interface Cue {
  active: boolean;
  unitId: number;
  age: number;
  point: SkillPoint;
  effects: number[];
  color: THREE.Color;
  side: number;
  reduced: boolean;
  rise: number;
}
/** Confirmed recipients only. A single shared draw bounds even many simultaneous multi-target skills. */
export class SkillTargetEffects {
  readonly root: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private data = new THREE.InstancedBufferAttribute(new Float32Array(160 * 2), 2);
  private cues: Cue[] = Array.from({ length: 32 }, () => ({
    active: false,
    unitId: 0,
    age: 0,
    point: { x: 0, z: 0 },
    effects: [],
    color: new THREE.Color(),
    side: 0,
    reduced: false,
    rise: 0,
  }));
  private profile?: ContentConfig['vfx'];
  private heroes = new Map<string, number>();
  private heights = new Map<string, number>();
  private seen = new Set<number>();
  private lastCast = new Map<number, number>();
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private viewPoint = new THREE.Vector3();
  private disposed = false;
  constructor() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    geometry.setAttribute('skillData', this.data);
    const material = new THREE.ShaderMaterial({
      vertexShader: `attribute vec2 skillData; varying vec2 vData; varying vec2 vUv; varying vec3 vColor;
        void main(){vData=skillData;vUv=uv;vColor=instanceColor;
          gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vData;varying vec2 vUv;varying vec3 vColor;
        float line(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
        void main(){vec2 p=vUv*2.-1.;float d=2.;
          if(vData.x<.5){
            d=min(line(p,vec2(-.65,-.3),vec2(.55,.3)),line(p,vec2(-.25,.6),vec2(.25,-.6)));
            d=min(d,line(p,vec2(-.68,.32),vec2(-.38,.32)));
          }else if(vData.x<1.5){
            d=min(line(p,vec2(-.55,0.),vec2(.55,0.)),line(p,vec2(0.,-.55),vec2(0.,.55)));
          }else if(vData.x<2.5){
            d=min(line(p,vec2(-.5,.55),vec2(.5,.55)),line(p,vec2(-.5,.55),vec2(-.42,-.1)));
            d=min(d,line(p,vec2(.5,.55),vec2(.42,-.1)));
            d=min(d,min(line(p,vec2(-.42,-.1),vec2(0.,-.65)),line(p,vec2(.42,-.1),vec2(0.,-.65))));
          }else if(vData.x<3.5){
            for(int i=0;i<2;i++){float y=.4-float(i)*.4;
              d=min(d,min(line(p,vec2(-.45,y),vec2(0.,y-.32)),line(p,vec2(.45,y),vec2(0.,y-.32))));}
          }else{
            for(int i=0;i<10;i++){float a=1.5708+float(i)*.6283185;float b=a+.6283185;
              float r=mod(float(i),2.)<.5?.65:.28;float s=mod(float(i),2.)<.5?.28:.65;
              d=min(d,line(p,vec2(cos(a),sin(a))*r,vec2(cos(b),sin(b))*s));}
          }
          float ink=1.-smoothstep(.045,.075,d);float edge=1.-smoothstep(.085,.12,d);
          float alpha=edge*vData.y;if(alpha<.005)discard;
          gl_FragColor=vec4(mix(vec3(.025,.035,.05),vColor,ink),alpha);
          #include <colorspace_fragment>
        }`,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.root = new THREE.InstancedMesh(geometry, material, 160);
    this.root.name = 'HeroSkillRecipients';
    this.root.setColorAt(0, this.color);
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    this.data.setUsage(THREE.DynamicDrawUsage);
    this.root.renderOrder = 24;
  }
  configure(profile: ContentConfig['vfx'], heroes: readonly Hero[], models: ContentConfig['models'] = {}) {
    if (this.disposed) return;
    this.reset();
    this.profile = profile;
    this.heroes = new Map(heroes.map((hero) => [hero.id, hero.accent]));
    this.heights = new Map(Object.entries(models).map(([id, binding]) => [id, binding.height]));
    this.root.material.blending =
      profile.readability?.events.skill.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
  }
  emit(
    event: GameEvent,
    anchors: ReturnType<typeof combatEventAnchors> | undefined,
    now: number,
    reduced = false,
  ) {
    const readability = this.profile?.readability,
      style = readability?.events.skill;
    if (
      this.disposed ||
      !readability ||
      !style?.opacity ||
      event.type !== 'skill' ||
      !event.heroId ||
      event.sourceId === undefined ||
      !event.skillTargets ||
      this.seen.has(event.id) ||
      ![now, event.time, event.id, event.sourceId].every(Number.isFinite)
    )
      return false;
    const age = now - event.time;
    if (
      age < -1e-8 ||
      age >= readability.maxDuration ||
      event.time - (this.lastCast.get(event.sourceId) ?? -Infinity) < style.cooldown - 1e-8
    )
      return false;
    this.seen.add(event.id);
    this.lastCast.set(event.sourceId, event.time);
    if (this.seen.size > 128) this.seen.delete(this.seen.values().next().value!);
    if (this.lastCast.size > 128) this.lastCast.delete(this.lastCast.keys().next().value!);
    let added = false;
    for (const trace of event.skillTargets) {
      if (!Number.isFinite(trace.unitId) || ![0, 1].includes(trace.side) || !Array.isArray(trace.effects))
        continue;
      const anchor = anchors?.recipients?.find((item) => item.trace.unitId === trace.unitId)?.anchor;
      const point: SkillPoint = anchor
        ? { ...anchor.position, height: (this.heights.get(anchor.unit.heroId) ?? 2.4) * anchor.scale }
        : { x: trace.x, z: LANES[event.lane], height: 2.4 };
      if (!finite(point)) continue;
      if (
        this.cues.filter(
          (cue) =>
            cue.active && Math.hypot(cue.point.x - point.x, cue.point.z - point.z) < readability.areaRadius,
        ).length >= readability.maxPerArea
      )
        continue;
      const cue = this.cues.find((cue) => !cue.active);
      if (!cue) break;
      const effects = kinds.map((kind, i) => (trace.effects.includes(kind) ? i : -1)).filter((i) => i >= 0);
      if (!effects.length) continue;
      Object.assign(cue, {
        active: true,
        unitId: trace.unitId,
        age: Math.max(0, age),
        point,
        effects,
        side: trace.side,
        reduced,
        rise: 0,
      });
      cue.color.set(this.heroes.get(event.heroId) ?? (event.side ? this.profile!.enemy : this.profile!.ally));
      added = true;
    }
    return added;
  }
  update(
    dt: number,
    camera: THREE.Camera,
    position?: (id: number) => SkillPoint | undefined,
    reduced = false,
    viewportHeight = 0,
  ) {
    if (this.disposed) return;
    dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const readability = this.profile?.readability,
      style = readability?.events.skill;
    this.root.count = 0;
    if (!readability || !style) return;
    for (const cue of this.cues) {
      if (!cue.active) continue;
      cue.age += dt;
      if (cue.age >= readability.maxDuration) {
        cue.active = false;
        continue;
      }
      cue.reduced ||= reduced;
      const next = dt > 0 ? position?.(cue.unitId) : undefined;
      if (next && finite(next)) cue.point = next;
      const point = cue.point,
        height = point.height ?? 2.4;
      if (!cue.reduced) cue.rise = Math.sin((cue.age / readability.maxDuration) * Math.PI) * 0.12;
      const rise = cue.rise;
      // A body-space mark must remain readable when the arena camera is far away.
      let pixelSize = 0;
      if (camera instanceof THREE.PerspectiveCamera && viewportHeight > 0) {
        const depth = Math.abs(
          this.viewPoint
            .set(point.x, (point.y ?? 0) + height * 0.55, point.z)
            .applyMatrix4(camera.matrixWorldInverse).z,
        );
        pixelSize = (2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) / viewportHeight;
      }
      const size = THREE.MathUtils.clamp(Math.max(height * 0.24, pixelSize * 13) * style.scale, 0.25, 1.2);
      const opacity = style.opacity * Math.min(1, (1 - cue.age / readability.maxDuration) * 3);
      for (const kind of cue.effects) {
        const ratio = [0.52, 0.7, 0.58, 0.16, 1.12][kind];
        this.dummy.position.set(point.x, (point.y ?? 0) + height * ratio + rise, point.z);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.setScalar(size);
        this.dummy.updateMatrix();
        const index = this.root.count++;
        this.root.setMatrixAt(index, this.dummy.matrix);
        this.color.copy(cue.color);
        if (kind === 1) this.color.set(this.profile!.heal);
        if (kind === 2) this.color.set(cue.side ? this.profile!.enemy : this.profile!.ally);
        this.root.setColorAt(index, this.color);
        this.data.setXY(index, kind, opacity);
      }
    }
    this.root.instanceMatrix.needsUpdate =
      this.root.instanceColor!.needsUpdate =
      this.data.needsUpdate =
        true;
  }
  get activeCount() {
    return this.cues.filter((cue) => cue.active).length;
  }
  reset() {
    for (const cue of this.cues) cue.active = false;
    this.root.count = 0;
    this.seen.clear();
    this.lastCast.clear();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.root.removeFromParent();
    this.root.geometry.dispose();
    this.root.material.dispose();
    this.root.dispose();
  }
}
