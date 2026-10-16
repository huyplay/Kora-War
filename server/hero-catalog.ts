import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { GameDatabase } from './database';
import { validateContent, type ContentConfig, type ModelBinding } from '../src/data/content';
import type { Hero } from '../src/data/types';
import type { AbilityDefinition } from '../src/data/abilities';

export interface HeroAddition {
  hero: Hero;
  ability: AbilityDefinition;
  model?: ModelBinding;
  item?: ContentConfig['items'][number];
}

/** Explicit, additive publication. Existing IDs and admin draft edits always retain ownership. */
export function installHeroCatalog(store: GameDatabase, additions: HeroAddition[]) {
  const state = store.config(),
    published = structuredClone(state.published),
    draft = structuredClone(state.draft);
  if (new Set(additions.map((a) => a.hero.id)).size !== additions.length)
    throw new Error('Trùng ID trong gói tướng.');
  const added: string[] = [];
  for (const addition of additions) {
    const id = addition.hero.id;
    if (published.heroes.some((h) => h.id === id)) continue;
    if (draft.heroes.some((h) => h.id === id))
      throw new Error(`CONFLICT: Tướng ${id} đã có trong bản nháp. Hãy xử lý trước khi cài gói.`);
    for (const content of [published, draft]) {
      content.heroes.push(structuredClone(addition.hero));
      content.abilities[id] = structuredClone(addition.ability);
      if (addition.model) content.models[id] = structuredClone(addition.model);
      if (addition.item) {
        if (addition.item.heroId !== id || content.items.some((item) => item.id === addition.item!.id))
          throw new Error(`CONFLICT: Vật phẩm ${addition.item.id}.`);
        content.items.push(structuredClone(addition.item));
      }
    }
    added.push(id);
  }
  if (!added.length) return { added, revision: state.revision, backup: undefined };
  validateContent(published);
  validateContent(draft);
  mkdirSync(join(store.directory, 'backups'), { recursive: true });
  const backup = join(
    store.directory,
    'backups',
    `before-heroes-${Date.now()}-${randomUUID().slice(0, 8)}.sqlite`,
  );
  store.db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  return store.transaction(() => {
    const saved = store.saveDraft(published, state.version);
    const live = store.publish(saved.version);
    if (JSON.stringify(draft) !== JSON.stringify(published)) store.saveDraft(draft, live.version);
    store.audit('heroes.install', { added, revision: live.revision, backup });
    return { added, revision: live.revision, backup };
  });
}
