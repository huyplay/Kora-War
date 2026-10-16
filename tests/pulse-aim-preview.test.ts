import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PulseAimPreview } from '../src/rendering/pulse-aim-preview';
import type { Side, Unit } from '../src/core/types';
import { LANES } from '../src/data/map';

const board = { minX: -13, maxX: 15, halfWidth: 1.5 };
const palette = { ally: '#7ddcff', heal: '#70ffc7', enemy: '#ffa075' };
const unit = (id: number, side: Side, lane: number, hp = 100, x = 0) => ({ id, side, lane, hp, x }) as Unit;
const anchor = (u: Unit) => ({ position: { x: u.x + 0.6, z: LANES[u.lane] + 0.3 }, radius: 0.7 });

test('unchosen pulse guides cover all configured lanes and selecting one emphasizes the full lane', () => {
  const aim = new PulseAimPreview();
  try {
    const geometry = aim.areas.map((a) => a.geometry);
    aim.update(board, palette, 0, undefined, [unit(1, 1, 1)], anchor);
    assert.equal(aim.root.visible, true);
    assert.equal(aim.markers.count, 0);
    for (const [i, area] of aim.areas.entries()) {
      const bounds = new THREE.Box3().setFromObject(area);
      assert.ok(Math.abs(bounds.min.x - board.minX) < 1e-6);
      assert.ok(Math.abs(bounds.max.x - board.maxX) < 1e-6);
      assert.ok(Math.abs(bounds.min.z - (LANES[i] - board.halfWidth)) < 1e-6);
      assert.ok(Math.abs(bounds.max.z - (LANES[i] + board.halfWidth)) < 1e-6);
      assert.equal(area.material.uniforms.strength.value, 0.55);
      assert.equal(area.material.uniforms.color.value.getHex(), new THREE.Color(palette.ally).getHex());
    }
    aim.update({ ...board, minX: -10, maxX: 12, halfWidth: 1.2 }, palette, 0, 2, [], anchor);
    assert.deepEqual(
      aim.areas.map((a) => a.material.uniforms.strength.value),
      [0.25, 0.25, 1],
    );
    assert.deepEqual(
      aim.areas.map((a) => a.geometry),
      geometry,
    );
    assert.equal(aim.areas[0].scale.x, 22);
    assert.equal(aim.areas[0].scale.y, 2.4);
  } finally {
    aim.dispose();
  }
});

test('pulse markers use current living-lane membership and colors for either side on formation anchors', () => {
  const aim = new PulseAimPreview(),
    units = [unit(1, 0, 1, 100, -30), unit(2, 1, 1, 100, 30), unit(3, 1, 0), unit(4, 0, 1, 0)];
  const before = structuredClone(units),
    matrix = new THREE.Matrix4(),
    color = new THREE.Color();
  try {
    for (const side of [0, 1] as const) {
      aim.update(board, palette, side, 1, units, anchor);
      assert.equal(aim.markers.count, 2, 'no x radius is introduced by the preview');
      aim.markers.getMatrixAt(0, matrix);
      assert.ok(Math.abs(matrix.elements[12] - -29.4) < 1e-5);
      assert.ok(Math.abs(matrix.elements[14] - (LANES[1] + 0.3)) < 1e-6);
      for (let i = 0; i < 2; i++) {
        aim.markers.getColorAt(i, color);
        assert.equal(
          color.getHex(),
          new THREE.Color(units[i].side === side ? palette.heal : palette.enemy).getHex(),
        );
      }
    }
    assert.deepEqual(units, before);
    units[0].hp = 0;
    units[1].lane = 2;
    aim.update(board, palette, 0, 1, units, anchor);
    assert.equal(aim.markers.count, 0);
  } finally {
    aim.dispose();
  }
});

test('changing lane or palette replaces reused marker colors and skips missing visuals', () => {
  const aim = new PulseAimPreview(),
    units = [unit(1, 0, 1), unit(2, 1, 2)];
  const matrices = aim.markers.instanceMatrix,
    color = new THREE.Color();
  try {
    aim.update(board, palette, 0, 1, units, anchor);
    aim.markers.getColorAt(0, color);
    assert.equal(color.getHex(), new THREE.Color(palette.heal).getHex());
    aim.update(board, { ...palette, enemy: '#aa55ff' }, 0, 2, units, anchor);
    aim.markers.getColorAt(0, color);
    assert.equal(color.getHex(), 0xaa55ff);
    assert.equal(aim.markers.count, 1);
    assert.equal(aim.markers.instanceMatrix, matrices);
    aim.update(board, palette, 0, 2, units, () => undefined);
    assert.equal(aim.markers.count, 0);
    aim.update(board, palette, 0, -1, units, anchor);
    assert.deepEqual(
      aim.areas.map((a) => a.material.uniforms.strength.value),
      [0.55, 0.55, 0.55],
    );
    assert.equal(aim.markers.count, 0);
  } finally {
    aim.dispose();
  }
});

test('pulse preview stays bounded, clears between selections and disposes all owned resources', () => {
  const aim = new PulseAimPreview(),
    units = Array.from({ length: 150 }, (_, i) => unit(i, 1, 1));
  aim.update(board, palette, 0, 1, units, anchor);
  assert.equal(aim.markers.count, 100);
  aim.clear();
  assert.equal(aim.root.visible, false);
  assert.equal(aim.markers.count, 0);
  aim.update(board, palette, 0, 0, units, anchor);
  assert.equal(aim.markers.count, 0);
  const disposed: string[] = [];
  aim.areas.forEach((a, i) => {
    a.geometry.addEventListener('dispose', () => disposed.push(`g${i}`));
    a.material.addEventListener('dispose', () => disposed.push(`m${i}`));
  });
  aim.markers.geometry.addEventListener('dispose', () => disposed.push('markers'));
  aim.markers.material.addEventListener('dispose', () => disposed.push('material'));
  new THREE.Scene().add(aim.root);
  aim.dispose();
  assert.equal(aim.root.parent, null);
  assert.equal(aim.markers.count, 0);
  assert.equal(new Set(disposed).size, 8);
  assert.equal(disposed.length, 8);
});
