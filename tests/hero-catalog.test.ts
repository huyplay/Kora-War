import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultContent, validateContent, type ContentConfig } from '../src/data/content';
import { type HeroAddition, installHeroCatalog } from '../server/hero-catalog';
import { GameDatabase } from '../server/database';
import { buyItem, upgradeCard, startMatch } from '../server/game-service';
import { cycleBattle } from '../src/core/cycle-battle';
import { castAbility } from '../src/core/systems/cast-ability';
import { cardDeckError } from '../src/data/card-decks';
import { fitDeck } from '../src/data/gameplay';
import { parseSave } from '../src/services/save-store';
import { createHeroPrefabs } from '../src/rendering/assets/hero-prefabs';
import { PvpRooms } from '../server/pvp';
import { renderStudioPage } from '../src/admin/views';
import type { State } from '../src/admin/types';
import type { Hero } from '../src/data/types';
import type { AbilityDefinition } from '../src/data/abilities';

const pack = JSON.parse(readFileSync('assets/riot/elyndra-wave-1.json', 'utf8')) as {
  heroes: Hero[];
  abilities: Record<string, AbilityDefinition>;
  items: ContentConfig['items'];
};
const additions = (): HeroAddition[] =>
  pack.heroes.map((hero) => ({
    hero: structuredClone(hero),
    ability: structuredClone(pack.abilities[hero.id]),
    item: structuredClone(pack.items.find((item) => item.heroId === hero.id)!),
  }));
