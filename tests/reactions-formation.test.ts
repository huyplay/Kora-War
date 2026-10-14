import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultContent, validateContent } from '../src/data/content';
import { PvpRooms } from '../server/pvp';
import { GameDatabase } from '../server/database';
import { FormationLayout } from '../src/rendering/formation-layout';
import { cycleBattle } from '../src/core/cycle-battle';
import { RULE_MODULES } from '../src/data/rule-modules';
import type { Unit } from '../src/core/types';

const content = defaultContent(),
  cards = content.gameplay!.deck.defaultCards;
const loadout = {
  deck: cards.filter((id) => !['wind', 'fire', 'lightning', 'ice'].includes(id)),
  spells: [],
  cards,
};
test('PvP reactions reach both players with mirrored sides, no combat mutation, and expiry', () => {
  let now = 0;
  const rooms = new PvpRooms(() => now),
    room = rooms.create('one', loadout, content);
  rooms.join('two', room.code, loadout);
  const before = rooms.state('one', room.code).state;
  const sent = rooms.reaction('one', room.code, { id: 'reaction-one', reactionId: 'hello' });
  assert.equal(sent.error, null);
  assert.equal(sent.reactions[0].side, 0);
  assert.equal(rooms.state('two', room.code).reactions[0].side, 1);
  assert.deepEqual(sent.state, before);
  const duplicate = rooms.reaction('one', room.code, { id: 'reaction-one', reactionId: 'happy' });
  assert.equal(duplicate.reactions.length, 1);
  assert.equal(duplicate.reactions[0].reactionId, 'hello');
  now = 5000;
  assert.equal(rooms.state('two', room.code).reactions.length, 0);
});
test('reactions enforce membership, whitelist, enabled entries, cooldown and per-player limits', () => {
  let now = 0;
  const c = defaultContent();
  c.communication!.maxPerMatch = 2;
  c.communication!.reactions.find((r) => r.id === 'cry')!.enabled = false;
  const rooms = new PvpRooms(() => now),
    room = rooms.create('one', loadout, c);
  rooms.join('two', room.code, loadout);
  assert.throws(
    () => rooms.reaction('stranger', room.code, { id: 'reaction-test', reactionId: 'hello' }),
    /quyền/,
  );
  assert.throws(
    () => rooms.reaction('one', room.code, { id: 'reaction-test', reactionId: 'custom text' }),
    /danh sách/,
  );
  assert.throws(
    () => rooms.reaction('one', room.code, { id: 'reaction-test', reactionId: 'cry' }),
    /danh sách/,
  );
  rooms.reaction('one', room.code, { id: 'reaction-one', reactionId: 'hello' });
  assert.match(rooms.reaction('one', room.code, { id: 'reaction-two', reactionId: 'happy' }).error!, /Chờ/);
  assert.equal(rooms.reaction('two', room.code, { id: 'reaction-one', reactionId: 'happy' }).error, null);
  now = 2000;
  assert.equal(rooms.reaction('one', room.code, { id: 'reaction-two', reactionId: 'happy' }).error, null);
  now = 4000;
  assert.throws(
    () => rooms.reaction('one', room.code, { id: 'reaction-three', reactionId: 'happy' }),
    /giới hạn/,
  );
});
test('reaction config is locked per room and content validation rejects invalid catalogs', () => {
  const c = defaultContent(),
    rooms = new PvpRooms(() => 0),
    room = rooms.create('one', loadout, c);
  c.communication!.enabled = false;
  rooms.join('two', room.code, loadout);
  assert.equal(rooms.reaction('one', room.code, { id: 'reaction-one', reactionId: 'hello' }).error, null);
  for (const mutate of [
    (c: ReturnType<typeof defaultContent>) => {
      c.communication!.cooldownSeconds = 0;
    },
    (c: ReturnType<typeof defaultContent>) => {
      c.communication!.reactions.push(c.communication!.reactions[0]);
    },
    (c: ReturnType<typeof defaultContent>) => {
      c.presentation!.formation.radius = NaN;
    },
  ]) {
    const bad = defaultContent();
    mutate(bad);
    assert.throws(() => validateContent(bad));
  }
});
function units(count: number): Unit[] {
  const b = cycleBattle(cards, content, 1);
  b.mulligan(0, []);
  b.mulligan(1, []);
  b.start();
  b.mana[0] = 10;
  b.play(0, b.hands[0].find((c) => loadout.deck.includes(c.id))!.id, 1, -11);
  return Array.from({ length: count }, (_, i) => ({
    ...b.units[0],
    id: i + 1,
    side: (i % 2) as 0 | 1,
    x: 0,
    previousX: 0,
  }));
}
test('dense display formations separate footprints and stay in bounds without mutating combat state', () => {
  for (const count of [2, 18, 60, 100]) {
    const input = units(count),
      before = structuredClone(input),
      f = content.presentation!.formation;
    const points = new FormationLayout().update(input, f, content.gameplay!.board, 1 / 60);
    assert.deepEqual(input, before);
    for (const u of input) {
      const a = points.get(u.id)!;
      assert.ok(a.x >= -14 && a.x <= 14);
      assert.ok(Math.abs(a.z) <= 1.55);
      for (const v of input) {
        if (u.id >= v.id) continue;
        const b = points.get(v.id)!;
        const clearance = ((2 * f.radius + f.spacing) * Math.min(a.scale, b.scale)) / f.modelScale;
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= clearance - 1e-6, `overlap ${count}/${u.id}/${v.id}`);
      }
    }
  }
});
test('display rows survive spawns/deaths and reflected views have mirrored positions', () => {
  const input = units(18),
    f = content.presentation!.formation,
    board = content.gameplay!.board,
    layout = new FormationLayout();
  input.forEach((u, i) => (u.x = (i - 9) * 0.1));
  const initial = layout.update(input, f, board, 1 / 60),
    mirrored = new FormationLayout().update(
      input.map((u) => ({ ...u, side: (1 - u.side) as 0 | 1, x: -u.x })),
      f,
      board,
      1 / 60,
    );
  for (const u of input) {
    assert.ok(Math.abs(initial.get(u.id)!.x + mirrored.get(u.id)!.x) < 1e-6);
    assert.equal(initial.get(u.id)!.z, mirrored.get(u.id)!.z);
  }
  const later = layout.update(input.slice(1), f, board, 1 / 60);
  for (const u of input.slice(1)) assert.equal(initial.get(u.id)!.z, later.get(u.id)!.z);
});
test('the complete previous module release upgrades communication/presentation once and preserves history', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-social-migration-'));
  let db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const raw = db.config().published;
  delete raw.communication;
  delete raw.presentation;
  const oldJson = JSON.stringify(raw);
  db.db.prepare('UPDATE config SET draft=?,published=? WHERE id=1').run(oldJson, oldJson);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(oldJson);
  db.db.exec(
    "DELETE FROM rule_modules WHERE module_id IN ('communication','presentation'); DELETE FROM rule_module_revisions WHERE module_id IN ('communication','presentation');",
  );
  db.close();
  db = new GameDatabase(dir, 'test-password');
  assert.equal(db.config().revision, 2);
  assert.equal(db.ruleModules.read('published').length, RULE_MODULES.length);
  assert.equal(db.config().published.communication!.reactions.length, 14);
  assert.equal(db.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, oldJson);
  db.restoreRevision(1, db.config().version);
  assert.ok(db.config().draft.communication);
  db.close();
  db = new GameDatabase(dir, 'test-password');
  assert.equal(db.config().revision, 2);
});
