import { HEROES } from '../heroes';
import { isSpell } from '../spells';
import type { GameplayConfig } from './types';

export function deckError(value: unknown, config: GameplayConfig): string | null {
  const d = config.deck;
  if (!Array.isArray(value) || value.length !== d.size) return `Deck cần đúng ${d.size} thẻ.`;
  const counts = new Map<string, number>();
  for (const id of value) {
    if (typeof id !== 'string' || (!HEROES.some((h) => h.id === id) && !isSpell(id)))
      return 'Deck chứa thẻ không hợp lệ.';
    if (isSpell(id) && !config.spells[id].enabled) return `Phép ${config.spells[id].name} đã bị tắt.`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (counts.get(id)! > d.maxCopies) return `Mỗi thẻ chỉ được có ${d.maxCopies} bản trong deck.`;
  }
  if (value.filter((id) => !isSpell(id)).length < d.minHeroes || value.filter(isSpell).length < d.minSpells)
    return `Deck cần ít nhất ${d.minHeroes} tướng và ${d.minSpells} phép.`;
  return null;
}
export function fitDeck(saved: string[] | undefined, g: GameplayConfig): string[] {
  if (!deckError(saved, g)) return saved!.slice();
  // A changed admin ruleset invalidates old loadouts; use the validated published starter deck.
  return g.deck.defaultCards.slice();
}
