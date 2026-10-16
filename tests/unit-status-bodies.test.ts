import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Unit } from '../src/core/types';
import { COMPAT_GAMEPLAY } from '../src/data/gameplay';
import { defaultUnitFeedback } from '../src/data/unit-feedback';
import { UnitStatusBodies } from '../src/rendering/vfx/unit-status-bodies';

const point = new THREE.Vector3(2, 0.25, -1);
const unit = (extra: Partial<Unit> = {}) =>
  ({ id: 3, hp: 100, shield: 50, frozenUntil: 5, ...extra }) as Unit;
const frame = (fx: UnitStatusBodies, units: Unit[], time = 2, clock = 2, reduced = false) => {
  fx.begin(COMPAT_GAMEPLAY, clock, reduced);
  units.forEach((u) => fx.add(u, point, 3, 0.8, time));
  fx.end();
};

test('per-unit shell patterns stay stable when snapshots reorder units and frost expires independently', () => {
  const fx = new UnitStatusBodies();
  fx.configure(defaultUnitFeedback().bodies);
  const a = Object.freeze(unit()),
    b = Object.freeze(unit({ id: 31 })),
    before = JSON.stringify([a, b]);
  frame(fx, [a, b]);
  const phases = fx.root.geometry.getAttribute('bodyPhase'),
    kinds = fx.root.geometry.getAttribute('bodyKind');
  assert.equal(fx.root.count, 4);
  const phaseA = phases.getX(0),
    phaseB = phases.getX(2);
  assert.equal(phases.getX(1), phaseA);
  assert.equal(phases.getX(3), phaseB);
  assert.notEqual(phaseA, phaseB);
  frame(fx, [b, a]);
  assert.deepEqual([phases.getX(0), phases.getX(2)], [phaseB, phaseA]);
  frame(fx, [a, b], 5);
  assert.equal(fx.root.count, 2);
  assert.deepEqual([kinds.getX(0), kinds.getX(1)], [0, 0]);
  assert.deepEqual([phases.getX(0), phases.getX(1)], [phaseA, phaseB]);
  assert.equal(JSON.stringify([a, b]), before);
  assert.deepEqual(point.toArray(), [2, 0.25, -1]);
  fx.dispose();
});

test('invalid status and frame inputs cannot create phantom frost, shields or nonfinite matrices', () => {
  const fx = new UnitStatusBodies();
  fx.configure(defaultUnitFeedback().bodies);
  frame(fx, [unit({ shield: NaN }), unit({ frozenUntil: NaN })]);
  const kinds = fx.root.geometry.getAttribute('bodyKind');
  assert.equal(fx.root.count, 2);
  assert.deepEqual([kinds.getX(0), kinds.getX(1)], [1, 0]);
  frame(fx, [unit({ shield: Infinity, frozenUntil: Infinity })]);
  assert.equal(fx.root.count, 0);
  for (const bad of [unit({ hp: NaN }), unit({ hp: Infinity }), unit({ id: NaN }), unit({ hp: 0 })]) {
    frame(fx, [bad]);
    assert.equal(fx.root.count, 0);
  }
  for (const time of [NaN, Infinity]) {
    frame(fx, [unit()], time);
    assert.equal(fx.root.count, 0);
  }
  fx.begin(COMPAT_GAMEPLAY, 4, false);
  fx.add(unit(), new THREE.Vector3(NaN, 0, 0), 3, 0.8, 2);
  fx.add(unit(), point, Infinity, 0.8, 2);
  fx.add(unit(), point, 3, 0, 2);
  assert.equal(fx.root.count, 0);
  fx.add(unit(), point, 3, 0.8, 2);
  fx.end();
  const matrix = new THREE.Matrix4();
  fx.root.getMatrixAt(0, matrix);
  assert.ok(matrix.elements.every(Number.isFinite));
  fx.dispose();
});

test('shell clock holds on pause or invalid samples and reduced motion preserves geometry and database styling', () => {
  const fx = new UnitStatusBodies(),
    config = structuredClone(COMPAT_GAMEPLAY),
    profile = defaultUnitFeedback().bodies;
  config.spells.ice.color = '#123456';
  config.spells.shield.color = '#abcdef';
  profile.opacity = 0.22;
  profile.padding = 0.3;
  fx.configure(profile);
  const draw = (clock: number, reduced: boolean) => {
    fx.begin(config, clock, reduced);
    fx.add(unit(), point, 3, 0.8, 2);
    fx.end();
  };
  draw(7, false);
  const uniforms = fx.root.material.uniforms;
  const matrix = fx.root.instanceMatrix.array.slice(),
    phases = fx.root.geometry.getAttribute('bodyPhase').array.slice();
  draw(7, false);
  assert.deepEqual(fx.root.instanceMatrix.array, matrix);
  assert.equal(uniforms.clock.value, 7);
  for (const clock of [NaN, Infinity]) {
    draw(clock, false);
    assert.equal(uniforms.clock.value, 7);
  }
  draw(8, true);
  assert.equal(uniforms.motion.value, 0);
  assert.equal(uniforms.opacity.value, 0.22);
  assert.equal(uniforms.frost.value.getHexString(), '123456');
  assert.equal(uniforms.shield.value.getHexString(), 'abcdef');
  assert.deepEqual(fx.root.instanceMatrix.array, matrix);
  assert.deepEqual(fx.root.geometry.getAttribute('bodyPhase').array, phases);
  draw(8, false);
  assert.equal(uniforms.motion.value, 1);
  fx.reset();
  assert.equal(fx.root.count, 0);
  assert.equal(uniforms.clock.value, 0);
  fx.dispose();
});

test('shell pool keeps one draw and reuses attributes through disabled/legacy/reset; disposal is idempotent', () => {
  const fx = new UnitStatusBodies(),
    profile = defaultUnitFeedback().bodies;
  const geometry = fx.root.geometry,
    material = fx.root.material,
    matrix = fx.root.instanceMatrix,
    phases = geometry.getAttribute('bodyPhase');
  frame(fx, [unit()]);
  assert.equal(fx.root.count, 0);
  fx.configure(profile);
  frame(
    fx,
    Array.from({ length: 500 }, (_, id) => unit({ id })),
  );
  assert.equal(fx.root.count, 200);
  assert.equal(geometry.getAttribute('position').count, 240);
  assert.equal(fx.root.geometry, geometry);
  assert.equal(fx.root.material, material);
  assert.equal(fx.root.instanceMatrix, matrix);
  assert.equal(geometry.getAttribute('bodyPhase'), phases);
  fx.configure({ ...profile, enabled: false });
  frame(fx, [unit()]);
  assert.equal(fx.root.count, 0);
  fx.configure(profile);
  frame(fx, [unit()]);
  assert.equal(fx.root.count, 2);
  let released = 0;
  geometry.addEventListener('dispose', () => released++);
  material.addEventListener('dispose', () => released++);
  fx.root.addEventListener('dispose', () => released++);
  fx.dispose();
  fx.dispose();
  assert.equal(released, 3);
  fx.configure(profile);
  frame(fx, [unit()]);
  assert.equal(fx.root.count, 0);
});
