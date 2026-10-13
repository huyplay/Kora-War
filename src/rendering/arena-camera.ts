import * as THREE from 'three';

/** Optical zoom: re-render geometry, never enlarge a low-resolution canvas. */
export class ArenaCamera {
  readonly min = 1;
  readonly max = 1.85;
  private targetZoom = 1;
  private focus = new THREE.Vector2();
  constructor(readonly camera: THREE.OrthographicCamera) {}
  get zoom() {
    return this.targetZoom;
  }
  zoomBy(factor: number, anchor?: THREE.Vector3) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const previous = this.targetZoom;
    this.targetZoom = THREE.MathUtils.clamp(previous * factor, this.min, this.max);
    if (anchor && this.targetZoom > previous) {
      const weight = 1 - previous / this.targetZoom;
      this.focus.lerp(new THREE.Vector2(anchor.x, anchor.z), weight);
    }
    const crop = 1 - 1 / this.targetZoom;
    this.focus.x = THREE.MathUtils.clamp(this.focus.x, -16 * crop, 16 * crop);
    this.focus.y = THREE.MathUtils.clamp(this.focus.y, -7 * crop, 7 * crop);
  }
  reset() {
    this.targetZoom = 1;
    this.focus.set(0, 0);
  }
  update(dt: number) {
    const blend = 1 - Math.exp(-14 * Math.max(0, dt));
    this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, this.targetZoom, blend);
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.focus.x, blend);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, 30 + this.focus.y, blend);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
}
