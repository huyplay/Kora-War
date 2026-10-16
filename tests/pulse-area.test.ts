import test from 'node:test';
import assert from 'node:assert/strict';
import { pulseAffectsUnit } from '../src/core/physics/pulse-area';
import { cycleBattle } from '../src/core/cycle-battle';
import { defaultContent } from '../src/data/content';
import { DEFAULT_CARD_DECK } from '../src/data/card-decks';
import { defaultGameplay } from '../src/data/gameplay';

test('pulse membership is living logical lane only, without a horizontal radius or mutation', () => {
  const unit = Object.freeze({ lane: 1, hp: 100, x: 500, side: 1 });
  const before = JSON.stringify(unit);
  assert.equal(pulseAffectsUnit(unit, 1), true);
  for (const lane of [0, 2]) assert.equal(pulseAffectsUnit(unit, lane), false);
  for (const hp of [0, -1]) assert.equal(pulseAffectsUnit({ ...unit, hp }, 1), false);
  assert.equal(pulseAffectsUnit({ ...unit, hp: Number.MIN_VALUE }, 1), true);
  assert.equal(JSON.stringify(unit), before);
});

test('configured resonance cast matches the shared lane predicate for either side, including distant units', () => {
  for (const side of [0, 1] as const) {
    const content = defaultContent();
    content.gameplay ??= defaultGameplay();
    Object.assign(content.gameplay.resonance, {
      cap: 73,
      damage: 37,
      heal: 29,
      stun: 0.8,
      damageGain: 0,
      killGain: 0,
      structureGain: 0,
    });
    content.gameplay.deck.shuffle = false;
    const b = cycleBattle(DEFAULT_CARD_DECK, content, 9, DEFAULT_CARD_DECK);
    b.mulligan(0, []);
    b.mulligan(1, []);
    b.start();
    b.aiEnabled = false;
    b.mana[0] = 10;
    assert.equal(b.play(0, 'solan', 1), null);
    const base = b.units[0];
    b.units = [
      { ...base, id: 1, side, x: -500, hp: 1000, maxHp: 2000, shield: 0 },
      { ...base, id: 2, side: side === 0 ? 1 : 0, x: 500, hp: 1000, maxHp: 2000, shield: 0 },
      { ...base, id: 3, side, x: 0, hp: 0, maxHp: 2000, shield: 0 },
      { ...base, id: 4, side: side === 0 ? 1 : 0, lane: 2, x: 0, hp: 1000, maxHp: 2000, shield: 0 },
    ];
    b.synergies = [{}, {}];
    b.time = 12;
    b.resonance[side] = 73;
    const affected = b.units.map((u) => pulseAffectsUnit(u, 1));
    assert.deepEqual(affected, [true, true, false, false]);
    const mana = b.mana.slice();
    assert.equal(b.pulse(side, 1), null);
    assert.deepEqual(
      b.units.map((u) => u.hp),
      [1029, 963, 0, 1000],
    );
    assert.equal(b.units[1].stunUntil, 12.8);
    assert.equal(b.resonance[side], 0);
    assert.deepEqual(b.mana, mana);
    assert.equal(b.stats[side].skills, 1);
  }
});
