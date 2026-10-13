import { Battle } from './Battle';
import type { ContentConfig } from '../data/content';
import { DEFAULT_SPELLS, type SpellId } from '../data/spells';
import type { Difficulty } from './types';
/** The legacy constructor remains available to replay the original golden fixtures. */
export function tacticalBattle(
  deck: string[],
  spells: SpellId[],
  content: ContentConfig,
  seed: number,
  enemyDeck?: string[],
  enemySpells: SpellId[] = DEFAULT_SPELLS,
  difficulty: Difficulty = 'normal',
) {
  return new Battle(deck, difficulty, seed, enemyDeck, content, {}, { spells: [spells, enemySpells] });
}
