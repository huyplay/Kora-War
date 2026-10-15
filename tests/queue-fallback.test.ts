import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameDatabase } from '../server/database';
import { CompetitionStore } from '../server/competition-store';
import { PvpRooms } from '../server/pvp';
import { createGameServer } from '../server/http';
import { defaultContent, validateContent } from '../src/data/content';
import { DEFAULT_CARD_DECK } from '../src/data/card-decks';
import { isSpell } from '../src/data/spells';
import { competitionEditor } from '../src/admin/competition-editor';
import { migrateRuleModule } from '../src/data/rule-modules';
import { cycleBattle } from '../src/core/cycle-battle';
import { onlineState } from '../src/core/online-state';

const loadout = () => ({ cards: DEFAULT_CARD_DECK.slice(), deck: [], spells: [] });
function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'kora-queue-fallback-'));
  const db = new GameDatabase(dir, 'qa-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const competition = new CompetitionStore(db),
    content = db.config().published;
  const players = [db.player(), db.player(), db.player()];
  let time = 0;
  const rooms = new PvpRooms(() => time, competition);
  const pollTo = (at: number, entries: { player: string; code: string }[]) => {
    while (time < at) {
      time = Math.min(at, time + 10000);
      for (const e of entries) rooms.state(e.player, e.code);
      rooms.tick();
    }
  };
  return {
    db,
    dir,
    competition,
    content,
    players,
    rooms,
    at: (n: number) => {
      time = n;
    },
    pollTo,
  };
}
const keep = (rooms: PvpRooms, player: string, code: string) =>
  rooms.command(player, code, { id: 'human-keep-0001', type: 'mulligan', cards: [], lane: 0, x: 0 });

test('ranked and casual fallback at 60 seconds, with private normal online packets and no fake accounts', (t) => {
  const f = fixture(t),
    [a, b, outside] = f.players;
  for (const [player, mode] of [
    [a, 'ranked'],
    [b, 'casual'],
  ] as const) {
    f.at(0);
    const q = f.rooms.enqueue(player, loadout(), f.content, mode, 1);
    f.pollTo(59999, [{ player, code: q.code }]);
    assert.equal(f.rooms.state(player, q.code).waiting, true);
    f.at(60000);
    f.rooms.tick();
    const packet = f.rooms.state(player, q.code);
    assert.equal(packet.waiting, false);
    assert.equal(packet.mode, mode);
    assert.equal(packet.seed, 0);
    assert.equal(packet.state!.phase, 'ready');
    assert.deepEqual(packet.state!.mulliganDone, [false, true]);
    assert.equal(packet.state!.hands![0].length, 6);
    assert.ok(packet.state!.hands![0].filter((c) => !isSpell(c.id)).length >= 4);
    assert.ok(packet.state!.hands![0].some((c) => isSpell(c.id)));
    assert.deepEqual(packet.state!.hands![1], []);
    assert.deepEqual(packet.opponent, { deck: [], spells: [] });
    assert.equal('automation' in packet, false);
    assert.equal(JSON.stringify(packet).includes('automated-'), false);
    assert.throws(() => f.rooms.state(outside, q.code), /quyền/);
    const row = f.db.db.prepare('SELECT * FROM pvp_matches WHERE mode=?').get(mode)!;
    assert.equal(f.competition.review.detail('pvp', String(row.id)).automation!.waitSeconds, 60);
    assert.deepEqual(JSON.parse(String(row.loadouts))[1].cards, f.content.gameplay!.deck.aiCards);
    assert.equal(keep(f.rooms, player, q.code).state!.phase, 'playing');
    f.rooms.leave(player, q.code);
  }
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM players').get()!.n, 3);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM pvp_members').get()!.n, 2);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM pvp_automation').get()!.n, 2);
  assert.equal(f.competition.overview(a, f.content).leaderboard.length, 1);
});

