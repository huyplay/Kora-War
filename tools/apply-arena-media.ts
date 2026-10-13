import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { syncManagedAsset } from '../server/asset-service';
import { loadLocalEnvironment } from '../server/local-environment';
import type { ContentConfig } from '../src/data/content';

loadLocalEnvironment();
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const store = new GameDatabase(directory);
type Record = {
  file: string;
  sha256: string;
  sourceUrl: string;
  author: string;
  license: string;
  slot?: 'stone' | 'wall';
  semantic?: 'diffuse' | 'normal' | 'roughness';
};
const records = ['arena-texture-report.json', 'arena-prop-report.json', 'gegx-report.json'].flatMap(
  (file) => JSON.parse(readFileSync(join('assets/media', file), 'utf8')) as Record[],
);
try {
  const backup = join(directory, 'backups', `before-arena-${Date.now()}.sqlite`);
  mkdirSync(join(directory, 'backups'), { recursive: true });
  store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  const assets = new Map<string, string>();
  for (const record of records) {
    const bytes = readFileSync(join('.data/source-assets/media', record.file));
    if (createHash('sha256').update(bytes).digest('hex') !== record.sha256)
      throw new Error(`Checksum: ${record.file}`);
    const asset =
      store.assets(true).find((asset) => asset.sha256 === record.sha256) ??
      importAsset(store, bytes, { ...record, name: record.file, rightsConfirmed: true });
    assets.set(record.file, asset.id);
    await syncManagedAsset(store, asset.id);
  }
  const apply = (content: ContentConfig) => {
    content.map.background = '#171924';
    content.map.exposure = 1.05;
    content.map.textures ||= {};
    for (const slot of ['stone', 'wall'] as const) {
      const id = (semantic: string) =>
        assets.get(records.find((record) => record.slot === slot && record.semantic === semantic)!.file)!;
      content.map.textures[slot] = {
        assetId: id('diffuse'),
        normalAssetId: id('normal'),
        roughnessAssetId: id('roughness'),
        repeat: slot === 'stone' ? 0.35 : 0.7,
        tint: slot === 'stone' ? '#c8b9a4' : '#8a8791',
      };
    }
    const sheet = (file: string, fps = 12) => ({
      assetId: assets.get(`gegx-${file}.png`)!,
      columns: 8,
      rows: 1,
      fps,
    });
    content.vfx.spellSprites = {
      fire: sheet('flame_spiral_128x128_8f_loop'),
      ice: sheet('frost_rune_circle_128x128_8f_loop', 8),
      lightning: sheet('laser_bolt_blue_128x128_8f_loop', 16),
      wind: sheet('storm_spiral_128x128_8f_loop'),
    };
    content.vfx.eventSprites ||= {};
    content.vfx.eventSprites.hit = sheet('small_explosion_128x128_8f', 24);
    content.vfx.eventSprites.projectile = sheet('laser_bolt_blue_128x128_8f_loop', 24);
    if (content.audio) {
      content.audio.master = 0.65;
      const volumes = {
        hit: 0.22,
        footstep: 0.065,
        tower: 0.22,
        core: 0.3,
        death: 0.18,
        skill: 0.4,
        play: 0.24,
        click: 0.32,
        win: 0.55,
        lose: 0.4,
      };
      for (const [cue, volume] of Object.entries(volumes)) {
        const binding = content.audio.cues[cue as keyof typeof volumes];
        if (binding) binding.volume = volume;
      }
    }
    // Existing decorative props are moved away from the combat lanes.
    for (const prop of content.map.props)
      if (Math.abs(prop.z) < 7.8 && Math.abs(prop.x) < 14.5) prop.z = prop.z < 0 ? -8.8 : 8.8;
    const rock = assets.get('polyhaven-moon-rock-01.glb')!;
    if (!content.map.props.some((prop) => prop.assetId === rock))
      content.map.props.push(
        { assetId: rock, x: -11, z: -9.5, scale: 2.2, yaw: 22 },
        { assetId: rock, x: 10.8, z: -9.2, scale: 1.7, yaw: -32 },
      );
  };
  const state = store.config(),
    retainDraft = JSON.stringify(state.draft) !== JSON.stringify(state.published);
  const published = structuredClone(state.published);
  apply(published);
  store.saveDraft(published, state.version);
  store.publish(store.config().version);
  if (retainDraft) {
    apply(state.draft);
    store.saveDraft(state.draft, store.config().version);
  }
  console.log(
    `Arena revision ${store.config().revision}: ${records.length} assets; prior database backed up, unrelated draft edits retained.`,
  );
} finally {
  store.close();
}
