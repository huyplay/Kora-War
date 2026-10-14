import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameDatabase } from '../server/database';
import { createGameServer } from '../server/http';
import { defaultContent, type ContentConfig } from '../src/data/content';
import {
  RULE_MODULES,
  extractRuleModules,
  composeRuleModules,
  migrateRuleModule,
} from '../src/data/rule-modules';
import { cycleBattle } from '../src/core/cycle-battle';

test('rule modules losslessly compose content and reject partial or unsupported schemas', () => {
  const c = defaultContent(),
    modules = extractRuleModules(c);
  assert.equal(modules.length, 17);
  assert.deepEqual(composeRuleModules(c, modules), c);
  modules.find((m) => m.id === 'mana')!.data = { startingMana: 7 };
  const composed = composeRuleModules(c, modules);
  assert.equal(composed.gameplay!.startingMana, 7);
  assert.equal(c.gameplay!.startingMana, 4);
  assert.throws(() => composeRuleModules(c, modules.slice(1)), /thiếu/);
  assert.throws(() => composeRuleModules(c, [modules[0], ...modules.slice(0, -1)]), /trùng/);
  assert.throws(() => migrateRuleModule({ id: 'mana', schemaVersion: 2, data: {} }), /schema/);
  assert.throws(() => migrateRuleModule({ id: 'unknown', schemaVersion: 1, data: {} }), /không hợp lệ/);
});
test('pure schema migration chains preserve input and fail if an upgrade path is missing', () => {
  const input = { id: 'test', schemaVersion: 1, data: { rate: 3 } };
  const registry = [
    {
      id: 'test',
      name: 'test',
      schemaVersion: 3,
      migrations: {
        1: (data: unknown) => ({ perSecond: (data as { rate: number }).rate }),
        2: (data: unknown) => ({ ...(data as object), enabled: true }),
      },
    },
  ];
  assert.deepEqual(migrateRuleModule(input, registry), {
    id: 'test',
    schemaVersion: 3,
    data: { perSecond: 3, enabled: true },
  });
  assert.deepEqual(input.data, { rate: 3 });
  assert.throws(() => migrateRuleModule(input, [{ ...registry[0], migrations: {} }]), /thiếu migration/);
});
test('old JSON storage migrates once to authoritative modules without rewriting historical content', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-rule-old-'));
  let db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const old = db.db.prepare('SELECT * FROM revisions').all();
  db.db.exec(
    "DELETE FROM rule_module_revisions; DELETE FROM rule_modules; DELETE FROM audit WHERE action='rules.modules.migrate';",
  );
  db.close();
  db = new GameDatabase(dir, 'test-password');
  assert.equal(db.ruleModules.read('draft').length, RULE_MODULES.length);
  assert.deepEqual(db.db.prepare('SELECT * FROM revisions').all(), old);
  assert.equal(db.config().revision, 1);
  db.db
    .prepare("UPDATE rule_modules SET payload=? WHERE scope='published' AND module_id='mana'")
    .run('{"startingMana":7}');
  assert.equal(db.config().published.gameplay!.startingMana, 7);
  const b = cycleBattle(db.config().published.gameplay!.deck.defaultCards, db.config().published, 9);
  assert.equal(b.mana[0], 7);
  db.close();
  db = new GameDatabase(dir, 'test-password');
  assert.equal(db.config().published.gameplay!.startingMana, 7);
  assert.equal(
    db.db.prepare("SELECT count(*) n FROM audit WHERE action='rules.modules.migrate'").get()!.n,
    1,
  );
});
test('module draft updates are atomic, versioned only on change, and isolated until publish', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-rule-version-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const original = db.config(),
    data = { startingMana: 7 };
  db.saveRuleModule({ id: 'mana', schemaVersion: 1, data }, original.version);
  assert.equal(db.config().published.gameplay!.startingMana, 4);
  assert.equal(db.config().draft.gameplay!.startingMana, 7);
  assert.equal(db.ruleModules.status().find((m) => m.id === 'mana')!.draftVersion, 2);
  assert.ok(
    db.ruleModules
      .status()
      .filter((m) => m.id !== 'mana')
      .every((m) => m.draftVersion === 1),
  );
  assert.throws(
    () => db.saveRuleModule({ id: 'mana', schemaVersion: 1, data: { startingMana: 8 } }, original.version),
    /CONFLICT/,
  );
  const before = db.config();
  assert.throws(
    () => db.saveRuleModule({ id: 'mana', schemaVersion: 1, data: { startingMana: 100 } }, before.version),
    /Gameplay/,
  );
  assert.deepEqual(db.config(), before);
  db.saveDraft(db.config().draft, db.config().version);
  assert.equal(db.ruleModules.status().find((m) => m.id === 'mana')!.draftVersion, 2);
  // Key ordering alone must not increase a module's data version.
  const g = db.config().draft.gameplay!.deck;
  db.saveRuleModule(
    { id: 'deck', schemaVersion: 1, data: Object.fromEntries(Object.entries(g).reverse()) },
    db.config().version,
  );
  assert.equal(db.ruleModules.status().find((m) => m.id === 'deck')!.draftVersion, 1);
  const locked = cycleBattle(before.draft.gameplay!.deck.defaultCards, before.draft, 4);
  db.publish(db.config().version);
  assert.equal(db.config().published.gameplay!.startingMana, 7);
  assert.equal(db.ruleModules.revision(2).length, 17);
  assert.equal(locked.mana[0], 7);
  db.restoreRevision(1, db.config().version);
  assert.equal(db.config().draft.gameplay!.startingMana, 4);
  assert.equal(db.config().published.gameplay!.startingMana, 7);
  db.publish(db.config().version);
  assert.equal(db.config().published.gameplay!.startingMana, 4);
  assert.equal(locked.mana[0], 7);
});
test('failed publication rolls back module history and all published values', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-rule-rollback-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const c = db.config();
  c.draft.gameplay!.startingMana = 7;
  db.saveDraft(c.draft, c.version);
  db.db.exec(
    "CREATE TRIGGER reject_module_history BEFORE INSERT ON rule_module_revisions BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
  );
  const before = db.config(),
    rows = db.db.prepare('SELECT * FROM revisions').all();
  assert.throws(() => db.publish(before.version), /test failure/);
  assert.deepEqual(db.config(), before);
  assert.deepEqual(db.db.prepare('SELECT * FROM revisions').all(), rows);
});
test('partial module storage fails instead of falling back to presets', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-rule-partial-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  db.db.prepare("DELETE FROM rule_modules WHERE scope='published' AND module_id='deck'").run();
  assert.throws(() => db.config(), /thiếu/);
  db.db.prepare("DELETE FROM rule_modules WHERE scope='draft'").run();
  assert.throws(
    () => db.ruleModules.initialize({ draft: defaultContent(), published: defaultContent(), revision: 1 }),
    /thiếu/,
  );
});
test('module endpoint enforces auth, schemas, cross-rule validation and stale-version rejection', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-rule-http-')),
    db = new GameDatabase(dir, 'test-password'),
    server = createGameServer(db);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  assert.equal((await fetch(base + '/api/admin/rule-modules')).status, 401);
  const login = await fetch(base + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kora-Request': '1' },
    body: JSON.stringify({ password: 'test-password' }),
  });
  const headers = {
    'Content-Type': 'application/json',
    'X-Kora-Request': '1',
    Cookie: login.headers.get('set-cookie')!,
  };
  const update = async (id: string, data: unknown, version: number, schemaVersion = 1) =>
    fetch(base + '/api/admin/rule-modules/' + id, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data, version, schemaVersion }),
    });
  const version = db.config().version;
  assert.equal((await update('mana', { startingMana: 7 }, version, 2)).status, 400);
  assert.equal((await update('mana', { startingMana: 100 }, version)).status, 400);
  assert.equal((await update('mana', { startingMana: 7 }, version)).status, 200);
  assert.equal((await update('mana', { startingMana: 8 }, version)).status, 409);
  const state = await (await fetch(base + '/api/admin/rule-modules', { headers })).json();
  assert.equal(state.modules.length, 17);
  assert.equal(state.modules.find((m: { id: string }) => m.id === 'mana').changed, true);
  await fetch(base + '/api/admin/publish', {
    method: 'POST',
    headers,
    body: JSON.stringify({ version: db.config().version }),
  });
  const content = (await (await fetch(base + '/api/content')).json()).content as ContentConfig;
  assert.equal(content.gameplay!.startingMana, 7);
});
test('restoring a historical revision without module records upgrades only the new draft', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-rule-legacy-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const old = defaultContent();
  delete old.gameplay;
  delete old.abilities.nyx.engage;
  const oldJson = JSON.stringify(old);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(oldJson);
  db.db.prepare('DELETE FROM rule_module_revisions WHERE revision=1').run();
  db.saveRuleModule({ id: 'mana', schemaVersion: 1, data: { startingMana: 7 } }, db.config().version);
  db.publish(db.config().version);
  db.restoreRevision(1, db.config().version);
  assert.equal(db.config().draft.gameplay!.startingMana, 4);
  assert.equal(db.config().published.gameplay!.startingMana, 7);
  assert.equal(db.config().draft.abilities.nyx.engage!.enabled, true);
  assert.equal(db.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, oldJson);
});
