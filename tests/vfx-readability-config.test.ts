import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { defaultContent, validateContent } from '../src/data/content';
import { VFX_EVENTS } from '../src/data/media';
import { defaultVfxReadability, validateVfxReadability } from '../src/data/vfx-readability';
import { vfxReadabilityEditor } from '../src/admin/vfx-readability-editor';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { installVfxReadability } from '../server/vfx-readability';

function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'kora-vfx-readability-')),
    store = new GameDatabase(directory, 'test');
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { store, directory };
}

test('readability validation preserves optional legacy content and accepts zero opacity/cooldown', () => {
  const content = defaultContent();
  assert.equal(content.vfx.readability, undefined);
  validateContent(content);
  const profile = defaultVfxReadability(),
    another = defaultVfxReadability();
  for (const event of VFX_EVENTS) {
    profile.events[event].opacity = 0;
    profile.events[event].cooldown = 0;
  }
  profile.melee.opacity = 0;
  profile.melee.enabled = false;
  validateVfxReadability(profile);
  content.vfx.readability = profile;
  validateContent(content);
  assert.equal(another.events.hit.opacity, 0.45);
  assert.equal(another.melee.enabled, true);
});

test('readability validation rejects missing, null, non-finite, extra and out-of-range settings', () => {
  for (const value of [null, undefined, {}, [], 1, 'profile'])
    assert.throws(() => validateVfxReadability(value as ReturnType<typeof defaultVfxReadability>));
  const changes: ((profile: ReturnType<typeof defaultVfxReadability>) => void)[] = [
    (p) => delete (p as Partial<typeof p>).events,
    (p) => delete (p.events as Partial<typeof p.events>).hit,
    (p) => delete (p.events.hit as Partial<typeof p.events.hit>).opacity,
    (p) => ((p.events as unknown as Record<string, unknown>).hit = null),
    (p) => ((p as unknown as Record<string, unknown>).melee = null),
    (p) => ((p as unknown as Record<string, unknown>).extra = true),
    (p) => ((p.events as unknown as Record<string, unknown>).extra = p.events.hit),
    (p) => ((p.events.hit as unknown as Record<string, unknown>).extra = true),
    (p) => ((p.melee as unknown as Record<string, unknown>).extra = true),
    (p) => (p.events.hit.opacity = NaN),
    (p) => (p.events.spawn.scale = Infinity),
    (p) => (p.events.skill.cooldown = NaN),
    (p) => (p.events.hit.opacity = -0.01),
    (p) => (p.events.hit.opacity = 1.01),
    (p) => (p.events.hit.scale = 0.19),
    (p) => (p.events.hit.scale = 2.01),
    (p) => (p.events.hit.cooldown = -0.01),
    (p) => (p.events.hit.cooldown = 2.01),
    (p) => ((p.events.hit as unknown as Record<string, unknown>).blend = 'screen'),
    (p) => (p.maxPerArea = 0),
    (p) => (p.maxPerArea = 8.01),
    (p) => (p.maxPerArea = 2.5),
    (p) => (p.areaRadius = 0.24),
    (p) => (p.areaRadius = 4.01),
    (p) => (p.maxDuration = 0.09),
    (p) => (p.maxDuration = 2.01),
    (p) => (p.melee.size = 0.29),
    (p) => (p.melee.opacity = 1.01),
    (p) => (p.melee.lifetime = 0.61),
    (p) => (p.melee.heightRatio = 0.91),
    (p) => ((p.melee as unknown as Record<string, unknown>).enabled = 'true'),
  ];
  for (const change of changes) {
    const profile = defaultVfxReadability();
    change(profile);
    assert.throws(() => validateVfxReadability(profile), Error, change.toString());
    const content = defaultContent();
    content.vfx.readability = profile;
    assert.throws(() => validateContent(content), Error, change.toString());
  }
});

