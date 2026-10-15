import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Unit } from '../src/core/types';
import { UnitOverlays, unitStatusGlyphs } from '../src/rendering/unit-overlays';
import { TowerEffects } from '../src/rendering/vfx/tower-effects';
import { defaultArenaPresentation } from '../src/data/arena-presentation';

const unit = (extra: Partial<Unit> = {}): Unit => ({
  id: 1,
  heroId: 'kael',
  side: 0,
  lane: 1,
  x: 0,
  previousX: 0,
  hp: 50,
  maxHp: 100,
  shield: 25,
  attack: 10,
  range: 1,
  speed: 1,
  attackCd: 0,
  skillCd: 0,
  slowUntil: 0,
  slowFactor: 1,
  stunUntil: 0,
  born: 0,
  attackAt: 0,
  skillAt: 0,
  state: 'move',
  ...extra,
});
function camera() {
  const view = new THREE.PerspectiveCamera(30, 844 / 390, 0.1, 180);
  view.position.set(0, 29, 35.2);
  view.lookAt(0, 0.5, 1.2);
  view.updateMatrixWorld(true);
  return view;
}
const texture = () => new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);

test('unit status cues prioritize freeze over stun/slow and expire using snapshot time', () => {
  const state = unit({
    frozenUntil: 12,
    stunUntil: 14,
    slowUntil: 16,
    slowFactor: 0.6,
    hasteUntil: 18,
    weakenUntil: 20,
  });
  const before = structuredClone(state);
  assert.deepEqual(unitStatusGlyphs(state, 10), [1, 4, 5, 6]);
  assert.deepEqual(unitStatusGlyphs(state, 12), [2, 4, 5, 6]);
  assert.deepEqual(unitStatusGlyphs(state, 14), [3, 4, 5, 6]);
  assert.deepEqual(unitStatusGlyphs(state, 16), [4, 5, 6]);
  assert.deepEqual(unitStatusGlyphs(state, 18), [4, 6]);
  assert.deepEqual(unitStatusGlyphs({ ...state, shield: 0 }, 20), []);
  assert.deepEqual(state, before);
  assert.deepEqual(unitStatusGlyphs(unit({ shield: 0, slowUntil: 10, slowFactor: 1 }), 0), []);
});

test('unit overlays keep HP, damage trail and shield separate without modifying simulation', () => {
  const overlays = new UnitOverlays(texture()),
    view = camera(),
    state = unit({ side: 1 });
  const before = structuredClone(state),
    position = new THREE.Vector3(2, 0, 3);
  overlays.add(state, position, 3, 80, 10, view, 390);
  overlays.end();
  const data = overlays.root.geometry.getAttribute('healthData');
  assert.equal(overlays.root.count, 1);
  assert.equal(data.getX(0), 0.5);
  assert.ok(Math.abs(data.getY(0) - 0.8) < 1e-6);
  assert.equal(data.getZ(0), 0.25);
  assert.equal(data.getW(0), 1);
  overlays.begin();
  overlays.add({ ...state, hp: 75, shield: 200 }, position, 3, 50, 10, view, 390);
  assert.equal(data.getX(0), 0.75);
  assert.equal(data.getY(0), 0.75);
  assert.equal(data.getZ(0), 1);
  assert.deepEqual(state, before);
  assert.deepEqual(position, new THREE.Vector3(2, 0, 3));
  overlays.dispose();
});

test('unit bar width stays 36px on mobile and 44px on desktop at every lane, zoom and model height', () => {
  const overlays = new UnitOverlays(texture()),
    view = camera(),
    matrix = new THREE.Matrix4();
  for (const height of [390, 720])
    for (const zoom of [1, 1.85])
      for (const z of [-4.5, 0, 4.5]) {
        view.zoom = zoom;
        view.updateProjectionMatrix();
        overlays.begin();
        overlays.add(unit(), new THREE.Vector3(3, 0, z), z ? 3.5 : 1.8, 50, 1, view, height);
        overlays.root.getMatrixAt(0, matrix);
        const left = new THREE.Vector3(-0.5, 0, 0).applyMatrix4(matrix).project(view);
        const right = new THREE.Vector3(0.5, 0, 0).applyMatrix4(matrix).project(view);
        const pixels = ((right.x - left.x) / 2) * height * view.aspect;
        assert.ok(Math.abs(pixels - (height <= 450 ? 36 : 44)) < 0.001, `${height}/${zoom}/${z}: ${pixels}`);
      }
  overlays.dispose();
});

