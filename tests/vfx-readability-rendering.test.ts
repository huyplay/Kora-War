import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defaultContent } from '../src/data/content';
import { defaultVfxReadability } from '../src/data/vfx-readability';
import { SpriteEffects } from '../src/rendering/vfx/sprite-effects';
import { CombatAccents } from '../src/rendering/vfx/combat-accents';
import type { GameEvent, Unit } from '../src/core/types';

function sprites(t: TestContext, legacy = false) {
  const previous = globalThis.document,
    gradient = { addColorStop() {} },
    context = { createRadialGradient: () => gradient, fillRect() {}, beginPath() {}, arc() {}, stroke() {} };
  globalThis.document = {
    createElement: () => ({ width: 1024, height: 128, getContext: () => context }),
  } as unknown as Document;
  const fx = new SpriteEffects(),
    profile = defaultContent().vfx;
  if (!legacy) profile.readability = defaultVfxReadability();
  fx.configure(profile);
  t.after(() => {
    fx.dispose();
    globalThis.document = previous;
  });
  return { fx, profile };
}
const event = (extra: Partial<GameEvent> = {}): GameEvent => ({
  id: 1,
  time: 1,
  type: 'skill',
  heroId: 'solan',
  lane: 1,
  side: 0,
  x: 0,
  ...extra,
});
const visible = (fx: SpriteEffects) => fx.root.children.filter((o) => o.visible) as THREE.Sprite[];

test('event style applies opacity/blending/model scale/height immediately and limits duration', (t) => {
  const { fx, profile } = sprites(t);
  profile.readability!.events.skill = { opacity: 0.25, scale: 0.5, blend: 'normal', cooldown: 0 };
  profile.readability!.maxDuration = 0.4;
  const e = event(),
    point = { x: 3, z: 0.3 },
    before = structuredClone(e);
  fx.emit(e, point, undefined, { unitId: 1, height: 2.2, scale: 0.5 });
  const sprite = visible(fx)[0];
  assert.equal(sprite.material.blending, THREE.NormalBlending);
  assert.equal(sprite.material.opacity, 0.25);
  assert.equal(sprite.material.toneMapped, false);
  assert.deepEqual(sprite.position.toArray(), [3, 2.2, 0.3]);
  assert.ok(Math.abs(sprite.scale.x - 2.3 * 0.5 * 0.5 * 0.85) < 1e-8);
  fx.update(0.3);
  assert.ok(sprite.material.opacity < 0.25);
  fx.update(0.1);
  assert.equal(fx.activeCount, 0);
  assert.deepEqual(e, before);
  assert.deepEqual(point, { x: 3, z: 0.3 });
});
test('local event budget bounds a dense burst while preserving separate lanes and remote fights', (t) => {
  const { fx } = sprites(t);
  for (let i = 0; i < 500; i++)
    fx.emit(event({ id: i }), { x: (i % 2) * 0.2, z: 0 }, undefined, { unitId: i });
  assert.equal(fx.activeCount, 3);
  fx.emit(event({ id: 501, lane: 0 }), { x: 0, z: -4.5 });
  fx.emit(event({ id: 502 }), { x: 5, z: 0 });
  assert.equal(fx.activeCount, 5);
  fx.update(0.6);
  assert.equal(fx.activeCount, 0);
  fx.emit(event({ time: 2 }), { x: 0, z: 0 });
  assert.equal(fx.activeCount, 1);
  fx.reset();
  fx.emit(event({ time: 2 }), { x: 0, z: 0 });
  assert.equal(fx.activeCount, 1);
});
test('hit cooldown follows the struck unit, and the global pool stays bounded after area/projectile exemptions', (t) => {
  const { fx, profile } = sprites(t);
  profile.readability!.maxPerArea = 8;
  fx.emit(event({ type: 'hit', targetId: 1 }));
  fx.emit(event({ type: 'hit', targetId: 2 }));
  fx.emit(event({ type: 'hit', targetId: 1, time: 1.05 }));
  assert.equal(fx.activeCount, 2);
  fx.emit(event({ type: 'hit', targetId: 1, time: 1.09 }));
  assert.equal(fx.activeCount, 3);
  for (let i = 0; i < 500; i++) fx.emit(event({ id: i, type: 'projectile', toX: 5, time: 2 }));
  assert.equal(fx.activeCount, 48);
  const children = fx.root.children.length;
  fx.update(1);
  assert.equal(fx.activeCount, 0);
  fx.emit(event({ time: 4 }));
  assert.equal(fx.root.children.length, children);
});
test('sprite pause is stable; reduced motion fixes atlas/scale/rotation/flight while opacity expires', (t) => {
  const { fx } = sprites(t);
  fx.emit(event({ type: 'projectile', toX: 5 }), undefined, undefined, { height: 2, reducedMotion: true });
  const sprite = visible(fx)[0],
    before = {
      position: sprite.position.toArray(),
      scale: sprite.scale.toArray(),
      rotation: sprite.material.rotation,
      map: sprite.material.map,
    };
  fx.update(0.08, true);
  assert.deepEqual(sprite.position.toArray(), before.position);
  assert.deepEqual(sprite.scale.toArray(), before.scale);
  assert.equal(sprite.material.rotation, before.rotation);
  assert.equal(sprite.material.map, before.map);
  const opacity = sprite.material.opacity;
  fx.update(0, true);
  assert.equal(sprite.material.opacity, opacity);
  fx.update(0.3, true);
  assert.equal(fx.activeCount, 0);
  fx.emit(event({ time: 3 }), undefined, undefined, { height: 1 });
  fx.update(0.1);
  fx.update(0, true);
  const still = visible(fx)[0].scale.clone();
  fx.update(0.1, true);
  assert.deepEqual(visible(fx)[0].scale, still);
});
test('legacy sprites retain additive blending, full intensity and side/lane hit throttle without a profile', (t) => {
  const { fx } = sprites(t, true);
  fx.emit(event({ type: 'hit', targetId: 1 }));
  fx.emit(event({ type: 'hit', targetId: 2, time: 1.05 }));
  assert.equal(fx.activeCount, 1);
  const sprite = visible(fx)[0];
  assert.equal(sprite.material.blending, THREE.AdditiveBlending);
  assert.equal(sprite.material.opacity, 1);
  assert.equal(sprite.position.y, 1);
});
test('event style can be disabled without hiding a different event or retaining a pooled blend/scale', (t) => {
  const { fx, profile } = sprites(t);
  profile.readability!.events.skill.opacity = 0;
  fx.emit(event());
  assert.equal(fx.activeCount, 0);
  fx.emit(event({ type: 'pulse' }));
  const sprite = visible(fx)[0];
  assert.equal(sprite.material.blending, THREE.AdditiveBlending);
  fx.update(1);
  fx.emit(event({ type: 'spawn', time: 2 }), undefined, undefined, { scale: 0.5 });
  assert.equal(visible(fx)[0], sprite);
  assert.equal(sprite.material.blending, THREE.NormalBlending);
  assert.equal(sprite.material.opacity, 0.55);
});
const unit = (extra: Partial<Unit> = {}): Unit =>
  ({ id: 1, heroId: 'solan', side: 0, lane: 1, x: 0, attackAt: 0, range: 1, stunUntil: 0, ...extra }) as Unit;
