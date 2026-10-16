import * as THREE from 'three';
import { visibleModelBounds } from './assets/model-parts';
/** Weapons can dominate a model's bounds; anchor character art to its head instead. */
export function portraitCamera(model: THREE.Object3D) {
  model.updateWorldMatrix(true, true);
  const bounds = visibleModelBounds(model);
  const height = Math.max(1, bounds.max.y - bounds.min.y),
    target = bounds.getCenter(new THREE.Vector3());
  target.y = bounds.min.y + height * 0.66;
  let head: THREE.Object3D | undefined;
  model.traverse((o) => {
    if (!head && /^(head|bip01[ _]head)$/i.test(o.name)) head = o;
  });
  if (head) {
    head.getWorldPosition(target);
    target.y -= height * 0.15;
  }
  const camera = new THREE.PerspectiveCamera(30, 256 / 352, 0.1, 50);
  camera.position.copy(target).add(new THREE.Vector3(height * 0.16, height * 0.04, height * 1.35));
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  return camera;
}
