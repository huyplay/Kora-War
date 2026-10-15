import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { spawnSync } from 'node:child_process';

test('original valley art stays within its mobile budget and matches its provenance manifest', () => {
  const metadata = JSON.parse(readFileSync('assets/design/arena/manifest.json', 'utf8'));
  const bytes = readFileSync(metadata.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);
  assert.equal(bytes.length, metadata.bytes);
  assert.ok(bytes.length < 500_000);
});
test('database publication accepts image backgrounds, protects archive references and keeps historical content intact', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-valley-'));
  const store = new GameDatabase(directory, 'qa-only');
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const metadata = JSON.parse(readFileSync('assets/design/arena/manifest.json', 'utf8'));
  const image = importAsset(store, readFileSync(metadata.file), { ...metadata, rightsConfirmed: true });
  const old = store.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content;
  const c = store.config();
  c.draft.map.backdropAssetId = image.id;
  store.saveDraft(c.draft, c.version);
  store.publish(store.config().version);
  assert.equal(store.config().published.map.backdropAssetId, image.id);
  assert.equal(store.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, old);
  assert.throws(() => store.archiveAsset(image.id, true), /đang dùng/);
  const revision = store.config().revision;
  store.db.prepare("UPDATE assets SET kind='audio' WHERE id=?").run(image.id);
  assert.throws(() => store.publish(store.config().version), /Hậu cảnh map phải là ảnh/);
  assert.equal(store.config().revision, revision);
});

test('valley installer publishes once, preserves existing revisions and unrelated draft edits', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-valley-install-'));
  let store = new GameDatabase(directory, 'qa-only');
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const state = store.config(),
    original = store.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content;
  state.draft.economy.winGold += 7;
  store.saveDraft(state.draft, state.version);
  store.close();
  const run = () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'tools/apply-valley-vistas.ts', '--apply'],
      { env: { ...process.env, KORA_DATA_DIR: directory, KORA_ADMIN_PASSWORD: 'qa-only' }, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
  };
  run();
  store = new GameDatabase(directory, 'qa-only');
  assert.equal(store.config().revision, 2);
  assert.ok(store.config().published.map.backdropAssetId);
  assert.equal(store.config().published.economy.winGold, state.published.economy.winGold);
  assert.equal(store.config().draft.economy.winGold, state.draft.economy.winGold);
  assert.deepEqual(store.config().published.gameplay, state.published.gameplay);
  assert.equal(store.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, original);
  store.close();
  run();
  store = new GameDatabase(directory, 'qa-only');
  assert.equal(store.config().revision, 2);
});