const arcs = (fx: CombatAccents) =>
  fx.root.children.filter(
    (o) => o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh),
  ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
test('melee arcs use displayed body height/radius, mirrored facing, config colors and snapshot strike timing', () => {
  const fx = new CombatAccents(),
    p = defaultVfxReadability(),
    camera = new THREE.PerspectiveCamera(),
    u = unit(),
    v = unit({ id: 2, side: 1 });
  fx.configure(p, ['#123456', '#abcdef']);
  fx.observe([u, v], 1);
  const before = structuredClone([u, v]);
  fx.observe(
    [
      { ...u, attackAt: 2 },
      { ...v, attackAt: 2 },
    ],
    2,
    () => ({ x: 4, z: 1, height: 4, radius: 1.2 }),
  );
  fx.update(0, camera);
  const visible = arcs(fx).filter((a) => a.visible);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].position.y, 4 * p.melee.heightRatio);
  assert.equal(visible[0].position.x, 5.2);
  assert.equal(visible[1].position.x, 2.8);
  assert.equal(visible[0].position.z, 1);
  assert.equal(visible[0].material.color.getHexString(), '123456');
  const pose = visible[0].matrix.clone(),
    opacity = visible[0].material.opacity,
    scale = visible[0].scale.clone();
  fx.update(0, camera);
  assert.deepEqual(visible[0].scale, scale);
  assert.equal(visible[0].material.opacity, opacity);
  assert.deepEqual(visible[0].matrix, pose);
  fx.update(p.melee.lifetime, camera);
  assert.ok(arcs(fx).every((a) => !a.visible));
  assert.deepEqual([u, v], before);
  fx.dispose();
});
test('melee pool remains bounded; freeze/disable/reduced motion suppress cues without a later replay burst', () => {
  const fx = new CombatAccents(),
    p = defaultVfxReadability(),
    camera = new THREE.PerspectiveCamera(),
    units = Array.from({ length: 100 }, (_, id) => unit({ id }));
  fx.configure(p);
  fx.observe(units, 1);
  fx.observe(
    units.map((u) => ({ ...u, attackAt: 2 })),
    2,
  );
  assert.equal(arcs(fx).filter((a) => a.visible).length, 16);
  fx.update(0, camera, true);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.observe(
    units.map((u) => ({ ...u, attackAt: 3 })),
    3,
    undefined,
    true,
  );
  fx.observe(
    units.map((u) => ({ ...u, attackAt: 3 })),
    3,
  );
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.observe([unit({ attackAt: 4, frozenUntil: 5 })], 4);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.configure({ ...p, melee: { ...p.melee, enabled: false } });
  fx.observe([unit()], 1);
  fx.observe([unit({ attackAt: 2 })], 2);
  assert.ok(arcs(fx).every((a) => !a.visible));
  fx.reset();
  assert.equal((fx.root.children[0] as THREE.InstancedMesh).count, 0);
  fx.dispose();
});
