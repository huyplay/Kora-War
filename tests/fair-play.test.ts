import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameDatabase } from '../server/database';
import { CompetitionStore } from '../server/competition-store';
import { PvpRooms } from '../server/pvp';
import { createGameServer } from '../server/http';
import { DEFAULT_CARD_DECK } from '../src/data/card-decks';
import { startMatch } from '../server/game-service';
import { defaultFairPlayPolicy } from '../src/data/fair-play';
import { eloAfter, defaultCompetition } from '../src/data/competition';
const loadout = () => ({ cards: DEFAULT_CARD_DECK.slice(), deck: [], spells: [] });
function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'kora-review-'));
  const db = new GameDatabase(directory, 'test-password');
  t.after(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const competition = new CompetitionStore(db),
    review = competition.review,
    players = [db.player(), db.player(), db.player()],
    content = db.config().published;
  let now = 0;
  const rooms = new PvpRooms(() => now, competition);
  function match(mode: 'ranked' | 'casual' = 'ranked') {
    const room = rooms.enqueue(players[0], loadout(), content, mode, 1);
    rooms.enqueue(players[1], loadout(), content, mode, 1);
    const id = String(db.db.prepare("SELECT id FROM pvp_matches WHERE status='active'").get()!.id);
    return { code: room.code, id };
  }
  return { db, competition, review, players, content, rooms, match, at: (n: number) => (now = n) };
}
const action = (
  match: string,
  action: 'note' | 'clear' | 'flag' | 'void' | 'ban' | 'unban',
  request = `request-${action}`,
) => ({ match, action, request, reason: 'Kiểm tra bằng chứng đã xác nhận' });
test('review records accepted/rejected commands once, retains summary and hides evidence from player packets', (t) => {
  const f = fixture(t),
    m = f.match(),
    [a, b] = f.players;
  const cmd = { id: 'opening-keep-a', type: 'mulligan' as const, cards: [], lane: 0, x: 0 };
  f.rooms.command(a, m.code, cmd);
  f.rooms.command(a, m.code, cmd);
  f.rooms.command(b, m.code, { ...cmd, id: 'opening-keep-b' });
  const bad = { id: 'illegal-card-123', type: 'play' as const, card: 'solan', cardUid: -1, lane: 1, x: -11 };
  assert.ok(f.rooms.command(a, m.code, bad).error);
  f.rooms.command(a, m.code, bad);
  assert.throws(() => f.rooms.command(a, m.code, { ...bad, id: 'invalid-lane-1', lane: 12 }), /hợp lệ/);
  f.rooms.leave(a, m.code);
  const detail = f.review.detail('pvp', m.id);
  assert.equal(detail.evidence.entries.length, 4);
  assert.equal(detail.evidence.entries.filter((e) => e.error).length, 2);
  assert.equal((detail.evidence.summary as { reason: string }).reason, 'surrender');
  assert.equal(detail.evidence.available, true);
  const packet = f.rooms.state(b, m.code);
  assert.ok(!('evidence' in packet));
  assert.ok(!('seed' in detail.evidence));
  const results = f.review.list({ player: a });
  assert.equal(results.total, 1);
  assert.equal(f.review.list({ player: f.players[2] }).total, 0);
});
test('manual void reverses only original Elo and ranked counts, preserves later games and original result', (t) => {
  const f = fixture(t),
    [a, b] = f.players,
    first = f.match();
  f.rooms.leave(a, first.code);
  const original = f.review.detail('pvp', first.id).result;
  const second = f.match();
  f.rooms.leave(a, second.code);
  const before = f.competition.overview(b, f.content).self;
  const result = f.review.moderate(action(first.id, 'void'));
  assert.equal(f.competition.overview(b, f.content).self.rating, before.rating - 16);
  assert.equal(f.competition.overview(b, f.content).self.games, 1);
  assert.equal(f.competition.overview(b, f.content).self.wins, 1);
  assert.deepEqual(f.review.detail('pvp', first.id).result, original);
  assert.equal(f.review.detail('pvp', first.id).review, 'voided');
  assert.equal(
    f.competition.overview(b, f.content).history.find((h) => h.matchId === first.id)!.corrected,
    true,
  );
  assert.deepEqual(f.review.moderate(action(first.id, 'void')), result);
  assert.throws(() => f.review.moderate(action(first.id, 'void', 'different-void-id')), /hoàn tác/);
  assert.throws(
    () => f.review.moderate({ ...action(first.id, 'void'), reason: 'changed reason' }),
    /CONFLICT/,
  );
  assert.equal(f.review.detail('pvp', first.id).actions.length, 1);
});
test('void rejects active matches and concurrent players, non-ranked reversal changes no rating', (t) => {
  const f = fixture(t),
    [a, b] = f.players,
    first = f.match();
  assert.throws(() => f.review.moderate(action(first.id, 'void')), /kết thúc/);
  f.rooms.leave(a, first.code);
  const second = f.match('casual');
  assert.throws(() => f.review.moderate(action(first.id, 'void')), /hiện tại/);
  f.rooms.leave(a, second.code);
  const before = f.competition.overview(b, f.content).self;
  f.review.moderate(action(second.id, 'void'));
  assert.deepEqual(f.competition.overview(b, f.content).self, before);
});
test('exact Elo correction can cross the floor without inflating a subsequent loss', (t) => {
  const f = fixture(t),
    [a, b] = f.players,
    m = f.match();
  f.rooms.leave(a, m.code);
  f.db.db.prepare('UPDATE ratings SET rating=0 WHERE player=?').run(b);
  f.review.moderate(action(m.id, 'void'));
  assert.equal(f.competition.overview(b, f.content).self.rating, -16);
  assert.equal(eloAfter(-16, 1000, 0, defaultCompetition()), -16);
});
test('manual ban is bounded and idempotent, blocks all new PvP modes, expires or can be lifted', (t) => {
  const f = fixture(t),
    [a, b] = f.players,
    m = f.match();
  f.rooms.leave(a, m.code);
  const ban = { ...action(m.id, 'ban'), player: a, hours: 2 };
  const result = f.review.moderate(ban);
  assert.deepEqual(f.review.moderate(ban), result);
  assert.throws(() => f.review.moderate({ ...ban, hours: 3 }), /CONFLICT/);
  for (const mode of ['ranked', 'casual', 'challenge'] as const)
    assert.throws(() => f.rooms.enqueue(a, loadout(), f.content, mode, 1), /tạm khóa/);
  assert.throws(() => f.rooms.create(a, loadout(), f.content), /tạm khóa/);
  const friendly = f.rooms.create(b, loadout(), f.content);
  assert.throws(() => f.rooms.join(a, friendly.code, loadout()), /tạm khóa/);
  assert.equal(f.review.detail('pvp', m.id).bans.length, 1);
  assert.throws(
    () => f.review.moderate({ ...action(m.id, 'ban', 'another-ban'), player: f.players[2], hours: 1 }),
    /thuộc trận/,
  );
  assert.throws(
    () => f.review.moderate({ ...action(m.id, 'ban', 'long-ban-id'), player: a, hours: 99999 }),
    /chính sách/,
  );
  f.review.moderate({ ...action(m.id, 'unban'), player: a });
  assert.doesNotThrow(() => f.review.assertAllowed(a));
  f.review.moderate({ ...ban, request: 'second-ban-request' });
  const real = Date.now();
  t.mock.method(Date, 'now', () => real + 3 * 3600000);
  assert.doesNotThrow(() => f.review.assertAllowed(a));
});
test('a ban clears an existing waiting queue without changing a running match', (t) => {
  const f = fixture(t),
    [a] = f.players,
    m = f.match();
  f.rooms.leave(a, m.code);
  f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1);
  f.review.moderate({ ...action(m.id, 'ban'), player: a, hours: 1 });
  f.rooms.tick();
  assert.equal(f.rooms.current(a), null);
});
test('review policies are versioned, locked per match and never automatically penalize', (t) => {
  const f = fixture(t),
    policy = f.review.policy();
  const changed = { ...policy.policy, rejectedCommandThreshold: 1, repeatPairThreshold: 2 };
  f.review.savePolicy(changed, policy.version);
  assert.throws(() => f.review.savePolicy(changed, policy.version), /CONFLICT/);
  assert.throws(() => f.review.savePolicy({ ...changed, maximumBanHours: -1 }, 2), /hợp lệ/);
  const m = f.match(),
    [a] = f.players;
  f.review.savePolicy({ ...changed, enabled: false }, 2);
  assert.throws(
    () => f.rooms.command(a, m.code, { id: 'badcommand-id', type: 'play', lane: 99, x: 0 }),
    /sẵn sàng/,
  );
  assert.ok(f.review.detail('pvp', m.id).alerts.some((s) => s.includes('lệnh')));
  assert.doesNotThrow(() => f.review.assertAllowed(a));
  assert.equal(f.competition.overview(a, f.content).self.rating, 1000);
  f.review.moderate(action(m.id, 'flag'));
  assert.equal(f.review.detail('pvp', m.id).review, 'flagged');
  f.review.moderate(action(m.id, 'clear'));
  assert.equal(f.review.detail('pvp', m.id).review, 'cleared');
});
test('legacy and AI history explicitly lack command evidence and pagination is bounded', (t) => {
  const f = fixture(t),
    m = f.match();
  f.rooms.leave(f.players[0], m.code);
  f.db.db.prepare('DELETE FROM match_reviews WHERE match=?').run(m.id);
  assert.equal(f.review.detail('pvp', m.id).evidence.available, false);
  const ai = startMatch(f.db, f.players[0], [], 'normal', [], DEFAULT_CARD_DECK.slice());
  assert.equal(f.review.list({ kind: 'ai' }).total, 1);
  assert.equal(f.review.detail('ai', ai.id).status, 'unverified');
  assert.equal(f.review.detail('ai', ai.id).evidence.available, false);
  assert.throws(() => f.review.list({ offset: -1 }), /hợp lệ/);
  assert.throws(() => f.review.list({ kind: 'injected' }), /hợp lệ/);
  assert.throws(() => f.review.moderate(action(ai.id, 'void')), /PvP/);
});
test('evidence strips unrelated fields, deduplicates requests, and marks overflow honestly', (t) => {
  const f = fixture(t),
    m = f.match(),
    [a] = f.players;
  f.review.record(
    m.id,
    a,
    0,
    {
      id: 'whitelist-example',
      type: 'play',
      password: 'secret',
      nested: { bad: 'data' },
      card: 'x'.repeat(500),
    },
    'rejected',
  );
  const entry = f.review.detail('pvp', m.id).evidence.entries[0];
  assert.ok(!('password' in (entry.command as object)));
  assert.equal((entry.command as { card: string }).card.length, 100);
  f.db.transaction(() => {
    for (let i = 0; i < 4096; i++)
      f.review.record(m.id, a, 0, { id: `command-${i}`, type: 'play' }, 'rejected');
  });
  const detail = f.review.detail('pvp', m.id);
  assert.equal(detail.evidence.entries.length, 4096);
  assert.equal(detail.evidence.truncated, true);
});
test('admin match/policy/moderation endpoints reject players and enforce reason and request id', async (t) => {
  const f = fixture(t),
    server = createGameServer(f.db);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise<void>((r, e) => server.close((err) => (err ? e(err) : r()))));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    headers = { 'Content-Type': 'application/json', 'X-Kora-Request': '1' };
  const player = f.db.session('player', f.players[0]);
  for (const path of ['/api/admin/matches', '/api/admin/match?id=x', '/api/admin/fairplay/policy'])
    assert.equal((await fetch(base + path, { headers: { Cookie: `kw_player=${player}` } })).status, 401);
  const login = await fetch(base + '/api/admin/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ password: 'test-password' }),
  });
  const admin = { ...headers, Cookie: login.headers.get('set-cookie')! };
  assert.equal((await fetch(base + '/api/admin/matches', { headers: admin })).status, 200);
  const m = f.match();
  f.rooms.leave(f.players[0], m.code);
  const post = (data: unknown) =>
    fetch(base + '/api/admin/moderation', { method: 'POST', headers: admin, body: JSON.stringify(data) });
  assert.equal((await post({ ...action(m.id, 'note'), reason: 'a' })).status, 400);
  assert.equal((await post(action(m.id, 'note'))).status, 200);
  const detail = await (await fetch(base + `/api/admin/match?id=${m.id}`, { headers: admin })).json();
  assert.equal(detail.actions[0].actor, 'admin');
  const denied = await fetch(base + '/api/admin/moderation', {
    method: 'POST',
    headers: { ...headers, Cookie: `kw_player=${player}` },
    body: JSON.stringify(action(m.id, 'void')),
  });
  assert.equal(denied.status, 401);
  const policy = await (await fetch(base + '/api/admin/fairplay/policy', { headers: admin })).json();
  assert.equal(
    (
      await fetch(base + '/api/admin/fairplay/policy', {
        method: 'PUT',
        headers: admin,
        body: JSON.stringify({ policy: defaultFairPlayPolicy(), version: policy.version }),
      })
    ).status,
    200,
  );
});

