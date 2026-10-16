import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { loadLocalEnvironment } from '../server/local-environment';
import { importAsset, inspectGLB } from '../server/assets';
import { syncManagedAsset } from '../server/asset-service';
import { installModelPresentation, type ModelPresentationUpdate } from '../server/model-presentation';
import { compactGLB } from './compact-glb';
loadLocalEnvironment();
const pack = JSON.parse(readFileSync('assets/riot/model-presentation.json', 'utf8')) as {
  heroes: {
    hero: string;
    champion: string;
    modelId: number;
    sourceFile: string;
    report: string;
    hiddenMaterials: string[];
    showcaseYaw?: ModelPresentationUpdate['showcaseYaw'];
    clips: ModelPresentationUpdate['clips'];
  }[];
};
const provenance = JSON.parse(readFileSync('assets/riot/manifest.json', 'utf8'));
const store = new GameDatabase(
  resolve(process.env.KORA_DATA_DIR || '.data'),
  process.env.KORA_ADMIN_PASSWORD,
);
const cache = join(store.directory, 'source-assets'),
  updates: ModelPresentationUpdate[] = [],
  reportFile = 'assets/riot/model-presentation-report.json',
  records: { hero: string; [key: string]: unknown }[] = existsSync(reportFile)
    ? JSON.parse(readFileSync(reportFile, 'utf8'))
    : [];
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
mkdirSync(cache, { recursive: true });
try {
  for (const entry of pack.heroes) {
    const report = JSON.parse(readFileSync(entry.report, 'utf8')).find(
      (r: { hero: string }) => r.hero === entry.hero,
    );
    const bindings = [
      store.config().published.models[entry.hero],
      store.config().draft.models[entry.hero],
    ].filter(
      (binding) =>
        binding && !binding.animationAssetId && store.asset(binding.assetId)?.sha256 === report.sha256,
    );
    if (!bindings.length) continue;
    const source = join(cache, entry.sourceFile),
      url = `https://cdn.modelviewer.lol/lol/models/${entry.champion}/${entry.modelId}/model.glb`;
    if (!existsSync(source)) {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw Error('Model download failed.');
      writeFileSync(source, Buffer.from(await response.arrayBuffer()));
    }
    const original = readFileSync(source);
    if (sha(original) !== report.sourceSha256) throw Error('Source checksum changed; review required.');
    const names = inspectGLB(original).clips,
      keep = [
        ...new Set([...bindings.flatMap((b) => Object.values(b.clips)), ...entry.clips.map((c) => c.to)]),
      ];
    if (keep.some((name) => !names.includes(name)))
      throw Error('Configured clip is absent in source; preserve admin binding and review.');
    const bytes = compactGLB(original, keep),
      hash = sha(bytes);
    const asset =
      store.assets().find((a) => a.sha256 === hash) ||
      importAsset(store, bytes, {
        name: `Khada · ${entry.champion} · presentation`,
        author: provenance.author,
        license: provenance.license,
        sourceUrl: `https://modelviewer.lol/model-viewer?id=${entry.modelId}`,
        rightsConfirmed: true,
      });
    await syncManagedAsset(store, asset.id);
    updates.push({
      hero: entry.hero,
      expectedSha256: report.sha256,
      assetId: asset.id,
      hiddenMaterials: entry.hiddenMaterials,
      showcaseYaw: entry.showcaseYaw,
      clips: entry.clips,
    });
    const record = {
      hero: entry.hero,
      sha256: hash,
      bytes: bytes.length,
      hiddenMaterials: entry.hiddenMaterials,
      ...(entry.showcaseYaw ? { showcaseYaw: entry.showcaseYaw.to } : {}),
      ...inspectGLB(bytes),
    };
    const index = records.findIndex((record) => record.hero === entry.hero);
    if (index < 0) records.push(record);
    else records[index] = record;
  }
  const result = installModelPresentation(store, updates);
  if (records.length) writeFileSync(reportFile, JSON.stringify(records, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  store.close();
}
