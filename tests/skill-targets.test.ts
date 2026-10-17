import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defaultContent } from '../src/data/content';
import { defaultVfxReadability } from '../src/data/vfx-readability';
import { cycleBattle } from '../src/core/cycle-battle';
import { Battle } from '../src/core/Battle';
import { castAbility } from '../src/core/systems/cast-ability';
import { onlineState } from '../src/core/online-state';
import type { GameEvent, Side, Unit } from '../src/core/types';
import { combatEventAnchors, type CombatAnchor } from '../src/rendering/combat-anchors';
import { SkillTargetEffects } from '../src/rendering/vfx/skill-targets';
import { World } from '../src/rendering/World';

function battle(content = defaultContent()) {
  const b = cycleBattle(content.gameplay!.deck.defaultCards, content, 92);
  b.mulligan(0, []);
  b.mulligan(1, []);
  b.start();
  b.aiEnabled = false;
  b.time = 10;
  return b;
}
function unit(b: Battle, id: number, heroId: string, side: Side, x: number, extra: Partial<Unit> = {}): Unit {
  const h = b.heroes[heroId];
  const u: Unit = {
    id,
    heroId,
    side,
    lane: 1,
    x,
    previousX: x,
    hp: h.hp,
    maxHp: h.hp,
    shield: 0,
    attack: h.attack,
    range: h.range,
    speed: h.speed,
    attackCd: 0,
    skillCd: 0,
    slowUntil: 0,
    slowFactor: 1,
    stunUntil: 0,
    born: 0,
    attackAt: -10,
    skillAt: -10,
    state: 'attack',
    ...extra,
  };
  b.units.push(u);
  return u;
}
const skill = (b: Battle) => b.events.filter((e) => e.type === 'skill').at(-1)!;
const cast = (b: Battle, caster: Unit) =>
  castAbility(
    b,
    caster,
    b.heroes[caster.heroId],
    b.units.filter((u) => u.side !== caster.side && u.hp > 0),
  );

test('skill trace identifies the actual caster and health-selected victim, including a lethal hit', () => {
  const b = battle(),
    caster = unit(b, 2, 'nyx', 0, 0);
  unit(b, 1, 'nyx', 0, 0);
  unit(b, 3, 'solan', 1, 0.3);
  const victim = unit(b, 4, 'solan', 1, 2, { hp: 50 });
  const beforeMana = [...b.mana],
    beforeHand = structuredClone(b.hands);
  assert.equal(cast(b, caster), true);
  assert.equal(skill(b).sourceId, 2);
  assert.equal(skill(b).toX, 0.3, 'legacy nearest coordinate remains unchanged');
  assert.deepEqual(skill(b).skillTargets, [{ unitId: 4, x: 2, side: 1, effects: ['damage'] }]);
  assert.equal(victim.hp, 0);
  assert.deepEqual(b.mana, beforeMana);
  assert.deepEqual(b.hands, beforeHand);
});

test('support traces follow each effect selection after the previous heal, not a cached nearest ally', () => {
  const c = defaultContent();
  c.abilities.mira.effects = Array.from({ length: 2 }, () => ({
    kind: 'heal',
    amount: 40,
    targets: { group: 'allies', woundedOnly: true, order: 'healthRatio', limit: 1 },
  }));
  const b = battle(c),
    caster = unit(b, 1, 'mira', 0, 0),
    one = unit(b, 2, 'solan', 0, 2, { maxHp: 100, hp: 10 }),
    two = unit(b, 3, 'solan', 0, 0.2, { maxHp: 100, hp: 20 });
  assert.equal(cast(b, caster), true);
  assert.equal(one.hp, 50);
  assert.equal(two.hp, 60);
  assert.deepEqual(skill(b).skillTargets, [
    { unitId: 2, x: 2, side: 0, effects: ['heal'] },
    { unitId: 3, x: 0.2, side: 0, effects: ['heal'] },
  ]);
});

test('composite skills identify self shield and enemy control without duplicating target kinds', () => {
  const c = defaultContent();
  c.abilities.kael.effects.push(structuredClone(c.abilities.kael.effects[1]));
  const b = battle(c),
    caster = unit(b, 1, 'kael', 0, 0),
    enemy = unit(b, 2, 'solan', 1, 0.5);
  assert.equal(cast(b, caster), true);
  assert.equal(caster.shield, 140);
  assert.equal(enemy.stunUntil, 11.2);
  assert.deepEqual(skill(b).skillTargets, [
    { unitId: 1, x: 0, side: 0, effects: ['shield'] },
    { unitId: 2, x: 0.5, side: 1, effects: ['stun'] },
  ]);
});

