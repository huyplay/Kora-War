import test from 'node:test';
import assert from 'node:assert/strict';
import { tacticalBattle } from '../src/core/tactical';
import { updateSpells } from '../src/core/systems/spells';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import { STEP } from '../src/data/rules';

function fireDamageAt(castTick: number) {
  const battle = tacticalBattle(DEFAULT_DECK, ['fire', 'ice'], defaultContent(), 1, DEFAULT_DECK);
  battle.start();
  battle.aiEnabled = false;
  assert.equal(battle.play(1, 'solan', 1), null);
  const enemy = battle.units[0];
  enemy.x = 0;
  enemy.hp = enemy.maxHp = 1000;
  enemy.shield = 0;
  battle.tick = castTick;
  battle.time = castTick * STEP;
  assert.equal(battle.cast(0, 'fire', 1, 0), null);
  let damageTicks = 0;
  for (let tick = castTick + 1; tick <= castTick + 80; tick++) {
    battle.time = tick * STEP;
    const before = enemy.hp;
    updateSpells(battle);
    if (before !== enemy.hp) damageTicks++;
  }
  return { damageTicks, damage: 1000 - enemy.hp, remainingZones: battle.spellZones.length };
}

test('fire lasts exactly sixty damage ticks at every cast tick through six minutes', () => {
  for (let castTick = 0; castTick <= 7200; castTick++) {
    assert.deepEqual(
      fireDamageAt(castTick),
      { damageTicks: 60, damage: 135, remainingZones: 0 },
      `cast tick ${castTick}`,
    );
  }
});

test('fire duration stays bounded when its warning and end times round at large tick offsets', () => {
  for (const castTick of [82, 569, 570, 579, 20000, 72000, 288000]) {
    assert.deepEqual(
      fireDamageAt(castTick),
      { damageTicks: 60, damage: 135, remainingZones: 0 },
      `cast tick ${castTick}`,
    );
  }
});
