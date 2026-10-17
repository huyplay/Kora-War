import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defaultContent, validateContent, type ModelBinding } from '../src/data/content';
import { DEFAULT_MODEL_ANIMATION, modelAnimationTiming } from '../src/data/model-animation';
import { ModelInstance } from '../src/rendering/assets/model-library';
import { animationState } from '../src/rendering/animation/unit-animator';
import { modelAnimationEditor } from '../src/admin/model-animation-editor';
import { cycleBattle } from '../src/core/cycle-battle';
import type { Unit } from '../src/core/types';

const actor = (overrides: Partial<Unit> = {}) =>
  ({
    id: 1,
    born: 0,
    state: 'attack',
    attackAt: -10,
    skillAt: -10,
    stunUntil: 0,
    slowUntil: 0,
    slowFactor: 1,
    ...overrides,
  }) as Unit;
function fixture(animation?: ModelBinding['animation']) {
  const source = new THREE.Group();
  const hero = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  hero.name = 'Hero';
  source.add(hero);
  const clips = ['Idle', 'Walk', 'Attack', 'Cast'].map(
    (name) =>
      new THREE.AnimationClip(name, 2, [
        new THREE.NumberKeyframeTrack('Hero.rotation[x]', [0, 1, 2], [0, 0.5, 0]),
      ]),
  );
  const binding: ModelBinding = {
    assetId: 'fixture',
    height: 2,
    yaw: 0,
    clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', cast: 'Cast' },
    ...(animation ? { animation } : {}),
  };
  const model = new ModelInstance(source, clips, binding);
  return {
    model,
    binding,
    action: (name: string) => model.mixer.clipAction(clips.find((c) => c.name === name)!),
    dispose() {
      model.dispose();
      hero.geometry.dispose();
      (hero.material as THREE.Material).dispose();
    },
  };
}

test('model timings are optional, validated, and independent of compatibility defaults', () => {
  const c = defaultContent();
  c.models.solan = { assetId: 'fixture', height: 2, yaw: 0, clips: {} };
  validateContent(c);
  assert.deepEqual(modelAnimationTiming(), DEFAULT_MODEL_ANIMATION);
  modelAnimationTiming().attackSeconds = 1;
  assert.equal(DEFAULT_MODEL_ANIMATION.attackSeconds, 0.35);
  c.models.solan.animation = { castSeconds: 0.9, crossFadeSeconds: 0 };
  validateContent(JSON.parse(JSON.stringify(c)));
  for (const bad of [
    null,
    [],
    { castSeconds: NaN },
    { attackSeconds: 0 },
    { castSeconds: 2.01 },
    { crossFadeSeconds: -0.01 },
    { crossFadeSeconds: 0.31 },
    { damage: 12 },
  ]) {
    c.models.solan.animation = bad as ModelBinding['animation'];
    assert.throws(() => validateContent(c), /hoạt ảnh/);
  }
});

test('a later attack interrupts casting; simultaneous actions retain the skill pose', () => {
  const timing = modelAnimationTiming({ attackSeconds: 0.6, castSeconds: 0.9 });
  assert.equal(animationState(actor({ skillAt: 3, attackAt: 3 }), 3.2, 'playing', timing), 'cast');
  assert.equal(animationState(actor({ skillAt: 3, attackAt: 3.1 }), 3.2, 'playing', timing), 'attack');
  assert.equal(animationState(actor({ skillAt: 4, attackAt: 4 }), 3.2, 'playing', timing), 'idle');
  assert.equal(animationState(actor({ skillAt: 3 }), 3.8, 'playing', timing), 'cast');
  assert.equal(animationState(actor({ skillAt: 3, frozenUntil: 4 }), 3.8, 'playing', timing), 'stunned');
});

test('late snapshots seek into a confirmed one-shot without replaying it each frame', () => {
  const f = fixture({ attackSeconds: 0.8, crossFadeSeconds: 0 });
  try {
    const unit = actor({ attackAt: 3 });
    const before = structuredClone(unit);
    f.model.update(unit, 3.6, 'playing', 0.02);
    assert.ok(Math.abs(f.action('Attack').time - 1.5) < 1e-8);
    f.model.update(unit, 3.6, 'playing', 0.02);
    assert.ok(Math.abs(f.action('Attack').time - 1.55) < 1e-8, 'same snapshot advances, never restarts');
    f.model.update(unit, 3.6, 'paused', 0.3);
    assert.ok(Math.abs(f.action('Attack').time - 1.55) < 1e-8);
    f.model.update(actor({ attackAt: 3.7 }), 3.7, 'playing', 0.02);
    assert.ok(f.action('Attack').time < 0.1, 'new strike re-arms the clip');
    assert.deepEqual(unit, before);
  } finally {
    f.dispose();
  }
});

test('custom cast duration applies per instance without altering shared clips or other models', () => {
  const a = fixture({ castSeconds: 1, crossFadeSeconds: 0 }),
    b = fixture();
  try {
    a.model.update(actor({ skillAt: 3 }), 3.75, 'playing', 0.02);
    b.model.update(actor({ skillAt: 3 }), 3.75, 'playing', 0.02);
    assert.ok(Math.abs(a.action('Cast').time - 1.5) < 1e-8);
    assert.equal(a.action('Cast').getClip().duration, 2);
    assert.equal(b.action('Cast').isRunning(), false);
    assert.equal(a.action('Cast').loop, THREE.LoopOnce);
    const pose = a.model.model.getObjectByName('Hero')!.rotation.x;
    a.model.update(actor({ skillAt: 3, frozenUntil: 5 }), 4, 'playing', 0.2);
    assert.equal(a.model.model.getObjectByName('Hero')!.rotation.x, pose);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test('render timing profiles leave seeded simulation and legacy fixtures independent', () => {
  const a = defaultContent(),
    b = structuredClone(a);
  b.models.solan = { assetId: 'fixture', height: 2, yaw: 0, clips: {}, animation: { castSeconds: 1.2 } };
  const one = cycleBattle(a.gameplay!.deck.defaultCards, a, 90);
  const two = cycleBattle(b.gameplay!.deck.defaultCards, b, 90);
  for (const battle of [one, two]) {
    battle.mulligan(0, []);
    battle.mulligan(1, []);
    battle.start();
  }
  for (let i = 0; i < 1000; i++) {
    one.step();
    two.step();
  }
  assert.deepEqual(one.snapshot(), two.snapshot());
  b.models.solan.animation!.castSeconds = 0.2;
  assert.equal(
    two.content.models.solan.animation!.castSeconds,
    1.2,
    'running match locks the timing profile',
  );
});

test('admin timing controls show inherited values and encode hero IDs', () => {
  const markup = modelAnimationEditor('solan');
  assert.match(markup, /models\.solan\.animation\.castSeconds/);
  assert.match(markup, /value="0.5"/);
  assert.match(modelAnimationEditor('bad"id'), /bad&quot;id/);
});
