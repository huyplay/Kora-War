import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../src/core/Battle';
import { tacticalBattle } from '../src/core/tactical';
import { updateUnits } from '../src/core/systems/units';
import { updateSpells } from '../src/core/systems/spells';
import type { Unit } from '../src/core/types';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import { DEFAULT_SPELLS, SPELLS } from '../src/data/spells';
import { STEP } from '../src/data/rules';

const deck = ['kael', 'mira', 'vesper', 'solan'];
function setup(tactical = true) {
  const b = tactical
    ? tacticalBattle(deck, DEFAULT_SPELLS, defaultContent(), 9, DEFAULT_DECK)
    : new Battle(deck, 'normal', 9, DEFAULT_DECK);
  b.aiEnabled = false;
  b.start();
  b.mana = [100, 100];
  assert.equal(b.play(0, 'kael', 0), null);
  assert.equal(b.play(0, 'vesper', 0), null);
  assert.equal(b.play(1, 'solan', 1), null);
  const [source, caster, target] = b.units;
  target.x = 0;
  target.hp = target.maxHp = 2000;
  target.shield = 0;
  for (const unit of b.units) unit.attackCd = unit.skillCd = 1000;
  return { b, source, caster, target };
}
function ice(b: Battle, target: Unit, castAt: number) {
  b.time = castAt;
  b.mana[0] = 100;
  b.cooldowns[0].ice = 0;
  assert.equal(b.cast(0, 'ice', 1, target.x), null);
  b.time = castAt + SPELLS.ice.warning;
  updateSpells(b);
}
function frost(b: Battle, source: Unit, target: Unit, at: number) {
  b.time = at;
  b.damage(target, 1, source.side, source);
}
function ability(b: Battle, caster: Unit, target: Unit, at: number) {
  b.time = at;
  caster.lane = target.lane;
  caster.x = target.x - 1;
  assert.equal(b.skill(caster, b.heroes[caster.heroId], [target]), true);
  caster.lane = 0;
  caster.x = -12;
}
function movesAt(b: Battle, target: Unit, at: number, factor: number) {
  b.time = at;
  const before = target.x;
  updateUnits(b);
  assert.ok(Math.abs(target.x - before + target.speed * STEP * factor) < 1e-10);
  assert.equal(target.slowFactor, factor);
}

test('tactical Ice remains at 40% through Frost hits and falls back to the remaining 20%', () => {
  const { b, source, target } = setup();
  ice(b, target, 0);
  const iceEnd = SPELLS.ice.warning + 2;
  frost(b, source, target, 1);
  assert.equal(target.slowFactor, 0.6);
  assert.equal(target.slowUntil, iceEnd);
  movesAt(b, target, iceEnd - STEP, 0.6);
  movesAt(b, target, iceEnd, 0.8);
  assert.equal(target.slowUntil, 2.5);
  movesAt(b, target, 2.5, 1);
});

test('tactical Ice applied after Frost keeps each duration instead of extending the stronger slow', () => {
  const { b, source, target } = setup();
  frost(b, source, target, 0);
  ice(b, target, 0);
  frost(b, source, target, 2);
  const iceEnd = SPELLS.ice.warning + 2;
  movesAt(b, target, iceEnd - STEP, 0.6);
  movesAt(b, target, iceEnd, 0.8);
  assert.equal(target.slowUntil, 3.5);
  movesAt(b, target, 3.5, 1);
});

test('tactical ability, Ice and Frost select the strongest active source then expire independently', () => {
  const { b, source, caster, target } = setup();
  ability(b, caster, target, 0);
  assert.equal(target.slowFactor, 0.5);
  ice(b, target, 1);
  assert.equal(target.slowFactor, 0.5);
  assert.equal(target.slowUntil, 3);
  frost(b, source, target, 2.5);
  movesAt(b, target, 3 - STEP, 0.5);
  movesAt(b, target, 3, 0.6);
  assert.equal(target.slowUntil, 3.4);
  movesAt(b, target, 3.4, 0.8);
  assert.equal(target.slowUntil, 4);
  movesAt(b, target, 4, 1);
});

test('same-strength tactical slows refresh their own expiry without stacking percentages', () => {
  const { b, caster, target } = setup();
  ability(b, caster, target, 0);
  ability(b, caster, target, 1);
  assert.equal(target.slowFactor, 0.5);
  assert.equal(target.slowUntil, 4);
  movesAt(b, target, 3, 0.5);
  movesAt(b, target, 4, 1);
});

test('an incoming weaker tactical ability cannot overwrite or prolong Ice', () => {
  const { b, caster, target } = setup();
  b.content.abilities.vesper.effects = [
    { kind: 'slow', targets: { group: 'areaEnemies', radius: 3 }, amount: 0.9, duration: 3 },
  ];
  ice(b, target, 0);
  ability(b, caster, target, 1);
  assert.equal(target.slowFactor, 0.6);
  assert.equal(target.slowUntil, 2.4);
  movesAt(b, target, 2.4, 0.9);
  assert.equal(target.slowUntil, 4);
  movesAt(b, target, 4, 1);
});

test('an older tactical snapshot with an active slow preserves it when a new source arrives', () => {
  const { b, source, target } = setup();
  target.slowFactor = 0.6;
  target.slowUntil = 2.4;
  frost(b, source, target, 1);
  assert.equal(target.slowFactor, 0.6);
  assert.equal(target.slowUntil, 2.4);
  movesAt(b, target, 2.4, 0.8);
  movesAt(b, target, 2.5, 1);
});

test('diagnostic snapshots cannot mutate live tactical slow strength or expiry', () => {
  const { b, target } = setup();
  ice(b, target, 0);
  const snapshotUnit = b.snapshot().units.find((unit) => unit.id === target.id)!;
  assert.ok(snapshotUnit.slowEffects);
  snapshotUnit.slowEffects[0].factor = 0.1;
  snapshotUnit.slowEffects[0].until = 100;
  movesAt(b, target, 1, 0.6);
  movesAt(b, target, 2.4, 1);
});

test('expired tactical slow sources are refreshed while stunned or attacking', () => {
  const { b, source, target } = setup();
  ice(b, target, 0);
  frost(b, source, target, 2);
  target.stunUntil = 3;
  b.time = 2.4;
  updateUnits(b);
  assert.equal(target.state, 'stunned');
  assert.equal(target.slowFactor, 0.8);
  assert.equal(target.slowUntil, 3.5);
  target.stunUntil = 0;
  target.x = -9;
  b.time = 3.5;
  updateUnits(b);
  assert.equal(target.state, 'attack');
  assert.equal(target.slowFactor, 1);
  assert.equal(target.slowUntil, 0);
});

test('legacy slows retain overwrite behavior and never add tactical slow records', () => {
  const { b, source, caster, target } = setup(false);
  ability(b, caster, target, 0);
  assert.equal(target.slowFactor, 0.5);
  assert.equal(target.slowUntil, 3);
  frost(b, source, target, 1);
  assert.equal(target.slowFactor, 0.8);
  assert.equal(target.slowUntil, 3);
  movesAt(b, target, 2, 0.8);
  assert.equal(Object.hasOwn(target, 'slowEffects'), false);
  assert.equal(Object.hasOwn(b.snapshot().units[2], 'slowEffects'), false);
});
test('tactical Ice expires at its exact fixed tick even when floating point expiry rounds upward', () => {
  const { b, target } = setup();
  ice(b, target, 33 * STEP);
  movesAt(b, target, 80 * STEP, 0.6);
  movesAt(b, target, 81 * STEP, 1);
});
