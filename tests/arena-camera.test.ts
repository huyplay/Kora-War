import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ArenaCamera } from '../src/rendering/arena-camera';

const setup = () => {
  const camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 150);
  camera.position.set(0, 24, 30);
  camera.lookAt(0, 0.5, 0);
  return { camera, rig: new ArenaCamera(camera) };
};
test('arena zoom is bounded, anchored and returns to the overview without changing camera tilt', () => {
  const { camera, rig } = setup();
  const tilt = camera.quaternion.clone();
  rig.zoomBy(100, new THREE.Vector3(100, 0, -100));
  rig.update(2);
  assert.equal(rig.zoom, 1.85);
  assert.ok(camera.position.x > 0 && camera.position.x < 7.36);
  assert.ok(camera.position.z > 26.78);
  assert.ok(camera.quaternion.equals(tilt));
  rig.zoomBy(NaN);
  rig.zoomBy(-2);
  assert.equal(rig.zoom, 1.85);
  rig.reset();
  rig.update(2);
  assert.ok(Math.abs(camera.zoom - 1) < 1e-9);
  assert.ok(Math.abs(camera.position.x) < 1e-9);
  assert.ok(Math.abs(camera.position.z - 30) < 1e-9);
});
test('ray picking remains aligned with all three lanes after anchored zoom', () => {
  const { camera, rig } = setup();
  rig.zoomBy(1.7, new THREE.Vector3(5, 0, -4.8));
  rig.update(2);
  const ray = new THREE.Raycaster();
  for (const z of [-4.8, 0, 4.8]) {
    const ground = new THREE.Vector3(4, 0, z);
    const screen = ground.clone().project(camera);
    ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())!;
    assert.ok(hit.distanceTo(ground) < 1e-9);
  }
});

test('perspective arena narrows distant lanes and keeps ray selection aligned at maximum zoom', () => {
  const camera = new THREE.PerspectiveCamera(30, 844 / 390, 0.1, 180);
  camera.position.set(0, 29, 35.2);
  camera.lookAt(0, 0.5, 1.2);
  camera.updateMatrixWorld();
  const rig = new ArenaCamera(camera),
    tilt = camera.quaternion.clone();
  const span = (z: number) =>
    new THREE.Vector3(13, 0, z).project(camera).x - new THREE.Vector3(-13, 0, z).project(camera).x;
  assert.ok(span(4.8) > span(-4.8), 'near lane has natural perspective depth');
  rig.zoomBy(1.85, new THREE.Vector3(4, 0, 0));
  rig.update(2);
  const ray = new THREE.Raycaster();
  for (const z of [-4.8, 0, 4.8]) {
    const ground = new THREE.Vector3(4, 0, z),
      screen = ground.clone().project(camera);
    ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())!;
    assert.ok(hit.distanceTo(ground) < 1e-8);
  }
  rig.reset();
  rig.update(2);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(0, 29, 35.2)) < 1e-8);
  assert.ok(camera.quaternion.equals(tilt));
});
