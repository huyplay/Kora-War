import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ModelInstance } from '../src/rendering/assets/model-library';

test('model instances select one sibling LOD before computing bounds without modifying cached source', () => {
  const source = new THREE.Group();
  for (let level = 0; level < 4; level++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.name = `moon_rock_01_LOD${level}`;
    mesh.position.x = level * 10;
    source.add(mesh);
  }
  const second = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  second.name = 'other_rock_LOD2';
  source.add(second);
  const instance = new ModelInstance(source, [], { assetId: 'fixture', height: 2, yaw: 0, clips: {} });
  assert.equal(source.children.length, 5);
  assert.deepEqual(
    instance.model.children.map((o) => o.name),
    ['moon_rock_01_LOD0', 'other_rock_LOD2'],
  );
  assert.equal(instance.footprintRadius, 1, 'discarded variants do not inflate model bounds');
  assert.ok(source.children.every((o) => o.visible));
  instance.dispose();
  source.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
});
