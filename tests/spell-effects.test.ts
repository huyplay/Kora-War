import test from 'node:test';
import assert from 'node:assert/strict';
import { SpellEffects } from '../src/rendering/vfx/spell-effects';
import { tacticalBattle } from '../src/core/tactical';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import type { SpellZone } from '../src/core/systems/spells';
import * as THREE from 'three';

function units() {
  const b = tacticalBattle(DEFAULT_DECK, ['fire', 'ice'], defaultContent(), 1, DEFAULT_DECK);
  b.start();
  b.mana = [100, 100];
  b.play(0, 'solan', 1);
  b.play(1, 'solan', 1);
  b.cooldowns[1] = {};
  b.play(1, 'solan', 0);
  b.units.forEach((unit) => (unit.x = 0));
  return b.units;
}
const fire: SpellZone = { id: 10, spellId: 'fire', side: 0, lane: 1, x: 0, starts: 0.7, ends: 3.7 };

test('status shells follow formation scale while the damaging zone keeps its gameplay radius', () => {
  const effects = new SpellEffects(),
    targets = units();
  const before = structuredClone(targets);
  try {
    effects.update([fire], targets, 1, 1, () => ({ x: 4, z: 0.4, scale: 0.3 }));
    const status = effects.root.getObjectByName(`spell-status-${targets[1].id}`)!;
    const zone = effects.root.getObjectByName('spell-zone-10')!;
    assert.deepEqual(status.scale.toArray(), [0.3, 0.3, 0.3]);
    assert.equal(status.position.x, 4);
    assert.equal(zone.position.x, fire.x);
    assert.deepEqual(zone.scale.toArray(), [1, 1, 1]);
    effects.update([fire], targets, 1, 1);
    assert.deepEqual(status.scale.toArray(), [1, 1, 1], 'fallback must not retain old packed scale');
    assert.deepEqual(targets, before);
  } finally {
    effects.dispose();
  }
});

test('spell atlas load after disposal releases its frames and cannot resurrect effects', async () => {
  const previous = THREE.TextureLoader.prototype.loadAsync;
  let resolve!: (texture: THREE.Texture) => void;
  THREE.TextureLoader.prototype.loadAsync = () =>
    new Promise((done) => {
      resolve = done;
    });
  const effects = new SpellEffects();
  try {
    const profile = defaultContent().vfx;
    profile.spellSprites = { fire: { assetId: 'flame', columns: 8, rows: 1, fps: 8 } };
    const loading = effects.configure(profile);
    effects.dispose();
    const texture = new THREE.Texture();
    texture.image = { width: 1024, height: 128 };
    let disposed = 0;
    texture.addEventListener('dispose', () => disposed++);
    resolve(texture);
    await loading;
    assert.equal(disposed, 1);
    assert.equal(effects.root.children.length, 0);
    assert.equal((effects as unknown as { atlases: Map<string, unknown> }).atlases.size, 0);
  } finally {
    THREE.TextureLoader.prototype.loadAsync = previous;
    effects.dispose();
  }
});

test('Fire shows flames only after warning and marks only enemies inside the active zone', () => {
  const effects = new SpellEffects(),
    targets = units();
  const before = structuredClone(targets);
  effects.update([fire], targets, 0.65, 1);
  const zone = effects.root.getObjectByName('spell-zone-10')!;
  assert.equal(zone.children[2].visible, false);
  assert.equal(effects.root.children.length, 1);
  effects.update([fire], targets, 0.7, 2);
  assert.equal(zone.children[2].visible, true);
  assert.equal(effects.root.getObjectByName(`spell-status-${targets[0].id}`), undefined);
  assert.equal(effects.root.getObjectByName(`spell-status-${targets[2].id}`), undefined);
  assert.equal(
    effects.root.getObjectByName(`spell-status-${targets[1].id}`)!.getObjectByName('burn')!.visible,
    true,
  );
  targets[1].x = 3;
  effects.update([fire], targets, 1, 3);
  assert.equal(effects.root.getObjectByName(`spell-status-${targets[1].id}`), undefined);
  targets[1].x = 0;
  assert.deepEqual(targets, before, 'the renderer cannot change combat state');
  effects.update([], targets, 3.7, 4);
  assert.equal(effects.root.children.length, 0);
  effects.dispose();
});

test('ice visuals persist after the instant spell zone disappears, expire with the slow and clean dead units', () => {
  const effects = new SpellEffects(),
    targets = units();
  const enemy = targets[1];
  enemy.slowFactor = 0.6;
  enemy.slowUntil = 2.4;
  effects.update([], targets, 0.4, 1);
  const status = effects.root.getObjectByName(`spell-status-${enemy.id}`)!;
  assert.equal(status.getObjectByName('frost')!.visible, true);
  assert.equal(status.getObjectByName('burn')!.visible, false);
  effects.update([], targets, 2.39, 2);
  assert.equal(effects.root.children.length, 1);
  effects.update([], targets, 2.4, 3);
  assert.equal(effects.root.children.length, 0);
  effects.update([], targets, 1, 4);
  enemy.hp = 0;
  effects.update([], targets, 1.1, 5);
  assert.equal(effects.root.children.length, 0);
  effects.dispose();
});

test('match reset removes all spell visuals and repeated battles release their zone materials', () => {
  const effects = new SpellEffects(),
    targets = units();
  let disposals = 0;
  for (let i = 0; i < 3; i++) {
    effects.update([fire], targets, 1, 1);
    const zone = effects.root.getObjectByName('spell-zone-10')!;
    for (const mesh of zone.children.slice(0, 2)) {
      const material = (
        mesh as import('three').Mesh<import('three').BufferGeometry, import('three').Material>
      ).material;
      material.addEventListener('dispose', () => disposals++);
    }
    effects.reset();
    assert.equal(effects.root.children.length, 0);
  }
  assert.equal(disposals, 6);
  effects.dispose();
  assert.equal(disposals, 6);
});
test('freeze, haste and weaken visuals expire independently without mutating combat state', () => {
  const effects = new SpellEffects(),
    targets = units(),
    target = targets[1];
  target.frozenUntil = 2;
  target.hasteUntil = 3;
  target.weakenUntil = 4;
  const before = structuredClone(targets);
  effects.update([], targets, 1, 1);
  const status = effects.root.getObjectByName(`spell-status-${target.id}`)!;
  assert.equal(status.getObjectByName('frost')!.visible, true);
  assert.equal(status.getObjectByName('haste')!.visible, true);
  assert.equal(status.getObjectByName('weaken')!.visible, true);
  effects.update([], targets, 2, 2);
  assert.equal(status.getObjectByName('frost')!.visible, false);
  assert.equal(status.getObjectByName('haste')!.visible, true);
  effects.update([], targets, 3, 3);
  assert.equal(status.getObjectByName('haste')!.visible, false);
  assert.equal(status.getObjectByName('weaken')!.visible, true);
  effects.update([], targets, 4, 4);
  assert.equal(effects.root.children.length, 0);
  assert.deepEqual(targets, before);
  effects.dispose();
});
