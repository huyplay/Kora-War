import * as THREE from 'three';

interface Label {
  text: string;
  x: number;
  y: number;
  z: number;
  age: number;
  heal: boolean;
  drift: number;
}
const GLYPHS = '0123456789+';
function numberAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 92px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#12222b';
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < GLYPHS.length; i++) {
    const x = ((i + 0.5) * canvas.width) / GLYPHS.length;
    ctx.strokeText(GLYPHS[i], x, 68);
    ctx.fillText(GLYPHS[i], x, 68);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
/** Shared glyph atlas and a bounded instanced pool; never creates textures during combat. */
export class FloatingNumbers {
  readonly root: THREE.InstancedMesh;
  private labels: Label[] = [];
  private texture: THREE.Texture;
  private dummy = new THREE.Object3D();
  private right = new THREE.Vector3();
  private color = new THREE.Color();
  private glyph = new THREE.InstancedBufferAttribute(new Float32Array(160), 1);
  private alpha = new THREE.InstancedBufferAttribute(new Float32Array(160), 1);
  constructor(texture?: THREE.Texture) {
    this.texture = texture ?? numberAtlas();
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('glyph', this.glyph);
    geometry.setAttribute('labelAlpha', this.alpha);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nattribute float glyph; attribute float labelAlpha; varying float vLabelAlpha;',
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\nvMapUv.x = (vMapUv.x + glyph) / ${GLYPHS.length.toFixed(1)}; vLabelAlpha = labelAlpha;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying float vLabelAlpha;',
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\ndiffuseColor.a *= vLabelAlpha;',
      );
    };
    material.customProgramCacheKey = () => 'kora-combat-number-atlas-v1';
    this.root = new THREE.InstancedMesh(geometry, material, 160);
    this.root.name = 'CombatNumbers';
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glyph.setUsage(THREE.DynamicDrawUsage);
    this.alpha.setUsage(THREE.DynamicDrawUsage);
    this.root.renderOrder = 5;
  }
  emit(value: number, position: THREE.Vector3, heal = false) {
    if (!Number.isFinite(value) || value < 1 || this.labels.length >= 32) return;
    const text = `${heal ? '+' : ''}${Math.min(9999, Math.round(value))}`;
    this.labels.push({
      text,
      x: position.x,
      y: position.y,
      z: position.z,
      age: 0,
      heal,
      drift: ((this.labels.length % 3) - 1) * 0.12,
    });
  }
  update(dt: number, camera: THREE.Camera) {
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    let count = 0;
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const label = this.labels[i];
      label.age += dt;
      if (label.age >= 0.75) {
        this.labels.splice(i, 1);
        continue;
      }
      const p = label.age / 0.75,
        pop = 1 + Math.sin(Math.min(1, p * 4) * Math.PI) * 0.15;
      for (let n = 0; n < label.text.length; n++) {
        this.dummy.position.set(label.x, label.y + p * 0.75, label.z);
        this.dummy.position.addScaledVector(
          this.right,
          (n - (label.text.length - 1) / 2) * 0.17 + label.drift * p,
        );
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.set(0.27 * pop, 0.4 * pop, 1);
        this.dummy.updateMatrix();
        this.root.setMatrixAt(count, this.dummy.matrix);
        this.color.setHex(label.heal ? 0x8affbe : 0xffe1ad);
        this.root.setColorAt(count, this.color);
        this.glyph.setX(count, GLYPHS.indexOf(label.text[n]));
        this.alpha.setX(count++, Math.min(1, (1 - p) * 3));
      }
    }
    this.root.count = count;
    this.root.instanceMatrix.needsUpdate = true;
    if (this.root.instanceColor) this.root.instanceColor.needsUpdate = true;
    this.glyph.needsUpdate = this.alpha.needsUpdate = true;
  }
  get activeCount() {
    return this.labels.length;
  }
  reset() {
    this.labels = [];
    this.root.count = 0;
  }
  dispose() {
    this.reset();
    this.root.removeFromParent();
    this.root.geometry.dispose();
    (this.root.material as THREE.Material).dispose();
    this.texture.dispose();
    this.root.dispose();
  }
}
