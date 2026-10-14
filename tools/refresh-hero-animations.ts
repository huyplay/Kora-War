import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { importAsset, inspectGLB } from '../server/assets';
import { syncManagedAsset } from '../server/asset-service';
import { loadLocalEnvironment } from '../server/local-environment';
import { compactGLB } from './compact-glb';
import { selectAnimationClips } from './animation-mapping';
import type { ContentConfig } from '../src/data/content';

// Repack only the requested hero from verified local sources, preserving other draft edits.
loadLocalEnvironment();
const hero = process.argv[2];
const manifest = JSON.parse(readFileSync('assets/riot/manifest.json', 'utf8'));
const model = manifest.models.find((entry: { hero: string }) => entry.hero === hero);
if (!model) throw new Error('Usage: tsx tools/refresh-hero-animations.ts <hero-id>');
const report = JSON.parse(readFileSync('assets/riot/import-report.json', 'utf8'));
const record = report.find((entry: { hero: string }) => entry.hero === hero);
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const original = readFileSync(join(directory, 'source-assets', `${model.champion}.glb`));
if (createHash('sha256').update(original).digest('hex') !== record.sourceSha256)
  throw new Error('Cached source differs from the reviewed import checksum.');
const clips = selectAnimationClips(inspectGLB(original).clips);
const bytes = compactGLB(original, Object.values(clips) as string[]);
const hash = createHash('sha256').update(bytes).digest('hex');
const store = new GameDatabase(directory);
try {
  const state = store.config();
  const previous = store.assets(true).find((asset) => asset.id === state.published.models[hero].assetId);
  if (!previous) throw new Error('Published model is missing.');
  if (
    previous.metadata.sourceUrl !== `https://modelviewer.lol/model-viewer?id=${model.modelId}` ||
    state.published.models[hero].animationAssetId
  )
    throw new Error(
      'Published model uses a different source or animation asset; review its binding before repacking.',
    );
  if (
    previous.sha256 === hash &&
    JSON.stringify(state.published.models[hero].clips) === JSON.stringify(clips)
  ) {
    console.log(`${hero}: animations already current.`);
  } else {
    mkdirSync(join(directory, 'backups'), { recursive: true });
    const backup = join(directory, 'backups', `before-animation-${Date.now()}.sqlite`);
    store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    const asset =
      store.assets(true).find((entry) => entry.sha256 === hash) ||
      importAsset(store, bytes, previous.metadata);
    await syncManagedAsset(store, asset.id);
    const apply = (content: ContentConfig) => {
      // A deliberately replaced draft model keeps its own clips and binding.
      if (content.models[hero]?.assetId === previous.id)
        content.models[hero] = { ...content.models[hero], assetId: asset.id, clips };
    };
    const published = structuredClone(state.published);
    apply(published);
    store.saveDraft(published, state.version);
    store.publish(store.config().version);
    if (JSON.stringify(state.draft) !== JSON.stringify(state.published)) {
      apply(state.draft);
      store.saveDraft(state.draft, store.config().version);
    }
    Object.assign(record, { sha256: hash, bytes: bytes.length, ...inspectGLB(bytes) });
    writeFileSync('assets/riot/import-report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(`${hero}: published ${Object.keys(clips).join(', ')}; revision ${store.config().revision}.`);
  }
} finally {
  store.close();
}
