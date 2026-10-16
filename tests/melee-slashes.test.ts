import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Unit, GameEvent } from '../src/core/types';
import { defaultVfxReadability } from '../src/data/vfx-readability';
import { CombatAccents, meleeSlashGeometry, type MeleePosition } from '../src/rendering/vfx/combat-accents';

const camera = new THREE.PerspectiveCamera();
const unit = (extra: Partial<Unit> = {}) =>
  ({
    id: 7,
    heroId: 'solan',
    side: 0,
    lane: 1,
    x: 0,
    hp: 100,
    range: 1,
    attackAt: 0,
    stunUntil: 0,
    state: 'attack',
    ...extra,
  }) as Unit;
const arcs = (fx: CombatAccents) =>
  fx.root.children.filter((o) => o.name === 'MeleeSlash') as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  >[];
const sparks = (fx: CombatAccents) =>
  fx.root.children.find((o) => o instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
function strike(fx: CombatAccents, point?: (id: number) => MeleePosition | undefined) {
  fx.observe([unit()], 1);
  fx.observe([unit({ attackAt: 2 })], 2, point);
  return arcs(fx).find((a) => a.visible)!;
}
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('melee crescent has narrow ends, shaded edges and shared geometry with the legacy fallback intact', () => {
  const geometry = meleeSlashGeometry(),
    p = geometry.getAttribute('position'),
    colors = geometry.getAttribute('color');
  assert.ok([...p.array, ...colors.array].every(Number.isFinite));
  assert.ok(geometry.boundingSphere!.radius < 1);
  const rowWidth = (row: number) =>
    new THREE.Vector3()
      .fromBufferAttribute(p, row * 3)
      .distanceTo(new THREE.Vector3().fromBufferAttribute(p, row * 3 + 2));
  near(rowWidth(0), 0);
  near(rowWidth(24), 0);
  assert.ok(rowWidth(12) > 0.1);
  for (let row = 0; row < 25; row++) {
    assert.equal(colors.getX(row * 3), 0);
    assert.equal(colors.getX(row * 3 + 2), 0);
    assert.ok(colors.getX(row * 3 + 1) > 0);
  }
  assert.equal(geometry.index!.count / 3, 96);
  geometry.dispose();
  const fx = new CombatAccents();
  const legacy = arcs(fx)[0].geometry;
  assert.equal(legacy.type, 'RingGeometry');
  fx.configure(defaultVfxReadability());
  assert.equal(new Set(arcs(fx).map((a) => a.geometry)).size, 1);
  assert.notEqual(arcs(fx)[0].geometry, legacy);
  assert.ok(arcs(fx).every((a) => a.material.vertexColors && !a.material.toneMapped));
  fx.configure();
  assert.equal(arcs(fx)[0].geometry, legacy);
  assert.ok(arcs(fx).every((a) => !a.material.vertexColors && a.material.toneMapped));
  fx.dispose();
});

test('a melee slash follows its displayed owner origin, height and radius while pause holds pose and lookup', () => {
  const fx = new CombatAccents(),
    profile = defaultVfxReadability();
  profile.melee.size = 0.8;
  profile.melee.heightRatio = 0.6;
  profile.melee.lifetime = 0.6;
  fx.configure(profile, ['#123456', '#abcdef']);
  const point = Object.freeze({ x: 2, y: 0.25, z: -0.4, height: 3, radius: 1 });
  const arc = strike(fx, () => point);
  fx.update(0, camera);
  assert.deepEqual(arc.position.toArray(), [3, 0.25 + 3 * 0.6, -0.4]);
  assert.equal(arc.material.color.getHexString(), '123456');
  fx.update(0.1, camera, false, (id) => {
    assert.equal(id, 7);
    return { x: 4, y: 0.5, z: 0.7, height: 2, radius: 0.5 };
  });
  assert.deepEqual(arc.position.toArray(), [4.5, 0.5 + 2 * 0.6, 0.7]);
  near(arc.scale.x, (0.8 + (0.1 / 0.6) * 0.5) * 2 * 0.45 * 0.8);
  const pose = {
    position: arc.position.clone(),
    scale: arc.scale.clone(),
    rotation: arc.quaternion.clone(),
    opacity: arc.material.opacity,
  };
  for (const dt of [0, -1, NaN, Infinity])
    fx.update(dt, camera, false, () => {
      throw Error('paused lookup');
    });
  assert.deepEqual(arc.position, pose.position);
  assert.deepEqual(arc.scale, pose.scale);
  assert.deepEqual(arc.quaternion.toArray(), pose.rotation.toArray());
  assert.equal(arc.material.opacity, pose.opacity);
  assert.deepEqual(point, { x: 2, y: 0.25, z: -0.4, height: 3, radius: 1 });
  fx.update(0.5, camera);
  assert.equal(arc.visible, false);
  fx.dispose();
});

test('missing or invalid melee anchors keep the last valid point; invalid initial anchors use a finite lane fallback', () => {
  const fx = new CombatAccents();
  fx.configure(defaultVfxReadability());
  const arc = strike(fx, () => ({ x: NaN, z: 0 }));
  assert.ok(arc.position.toArray().every(Number.isFinite));
  const before = arc.position.clone();
  for (const bad of [
    undefined,
    { x: Infinity, z: 0 },
    { x: 2, y: NaN, z: 0 },
    { x: 2, z: 0, height: -1 },
    { x: 2, z: 0, radius: -1 },
  ])
    fx.update(0.01, camera, false, () => bad);
  assert.deepEqual(arc.position, before);
  fx.update(0.01, camera, false, (id) => {
    assert.equal(id, 7);
    return { x: 3, z: 1 };
  });
  assert.notDeepEqual(arc.position, before);
  const initial = unit(),
    original = structuredClone(initial);
  fx.reset();
  fx.observe([initial], 1);
  fx.observe([unit({ x: NaN, attackAt: 2 })], 2);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.observe([unit({ attackAt: 4 })], 3);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.observe([unit({ attackAt: 4 })], 4);
  assert.ok(
    arcs(fx).every((a) => !a.visible),
    'future/late timestamps must not replay an old cue',
  );
  assert.deepEqual(initial, original);
  fx.dispose();
});

test('freeze, stun, death and reduced motion clear active melee trails without replay on release', () => {
  for (const change of [{ frozenUntil: 3 }, { stunUntil: 3 }, { state: 'stunned' as const }, { hp: 0 }]) {
    const fx = new CombatAccents();
    fx.configure(defaultVfxReadability());
    strike(fx);
    assert.ok(arcs(fx).some((a) => a.visible));
    fx.observe([unit({ attackAt: 2, ...change })], 2.05);
    assert.ok(arcs(fx).every((a) => !a.visible));
    fx.observe([unit({ attackAt: 2 })], 2.1);
    assert.ok(arcs(fx).every((a) => !a.visible));
    fx.dispose();
  }
  const fx = new CombatAccents();
  fx.configure(defaultVfxReadability());
  strike(fx);
  fx.update(0, camera, true);
  fx.observe([unit({ attackAt: 2 })], 2.05);
  fx.update(0.01, camera);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.observe([unit({ attackAt: 2.1 })], 2.1);
  assert.ok(arcs(fx).some((a) => a.visible));
  fx.observe([], 2.15);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.dispose();
});

test('sparks include display origin height, reject invalid samples and keep finite paused matrices', () => {
  const fx = new CombatAccents();
  fx.configure(defaultVfxReadability());
  const event: GameEvent = { id: 1, time: 2, type: 'hit', side: 0, lane: 1, x: 0, value: 10 };
  fx.emit(event, { x: 2, y: 0.4, z: 1 }, 1.2);
  fx.emit(event, { x: NaN, z: 1 });
  fx.emit(event, undefined, Infinity);
  fx.update(0, camera);
  assert.equal(sparks(fx).count, 4);
  const matrix = new THREE.Matrix4();
  sparks(fx).getMatrixAt(0, matrix);
  near(new THREE.Vector3().setFromMatrixPosition(matrix).y, 1.6);
  const before = matrix.clone();
  for (const dt of [0, -1, NaN, Infinity]) fx.update(dt, camera);
  sparks(fx).getMatrixAt(0, matrix);
  assert.deepEqual(matrix, before);
  fx.update(0.28, camera);
  assert.equal(sparks(fx).count, 0);
  fx.emit(event);
  fx.update(0, camera, true);
  assert.equal(sparks(fx).count, 0);
  fx.dispose();
});

test('melee resources remain bounded through reset and dispose once; late calls cannot revive them', () => {
  const fx = new CombatAccents(),
    resources = new Set<THREE.BufferGeometry | THREE.Material>();
  const collect = () =>
    fx.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        resources.add(o.geometry);
        resources.add(o.material as THREE.Material);
      }
    });
  collect();
  fx.configure(defaultVfxReadability());
  collect();
  let disposed = 0;
  resources.forEach((r) => r.addEventListener('dispose', () => disposed++));
  const units = Array.from({ length: 100 }, (_, id) => unit({ id }));
  fx.observe(units, 1);
  fx.observe(
    units.map((u) => ({ ...u, attackAt: 2 })),
    2,
  );
  assert.equal(arcs(fx).filter((a) => a.visible).length, 16);
  assert.equal(fx.root.children.length, 17);
  fx.reset();
  fx.observe(units, 2);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.dispose();
  fx.dispose();
  assert.equal(disposed, resources.size);
  fx.configure(defaultVfxReadability());
  fx.observe(units, 3, () => {
    throw Error('late lookup');
  });
  fx.update(1, camera);
  fx.emit({ id: 1, time: 2, type: 'hit', side: 0, lane: 1, x: 0, value: 10 });
  assert.equal(fx.root.children.length, 0);
});
