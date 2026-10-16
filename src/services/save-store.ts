import type { Difficulty } from '../core/types';
import { DEFAULT_DECK, HEROES, type Hero } from '../data/index';
import { DEFAULT_SPELLS, isSpell, type SpellId } from '../data/spells';
import { cardDeckError } from '../data/card-decks';
import type { GameplayConfig } from '../data/gameplay';
export interface SaveData {
  cards?: string[];
  deck: string[];
  spells: SpellId[];
  difficulty: Difficulty;
  wins: number;
  sound: boolean;
  quality: 'high' | 'low';
}
const KEY = 'kora-war-save';
const LEGACY_KEY = 'aetherfall-save';
export function parseSave(
  raw: string | null,
  gameplay?: GameplayConfig,
  heroes: readonly Hero[] = HEROES,
): SaveData {
  let value: Partial<SaveData> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) value = parsed as Partial<SaveData>;
  } catch {
    /* Invalid or old saves fall back to the original starting deck. */
  }
  return {
    ...(cardDeckError(value.cards, gameplay, heroes) === null ? { cards: value.cards!.slice() } : {}),
    spells:
      Array.isArray(value.spells) &&
      value.spells.length === 2 &&
      new Set(value.spells).size === 2 &&
      value.spells.every((id) => typeof id === 'string' && isSpell(id))
        ? value.spells.slice()
        : DEFAULT_SPELLS.slice(),
    deck:
      Array.isArray(value.deck) &&
      value.deck.length === 4 &&
      new Set(value.deck).size === 4 &&
      value.deck.every((id) => typeof id === 'string' && heroes.some((h) => h.id === id))
        ? value.deck.slice()
        : DEFAULT_DECK.slice(),
    difficulty: value.difficulty === 'story' || value.difficulty === 'hard' ? value.difficulty : 'normal',
    wins:
      typeof value.wins === 'number' && Number.isSafeInteger(value.wins) && value.wins >= 0 ? value.wins : 0,
    sound: value.sound !== false,
    quality: value.quality === 'low' ? 'low' : 'high',
  };
}
export function loadSave(
  storage: Pick<Storage, 'getItem'>,
  gameplay?: GameplayConfig,
  heroes: readonly Hero[] = HEROES,
): SaveData {
  try {
    return parseSave(storage.getItem(KEY) ?? storage.getItem(LEGACY_KEY), gameplay, heroes);
  } catch {
    return parseSave(null, gameplay, heroes);
  }
}
export function saveGame(storage: Pick<Storage, 'setItem'>, data: SaveData): void {
  try {
    storage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* The game also works without storage. */
  }
}
