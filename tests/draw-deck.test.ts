import test from 'node:test';
import assert from 'node:assert/strict';
import { DrawDeck } from '../src/core/draw-deck';
import { DEFAULT_CARD_DECK, cardDeckError } from '../src/data/card-decks';
import { isSpell } from '../src/data/spells';
import { parseSave } from '../src/services/save-store';
function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test('14-card validation rejects duplicate, unknown, short and hostile IDs; saves retain valid decks', () => {
  assert.equal(cardDeckError(DEFAULT_CARD_DECK), null);
  assert.match(cardDeckError(DEFAULT_CARD_DECK.slice(1))!, /14/);
  assert.match(cardDeckError([...DEFAULT_CARD_DECK.slice(1), DEFAULT_CARD_DECK[1]])!, /1 bản/);
  assert.match(cardDeckError([...DEFAULT_CARD_DECK.slice(1), 'toString'])!, /không hợp lệ/);
  assert.deepEqual(parseSave(JSON.stringify({ cards: DEFAULT_CARD_DECK })).cards, DEFAULT_CARD_DECK);
  assert.equal(parseSave('{"cards":["solan"]}').cards, undefined);
});
test('opening hands always contain 6 unique physical cards, at least 4 heroes and 1 spell over 1000 seeds', () => {
  const variants = [
    DEFAULT_CARD_DECK,
    [
      ...DEFAULT_CARD_DECK.slice(0, 6),
      'wind',
      'fire',
      'lightning',
      'ice',
      'heal',
      'shield',
      'weaken',
      'haste',
    ],
  ];
  for (let seed = 1; seed <= 1000; seed++)
    for (const cards of variants) {
      const deck = new DrawDeck(cards, rng(seed));
      assert.equal(deck.hand.length, 6);
      assert.equal(deck.pile.length, 8);
      assert.equal(new Set(deck.hand.map((card) => card.id)).size, 6);
      assert.ok(deck.hand.filter((card) => !isSpell(card.id)).length >= 4);
      assert.ok(deck.hand.some((card) => isSpell(card.id)));
    }
});
test('each use draws the next card without reshuffling; only the discard pile is recycled', () => {
  let calls = 0;
  const random = rng(11);
  const deck = new DrawDeck(DEFAULT_CARD_DECK, () => {
    calls++;
    return random();
  });
  const initialCalls = calls,
    expected = deck.pile.slice();
  for (let i = 0; i < 8; i++) {
    const played = deck.hand[0];
    assert.equal(deck.use(played.id, played.uid), true);
    assert.equal(deck.hand[0].id, expected[i]);
    assert.equal(calls, initialCalls);
  }
  const held = deck.hand.slice(1).map((card) => card.id);
  deck.use(deck.hand[0].id, deck.hand[0].uid);
  assert.equal(deck.cycle, 2);
  assert.ok(calls > initialCalls);
  assert.ok(deck.pile.every((id) => !held.includes(id)));
  for (let i = 0; i < 500; i++) {
    const played = deck.hand[i % 6];
    deck.use(played.id, played.uid);
    assert.deepEqual(
      [...deck.hand.map((card) => card.id), ...deck.pile, ...deck.discard].sort(),
      DEFAULT_CARD_DECK.slice().sort(),
    );
    assert.equal(new Set(deck.hand.map((card) => card.id)).size, 6);
  }
});
test('mulligan changes only selected slots, cannot redraw returned cards, preserves opening composition and is atomic', () => {
  for (let seed = 1; seed <= 250; seed++) {
    const deck = new DrawDeck(DEFAULT_CARD_DECK, rng(seed)),
      before = structuredClone(deck.hand);
    const selected = before.slice(0, 2);
    assert.equal(deck.mulligan(selected.map((card) => card.uid)), null);
    assert.deepEqual(deck.hand.slice(2), before.slice(2));
    assert.ok(deck.hand.slice(0, 2).every((card) => !selected.some((old) => old.id === card.id)));
    assert.ok(deck.hand.filter((card) => !isSpell(card.id)).length >= 4);
    assert.ok(deck.hand.some((card) => isSpell(card.id)));
    assert.match(deck.mulligan([])!, /Đã chốt/);
    assert.deepEqual(
      [...deck.hand.map((card) => card.id), ...deck.pile].sort(),
      DEFAULT_CARD_DECK.slice().sort(),
    );
  }
  const deck = new DrawDeck(DEFAULT_CARD_DECK, rng(2)),
    before = JSON.stringify(deck);
  assert.match(deck.mulligan(deck.hand.slice(0, 3).map((card) => card.uid))!, /2 thẻ/);
  assert.equal(JSON.stringify(deck), before);
  assert.equal(deck.use('solan', -999), false);
  assert.equal(JSON.stringify(deck), before);
});
