import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SpriteEffects } from '../src/rendering/vfx/sprite-effects';
import { UnitFeedback } from '../src/rendering/animation/unit-feedback';
import { World } from '../src/rendering/World';
import { defaultContent } from '../src/data/content';
import { defaultUnitFeedback } from '../src/data/unit-feedback';
import { defaultVfxReadability } from '../src/data/vfx-readability';
import type { GameEvent, Unit } from '../src/core/types';

function fixture(t: TestContext, modern = true) {
  const previous = globalThis.document,
    rectangles: number[][] = [],
    context = {
      createRadialGradient: () => ({ addColorStop() {} }),
      fillRect: (...values: number[]) => rectangles.push(values),
      beginPath() {},
      arc() {},
      stroke() {},
    };
  globalThis.document = {
    createElement: () => ({ width: 1024, height: 128, getContext: () => context }),
  } as unknown as Document;
  const fx = new SpriteEffects(),
    profile = defaultContent().vfx;
  if (modern) {
    profile.readability = defaultVfxReadability();
    profile.feedback = defaultUnitFeedback();
  }
  fx.configure(profile);
  t.after(() => {
    fx.dispose();
    globalThis.document = previous;
  });
  return { fx, profile, rectangles };
}
const unit = (hp = 50) => ({ id: 7, heroId: 'solan', side: 0, lane: 1, x: 1, hp, shield: 0 }) as Unit;
const point = { x: 2, y: 0.4, z: 0.8 };
const visible = (fx: SpriteEffects) => fx.root.children.filter((o) => o.visible) as THREE.Sprite[];

test('healing cues use confirmed HP feedback and follow only the recipient, including rendered Y/scale', (t) => {
  const { fx, profile } = fixture(t),
    feedback = new UnitFeedback(unit()),
    before = structuredClone(point);
  assert.equal(feedback.update(unit(), 0.1), undefined);
  fx.recover(unit(), 0, 1, point, 3, 0.6);
  assert.equal(fx.activeCount, 0);
  const change = feedback.update(unit(75), 0.1)!;
  fx.recover(unit(75), change.healing, 1, point, 3, 0.6);
  const sprite = visible(fx)[0];
  assert.deepEqual(sprite.position.toArray(), [2, 0.4 + 3 * 0.55, 0.8]);
  assert.equal(sprite.material.color.getHexString(), profile.heal.slice(1));
  assert.equal(sprite.material.depthTest, false);
  assert.equal(sprite.renderOrder, 24);
  const ids: number[] = [];
  fx.update(0.1, false, (id) => {
    ids.push(id);
    return { x: 4, y: 0.7, z: 1.1 };
  });
  assert.deepEqual(ids, [7]);
  assert.equal(sprite.position.x, 4);
  assert.ok(Math.abs(sprite.position.y - (0.7 + 3 * 0.55)) < 1e-8);
  assert.equal(sprite.position.z, 1.1);
  const position = sprite.position.clone();
  fx.update(0, false, () => ({ x: 50, z: 2 }));
  fx.update(0.1, false, () => undefined);
  assert.deepEqual(sprite.position, position);
  assert.deepEqual(point, before);
});

test('modern fallback is a nonrotating plus atlas; first and last frames keep glyphs inside their cells', (t) => {
  const { fx, rectangles } = fixture(t);
  fx.recover(unit(), 25, 1, point, 3, 1);
  const sprite = visible(fx)[0],
    first = sprite.material.map!;
  assert.equal(first.repeat.x, 1 / 8);
  const crosses = rectangles.filter(([, , w, h]) => w !== 128 || h !== 128);
  assert.equal(crosses.length, 8 * 3 * 4);
  for (let frame = 0; frame < 8; frame++)
    for (const [x, y, w, h] of crosses.slice(frame * 12, frame * 12 + 12)) {
      assert.ok(x >= frame * 128 && x + w <= (frame + 1) * 128);
      assert.ok(y >= 0 && y + h <= 128);
    }
  fx.update(0.3);
  assert.notEqual(sprite.material.map, first);
  assert.equal(sprite.material.rotation, 0);
});

test('configured healing atlases retain priority and original color, including after asynchronous loading', async (t) => {
  const { fx, profile } = fixture(t),
    previous = THREE.TextureLoader.prototype.loadAsync;
  THREE.TextureLoader.prototype.loadAsync = async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 256, height: 128, marker: 'admin-heal' };
    return texture;
  };
  t.after(() => {
    THREE.TextureLoader.prototype.loadAsync = previous;
  });
  profile.eventSprites = { heal: { assetId: 'admin', columns: 2, rows: 1, fps: 8 } };
  fx.configure(profile);
  await Promise.resolve();
  fx.recover(unit(), 25, 1, point, 3, 1);
  const sprite = visible(fx)[0];
  assert.equal(sprite.material.map!.image.marker, 'admin-heal');
  assert.equal(sprite.material.color.getHexString(), 'ffffff');
});

