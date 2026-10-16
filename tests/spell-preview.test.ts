import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/rendering/World';
import { SPELLS, type SpellId } from '../src/data/spells';
import { LANES } from '../src/data/map';

function preview() {
  // setHover only needs the picked lane and its ring, so no WebGL/DOM is needed.
  const world = Object.create(World.prototype) as World;
  world.hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.73, 40),
    new THREE.MeshBasicMaterial({ color: 0xa2ffdd }),
  );
  world.hoverRing.rotation.x = -Math.PI / 2;
  const point = { x: 3, z: LANES[1], lane: 1, valid: false, spellValid: true };
  world.pick = () => point;
  return { world, point };
}

test('spell targeting previews match each spell radius, warning width and color', () => {
  const { world } = preview();
  try {
    for (const id of Object.keys(SPELLS) as SpellId[]) {
      world.setHover(0, 0, false, id);
      const bounds = new THREE.Box3().setFromObject(world.hoverRing);
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x / 2 - SPELLS[id].radius) < 1e-6, `${id} radius`);
      assert.ok(Math.abs(size.z / 2 - 1.35) < 1e-6, `${id} lane width`);
      assert.equal(world.hoverRing.material.color.getHex(), new THREE.Color(SPELLS[id].color).getHex());
      assert.equal(world.hoverRing.visible, true, `${id} can target the enemy half`);
      assert.equal(world.selectedLane, 1);
    }
  } finally {
    world.hoverRing.geometry.dispose();
    world.hoverRing.material.dispose();
  }
});

test('spell previews reject off-lane positions, mark invalid hero placement red and restore valid rings', () => {
  const { world, point } = preview();
  try {
    point.spellValid = false;
    world.setHover(0, 0, true, 'ice');
    assert.equal(world.hoverRing.visible, false);
    point.spellValid = true;
    world.setHover(0, 0, true, 'fire');
    world.setHover(0, 0);
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
  }
});

test('a stationary pointer refreshes legality as the frontline moves and clears between selections', () => {
  const { world, point } = preview();
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
  }
});
