import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { loadLocalEnvironment } from '../server/local-environment';
import type { ContentConfig, MapProp } from '../src/data/content';

loadLocalEnvironment();
const metadata = JSON.parse(readFileSync('assets/design/arena/manifest.json', 'utf8'));
const bytes = readFileSync(metadata.file);
if (bytes.length > 500_000 || createHash('sha256').update(bytes).digest('hex') !== metadata.sha256)
  throw new Error('Valley artwork exceeds budget or does not match the manifest.');
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const store = new GameDatabase(directory, process.env.KORA_ADMIN_PASSWORD);
try {
  const state = store.config();
  if (state.published.map.backdropAssetId) {
    console.log('Published map already has an admin-selected background; retained without a new revision.');
  } else if (!process.argv.includes('--apply')) {
    console.log('Ready to import valley artwork and publish background/6 cliff props; --apply is required.');
  } else {
    mkdirSync(join(directory, 'backups'), { recursive: true });
    const backup = join(directory, 'backups', `before-valley-${Date.now()}.sqlite`);
    store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    const image =
      store.assets().find((a) => a.sha256 === metadata.sha256) ??
      importAsset(store, bytes, { ...metadata, rightsConfirmed: true });
    const rock = store
      .assets()
      .find((a) => a.sha256 === '8c8f9a2745806408f3ee0ea3d5f6e1e0fdd716489cff17b96eba041fd9e53a67');
    const apply = (content: ContentConfig) => {
      if (content.map.backdropAssetId) return;
      content.map.backdropAssetId = image.id;
      content.map.backdropCrop = 0.65;
      if (rock) {
        const cliffs: MapProp[] = [
          [-19, 11.5],
          [-8, 11.5],
          [8, 11.5],
          [19, 11.5],
          [-21.4, -5],
          [21.4, -5],
        ].map(([x, z], i) => ({
          assetId: rock.id,
          x,
          z,
          y: -6,
          scale: 4.8,
          tint: '#807569',
          yaw: i * 57,
        }));
        for (const prop of cliffs)
          if (
            content.map.props.length < 100 &&
            !content.map.props.some(
              (p) => p.assetId === prop.assetId && p.x === prop.x && p.z === prop.z && p.y === prop.y,
            )
          )
            content.map.props.push(prop);
      }
    };
    const content = structuredClone(state.published),
      retainDraft = JSON.stringify(state.draft) !== JSON.stringify(state.published);
    apply(content);
    store.saveDraft(content, state.version);
    store.publish(store.config().version);
    if (retainDraft) {
      apply(state.draft);
      store.saveDraft(state.draft, store.config().version);
    }
    console.log(
      `Valley artwork imported; revision ${store.config().revision}; database backed up, historical snapshots and unrelated drafts preserved.`,
    );
  }
} finally {
  store.close();
}
