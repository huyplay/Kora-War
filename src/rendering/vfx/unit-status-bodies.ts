import * as THREE from 'three';
import type { Unit } from '../../core/types';
import type { GameplayConfig } from '../../data/gameplay';
import type { UnitFeedbackProfile } from '../../data/unit-feedback';

/** One draw call, at most two envelopes per living unit. Reads snapshot status only. */
export class UnitStatusBodies {
  readonly root: THREE.InstancedMesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial>;
  private kinds = new THREE.InstancedBufferAttribute(new Float32Array(200), 1);
  private dummy = new THREE.Object3D();
  private profile?: UnitFeedbackProfile['bodies'];
  constructor() {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    geometry.setAttribute('bodyKind', this.kinds);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        frost: { value: new THREE.Color() },
        shield: { value: new THREE.Color() },
        opacity: { value: 0 },
        clock: { value: 0 },
        motion: { value: 1 },
      },
      vertexShader: `attribute float bodyKind;
        varying float vKind; varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
        void main(){
          vKind=bodyKind; vLocal=position;
          vec3 s=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
          vNormal=normalize(normalMatrix*(normal/max(s,vec3(.001))));
          vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);
          vView=-p.xyz; gl_Position=projectionMatrix*p;
        }`,
      fragmentShader: `uniform vec3 frost; uniform vec3 shield; uniform float opacity; uniform float clock; uniform float motion;
        varying float vKind; varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
        void main(){
          float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);
          float veins=smoothstep(.94,1.,abs(sin(vLocal.y*17.+vLocal.x*9.+vLocal.z*6.)));
          float pulse=1.+motion*.08*sin(clock*3.);
          vec3 c=vKind>.5?frost:shield;
          float a=vKind>.5?(.3+rim*.85+veins*.25):(.12+rim*1.6)*pulse;
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
  }
  configure(profile?: UnitFeedbackProfile['bodies']) {
    this.reset();
    this.profile = profile;
  }
  begin(config: GameplayConfig, clock: number, reducedMotion: boolean) {
    this.root.count = 0;
    const u = this.root.material.uniforms;
    u.frost.value.set(config.spells.ice.color);
    u.shield.value.set(config.spells.shield.color);
    u.opacity.value = this.profile?.opacity ?? 0;
    u.clock.value = clock;
    u.motion.value = reducedMotion ? 0 : 1;
  }
  add(unit: Unit, point: THREE.Vector3, height: number, radius: number, time: number) {
    if (
      !this.profile?.enabled ||
      unit.hp <= 0 ||
      ![height, radius, point.x, point.y, point.z].every(Number.isFinite) ||
      height <= 0 ||
      radius <= 0
    )
      return;
    for (const kind of [1, 0]) {
      if (kind ? (unit.frozenUntil ?? 0) <= time + 1e-8 : unit.shield <= 0) continue;
      if (this.root.count >= 200) break;
      const padding = 1 + this.profile.padding + (kind ? 0 : 0.05);
      this.dummy.position.set(point.x, point.y + height * 0.5 + 0.05, point.z);
      this.dummy.scale.set(radius * padding, height * 0.5 * padding, radius * padding);
      this.dummy.updateMatrix();
      this.root.setMatrixAt(this.root.count, this.dummy.matrix);
      this.kinds.setX(this.root.count++, kind);
    }
  }
  end() {
    this.root.instanceMatrix.needsUpdate = this.kinds.needsUpdate = true;
  }
  reset() {
    this.root.count = 0;
  }
  dispose() {
    this.reset();
    this.root.removeFromParent();
    this.root.geometry.dispose();
    this.root.material.dispose();
    this.root.dispose();
  }
}