test('readability admin exposes all event controls, budget and melee settings without adding legacy defaults', () => {
  const content = defaultContent();
  assert.match(vfxReadabilityEditor(content), /id="add-vfx-readability"/);
  assert.equal(content.vfx.readability, undefined);
  content.vfx.readability = defaultVfxReadability();
  const before = structuredClone(content),
    html = vfxReadabilityEditor(content);
  for (const event of VFX_EVENTS)
    for (const field of ['opacity', 'scale', 'blend', 'cooldown'])
      assert.ok(html.includes(`vfx.readability.events.${event}.${field}`));
  for (const field of ['maxPerArea', 'areaRadius', 'maxDuration'])
    assert.ok(html.includes(`vfx.readability.${field}`));
  for (const field of ['enabled', 'size', 'opacity', 'lifetime', 'heightRatio'])
    assert.ok(html.includes(`vfx.readability.melee.${field}`));
  assert.match(html, /value="normal"/);
  assert.match(html, /value="additive"/);
  assert.doesNotMatch(html, /undefined/);
  assert.deepEqual(content, before);
});

test('readability installation preserves published/draft choices, player progression and historical module snapshots', (t) => {
  const { store, directory } = fixture(t),
    png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
      'base64',
    ),
    metadata = {
      name: 'Published atlas',
      author: 'Test',
      sourceUrl: 'https://example.com/test',
      license: 'CC0',
      rightsConfirmed: true,
    },
    liveAsset = importAsset(store, png, metadata),
    draftAsset = importAsset(store, png, { ...metadata, name: 'Draft atlas' }),
    initial = store.config();
  initial.draft.vfx.eventSprites = {
    hit: { assetId: liveAsset.id, columns: 1, rows: 1, fps: 12 },
  };
  initial.draft.vfx.spellSprites = {
    fire: { assetId: liveAsset.id, columns: 1, rows: 1, fps: 8 },
  };
  initial.draft.map.textures = {
    stone: { assetId: liveAsset.id, repeat: 0.7, tint: '#abcdef' },
  };
  initial.draft.gameplay!.startingMana = 5;
  store.saveDraft(initial.draft, initial.version);
  store.publish(store.config().version);
  const player = store.player();
  store.db.prepare('UPDATE players SET gold=? WHERE id=?').run(4321, player);
  store.db
    .prepare('UPDATE cards SET level=?,copies=? WHERE player=? AND hero=?')
    .run(7, 123, player, 'solan');
  const state = store.config();
  state.draft.economy.winGold = 111;
  state.draft.gameplay!.startingMana = 6;
  state.draft.vfx.eventSprites!.hit!.assetId = draftAsset.id;
  state.draft.vfx.readability = defaultVfxReadability();
  state.draft.vfx.readability.maxPerArea = 6;
  state.draft.vfx.readability.events.hit.opacity = 0;
  store.saveDraft(state.draft, state.version);
  const before = store.config(),
    revisions = store.db.prepare('SELECT * FROM revisions ORDER BY id').all(),
    history = store.db.prepare('SELECT * FROM rule_module_revisions ORDER BY revision,module_id').all(),
    liveModules = store.db
      .prepare("SELECT * FROM rule_modules WHERE scope='published' ORDER BY module_id")
      .all(),
    draftPayloads = store.db
      .prepare(
        "SELECT module_id,schema_version,payload FROM rule_modules WHERE scope='draft' ORDER BY module_id",
      )
      .all(),
    players = store.db.prepare('SELECT * FROM players ORDER BY id').all(),
    cards = store.db.prepare('SELECT * FROM cards ORDER BY player,hero').all(),
    assets = store.db.prepare('SELECT * FROM assets ORDER BY id').all();
  const result = installVfxReadability(store);
  assert.equal(result.changed, true);
  assert.equal(result.revision, before.revision + 1);
  assert.ok(result.backup && existsSync(result.backup));
  assert.deepEqual(store.config().published, {
    ...before.published,
    vfx: { ...before.published.vfx, readability: defaultVfxReadability() },
  });
  assert.deepEqual(store.config().draft, before.draft);
  assert.deepEqual(store.config().published.gameplay, before.published.gameplay);
  assert.deepEqual(store.db.prepare('SELECT * FROM players ORDER BY id').all(), players);
  assert.deepEqual(store.db.prepare('SELECT * FROM cards ORDER BY player,hero').all(), cards);
  assert.deepEqual(store.db.prepare('SELECT * FROM assets ORDER BY id').all(), assets);
  assert.deepEqual(
    store.db.prepare('SELECT * FROM revisions WHERE id<=? ORDER BY id').all(before.revision),
    revisions,
  );
  assert.deepEqual(
    store.db
      .prepare('SELECT * FROM rule_module_revisions WHERE revision<=? ORDER BY revision,module_id')
      .all(before.revision),
    history,
  );
  assert.deepEqual(
    store.db.prepare("SELECT * FROM rule_modules WHERE scope='published' ORDER BY module_id").all(),
    liveModules,
  );
  assert.deepEqual(
    store.db
      .prepare(
        "SELECT module_id,schema_version,payload FROM rule_modules WHERE scope='draft' ORDER BY module_id",
      )
      .all(),
    draftPayloads,
  );
  const backup = new DatabaseSync(result.backup!, { readOnly: true });
  try {
    assert.equal(backup.prepare('SELECT revision FROM config WHERE id=1').get()!.revision, before.revision);
    assert.deepEqual(backup.prepare('SELECT * FROM revisions ORDER BY id').all(), revisions);
    assert.deepEqual(backup.prepare('SELECT * FROM cards ORDER BY player,hero').all(), cards);
  } finally {
    backup.close();
  }
  const installed = store.config(),
    audit = store.db.prepare('SELECT * FROM audit ORDER BY id').all(),
    backups = readdirSync(join(directory, 'backups'));
  assert.deepEqual(installVfxReadability(store), {
    changed: false,
    revision: result.revision,
    backup: undefined,
  });
  assert.deepEqual(store.config(), installed);
  assert.deepEqual(store.db.prepare('SELECT * FROM audit ORDER BY id').all(), audit);
  assert.deepEqual(readdirSync(join(directory, 'backups')), backups);
});

