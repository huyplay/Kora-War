import * as THREE from 'three';
import type { Unit } from '../core/types';

/** Presentation priority only: one control marker plus independent shield/buff/debuff markers. */
export function unitStatusGlyphs(unit: Unit, time: number) {
  const active = (until = 0) => until > time + 1e-8;
  const control = active(unit.frozenUntil)
    ? 1
    : active(unit.stunUntil)
      ? 2
      : active(unit.slowUntil) && unit.slowFactor < 1
        ? 3
        : 0;
  return [
    control,
    unit.shield > 0 ? 4 : 0,
    active(unit.hasteUntil) ? 5 : 0,
    active(unit.weakenUntil) ? 6 : 0,
  ].filter(Boolean);
}

// Original vector glyphs drawn once into one small atlas, shared by every unit.
function statusAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 448;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const colors = ['', '#86e7ff', '#ffdd82', '#8db5ff', '#ffe5a3', '#8fffc3', '#d6a6ff'];
  for (let glyph = 1; glyph <= 6; glyph++) {
    ctx.save();
    ctx.translate(glyph * 64, 0);
    ctx.fillStyle = '#10212dee';
    ctx.strokeStyle = colors[glyph];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 56, 56, 12);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (glyph === 1) {
      for (let arm = 0; arm < 6; arm++) {
        const a = (arm * Math.PI) / 3;
        const x = Math.cos(a),
          y = Math.sin(a);
        ctx.moveTo(32, 32);
        ctx.lineTo(32 + x * 19, 32 + y * 19);
        for (const sign of [-1, 1]) {
          ctx.moveTo(32 + x * 12, 32 + y * 12);
          ctx.lineTo(32 + x * 8 - y * sign * 6, 32 + y * 8 + x * sign * 6);
        }
      }
    } else if (glyph === 2) {
      for (let arm = 0; arm < 10; arm++) {
        const a = -Math.PI / 2 + (arm * Math.PI) / 5,
          r = arm % 2 ? 9 : 21;
        const x = 32 + Math.cos(a) * r,
          y = 32 + Math.sin(a) * r;
        if (!arm) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (glyph === 3) {
      ctx.moveTo(17, 24);
      ctx.lineTo(32, 36);
      ctx.lineTo(47, 24);
      ctx.moveTo(17, 36);
      ctx.lineTo(32, 48);
      ctx.lineTo(47, 36);
    } else if (glyph === 4) {
      ctx.moveTo(32, 13);
      ctx.lineTo(49, 20);
      ctx.lineTo(46, 37);
      ctx.quadraticCurveTo(43, 44, 32, 51);
      ctx.quadraticCurveTo(21, 44, 18, 37);
      ctx.lineTo(15, 20);
      ctx.closePath();
    } else if (glyph === 5) {
      ctx.moveTo(17, 29);
      ctx.lineTo(32, 16);
      ctx.lineTo(47, 29);
      ctx.moveTo(17, 43);
      ctx.lineTo(32, 30);
      ctx.lineTo(47, 43);
    } else {
      ctx.moveTo(19, 16);
      ctx.lineTo(45, 43);
      ctx.moveTo(16, 36);
      ctx.lineTo(28, 48);
      ctx.moveTo(22, 42);
      ctx.lineTo(32, 32);
      ctx.moveTo(16, 16);
      ctx.lineTo(48, 48);
    }
    ctx.stroke();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/** One draw call, 100 reusable slots. Reads HP/status from snapshots; never alters combat. */
export class UnitOverlays {
  readonly root: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private health = new THREE.InstancedBufferAttribute(new Float32Array(100 * 4), 4);
  private status = new THREE.InstancedBufferAttribute(new Float32Array(100 * 4), 4);
  private dummy = new THREE.Object3D();
  private point = new THREE.Vector3();
  private texture: THREE.Texture;
  constructor(texture?: THREE.Texture) {
    this.texture = texture ?? statusAtlas();
    const geometry = new THREE.PlaneGeometry(1, 0.5);
    geometry.setAttribute('healthData', this.health);
    geometry.setAttribute('statusData', this.status);
    const material = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: this.texture } },
      vertexShader: `attribute vec4 healthData; attribute vec4 statusData;
        varying vec2 vUv; varying vec4 vHealth; varying vec4 vStatus;
        void main(){ vUv=uv; vHealth=healthData; vStatus=statusData;
          gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D atlas; varying vec2 vUv; varying vec4 vHealth; varying vec4 vStatus;
        void main(){
          vec4 color=vec4(0.);
          if(vUv.x>.015 && vUv.x<.985 && vUv.y>.04 && vUv.y<.39){
            color=vec4(.025,.045,.07,1.);
            if(vUv.x>.04 && vUv.x<.96 && vUv.y>.10 && vUv.y<.33){
              float x=(vUv.x-.04)/.92;
              vec3 c=vec3(.09,.13,.19);
              if(x<vHealth.y)c=vec3(1.,.65,.26);
              if(x<vHealth.x)c=mix(vec3(.12,.72,1.),vec3(1.,.23,.33),vHealth.w)*mix(.85,1.2,(vUv.y-.1)/.23);
              if(abs(fract(x*4.)-.5)>.485)c*=.6;
              color=vec4(c,1.);
            }
            if(vHealth.z>0. && vUv.y>.34 && vUv.y<.39 && vUv.x>.04 && vUv.x<.04+.92*vHealth.z)
              color=vec4(1.,.89,.61,1.);
          }
          if(vUv.y>.45 && vUv.y<.95){
            float column=floor(vUv.x*4.);
            float glyph=column<1.?vStatus.x:column<2.?vStatus.y:column<3.?vStatus.z:vStatus.w;
            if(glyph>0.)color=texture2D(atlas,vec2((glyph+fract(vUv.x*4.))/7.,(vUv.y-.45)/.5));
          }
          if(color.a<.01)discard;
          gl_FragColor=color;
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.root = new THREE.InstancedMesh(geometry, material, 100);
    this.root.name = 'UnitHealthAndStatus';
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.renderOrder = 24;
    for (const attribute of [this.health, this.status, this.root.instanceMatrix])
      attribute.setUsage(THREE.DynamicDrawUsage);
  }
  begin() {
    this.root.count = 0;
  }
  add(
    unit: Unit,
    position: THREE.Vector3,
    barY: number,
    trailHp: number,
    time: number,
    camera: THREE.PerspectiveCamera,
    viewportHeight: number,
  ) {
    if (unit.hp <= 0 || unit.maxHp <= 0 || this.root.count >= 100) return;
    this.dummy.position.set(position.x, barY, position.z);
    this.point.copy(this.dummy.position).applyMatrix4(camera.matrixWorldInverse);
    if (this.point.z >= -camera.near) return;
    const perPixel =
      (2 * -this.point.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
      (camera.zoom * Math.max(1, viewportHeight));
    this.dummy.quaternion.copy(camera.quaternion);
    this.dummy.scale.setScalar(perPixel * (viewportHeight <= 450 ? 36 : 44));
    this.dummy.updateMatrix();
    const index = this.root.count++;
    this.root.setMatrixAt(index, this.dummy.matrix);
    const clamp = (v: number) => THREE.MathUtils.clamp(v / unit.maxHp, 0, 1);
    this.health.setXYZW(
      index,
      clamp(unit.hp),
      Math.max(clamp(unit.hp), clamp(trailHp)),
      clamp(unit.shield),
      unit.side,
    );
    const glyphs = unitStatusGlyphs(unit, time);
    this.status.setXYZW(index, glyphs[0] ?? 0, glyphs[1] ?? 0, glyphs[2] ?? 0, glyphs[3] ?? 0);
  }
  end() {
    this.root.instanceMatrix.needsUpdate = this.health.needsUpdate = this.status.needsUpdate = true;
  }
  reset() {
    this.begin();
  }
  dispose() {
    this.reset();
    this.root.removeFromParent();
    this.root.geometry.dispose();
    this.root.material.dispose();
    this.texture.dispose();
    this.root.dispose();
  }
}
