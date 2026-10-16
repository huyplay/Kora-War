import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultUnitFeedback } from '../src/data/unit-feedback';
import { validateContent } from '../src/data/content';
import type { GameDatabase } from './database';
export function installUnitFeedback(store: GameDatabase) {
  const state = store.config();
  if (state.published.vfx.feedback) return { changed: false, revision: state.revision, backup: undefined };
  const live = structuredClone(state.published),
    draft = structuredClone(state.draft);
  live.vfx.feedback = defaultUnitFeedback();
  draft.vfx.feedback ??= defaultUnitFeedback();
  validateContent(live);
  validateContent(draft);
  mkdirSync(join(store.directory, 'backups'), { recursive: true });
  const backup = join(
    store.directory,
    'backups',
    `before-unit-feedback-${Date.now()}-${randomUUID().slice(0, 8)}.sqlite`,
  );
  store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  return store.transaction(() => {
    const saved = store.saveDraft(live, state.version),
      published = store.publish(saved.version);
    if (JSON.stringify(draft) !== JSON.stringify(live)) store.saveDraft(draft, published.version);
    store.audit('unit.feedback.install', { revision: published.revision, backup });
    return { changed: true, revision: published.revision, backup };
  });
}
