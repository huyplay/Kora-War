import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { GameDatabase } from './database';
import { validateContent, type ContentConfig } from '../src/data/content';
import { validateModelAnimation, type ModelAnimationTiming } from '../src/data/model-animation';

export interface ModelAnimationUpdate {
  hero: string;
  expectedSha256: string;
  clips: { attack: string; cast: string };
  animation: ModelAnimationTiming;
}
/** Provision only verified models with untouched timings; preserve all explicit admin choices. */
export function installModelAnimation(store: GameDatabase, updates: ModelAnimationUpdate[]) {
  for (const update of updates) validateModelAnimation(update.animation);
  const state = store.config(),
    live = structuredClone(state.published),
    draft = structuredClone(state.draft);
  const changed = new Set<string>();
  const apply = (content: ContentConfig) => {
    let modified = false;
    for (const update of updates) {
      const binding = content.models[update.hero];
      if (
        !binding ||
        binding.animation !== undefined ||
        binding.animationAssetId ||
        store.asset(binding.assetId)?.sha256 !== update.expectedSha256 ||
        binding.clips.attack !== update.clips.attack ||
        binding.clips.cast !== update.clips.cast
      )
        continue;
      binding.animation = { ...update.animation };
      modified = true;
      changed.add(update.hero);
    }
    return modified;
  };
  const liveChanged = apply(live),
    draftChanged = apply(draft);
  if (!liveChanged && !draftChanged) return { changed: [], revision: state.revision, backup: undefined };
  validateContent(live);
  validateContent(draft);
  mkdirSync(join(store.directory, 'backups'), { recursive: true });
  const backup = join(
    store.directory,
    'backups',
    `before-model-animation-${Date.now()}-${randomUUID().slice(0, 8)}.sqlite`,
  );
  store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  return store.transaction(() => {
    let version = state.version,
      revision = state.revision;
    if (liveChanged) {
      const saved = store.saveDraft(live, version),
        published = store.publish(saved.version);
      version = published.version;
      revision = published.revision;
    }
    if (!liveChanged || JSON.stringify(draft) !== JSON.stringify(live)) store.saveDraft(draft, version);
    store.audit('models.animation.install', { heroes: [...changed], revision, backup });
    return { changed: [...changed], revision, backup };
  });
}
