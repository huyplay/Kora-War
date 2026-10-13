import type { Difficulty } from '../core/types';
import { DEFAULT_DECK, HERO_MAP } from '../data/index';
export interface SaveData {
    deck: string[];
    difficulty: Difficulty;
    wins: number;
    sound: boolean;
    quality: 'high' | 'low';
}
const KEY = 'aetherfall-save';
export function parseSave(raw: string | null): SaveData {
    let value: Partial<SaveData> = {};
    try {
        const parsed: unknown = JSON.parse(raw ?? '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
            value = parsed as Partial<SaveData>;
    }
    catch { /* Invalid or old saves fall back to the original starting deck. */ }
    return {
        deck: Array.isArray(value.deck) && value.deck.length === 4 && new Set(value.deck).size === 4 && value.deck.every(id => typeof id === 'string' && Object.hasOwn(HERO_MAP, id)) ? value.deck.slice() : DEFAULT_DECK.slice(),
        difficulty: value.difficulty === 'story' || value.difficulty === 'hard' ? value.difficulty : 'normal',
        wins: typeof value.wins === 'number' && Number.isSafeInteger(value.wins) && value.wins >= 0 ? value.wins : 0,
        sound: value.sound !== false,
        quality: value.quality === 'low' ? 'low' : 'high',
    };
}
export function loadSave(storage: Pick<Storage, 'getItem'>): SaveData {
    try {
        return parseSave(storage.getItem(KEY));
    }
    catch {
        return parseSave(null);
    }
}
export function saveGame(storage: Pick<Storage, 'setItem'>, data: SaveData): void {
    try {
        storage.setItem(KEY, JSON.stringify(data));
    }
    catch { /* The game also works without storage. */ }
}