test('unit overlays bound resources, skip dead/behind-camera units and clear reused slots', () => {
  const atlas = texture(),
    overlays = new UnitOverlays(atlas),
    view = camera();
  let released = 0;
  atlas.addEventListener('dispose', () => released++);
  overlays.add(unit({ hp: 0 }), new THREE.Vector3(), 3, 100, 0, view, 390);
  overlays.add(unit(), new THREE.Vector3(0, 0, 100), 29, 100, 0, view, 390);
  assert.equal(overlays.root.count, 0);
  for (let i = 0; i < 120; i++)
    overlays.add(unit({ frozenUntil: 3 }), new THREE.Vector3(), 3, 60, 0, view, 390);
  overlays.end();
  assert.equal(overlays.root.count, 100);
  assert.equal(overlays.root.geometry.getAttribute('healthData').count, 100);
  assert.equal(overlays.root.material.uniforms.atlas.value, atlas);
  const frozen = overlays.root.instanceMatrix.array.slice();
  overlays.begin();
  for (let i = 0; i < 100; i++)
    overlays.add(unit({ frozenUntil: 3 }), new THREE.Vector3(), 3, 60, 0, view, 390);
  overlays.end();
  assert.deepEqual(overlays.root.instanceMatrix.array, frozen);
  overlays.reset();
  assert.equal(overlays.root.count, 0);
  overlays.add(unit({ shield: 0 }), new THREE.Vector3(), 3, 50, 10, view, 390);
  const glyphs = overlays.root.geometry.getAttribute('statusData');
  assert.deepEqual([glyphs.getX(0), glyphs.getY(0), glyphs.getZ(0), glyphs.getW(0)], [0, 0, 0, 0]);
  overlays.dispose();
  assert.equal(released, 1);
});

test('tower target ring follows visual formation, retains last point on death and freezes on pause', () => {
  const fx = new TowerEffects(),
    config = defaultArenaPresentation().towers,
    view = camera();
  const target = new THREE.Vector3(3, 0, 1),
    matrix = new THREE.Matrix4();
  fx.emit('0-1', new THREE.Vector3(-9, 4, 0), new THREE.Vector3(1, 1, 0), 0, config.projectileSeconds, 42);
  fx.update([], 4, 1.55, config, 0.05, view, (id) => (id === 42 ? target : undefined));
  const markers = fx.root.getObjectByName('TowerTargetMarkers') as THREE.InstancedMesh;
  assert.equal(markers.count, 1);
  markers.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 3);
  assert.equal(matrix.elements[14], 1);
  const paused = markers.instanceMatrix.array.slice();
  fx.update([], 4, 1.55, config, 0, view, () => target);
  assert.deepEqual(markers.instanceMatrix.array, paused);
  target.set(4, 0, 2);
  fx.update([], 4, 1.55, config, 0.05, view, () => target);
  markers.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 4);
  assert.equal(matrix.elements[14], 2);
  fx.update([], 4, 1.55, config, 0, view, () => undefined);
  markers.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 4);
  fx.update([], 4, 1.55, config, config.projectileSeconds, view, () => target);
  assert.equal(markers.count, 0);
  for (let i = 0; i < 120; i++) fx.emit('0-1', new THREE.Vector3(), target, 1, config.projectileSeconds);
  fx.update([], 4, 1.55, config, 0, view);
  assert.equal(markers.count, 32);
  fx.reset();
  assert.equal(markers.count, 0);
  fx.dispose();
});