test('no-op shielding does not claim a recipient; dead units do not receive a new control cue', () => {
  const b = battle(),
    caster = unit(b, 1, 'aurelia', 0, 0, { shield: 220 });
  unit(b, 2, 'solan', 1, 0.5);
  assert.equal(cast(b, caster), true);
  assert.deepEqual(skill(b).skillTargets, []);
  caster.shield = 210;
  assert.equal(cast(b, caster), true);
  assert.deepEqual(skill(b).skillTargets, [{ unitId: 1, x: 0, side: 0, effects: ['shield'] }]);
  const c = defaultContent();
  c.abilities.orin.effects[0].amount = 1000;
  const lethal = battle(c),
    orn = unit(lethal, 1, 'orin', 0, 0);
  unit(lethal, 2, 'solan', 1, 0.5, { hp: 10 });
  assert.equal(cast(lethal, orn), true);
  assert.deepEqual(skill(lethal).skillTargets, [{ unitId: 2, x: 0.5, side: 1, effects: ['damage'] }]);
});

test('legacy skills omit trace fields; viewer mirroring changes recipient sides/coordinates but keeps IDs', () => {
  const old = new Battle();
  old.time = 10;
  const caster = unit(old, 1, 'solan', 0, 0);
  unit(old, 2, 'solan', 1, 0.5);
  assert.equal(cast(old, caster), true);
  assert.equal(Object.hasOwn(skill(old), 'sourceId'), false);
  assert.equal(Object.hasOwn(skill(old), 'skillTargets'), false);
  const b = battle(),
    kael = unit(b, 10, 'kael', 1, 1);
  unit(b, 20, 'solan', 0, -0.5);
  cast(b, kael);
  const original = structuredClone(skill(b));
  const mirrored = onlineState(b, 1)
    .events.filter((e) => e.type === 'skill')
    .at(-1)!;
  assert.equal(mirrored.sourceId, 10);
  assert.equal(mirrored.side, 0);
  assert.deepEqual(mirrored.skillTargets, [
    { unitId: 10, x: -1, side: 0, effects: ['shield'] },
    { unitId: 20, x: 0.5, side: 1, effects: ['stun'] },
  ]);
  mirrored.skillTargets![0].effects.push('damage');
  assert.deepEqual(skill(b), original);
});

const event = (extra: Partial<GameEvent> = {}): GameEvent => ({
  id: 1,
  time: 10,
  type: 'skill',
  side: 0,
  lane: 1,
  x: 0,
  heroId: 'solan',
  sourceId: 2,
  skillTargets: [{ unitId: 4, x: 3, side: 1, effects: ['damage'] }],
  ...extra,
});
const anchor = (id: number, side: Side, x: number, heroId = 'solan'): CombatAnchor => ({
  unit: { id, side, x, lane: 1, heroId, range: 5, attackAt: 10 } as Unit,
  position: { x, y: 0.2, z: id * 0.1 },
  scale: 0.5,
});
function fixture() {
  const c = defaultContent();
  c.vfx.readability = defaultVfxReadability();
  Object.assign(c.vfx.readability, { maxPerArea: 8, areaRadius: 0.25 });
  c.vfx.readability.events.skill.cooldown = 0;
  c.models.solan = { assetId: 'qa', height: 4, yaw: 0, clips: {} };
  const fx = new SkillTargetEffects();
  fx.configure(c.vfx, c.heroes, c.models);
  return { fx, c, camera: new THREE.PerspectiveCamera() };
}
test('explicit caster IDs never borrow another copy, and each recipient retains its own displayed anchor', () => {
  const traces = event(),
    anchors = new Map([
      [1, anchor(1, 0, 0)],
      [2, anchor(2, 0, 5)],
      [3, anchor(3, 1, 3)],
      [4, anchor(4, 1, 3)],
    ]);
  const resolved = combatEventAnchors([traces], 0, anchors);
  assert.equal(resolved.source?.unit.id, 2);
  assert.equal(resolved.recipients?.[0].anchor?.unit.id, 4);
  anchors.delete(2);
  assert.equal(combatEventAnchors([traces], 0, anchors).source, undefined);
  assert.equal(combatEventAnchors([{ ...traces, sourceId: undefined }], 0, anchors).source?.unit.id, 1);
  const { fx, camera } = fixture();
  try {
    fx.emit(traces, resolved, 10, true);
    fx.update(0, camera);
    const matrix = new THREE.Matrix4();
    fx.root.getMatrixAt(0, matrix);
    const position = new THREE.Vector3().setFromMatrixPosition(matrix);
    assert.ok(Math.abs(position.x - 3) < 1e-6);
    assert.ok(Math.abs(position.z - 0.4) < 1e-6);
    assert.ok(Math.abs(position.y - (0.2 + 4 * 0.5 * 0.52)) < 1e-6);
  } finally {
    fx.dispose();
  }
});

