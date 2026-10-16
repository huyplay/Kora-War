import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TowerEffects, towerRangeBounds } from '../src/rendering/vfx/tower-effects';
import { unitBodyPoint } from '../src/rendering/unit-visual-metrics';
import { World } from '../src/rendering/World';
import { defaultContent } from '../src/data/content';
import { defaultArenaPresentation } from '../src/data/arena-presentation';
import { LANES } from '../src/data/map';
import type { Tower, Unit, GameEvent } from '../src/core/types';
import { combatEventAnchors, type CombatAnchor } from '../src/rendering/combat-anchors';

const config = defaultArenaPresentation().towers;
const camera = new THREE.PerspectiveCamera();
const mesh = (fx: TowerEffects, name: string) => fx.root.getObjectByName(name) as THREE.InstancedMesh;
function translation(fx: TowerEffects, name: string, index = 0) {
  const matrix = new THREE.Matrix4();
  mesh(fx, name).getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}
const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} != ${expected}`);

test('torso anchors follow rendered origin, published height and dense/spawning scale without changing them', () => {
  const point = Object.freeze({ x: 4, y: 0.2, z: -0.6 });
  for (const height of [1.5, 4.8])
    for (const scale of [0.15, 0.4, 1]) {
      const body = unitBodyPoint(point, height, scale);
      assert.equal(body.x, point.x);
      assert.equal(body.z, point.z);
      assert.equal(body.y, point.y + height * scale * 0.55);
    }
  assert.deepEqual(point, { x: 4, y: 0.2, z: -0.6 });
});

test('World tower shots use the paired hit body including killed targets and retain the historical fallback', () => {
  const content = defaultContent();
  content.models.solan = { assetId: 'qa', height: 4.8, yaw: 0, clips: {} };
  const calls: unknown[][] = [];
  const world = Object.create(World.prototype) as World;
  Object.assign(world, {
    content,
    towerEffects: { emit: (...args: unknown[]) => calls.push(args) },
    reducedMotion: { matches: true },
  });
  const target = {
    unit: { id: 7, heroId: 'solan', side: 1, lane: 1, x: 3, hp: 0 } as Unit,
    position: { x: 3.4, y: 0.2, z: 0.7 },
    scale: 0.4,
  } satisfies CombatAnchor;
  const events: GameEvent[] = [
    { id: 10, time: 2, type: 'hit', side: 0, lane: 1, x: 3, targetId: 7, value: 20 },
    { id: 11, time: 2, type: 'death', side: 1, lane: 1, x: 3, heroId: 'solan' },
    { id: 12, time: 2, type: 'projectile', side: 0, lane: 1, x: -9, toX: 3 },
  ];
  const before = structuredClone(events);
  world.effect(events[2], combatEventAnchors(events, 2, new Map([[7, target]])));
  assert.equal(calls[0][0], '0-1');
  const destination = calls[0][2] as THREE.Vector3;
  assert.deepEqual(destination.toArray(), [3.4, 0.2 + 4.8 * 0.4 * 0.55, 0.7]);
  assert.equal(calls[0][5], 7);
  assert.equal(calls[0][6], true);
  world.effect(events[2]);
  assert.deepEqual((calls[1][2] as THREE.Vector3).toArray(), [3, 1.1, 0]);
  assert.equal(calls[1][5], undefined);
  assert.deepEqual(events, before);
});

test('tower shots sample all body coordinates through arrival then lock impact to that point', () => {
  const fx = new TowerEffects(),
    from = new THREE.Vector3(-9, 4, 0),
    to = new THREE.Vector3(1, 1, 0);
  const target = new THREE.Vector3(3, 2, 0.5);
  try {
    fx.emit('0-1', from, to, 0, 0.4, 42);
    fx.update([], 4, 1.55, config, 0.1, camera, (id) => {
      assert.equal(id, 42);
      return target;
    });
    const head = translation(fx, 'TowerBolts');
    near(head.x, -6);
    near(head.y, 3.5 + Math.sin(Math.PI * 0.25) * 0.5);
    near(head.z, 0.125);
    target.set(4, 3, 1);
    fx.update([], 4, 1.55, config, 0.32, camera, () => target);
    assert.equal(mesh(fx, 'TowerBolts').count, 0);
    assert.equal(mesh(fx, 'TowerImpacts').count, 1);
    assert.deepEqual(translation(fx, 'TowerImpacts').toArray(), [4, 3, 1]);
    target.set(50, 20, 10);
    fx.update([], 4, 1.55, config, 0.05, camera, () => {
      throw new Error('arrived shots must not chase targets');
    });
    assert.deepEqual(translation(fx, 'TowerImpacts').toArray(), [4, 3, 1]);
    assert.deepEqual(from.toArray(), [-9, 4, 0]);
    assert.deepEqual(to.toArray(), [1, 1, 0]);
  } finally {
    fx.dispose();
  }
});

test('pause freezes tracking and missing/dead/non-finite visual anchors keep the last valid body point', () => {
  const fx = new TowerEffects(),
    target = new THREE.Vector3(4, 2, 0.5);
  try {
    fx.emit('0-1', new THREE.Vector3(-9, 4, 0), new THREE.Vector3(2, 1, 0), 0, 0.4, 7);
    fx.update([], 4, 1.55, config, 0.1, camera, () => target);
    const frozen = mesh(fx, 'TowerBolts').instanceMatrix.array.slice();
    target.set(8, 6, 3);
    fx.update([], 4, 1.55, config, 0, camera, () => {
      throw new Error('pause cannot sample a new visual position');
    });
    assert.deepEqual(mesh(fx, 'TowerBolts').instanceMatrix.array, frozen);
    fx.update([], 4, 1.55, config, 0.05, camera, () => undefined);
    fx.update([], 4, 1.55, config, 0.27, camera, () => new THREE.Vector3(NaN, 1, 0));
    assert.deepEqual(translation(fx, 'TowerImpacts').toArray(), [4, 2, 0.5]);
  } finally {
    fx.dispose();
  }
});

test('reduced motion uses static body and ground cues and never resumes a converted moving shot', () => {
  const fx = new TowerEffects(),
    target = new THREE.Vector3(3, 2, 0.5);
  try {
    fx.emit('0-1', new THREE.Vector3(-9, 4, 0), target, 0, 0.4, 7, true);
    fx.update([], 4, 1.55, config, 0, camera, () => new THREE.Vector3(90, 1, 0), { reducedMotion: true });
    for (const name of ['TowerBolts', 'TowerTrails', 'TowerGlows']) assert.equal(mesh(fx, name).count, 0);
    const staticImpact = mesh(fx, 'TowerImpacts').instanceMatrix.array.slice();
    fx.update([], 4, 1.55, config, 0.1, camera, () => target, { reducedMotion: true });
    assert.deepEqual(mesh(fx, 'TowerImpacts').instanceMatrix.array, staticImpact);
    assert.deepEqual(translation(fx, 'TowerTargetMarkers').toArray(), [3, Math.fround(0.29), 0.5]);
    fx.update([], 4, 1.55, config, 0.05, camera, () => target, { reducedMotion: false });
    assert.equal(mesh(fx, 'TowerBolts').count, 0);
    fx.reset();
    fx.emit('0-1', new THREE.Vector3(-9, 4, 0), target, 1, 0.4, 7);
    fx.update([], 4, 1.55, config, 0.1, camera, () => target);
    assert.equal(mesh(fx, 'TowerBolts').count, 1);
    fx.update([], 4, 1.55, config, 0, camera, () => target, { reducedMotion: true });
    assert.equal(mesh(fx, 'TowerBolts').count, 0);
    fx.update([], 4, 1.55, config, 0.8, camera, () => target);
    for (const name of ['TowerBolts', 'TowerImpacts', 'TowerTargetMarkers'])
      assert.equal(mesh(fx, name).count, 0);
  } finally {
    fx.dispose();
  }
});

test('range planes use snapshot bounds/palette/opacity, remove missing towers and hide/reset without stale ranges', () => {
  const fx = new TowerEffects();
  const towers: Tower[] = ([0, 1] as const).flatMap((side) =>
    LANES.map((_, lane) => ({
      id: `${side}-${lane}`,
      side,
      lane,
      x: side ? 8 : -8,
      hp: 400,
      maxHp: 400,
      cooldown: 0,
    })),
  );
  const original = structuredClone(towers),
    palette = { ally: '#2277ee', enemy: '#ee6622' };
  let disposals = 0;
  try {
    fx.update(towers, 3.5, 1.2, config, 0, camera, undefined, { palette });
    const areas = fx.root.children.filter((o) => o.name === 'TowerLaneRange') as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.ShaderMaterial
    >[];
    for (const [i, area] of areas.entries()) {
      const t = towers[i],
        bounds = towerRangeBounds(t.x, LANES[t.lane], 3.5, 1.2),
        box = new THREE.Box3().setFromObject(area);
      near(box.min.x, bounds.minX);
      near(box.max.x, bounds.maxX);
      near(box.min.z, bounds.minZ);
      near(box.max.z, bounds.maxZ);
      assert.equal(area.material.uniforms.color.value.getHexString(), t.side ? 'ee6622' : '2277ee');
      assert.equal(area.material.uniforms.strength.value, config.idleRangeOpacity);
      assert.equal(area.material.toneMapped, false);
      area.geometry.addEventListener('dispose', () => disposals++);
      area.material.addEventListener('dispose', () => disposals++);
    }
    fx.emit('0-0', new THREE.Vector3(), new THREE.Vector3(2, 1, 0), 0, 0.4);
    fx.update(towers, 3.5, 1.2, config, 0, camera, undefined, { palette, reducedMotion: true });
    assert.equal(areas[0].material.uniforms.strength.value, config.firingRangeOpacity);
    fx.update(towers, 3.5, 1.2, { ...config, showRange: false }, 0, camera);
    assert.ok(areas.every((a) => !a.visible));
    towers[0].hp = 0;
    fx.update(towers, 3.5, 1.2, config, 0, camera);
    assert.equal(areas[0].visible, false);
    fx.reset();
    assert.ok(areas.every((a) => !a.visible));
    fx.update(towers.slice(1), 5, 0.9, config, 0, camera);
    assert.equal(disposals, 2);
    assert.equal(areas[0].parent, null);
    assert.equal(areas[1].scale.x, 10);
    assert.equal(areas[1].scale.y, 1.8);
    assert.deepEqual(towers.slice(1), original.slice(1));
  } finally {
    fx.dispose();
  }
  assert.equal(disposals, 12);
  assert.equal(fx.root.children.length, 0);
});

test('dense and degenerate shots keep finite bounded instances, expire and dispose resources once', () => {
  const fx = new TowerEffects(),
    target = new THREE.Vector3(1, 1, 0);
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  fx.root.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      geometries.add(o.geometry);
      materials.add(o.material as THREE.Material);
    }
  });
  let disposed = 0;
  geometries.forEach((g) => g.addEventListener('dispose', () => disposed++));
  materials.forEach((m) => m.addEventListener('dispose', () => disposed++));
  for (const duration of [0, -1, NaN, Infinity]) fx.emit('0-1', target, target, 0, duration);
  fx.emit('0-1', target, new THREE.Vector3(NaN, 1, 0), 0, 0.4);
  fx.update([], 4, 1.55, config, 0, camera);
  assert.equal(mesh(fx, 'TowerBolts').count, 0);
  for (let i = 0; i < 200; i++) fx.emit('0-1', target, target, (i % 2) as 0 | 1, 0.4, undefined, i % 2 === 0);
  fx.update([], 4, 1.55, config, 0, camera);
  const instances = fx.root.children as THREE.InstancedMesh[];
  for (const instance of instances) {
    assert.ok(instance.count <= 32);
    assert.ok(instance.instanceMatrix.array.every(Number.isFinite));
  }
  fx.update([], 4, 1.55, config, 2, camera);
  assert.ok(instances.every((m) => m.count === 0));
  fx.dispose();
  assert.equal(disposed, geometries.size + materials.size);
});
