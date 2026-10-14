import { Battle } from './Battle';
import type { Difficulty } from './types';
import type { ContentConfig } from '../data/content';
import { ENEMY_CARD_DECK, validateCardDeck } from '../data/card-decks';
import { isSpell } from '../data/spells';
export function cycleBattle(
  cards: string[],
  content: ContentConfig,
  seed: number,
  enemyCards = ENEMY_CARD_DECK,
  difficulty: Difficulty = 'normal',
) {
  validateCardDeck(cards);
  validateCardDeck(enemyCards);
  return new Battle(
    cards.filter((id) => !isSpell(id)),
    difficulty,
    seed,
    enemyCards.filter((id) => !isSpell(id)),
    content,
    {},
    {
      spells: [cards.filter(isSpell), enemyCards.filter(isSpell)],
      cardDecks: [cards, enemyCards],
    },
  );
}
