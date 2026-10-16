import { Battle } from './Battle';
import type { Difficulty } from './types';
import type { ContentConfig } from '../data/content';
import { validateCardDeck } from '../data/card-decks';
import { isSpell } from '../data/spells';
import { gameplayOf } from '../data/gameplay';
export function cycleBattle(
  cards: string[],
  content: ContentConfig,
  seed: number,
  enemyCards = gameplayOf(content).deck.aiCards,
  difficulty: Difficulty = 'normal',
) {
  validateCardDeck(cards, gameplayOf(content), content.heroes);
  validateCardDeck(enemyCards, gameplayOf(content), content.heroes);
  return new Battle(
    [...new Set(cards.filter((id) => !isSpell(id)))],
    difficulty,
    seed,
    [...new Set(enemyCards.filter((id) => !isSpell(id)))],
    content,
    {},
    {
      spells: [cards.filter(isSpell), enemyCards.filter(isSpell)],
      cardDecks: [cards, enemyCards],
    },
  );
}
