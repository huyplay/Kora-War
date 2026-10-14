import { HAND_SIZE, MAX_MULLIGAN, validateCardDeck } from '../data/card-decks';
import { isSpell } from '../data/spells';
export interface HandCard {
  id: string;
  uid: number;
}
export interface DrawInfo {
  remaining: number;
  discarded: number;
  cycle: number;
}

/** Physical cards: hand + draw pile + discard always contains exactly the original 14 cards. */
export class DrawDeck {
  readonly hand: HandCard[] = [];
  readonly pile: string[];
  readonly discard: string[] = [];
  private nextUid = 1;
  cycle = 1;
  confirmed = false;
  constructor(
    cards: string[],
    private random: () => number,
  ) {
    validateCardDeck(cards);
    this.pile = cards.slice();
    this.shuffle(this.pile);
    // A single seeded shuffle, followed by minimal swaps to satisfy the opening composition.
    const opening = this.pile.splice(0, HAND_SIZE);
    while (opening.filter((id) => !isSpell(id)).length < 4) this.swapOpening(opening, false);
    if (!opening.some(isSpell)) this.swapOpening(opening, true);
    this.hand.push(...opening.map((id) => this.card(id)));
  }
  private swapOpening(opening: string[], wantSpell: boolean) {
    const from = this.pile.findIndex((id) => isSpell(id) === wantSpell);
    const to =
      opening.length -
      1 -
      opening
        .slice()
        .reverse()
        .findIndex((id) => isSpell(id) !== wantSpell);
    [opening[to], this.pile[from]] = [this.pile[from], opening[to]];
  }
  private shuffle(cards: string[]) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
  private card(id: string): HandCard {
    return { id, uid: this.nextUid++ };
  }
  held(id: string, uid?: number) {
    return this.hand.find((card) => card.id === id && (uid === undefined || card.uid === uid));
  }
  use(id: string, uid?: number) {
    const index = this.hand.findIndex((card) => card.id === id && (uid === undefined || card.uid === uid));
    if (index < 0) return false;
    this.discard.push(this.hand[index].id);
    if (!this.pile.length) {
      this.pile.push(...this.discard.splice(0));
      this.shuffle(this.pile);
      this.cycle++;
    }
    this.hand[index] = this.card(this.pile.shift()!);
    return true;
  }
  mulligan(uids: number[]): string | null {
    if (this.confirmed) return 'Đã chốt bài đầu trận.';
    if (
      !Array.isArray(uids) ||
      uids.length > MAX_MULLIGAN ||
      new Set(uids).size !== uids.length ||
      uids.some((uid) => !Number.isSafeInteger(uid) || !this.hand.some((card) => card.uid === uid))
    )
      return 'Chỉ được đổi tối đa 2 thẻ đang cầm.';
    const indexes = this.hand.flatMap((card, i) => (uids.includes(card.uid) ? [i] : []));
    const kept = this.hand.filter((card) => !uids.includes(card.uid)).map((card) => card.id);
    const pile = this.pile.slice(),
      replacements: string[] = [];
    for (let i = 0; i < indexes.length; i++) {
      const slots = indexes.length - i;
      const heroesNeeded = Math.max(0, 4 - kept.filter((id) => !isSpell(id)).length);
      const spellsNeeded = kept.some(isSpell) ? 0 : 1;
      const pick = pile.findIndex((id) =>
        heroesNeeded >= slots ? !isSpell(id) : spellsNeeded >= slots ? isSpell(id) : true,
      );
      if (pick < 0) return 'Không thể đổi các thẻ này mà giữ đủ tướng và phép.';
      const id = pile.splice(pick, 1)[0];
      replacements.push(id);
      kept.push(id);
    }
    const returned = indexes.map((index) => this.hand[index].id);
    indexes.forEach((index, i) => (this.hand[index] = this.card(replacements[i])));
    this.pile.splice(0, this.pile.length, ...pile, ...returned);
    this.confirmed = true;
    return null;
  }
  info(): DrawInfo {
    return { remaining: this.pile.length, discarded: this.discard.length, cycle: this.cycle };
  }
}
