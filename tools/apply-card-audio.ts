import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { defaultAudio, type SoundCue } from '../src/data/media';
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const apply = process.argv.includes('--apply');
const manifest = JSON.parse(readFileSync('assets/design/audio/manifest.json', 'utf8')) as {
  files: { cue: SoundCue; path: string; sha256: string }[];
};
const store = new GameDatabase(directory);
try {
  const config = store.config(),
    published = structuredClone(config.published),
    draft = structuredClone(config.draft);
  const missing = manifest.files.filter((f) => !published.audio?.cues[f.cue]);
  if (!missing.length) {
    console.log('Current card audio retained; no revision created.');
  } else if (!apply) {
    console.log(`Dry run: ${missing.map((f) => f.cue).join(', ')}. Use --apply.`);
  } else {
    mkdirSync(join(directory, 'backups'), { recursive: true });
    const backup = join(directory, 'backups', `before-card-audio-${Date.now()}.sqlite`);
    store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    published.audio ??= defaultAudio();
    draft.audio ??= defaultAudio();
    for (const file of missing) {
      const bytes = readFileSync(file.path);
      if (bytes.length > 32768 || createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw new Error('Card audio checksum/budget mismatch.');
      const existing = store.assets().find((a) => a.sha256 === file.sha256 && !a.archived);
      const asset =
        existing ??
        importAsset(store, bytes, {
          name: file.cue,
          author: 'Kora War / Codex',
          license: 'Original Kora War project asset',
          sourceUrl: 'https://github.com/huyplay/Kora-War',
          rightsConfirmed: true,
        });
      const binding = {
        assetId: asset.id,
        rate: 1,
        volume: file.cue === 'card-wait' ? 0.22 : 0.35,
        cooldownMs: file.cue === 'card-draw' ? 180 : 450,
      };
      published.audio.cues[file.cue] = binding;
      draft.audio.cues[file.cue] ??= structuredClone(binding);
    }
    const saved = store.saveDraft(published, config.version);
    store.publish(saved.version);
    store.saveDraft(draft, store.config().version);
    console.log(`Published card audio revision ${store.config().revision}; backup ${backup}`);
  }
} finally {
  store.close();
}
