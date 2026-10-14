import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultContent, validateContent, type ContentConfig } from '../src/data/content';
import { cycleBattle } from '../src/core/cycle-battle';
import { startMatch, buyItem, openChest, upgradeCard } from '../server/game-service';
import { GameDatabase } from '../server/database';
import { PvpRooms } from '../server/pvp';
import { createGameServer } from '../server/http';
import { gameplayEditor } from '../src/admin/gameplay-editor';
import { SpellEffects } from '../src/rendering/vfx/spell-effects';
import * as THREE from 'three';

function smallConfig() {
  const c = defaultContent(),
    g = c.gameplay!;
  Object.assign(g.deck, {
    size: 8,
    handSize: 4,
    minHeroes: 3,
    minSpells: 1,
    maxCopies: 2,
    mulligan: 1,
    shuffle: false,
  });
  g.deck.defaultCards = g.deck.aiCards = ['solan', 'solan', 'lyra', 'ice', 'fire', 'nyx', 'kael', 'haste'];
  return c;
}
function battle(c = defaultContent()) {
  const b = cycleBattle(c.gameplay!.deck.defaultCards, c, 11, c.gameplay!.deck.aiCards);
  b.mulligan(0, []);
  b.mulligan(1, []);
  b.start();
  b.aiEnabled = false;
  return b;
}
function hold(b: ReturnType<typeof battle>, side: 0 | 1, id: string) {
  const draw = b.drawDecks![side];
  const existing = draw.hand.find((card) => card.id === id);
  if (existing) return existing;
  const i = draw.pile.indexOf(id);
  assert.ok(i >= 0);
  [draw.hand[0].id, draw.pile[i]] = [draw.pile[i], draw.hand[0].id];
  return draw.hand[0];
}
function deploy(b: ReturnType<typeof battle>, side: 0 | 1, id: string) {
  const card = hold(b, side, id);
  b.mana[side] = 100;
  assert.equal(b.play(side, id, 1, side === 0 ? -7 : 7, card.uid), null);
  return b.units.at(-1)!;
}

