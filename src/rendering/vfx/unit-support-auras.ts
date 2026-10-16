import * as THREE from 'three';
import type { Unit } from '../../core/types';
import type { GameplayConfig } from '../../data/gameplay';
import type { VfxReadability } from '../../data/vfx-readability';

export interface SupportPoint {
  x: number;
  y?: number;
  z: number;
  radius: number;
}
type Style = VfxReadability['events']['skill'];
/** Snapshot-only floor glyphs: one shared draw for up to two marks on each of 100 units. */
export class UnitSupportAuras {
  readonly root: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private data = new THREE.InstancedBufferAttribute(new Float32Array(200 * 3), 3);
  private dummy = new THREE.Object3D();
  private style?: Style;
  private disposed = false;
  constructor() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    geometry.setAttribute('supportData', this.data);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        haste: { value: new THREE.Color() },
        weaken: { value: new THREE.Color() },
        opacity: { value: 0 },
        clock: { value: 0 },
        motion: { value: 1 },
      },
      vertexShader: `attribute vec3 supportData; varying vec3 vData; varying vec2 vUv;
        void main(){vData=supportData;vUv=uv;
          gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform vec3 haste;uniform vec3 weaken;uniform float opacity;uniform float clock;uniform float motion;
        varying vec3 vData;varying vec2 vUv;
        float line(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
        void main(){
          vec2 p=vUv*2.-1.;float r=length(p);float ink=0.;vec3 color;
          if(vData.x<.5){
            p.x*=vData.y;
            p.x-=motion*.07*sin(clock*4.+vData.z);
            float distanceToMark=2.;
            for(int i=0;i<3;i++){
              float x=-.65+float(i)*.43;
              distanceToMark=min(distanceToMark,min(line(p,vec2(x,-.28),vec2(x+.25,0.)),
                line(p,vec2(x,.28),vec2(x+.25,0.))));
            }
            ink=1.-smoothstep(.035,.07,distanceToMark);color=haste;
          }else{
            float angle=atan(p.y,p.x+.00001);
            float gap=smoothstep(.28,.48,abs(sin(angle*3.)));
            float ring=(1.-smoothstep(.035,.065,abs(r-.68)))*gap;
            float rune=min(line(p,vec2(-.23,.2),vec2(0.,-.24)),line(p,vec2(.23,.2),vec2(0.,-.24)));
            ink=max(ring,1.-smoothstep(.035,.07,rune));color=weaken;
          }
          float pulse=1.+motion*.08*sin(clock*3.+vData.z);
          float alpha=ink*opacity*pulse;
          if(alpha<.005)discard;
          gl_FragColor=vec4(color,alpha);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.root = new THREE.InstancedMesh(geometry, material, 200);
    this.root.name = 'UnitSupportAuras';
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.renderOrder = 3;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.data.setUsage(THREE.DynamicDrawUsage);
  }
  get managed() {
    return !!this.style && !this.disposed;
  }
  configure(style?: Style) {
    if (this.disposed) return;
    this.reset();
    this.style = style;
    this.root.material.blending = style?.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
  }
  begin(config: GameplayConfig, clock: number, reduced = false) {
    if (this.disposed) return;
    this.root.count = 0;
    const uniforms = this.root.material.uniforms;
    uniforms.haste.value.set(config.spells.haste.color);
    uniforms.weaken.value.set(config.spells.weaken.color);
    uniforms.opacity.value = this.style?.opacity ?? 0;
    if (Number.isFinite(clock)) uniforms.clock.value = clock;
    uniforms.motion.value = reduced ? 0 : 1;
  }
  add(unit: Unit, point: SupportPoint, time: number) {
    if (
      !this.managed ||
      !this.style?.opacity ||
      unit.hp <= 0 ||
      ![unit.hp, unit.id, time, point.x, point.y ?? 0, point.z, point.radius].every(Number.isFinite) ||
      point.radius <= 0
    )
      return;
    for (const kind of [0, 1]) {
      const until = kind ? unit.weakenUntil : unit.hasteUntil;
      if (!Number.isFinite(until) || (until ?? 0) <= time + 1e-8 || this.root.count >= 200) continue;
      const size =
        THREE.MathUtils.clamp(point.radius * 1.35 * this.style.scale, 0.3, 1.6) * (kind ? 1.15 : 1);
      this.dummy.position.set(point.x, (point.y ?? 0) + 0.29 + kind * 0.012, point.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0);
      this.dummy.scale.set(size, size, 1);
      this.dummy.updateMatrix();
      this.root.setMatrixAt(this.root.count, this.dummy.matrix);
      this.data.setXYZ(this.root.count++, kind, unit.side ? -1 : 1, ((unit.id % 97) / 97) * Math.PI * 2);
    }
  }
  end(parent: THREE.Group) {
    if (this.disposed) return;
    this.root.instanceMatrix.needsUpdate = this.data.needsUpdate = true;
    if (this.root.count) {
      if (this.root.parent !== parent) parent.add(this.root);
    } else this.root.removeFromParent();
  }
  reset() {
    this.root.count = 0;
    this.root.material.uniforms.clock.value = 0;
    this.root.removeFromParent();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.root.geometry.dispose();
    this.root.material.dispose();
    this.root.dispose();
  }
}
