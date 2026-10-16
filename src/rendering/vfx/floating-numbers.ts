import * as THREE from 'three';
import type { UnitFeedbackProfile } from '../../data/unit-feedback';

interface Label {
  text: string;
  x: number;
  y: number;
  z: number;
  age: number;
  heal: boolean;
  drift: number;
  offset?: { x: number; y: number };
  motion?: number;
  pop?: number;
  still: boolean;
}
interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
  private up = new THREE.Vector3();
  private viewPoint = new THREE.Vector3();
  private projected = new THREE.Vector3();
  private boxes: LabelBox[] = [];
  private disposed = false;
  private profile?: UnitFeedbackProfile['numbers'];
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
    if (
      this.disposed ||
      this.profile?.enabled === false ||
      !Number.isFinite(value) ||
      value < 1 ||
      ![position.x, position.y, position.z].every(Number.isFinite) ||
      this.labels.length >= 32
    )
      return;
    const text = `${heal ? '+' : ''}${Math.min(9999, Math.round(value))}`;
    this.labels.push({
      text,
      x: position.x,
      y: position.y,
      z: position.z,
      age: 0,
      heal,
      drift: ((this.labels.length % 3) - 1) * 0.12,
      still: false,
    });
  }
  configure(profile?: UnitFeedbackProfile['numbers']) {
    if (this.disposed) return;
    this.reset();
    this.profile = profile;
    (this.root.material as THREE.Material).depthTest = !profile;
    this.root.renderOrder = profile ? 26 : 5;
  }
  update(dt: number, camera: THREE.Camera, viewportHeight?: number, reducedMotion = false) {
    if (this.disposed) return;
    dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    this.boxes.length = 0;
    let count = 0;
    // Older labels reserve their space first. New hits never move an existing label.
    for (let i = 0; i < this.labels.length; i++) {
      const label = this.labels[i];
      label.age += dt;
      const lifetime = this.profile?.lifetime ?? 0.75;
      if (label.age >= lifetime) {
        this.labels.splice(i, 1);
        i--;
        continue;
      }
      let size = 0.4;
      const screen =
        this.profile &&
        camera instanceof THREE.PerspectiveCamera &&
        Number.isFinite(viewportHeight) &&
        viewportHeight! > 0;
      if (screen) {
        this.viewPoint.set(label.x, label.y, label.z).applyMatrix4(camera.matrixWorldInverse);
        if (this.viewPoint.z >= -camera.near) continue;
        size =
          (this.profile!.pixels *
            2 *
            -this.viewPoint.z *
            Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
          (viewportHeight! * camera.zoom);
      }
      const p = label.age / lifetime;
      // Freeze an in-flight label where it is when reduced motion is enabled;
      // switching back affects future labels without restarting old movement.
      if (reducedMotion) label.still = true;
      const move = label.still ? (label.motion ?? 0) : p;
      label.motion = move;
      const pop = label.still
        ? (label.pop ?? 1)
        : screen
          ? 1
          : 1 + Math.sin(Math.min(1, p * 4) * Math.PI) * 0.15;
      label.pop = pop;
      this.dummy.position.set(label.x, label.y + (screen ? 0 : move * 0.75), label.z);
      if (screen) {
        this.dummy.position.addScaledVector(
          this.up,
          (1 + (move * this.profile!.risePixels) / this.profile!.pixels) * size,
        );
        this.dummy.position.addScaledVector(this.right, label.drift * move * size);
        this.projected.copy(this.dummy.position).project(camera);
        const pixels = this.profile!.pixels,
          x = (this.projected.x * viewportHeight! * camera.aspect) / 2,
          y = (this.projected.y * viewportHeight!) / 2,
          width = pixels * (0.6 * (label.text.length - 1) + 0.675) + 6,
          height = pixels + 5;
        label.offset ??= this.place(x, y, width, height, pixels);
        this.boxes.push({ x: x + label.offset.x * pixels, y: y + label.offset.y * pixels, width, height });
      }
      for (let n = 0; n < label.text.length; n++) {
        this.dummy.position.set(label.x, label.y + (screen ? 0 : move * 0.75), label.z);
        if (screen)
          this.dummy.position.addScaledVector(
            this.up,
            (1 + (move * this.profile!.risePixels) / this.profile!.pixels) * size,
          );
        if (screen) this.dummy.position.addScaledVector(this.up, label.offset!.y * size);
        this.dummy.position.addScaledVector(
          this.right,
          (n - (label.text.length - 1) / 2) * (screen ? size * 0.6 : 0.17) +
            label.drift * move * (screen ? size : 1),
        );
        if (screen) this.dummy.position.addScaledVector(this.right, label.offset!.x * size);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.set(size * 0.675 * pop, size * pop, 1);
        this.dummy.updateMatrix();
        this.root.setMatrixAt(count, this.dummy.matrix);
        this.color.set(
          this.profile
            ? label.heal
              ? this.profile.healColor
              : this.profile.damageColor
            : label.heal
              ? 0x8affbe
              : 0xffe1ad,
        );
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
  private place(x: number, y: number, width: number, height: number, pixels: number) {
    const span = width / pixels,
      line = height / pixels;
    let best = { x: 0, y: 0 },
      bestScore = Infinity;
    // Bounded search near the hit point, even when the entire 32-label pool is full.
    for (let row = 0; row < 3; row++)
      for (const column of [0, -1, 1]) {
        const offsetX = column * span,
          offsetY = row * line,
          cx = x + offsetX * pixels,
          cy = y + offsetY * pixels;
        let score = (offsetX * offsetX + offsetY * offsetY) * 0.01;
        for (const box of this.boxes) {
          const overlapX = Math.max(0, (width + box.width) / 2 - Math.abs(cx - box.x)),
            overlapY = Math.max(0, (height + box.height) / 2 - Math.abs(cy - box.y));
          score += overlapX * overlapY;
        }
        if (score < bestScore) {
          bestScore = score;
          best = { x: offsetX, y: offsetY };
        }
      }
    return best;
  }
  get activeCount() {
    return this.labels.length;
  }
  reset() {
    this.labels = [];
    this.boxes.length = 0;
    this.root.count = 0;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.root.removeFromParent();
    this.root.geometry.dispose();
    (this.root.material as THREE.Material).dispose();
    this.texture.dispose();
    this.root.dispose();
  }
}
