import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Tower } from '../src/core/types';
import { StructureAnimator } from '../src/rendering/animation/structure-animator';
import { StructureShadowRefresh } from '../src/rendering/animation/structure-shadow-refresh';

function fixture() {
  const tower: Tower = { id: '0-1', side: 0, lane: 1, x: -9, hp: 400, maxHp: 400, cooldown: 0 };
  const mesh = new THREE.Group(),
    pedestal = new THREE.Group(),
    body = new THREE.Group();
  mesh.position.set(tower.x, 0, 0);
  pedestal.name = 'TowerPedestal';
  body.name = 'TowerBody';
  body.position.y = 0.48;
  body.scale.set(1.7, 1.8, 1.7);
  body.rotation.z = 0.02;
  mesh.add(pedestal, body);
  return { tower, mesh, pedestal, body, meshes: new Map([[tower.id, mesh]]) };
}

test('collapse keeps the foundation and root fixed, preserves configured body scale and restores it', () => {
  const f = fixture(),
    animator = new StructureAnimator();
  const bodyScale = f.body.scale.clone(),
    rotation = f.body.rotation.z;
  const original = structuredClone(f.tower);
  animator.update([f.tower], f.meshes, 0);
  f.mesh.updateMatrixWorld(true);
  const foundation = f.pedestal.matrixWorld.clone();
  const dead = { ...f.tower, hp: 0 };
  assert.equal(animator.update([dead], f.meshes, 0.325), true);
  f.mesh.updateMatrixWorld(true);
  assert.deepEqual(f.pedestal.matrixWorld.elements, foundation.elements);
  assert.equal(f.mesh.scale.y, 1);
  assert.equal(f.body.position.y, 0.48);
  assert.equal(f.body.scale.x, bodyScale.x);
  assert.ok(f.body.scale.y < bodyScale.y);
  assert.equal(animator.update([dead], f.meshes, 0), false);
  animator.update([dead], f.meshes, 1);
  assert.ok(Math.abs(f.body.scale.y - bodyScale.y * 0.22) < 1e-9);
  animator.reset(f.meshes);
  assert.deepEqual(f.body.scale, bodyScale);
  assert.equal(f.body.rotation.z, rotation);
  assert.equal(animator.root.count, 0);
  assert.deepEqual(f.tower, original);
  animator.dispose();
});

test('initial dead snapshot starts as settled ruins, without motion or fresh flying debris', () => {
  const f = fixture(),
    animator = new StructureAnimator();
  const dead = { ...f.tower, hp: 0 };
  assert.equal(animator.update([dead], f.meshes, 0), true);
  assert.ok(Math.abs(f.body.scale.y - 1.8 * 0.22) < 1e-9);
  assert.equal(animator.root.count, 12);
  const first = animator.root.instanceMatrix.array.slice(),
    version = animator.root.instanceMatrix.version;
  assert.equal(animator.update([dead], f.meshes, 2), false);
  assert.deepEqual(animator.root.instanceMatrix.array, first);
  assert.equal(
    animator.root.instanceMatrix.version,
    version,
    'settled rubble has no per-frame buffer upload',
  );
  animator.dispose();
});

test('six destroyed towers retain bounded rubble on the lane floor without duplicate bursts', () => {
  const animator = new StructureAnimator(),
    towers: Tower[] = [],
    meshes = new Map<string, THREE.Group>();
  for (let side = 0; side < 2; side++)
    for (let lane = 0; lane < 3; lane++) {
      const tower: Tower = {
        id: `${side}-${lane}`,
        side: side as 0 | 1,
        lane,
        x: side ? 9 : -9,
        hp: 0,
        maxHp: 400,
        cooldown: 0,
      };
      const mesh = new THREE.Group();
      mesh.position.set(tower.x, 0, [-4.8, 0, 4.8][lane]);
      towers.push(tower);
      meshes.set(tower.id, mesh);
    }
  animator.update(towers, meshes, 0);
  assert.equal(animator.root.count, 72);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < animator.root.count; i++) {
    animator.root.getMatrixAt(i, matrix);
    const position = new THREE.Vector3().setFromMatrixPosition(matrix),
      size = new THREE.Vector3().setFromMatrixScale(matrix);
    assert.ok(position.y > 0.06 && position.y < 0.17);
    assert.ok(size.x > 0 && size.x < 0.18);
    const laneZ = [-4.8, 0, 4.8][towers[Math.floor(i / 12)].lane];
    assert.ok(Math.abs(position.z - laneZ) < 1.5);
  }
  animator.update(towers, meshes, 100);
  assert.equal(animator.root.count, 72);
  animator.reset(meshes);
  assert.equal(animator.root.count, 0);
  animator.dispose();
});

test('shadow refresh batches motion, flushes the final pose and remains idle afterward', () => {
  const refresh = new StructureShadowRefresh();
  assert.equal(refresh.update(false, 1 / 60, true), false);
  let updates = 0;
  for (let frame = 0; frame < 60; frame++) if (refresh.update(frame < 39, 1 / 60, true)) updates++;
  assert.ok(updates >= 7 && updates <= 9, `bounded collapse shadow updates: ${updates}`);
  for (let frame = 0; frame < 120; frame++) assert.equal(refresh.update(false, 1 / 60, true), false);
});

test('reduced motion settles a new or interrupted collapse immediately without resuming airborne rubble', () => {
  for (const interrupted of [false, true]) {
    const f = fixture(),
      animator = new StructureAnimator(),
      dead = { ...f.tower, hp: 0 };
    animator.update([f.tower], f.meshes, 0);
    if (interrupted) animator.update([dead], f.meshes, 0.2);
    assert.equal(animator.update([dead], f.meshes, 0, true), true);
    assert.ok(Math.abs(f.body.scale.y - 1.8 * 0.22) < 1e-9);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < animator.root.count; i++) {
      animator.root.getMatrixAt(i, matrix);
      assert.ok(matrix.elements[13] < 0.17);
    }
    const settled = animator.root.instanceMatrix.array.slice();
    assert.equal(animator.update([dead], f.meshes, 0.1, false), false);
    assert.deepEqual(animator.root.instanceMatrix.array, settled);
    animator.reset(f.meshes);
    assert.equal(f.body.scale.y, 1.8);
    animator.dispose();
  }
});

test('shadow refresh flushes a paused pose and respects low quality without continuous updates', () => {
  const refresh = new StructureShadowRefresh();
  assert.equal(refresh.update(true, 1 / 60, true), true);
  assert.equal(refresh.update(true, 1 / 60, true), false);
  assert.equal(refresh.update(false, 0, true), true);
  assert.equal(refresh.update(false, 0, true), false);
  for (let frame = 0; frame < 60; frame++) assert.equal(refresh.update(true, 1 / 60, false), false);
  assert.equal(refresh.update(false, 0, true), true);
  refresh.reset();
  assert.equal(refresh.update(false, 0, true), false);
  assert.equal(refresh.update(true, 0, true), true);
});
