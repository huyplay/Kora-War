import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDatabase } from '../server/database';
import { CompetitionStore } from '../server/competition-store';
import { PvpRooms } from '../server/pvp';
import { createGameServer } from '../server/http';
import { defaultContent, validateContent } from '../src/data/content';
import { defaultCompetition, eloAfter, modeContent } from '../src/data/competition';
import { DEFAULT_CARD_DECK } from '../src/data/card-decks';
const loadout = () => ({ cards: DEFAULT_CARD_DECK.slice(), deck: [], spells: [] });
function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'kora-competition-'));
  const db = new GameDatabase(dir, 'qa-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const competition = new CompetitionStore(db),
    players = [db.player(), db.player(), db.player()];
  let time = 0;
  const rooms = new PvpRooms(() => time, competition);
  return {
    db,
    competition,
    players,
    rooms,
    at: (n: number) => {
      time = n;
    },
    content: db.config().published,
  };
}
test('Elo rewards an upset, respects floor, and leaves equal-rating draws unchanged', () => {
  const c = defaultCompetition();
  assert.equal(eloAfter(1000, 1000, 1, c), 1016);
  assert.equal(eloAfter(1000, 1000, 0, c), 984);
  assert.equal(eloAfter(1000, 1000, 0.5, c), 1000);
  assert.ok(eloAfter(1000, 1400, 1, c) > 1016);
  assert.equal(eloAfter(0, 0, 0, c), 0);
});
test('mode configuration validates cross-fields and changes challenge only', () => {
  const content = defaultContent(),
    original = structuredClone(content);
  const challenge = modeContent(content, 'challenge');
  assert.equal(challenge.rules.manaPerSecond, 2.1);
  assert.equal(challenge.rules.overtimeAt, 90);
  assert.deepEqual(modeContent(content, 'ranked'), original);
  assert.deepEqual(modeContent(content, 'casual'), original);
  assert.deepEqual(content, original);
  validateContent(content);
  content.competition!.rating.tiers[1].minimum = 0;
  assert.throws(() => validateContent(content), /hạng/);
  content.competition = defaultCompetition();
  content.competition.challenge.overtimeAt = 181;
  assert.throws(() => validateContent(content), /hạng/);
});
test('ranked surrender settles once, locks config, and hides opponent cards and settlement of others', (t) => {
  const f = fixture(t),
    [a, b, outsider] = f.players;
  const queued = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 7);
  assert.ok(queued.waiting);
  assert.equal(f.rooms.enqueue(a, loadout(), f.content, 'ranked', 7).code, queued.code);
  assert.throws(() => f.rooms.join(b, queued.code, loadout()), /mã mời/);
  const joined = f.rooms.enqueue(b, loadout(), f.content, 'ranked', 7);
  assert.equal(joined.code, queued.code);
  assert.equal(joined.seed, 0);
  assert.deepEqual(joined.opponent, { deck: [], spells: [] });
  assert.deepEqual(joined.state!.hands![1], []);
  f.content.competition!.rating.kFactor = 100;
  f.rooms.leave(a, queued.code);
  const result = f.rooms.state(b, queued.code);
  assert.equal(result.outcome!.delta, 16);
  assert.equal(result.outcome!.reason, 'surrender');
  result.outcome!.after = 99999;
  assert.equal(f.rooms.state(b, queued.code).outcome!.after, 1016);
  f.rooms.leave(a, queued.code);
  f.rooms.tick();
  const own = f.competition.overview(b, f.content);
  assert.equal(own.self.games, 1);
  assert.equal(own.self.wins, 1);
  assert.equal(own.history.length, 1);
  assert.equal(own.self.rank, 1);
  assert.equal(f.competition.overview(a, f.content).self.rating, 984);
  assert.equal(f.competition.overview(outsider, f.content).history.length, 0);
  assert.throws(() => f.rooms.state(outsider, queued.code), /quyền/);
  const row = f.db.db.prepare('SELECT revision,content FROM pvp_matches').get()!;
  assert.equal(row.revision, 7);
  assert.equal(JSON.parse(String(row.content)).competition.rating.kFactor, 32);
});
test('casual, challenge and private matches never change ranked score or count', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  for (const mode of ['casual', 'challenge', 'friendly'] as const) {
    const first =
      mode === 'friendly'
        ? f.rooms.create(a, loadout(), f.content, 1)
        : f.rooms.enqueue(a, loadout(), f.content, mode, 1);
    const joined =
      mode === 'friendly'
        ? f.rooms.join(b, first.code, loadout())
        : f.rooms.enqueue(b, loadout(), f.content, mode, 1);
    assert.equal(joined.content!.rules.manaPerSecond, mode === 'challenge' ? 2.1 : 1.05);
    assert.equal(joined.content!.rules.overtimeAt, mode === 'challenge' ? 90 : 180);
    f.rooms.leave(a, first.code);
    assert.equal(f.rooms.state(b, first.code).outcome!.delta, 0);
  }
  const own = f.competition.overview(b, f.content);
  assert.equal(own.self.rating, 1000);
  assert.equal(own.self.games, 0);
  assert.equal(own.history.length, 3);
  assert.equal(own.leaderboard.length, 0);
});
test('waiting Elo windows expand and redirect both polling and cancel commands to matched room', (t) => {
  const f = fixture(t),
    [a, b, outside] = f.players;
  f.competition.score(b, f.content);
  f.db.db.prepare('UPDATE ratings SET rating=1300 WHERE player=?').run(b);
  const first = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  const second = f.rooms.enqueue(b, loadout(), f.content, 'ranked', 1);
  assert.notEqual(first.code, second.code);
  f.at(20000);
  f.rooms.state(a, first.code);
  f.rooms.state(b, second.code);
  f.rooms.tick();
  assert.ok(f.rooms.state(a, first.code).waiting);
  f.at(30000);
  f.rooms.tick();
  const redirected = f.rooms.state(b, second.code, false);
  assert.equal(redirected.code, first.code);
  assert.ok(redirected.content);
  assert.equal(redirected.waiting, false);
  assert.throws(() => f.rooms.state(outside, second.code), /quyền/);
  f.rooms.leave(b, second.code);
  assert.equal(f.rooms.state(a, first.code).outcome!.result, 'win');
});
test('matchmaking isolates modes and revisions; canceled or abandoned queues cannot be matched', (t) => {
  const f = fixture(t),
    [a, b, c] = f.players;
  const ranked = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  const casual = f.rooms.enqueue(b, loadout(), f.content, 'casual', 1);
  const newer = f.rooms.enqueue(c, loadout(), f.content, 'ranked', 2);
  assert.ok(newer.waiting);
  f.rooms.tick();
  assert.ok(f.rooms.state(a, ranked.code).waiting);
  assert.ok(f.rooms.state(b, casual.code).waiting);
  assert.throws(() => f.rooms.enqueue(a, loadout(), f.content, 'challenge', 1), /rời phòng/);
  f.rooms.leave(a, ranked.code);
  assert.equal(f.rooms.current(a), null);
  f.at(31000);
  f.rooms.tick();
  assert.equal(f.rooms.current(b), null);
  assert.equal(f.rooms.current(c), null);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM pvp_matches').get()!.n, 0);
});
test('server heartbeat settles disconnected matches without client polling and does not settle twice', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  const first = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.rooms.enqueue(b, loadout(), f.content, 'ranked', 1);
  f.at(20000);
  f.rooms.state(a, first.code);
  f.at(31001);
  f.rooms.tick();
  f.rooms.tick();
  const winner = f.competition.overview(a, f.content);
  assert.equal(winner.history[0].result, 'win');
  assert.equal(winner.history[0].reason, 'disconnect');
  assert.equal(winner.self.games, 1);
  assert.equal(winner.self.rating, 1016);
});
test('restart persists results and voids interrupted matches without Elo changes', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.rooms.enqueue(b, loadout(), f.content, 'ranked', 1);
  const recovered = new CompetitionStore(f.db);
  recovered.recover();
  recovered.recover();
  const own = recovered.overview(a, f.content);
  assert.equal(own.history[0].result, 'void');
  assert.equal(own.history[0].reason, 'server-restart');
  assert.equal(own.self.games, 0);
  assert.equal(own.self.rating, 1000);
  const row = f.db.db.prepare('SELECT id FROM pvp_matches').get()!;
  assert.equal(recovered.finish(String(row.id), 0, 'combat')[0].result, 'void');
});
test('complete 17-module database upgrades once, preserves old revisions and restores them', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-ranked-migration-'));
  let db = new GameDatabase(directory, 'qa-password');
  t.after(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const raw = db.config().published;
  delete raw.competition;
  const old = JSON.stringify(raw);
  db.db.prepare('UPDATE config SET draft=?,published=? WHERE id=1').run(old, old);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(old);
  db.db.exec(
    "DELETE FROM rule_modules WHERE module_id='competition'; DELETE FROM rule_module_revisions WHERE module_id='competition';",
  );
  db.close();
  db = new GameDatabase(directory, 'qa-password');
  assert.equal(db.ruleModules.read('published').length, 18);
  assert.equal(db.config().revision, 2);
  assert.equal(db.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, old);
  db.restoreRevision(1, db.config().version);
  assert.ok(db.config().draft.competition);
  db.close();
  db = new GameDatabase(directory, 'qa-password');
  assert.equal(db.config().revision, 2);
});
test('HTTP queue requires auth, ignores forged results, and publishes competition module with revision checks', async (t) => {
  const f = fixture(t),
    server = createGameServer(f.db);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise<void>((r, e) => server.close((err) => (err ? e(err) : r()))));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = { 'Content-Type': 'application/json', 'X-Kora-Request': '1' };
  const post = (path: string, data: unknown, cookie = '') =>
    fetch(base + path, {
      method: 'POST',
      headers: { ...headers, Cookie: cookie },
      body: JSON.stringify(data),
    });
  assert.equal((await post('/api/pvp/queue', { ...loadout(), mode: 'ranked', revision: 1 })).status, 401);
  const loginA = await post('/api/player', {}),
    loginB = await post('/api/player', {});
  const a = loginA.headers.get('set-cookie')!,
    b = loginB.headers.get('set-cookie')!;
  const first = await (await post('/api/pvp/queue', { ...loadout(), mode: 'ranked', revision: 1 }, a)).json();
  const second = await (
    await post('/api/pvp/queue', { ...loadout(), mode: 'ranked', revision: 1 }, b)
  ).json();
  assert.equal(first.code, second.code);
  assert.equal((await post('/api/pvp/finish', { code: first.code, winner: 0 }, a)).status, 404);
  await post('/api/pvp/leave', { code: first.code, winner: 0 }, a);
  const overview = await (await fetch(base + '/api/pvp/overview', { headers: { Cookie: b } })).json();
  assert.equal(overview.self.rating, 1016);
  assert.equal(overview.history[0].result, 'win');
  const login = await post('/api/admin/login', { password: 'qa-password' });
  const admin = login.headers.get('set-cookie')!,
    config = f.db.config();
  const changed = structuredClone(config.draft.competition!);
  changed.rating.kFactor = 40;
  const update = await fetch(base + '/api/admin/rule-modules/competition', {
    method: 'PUT',
    headers: { ...headers, Cookie: admin },
    body: JSON.stringify({ version: config.version, schemaVersion: 2, data: changed }),
  });
  assert.equal(update.status, 200);
  assert.equal(f.db.config().published.competition!.rating.kFactor, 32);
  assert.equal((await post('/api/admin/publish', { version: f.db.config().version }, admin)).status, 200);
  assert.equal(f.db.config().published.competition!.rating.kFactor, 40);
});

test('natural combat ending persists exactly one result and challenge overload starts early', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  f.content.rules.coreHp = 10;
  f.content.rules.overtimeAt = 20;
  f.content.competition!.challenge.overtimeAt = 10;
  const room = f.rooms.enqueue(a, loadout(), f.content, 'challenge', 1);
  f.rooms.enqueue(b, loadout(), f.content, 'challenge', 1);
  for (const player of [a, b])
    f.rooms.command(player, room.code, { id: `keep-${player}`, type: 'mulligan', cards: [], lane: 0, x: 0 });
  f.at(9000);
  assert.equal(f.rooms.state(a, room.code).state!.cores[0], 10);
  f.rooms.state(b, room.code);
  f.at(12000);
  f.rooms.tick();
  const result = f.rooms.state(a, room.code);
  assert.equal(result.state!.phase, 'ended');
  assert.equal(result.outcome!.reason, 'combat');
  assert.equal(f.competition.overview(a, f.content).history.length, 1);
  assert.equal(f.competition.overview(a, f.content).self.games, 0);
});
