import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameDatabase } from '../server/database';
import { importReactionArt, verifiedReactionArt } from '../tools/import-reaction-assets';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRef = '781e1754c9df887234cbe1412cc614f74291e1f3';
const temporaryRoot = realpathSync(tmpdir());

test('verified reaction art imports and publishes database bindings once without changing gameplay/history', () => {
  assert.equal(verifiedReactionArt(root).length, 8);
  const dir = mkdtempSync(join(temporaryRoot, 'kora-reaction-art-'));
  const store = new GameDatabase(dir, 'art-test-only-password');
  try {
    const before = store.config();
    const first = importReactionArt(store, root, { bind: true, publish: true, sourceRef });
    assert.equal(first.changed, true);
    assert.equal(first.revision, before.revision + 1);
    assert.equal(store.assets().length, 8);
    const after = store.config();
    assert.deepEqual(after.published.gameplay, before.published.gameplay);
    assert.equal(after.published.communication!.reactions.filter((r) => r.imageAssetId).length, 8);
    assert.deepEqual(
      JSON.parse(
        store.db.prepare('SELECT content FROM revisions WHERE id=?').get(before.revision)!.content as string,
      ),
      before.published,
    );
    assert.equal(importReactionArt(store, root, { bind: true, publish: true, sourceRef }).changed, false);
    assert.equal(store.config().revision, after.revision);
    assert.equal(store.assets().length, 8);
    // A hand-picked image remains authoritative; importing defaults never replaces it.
    const customized = store.config();
    customized.draft.communication!.reactions.find((r) => r.id === 'happy')!.imageAssetId =
      first.bindings.heart;
    store.saveDraft(customized.draft, customized.version);
    assert.throws(() => importReactionArt(store, root, { bind: true, publish: true, sourceRef }), /bản nháp/);
    importReactionArt(store, root, { bind: true, publish: false, sourceRef });
    assert.equal(
      store.config().draft.communication!.reactions.find((r) => r.id === 'happy')!.imageAssetId,
      first.bindings.heart,
    );
    assert.equal(store.config().revision, after.revision);
  } finally {
    store.close();
    if (!resolve(dir).startsWith(temporaryRoot + sep) || !dir.includes('kora-reaction-art-'))
      throw new Error('Invalid art test cleanup path');
    rmSync(dir, { recursive: true, force: true });
  }
});
