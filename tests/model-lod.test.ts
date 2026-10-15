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

test('scenery tint clones per-instance materials while preserving source textures and other instances', () => {
  const source = new THREE.Group(),
    material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const texture = new THREE.Texture();
  material.map = texture;
  source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material));
  const binding = { assetId: 'fixture', height: 2, yaw: 0, clips: {} };
  const a = new ModelInstance(source, [], binding),
    b = new ModelInstance(source, [], binding);
  a.tint('#807569');
  const tinted = (a.model.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
  assert.notEqual(tinted, material);
  assert.equal(tinted.map, texture);
  assert.equal(material.color.getHex(), 0xffffff);
  assert.equal((b.model.children[0] as THREE.Mesh).material, material);
  let released = 0;
  tinted.addEventListener('dispose', () => released++);
  a.dispose();
  b.dispose();
  assert.equal(released, 1);
  texture.dispose();
  material.dispose();
  (source.children[0] as THREE.Mesh).geometry.dispose();
});
