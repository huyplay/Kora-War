import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { defaultAudio, type SoundCue } from '../src/data/media';

const root = resolve('.data/source-assets/media');
const records = JSON.parse(readFileSync(join(root, 'download-report.json'), 'utf8')) as {
  file: string;
  sha256: string;
  sourceUrl: string;
  author: string;
  license: string;
}[];
const propReport = 'assets/media/polyhaven-prop-report.json';
if (existsSync(propReport)) records.push(...JSON.parse(readFileSync(propReport, 'utf8')));
const store = new GameDatabase(
  resolve(process.env.KORA_DATA_DIR || '.data'),
  process.env.KORA_ADMIN_PASSWORD,
);
const apply = process.argv.includes('--apply');
try {
  const state = store.config(),
    audio = (state.draft.audio ||= defaultAudio());
  const assets = new Map<string, string>();
  const report = [];
  for (const record of records.filter((a) => !a.file.endsWith('.txt'))) {
    const bytes = readFileSync(join(root, record.file));
    if (createHash('sha256').update(bytes).digest('hex') !== record.sha256)
      throw new Error(`Checksum: ${record.file}`);
    const asset =
      store.assets(true).find((a) => a.sha256 === record.sha256) ||
      importAsset(store, bytes, {
        ...record,
        name: record.file,
        rightsConfirmed: true,
      });
    assets.set(record.file, asset.id);
    report.push({ ...record, bytes: bytes.length, kind: asset.kind });
  }
  const defaults: Partial<Record<SoundCue, string>> = {
    click: 'interface-click_001.ogg',
    play: 'rpg-drawKnife1.ogg',
    hit: 'rpg-knifeSlice.ogg',
    tower: 'rpg-metalPot1.ogg',
    core: 'rpg-doorClose_1.ogg',
    death: 'rpg-doorClose_1.ogg',
    footstep: 'rpg-footstep00.ogg',
    skill: 'magical_2.ogg',
    win: 'interface-confirmation_001.ogg',
    lose: 'interface-error_001.ogg',
  };
  for (const [cue, file] of Object.entries(defaults)) {
    const key = cue as SoundCue,
      id = assets.get(file);
    if (id && !audio.cues[key])
      audio.cues[key] = {
        assetId: id,
        volume: cue === 'footstep' ? 0.12 : 0.5,
        rate: 1,
        cooldownMs: cue === 'footstep' ? 400 : cue === 'hit' ? 120 : 100,
      };
  }
  const stone = assets.get('castle-brick-diffuse.jpg');
  if (stone) {
    state.draft.map.textures ||= {};
    state.draft.map.textures.stone ||= { assetId: stone, repeat: 1, tint: '#ffffff' };
  }
  const rock = assets.get('polyhaven-moon-rock-02.glb');
  if (rock && !state.draft.map.props.some((p) => p.assetId === rock)) {
    state.draft.map.props.push(
      { assetId: rock, x: -8, z: -8, scale: 1.2, yaw: 0.4 },
      { assetId: rock, x: 8, z: 8, scale: 1, yaw: 2.1 },
    );
  }
  if (apply) {
    store.saveDraft(state.draft, state.version);
    store.publish(store.config().version);
  }
  writeFileSync('assets/media/import-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(
    `Imported ${report.length} media assets. ${apply ? 'Published missing default bindings; existing choices preserved.' : 'Library only; pass --apply to bind missing defaults and publish.'}`,
  );
} finally {
  store.close();
}
