import * as THREE from 'three';
import type { Tower } from '../core/types';
import { LANES } from '../data/map';

interface HealthLabel {
  texture: THREE.Texture;
  write(text: string): void;
}
function healthLabel(): HealthLabel {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return {
    texture,
    write(text) {
      ctx.clearRect(0, 0, 512, 128);
      ctx.font = 'bold 74px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#0a1623';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText(text, 256, 42, 480);
      ctx.fillText(text, 256, 42, 480);
      texture.needsUpdate = true;
    },
  };
}

/** Six reusable billboards: authoritative HP, a delayed damage trail and crisp numeric labels. */
export class TowerHealthBars {
  readonly root = new THREE.Group();
  private geometry = new THREE.PlaneGeometry(1, 0.29);
  private slots: {
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    label: HealthLabel;
    id: string;
    text: string;
    ratio: number;
    trail: number;
    delay: number;
  }[] = [];
  private point = new THREE.Vector3();
  constructor(factory: () => HealthLabel = healthLabel) {
    this.root.name = 'TowerHealthBars';
    for (let i = 0; i < 6; i++) {
      const label = factory();
      const material = new THREE.ShaderMaterial({
        uniforms: {
          label: { value: label.texture },
          hp: { value: 1 },
          trail: { value: 1 },
          team: { value: new THREE.Color() },
        },
        vertexShader:
          'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `uniform sampler2D label; uniform float hp; uniform float trail; uniform vec3 team; varying vec2 vUv;
          void main(){
            vec4 glyph=texture2D(label,vUv);
            vec4 bar=vec4(0.);
            if(vUv.x>.015 && vUv.x<.985 && vUv.y>.025 && vUv.y<.32){
              bar=vec4(.025,.045,.07,1.);
              if(vUv.x>.04 && vUv.x<.96 && vUv.y>.075 && vUv.y<.27){
                float x=(vUv.x-.04)/.92;
                vec3 c=vec3(.065,.10,.14);
                if(x<trail)c=vec3(1.,.62,.22);
                if(x<hp)c=team*mix(.75,1.15,(vUv.y-.075)/.195);
                if(abs(fract(x*4.)-.5)>.485)c*=.6;
                bar=vec4(c,1.);
              }
            }
            gl_FragColor=mix(bar,glyph,glyph.a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.name = 'TowerHealth';
      mesh.visible = false;
      mesh.renderOrder = 25;
      this.root.add(mesh);
      this.slots.push({ mesh, label, id: '', text: '', ratio: 1, trail: 1, delay: 0 });
    }
  }
  update(
    towers: readonly Tower[],
    height: number,
    dt: number,
    camera: THREE.PerspectiveCamera,
    viewportHeight: number,
  ) {
    const live = new Set(towers.map((t) => t.id));
    for (const slot of this.slots)
      if (!live.has(slot.id)) {
        slot.id = '';
        slot.mesh.visible = false;
      }
    for (const tower of towers) {
      const slot = this.slots.find((s) => s.id === tower.id) ?? this.slots.find((s) => !s.id);
      if (!slot) continue;
      slot.id = tower.id;
      slot.mesh.visible = tower.hp > 0 && tower.maxHp > 0;
      if (!slot.mesh.visible) continue;
      const ratio = THREE.MathUtils.clamp(tower.hp / tower.maxHp, 0, 1);
      if (ratio < slot.ratio) {
        slot.trail = Math.max(slot.ratio, slot.trail);
        slot.delay = 0.32;
      } else if (ratio > slot.ratio) slot.trail = ratio;
      slot.ratio = ratio;
      if (slot.delay > 0) slot.delay = Math.max(0, slot.delay - Math.max(0, dt));
      else slot.trail = Math.max(ratio, slot.trail - Math.max(0, dt) * 0.8);
      const text = `${Math.ceil(tower.hp)} / ${Math.ceil(tower.maxHp)}`;
      if (slot.text !== text) {
        slot.text = text;
        slot.label.write(text);
      }
      const { mesh } = slot;
      mesh.userData.health = text;
      mesh.position.set(tower.x, height + 0.85, LANES[tower.lane]);
      mesh.quaternion.copy(camera.quaternion);
      const depth = Math.max(
        1,
        Math.abs(this.point.copy(mesh.position).applyMatrix4(camera.matrixWorldInverse).z),
      );
      const perPixel =
        (2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
        (camera.zoom * Math.max(1, viewportHeight));
      mesh.scale.setScalar(perPixel * 72);
      mesh.material.uniforms.hp.value = ratio;
      mesh.material.uniforms.trail.value = slot.trail;
      mesh.material.uniforms.team.value.setHex(tower.side ? 0xff586d : 0x39c8ff);
    }
  }
  reset() {
    for (const slot of this.slots) {
      slot.id = '';
      slot.ratio = slot.trail = 1;
      slot.delay = 0;
      slot.mesh.visible = false;
    }
  }
  dispose() {
    this.root.removeFromParent();
    this.geometry.dispose();
    for (const slot of this.slots) {
      slot.label.texture.dispose();
      slot.mesh.material.dispose();
    }
  }
}