test('recipient cues follow only their retained IDs, preserve pause, and keep a missing/dead target position', () => {
  const { fx, camera } = fixture();
  try {
    fx.emit(event(), undefined, 10, true);
    fx.update(0.1, camera, (id) => {
      assert.equal(id, 4);
      return { x: 4, y: 0.5, z: 1, height: 3 };
    });
    const before = Array.from(fx.root.instanceMatrix.array);
    fx.update(0, camera, () => ({ x: 99, z: 99 }));
    assert.deepEqual(Array.from(fx.root.instanceMatrix.array), before);
    fx.update(0.05, camera, () => undefined);
    assert.deepEqual(Array.from(fx.root.instanceMatrix.array), before);
    fx.update(1, camera);
    assert.equal(fx.activeCount, 0);
    assert.equal(fx.root.count, 0);
  } finally {
    fx.dispose();
  }
});

test('multi-effect skills stay in a single bounded draw and reset/dispose all resources once', () => {
  const { fx, camera } = fixture(),
    geometry = fx.root.geometry,
    material = fx.root.material;
  let geometryDisposals = 0,
    materialDisposals = 0;
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  const targets = Array.from({ length: 100 }, (_, i) => ({
    unitId: i + 10,
    x: i * 2,
    side: 1 as Side,
    effects: ['damage', 'heal', 'shield', 'slow', 'stun'] as const,
  }));
  fx.emit(event({ skillTargets: targets.map((t) => ({ ...t, effects: [...t.effects] })) }), undefined, 10);
  fx.update(0, camera);
  assert.equal(fx.activeCount, 32);
  assert.equal(fx.root.count, 160);
  assert.equal(fx.root.geometry, geometry);
  assert.equal(fx.root.material, material);
  assert.equal(fx.emit(event(), undefined, 10), false, 'duplicate packet never adds cues');
  fx.reset();
  assert.equal(fx.activeCount, 0);
  assert.equal(fx.root.count, 0);
  assert.equal(fx.emit(event(), undefined, 10), true, 'new match can reuse event IDs');
  fx.dispose();
  fx.dispose();
  fx.update(0.2, camera);
  assert.equal(fx.emit(event({ id: 2 }), undefined, 10), false);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
});

test('readability suppresses crowded/disabled cues and stale/reconnected events; cooldown is per caster', () => {
  const { fx, c, camera } = fixture();
  try {
    const p = c.vfx.readability!;
    p.maxPerArea = 1;
    p.events.skill.cooldown = 0.2;
    fx.configure(c.vfx, c.heroes);
    assert.equal(fx.emit(event(), undefined, 10.6), false);
    assert.equal(fx.emit(event(), undefined, 9), false);
    assert.equal(fx.emit(event({ skillTargets: undefined }), undefined, 10), false);
    assert.equal(
      fx.emit(
        event({
          skillTargets: [
            { unitId: 4, x: 3, side: 1, effects: ['heal'] },
            { unitId: 5, x: 3.1, side: 1, effects: ['shield'] },
          ],
        }),
        undefined,
        10,
      ),
      true,
    );
    assert.equal(fx.activeCount, 1);
    assert.equal(
      fx.emit(
        event({ id: 2, time: 10.1, skillTargets: [{ unitId: 6, x: 8, side: 1, effects: ['damage'] }] }),
        undefined,
        10.1,
      ),
      false,
    );
    assert.equal(
      fx.emit(
        event({
          id: 3,
          sourceId: 3,
          time: 10.1,
          skillTargets: [{ unitId: 6, x: 8, side: 1, effects: ['damage'] }],
        }),
        undefined,
        10.1,
      ),
      true,
    );
    fx.update(0, camera);
    assert.equal(fx.root.count, 2);
    p.events.skill.opacity = 0;
    fx.configure(c.vfx, c.heroes);
    assert.equal(fx.emit(event(), undefined, 10), false);
    assert.equal(fx.root.count, 0);
    delete c.vfx.readability;
    fx.configure(c.vfx, c.heroes);
    assert.equal(fx.emit(event(), undefined, 10), false);
  } finally {
    fx.dispose();
  }
});

