import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultCombatPresentation } from '../src/data/combat-presentation';
import { validateContent } from '../src/data/content';
import type { GameDatabase } from './database';
export function installCombatPresentation(store: GameDatabase) {
  const state = store.config();
  if (state.published.vfx.combat) return { changed: false, revision: state.revision, backup: undefined };
  const live = structuredClone(state.published),
    draft = structuredClone(state.draft);
  live.vfx.combat = defaultCombatPresentation(live.heroes);
  draft.vfx.combat ??= defaultCombatPresentation(draft.heroes);
  validateContent(live);
  validateContent(draft);
  mkdirSync(join(store.directory, 'backups'), { recursive: true });
  const backup = join(
    store.directory,
    'backups',
    `before-combat-vfx-${Date.now()}-${randomUUID().slice(0, 8)}.sqlite`,
  );
  store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  return store.transaction(() => {
    const saved = store.saveDraft(live, state.version),
      published = store.publish(saved.version);
    if (JSON.stringify(draft) !== JSON.stringify(live)) store.saveDraft(draft, published.version);
    store.audit('combat.presentation.install', { revision: published.revision, backup });
    return { changed: true, revision: published.revision, backup };
  });
}
