import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { GameDatabase } from './database';
import { validateContent, type ModelBinding } from '../src/data/content';

export interface ModelPresentationUpdate {
  hero: string;
  expectedSha256: string;
  assetId: string;
  hiddenMaterials: string[];
  showcaseYaw?: { from: number; to: number };
  clips: { state: keyof ModelBinding['clips']; from: string; to: string }[];
}
/** Opt-in presentation update. Respect custom assets, per-state clips and explicit visibility choices. */
export function installModelPresentation(store: GameDatabase, updates: ModelPresentationUpdate[]) {
  const state = store.config(),
    live = structuredClone(state.published),
    draft = structuredClone(state.draft);
  const changed = new Set<string>();
  for (const content of [live, draft])
    for (const update of updates) {
      const binding = content.models[update.hero];
      if (!binding || binding.animationAssetId) continue;
      const old = store.asset(binding.assetId),
        next = store.asset(update.assetId);
      if (!next) throw Error('Missing presentation asset.');
      if (old?.sha256 !== update.expectedSha256 && binding.assetId !== update.assetId) continue;
      const before = JSON.stringify(binding);
      binding.assetId = update.assetId;
      binding.hiddenMaterials ??= update.hiddenMaterials.slice();
      if (
        update.showcaseYaw &&
        binding.showcaseYaw === undefined &&
        binding.portraitYaw === update.showcaseYaw.from
      )
        binding.showcaseYaw = update.showcaseYaw.to;
      for (const clip of update.clips)
        if (binding.clips[clip.state] === clip.from) binding.clips[clip.state] = clip.to;
      if (JSON.stringify(binding) !== before) changed.add(update.hero);
    }
  if (!changed.size) return { changed: [], revision: state.revision, backup: undefined };
  validateContent(live);
  validateContent(draft);
  mkdirSync(join(store.directory, 'backups'), { recursive: true });
  const backup = join(
    store.directory,
    'backups',
    `before-model-presentation-${Date.now()}-${randomUUID().slice(0, 8)}.sqlite`,
  );
  store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  return store.transaction(() => {
    const saved = store.saveDraft(live, state.version),
      published = store.publish(saved.version);
    if (JSON.stringify(live) !== JSON.stringify(draft)) store.saveDraft(draft, published.version);
    store.audit('models.presentation.install', {
      heroes: [...changed],
      revision: published.revision,
      backup,
    });
    return { changed: [...changed], revision: published.revision, backup };
  });
}
