import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../src/core/Battle';
import { tacticalBattle } from '../src/core/tactical';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import { DEFAULT_SPELLS, SPELLS, type SpellId } from '../src/data/spells';
import { updateSpells } from '../src/core/systems/spells';
import { parseSave } from '../src/services/save-store';
import { PvpRooms } from '../server/pvp';
const loadout = () => ({ deck: DEFAULT_DECK.slice(), spells: DEFAULT_SPELLS.slice() });
function battle(spells: SpellId[] = DEFAULT_SPELLS) {
  const b = tacticalBattle(DEFAULT_DECK, spells, defaultContent(), 17, DEFAULT_DECK, spells);
  b.start();
  b.aiEnabled = false;
  return b;
}
test('tactical mode normalizes levels, starts both sides at four and validates two unique spells', () => {
  const b = new Battle(
    DEFAULT_DECK,
    'normal',
    1,
    DEFAULT_DECK,
    defaultContent(),
    { solan: 10 },
    { spells: [DEFAULT_SPELLS, DEFAULT_SPELLS] },
  );
  b.start();
  assert.deepEqual(b.mana, [4, 4]);
  assert.equal(b.play(0, 'solan', 1), null);
  assert.equal(b.play(1, 'solan', 1), null);
  assert.equal(b.units[0].maxHp, b.units[1].maxHp);
  assert.equal(b.units[0].attack, b.units[1].attack);
  assert.throws(() => battle(['fire', 'fire']), /2 phép/);
  assert.deepEqual(parseSave('{"spells":["wind","lightning"]}').spells, ['wind', 'lightning']);
  assert.deepEqual(parseSave('{"spells":["toString","ice"]}').spells, DEFAULT_SPELLS);
});
test('invalid spell commands are atomic; cost is shared and cooldown rejects spam', () => {
  const b = battle();
  for (const [id, lane, x] of [
    ['wind', 0, 0],
    ['fire', -1, 0],
    ['fire', 0, NaN],
    ['fire', 1, 15],
    ['toString', 0, 0],
  ] as const) {
    assert.ok(b.cast(0, id, lane, x));
    assert.deepEqual(b.mana, [4, 4]);
    assert.equal(b.spellZones.length, 0);
  }
  assert.equal(b.cast(0, 'fire', 1, 0), null);
  assert.equal(b.mana[0], 0);
  assert.ok(b.play(0, 'solan', 1));
  b.mana[0] = 10;
  assert.ok(b.cast(0, 'fire', 1, 0));
  assert.equal(b.mana[0], 10);
  b.phase = 'paused';
  assert.ok(b.cast(0, 'ice', 1, 0));
});
test('spells warn before impact, affect only enemies in their lane and have bounded effects', () => {
  for (const id of Object.keys(SPELLS) as SpellId[]) {
    const b = battle([id, id === 'fire' ? 'ice' : 'fire']);
    b.mana = [100, 100];
    for (const [side, lane] of [
      [0, 1],
      [1, 1],
      [1, 0],
    ] as const) {
      b.cooldowns[side] = {};
      b.play(side, 'solan', lane);
      const u = b.units.at(-1)!;
      u.x = 0;
      u.shield = 0;
      u.hp = u.maxHp = 1000;
    }
    const [ally, enemy, otherLane] = b.units;
    assert.equal(b.cast(0, id, 1, 0), null);
    updateSpells(b);
    assert.equal(enemy.hp, 1000);
    for (let tick = 1; tick <= 100; tick++) {
      b.time = tick * 0.05;
      updateSpells(b);
    }
    assert.equal(ally.hp, 1000);
    assert.equal(otherLane.hp, 1000);
    assert.ok(
      Math.abs(enemy.hp - (1000 - (id === 'fire' ? 135 : SPELLS[id].damage))) < 1e-6,
      `${id}: ${enemy.hp}`,
    );
    if (id === 'wind') assert.equal(enemy.x, 2);
    if (id === 'ice') {
      assert.equal(enemy.slowFactor, 0.6);
      assert.ok(enemy.slowUntil <= 2.5);
    }
    if (id === 'lightning') assert.ok(enemy.stunUntil <= 1.3);
    assert.equal(b.spellZones.length, 0);
  }
});
test('tactical AI matches remain deterministic with spells and reach an outcome', () => {
  const run = () => {
    const b = battle(['lightning', 'wind']);
    b.aiEnabled = true;
    while (b.phase === 'playing' && b.tick < 7000) {
      if (b.tick % 25 === 0) b.ai(0);
      b.step();
    }
    assert.equal(b.phase, 'ended');
    assert.ok(b.mana.every((m) => m >= 0 && m <= 10));
    return { snapshot: b.snapshot(), spells: b.spellZones, cooldowns: b.cooldowns };
  };
  assert.deepEqual(run(), run());
});
test('PvP server owns clock, identity, normalized loadouts and mirrored state', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  const room = rooms.create('alice', loadout(), defaultContent());
  assert.equal(room.waiting, true);
  assert.throws(() => rooms.state('intruder', room.code), /quyền/);
  rooms.join('bob', room.code, loadout());
  assert.throws(() => rooms.join('eve', room.code, loadout()), /đủ/);
  const command = { id: 'unique-command-1', type: 'play' as const, card: 'solan', lane: 1, x: -11 };
  const first = rooms.command('bob', room.code, command);
  assert.equal(first.error, null);
  assert.equal(first.state!.units[0].side, 0);
  assert.equal(first.state!.units[0].x, -11);
  assert.equal(rooms.command('bob', room.code, command).state!.units.length, 1);
  const alice = rooms.state('alice', room.code);
  assert.equal(alice.state!.units[0].side, 1);
  assert.equal(alice.state!.units[0].x, 11);
  assert.equal(alice.state!.mana[1], first.state!.mana[0]);
  now += 500;
  assert.equal(rooms.state('alice', room.code).state!.tick, 10);
  assert.ok(rooms.command('alice', room.code, { ...command, id: 'invalid-place-1', x: 11 }).error);
  assert.throws(
    () => rooms.command('alice', room.code, { ...command, id: 'invalid-lane-1', lane: 100 }),
    /Lệnh/,
  );
  rooms.leave('bob', room.code);
  assert.equal(rooms.state('alice', room.code).state!.winner, 0);
  assert.equal(rooms.state('bob', room.code).state!.winner, 1);
  assert.throws(() => rooms.command('alice', room.code, { ...command, id: 'after-end-0001' }), /kết thúc/);
});
test('PvP reconnect grace, waiting expiration and content copy are enforced', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now),
    content = defaultContent();
  const room = rooms.create('alice', loadout(), content);
  content.heroes[0].hp = 1;
  const joined = rooms.join('bob', room.code, loadout());
  assert.notEqual(joined.content!.heroes[0].hp, 1);
  now += 20000;
  rooms.state('alice', room.code);
  rooms.state('bob', room.code);
  now += 20000;
  rooms.state('alice', room.code);
  now += 11000;
  assert.equal(rooms.state('alice', room.code).state!.winner, 0);
  const waiting = rooms.create('charlie', loadout(), defaultContent());
  now += 600001;
  assert.throws(() => rooms.join('dana', waiting.code, loadout()), /hết hạn/);
});
test('duplicate PvP commands stay idempotent after hundreds of later commands', () => {
  const rooms = new PvpRooms(() => 1000),
    room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  const command = { id: 'original-command-1', type: 'spell' as const, card: 'fire', lane: 1, x: 0 };
  assert.equal(rooms.command('alice', room.code, command).error, null);
  for (let i = 0; i < 300; i++)
    assert.ok(rooms.command('alice', room.code, { ...command, id: `later-command-${i}` }).error);
  assert.equal(rooms.command('alice', room.code, command).error, null);
  assert.equal(rooms.state('alice', room.code).state!.spellZones.length, 1);
});
test('creating from another tab returns the locked current room and stale rooms do not block a new match', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now),
    original = rooms.create('alice', loadout(), defaultContent());
  assert.equal(rooms.current('outsider'), null);
  const returned = rooms.create(
    'alice',
    { deck: DEFAULT_DECK, spells: ['wind', 'lightning'] },
    defaultContent(),
  );
  assert.equal(returned.code, original.code);
  assert.deepEqual(returned.loadout.spells, DEFAULT_SPELLS);
  rooms.join('bob', original.code, loadout());
  assert.equal(rooms.current('alice')?.code, original.code);
  now += 31000;
  const fresh = rooms.create('alice', loadout(), defaultContent());
  assert.notEqual(fresh.code, original.code);
  assert.equal(fresh.waiting, true);
});
