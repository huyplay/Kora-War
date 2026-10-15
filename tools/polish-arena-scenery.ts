import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { loadLocalEnvironment } from '../server/local-environment';
import type { ContentConfig } from '../src/data/content';

loadLocalEnvironment();
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const store = new GameDatabase(directory, process.env.KORA_ADMIN_PASSWORD);
try {
  const assets = store.assets(),
    rock = assets.find(
      (a) => a.sha256 === '8c8f9a2745806408f3ee0ea3d5f6e1e0fdd716489cff17b96eba041fd9e53a67',
    );
  if (!rock) throw new Error('Import the verified Poly Haven Moon Rock 02 asset first.');
  const old = assets.find(
    (a) => a.sha256 === 'cac58d6deb07f1d172b64a53a626dbc52f7ed333880625340cc719b38526ab65',
  );
  // Only replace these original demo placements. Admin-authored scenery is retained.
  const placements = [
    { asset: rock.id, x: -8, z: -8, scale: 1.2, to: { x: -9.2, z: -10.6, scale: 1, yaw: 30 } },
    { asset: rock.id, x: 8, z: 8, scale: 1, to: { x: 8.4, z: -10.2, scale: 0.85, yaw: -25 } },
    { asset: old?.id, x: -11, z: -9.5, scale: 2.2, to: { x: -13.6, z: -10.5, scale: 1.6, yaw: 22 } },
    { asset: old?.id, x: 10.8, z: -9.2, scale: 1.7, to: { x: 13.6, z: -10.5, scale: 1.2, yaw: -32 } },
  ];
  const apply = (content: ContentConfig) => {
    let count = 0;
    for (const prop of content.map.props) {
      const match = placements.find(
        (p) => p.asset === prop.assetId && p.x === prop.x && p.z === prop.z && p.scale === prop.scale,
      );
      if (match) {
        Object.assign(prop, match.to, { assetId: rock.id });
        count++;
      }
    }
    return count;
  };
  const state = store.config(),
    published = structuredClone(state.published),
    count = apply(published);
  const retainDraft = JSON.stringify(state.draft) !== JSON.stringify(state.published);
  if (!process.argv.includes('--apply') || !count) {
    console.log(
      `${count} original scenery placements to polish${count ? '; use --apply to publish' : '; already applied or customized'}.`,
    );
  } else {
    mkdirSync(join(directory, 'backups'), { recursive: true });
    const backup = join(directory, 'backups', `before-siege-scenery-${Date.now()}.sqlite`);
    store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    store.saveDraft(published, state.version);
    store.publish(store.config().version);
    if (retainDraft) {
      apply(state.draft);
      store.saveDraft(state.draft, store.config().version);
    }
    console.log(
      `Polished ${count} original scenery placements; revision ${store.config().revision}. Prior database backed up; unrelated draft edits retained.`,
    );
  }
} finally {
  store.close();
}
