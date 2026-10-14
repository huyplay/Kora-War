import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleBattle } from '../src/core/cycle-battle';
import { defaultContent } from '../src/data/content';
import { DEFAULT_CARD_DECK } from '../src/data/card-decks';
import { isSpell } from '../src/data/spells';
import type { Battle } from '../src/core/Battle';
import type { Side } from '../src/core/types';
function battle(cards = DEFAULT_CARD_DECK) {
  const b = cycleBattle(cards, defaultContent(), 21, cards);
  b.mulligan(0, []);
  b.mulligan(1, []);
  b.start();
  b.aiEnabled = false;
  return b;
}
function give(b: Battle, side: Side, id: string) {
  const held = b.hands[side].find((card) => card.id === id);
  if (held) return held;
  const deck = b.drawDecks![side],
    from = deck.pile.indexOf(id);
  assert.ok(from >= 0);
  [deck.hand[0].id, deck.pile[from]] = [deck.pile[from], deck.hand[0].id];
  return deck.hand[0];
}
function deploy(b: Battle, side: Side, id: string, x: number) {
  const card = give(b, side, id);
  b.mana[side] = 100;
  assert.equal(b.play(side, id, 1, x, card.uid), null);
  return b.units.at(-1)!;
}
test('failed card commands are atomic and stale card tokens cannot consume the replacement', () => {
  const b = battle(),
    card = b.hands[0].find((card) => !isSpell(card.id))!;
  b.mana[0] = 0;
  const before = b.snapshot();
  assert.ok(b.play(0, card.id, 1, -11, card.uid));
  assert.deepEqual(b.snapshot(), before);
  b.mana[0] = 100;
  assert.equal(b.play(0, card.id, 1, -11, card.uid), null);
  assert.equal(b.hands[0].length, 6);
  assert.ok(!b.hands[0].some((held) => held.uid === card.uid));
  const after = b.snapshot();
  assert.match(b.play(0, card.id, 1, -11, card.uid)!, /trên tay/);
  assert.deepEqual(b.snapshot(), after);
});
test('new Ice freezes movement, attacks and skills for exactly two seconds, then releases', () => {
  const b = battle(),
    target = deploy(b, 1, 'kael', 7);
  target.x = 3;
  target.shield = 0;
  target.skillCd = 100;
  target.attackCd = 0;
  const card = give(b, 0, 'ice');
  b.mana[0] = 100;
  assert.equal(b.cast(0, 'ice', 1, 3, card.uid), null);
  for (let i = 0; i < 8; i++) b.step();
  const frozenAt = b.time,
    x = target.x,
    attackAt = target.attackAt;
  assert.equal(target.frozenUntil, frozenAt + 2);
  assert.equal(target.hp, target.maxHp - 35);
  // A shorter stun applied during the freeze must not release the unit early.
  target.stunUntil = b.time + 0.1;
  for (let i = 0; i < 39; i++) b.step();
  assert.equal(target.x, x);
  assert.equal(target.attackAt, attackAt);
  assert.equal(target.state, 'stunned');
  b.step();
  assert.ok(Math.abs(b.time - frozenAt - 2) < 1e-8);
  assert.notEqual(target.state, 'stunned');
  assert.ok(target.x < x);
});
test('AI cycles an all-spell hand instead of waiting forever for an enemy target', () => {
  const spells = ['wind', 'fire', 'lightning', 'ice', 'heal', 'shield'];
  const b = battle([...DEFAULT_CARD_DECK.slice(0, 8), ...spells]);
  const draw = b.drawDecks![1];
  spells.forEach((id, index) => {
    const from = draw.hand.findIndex((card) => card.id === id);
    if (from >= 0) [draw.hand[index], draw.hand[from]] = [draw.hand[from], draw.hand[index]];
    else {
      const pileIndex = draw.pile.indexOf(id);
      assert.ok(pileIndex >= 0);
      [draw.hand[index].id, draw.pile[pileIndex]] = [draw.pile[pileIndex], draw.hand[index].id];
    }
  });
  assert.ok(b.hands[1].every((card) => isSpell(card.id)));
  assert.equal(b.units.length, 0);
  b.mana[1] = 100;
  b.ai(1);
  assert.ok(b.stats[1].spent > 0);
  assert.ok(b.hands[1].some((card) => !isSpell(card.id)) || b.units.some((unit) => unit.side === 1));
  assert.equal(new Set([...draw.hand.map((card) => card.id), ...draw.pile, ...draw.discard]).size, 14);
});
test('four support spells respect allegiance, shield caps, modifiers and expiry', () => {
  const cards = [...DEFAULT_CARD_DECK.slice(0, 10), 'heal', 'shield', 'weaken', 'haste'];
  const b = battle(cards),
    ally = deploy(b, 0, 'solan', -9),
    enemy = deploy(b, 1, 'kael', 9);
  ally.hp -= 150;
  ally.shield = 0;
  enemy.shield = 0;
  const cast = (id: string, x: number) => {
    const card = give(b, 0, id);
    b.mana[0] = 100;
    assert.equal(b.cast(0, id, 1, x, card.uid), null);
    for (let i = 0; i < 9; i++) b.step();
  };
  cast('heal', ally.x);
  assert.ok(ally.hp >= ally.maxHp - 50);
  assert.equal(enemy.hp, enemy.maxHp);
  cast('shield', ally.x);
  assert.equal(ally.shield, 100);
  cast('weaken', enemy.x);
  assert.ok(enemy.weakenUntil! > b.time);
  const hp = ally.hp;
  b.damage(ally, 100, 1, enemy);
  assert.equal(ally.hp, hp);
  assert.equal(ally.shield, 30);
  cast('haste', ally.x);
  assert.ok(ally.hasteUntil! > b.time);
  const boostedX = ally.x;
  b.step();
  assert.ok(ally.x - boostedX > ally.speed * 0.05);
  b.time = enemy.weakenUntil!;
  ally.shield = 0;
  const health = ally.hp;
  b.damage(ally, 10, 1, enemy);
  assert.equal(ally.hp, health - 10);
});
test('Nyx prioritizes a backline archer instead of the tank in the new ruleset', () => {
  const b = battle(),
    nyx = deploy(b, 0, 'nyx', -7),
    tank = deploy(b, 1, 'kael', 7),
    archer = deploy(b, 1, 'lyra', 8);
  nyx.x = 0;
  tank.x = 1;
  archer.x = 4;
  tank.shield = archer.shield = 0;
  const tankHp = tank.hp,
    archerHp = archer.hp;
  assert.equal(b.skill(nyx, b.heroes.nyx, [tank, archer]), true);
  assert.equal(tank.hp, tankHp);
  assert.equal(archer.hp, archerHp - 120);
  assert.ok(nyx.x > archer.x);
});
test('seeded AI matches with card cycling remain deterministic across repeated shuffles', () => {
  const run = () => {
    const b = battle();
    b.aiEnabled = true;
    for (let i = 0; i < 7000 && b.phase === 'playing'; i++) {
      if (b.tick % 25 === 0) b.ai(0);
      b.step();
    }
    return b.snapshot();
  };
  const a = run(),
    b = run();
  assert.deepEqual(a, b);
  assert.equal(a.phase, 'ended');
  assert.ok(a.cardDrawInfo!.some((info) => info.cycle > 1));
});