test('reduced motion freezes glyph movement without jumping when toggled during the cue', () => {
  const { fx, camera } = fixture();
  try {
    fx.emit(event(), undefined, 10, true);
    fx.update(0, camera);
    const staticPose = Array.from(fx.root.instanceMatrix.array);
    fx.update(0.1, camera, undefined, true);
    assert.deepEqual(Array.from(fx.root.instanceMatrix.array), staticPose);
    fx.reset();
    fx.emit(event(), undefined, 10);
    fx.update(0.1, camera);
    const moving = Array.from(fx.root.instanceMatrix.array);
    fx.update(0.1, camera, undefined, true);
    assert.deepEqual(Array.from(fx.root.instanceMatrix.array), moving);
    fx.update(0.1, camera, undefined, false);
    assert.deepEqual(Array.from(fx.root.instanceMatrix.array), moving);
  } finally {
    fx.dispose();
  }
});

test('World suppresses stale modern skill effects before emitting caster or recipient cues', () => {
  const world = Object.create(World.prototype) as World,
    c = defaultContent();
  c.vfx.readability = defaultVfxReadability();
  Object.assign(world, { content: c, placementState: { time: 12 } });
  assert.doesNotThrow(() => world.effect(event()));
});

test('World keeps the configured caster sprite and forwards exact recipient anchors to the new consumer', () => {
  const c = defaultContent();
  c.vfx.readability = defaultVfxReadability();
  const source = anchor(2, 0, 5),
    target = anchor(4, 1, 3),
    e = event();
  const resolved = combatEventAnchors(
    [e],
    0,
    new Map([
      [2, source],
      [4, target],
    ]),
  );
  const calls: { skill: unknown[][]; sprite: unknown[][] } = { skill: [], sprite: [] };
  const world = Object.create(World.prototype) as World;
  Object.assign(world, {
    content: c,
    placementState: { time: 10 },
    reducedMotion: { matches: false },
    skillTargets: { emit: (...args: unknown[]) => calls.skill.push(args) },
    sprites: { emit: (...args: unknown[]) => calls.sprite.push(args) },
    accents: { emit: () => {} },
  });
  world.effect(e, resolved);
  assert.equal(calls.skill[0][1], resolved);
  assert.equal(calls.skill[0][2], 10);
  assert.equal(calls.sprite[0][1], source.position, 'custom caster atlas stays on the actual casting model');
});

test('area damage and slow share their confirmed recipients and exclude other lanes', () => {
  const b = battle(),
    caster = unit(b, 1, 'vesper', 0, 0);
  unit(b, 2, 'solan', 1, 0.5);
  unit(b, 3, 'solan', 1, 2.5);
  unit(b, 4, 'solan', 1, 0.5, { lane: 0 });
  assert.equal(cast(b, caster), true);
  assert.deepEqual(skill(b).skillTargets, [
    { unitId: 2, x: 0.5, side: 1, effects: ['damage', 'slow'] },
    { unitId: 3, x: 2.5, side: 1, effects: ['damage', 'slow'] },
  ]);
});

test('camera projection keeps recipient glyphs readable with a bounded scale and no depth occlusion', () => {
  const { fx, camera } = fixture();
  try {
    camera.position.z = 30;
    camera.updateMatrixWorld();
    fx.emit(event(), undefined, 10, true);
    fx.update(0, camera, undefined, true, 390);
    const matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3();
    fx.root.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    assert.ok(scale.x > 0.46);
    assert.ok(scale.x <= 1.2);
    assert.equal(fx.root.material.depthTest, false);
    camera.position.z = 1000;
    camera.updateMatrixWorld();
    fx.update(0, camera, undefined, true, 390);
    fx.root.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    assert.ok(Math.abs(scale.x - 1.2) < 1e-6);
  } finally {
    fx.dispose();
  }
});
