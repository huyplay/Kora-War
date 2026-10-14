import { HEROES, HERO_MAP } from './heroes';
import { SPELLS, isSpell } from './spells';
import { COMPAT_GAMEPLAY, deckError, type GameplayConfig } from './gameplay';

export const CARD_DECK_SIZE = 14;
export const HAND_SIZE = 6;
export const MAX_MULLIGAN = 2;
export const DEFAULT_CARD_DECK = [...HEROES.map((hero) => hero.id), 'wind', 'fire', 'lightning', 'ice'];
export const ENEMY_CARD_DECK = [
  'kael',
  'nyx',
  'vesper',
  'mira',
  'raiko',
  'orin',
  'solan',
  'lyra',
  'wind',
  'fire',
  'ice',
  'heal',
  'shield',
  'weaken',
];
export function cardDeckError(value: unknown, config?: GameplayConfig): string | null {
  if (config) return deckError(value, config);
  if (!Array.isArray(value) || value.length !== CARD_DECK_SIZE) return 'Deck cần đúng 14 thẻ.';
  if (new Set(value).size !== value.length) return 'Mỗi thẻ chỉ được có 1 bản trong deck.';
  if (
    value.some((id) => typeof id !== 'string' || (!Object.hasOwn(HERO_MAP, id) && !Object.hasOwn(SPELLS, id)))
  )
    return 'Deck chứa thẻ không hợp lệ.';
  if (value.filter((id) => !isSpell(id)).length < 4 || !value.some(isSpell))
    return 'Deck cần ít nhất 4 tướng và 1 phép.';
  return null;
}
export function validateCardDeck(
  value: unknown,
  config: GameplayConfig = COMPAT_GAMEPLAY,
): asserts value is string[] {
  const error = cardDeckError(value, config);
  if (error) throw new Error(error);
}