test('configured deck size, hand, duplicates, opening and draw order are authoritative', () => {
  const c = smallConfig();
  validateContent(c);
  const b = battle(c);
  assert.equal(b.hands[0].length, 4);
  assert.equal(b.cardDrawInfo[0].remaining, 4);
  assert.equal(b.has(0, 'dawn'), false, 'copies do not count as two distinct heroes for synergy');
  const first = b.hands[0][0],
    second = b.hands[0][1];
  assert.equal(first.id, 'solan');
  assert.equal(second.id, 'solan');
  assert.equal(b.play(0, 'solan', 1, -11, second.uid), null);
  assert.equal(b.hands[0][0].uid, first.uid);
  assert.equal(b.hands[0][1].id, 'fire');
  const ready = cycleBattle(c.gameplay!.deck.defaultCards, c, 1);
  assert.match(
    ready.mulligan(
      0,
      ready.hands[0].slice(0, 2).map((x) => x.uid),
    )!,
    /1 thẻ/,
  );
  c.gameplay!.deck.recycle = false;
  const finite = battle(c),
    draw = finite.drawDecks![0];
  for (let i = 0; i < 8; i++) assert.equal(draw.use(draw.hand[0].id, draw.hand[0].uid), true);
  assert.equal(draw.hand.length, 0);
  assert.equal(draw.discard.length, 8);
});
test('config controls spell cost, allegiance, radius, effects and freeze duration', () => {
  const c = defaultContent(),
    s = c.gameplay!.spells.ice;
  Object.assign(s, {
    cost: 1,
    radius: 0.3,
    warning: 0,
    target: 'ally',
    effects: [
      { kind: 'heal', amount: 13 },
      { kind: 'freeze', amount: 0, duration: 0.5 },
    ],
  });
  const b = battle(c),
    ally = deploy(b, 0, 'solan'),
    enemy = deploy(b, 1, 'kael');
  b.synergies = [{}, {}];
  ally.x = enemy.x = 0;
  ally.hp -= 50;
  ally.shield = enemy.shield = 0;
  ally.speed = enemy.speed = 0;
  const enemyHp = enemy.hp,
    card = hold(b, 0, 'ice');
  b.mana[0] = 4;
  assert.equal(b.cast(0, 'ice', 1, 0, card.uid), null);
  assert.equal(b.mana[0], 3);
  b.step();
  assert.equal(ally.hp, ally.maxHp - 37);
  assert.equal(enemy.hp, enemyHp);
  assert.equal(ally.frozenUntil, b.time + 0.5);
  for (let i = 0; i < 9; i++) b.step();
  assert.equal(ally.state, 'stunned');
  b.step();
  assert.notEqual(ally.state, 'stunned');
});
test('synergy effects and ability engagement read configured values; battle snapshots isolate later edits', () => {
  const c = defaultContent(),
    g = c.gameplay!;
  g.synergies.dawn.effects = [{ kind: 'shield', amount: 7 }];
  g.synergies.void.effects = [{ kind: 'attack', amount: 2 }];
  c.abilities.nyx.effects[0].amount = 77;
  const b = battle(c),
    nyx = deploy(b, 0, 'nyx'),
    tank = deploy(b, 1, 'kael'),
    archer = deploy(b, 1, 'lyra');
  assert.equal(nyx.shield, 7);
  assert.equal(nyx.attack, b.heroes.nyx.attack * 2);
  nyx.x = 0;
  tank.x = 1;
  archer.x = 4;
  tank.shield = archer.shield = 0;
  const hp = archer.hp;
  assert.equal(b.skill(nyx, b.heroes.nyx, [tank, archer]), true);
  assert.equal(archer.hp, hp - 77);
  c.abilities.nyx.effects[0].amount = 999;
  g.spells.fire.cost = 1;
  assert.equal(b.content.abilities.nyx.effects[0].amount, 77);
  assert.equal(b.gameplay.spells.fire.cost, 4);
});
test('configured PvP opening, reconnect and match time limits do not depend on fixed constants', () => {
  let now = 0;
  const c = smallConfig();
  Object.assign(c.gameplay!.match, {
    openingSeconds: 2,
    reconnectSeconds: 5,
    maximumSeconds: 30,
    tieBreak: 'damage-player0',
  });
  const rooms = new PvpRooms(() => now),
    loadout = { deck: [], spells: [], cards: c.gameplay!.deck.defaultCards };
  const a = rooms.create('a', loadout, c);
  rooms.join('b', a.code, loadout);
  now = 2000;
  assert.equal(rooms.state('a', a.code).state!.phase, 'playing');
  rooms.state('b', a.code);
  now = 4000;
  rooms.state('a', a.code);
  now = 7001;
  assert.equal(rooms.state('a', a.code).state!.winner, 0);
  const b = battle(c);
  b.tick = 599;
  b.time = 599 / 20;
  b.step();
  assert.equal(b.phase, 'ended');
  assert.equal(b.winner, 0);
});
test('invalid gameplay cannot publish impossible hands, disabled starter cards, invalid effects or unknown fields', () => {
  const mutations = [
    (c: ContentConfig) => {
      c.gameplay!.deck.handSize = 2;
    },
    (c: ContentConfig) => {
      c.gameplay!.spells.fire.enabled = false;
    },
    (c: ContentConfig) => {
      c.gameplay!.spells.ice.effects[1].duration = NaN;
    },
    (c: ContentConfig) => {
      c.gameplay!.spells.haste.effects[0].amount = -1;
    },
    (c: ContentConfig) => {
      (c.gameplay! as unknown as Record<string, unknown>).typo = 3;
    },
  ];
  for (const mutate of mutations) {
    const c = defaultContent();
    mutate(c);
    assert.throws(() => validateContent(c), /Gameplay/);
  }
});
test('database migration preserves historical revisions/matches and persists full gameplay across restart', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-config-'));
  let db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const old = defaultContent();
  delete old.gameplay;
  delete old.abilities.nyx.engage;
  const oldJson = JSON.stringify(old);
  db.db.prepare('UPDATE config SET draft=?,published=? WHERE id=1').run(oldJson, oldJson);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(oldJson);
  const player = db.player(),
    match = startMatch(db, player, [], 'normal', [], defaultContent().gameplay!.deck.defaultCards);
  db.db.prepare('UPDATE matches SET content=? WHERE id=?').run(oldJson, match.id);
  // This fixture emulates storage before both gameplay profile and module tables existed.
  db.db.exec('DELETE FROM rule_modules; DELETE FROM rule_module_revisions;');
  db.close();
  db = new GameDatabase(dir, 'test-password');
  assert.ok(db.config().published.gameplay);
  assert.equal(db.config().revision, 2);
  assert.equal(
    (db.db.prepare('SELECT content FROM revisions WHERE id=1').get() as { content: string }).content,
    oldJson,
  );
  assert.equal(db.db.prepare('SELECT content FROM matches WHERE id=?').get(match.id)!.content, oldJson);
  const draft = db.config();
  draft.draft.gameplay!.spells.fire.cost = 2;
  db.saveDraft(draft.draft, draft.version);
  assert.equal(db.config().published.gameplay!.spells.fire.cost, 4);
  db.publish(db.config().version);
  db.close();
  db = new GameDatabase(dir, 'test-password');
  assert.equal(db.config().published.gameplay!.spells.fire.cost, 2);
  assert.equal(db.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='gameplay.migrate'").get()!.n, 1);
});
test('authenticated admin draft/publish APIs round-trip gameplay into public content and new matches', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-config-http-')),
    db = new GameDatabase(dir, 'test-password'),
    server = createGameServer(db);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const port = (server.address() as { port: number }).port,
    base = `http://127.0.0.1:${port}`;
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
  const c = smallConfig();
  c.gameplay!.startingMana = 2;
  c.rules.maxMana = 12;
  const saved = await fetch(base + '/api/admin/draft', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content: c, version: db.config().version }),
  });
  assert.equal(saved.status, 200);
  const published = await fetch(base + '/api/admin/publish', {
    method: 'POST',
    headers,
    body: JSON.stringify({ version: db.config().version }),
  });
  assert.equal(published.status, 200);
  const publicConfig = (await (await fetch(base + '/api/content')).json()) as { content: ContentConfig };
  assert.deepEqual(publicConfig.content.gameplay, c.gameplay);
  assert.equal(battle(publicConfig.content).mana[0], 2);
});
test('admin exposes every gameplay section and spell preview uses configured radius/color', () => {
  const c = defaultContent();
  c.gameplay!.spells.fire.radius = 4;
  c.gameplay!.spells.fire.color = '#123456';
  const html = gameplayEditor(c);
  for (const field of [
    'gameplay.deck.handSize',
    'gameplay.startingMana',
    'gameplay.spells.fire.cost',
    'gameplay.synergies.dawn.required',
    'gameplay.ai.normalInterval',
    'gameplay.match.maximumSeconds',
    'gameplay.collection.initialGold',
  ])
    assert.ok(html.includes(`data-path="${field}"`));
  const fx = new SpellEffects();
  fx.setConfig(c.gameplay!);
  fx.update([{ id: 1, spellId: 'fire', side: 0, lane: 1, x: 0, starts: 1, ends: 4 }], [], 0, 0);
  const ring = fx.root.getObjectByName('spell-zone-1')!.children[0] as THREE.Mesh<
    THREE.RingGeometry,
    THREE.MeshBasicMaterial
  >;
  assert.equal(ring.scale.x, 4);
  assert.equal(ring.material.color.getHexString(), '123456');
  fx.dispose();
});

