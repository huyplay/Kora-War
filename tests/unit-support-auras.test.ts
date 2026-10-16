import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Unit } from '../src/core/types';
import { defaultContent } from '../src/data/content';
import { defaultGameplay } from '../src/data/gameplay';
import { defaultVfxReadability } from '../src/data/vfx-readability';
import { UnitSupportAuras } from '../src/rendering/vfx/unit-support-auras';
import { SpellEffects } from '../src/rendering/vfx/spell-effects';

const unit = (extra: Partial<Unit> = {}) =>
  ({ id: 1, side: 0, lane: 1, x: 0, hp: 100, hasteUntil: 3, weakenUntil: 4, ...extra }) as Unit;
const point = Object.freeze({ x: 2, y: 0.2, z: -0.5, radius: 0.8 });
const profile = () => {
  const p = defaultContent().vfx;
  p.readability = defaultVfxReadability();
  return p;
};
const data = (fx: UnitSupportAuras) => fx.root.geometry.getAttribute('supportData');
const translation = (fx: UnitSupportAuras, index = 0) => {
  const m = new THREE.Matrix4();
  fx.root.getMatrixAt(index, m);
  return new THREE.Vector3().setFromMatrixPosition(m);
};
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('support markers coexist, face each side and track the displayed origin/radius without changing units', () => {
  const fx = new UnitSupportAuras(),
    parent = new THREE.Group(),
    config = defaultGameplay();
  fx.configure(defaultVfxReadability().events.skill);
  const units = [Object.freeze(unit()), Object.freeze(unit({ id: 2, side: 1 }))],
    before = JSON.stringify(units);
  fx.begin(config, 2);
  units.forEach((u) => fx.add(u, point, 2));
  fx.end(parent);
  assert.equal(fx.root.count, 4);
  assert.equal(parent.children.length, 1);
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => data(fx).getX(i)),
    [0, 1, 0, 1],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => data(fx).getY(i)),
    [1, 1, -1, -1],
  );
  assert.equal(data(fx).getZ(0), data(fx).getZ(1));
  near(translation(fx).x, 2);
  near(translation(fx).y, 0.49);
  near(translation(fx, 1).y, 0.502);
  near(translation(fx).z, -0.5);
  fx.begin(config, 2.1);
  fx.add(units[0], { x: 4, y: 0.4, z: 1, radius: 0.4 }, 2.1);
  fx.end(parent);
  near(translation(fx).x, 4);
  near(translation(fx).y, 0.69);
  const m = new THREE.Matrix4();
  fx.root.getMatrixAt(0, m);
  near(new THREE.Vector3().setFromMatrixScale(m).x, 0.4 * 1.35 * 0.8);
  assert.equal(JSON.stringify(units), before);
  assert.deepEqual(point, { x: 2, y: 0.2, z: -0.5, radius: 0.8 });
  fx.begin(config, 2);
  fx.add(units[0], { ...point, radius: 100 }, 2);
  fx.end(parent);
  fx.root.getMatrixAt(0, m);
  near(new THREE.Vector3().setFromMatrixScale(m).x, 1.6);
  fx.root.getMatrixAt(1, m);
  near(new THREE.Vector3().setFromMatrixScale(m).x, 1.6 * 1.15);
  fx.dispose();
});

test('support expiry, death and invalid samples clear markers while pause/reduced motion honor database style', () => {
  const fx = new UnitSupportAuras(),
    parent = new THREE.Group(),
    config = defaultGameplay(),
    style = defaultVfxReadability().events.skill;
  Object.assign(style, { opacity: 0.23, scale: 1.2, blend: 'additive' });
  config.spells.haste.color = '#123456';
  config.spells.weaken.color = '#abcdef';
  fx.configure(style);
  const frame = (u: Unit, time: number, clock: number, reduced = false) => {
    fx.begin(config, clock, reduced);
    fx.add(u, point, time);
    fx.end(parent);
  };
  frame(unit(), 2, 7);
  const matrix = fx.root.instanceMatrix.array.slice(),
    phase = data(fx).array.slice();
  frame(unit(), 2, 7);
  assert.deepEqual(fx.root.instanceMatrix.array, matrix);
  assert.deepEqual(data(fx).array, phase);
  frame(unit(), 2, NaN, true);
  const uniforms = fx.root.material.uniforms;
  assert.equal(uniforms.clock.value, 7);
  assert.equal(uniforms.motion.value, 0);
  assert.equal(uniforms.opacity.value, 0.23);
  assert.equal(uniforms.haste.value.getHexString(), '123456');
  assert.equal(uniforms.weaken.value.getHexString(), 'abcdef');
  assert.equal(fx.root.material.blending, THREE.AdditiveBlending);
  frame(unit(), 3, 8);
  assert.equal(fx.root.count, 1);
  assert.equal(data(fx).getX(0), 1);
  frame(unit(), 4, 9);
  assert.equal(fx.root.count, 0);
  assert.equal(parent.children.length, 0);
  for (const u of [
    unit({ hp: 0 }),
    unit({ hp: NaN }),
    unit({ id: Infinity }),
    unit({ hasteUntil: NaN, weakenUntil: Infinity }),
  ]) {
    frame(u, 2, 2);
    assert.equal(fx.root.count, 0);
  }
  fx.begin(config, 2);
  fx.add(unit(), { ...point, x: NaN }, 2);
  fx.add(unit(), { ...point, radius: -1 }, 2);
  fx.add(unit(), point, NaN);
  fx.end(parent);
  assert.equal(fx.root.count, 0);
  fx.configure({ ...style, opacity: 0 });
  frame(unit(), 2, 2);
  assert.equal(fx.root.count, 0);
  assert.equal(fx.managed, true);
  fx.dispose();
});