test('readability installer leaves an already published custom profile and unpublished edits untouched', (t) => {
  const { store, directory } = fixture(t),
    initial = store.config();
  initial.draft.vfx.readability = defaultVfxReadability();
  initial.draft.vfx.readability.events.skill.opacity = 0.17;
  initial.draft.vfx.readability.melee.size = 1.7;
  store.saveDraft(initial.draft, initial.version);
  store.publish(store.config().version);
  const state = store.config();
  state.draft.vfx.readability!.events.skill.opacity = 0.3;
  store.saveDraft(state.draft, state.version);
  const before = store.config(),
    revisions = store.db.prepare('SELECT * FROM revisions ORDER BY id').all();
  assert.equal(installVfxReadability(store).changed, false);
  assert.deepEqual(store.config(), before);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions ORDER BY id').all(), revisions);
  assert.equal(existsSync(join(directory, 'backups')), false);
});

test('failed readability publication rolls back draft, live config and historical snapshots after making a backup', (t) => {
  const { store, directory } = fixture(t),
    state = store.config();
  state.draft.economy.winGold = 111;
  store.saveDraft(state.draft, state.version);
  const before = store.config(),
    revisions = store.db.prepare('SELECT * FROM revisions ORDER BY id').all(),
    modules = store.db.prepare('SELECT * FROM rule_modules ORDER BY scope,module_id').all(),
    history = store.db.prepare('SELECT * FROM rule_module_revisions ORDER BY revision,module_id').all(),
    audit = store.db.prepare('SELECT * FROM audit ORDER BY id').all();
  store.db.exec(
    "CREATE TRIGGER reject_readability_history BEFORE INSERT ON rule_module_revisions BEGIN SELECT RAISE(ABORT, 'readability publication rejected'); END;",
  );
  assert.throws(() => installVfxReadability(store), /readability publication rejected/);
  assert.deepEqual(store.config(), before);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions ORDER BY id').all(), revisions);
  assert.deepEqual(store.db.prepare('SELECT * FROM rule_modules ORDER BY scope,module_id').all(), modules);
  assert.deepEqual(
    store.db.prepare('SELECT * FROM rule_module_revisions ORDER BY revision,module_id').all(),
    history,
  );
  assert.deepEqual(store.db.prepare('SELECT * FROM audit ORDER BY id').all(), audit);
  assert.equal(readdirSync(join(directory, 'backups')).length, 1);
});