function expanded() {
  const c = defaultContent();
  for (const a of additions()) {
    c.heroes.push(a.hero);
    c.abilities[a.hero.id] = a.ability;
    c.items.push(a.item!);
  }
  const cards = [...pack.heroes.map((h) => h.id), 'solan', 'lyra', ...Object.keys(c.gameplay!.spells)];
  c.gameplay!.deck.defaultCards = cards;
  c.gameplay!.deck.aiCards = cards.slice();
  c.gameplay!.deck.shuffle = false;
  validateContent(c);
  return c;
}
function setup(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'kora-heroes-')),
    store = new GameDatabase(dir, 'test-admin');
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return store;
}
function battle(c = expanded()) {
  const b = cycleBattle(c.gameplay!.deck.defaultCards, c, 123);
  b.mulligan(0, []);
  b.mulligan(1, []);
  b.start();
  b.aiEnabled = false;
  return b;
}
function deploy(b: ReturnType<typeof battle>, side: 0 | 1, id: string) {
  const draw = b.drawDecks![side];
  let card = draw.hand.find((card) => card.id === id);
  if (!card) {
    const index = draw.pile.indexOf(id);
    assert.ok(index >= 0);
    [draw.hand[0].id, draw.pile[index]] = [draw.pile[index], draw.hand[0].id];
    card = draw.hand[0];
  }
  b.mana[side] = 100;
  assert.equal(b.play(side, id, 1, side ? 11 : -11, card.uid), null);
  return b.units.at(-1)!;
}
test('published catalog accepts new heroes, bindings and audio while protecting original identities and reserved IDs', () => {
  const c = expanded();
  c.models.elara = { assetId: 'elara-model', height: 2.4, yaw: 0, clips: { idle: 'Idle1' } };
  c.audio!.heroes.elara = { attack: { assetId: 'attack', volume: 0.5, rate: 1, cooldownMs: 100 } };
  validateContent(c);
  const invalid = (change: (c: ContentConfig) => void) => {
    const bad = structuredClone(c);
    change(bad);
    assert.throws(() => validateContent(bad));
  };
  invalid((c) => (c.heroes[0].name = 'Changed'));
  invalid((c) => c.heroes.shift());
  for (const id of ['wind', 'constructor', '__proto__', 'bad/path'])
    invalid((c) => (c.heroes.at(-1)!.id = id));
  invalid((c) => (c.heroes.at(-1)!.role = 'unknown' as Hero['role']));
  invalid((c) => (c.heroes.at(-1)!.id = c.heroes[0].id));
  invalid((c) => (c.models.unknown = { assetId: 'x', height: 2, yaw: 0, clips: {} }));
});
test('new hero decks retain opening composition, exact save data and deterministic simulation', () => {
  const c = expanded(),
    g = c.gameplay!,
    cards = g.deck.defaultCards;
  assert.equal(cardDeckError(cards, g, c.heroes), null);
  assert.notEqual(cardDeckError(cards, g), null);
  assert.deepEqual(fitDeck(cards, g, c.heroes), cards);
  assert.deepEqual(parseSave(JSON.stringify({ cards }), g, c.heroes).cards, cards);
  const a = battle(c),
    b = battle(c);
  assert.ok(a.hands[0].filter((card) => !Object.hasOwn(g.spells, card.id)).length >= 4);
  assert.ok(a.hands[0].some((card) => Object.hasOwn(g.spells, card.id)));
  assert.deepEqual([a.synergies[0].dawn, a.synergies[0].grove, a.synergies[0].vanguard], [2, 2, 3]);
  for (const id of pack.heroes.map((h) => h.id)) {
    deploy(a, 0, id);
    deploy(b, 0, id);
  }
  for (let i = 0; i < 200; i++) {
    a.step();
    b.step();
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.ok(a.events.some((e) => e.heroId === 'torvyn'));
  assert.equal(defaultContent().heroes.length, 10, 'legacy presets remain immutable');
});
test('the four new abilities use published damage/heal/shield/stun/engage data', () => {
  for (const id of pack.heroes.map((h) => h.id)) {
    const c = expanded();
    if (id === 'seryn') c.abilities.seryn.effects[0].amount = 17;
    const b = battle(c),
      caster = deploy(b, 0, id),
      enemy = deploy(b, 1, 'lyra');
    caster.x = 0;
    enemy.x = id === 'kharos' ? 3 : 0.5;
    caster.shield = 0;
    enemy.shield = 0;
    caster.hp = caster.maxHp - 50;
    const before = enemy.hp;
    assert.equal(castAbility(b, caster, b.heroes[id], [enemy]), true);
    if (id === 'elara') {
      assert.equal(caster.shield, 100);
      assert.equal(enemy.stunUntil, 0.8);
    }
    if (id === 'seryn') {
      assert.equal(before - enemy.hp, 17);
      assert.equal(caster.hp, caster.maxHp - 15);
    }
    if (id === 'kharos') {
      assert.equal(caster.x, 3.65);
      assert.equal(before - enemy.hp, 130);
    }
    if (id === 'torvyn') {
      assert.equal(caster.shield, 90);
      assert.equal(before - enemy.hp, 80);
      assert.equal(enemy.stunUntil, 0.8);
    }
  }
});
test('catalog publication initializes old/new wallets, keeps drafts and histories and is idempotent', (t) => {
  const store = setup(t),
    player = store.player(),
    old = store.config(),
    history = store.db.prepare('SELECT * FROM revisions').all();
  const locked = startMatch(
    store,
    player,
    [],
    'normal',
    undefined,
    old.published.gameplay!.deck.defaultCards,
  );
  store.db.prepare("UPDATE cards SET level=2,copies=7 WHERE player=? AND hero='solan'").run(player);
  old.draft.economy.winGold = 123;
  store.saveDraft(old.draft, old.version);
  const result = installHeroCatalog(store, additions());
  assert.ok(existsSync(result.backup!));
  assert.equal(store.config().published.heroes.length, 14);
  assert.equal(
    JSON.parse(store.db.prepare('SELECT content FROM matches WHERE id=?').get(locked.id)!.content as string)
      .heroes.length,
    10,
  );
  assert.equal(
    startMatch(store, player, [], 'normal', undefined, store.config().published.gameplay!.deck.defaultCards)
      .content.heroes.length,
    14,
  );
  assert.equal(store.config().draft.economy.winGold, 123);
  assert.equal(store.config().published.economy.winGold, 80);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions WHERE id=?').all(old.revision), history);
  const wallet = store.wallet(player);
  assert.equal(wallet.cards.length, 14);
  assert.deepEqual(
    { ...wallet.cards.find((card) => card.hero === 'solan') },
    { hero: 'solan', level: 2, copies: 7 },
  );
  assert.equal(store.wallet(store.player()).cards.length, 14);
  const version = store.config().version;
  assert.deepEqual(installHeroCatalog(store, additions()).added, []);
  assert.equal(store.config().version, version);
  buyItem(store, player, 'shard-elara', 'buy-elara-001');
  upgradeCard(store, player, 'elara', 'upgrade-elara-001');
  assert.equal(store.wallet(player).gold, 185);
  assert.equal(store.wallet(player).cards.find((card) => card.hero === 'elara')!.level, 2);
  store.restoreRevision(old.revision, store.config().version);
  store.publish(store.config().version);
  assert.equal(store.wallet(player).cards.length, 10);
  installHeroCatalog(store, additions());
  assert.equal(
    store.wallet(player).cards.find((card) => card.hero === 'elara')!.level,
    2,
    'retired progress survives restore/reinstall',
  );
});
test('failed publication rolls back the complete installer and draft conflicts do not overwrite admin work', (t) => {
  const store = setup(t),
    before = store.config(),
    bad = additions();
  bad[0].model = { assetId: 'missing', height: 2, yaw: 0, clips: {} };
  assert.throws(() => installHeroCatalog(store, bad), /Asset/);
  assert.deepEqual(store.config(), before);
  const draft = structuredClone(before.draft);
  draft.heroes.push(pack.heroes[0]);
  draft.abilities.elara = pack.abilities.elara;
  store.saveDraft(draft, before.version);
  const saved = store.config();
  assert.throws(() => installHeroCatalog(store, additions()), /CONFLICT/);
  assert.deepEqual(store.config(), saved);
});
test('new heroes work in PvP hand commands, procedural fallback and the admin character editor', () => {
  const c = expanded(),
    loadout = { cards: c.gameplay!.deck.defaultCards, deck: [], spells: [] };
  let now = 0;
  const rooms = new PvpRooms(() => now),
    a = rooms.create('a', loadout, c);
  rooms.join('b', a.code, loadout);
  for (const player of ['a', 'b'])
    rooms.command(player, a.code, { id: `keep-${player}-new`, type: 'mulligan', cards: [], lane: 0, x: 0 });
  const card = rooms.state('a', a.code).state!.hands![0].find((card) => card.id === 'elara')!;
  const result = rooms.command('a', a.code, {
    id: 'deploy-elara-new',
    type: 'play',
    card: 'elara',
    cardUid: card.uid,
    lane: 1,
    x: -11,
  });
  assert.equal(result.error, null);
  assert.equal(result.state!.units[0].heroId, 'elara');
  now = 1000;
  assert.equal(rooms.state('a', a.code).state!.tick, 20);
  const prefabs = createHeroPrefabs(c.heroes);
  for (const h of pack.heroes) assert.ok(prefabs.get(h.id)().userData.leftLeg);
  prefabs.dispose();
  const html = renderStudioPage({ draft: c, assets: [] } as unknown as State, 'heroes', 'torvyn', '');
  assert.match(html, /Torvyn/);
  assert.match(html, /Sấm Hoang/);
  assert.match(html, /heroes\.13\.attack/);
});
