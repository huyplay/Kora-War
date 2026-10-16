import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionState } from '../src/ui/collection-state';
import type { Wallet } from '../src/services/game-session';

const collection = { initialGold: 100, maxLevel: 5, copiesPerLevel: 7, chestDraws: 2 };
const wallet = (gold: number, level: number, copies: number): Wallet => ({
  player: 'qa',
  gold,
  cards: [{ hero: 'solan', level, copies }],
  ledger: [],
});
test('collection upgrade follows published costs and exact resource boundary', () => {
  const w = wallet(66, 3, 21),
    original = structuredClone(w);
  const p = collectionState('solan', w, collection, 22);
  assert.deepEqual([p.cost, p.need, p.canUpgrade, p.progress], [66, 21, true, 1]);
  assert.equal(collectionState('solan', wallet(65, 3, 21), collection, 22).canUpgrade, false);
  assert.equal(collectionState('solan', wallet(66, 3, 20), collection, 22).canUpgrade, false);
  assert.deepEqual(w, original);
});
test('collection max level, absent cards and offline wallets cannot upgrade', () => {
  assert.equal(collectionState('solan', wallet(999, 5, 99), collection, 22).max, true);
  assert.equal(collectionState('solan', wallet(999, 5, 99), collection, 22).canUpgrade, false);
  assert.equal(collectionState('wind', wallet(999, 1, 99), collection, 22).canUpgrade, false);
  assert.equal(collectionState('solan', undefined, collection, 22).canUpgrade, false);
});
