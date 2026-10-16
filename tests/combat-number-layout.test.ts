import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FloatingNumbers } from '../src/rendering/vfx/floating-numbers';
import { defaultUnitFeedback } from '../src/data/unit-feedback';

function fixture() {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1),
    numbers = new FloatingNumbers(texture),
    camera = new THREE.PerspectiveCamera(30, 844 / 390, 0.1, 180);
  camera.position.set(0, 29, 35.2);
  camera.lookAt(0, 0.5, 1.2);
  camera.updateMatrixWorld(true);
  numbers.configure(defaultUnitFeedback().numbers);
  return { numbers, texture, camera };
}
function bounds(numbers: FloatingNumbers, camera: THREE.Camera, start: number, length: number) {
  const matrix = new THREE.Matrix4(),
    points: THREE.Vector3[] = [];
  for (let i = start; i < start + length; i++) {
    numbers.root.getMatrixAt(i, matrix);
    for (const x of [-0.5, 0.5])
      for (const y of [-0.5, 0.5])
        points.push(new THREE.Vector3(x, y, 0).applyMatrix4(matrix).project(camera));
  }
  return {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    bottom: Math.min(...points.map((p) => p.y)),
    top: Math.max(...points.map((p) => p.y)),
  };
}

test('nearby damage and healing labels reserve distinct screen space without moving older numbers', () => {
  const { numbers, camera } = fixture();
  const point = new THREE.Vector3(0, 3, 0);
  numbers.emit(25, point);
  numbers.update(0, camera, 390);
  const original = numbers.root.instanceMatrix.array.slice(0, 32);
  numbers.emit(50, point.clone().add(new THREE.Vector3(0.05, 0, 0)));
  numbers.emit(75, point, true);
  numbers.update(0, camera, 390);
  assert.deepEqual(numbers.root.instanceMatrix.array.slice(0, 32), original);
  assert.equal(numbers.root.count, 7);
  const boxes = [bounds(numbers, camera, 0, 2), bounds(numbers, camera, 2, 2), bounds(numbers, camera, 4, 3)];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      assert.ok(a.right < b.left || b.right < a.left || a.top < b.bottom || b.top < a.bottom);
    }
  const color = new THREE.Color();
  numbers.root.getColorAt(0, color);
  assert.equal(color.getHexString(), defaultUnitFeedback().numbers.damageColor.slice(1));
  numbers.root.getColorAt(4, color);
  assert.equal(color.getHexString(), defaultUnitFeedback().numbers.healColor.slice(1));
  numbers.dispose();
});

test('spacing keeps pixel size at mobile/desktop zooms and remains stable after an older label expires', () => {
  const { numbers, camera } = fixture();
  for (const height of [376, 390, 720])
    for (const zoom of [1, 1.85]) {
      numbers.reset();
      camera.zoom = zoom;
      camera.aspect = 844 / height;
      camera.updateProjectionMatrix();
      numbers.emit(25, new THREE.Vector3(0, 3, 0));
      numbers.update(0.4, camera, height, true);
      numbers.emit(50, new THREE.Vector3(0, 3, 0), true);
      numbers.update(0, camera, height, true);
      const matrix = new THREE.Matrix4();
      numbers.root.getMatrixAt(2, matrix);
      const top = new THREE.Vector3(0, 0.5, 0).applyMatrix4(matrix).project(camera),
        bottom = new THREE.Vector3(0, -0.5, 0).applyMatrix4(matrix).project(camera);
      assert.ok(Math.abs(((top.y - bottom.y) * height) / 2 - 18) < 0.001);
      numbers.update(0.41, camera, height, true);
      assert.equal(numbers.activeCount, 1);
      const after = new THREE.Matrix4();
      numbers.root.getMatrixAt(0, after);
      assert.deepEqual(after.elements, matrix.elements);
    }
  numbers.dispose();
});

test('reduced motion freezes in-flight numbers without a jump or restart; invalid time never corrupts them', () => {
  const { numbers, camera } = fixture();
  numbers.emit(125, new THREE.Vector3(0, 3, 0));
  numbers.update(0.1, camera, 390);
  const before = numbers.root.instanceMatrix.array.slice();
  for (const dt of [0.1, NaN, -1, Infinity, 0.1]) {
    numbers.update(dt, camera, 390, true);
    assert.deepEqual(numbers.root.instanceMatrix.array, before);
  }
  numbers.update(0.1, camera, 390, false);
  assert.deepEqual(numbers.root.instanceMatrix.array, before);
  numbers.update(0.5, camera, 390);
  assert.equal(numbers.activeCount, 0);
  numbers.dispose();
});

test('legacy number pop also freezes at its current scale when reduced motion is enabled', () => {
  const { numbers, camera } = fixture();
  numbers.configure();
  numbers.emit(25, new THREE.Vector3(0, 3, 0));
  numbers.update(0.03, camera);
  const before = numbers.root.instanceMatrix.array.slice();
  numbers.update(0.1, camera, undefined, true);
  assert.deepEqual(numbers.root.instanceMatrix.array, before);
  numbers.update(0.1, camera);
  assert.deepEqual(numbers.root.instanceMatrix.array, before);
  numbers.dispose();
});

test('invalid positions and late calls cannot poison or revive the disposed glyph pool', () => {
  const { numbers, texture, camera } = fixture();
  for (const invalid of [NaN, Infinity, -Infinity])
    for (const axis of ['x', 'y', 'z'] as const) {
      const point = new THREE.Vector3();
      point[axis] = invalid;
      numbers.emit(20, point);
    }
  assert.equal(numbers.activeCount, 0);
  numbers.emit(20, new THREE.Vector3());
  numbers.update(NaN, camera, Infinity);
  assert.ok(Array.from(numbers.root.instanceMatrix.array).every(Number.isFinite));
  let disposed = 0;
  texture.addEventListener('dispose', () => disposed++);
  numbers.dispose();
  numbers.dispose();
  numbers.configure(defaultUnitFeedback().numbers);
  numbers.emit(20, new THREE.Vector3());
  numbers.update(0.1, camera, 390);
  assert.equal(disposed, 1);
  assert.equal(numbers.activeCount, 0);
  assert.equal(numbers.root.count, 0);
});