test('a compatible human wins priority on the fallback deadline, including queue redirects', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  f.competition.score(b, f.content);
  f.db.db.prepare('UPDATE ratings SET rating=1450 WHERE player=?').run(b);
  const first = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  const second = f.rooms.enqueue(b, loadout(), f.content, 'ranked', 1);
  f.pollTo(59999, [
    { player: a, code: first.code },
    { player: b, code: second.code },
  ]);
  assert.ok(f.rooms.state(a, first.code).waiting);
  f.at(60000);
  f.rooms.tick();
  const matched = f.rooms.state(b, second.code);
  assert.equal(matched.waiting, false);
  assert.equal(matched.code, first.code);
  assert.deepEqual(matched.state!.mulliganDone, [false, false]);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM pvp_automation').get()!.n, 0);
});

test('disabled or missing fallback, friendly and challenge remain human-only; cancel and stale queues never spawn bots', (t) => {
  const f = fixture(t),
    [a] = f.players;
  for (const kind of ['disabled', 'historical', 'friendly', 'challenge'] as const) {
    const c = structuredClone(f.content);
    if (kind === 'disabled') c.competition!.queue.fallback!.enabled = false;
    if (kind === 'historical') delete c.competition!.queue.fallback;
    f.at(0);
    const q =
      kind === 'friendly'
        ? f.rooms.create(a, loadout(), c)
        : f.rooms.enqueue(a, loadout(), c, kind === 'challenge' ? 'challenge' : 'casual', 1);
    f.pollTo(60000, [{ player: a, code: q.code }]);
    assert.ok(f.rooms.state(a, q.code).waiting);
    f.rooms.leave(a, q.code);
  }
  f.at(0);
  const canceled = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.rooms.leave(a, canceled.code);
  f.at(60000);
  f.rooms.tick();
  assert.equal(f.rooms.current(a), null);
  const stale = f.rooms.enqueue(a, loadout(), f.content, 'casual', 1);
  f.at(120000);
  f.rooms.tick();
  assert.throws(() => f.rooms.state(a, stale.code), /quyền/);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM pvp_matches').get()!.n, 0);
});

test('banned waiting players cannot receive fallback matches', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  const earlier = f.rooms.create(a, loadout(), f.content);
  f.rooms.join(b, earlier.code, loadout());
  f.rooms.leave(a, earlier.code);
  const match = f.db.db.prepare('SELECT id FROM pvp_matches').get()!;
  f.rooms.enqueue(a, loadout(), f.content, 'casual', 1);
  f.competition.review.moderate({
    request: 'ban-before-fallback',
    match: String(match.id),
    action: 'ban',
    player: a,
    hours: 1,
    reason: 'QA manual ban before matchmaking',
  });
  f.at(60000);
  f.rooms.tick();
  assert.equal(f.rooms.current(a), null);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM pvp_automation').get()!.n, 0);
});

test('server AI plays deterministically, never disconnects; human reconnect and disconnect use normal deadlines', (t) => {
  const f = fixture(t),
    [a] = f.players;
  f.content.rules.coreHp = 10000;
  for (const hero of f.content.heroes) hero.attack = 1;
  const q = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.pollTo(60000, [{ player: a, code: q.code }]);
  keep(f.rooms, a, q.code);
  f.pollTo(100000, [{ player: a, code: q.code }]);
  const playing = f.rooms.state(a, q.code);
  assert.equal(playing.state!.phase, 'playing');
  assert.ok(playing.state!.stats[1].deployed > 0);
  const record = f.db.db.prepare('SELECT * FROM pvp_matches').get()!;
  const replay = cycleBattle(loadout().cards, JSON.parse(String(record.content)), Number(record.seed));
  replay.mulligan(1, []);
  replay.mulligan(0, []);
  replay.start();
  while (replay.tick < playing.state!.tick) replay.step();
  assert.deepEqual(onlineState(replay, 0), playing.state);
  f.at(110000);
  assert.equal(f.rooms.current(a)!.code, q.code);
  f.at(140001);
  f.rooms.tick();
  const result = f.rooms.state(a, q.code);
  assert.equal(result.outcome!.result, 'loss');
  assert.equal(result.outcome!.reason, 'disconnect');
  assert.equal(result.outcome!.after, 984);
  f.rooms.tick();
  assert.equal(f.competition.overview(a, f.content).self.games, 1);
});

