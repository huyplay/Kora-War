import * as THREE from 'three';
import type { Unit } from '../../core/types';
import type { GameplayConfig } from '../../data/gameplay';
import type { UnitFeedbackProfile } from '../../data/unit-feedback';

/** One draw call, at most two envelopes per living unit. Reads snapshot status only. */
export class UnitStatusBodies {
  readonly root: THREE.InstancedMesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial>;
  private kinds = new THREE.InstancedBufferAttribute(new Float32Array(200), 1);
  private phases = new THREE.InstancedBufferAttribute(new Float32Array(200), 1);
  private dummy = new THREE.Object3D();
  private profile?: UnitFeedbackProfile['bodies'];
  private disposed = false;
  constructor() {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    geometry.setAttribute('bodyKind', this.kinds);
    geometry.setAttribute('bodyPhase', this.phases);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        frost: { value: new THREE.Color() },
        shield: { value: new THREE.Color() },
        opacity: { value: 0 },
        clock: { value: 0 },
        motion: { value: 1 },
      },
      vertexShader: `attribute float bodyKind; attribute float bodyPhase;
        varying float vKind; varying float vPhase; varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
        void main(){
          vKind=bodyKind; vPhase=bodyPhase; vLocal=position;
          vec3 s=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
          vNormal=normalize(normalMatrix*(normal/max(s,vec3(.001))));
          vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);
          vView=-p.xyz; gl_Position=projectionMatrix*p;
        }`,
      fragmentShader: `uniform vec3 frost; uniform vec3 shield; uniform float opacity; uniform float clock; uniform float motion;
        varying float vKind; varying float vPhase; varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
        float seam(float value, float width) {
          float distanceToLine=abs(fract(value+.5)-.5);
          return 1.-smoothstep(0.,width+fwidth(value),distanceToLine);
        }
        void main(){
          float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);
          vec3 local=normalize(vLocal);
          vec3 c;
          float a;
          if(vKind>.5) {
            // Branching crystal seams and a frosted base remain still while the unit is frozen.
            float warp=sin(local.z*8.+vPhase)*.16;
            float cracks=max(seam(local.y*3.+local.x*2.+warp,.045),
              seam(local.z*3.-local.y*2.+sin(local.x*7.+vPhase)*.13,.035));
            float base=1.-smoothstep(-.8,.25,local.y);
            c=mix(frost,vec3(1.),.28*cracks+.12*base);
            a=.09+rim*.85+cracks*.38+base*.12;
          } else {
            // Three seam directions form a small triangular energy lattice on the shell.
            float angle=atan(local.z,local.x+.00001)*1.909859;
            float rows=local.y*4.;
            float grid=max(seam(rows,.035),max(seam(angle+rows*.5+vPhase,.035),
              seam(angle-rows*.5+vPhase,.035)));
            float sweep=motion*pow(max(0.,cos(local.y*4.-clock*2.+vPhase)),16.);
            float pulse=1.+motion*.06*sin(clock*3.+vPhase);
            c=mix(shield,vec3(1.),grid*.16+sweep*.22);
            a=(.035+rim*1.25+grid*.2+sweep*.18)*pulse;
          }
          gl_FragColor=vec4(c,clamp(opacity*a,0.,.8));
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.root = new THREE.InstancedMesh(geometry, material, 200);
    this.root.name = 'UnitFreezeAndShieldBodies';
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.renderOrder = 4;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.kinds.setUsage(THREE.DynamicDrawUsage);
    this.phases.setUsage(THREE.DynamicDrawUsage);
  }
  configure(profile?: UnitFeedbackProfile['bodies']) {
    if (this.disposed) return;
    this.reset();
    this.profile = profile;
  }
  begin(config: GameplayConfig, clock: number, reducedMotion: boolean) {
    if (this.disposed) return;
    this.root.count = 0;
    const u = this.root.material.uniforms;
    u.frost.value.set(config.spells.ice.color);
    u.shield.value.set(config.spells.shield.color);
    u.opacity.value = this.profile?.opacity ?? 0;
    if (Number.isFinite(clock)) u.clock.value = clock;
    u.motion.value = reducedMotion ? 0 : 1;
  }
  add(unit: Unit, point: THREE.Vector3, height: number, radius: number, time: number) {
    if (
      !this.profile?.enabled ||
      this.disposed ||
      unit.hp <= 0 ||
      !Number.isFinite(time) ||
      !Number.isFinite(unit.hp) ||
      !Number.isFinite(unit.id) ||
      ![height, radius, point.x, point.y, point.z].every(Number.isFinite) ||
      height <= 0 ||
      radius <= 0
    )
      return;
    for (const kind of [1, 0]) {
      const active = kind
        ? Number.isFinite(unit.frozenUntil) && (unit.frozenUntil ?? 0) > time + 1e-8
        : Number.isFinite(unit.shield) && unit.shield > 0;
      if (!active) continue;
      if (this.root.count >= 200) break;
      const padding = 1 + this.profile.padding + (kind ? 0 : 0.05);
      this.dummy.position.set(point.x, point.y + height * 0.5 + 0.05, point.z);
      this.dummy.scale.set(radius * padding, height * 0.5 * padding, radius * padding);
      this.dummy.updateMatrix();
      this.root.setMatrixAt(this.root.count, this.dummy.matrix);
      this.kinds.setX(this.root.count, kind);
      // Stable under snapshot order changes; no random source or mutable combat state.
      this.phases.setX(this.root.count++, ((unit.id % 97) / 97) * Math.PI * 2);
    }
  }
  end() {
    if (this.disposed) return;
    this.root.instanceMatrix.needsUpdate = this.kinds.needsUpdate = this.phases.needsUpdate = true;
  }
  reset() {
    this.root.count = 0;
    this.root.material.uniforms.clock.value = 0;
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
