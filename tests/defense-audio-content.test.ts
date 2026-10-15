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
import { audioEditor } from '../src/admin/audio-editor';
import { defaultContent } from '../src/data/content';
import type { State } from '../src/admin/types';

test('admin exposes both optional warning cues with volume, rate and repeat controls', () => {
  const draft = defaultContent();
  for (const cue of ['tower-warning', 'core-warning'] as const)
    draft.audio!.cues[cue] = { assetId: 'qa-warning', volume: 0.4, rate: 1, cooldownMs: 2800 };
  const html = audioEditor({ draft, assets: [] } as unknown as State);
  assert.ok(html.includes('Cảnh báo trụ bị đánh'));
  assert.ok(html.includes('Cảnh báo thành mất máu'));
  for (const cue of ['tower-warning', 'core-warning'])
    for (const control of ['volume', 'rate', 'cooldownMs'])
      assert.ok(html.includes(`audio.cues.${cue}.${control}`));
});

test('original warning audio is bounded, audible PCM with verified provenance', () => {
  const { files } = JSON.parse(readFileSync('assets/design/audio/defense/manifest.json', 'utf8'));
  let total = 0;
  for (const file of files) {
    const bytes = readFileSync(file.path);
    total += bytes.length;
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    const info = inspectAudio(bytes)!;
    assert.equal(info.sampleRate, 22050);
    assert.ok(info.duration >= 0.5 && info.duration <= 0.8);
    let energy = 0,
      peak = 0;
    for (let i = 44; i < bytes.length; i += 2) {
      const sample = bytes.readInt16LE(i) / 32768;
      energy += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    assert.ok(Math.sqrt(energy / ((bytes.length - 44) / 2)) > 0.08, 'audible RMS');
    assert.ok(peak < 0.95, 'headroom');
    assert.equal(bytes.readInt16LE(bytes.length - 2), 0, 'no tail click');
  }
  assert.ok(total < 65536);
});
test('warning installer preserves admin bindings, unrelated drafts/history/players and is idempotent', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-defense-audio-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let db = new GameDatabase(directory, 'qa');
  const custom = importAsset(db, readFileSync('public/design/audio/defense/tower-warning-v1.wav'), {
    name: 'Admin warning',
    author: 'QA',
    sourceUrl: 'https://example.com/qa',
    license: 'Test',
    rightsConfirmed: true,
  });
  const published = db.config().published;
  published.audio!.cues['tower-warning'] = { assetId: custom.id, volume: 0.12, rate: 1.2, cooldownMs: 7000 };
  db.saveDraft(published, db.config().version);
  db.publish(db.config().version);
  const draft = structuredClone(published);
  draft.map.name = 'Unpublished arena';
  db.saveDraft(draft, db.config().version);
  db.player();
  const history = db.db.prepare('SELECT id,content FROM revisions ORDER BY id').all(),
    players = db.db.prepare('SELECT * FROM players ORDER BY id').all();
  db.close();
  const apply = () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'tools/apply-defense-audio.ts', '--apply'],
      { encoding: 'utf8', env: { ...process.env, KORA_DATA_DIR: directory } },
    );
    assert.equal(result.status, 0, result.stderr);
  };
  apply();
  db = new GameDatabase(directory, 'qa');
  const after = db.config();
  assert.deepEqual(after.published.audio!.cues['tower-warning'], published.audio!.cues['tower-warning']);
  assert.equal(after.published.audio!.cues['core-warning']!.cooldownMs, 2800);
  assert.equal(after.draft.map.name, draft.map.name);
  assert.deepEqual(after.published.gameplay, published.gameplay);
  assert.deepEqual(
    db.db.prepare('SELECT id,content FROM revisions WHERE id<=? ORDER BY id').all(history.at(-1)!.id),
    history,
  );
  assert.deepEqual(db.db.prepare('SELECT * FROM players ORDER BY id').all(), players);
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
