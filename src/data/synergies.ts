import { HERO_MAP } from './heroes';
import type { Hero } from './types';
export function traits(deck: string[], heroes: Readonly<Record<string, Hero>> = HERO_MAP) {
  const counts: Record<string, number> = {};
  for (const id of deck) {
    const h = heroes[id];
    if (h) {
      counts[h.origin] = (counts[h.origin] || 0) + 1;
      counts[h.role] = (counts[h.role] || 0) + 1;
    }
  }
  return counts;
}