test('AI can finish combat naturally and opening auto-keep starts without opponent polling', (t) => {
  const f = fixture(t),
    [a] = f.players;
  const q = f.rooms.enqueue(a, loadout(), f.content, 'casual', 1);
  f.pollTo(60000, [{ player: a, code: q.code }]);
  f.pollTo(80000, [{ player: a, code: q.code }]);
  assert.equal(f.rooms.state(a, q.code).state!.phase, 'playing');
  let packet = f.rooms.state(a, q.code);
  for (let at = 90000; at <= 370000 && packet.state!.phase !== 'ended'; at += 10000) {
    f.at(at);
    packet = f.rooms.state(a, q.code);
  }
  assert.equal(packet.state!.phase, 'ended');
  assert.equal(packet.outcome!.result, 'loss');
  assert.equal(packet.outcome!.reason, 'combat');
  assert.equal(packet.outcome!.delta, 0);
  assert.ok(packet.state!.stats[1].damage > 0);
});

test('automated ranked settlement, admin void, bans and restart persist without bot rating rows', (t) => {
  const f = fixture(t),
    [a] = f.players;
  const q = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.pollTo(60000, [{ player: a, code: q.code }]);
  f.rooms.leave(a, q.code);
  const match = f.db.db.prepare('SELECT * FROM pvp_matches').get()!;
  const id = String(match.id),
    original = String(match.outcomes);
  const detail = f.competition.review.detail('pvp', id);
  assert.equal(detail.automation!.rating, 1000);
  assert.ok(detail.evidence.entries.some((e) => (e.command as { type?: string }).type === 'mulligan'));
  assert.throws(
    () =>
      f.competition.review.moderate({
        request: 'ban-ai-rejected',
        match: id,
        action: 'ban',
        player: detail.players[1],
        hours: 1,
        reason: 'Must not ban internal automation',
      }),
    /máy/,
  );
  f.competition.review.moderate({
    request: 'void-ai-result',
    match: id,
    action: 'void',
    reason: 'QA reverse automated match result',
  });
  assert.equal(f.competition.overview(a, f.content).self.rating, 1000);
  assert.equal(f.competition.overview(a, f.content).self.games, 0);
  assert.equal(
    String(f.db.db.prepare('SELECT outcomes FROM pvp_matches WHERE id=?').get(id)!.outcomes),
    original,
  );
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM ratings').get()!.n, 1);
  f.at(0);
  const next = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.pollTo(60000, [{ player: a, code: next.code }]);
  const active = f.db.db.prepare("SELECT id FROM pvp_matches WHERE status='active'").get()!;
  const restarted = new CompetitionStore(f.db);
  restarted.recover();
  restarted.recover();
  const receipt = restarted.overview(a, f.content).history.find((h) => h.matchId === active.id)!;
  assert.equal(receipt.result, 'void');
  assert.equal(receipt.delta, 0);
  assert.equal(receipt.reason, 'server-restart');
  assert.ok(restarted.review.detail('pvp', String(active.id)).automation);
});

test('fallback settings validate, render in admin and remain locked for an existing queue', (t) => {
  const f = fixture(t),
    [a, b] = f.players;
  const html = competitionEditor(f.content);
  for (const field of ['enabled', 'afterSeconds', 'difficulty'])
    assert.ok(html.includes(`competition.queue.fallback.${field}`));
  for (const bad of [
    { afterSeconds: 0 },
    { afterSeconds: 180 },
    { difficulty: 'impossible' },
    { enabled: 'yes' },
  ]) {
    const c = structuredClone(f.content);
    Object.assign(c.competition!.queue.fallback!, bad);
    assert.throws(() => validateContent(c), /hạng/);
  }
  const old = f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  const config = f.db.config();
  config.draft.competition!.queue.fallback!.afterSeconds = 5;
  config.draft.competition!.queue.fallback!.difficulty = 'hard';
  f.db.saveDraft(config.draft, config.version);
  f.db.publish(f.db.config().version);
  const next = f.rooms.enqueue(b, loadout(), f.db.config().published, 'casual', 2);
  f.pollTo(5000, [
    { player: a, code: old.code },
    { player: b, code: next.code },
  ]);
  assert.ok(f.rooms.state(a, old.code).waiting);
  assert.equal(f.rooms.state(b, next.code).waiting, false);
  assert.equal(f.competition.review.list({ mode: 'casual' }).matches[0].automation!.difficulty, 'hard');
  assert.equal(f.rooms.state(a, old.code).content!.competition!.queue.fallback!.afterSeconds, 60);
});

