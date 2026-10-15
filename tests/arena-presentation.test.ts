import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { arenaBlock } from '../src/rendering/arena-block';
import { buildEnvironment } from '../src/rendering/environment';
import { TerrainStyle } from '../src/rendering/terrain-style';
import { unitVisualMetrics } from '../src/rendering/unit-visual-metrics';

test('beveled architecture preserves bounds, finite UVs and a bounded static mesh budget', () => {
  const block = arenaBlock(1.39, 0.16, 1.01);
  block.computeBoundingBox();
  const size = block.boundingBox!.getSize(new THREE.Vector3());
  assert.ok(size.distanceTo(new THREE.Vector3(1.39, 0.16, 1.01)) < 1e-6);
  assert.equal(block.attributes.position.count / 3, 44);
  block.dispose();
  const scene = new THREE.Scene();
  buildEnvironment({ scene, coreCrystals: [], baseGroups: [], towerMeshes: new Map() });
  const terrain = new TerrainStyle();
  terrain.apply(scene);
  const batches: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if (o.name === 'ArenaSurfaceBatch') batches.push(o as THREE.Mesh);
  });
  assert.ok(batches.length <= 36, 'static surface material batches including the continuous rear terraces');
  const triangles = batches.reduce((n, mesh) => n + mesh.geometry.attributes.position.count / 3, 0);
  assert.ok(triangles < 35000, `static surface triangles: ${triangles}`);
  for (const mesh of batches) {
    for (const attr of ['position', 'normal', 'uv']) {
      assert.ok(mesh.geometry.attributes[attr]);
      assert.ok([...mesh.geometry.attributes[attr].array].every(Number.isFinite));
    }
  }
  terrain.dispose();
  // Only release geometries constructed for this scene; shared resource caches belong to World.
  batches.forEach((mesh) => mesh.geometry.dispose());
});

test('health labels and pick volumes track small and large rendered bodies without changing battle state', () => {
  const small = unitVisualMetrics(2.4, 0.25),
    normal = unitVisualMetrics(2.4, 0.88);
  assert.ok(small.barY > small.bodyHeight && small.barY < normal.barY);
  assert.ok(small.pickRadius < normal.pickRadius);
  assert.ok(small.barScale < normal.barScale && small.barScale > 0);
  const tall = unitVisualMetrics(4, 1.1);
  assert.ok(tall.barY > 4.4);
  assert.equal(tall.barScale, 1);
});

test('targeting uses the imported model footprint at the current formation scale', () => {
  const radius = 1.8,
    scale = 0.4;
  assert.equal(unitVisualMetrics(3, scale, radius).pickRadius, radius * scale);
});
import { fortressGates, alignFortressFrontages, GATE_CONTACT_X } from '../src/rendering/fortress-gates';
import { ARENA_WALL } from '../src/rendering/environment';

test('six gate arches stay outside the combat field and have finite merged surface attributes', () => {
  const root = new THREE.Group();
  const geometries = fortressGates(root, ARENA_WALL, 0x9c734a);
  root.updateMatrixWorld(true);
  const gates: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === 'FortressGate') gates.push(o);
  });
  assert.equal(gates.length, 6);
  for (const gate of gates) {
    const bounds = new THREE.Box3().setFromObject(gate);
    assert.ok(
      gate.position.x < 0 ? bounds.max.x < -15.5 : bounds.min.x > 15.5,
      'gates reserve deployment and core frontage',
    );
    assert.ok([-4.8, 0, 4.8].includes(gate.position.z));
  }
  geometries.forEach((g) => g.dispose());
});

test('scaled gate strike faces meet the shared core plane on all three lanes', () => {
  const scene = new THREE.Scene();
  const { gateFrontages } = buildEnvironment({
    scene,
    coreCrystals: [],
    baseGroups: [],
    towerMeshes: new Map(),
  });
  for (const thickness of [0.8, 1.35, 2.2]) {
    alignFortressFrontages(gateFrontages, 14, 1.6, thickness);
    scene.updateMatrixWorld(true);
    for (const group of gateFrontages) {
      for (const z of [-4.8, 0, 4.8]) {
        const point = group.localToWorld(new THREE.Vector3(-group.userData.sign * GATE_CONTACT_X, 1.5, z));
        assert.ok(Math.abs(point.x - group.userData.sign * 14) < 1e-9);
        assert.equal(point.z, z);
      }
    }
  }
});