test('support batch is bounded, reuses resources and reset/disposal cannot revive stale marks', () => {
  const fx = new UnitSupportAuras(),
    parent = new THREE.Group();
  fx.configure(defaultVfxReadability().events.skill);
  const geometry = fx.root.geometry,
    material = fx.root.material,
    attribute = fx.root.instanceMatrix;
  fx.begin(defaultGameplay(), 1);
  for (let id = 0; id < 500; id++) fx.add(unit({ id }), point, 1);
  fx.end(parent);
  assert.equal(fx.root.count, 200);
  assert.equal(parent.children.length, 1);
  assert.equal(geometry.getAttribute('position').count, 4);
  assert.equal(fx.root.geometry, geometry);
  assert.equal(fx.root.material, material);
  assert.equal(fx.root.instanceMatrix, attribute);
  fx.reset();
  assert.equal(parent.children.length, 0);
  assert.equal(fx.root.count, 0);
  let released = 0;
  geometry.addEventListener('dispose', () => released++);
  material.addEventListener('dispose', () => released++);
  fx.root.addEventListener('dispose', () => released++);
  fx.dispose();
  fx.dispose();
  assert.equal(released, 3);
  fx.configure(defaultVfxReadability().events.skill);
  fx.begin(defaultGameplay(), 1);
  fx.add(unit(), point, 1);
  fx.end(parent);
  assert.equal(fx.managed, false);
  assert.equal(fx.root.count, 0);
  assert.equal(parent.children.length, 0);
});

test('SpellEffects replaces duplicate support rings with one batch, keeps legacy and releases on config/reset/dispose', async () => {
  const fx = new SpellEffects(),
    config = defaultGameplay(),
    u = unit();
  fx.setConfig(config);
  fx.update([], [u], 2, 2);
  assert.equal(fx.root.getObjectByName('haste')!.visible, true);
  assert.equal(fx.root.getObjectByName('weaken')!.visible, true);
  await fx.configure(profile());
  fx.update([], [u], 2, 2, () => ({ x: 3, y: 0.15, z: 1, scale: 0.5, radius: 0.4 }));
  const batch = fx.root.getObjectByName('UnitSupportAuras') as THREE.InstancedMesh;
  assert.equal(batch.count, 2);
  assert.equal(fx.root.children.length, 1);
  assert.equal(fx.root.getObjectByName('haste'), undefined);
  fx.update([], [{ ...u, frozenUntil: 4 }], 2, 2, undefined, { bodyManaged: true });
  assert.equal(fx.root.getObjectByName('haste')!.visible, false);
  assert.equal(fx.root.getObjectByName('weaken')!.visible, false);
  fx.update([], [], 2, 2);
  assert.equal(fx.root.children.length, 0);
  fx.update([], [u], 2, 2);
  fx.reset();
  assert.equal(fx.root.children.length, 0);
  fx.update([], [u], 2, 2);
  fx.setConfig({ ...config });
  assert.equal(fx.root.children.length, 0);
  await fx.configure(defaultContent().vfx);
  fx.update([], [u], 2, 2);
  assert.equal(fx.root.getObjectByName('haste')!.visible, true);
  fx.dispose();
  fx.dispose();
  await fx.configure(profile());
  fx.setConfig(config);
  fx.update([], [u], 2, 2);
  assert.equal(fx.root.children.length, 0);
});
