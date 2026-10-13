import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { GameDatabase } from '../server/database';
import { importAsset, inspectGLB } from '../server/assets';
import { compactGLB } from './compact-glb';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync('assets/riot/manifest.json', 'utf8')) as {
  author: string;
  license: string;
  models: { hero: string; champion: string; modelId: number; height: number }[];
};
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const store = new GameDatabase(directory, process.env.KORA_ADMIN_PASSWORD);
const cache = join(directory, 'source-assets');
mkdirSync(cache, { recursive: true });
const current = store.config();
const processed: unknown[] = [];
const previousReport = existsSync('assets/riot/import-report.json')
  ? (JSON.parse(readFileSync('assets/riot/import-report.json', 'utf8')) as {
      url: string;
      sourceSha256?: string;
      sha256: string;
    }[])
  : [];
function verifySource(bytes: Buffer, url: string) {
  const expected = previousReport.find((a) => a.url === url);
  if (
    expected &&
    createHash('sha256').update(bytes).digest('hex') !== (expected.sourceSha256 || expected.sha256)
  )
    throw new Error(`Source changed: ${url}. Review the new asset before updating its recorded checksum.`);
}
try {
  // Sequential downloads avoid burdening the source and bound transient memory.
  for (const model of manifest.models) {
    const sourceUrl = `https://modelviewer.lol/model-viewer?id=${model.modelId}`;
    const url = `https://cdn.modelviewer.lol/lol/models/${model.champion}/${model.modelId}/model.glb`;
    const file = join(cache, `${model.champion}.glb`);
    if (!existsSync(file)) {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`${model.champion}: HTTP ${response.status}`);
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }
    const original = readFileSync(file);
    verifySource(original, url);
    const info = inspectGLB(original);
    const find = (patterns: RegExp[]) =>
      patterns.map((pattern) => info.clips.find((name: string) => pattern.test(name))).find(Boolean);
    const clips = Object.fromEntries(
      Object.entries({
        idle: find([/^idle1(?:_|$)/i, /^idle/i]),
        walk: find([/^run(?:_|$)/i, /^run/i, /walk/i]),
        attack: find([/^attack1(?:_|$)/i, /^attack/i]),
        cast: find([/^spell1(?:_|$)/i, /^spell/i]),
        stunned: find([/stun/i, /idle/i]),
        spawn: find([/respawn/i, /idle/i]),
        death: find([/^death/i]),
      }).filter(([, name]) => name),
    );
    const bytes = compactGLB(original, Object.values(clips) as string[]),
      hash = createHash('sha256').update(bytes).digest('hex');
    const existing = store.assets().find((a) => a.sha256 === hash);
    const asset =
      existing ||
      importAsset(store, bytes, {
        name: `Khada · ${model.champion} · mobile`,
        author: manifest.author,
        license: manifest.license,
        sourceUrl,
        rightsConfirmed: true,
      });
    current.draft.models[model.hero] = { assetId: String(asset.id), height: model.height, yaw: 0, clips };
    processed.push({
      hero: model.hero,
      champion: model.champion,
      url,
      sha256: asset.sha256,
      sourceSha256: createHash('sha256').update(original).digest('hex'),
      sourceBytes: original.length,
      bytes: bytes.length,
      ...inspectGLB(bytes),
    });
    console.log(
      `${model.hero} ← ${model.champion}: ${(original.length / 1048576).toFixed(1)} → ${(bytes.length / 1048576).toFixed(1)} MB`,
    );
  }
  for (const name of ['turret', 'nexus', 'inhibitor']) {
    const sourceUrl = `https://modelviewer.lol/model-viewer?alias=${name}&group=extras&id=0`,
      url = `https://cdn.modelviewer.lol/extras/models/${name}/0/model.glb`;
    const file = join(cache, `${name}.glb`);
    if (!existsSync(file)) {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }
    const original = readFileSync(file);
    verifySource(original, url);
    const info = inspectGLB(original),
      idle = info.clips.find((c: string) => /idle/i.test(c));
    const bytes = compactGLB(original, idle ? [idle] : []),
      hash = createHash('sha256').update(bytes).digest('hex');
    const asset =
      store.assets().find((a) => a.sha256 === hash) ||
      importAsset(store, bytes, {
        name: `Khada · ${name} · mobile`,
        author: manifest.author,
        license: manifest.license,
        sourceUrl,
        rightsConfirmed: true,
      });
    if (name === 'turret') current.draft.map.towerAssetId = String(asset.id);
    if (name === 'nexus') current.draft.map.coreAssetId = String(asset.id);
    if (name === 'inhibitor') {
      const versions = store
        .assets()
        .filter((a) => a.metadata.sourceUrl === sourceUrl)
        .map((a) => a.id);
      current.draft.map.props = current.draft.map.props.filter((p) => !versions.includes(p.assetId));
      for (const x of [-12, 12])
        current.draft.map.props.push({ assetId: String(asset.id), x, z: -8, scale: 1.5, yaw: 0 });
    }
    processed.push({
      structure: name,
      url,
      sourceSha256: createHash('sha256').update(original).digest('hex'),
      sha256: asset.sha256,
      sourceBytes: original.length,
      bytes: bytes.length,
      ...inspectGLB(bytes),
    });
    console.log(`${name}: ${(bytes.length / 1048576).toFixed(1)} MB`);
  }
  const spriteSource =
      'https://raw.communitydragon.org/latest/game/assets/shared/particles/3026_items_star.png',
    spriteFile = join(cache, 'aether-star.png');
  if (!existsSync(spriteFile)) {
    const response = await fetch(spriteSource, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Sprite: HTTP ${response.status}`);
    writeFileSync(spriteFile, Buffer.from(await response.arrayBuffer()));
  }
  const spriteBytes = readFileSync(spriteFile),
    spriteHash = createHash('sha256').update(spriteBytes).digest('hex');
  verifySource(spriteBytes, spriteSource);
  const sprite =
    store.assets().find((a) => a.sha256 === spriteHash) ||
    importAsset(store, spriteBytes, {
      name: 'Aether star · CommunityDragon',
      author: manifest.author,
      license: manifest.license,
      sourceUrl: spriteSource,
      rightsConfirmed: true,
    });
  current.draft.vfx.spriteAssetId = sprite.id;
  current.draft.vfx.spriteColumns = 1;
  current.draft.vfx.spriteRows = 1;
  processed.push({ sprite: 'aether-star', url: spriteSource, bytes: spriteBytes.length, sha256: spriteHash });
  store.saveDraft(current.draft, current.version);
  store.publish(store.config().version);
  writeFileSync('assets/riot/import-report.json', JSON.stringify(processed, null, 2) + '\n');
  console.log('Imported and published all ten character bindings.');
} finally {
  store.close();
}