test('AI first decision and subsequent cadence use published timings', () => {
  const c = defaultContent();
  Object.assign(c.gameplay!.ai, { firstDecision: 10, normalInterval: 3, jitter: 0 });
  const b = battle(c);
  b.aiEnabled = true;
  for (let i = 0; i < 199; i++) b.step();
  assert.equal(b.units.length, 0);
  b.step();
  assert.ok(b.units.some((u) => u.side === 1));
  assert.equal(b.aiAt, 13);
});
test('collection initial gold, level cap, copies and chest draws come from database config', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-collection-config-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const c = db.config();
  Object.assign(c.draft.gameplay!.collection, {
    initialGold: 321,
    maxLevel: 2,
    copiesPerLevel: 3,
    chestDraws: 1,
  });
  db.saveDraft(c.draft, c.version);
  db.publish(db.config().version);
  const p = db.player();
  assert.equal(db.wallet(p).gold, 321);
  buyItem(db, p, 'shard-solan', 'config-buy-one');
  buyItem(db, p, 'shard-solan', 'config-buy-two');
  upgradeCard(db, p, 'solan', 'config-upgrade');
  const solan = db.wallet(p).cards.find((card) => card.hero === 'solan')!;
  assert.equal(solan.level, 2);
  assert.equal(solan.copies, 1);
  assert.throws(() => upgradeCard(db, p, 'solan', 'config-max-level'), /tối đa 2/);
  const chest = openChest(db, p, 'config-chest');
  assert.equal(chest.rewards.length, 1);
});
