import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Hero } from '../src/data/types';
import type { AbilityDefinition } from '../src/data/abilities';
import type { ContentConfig } from '../src/data/content';
import { GameDatabase } from '../server/database';
import { importAsset, inspectGLB } from '../server/assets';
import { installHeroCatalog, type HeroAddition } from '../server/hero-catalog';
import { loadLocalEnvironment } from '../server/local-environment';
import { syncManagedAsset } from '../server/asset-service';
import { selectAnimationClips } from './animation-mapping';
import { compactGLB } from './compact-glb';

loadLocalEnvironment();
const packFile = 'assets/riot/elyndra-wave-1.json',
  reportFile = 'assets/riot/elyndra-wave-1-report.json';
const pack = JSON.parse(readFileSync(packFile, 'utf8')) as {
  heroes: Hero[];
  abilities: Record<string, AbilityDefinition>;
  items: ContentConfig['items'];
  models: { hero: string; champion: string; modelId: number; height: number; portraitYaw: number }[];
};
const provenance = JSON.parse(readFileSync('assets/riot/manifest.json', 'utf8'));
const directory = resolve(process.env.KORA_DATA_DIR || '.data'),
  cache = join(directory, 'source-assets');
mkdirSync(cache, { recursive: true });
const previous = existsSync(reportFile)
  ? (JSON.parse(readFileSync(reportFile, 'utf8')) as { hero: string; sourceSha256: string }[])
  : [];
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const processed: unknown[] = previous.slice(),
  additions: HeroAddition[] = [];
const store = new GameDatabase(directory, process.env.KORA_ADMIN_PASSWORD);
try {
  for (const entry of pack.models) {
    if (store.config().published.heroes.some((hero) => hero.id === entry.hero)) {
      console.log(`${entry.hero}: already published; preserving admin content.`);
      continue;
    }
    const url = `https://cdn.modelviewer.lol/lol/models/${entry.champion}/${entry.modelId}/model.glb`,
      file = join(cache, `${entry.champion}-${entry.modelId}.glb`);
    if (!existsSync(file)) {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw Error(`${entry.champion}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      inspectGLB(bytes);
      writeFileSync(file, bytes);
    }
    const original = readFileSync(file),
      expected = previous.find((row) => row.hero === entry.hero);
    if (expected && sha(original) !== expected.sourceSha256)
      throw Error(`Source changed: ${entry.champion}. Review before replacing the recorded checksum.`);
    const clips = selectAnimationClips(inspectGLB(original).clips);
    if (!clips.idle || !clips.walk || !clips.attack || !clips.cast || !clips.death)
      throw Error(`${entry.champion}: thiếu clip idle/walk/attack/cast/death.`);
    const bytes = compactGLB(original, Object.values(clips) as string[]);
    const asset =
      store.assets().find((asset) => asset.sha256 === sha(bytes)) ||
      importAsset(store, bytes, {
        name: `Khada · ${entry.champion} · mobile`,
        author: provenance.author,
        license: provenance.license,
        sourceUrl: `https://modelviewer.lol/model-viewer?id=${entry.modelId}`,
        rightsConfirmed: true,
      });
    await syncManagedAsset(store, asset.id);
    additions.push({
      hero: pack.heroes.find((hero) => hero.id === entry.hero)!,
      ability: pack.abilities[entry.hero],
      item: pack.items.find((item) => item.heroId === entry.hero),
      model: { assetId: asset.id, height: entry.height, yaw: 0, portraitYaw: entry.portraitYaw, clips },
    });
    const record = {
      hero: entry.hero,
      champion: entry.champion,
      url,
      sourceSha256: sha(original),
      sha256: sha(bytes),
      sourceBytes: original.length,
      bytes: bytes.length,
      ...inspectGLB(bytes),
    };
    const existing = processed.findIndex((row) => (row as { hero: string }).hero === entry.hero);
    if (existing >= 0) processed[existing] = record;
    else processed.push(record);
    console.log(
      `${entry.hero} ← ${entry.champion}: ${(bytes.length / 1048576).toFixed(2)} MiB; ${Object.keys(clips).join(', ')}`,
    );
  }
  const result = installHeroCatalog(store, additions);
  writeFileSync(reportFile, JSON.stringify(processed, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  store.close();
}
