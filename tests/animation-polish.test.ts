import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ModelInstance } from '../src/rendering/assets/model-library';
import { CombatAccents } from '../src/rendering/vfx/combat-accents';
import type { Unit } from '../src/core/types';
import { animateUnit, animationState, type HeroRig } from '../src/rendering/animation/unit-animator';

const unit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 1,
  heroId: 'solan',
  side: 0,
  lane: 1,
  x: 0,
  previousX: 0,
  hp: 100,
  maxHp: 100,
  shield: 0,
  attack: 10,
  range: 1,
  speed: 1,
  attackCd: 0,
  skillCd: 0,
  slowUntil: 0,
  slowFactor: 1,
  stunUntil: 0,
  born: 0,
  attackAt: -10,
  skillAt: -10,
  state: 'move',
  ...overrides,
});
function model() {
  const source = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  mesh.name = 'Hero';
  source.add(mesh);
  const clips = ['Idle', 'Walk', 'Attack'].map(
    (name) =>
      new THREE.AnimationClip(name, 2, [
        new THREE.NumberKeyframeTrack('Hero.rotation[x]', [0, 1, 2], [0, 0.5, 1]),
      ]),
  );
  const instance = new ModelInstance(source, clips, {
    assetId: 'fixture',
    height: 2,
    yaw: 0,
    clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', spawn: 'Idle' },
  });
  return {
    instance,
    action: (name: string) => instance.mixer.clipAction(clips.find((clip) => clip.name === name)!),
  };
}
test('attack clip finishes inside its visual window; paused pose resumes without resetting', () => {
  const { instance, action } = model();
  const attacker = unit({ state: 'attack', attackAt: 3 });
  instance.update(attacker, 3.1, 'playing', 0.1);
  const before = action('Attack').time;
  const pose = instance.model.getObjectByName('Hero')!.rotation.x;
  instance.update(attacker, 3.1, 'paused', 1);
  assert.equal(action('Attack').time, before);
  assert.equal(instance.model.getObjectByName('Hero')!.rotation.x, pose);
  instance.update(attacker, 3.3, 'playing', 0.2);
  assert.ok(action('Attack').time > 1.7);
  instance.tick(0.05);
  assert.ok(Math.abs(action('Attack').time - 2) < 0.00001);
  instance.dispose();
});
test('missing one-shot clips never clamp or restart the idle fallback', () => {
  const { instance, action } = model();
  instance.tick(0.4);
  instance.play('spawn', true);
  assert.equal(action('Idle').time, 0.4);
  instance.tick(2.1);
  assert.equal(action('Idle').loop, THREE.LoopRepeat);
  assert.equal(action('Idle').paused, false);
  instance.play('cast', true);
  assert.equal(action('Idle').paused, false);
  instance.dispose();
});
test('walking animation respects slow and stun without changing simulation', () => {
  const { instance, action } = model();
  const slowed = unit({ slowUntil: 9, slowFactor: 0.6 });
  const original = structuredClone(slowed);
  instance.update(slowed, 3, 'playing', 0.2);
  assert.ok(Math.abs(action('Walk').time - 0.12) < 0.00001);
  const time = instance.mixer.time;
  instance.update(unit({ state: 'stunned' }), 3.2, 'playing', 0.2);
  assert.equal(instance.mixer.time, time);
  assert.deepEqual(slowed, original);
  instance.dispose();
});

test('freeze preserves imported and procedural poses immediately, including during spawn, then releases', () => {
  const { instance, action } = model();
  const mover = unit();
  instance.update(mover, 3, 'playing', 0.1);
  const actionTime = action('Walk').time,
    pose = instance.model.getObjectByName('Hero')!.rotation.x;
  const frozen = unit({ frozenUntil: 4, born: 3, state: 'move' }),
    before = structuredClone(frozen);
  assert.equal(animationState(frozen, 3.1, 'playing'), 'stunned');
  instance.update(frozen, 3.1, 'playing', 0.2);
  assert.equal(action('Walk').time, actionTime);
  assert.equal(instance.model.getObjectByName('Hero')!.rotation.x, pose);
  instance.update(frozen, 4, 'playing', 0.1);
  assert.ok(action('Walk').time > actionTime);
  const group = new THREE.Group();
  const rig = Object.fromEntries(
    ['body', 'leftLeg', 'rightLeg', 'armL', 'armR', 'cape'].map((key) => [key, new THREE.Object3D()]),
  ) as unknown as HeroRig;
  group.userData = rig;
  animateUnit(group, mover, 3, 3, 'playing');
  const transforms = () =>
    Object.values(rig).map((object) => [...object.position.toArray(), ...object.rotation.toArray()]);
  const prior = transforms();
  animateUnit(group, frozen, 3.1, 3.5, 'playing');
  assert.deepEqual(transforms(), prior);
  animateUnit(group, frozen, 4, 4, 'playing');
  assert.notDeepEqual(transforms(), prior);
  assert.deepEqual(frozen, before);
  instance.dispose();
});
test('impact pools stay bounded under bursts, expire, and clear between matches', () => {
  const accents = new CombatAccents();
  const camera = new THREE.PerspectiveCamera();
  for (let id = 0; id < 100; id++)
    accents.emit({ id, time: 1, type: 'hit', side: 0, lane: 1, x: 0, value: 10 });
  accents.update(0.01, camera);
  const sparks = accents.root.children.find(
    (mesh) => mesh instanceof THREE.InstancedMesh,
  ) as THREE.InstancedMesh;
  assert.equal(sparks.count, 128);
  accents.update(0.3, camera);
  assert.equal(sparks.count, 0);
  accents.observe([unit()], 2);
  accents.observe([unit({ attackAt: 2 })], 2);
  assert.ok(accents.root.children.slice(1).some((mesh) => mesh.visible));
  accents.reset();
  assert.ok(accents.root.children.slice(1).every((mesh) => !mesh.visible));
  accents.dispose();
});