test('competition schema migration adds fallback only to current content and keeps historical snapshots byte-for-byte', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-queue-migration-'));
  let db = new GameDatabase(dir, 'qa-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const old = db.config().published;
  delete old.competition!.queue.fallback;
  const json = JSON.stringify(old);
  db.db.prepare('UPDATE config SET draft=?,published=? WHERE id=1').run(json, json);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(json);
  db.db
    .prepare("UPDATE rule_modules SET schema_version=1,payload=? WHERE module_id='competition'")
    .run(JSON.stringify(old.competition));
  db.db
    .prepare("UPDATE rule_module_revisions SET schema_version=1,payload=? WHERE module_id='competition'")
    .run(JSON.stringify(old.competition));
  db.close();
  db = new GameDatabase(dir, 'qa-password');
  assert.equal(db.config().revision, 2);
  assert.equal(db.config().published.competition!.queue.fallback!.afterSeconds, 60);
  assert.equal(db.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, json);
  assert.equal(db.ruleModules.revision(1).find((m) => m.id === 'competition')!.schemaVersion, 1);
  db.close();
  db = new GameDatabase(dir, 'qa-password');
  assert.equal(db.config().revision, 2);
  const short = defaultContent().competition!;
  short.queue.timeoutSeconds = 15;
  delete short.queue.fallback;
  const migrated = migrateRuleModule({ id: 'competition', schemaVersion: 1, data: short });
  const c = defaultContent();
  c.competition = migrated.data as typeof short;
  assert.equal(c.competition.queue.fallback!.enabled, false);
  validateContent(c);
  assert.equal(short.queue.fallback, undefined);
});

test('HTTP queue transitions to authoritative AI, ignores forged controls and keeps admin metadata private', async (t) => {
  const f = fixture(t),
    [a, outsider] = f.players;
  const c = f.db.config();
  c.draft.competition!.queue.fallback!.afterSeconds = 1;
  f.db.saveDraft(c.draft, c.version);
  f.db.publish(f.db.config().version);
  const server = createGameServer(f.db);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const token = f.db.session('player', a),
    other = f.db.session('player', outsider);
  const post = (path: string, data: unknown, cookie = token) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kora-Request': '1',
        Origin: base,
        Cookie: `kw_player=${cookie}`,
      },
      body: JSON.stringify(data),
    });
  assert.equal((await post('/api/pvp/queue', {}, '')).status, 401);
  const q = await (
    await post('/api/pvp/queue', {
      ...loadout(),
      mode: 'casual',
      revision: f.db.config().revision,
      automation: { side: 0 },
      winner: 0,
      afterSeconds: 0,
    })
  ).json();
  assert.equal(q.waiting, true);
  let packet = q;
  for (let tries = 0; tries < 30 && packet.waiting; tries++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    packet = await (
      await fetch(base + '/api/pvp/state?code=' + q.code, { headers: { Cookie: `kw_player=${token}` } })
    ).json();
  }
  assert.equal(packet.waiting, false);
  assert.equal('automation' in packet, false);
  assert.equal(packet.state.hands[1].length, 0);
  assert.equal(
    (await fetch(base + '/api/pvp/state?code=' + q.code, { headers: { Cookie: `kw_player=${other}` } }))
      .status,
    400,
  );
  assert.equal(
    (await fetch(base + '/api/admin/matches', { headers: { Cookie: `kw_player=${token}` } })).status,
    401,
  );
  await post('/api/pvp/leave', { code: q.code });
});
