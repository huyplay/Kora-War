import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Unit, Side } from '../src/core/types';
import { SpellAimPreview } from '../src/rendering/spell-aim-preview';
import { LANES } from '../src/data/map';

const unit = (id: number, x: number, side: Side = 1, lane = 1, hp = 100) =>
  ({ id, x, side, lane, hp }) as Unit;
const spell = { radius: 3, target: 'enemy' as const, color: '#86e7ff' };
const board = { halfWidth: 1.8 };
const area = { side: 0 as const, lane: 1, x: 2 };

test('aim area covers the full configured lane interval including corners and uses published color', () => {
  const preview = new SpellAimPreview();
  try {
    const geometry = preview.area.geometry;
    for (const [radius, halfWidth] of [
      [3, 1.8],
      [0.5, 0.6],
      [6, 2.2],
    ]) {
      preview.update(area, { ...spell, radius, color: '#aaff33' }, { halfWidth }, [], () => undefined);
      const bounds = new THREE.Box3().setFromObject(preview.area);
      assert.ok(Math.abs(bounds.min.x - (area.x - radius)) < 1e-6);
      assert.ok(Math.abs(bounds.max.x - (area.x + radius)) < 1e-6);
      assert.ok(Math.abs(bounds.min.z - (LANES[area.lane] - halfWidth)) < 1e-6);
      assert.ok(Math.abs(bounds.max.z - (LANES[area.lane] + halfWidth)) < 1e-6);
      assert.equal(preview.area.geometry, geometry, 'changes reuse the same geometry');
      assert.equal(preview.area.material.uniforms.color.value.getHex(), 0xaaff33);
      assert.equal(preview.markers.material.color.getHex(), 0xaaff33);
      assert.equal(preview.root.visible, true);
    }
  } finally {
    preview.dispose();
  }
});

test('markers use logical spell membership and actual formation anchors without moving any unit', () => {
  const preview = new SpellAimPreview();
  const units = [
    unit(1, -1),
    unit(2, 5),
    unit(3, 5.001),
    unit(4, 2, 0),
    unit(5, 2, 1, 0),
    unit(6, 2, 1, 1, 0),
  ];
  const before = structuredClone(units),
    queried: number[] = [];
  try {
    preview.update(area, spell, board, units, (u) => {
      queried.push(u.id);
      return { position: { x: u.x + 1, z: LANES[u.lane] + 0.6 }, radius: 0.9 };
    });
    assert.deepEqual(queried, [1, 2]);
    assert.equal(preview.markers.count, 2);
    const matrix = new THREE.Matrix4();
    preview.markers.getMatrixAt(0, matrix);
    assert.ok(Math.abs(matrix.elements[12] - 0) < 1e-6);
    assert.ok(Math.abs(matrix.elements[14] - (LANES[1] + 0.6)) < 1e-6);
    assert.ok(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x - 1.02) < 1e-6);
    assert.deepEqual(units, before);
    preview.update(area, { ...spell, target: 'ally' }, board, units, (u) => {
      assert.equal(u.id, 4);
      return { position: { x: -8, z: LANES[1] - 0.4 }, radius: 0.3 };
    });
    assert.equal(preview.markers.count, 1);
    const ids: number[] = [];
    preview.update(area, { ...spell, target: 'all' }, board, units, (u) => {
      ids.push(u.id);
      return { position: { x: u.x, z: LANES[u.lane] }, radius: 0.7 };
    });
    assert.deepEqual(ids, [1, 2, 4]);
    assert.deepEqual(units, before);
  } finally {
    preview.dispose();
  }
});

test('stationary eligibility changes replace markers, missing visuals skip and pool/cleanup stay bounded', () => {
  const preview = new SpellAimPreview();
  const units = Array.from({ length: 150 }, (_, i) => unit(i, 2));
  const matrices = preview.markers.instanceMatrix;
  const anchor = (u: Unit) =>
    u.id === 0 ? undefined : { position: { x: u.x, z: LANES[u.lane] }, radius: 0.7 };
  preview.update(area, spell, board, units, anchor);
  assert.equal(preview.markers.count, 100);
  units.forEach((u) => {
    u.hp = 0;
  });
  preview.update(area, spell, board, units, anchor);
  assert.equal(preview.markers.count, 0, 'no dead/stale targets remain');
  units[1].hp = 100;
  units[1].x = 2.4;
  preview.update(area, spell, board, units, anchor);
  assert.equal(preview.markers.count, 1);
  assert.equal(preview.markers.instanceMatrix, matrices);
  preview.clear();
  assert.equal(preview.root.visible, false);
  assert.equal(preview.markers.count, 0);
  preview.update(area, spell, board, units, anchor);
  assert.equal(preview.markers.count, 1);
  const disposed: string[] = [];
  for (const [name, resource] of Object.entries({
    area: preview.area.geometry,
    areaMaterial: preview.area.material,
    markers: preview.markers.geometry,
    markerMaterial: preview.markers.material,
  })) {
    resource.addEventListener('dispose', () => disposed.push(name));
  }
  new THREE.Scene().add(preview.root);
  preview.dispose();
  assert.equal(preview.root.parent, null);
  assert.equal(preview.markers.count, 0);
  assert.deepEqual(disposed.sort(), ['area', 'areaMaterial', 'markerMaterial', 'markers']);
});
