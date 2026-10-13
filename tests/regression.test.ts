import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Battle } from '../src/core/index.ts';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/three-baseline.json', import.meta.url), 'utf8'));
test('refactored simulation matches the original Three.js prototype at every recorded checkpoint', () => {
  for (const fixture of baseline.fixtures) {
    const battle = new Battle(undefined, 'normal', fixture.seed);
    battle.start();
    for (const checkpoint of fixture.checkpoints) {
      while (battle.tick < checkpoint.tick && battle.phase === 'playing') {
        if (battle.tick % 25 === 0) battle.ai(0);
        battle.step();
      }
      const actual = createHash('sha256').update(JSON.stringify(battle.snapshot())).digest('hex');
      assert.equal(actual, checkpoint.hash, `seed ${fixture.seed}, tick ${checkpoint.tick}`);
    }
  }
});
