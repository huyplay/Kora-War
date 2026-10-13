import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultContent, validateContent, assetReferences } from '../src/data/content';

test('PBR arena textures validate all channels and retain their asset references for archive protection', () => {
  const content = defaultContent();
  content.map.textures = {
    stone: {
      assetId: 'floor',
      normalAssetId: 'floor-normal',
      roughnessAssetId: 'floor-rough',
      repeat: 0.8,
      tint: '#ffffff',
    },
    wall: { assetId: 'wall', repeat: 1, tint: '#999999' },
  };
  validateContent(content);
  for (const id of ['floor', 'floor-normal', 'floor-rough', 'wall'])
    assert.ok(assetReferences(content).includes(id));
  content.map.textures.stone!.normalAssetId = '../../private';
  assert.throws(() => validateContent(content), /Texture/);
  content.map.textures.stone!.normalAssetId = 'normal';
  content.map.textures.stone!.roughnessAssetId = 'https://example.com/rough.jpg';
  assert.throws(() => validateContent(content), /Texture/);
});

test('spell atlases validate known spells and preserve referenced image assets', () => {
  const content = defaultContent();
  content.vfx.spellSprites = { ice: { assetId: 'frost', columns: 8, rows: 1, fps: 8 } };
  validateContent(content);
  assert.ok(assetReferences(content).includes('frost'));
  content.vfx.spellSprites.ice!.columns = 0;
  assert.throws(() => validateContent(content), /VFX/);
  content.vfx.spellSprites.ice!.columns = 8;
  Object.assign(content.vfx.spellSprites, { unknown: content.vfx.spellSprites.ice });
  assert.throws(() => validateContent(content), /VFX spell/);
});
