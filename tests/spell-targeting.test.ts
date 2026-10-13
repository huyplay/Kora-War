import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/rendering/World';
import { tacticalBattle } from '../src/core/tactical';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import { LANES } from '../src/data/map';

function scene() {
  const b = tacticalBattle(DEFAULT_DECK, ['fire', 'ice'], defaultContent(), 1, DEFAULT_DECK);
  b.start();
  b.aiEnabled = false;
  b.play(1, 'solan', 1);
  const enemy = b.units[0];
  enemy.x = 6;
  const world = Object.create(World.prototype) as World;
  world.camera = new THREE.OrthographicCamera(-18, 18, 9, -9, 0.1, 150);
  world.camera.position.set(0, 28, 25);
  world.camera.lookAt(0, 0, 0);
  world.camera.updateMatrixWorld(true);
  world.canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500 }),
  } as HTMLCanvasElement;
  world.pointer = new THREE.Vector2();
  world.ray = new THREE.Raycaster();
  world.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const group = new THREE.Group();
  group.position.set(enemy.x, 0, LANES[enemy.lane] + ((enemy.id % 3) - 1) * 0.32);
  world.units = new Map([
    [enemy.id, { group, unit: enemy, bar: new THREE.Mesh(), shield: new THREE.Mesh() }],
  ]);
  const screen = (x: number, y: number, z: number) => {
    const p = new THREE.Vector3(x, y, z).project(world.camera);
    return [(p.x + 1) * 500, (1 - p.y) * 250] as const;
  };
  return { b, enemy, world, group, screen };
}

test('touching a tall enemy model targets its actual lane instead of the ground behind its head', () => {
  const { enemy, world, group, screen } = scene();
  const [x, y] = screen(enemy.x, 2.35, group.position.z);
  assert.equal(world.pick(x, y)!.spellValid, false, 'old ground projection misses the lane');
  const point = world.pick(x, y, true)!;
  assert.equal(point.spellValid, true);
  assert.equal(point.lane, enemy.lane);
  assert.equal(point.x, enemy.x);
});

test('spell touches on every lane work with mirrored PvP units and interpolated visuals', () => {
  const { enemy, world, group, screen } = scene();
  for (let lane = 0; lane < LANES.length; lane++) {
    enemy.lane = lane;
    // The command uses current snapshot x while its rendered position is interpolated.
    enemy.x = -7;
    group.position.set(-6.9, 0, LANES[lane] + 0.32);
    const [x, y] = screen(-6.9, 2.2, group.position.z);
    const point = world.pick(x, y, true)!;
    assert.equal(point.lane, lane);
    assert.equal(point.x, -7);
    assert.equal(point.spellValid, true);
  }
});

test('dead or friendly models do not capture spell targeting and empty lane ground remains targetable', () => {
  const { enemy, world, group, screen } = scene();
  const [x, y] = screen(enemy.x, 2.35, group.position.z);
  enemy.hp = 0;
  assert.equal(world.pick(x, y, true)!.spellValid, false);
  enemy.hp = 1000;
  enemy.side = 0;
  assert.equal(world.pick(x, y, true)!.spellValid, false);
  const [groundX, groundY] = screen(0, 0, LANES[2]);
  const ground = world.pick(groundX, groundY, true)!;
  assert.equal(ground.spellValid, true);
  assert.equal(ground.lane, 2);
  assert.ok(Math.abs(ground.x) < 1e-6);
});

test('a model-targeted Fire command damages the enemy through the full battle loop and absorbs shields first', () => {
  for (const shield of [0, 100]) {
    const { b, enemy, world, group, screen } = scene();
    b.synergies = [{}, {}];
    enemy.hp = enemy.maxHp = 1000;
    enemy.shield = shield;
    enemy.speed = 0;
    enemy.skillCd = 100;
    const [x, y] = screen(enemy.x, 2.35, group.position.z);
    const point = world.pick(x, y, true)!;
    assert.equal(b.cast(0, 'fire', point.lane, point.x), null);
    for (let i = 0; i < 80; i++) b.step();
    assert.equal(enemy.hp, 1000 - (135 - shield));
    assert.equal(enemy.shield, 0);
    assert.equal(b.stats[0].damage, 135 - shield);
    assert.equal(b.spellZones.length, 0);
  }
});

test('a model-targeted Ice command reduces HP and movement until its exact expiry', () => {
  const { b, enemy, world, group, screen } = scene();
  b.synergies = [{}, {}];
  enemy.hp = enemy.maxHp = 1000;
  enemy.shield = 0;
  enemy.speed = 1;
  enemy.skillCd = 100;
  const [x, y] = screen(enemy.x, 2.35, group.position.z);
  const point = world.pick(x, y, true)!;
  assert.equal(b.cast(0, 'ice', point.lane, point.x), null);
  for (let i = 0; i < 8; i++) b.step();
  assert.equal(enemy.hp, 965);
  assert.equal(enemy.slowFactor, 0.6);
  const startX = enemy.x;
  for (let i = 0; i < 10; i++) b.step();
  assert.ok(Math.abs(startX - enemy.x - 0.3) < 1e-8);
  while (b.tick < 48) b.step();
  assert.equal(enemy.slowFactor, 1);
});
