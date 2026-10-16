import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/rendering/World';
import { SPELLS, type SpellId } from '../src/data/spells';
import { LANES } from '../src/data/map';
import { SpellAimPreview } from '../src/rendering/spell-aim-preview';
import { COMPAT_GAMEPLAY } from '../src/data/gameplay';
import type { Unit } from '../src/core/types';

function preview() {
  // setHover only needs the picked lane and its ring, so no WebGL/DOM is needed.
  const world = Object.create(World.prototype) as World;
  const aim = new SpellAimPreview();
  Object.assign(world, { spellAim: aim });
  world.hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.73, 40),
    new THREE.MeshBasicMaterial({ color: 0xa2ffdd }),
  );
  world.hoverRing.rotation.x = -Math.PI / 2;
  const point = { x: 3, z: LANES[1], lane: 1, valid: false, spellValid: true };
  world.pick = () => point;
  return { world, point, aim };
}

test('spell targeting previews match each spell radius, configured lane width and color', () => {
  const { world, aim } = preview();
  try {
    for (const id of Object.keys(SPELLS) as SpellId[]) {
      world.setHover(0, 0, false, id);
      const bounds = new THREE.Box3().setFromObject(aim.area);
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x / 2 - SPELLS[id].radius) < 1e-6, `${id} radius`);
      assert.ok(Math.abs(size.z / 2 - COMPAT_GAMEPLAY.board.halfWidth) < 1e-6, `${id} lane width`);
      assert.equal(
        aim.area.material.uniforms.color.value.getHex(),
        new THREE.Color(SPELLS[id].color).getHex(),
      );
      assert.equal(aim.root.visible, true, `${id} can target the enemy half`);
      assert.equal(world.hoverRing.visible, false, 'no duplicate ellipse under the lane preview');
      assert.equal(world.selectedLane, 1);
    }
  } finally {
    world.hoverRing.geometry.dispose();
    world.hoverRing.material.dispose();
    aim.dispose();
  }
});

test('spell previews reject off-lane positions, mark invalid hero placement red and restore valid rings', () => {
  const { world, point, aim } = preview();
  try {
    point.spellValid = false;
    world.setHover(0, 0, true, 'ice');
    assert.equal(world.hoverRing.visible, false);
    assert.equal(aim.root.visible, false);
    point.spellValid = true;
    world.setHover(0, 0, true, 'fire');
    world.setHover(0, 0);
    assert.equal(aim.root.visible, false, 'changing to a hero removes spell markers');
    assert.equal(world.hoverRing.visible, true);
    assert.deepEqual(world.hoverRing.scale.toArray(), [1, 1, 1]);
    assert.equal(world.hoverRing.material.color.getHex(), 0xff536a);
    point.valid = true;
    world.setHover(0, 0);
    assert.equal(world.hoverRing.visible, true);
    world.setHover(0, 0, true);
    assert.equal(world.hoverRing.visible, true);
    assert.deepEqual(world.hoverRing.scale.toArray(), [3, 3, 3]);
    assert.equal(world.hoverRing.material.color.getHex(), 0xa2ffdd);
  } finally {
    world.hoverRing.geometry.dispose();
    world.hoverRing.material.dispose();
    aim.dispose();
  }
});

test('a stationary pointer refreshes legality as the frontline moves and clears between selections', () => {
  const { world, point, aim } = preview();
  try {
    point.valid = true;
    world.setHover(240, 160);
    assert.equal(world.hoverRing.material.color.getHex(), 0xa2ffdd);
    point.valid = false;
    world.refreshHover();
    assert.equal(world.hoverRing.material.color.getHex(), 0xff536a);
    point.x = -10;
    point.valid = true;
    world.refreshHover();
    assert.equal(world.hoverRing.position.x, -10);
    assert.equal(world.hoverRing.material.color.getHex(), 0xa2ffdd);
    world.clearHover();
    assert.equal(world.hoverRing.visible, false);
    assert.equal(world.selectedLane, -1);
    world.pick = () => {
      throw Error('Old pointer must not be reused');
    };
    assert.equal(world.refreshHover(), null);
  } finally {
    world.hoverRing.geometry.dispose();
    world.hoverRing.material.dispose();
    aim.dispose();
  }
});

test('World spell aim uses locked gameplay and current formation without changing command coordinates', () => {
  const { world, point, aim } = preview();
  const gameplay = structuredClone(COMPAT_GAMEPLAY);
  gameplay.spells.heal.radius = 2;
  gameplay.spells.heal.target = 'all';
  gameplay.spells.heal.color = '#aaff33';
  gameplay.board.halfWidth = 2.1;
  const unit = { id: 1, heroId: 'solan', hp: 100, side: 1, lane: 1, x: 3 } as Unit;
  const group = new THREE.Group();
  group.position.set(3.8, 0, LANES[1] + 0.4);
  group.scale.setScalar(0.5);
  Object.assign(world, {
    placementState: { gameplay, units: [unit] },
    units: new Map([[1, { unit, group }]]),
  });
  let targetMode: boolean | 'all' | undefined;
  world.pick = (_x, _y, spellTarget, friendly) => {
    assert.equal(spellTarget, true);
    targetMode = friendly;
    return point;
  };
  try {
    const before = structuredClone(unit);
    const pick = world.setHover(230, 170, true, 'heal');
    assert.equal(pick, point);
    assert.equal(pick!.x, 3, 'visual offset never changes the command point');
    assert.equal(targetMode, 'all');
    assert.equal(aim.area.scale.x, 4);
    assert.equal(aim.area.scale.y, 4.2);
    assert.equal(aim.area.material.uniforms.color.value.getHex(), 0xaaff33);
    assert.equal(aim.markers.count, 1);
    const matrix = new THREE.Matrix4();
    aim.markers.getMatrixAt(0, matrix);
    assert.ok(Math.abs(matrix.elements[12] - 3.8) < 1e-6);
    assert.deepEqual(unit, before);
    unit.x = 5.01;
    world.refreshHover();
    assert.equal(aim.markers.count, 0, 'stationary pointer follows current membership');
    unit.x = 3;
    group.position.x = 4.2;
    world.refreshHover();
    aim.markers.getMatrixAt(0, matrix);
    assert.ok(Math.abs(matrix.elements[12] - 4.2) < 1e-6);
    Object.assign(world.units.get(1)!, { imported: { footprintRadius: 20 } });
    world.refreshHover();
    aim.markers.getMatrixAt(0, matrix);
    assert.ok(
      Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x - (2.65 * 0.3 * 0.5 + 0.12)) < 1e-6,
      'wide weapons do not inflate the marker beyond the body footprint',
    );
    point.spellValid = false;
    world.refreshHover();
    assert.equal(aim.root.visible, false);
    assert.equal(aim.markers.count, 0);
    world.clearHover();
    assert.equal(world.selectedLane, -1);
  } finally {
    world.hoverRing.geometry.dispose();
    world.hoverRing.material.dispose();
    aim.dispose();
  }
});
