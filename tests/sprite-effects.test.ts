import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SpriteEffects } from '../src/rendering/vfx/sprite-effects';
import { defaultContent } from '../src/data/content';

test('sprite loading ignores stale revisions and disposes late textures after scene teardown', async () => {
  const previousDocument = globalThis.document;
  const previousLoad = THREE.TextureLoader.prototype.loadAsync;
  const pending = new Map<string, (texture: THREE.Texture) => void>();
  const gradient = { addColorStop() {} };
  const context = {
    createRadialGradient: () => gradient,
    fillRect() {},
    beginPath() {},
    arc() {},
    stroke() {},
  };
  globalThis.document = {
    createElement: () => ({ width: 1024, height: 128, getContext: () => context }),
  } as unknown as Document;
  THREE.TextureLoader.prototype.loadAsync = (url) => new Promise((resolve) => pending.set(url, resolve));
  const sprites = new SpriteEffects();
  try {
    const profile = defaultContent().vfx;
    profile.eventSprites = { skill: { assetId: 'old', columns: 8, rows: 1, fps: 8 } };
    sprites.configure(structuredClone(profile));
    profile.eventSprites.skill!.assetId = 'new';
    sprites.configure(structuredClone(profile));
    const oldTexture = new THREE.Texture();
    oldTexture.image = { width: 1024, height: 128, marker: 'old' };
    let oldDisposed = false;
    oldTexture.addEventListener('dispose', () => {
      oldDisposed = true;
    });
    pending.get('/api/assets/old')!(oldTexture);
    const newTexture = new THREE.Texture();
    newTexture.image = { width: 1024, height: 128, marker: 'new' };
    pending.get('/api/assets/new')!(newTexture);
    await Promise.resolve();
    assert.equal(oldDisposed, true);
    sprites.emit({ type: 'skill', x: 0, side: 0, lane: 1, heroId: 'solan' } as Parameters<
      SpriteEffects['emit']
    >[0]);
    sprites.update(0.1);
    assert.equal(sprites.activeCount, 1);
    const visible = sprites.root.children.find((child) => child.visible) as THREE.Sprite;
    assert.equal(visible.material.map!.image.marker, 'new');
    profile.eventSprites.skill!.assetId = 'late';
    sprites.configure(profile);
    assert.equal(sprites.activeCount, 0);
    sprites.dispose();
    const late = new THREE.Texture();
    late.image = { width: 1024, height: 128 };
    let lateDisposed = false;
    late.addEventListener('dispose', () => {
      lateDisposed = true;
    });
    pending.get('/api/assets/late')!(late);
    await Promise.resolve();
    assert.equal(lateDisposed, true);
    assert.equal(sprites.root.children.length, 0);
  } finally {
    sprites.dispose();
    globalThis.document = previousDocument;
    THREE.TextureLoader.prototype.loadAsync = previousLoad;
  }
});
