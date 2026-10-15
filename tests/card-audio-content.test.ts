import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { GameDatabase } from '../server/database';
import { inspectAudio } from '../server/media-inspection';
import { importAsset } from '../server/assets';
test('original card audio stays small, decodable and checksum verified', () => {
  const { files } = JSON.parse(readFileSync('assets/design/audio/manifest.json', 'utf8'));
  let size = 0;
  for (const file of files) {
    const bytes = readFileSync(file.path);
    size += bytes.length;
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    assert.equal(inspectAudio(bytes)?.sampleRate, 22050);
    assert.ok(inspectAudio(bytes)!.duration <= 0.3);
  }
  assert.ok(size < 32768);
});
test('card audio publish preserves admin choices, unrelated draft and historical snapshots, and is idempotent', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-card-audio-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let db = new GameDatabase(directory, 'qa');
  const custom = importAsset(db, readFileSync('public/design/audio/card-draw-v1.wav'), {
    name: 'Admin choice',
    author: 'QA',
    sourceUrl: 'https://example.com/qa',
    license: 'Original test',
    rightsConfirmed: true,
  });
  const published = db.config().published;
  published.audio!.cues['card-draw'] = { assetId: custom.id, rate: 1.2, volume: 0.1, cooldownMs: 700 };
  db.saveDraft(published, db.config().version);
  db.publish(db.config().version);
  const draft = structuredClone(published);
  draft.map.name = 'Unpublished map edit';
  db.saveDraft(draft, db.config().version);
  const history = db.db.prepare('SELECT id,content FROM revisions ORDER BY id').all();
  db.close();
  const apply = () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'tools/apply-card-audio.ts', '--apply'], {
      encoding: 'utf8',
      env: { ...process.env, KORA_DATA_DIR: directory },
    });
    assert.equal(result.status, 0, result.stderr);
  };
  apply();
  db = new GameDatabase(directory, 'qa');
  const after = db.config();
  assert.equal(after.published.audio!.cues['card-draw']!.assetId, custom.id);
  assert.equal(after.published.audio!.cues['card-draw']!.rate, 1.2);
  assert.ok(after.published.audio!.cues['card-wait']);
  assert.ok(after.published.audio!.cues['card-ready']);
  assert.equal(after.draft.map.name, 'Unpublished map edit');
  assert.equal(after.published.map.name, published.map.name);
  assert.deepEqual(after.published.gameplay, published.gameplay);
  assert.deepEqual(
    db.db.prepare('SELECT id,content FROM revisions WHERE id<=? ORDER BY id').all(history.at(-1)!.id),
    history,
  );
  const revision = after.revision,
    version = after.version,
    assets = db.assets().length;
  db.close();
  apply();
  db = new GameDatabase(directory, 'qa');
  assert.equal(db.config().revision, revision);
  assert.equal(db.config().version, version);
  assert.equal(db.assets().length, assets);
  db.close();
});
