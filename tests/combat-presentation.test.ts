import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Unit, Tower } from '../src/core/types';
import { UnitFeedback } from '../src/rendering/animation/unit-feedback';
import { ContactShadows } from '../src/rendering/vfx/contact-shadows';
import { FloatingNumbers } from '../src/rendering/vfx/floating-numbers';
import { StructureAnimator } from '../src/rendering/animation/structure-animator';
import { ModelInstance } from '../src/rendering/assets/model-library';

const unit = (hp: number, shield = 0) => ({ hp, shield }) as Unit;
test('combat feedback shows actual HP deltas, absorbs shield hits, and batches damage over time', () => {
  const feedback = new UnitFeedback(unit(100, 40));
  assert.equal(feedback.update(unit(100, 20), 0.016), undefined);
  assert.ok(feedback.flash > 0);
  assert.deepEqual(feedback.update(unit(90), 0.016), { damage: 10, healing: 0 });
  assert.equal(feedback.update(unit(88), 0.05), undefined);
  assert.equal(feedback.update(unit(85), 0.05), undefined);
  assert.deepEqual(feedback.update(unit(80), 0.1), { damage: 10, healing: 0 });
  assert.ok(feedback.trailHp > 80);
  feedback.update(unit(80), 2);
  assert.ok(feedback.trailHp - 80 < 0.001);
  assert.deepEqual(feedback.update(unit(95), 0.2), { damage: 0, healing: 15 });
  assert.equal(feedback.trailHp, 95);
  const paused = { flash: feedback.flash, trail: feedback.trailHp };
  feedback.update(unit(95), 0);
  assert.equal(feedback.flash, paused.flash);
  assert.equal(feedback.trailHp, paused.trail);
});
test('floating numbers share one atlas, cap bursts, freeze, expire and dispose their resources', () => {
  const atlas = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  const numbers = new FloatingNumbers(atlas),
    position = new THREE.Vector3(1, 3, 2),
    camera = new THREE.PerspectiveCamera();
  let disposed = 0;
  atlas.addEventListener('dispose', () => disposed++);
  numbers.emit(0, position);
  numbers.emit(NaN, position);
  assert.equal(numbers.activeCount, 0);
  for (let i = 0; i < 100; i++) numbers.emit(99999, position, true);
  numbers.update(0.1, camera);
  assert.equal(numbers.activeCount, 32);
  assert.equal(numbers.root.count, 160);
  const before = numbers.root.instanceMatrix.array.slice();
  numbers.update(0, camera);
  assert.deepEqual(numbers.root.instanceMatrix.array, before);
  numbers.update(0.75, camera);
  assert.equal(numbers.activeCount, 0);
  assert.equal(numbers.root.count, 0);
  numbers.emit(35, position);
  numbers.reset();
  assert.equal(numbers.activeCount, 0);
  numbers.dispose();
  assert.equal(disposed, 1);
});
test('tiny regeneration ticks accumulate into one readable healing label', () => {
  const feedback = new UnitFeedback(unit(80));
  assert.equal(feedback.update(unit(81), 0.2), undefined);
  assert.equal(feedback.update(unit(82), 0.2), undefined);
  assert.deepEqual(feedback.update(unit(83), 0.2), { damage: 0, healing: 3 });
});
test('contact shadows follow interpolated positions, stay bounded, and clear for the next match', () => {
  const shadows = new ContactShadows(),
    point = new THREE.Vector3(3, 0, -4),
    matrix = new THREE.Matrix4();
  shadows.begin();
  for (let i = 0; i < 110; i++) shadows.add(point, 2, 0.5);
  shadows.end();
  assert.equal(shadows.root.count, 100);
  shadows.root.getMatrixAt(0, matrix);
  const position = new THREE.Vector3().setFromMatrixPosition(matrix);
  assert.equal(position.x, 3);
  assert.equal(position.z, -4);
  assert.ok(position.y > 0.06);
  shadows.begin();
  assert.equal(shadows.root.count, 0);
  shadows.dispose();
});
test('tower collapse animates once, freezes while paused and restores all transforms on restart', () => {
  const animator = new StructureAnimator(),
    tower: Tower = { id: '0-1', side: 0, lane: 1, x: -9, hp: 400, maxHp: 400, cooldown: 0 };
  const mesh = new THREE.Group();
  mesh.position.set(-9, 0, 0);
  const meshes = new Map([[tower.id, mesh]]);
  animator.update([tower], meshes, 0.1);
  const destroyed = { ...tower, hp: 0 };
  animator.update([destroyed], meshes, 0);
  assert.equal(mesh.scale.y, 1);
  assert.equal(animator.root.count, 12);
  animator.update([destroyed], meshes, 0.325);
  assert.ok(mesh.scale.y < 1 && mesh.scale.y > 0.22);
  const scale = mesh.scale.y,
    rotation = mesh.rotation.z;
  animator.update([destroyed], meshes, 0);
  assert.equal(mesh.scale.y, scale);
  assert.equal(mesh.rotation.z, rotation);
  assert.equal(animator.root.count, 12);
  animator.update([destroyed], meshes, 1);
  assert.ok(Math.abs(mesh.scale.y - 0.22) < 0.00001);
  assert.equal(animator.root.count, 0);
  animator.reset(meshes);
  assert.equal(mesh.scale.y, 1);
  assert.equal(mesh.rotation.z, 0);
  assert.equal(tower.hp, 400);
  animator.dispose();
});
test('hit flash isolates per-unit material without changing the source or duplicating shared textures', () => {
  const source = new THREE.Group(),
    material = new THREE.MeshStandardMaterial({ color: 0x336699 });
  source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material));
  const binding = { assetId: 'fixture', height: 2, yaw: 0, clips: {} };
  const a = new ModelInstance(source, [], binding),
    b = new ModelInstance(source, [], binding);
  a.setHitFlash(0.7);
  const own = (a.model.children[0] as THREE.Mesh).material as THREE.Material;
  assert.notEqual(own, material);
  assert.equal((b.model.children[0] as THREE.Mesh).material, material);
  assert.equal(material.color.getHex(), 0x336699);
  let disposed = 0;
  own.addEventListener('dispose', () => disposed++);
  a.setHitFlash(0);
  assert.equal((a.model.children[0] as THREE.Mesh).material, own);
  a.dispose();
  b.dispose();
  assert.equal(disposed, 1);
});
