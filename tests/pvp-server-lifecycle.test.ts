import test from 'node:test';
import assert from 'node:assert/strict';
import { PvpRooms } from '../server/pvp';
import { tacticalBattle } from '../src/core/tactical';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import { DEFAULT_SPELLS } from '../src/data/spells';

const loadout = () => ({ deck: DEFAULT_DECK.slice(), spells: DEFAULT_SPELLS.slice() });

test('PvP snapshots cannot mutate the room content, locked loadouts or combat state', () => {
  const rooms = new PvpRooms(() => 1000);
  const created = rooms.create('alice', loadout(), defaultContent());
  created.content!.heroes[0].hp = 1;
  created.loadout.deck[0] = 'nyx';
  created.loadout.spells[0] = 'wind';
  const joined = rooms.join('bob', created.code, loadout());
  assert.notEqual(joined.content!.heroes[0].hp, 1);
  assert.deepEqual(joined.opponent, loadout());
  joined.content!.rules = { ...joined.content!.rules, manaPerSecond: 999 };
  joined.opponent!.deck.splice(0);
  joined.loadout.spells.splice(0);
  joined.state!.mana[0] = 100;
  const snapshot = rooms.state('alice', created.code);
  assert.deepEqual(snapshot.loadout, loadout());
  assert.deepEqual(snapshot.opponent, loadout());
  assert.deepEqual(snapshot.state!.mana, [4, 4]);
  assert.equal(snapshot.content!.rules.manaPerSecond, defaultContent().rules.manaPerSecond);
});

test('a player can join another waiting room after the old battle times out', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  const old = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', old.code, loadout());
  const waiting = rooms.create('charlie', loadout(), defaultContent());
  now += 31000;
  const joined = rooms.join('alice', waiting.code, loadout());
  assert.equal(joined.waiting, false);
  assert.equal(joined.state!.phase, 'playing');
});

test('disconnect ends at the first expired heartbeat and stops combat catch-up there', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  const room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  rooms.command('bob', room.code, {
    id: 'deploy-before-timeout',
    type: 'play',
    card: 'solan',
    lane: 1,
    x: -11,
  });
  now += 20000;
  rooms.state('alice', room.code);
  now += 40000;
  const snapshot = rooms.state('alice', room.code).state!;
  assert.equal(snapshot.phase, 'ended');
  assert.equal(snapshot.winner, 0, 'the earlier missing opponent loses even if both are now late');
  assert.equal(snapshot.tick, 600, 'no combat ticks run beyond the 30 second grace deadline');
  assert.equal(snapshot.time, 30);
  assert.ok(snapshot.events.every((event) => event.time <= 30));
});

test('the exact reconnect grace deadline permits a heartbeat and a tied timeout keeps its winner', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  const room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  now += 30000;
  assert.equal(rooms.state('alice', room.code).state!.phase, 'playing');
  assert.equal(rooms.state('bob', room.code).state!.phase, 'playing');
  now += 30001;
  const snapshot = rooms.state('alice', room.code).state!;
  assert.equal(snapshot.phase, 'ended');
  assert.equal(snapshot.winner, 1, 'equal heartbeat deadlines preserve the existing side 0 loss');
  assert.equal(snapshot.tick, 1200);
});

test('a surrendered room expires five minutes after a zero-valued clock timestamp', () => {
  let now = 0;
  const rooms = new PvpRooms(() => now);
  const room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  rooms.leave('bob', room.code);
  now = 300000;
  assert.equal(rooms.state('alice', room.code).state!.phase, 'ended');
  now++;
  assert.throws(() => rooms.state('alice', room.code), /quyền/);
});

test('a timeout room expires from the actual deadline rather than its first later observation', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  const room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  now += 330001;
  assert.throws(() => rooms.state('alice', room.code), /quyền/);
  assert.equal(rooms.current('alice'), null);
});

test('abandoned battles release room capacity after disconnect grace and finished TTL', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  for (let i = 0; i < 200; i++) {
    const room = rooms.create(`host-${i}`, loadout(), defaultContent());
    rooms.join(`guest-${i}`, room.code, loadout());
  }
  assert.throws(() => rooms.create('new-host', loadout(), defaultContent()), /đầy/);
  now += 330001;
  assert.equal(rooms.create('new-host', loadout(), defaultContent()).waiting, true);
});

test('core victory before disconnect wins and finished TTL starts at the final combat tick', () => {
  let now = 1000;
  const rooms = new PvpRooms(() => now);
  const room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  const expected = tacticalBattle(
    DEFAULT_DECK,
    DEFAULT_SPELLS,
    defaultContent(),
    room.seed,
    DEFAULT_DECK,
    DEFAULT_SPELLS,
  );
  expected.aiEnabled = false;
  expected.start();
  while (expected.phase === 'playing') expected.step();
  const finalAt = 1000 + expected.tick * 50;
  const lastHeartbeat = finalAt - 15000;
  while (now < lastHeartbeat) {
    now = Math.min(now + 25000, lastHeartbeat);
    rooms.state('alice', room.code);
    rooms.state('bob', room.code);
  }
  // Observe only after both heartbeats expire: the earlier core result still applies.
  now += 35000;
  const snapshot = rooms.state('alice', room.code).state!;
  assert.equal(snapshot.phase, 'ended');
  assert.equal(snapshot.tick, expected.tick);
  assert.equal(snapshot.winner, expected.winner);
  assert.deepEqual(snapshot.cores, expected.cores);
  now = finalAt + 300000;
  assert.equal(rooms.state('alice', room.code).state!.phase, 'ended');
  now++;
  assert.throws(() => rooms.state('alice', room.code), /quyền/);
});

test('a command retry after surrender returns its cached result without applying it twice', () => {
  const rooms = new PvpRooms(() => 1000);
  const room = rooms.create('alice', loadout(), defaultContent());
  rooms.join('bob', room.code, loadout());
  const command = {
    id: 'deployment-then-surrender',
    type: 'play' as const,
    card: 'solan',
    lane: 1,
    x: -11,
  };
  assert.equal(rooms.command('alice', room.code, command).error, null);
  rooms.leave('bob', room.code);
  const repeated = rooms.command('alice', room.code, command);
  assert.equal(repeated.error, null);
  assert.equal(repeated.state!.units.length, 1);
  assert.equal(repeated.state!.phase, 'ended');
});
