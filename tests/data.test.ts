import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGameData } from '../src/data/validate.ts';
import { ABILITIES } from '../src/data/abilities.ts';
import { HEROES } from '../src/data/heroes.ts';
import { CHAPTER_ONE } from '../src/data/story.ts';

test('all ten original heroes have valid reusable ability definitions',()=>{
  assert.doesNotThrow(validateGameData);
  assert.deepEqual(Object.keys(ABILITIES).sort(),HEROES.map(hero=>hero.id).sort());
});
test('invalid ability data is detected before the renderer boots',()=>{
  const old=ABILITIES.solan.effects[0].amount;
  try { ABILITIES.solan.effects[0].amount=NaN;assert.throws(validateGameData,/kỹ năng/); }
  finally { ABILITIES.solan.effects[0].amount=old; }
});
test('original Aetherfall lore remains separate from combat rules',()=>{
  assert.equal(CHAPTER_ONE.mission,'Thung lũng Khởi Nguyên');
  assert.ok(CHAPTER_ONE.paragraphs.join(' ').includes('Elyndra'));
  assert.ok(CHAPTER_ONE.paragraphs.join(' ').includes('lõi Aether'));
});