test('moderation policy, evidence, correction and bans survive reopening SQLite', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-review-persist-'));
  let db = new GameDatabase(directory, 'test-password');
  t.after(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  let competition = new CompetitionStore(db);
  const a = db.player(),
    b = db.player(),
    content = db.config().published;
  competition.start({
    id: 'persisted-match',
    players: [a, b],
    mode: 'ranked',
    content,
    revision: 1,
    seed: 123,
    loadouts: [loadout(), loadout()],
  });
  competition.review.record(
    'persisted-match',
    a,
    0,
    { id: 'persisted-command', type: 'mulligan', cards: [] },
    null,
  );
  competition.finish('persisted-match', 1, 'surrender');
  competition.review.moderate(action('persisted-match', 'void'));
  competition.review.moderate({ ...action('persisted-match', 'ban'), player: a, hours: 2 });
  const policy = competition.review.policy();
  competition.review.savePolicy({ ...policy.policy, rejectedCommandThreshold: 21 }, policy.version);
  db.close();
  db = new GameDatabase(directory, 'test-password');
  competition = new CompetitionStore(db);
  competition.recover();
  assert.equal(competition.review.policy().policy.rejectedCommandThreshold, 21);
  assert.equal(competition.review.detail('pvp', 'persisted-match').evidence.entries.length, 1);
  assert.equal(competition.review.detail('pvp', 'persisted-match').review, 'voided');
  assert.equal(competition.overview(a, content).self.rating, 1000);
  assert.throws(() => competition.review.assertAllowed(a), /tạm khóa/);
});

test('ban leaves an already running battle intact and prevents subsequent matchmaking', (t) => {
  const f = fixture(t),
    [a] = f.players,
    m = f.match();
  f.review.moderate({ ...action(m.id, 'ban'), player: a, hours: 1 });
  f.rooms.tick();
  assert.equal(f.rooms.current(a)!.code, m.code);
  assert.equal(
    f.rooms.command(a, m.code, { id: 'keep-while-banned', type: 'mulligan', cards: [], lane: 0, x: 0 }).error,
    null,
  );
  f.rooms.leave(a, m.code);
  assert.throws(() => f.rooms.enqueue(a, loadout(), f.content, 'ranked', 1), /tạm khóa/);
});