test('recovery cues keep pool/area/cooldown limits, respect disable and freeze without jumping on reduced motion', (t) => {
  const { fx, profile } = fixture(t);
  for (let id = 0; id < 500; id++) fx.recover({ ...unit(), id }, 20, 1, point, 3, 1);
  assert.equal(fx.activeCount, profile.readability!.maxPerArea);
  fx.update(0.1, false, () => ({ x: 4, y: 0.7, z: 1.1 }));
  const sprite = visible(fx)[0],
    pose = sprite.position.clone(),
    scale = sprite.scale.clone(),
    map = sprite.material.map;
  fx.update(0.1, true, () => ({ x: 99, z: 2 }));
  fx.update(0.1, false, () => ({ x: 99, z: 2 }));
  assert.deepEqual(sprite.position, pose);
  assert.deepEqual(sprite.scale, scale);
  assert.equal(sprite.material.map, map);
  fx.update(1);
  assert.equal(fx.activeCount, 0);
  profile.readability!.events.heal.opacity = 0;
  fx.recover(unit(), 50, 2, point, 3, 1);
  assert.equal(fx.activeCount, 0);
  profile.readability!.events.heal.opacity = 0.4;
  fx.configure(profile);
  fx.recover(unit(), 50, 2, point, 3, 1);
  fx.recover(unit(), 50, 2.05, point, 3, 1);
  assert.equal(fx.activeCount, 1);
  fx.update(1);
  fx.emit({ id: 50, type: 'spawn', side: 0, lane: 1, x: 1, time: 4 });
  const reused = visible(fx)[0];
  assert.equal(reused.material.depthTest, true);
  assert.equal(reused.renderOrder, 0);
});

test('legacy event healing stays available while managed recovery suppresses proximity-based duplicate events', (t) => {
  const { fx } = fixture(t, false);
  assert.equal(fx.recoveryManaged, false);
  fx.recover(unit(), 25, 1, point, 3, 1);
  assert.equal(fx.activeCount, 0);
  const world = Object.create(World.prototype) as World,
    calls: unknown[] = [];
  Object.assign(world, {
    content: defaultContent(),
    reducedMotion: { matches: false },
    sprites: { recoveryManaged: true, emit: (...args: unknown[]) => calls.push(args) },
  });
  const event = { type: 'heal', time: 1, side: 0, lane: 1, x: 1, value: 25 } as GameEvent;
  world.effect(event);
  assert.equal(calls.length, 0);
  fx.emit(event);
  assert.equal(fx.activeCount, 1);
});

test('invalid samples and repeated disposal never corrupt or revive sprites or their atlas resources', (t) => {
  const { fx, profile } = fixture(t);
  for (const value of [0, -1, NaN, Infinity]) fx.recover(unit(), value, 1, point, 3, 1);
  fx.recover(unit(), 20, NaN, point, 3, 1);
  fx.recover(unit(), 20, 1, { ...point, x: NaN }, 3, 1);
  assert.equal(fx.activeCount, 0);
  fx.recover(unit(), 20, 1, point, 3, 1);
  const sprite = visible(fx)[0],
    texture = sprite.material.map!;
  let disposed = 0;
  texture.addEventListener('dispose', () => disposed++);
  fx.update(NaN);
  fx.update(-1);
  fx.update(Infinity);
  assert.ok(sprite.position.toArray().every(Number.isFinite));
  fx.dispose();
  fx.dispose();
  fx.configure(profile);
  fx.recover(unit(), 20, 2, point, 3, 1);
  fx.update(0.1);
  assert.equal(disposed, 1);
  assert.equal(fx.activeCount, 0);
  assert.equal(fx.root.children.length, 0);
});

test('event healing without managed feedback retains its atlas path and includes rendered model origin', () => {
  const content = defaultContent();
  content.vfx.readability = defaultVfxReadability();
  content.models.solan = { assetId: 'qa', height: 4, yaw: 0, clips: {} };
  const source = { unit: unit(), position: { x: 3, y: 0.4, z: 0.8 }, scale: 0.6 },
    calls: unknown[][] = [],
    world = Object.create(World.prototype) as World;
  Object.assign(world, {
    content,
    reducedMotion: { matches: false },
    sprites: { recoveryManaged: false, emit: (...args: unknown[]) => calls.push(args) },
    accents: { emit() {} },
  });
  const event = { type: 'heal', time: 1, side: 0, lane: 1, x: 1, value: 25 } as GameEvent;
  world.effect(event, { source, target: undefined });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], source.position);
  assert.deepEqual(calls[0][3], {
    unitId: 7,
    height: 0.4 + 4 * 0.6 * 0.55,
    scale: 0.6,
    reducedMotion: false,
  });
});
