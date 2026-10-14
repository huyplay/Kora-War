import test from 'node:test';
import assert from 'node:assert/strict';
import { PvpRooms } from '../server/pvp';
import { GameDatabase } from '../server/database';
import { startMatch, finishMatch, type Command } from '../server/game-service';
import { defaultContent } from '../src/data/content';
import { DEFAULT_CARD_DECK } from '../src/data/card-decks';
import { HERO_MAP } from '../src/data/heroes';
import { cycleBattle } from '../src/core/cycle-battle';
import { isSpell } from '../src/data/spells';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const loadout = () => ({ cards: DEFAULT_CARD_DECK.slice(), deck: [], spells: [] });
test('PvP opening hides enemy hands, deck order and seed; starts only after both players confirm', () => {
  let now = 0;
  const rooms = new PvpRooms(() => now),
    a = rooms.create('a', loadout(), defaultContent());
  const b = rooms.join('b', a.code, loadout());
  assert.equal(b.seed, 0);
  assert.equal(b.state!.phase, 'ready');
  assert.equal(b.state!.hands![0].length, 6);
  assert.deepEqual(b.state!.hands![1], []);
  assert.deepEqual(b.opponent, { deck: [], spells: [] });
  assert.ok(!('piles' in b.state!));
  assert.ok(!('rng' in b.state!));
  const own = rooms.state('a', a.code),
    selected = own.state!.hands![0].slice(0, 2).map((card) => card.uid);
  const confirmed = rooms.command('a', a.code, {
    id: 'mulligan-a-1',
    type: 'mulligan',
    cards: selected,
    lane: 0,
    x: 0,
  });
  assert.equal(confirmed.error, null);
  assert.equal(confirmed.state!.phase, 'ready');
  now = 5000;
  assert.equal(rooms.state('b', a.code).state!.tick, 0);
  const started = rooms.command('b', a.code, {
    id: 'mulligan-b-1',
    type: 'mulligan',
    cards: [],
    lane: 0,
    x: 0,
  });
  assert.equal(started.state!.phase, 'playing');
  assert.deepEqual(started.state!.mana, [4, 4]);
  now = 6000;
  assert.equal(rooms.state('a', a.code).state!.tick, 20);
});
test('PvP auto-keeps opening after 15 seconds and rejects invalid or stale physical card IDs atomically', () => {
  let now = 0;
  const rooms = new PvpRooms(() => now),
    a = rooms.create('a', loadout(), defaultContent());
  rooms.join('b', a.code, loadout());
  now = 15000;
  const initial = rooms.state('a', a.code);
  assert.equal(initial.state!.phase, 'playing');
  assert.equal(initial.state!.tick, 0);
  const card = initial.state!.hands![0].find((card) => !isSpell(card.id) && HERO_MAP[card.id].cost <= 4)!;
  assert.throws(
    () => rooms.command('a', a.code, { id: 'missing-token-1', type: 'play', card: card.id, lane: 1, x: -11 }),
    /mã thẻ/,
  );
  const bad = rooms.command('a', a.code, {
    id: 'stale-token-001',
    type: 'play',
    card: card.id,
    cardUid: -1,
    lane: 1,
    x: -11,
  });
  assert.match(bad.error!, /trên tay/);
  assert.deepEqual(bad.state!.hands, initial.state!.hands);
  assert.deepEqual(bad.state!.mana, initial.state!.mana);
  const good = rooms.command('a', a.code, {
    id: 'valid-card-0001',
    type: 'play',
    card: card.id,
    cardUid: card.uid,
    lane: 1,
    x: -11,
  });
  assert.equal(good.error, null);
  const retry = rooms.command('a', a.code, {
    id: 'valid-card-0001',
    type: 'play',
    card: card.id,
    cardUid: card.uid,
    lane: 1,
    x: -11,
  });
  assert.equal(retry.error, null);
  assert.deepEqual(retry.state!.hands, good.state!.hands);
  assert.deepEqual(retry.state!.mana, good.state!.mana);
  const foreign = rooms.state('b', a.code);
  assert.deepEqual(foreign.state!.hands![1], []);
  assert.equal(foreign.state!.units[0].side, 1);
  assert.ok(foreign.state!.units[0].x > 0);
});
test('training replay includes opening swaps and physical card IDs, verifies the result, and awards only once', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-cycle-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const player = db.player(),
    match = startMatch(db, player, [], 'story', [], DEFAULT_CARD_DECK),
    b = cycleBattle(DEFAULT_CARD_DECK, match.content, match.seed, undefined, 'story');
  const uids = b.hands[0].slice(0, 2).map((card) => card.uid);
  b.mulligan(1, []);
  assert.equal(b.mulligan(0, uids), null);
  b.start();
  const log: Command[] = [{ tick: 0, type: 'mulligan', lane: 0, cards: uids }];
  const card = b.hands[0].find((card) => !isSpell(card.id) && b.heroes[card.id].cost <= 4)!;
  assert.equal(b.play(0, card.id, 1, -11, card.uid), null);
  log.push({ tick: 0, type: 'play', heroId: card.id, cardUid: card.uid, lane: 1, x: -11 });
  while (b.phase === 'playing' && b.tick < 18000) b.step();
  assert.equal(b.phase, 'ended');
  db.db.prepare('UPDATE matches SET created=? WHERE id=?').run(Date.now() - b.time * 1000 - 1000, match.id);
  assert.throws(
    () => finishMatch(db, player, match.id, [log[0], { ...log[1], cardUid: -1 }], false),
    /trên tay/,
  );
  const result = finishMatch(db, player, match.id, log, false);
  assert.equal(result.winner, b.winner);
  assert.equal(result.time, b.time);
  assert.deepEqual(finishMatch(db, player, match.id, log, false), result);
});
