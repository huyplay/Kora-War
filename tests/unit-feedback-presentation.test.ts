import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { defaultContent, validateContent } from '../src/data/content';
import { defaultUnitFeedback } from '../src/data/unit-feedback';
import { UnitStatusBodies } from '../src/rendering/vfx/unit-status-bodies';
import { FloatingNumbers } from '../src/rendering/vfx/floating-numbers';
import { SpellEffects } from '../src/rendering/vfx/spell-effects';
import { COMPAT_GAMEPLAY } from '../src/data/gameplay';
import { GameDatabase } from '../server/database';
import { installUnitFeedback } from '../server/unit-feedback-presentation';
import { unitFeedbackEditor } from '../src/admin/unit-feedback-editor';
import type { Unit } from '../src/core/types';

const texture = () => new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
function camera(height = 390) {
  const camera = new THREE.PerspectiveCamera(30, 844 / height, 0.1, 180);
  camera.position.set(0, 29, 35.2);
  camera.lookAt(0, 0.5, 1.2);
  camera.updateMatrixWorld(true);
  return camera;
}
const unit = (extra: Partial<Unit> = {}) =>
  ({
    id: 1,
    heroId: 'solan',
    lane: 1,
    side: 0,
    hp: 100,
    maxHp: 100,
    shield: 20,
    slowUntil: 0,
    slowFactor: 1,
    ...extra,
  }) as Unit;

test('damage number pixel height stays readable on all lanes and zooms, independent of model height', () => {
  const fx = new FloatingNumbers(texture()),
    matrix = new THREE.Matrix4(),
    view = camera();
  fx.configure(defaultUnitFeedback().numbers);
  for (const height of [390, 720])
    for (const zoom of [1, 1.85])
      for (const z of [-4.5, 0, 4.5])
        for (const y of [1.8, 4.5]) {
          view.aspect = 844 / height;
          view.zoom = zoom;
          view.updateProjectionMatrix();
          fx.reset();
          fx.emit(25, new THREE.Vector3(3, y, z));
          fx.update(0, view, height);
          fx.root.getMatrixAt(0, matrix);
          const top = new THREE.Vector3(0, 0.5, 0).applyMatrix4(matrix).project(view),
            bottom = new THREE.Vector3(0, -0.5, 0).applyMatrix4(matrix).project(view);
          assert.ok(Math.abs(((top.y - bottom.y) * height) / 2 - 18) < 0.001);
        }
  fx.dispose();
});
test('screen numbers pause, use configured lifetime and reduced motion, reject hidden points and bound glyphs', () => {
  const fx = new FloatingNumbers(texture()),
    view = camera(),
    p = defaultUnitFeedback().numbers;
  p.lifetime = 1;
  fx.configure(p);
  fx.emit(123, new THREE.Vector3(0, 3, 0));
  fx.update(0.1, view, 390, true);
  const before = fx.root.instanceMatrix.array.slice();
  fx.update(0.2, view, 390, true);
  assert.deepEqual(fx.root.instanceMatrix.array, before);
  fx.update(0, view, 390);
  const paused = fx.root.instanceMatrix.array.slice();
  fx.update(0, view, 390);
  assert.deepEqual(fx.root.instanceMatrix.array, paused);
  fx.update(0.7, view, 390);
  assert.equal(fx.activeCount, 0);
  fx.emit(100, new THREE.Vector3(0, 29, 100));
  fx.update(0, view, 390);
  assert.equal(fx.root.count, 0);
  fx.configure({ ...p, enabled: false });
  fx.emit(1, new THREE.Vector3());
  assert.equal(fx.activeCount, 0);
  fx.configure(p);
  for (let i = 0; i < 500; i++) fx.emit(999999, new THREE.Vector3(0, 2, 0), true);
  fx.update(0, view, 390);
  assert.equal(fx.root.count, 160);
  fx.dispose();
});
test('freeze and shield envelopes fit rendered bodies, coexist and expire independently without changing units', () => {
  const fx = new UnitStatusBodies(),
    p = defaultUnitFeedback().bodies,
    u = unit({ frozenUntil: 2 }),
    position = new THREE.Vector3(3, 0.1, 4),
    matrix = new THREE.Matrix4(),
    before = structuredClone(u);
  fx.configure(p);
  fx.begin(COMPAT_GAMEPLAY, 1, false);
  fx.add(u, position, 4, 1.2, 1);
  fx.end();
  assert.equal(fx.root.count, 2);
  const kind = fx.root.geometry.getAttribute('bodyKind');
  assert.deepEqual([kind.getX(0), kind.getX(1)], [1, 0]);
  fx.root.getMatrixAt(0, matrix);
  const scale = new THREE.Vector3().setFromMatrixScale(matrix);
  assert.ok(Math.abs(scale.y - 2 * (1 + p.padding)) < 1e-6);
  assert.ok(Math.abs(matrix.elements[13] - 2.15) < 1e-6);
  assert.equal(matrix.elements[12], 3);
  assert.equal(matrix.elements[14], 4);
  fx.begin(COMPAT_GAMEPLAY, 2, false);
  fx.add(u, position, 4, 1.2, 2);
  assert.equal(fx.root.count, 1);
  assert.equal(kind.getX(0), 0);
  fx.begin(COMPAT_GAMEPLAY, 3, false);
  fx.add({ ...u, shield: 0 }, position, 4, 1.2, 3);
  assert.equal(fx.root.count, 0);
  assert.deepEqual(u, before);
  fx.add({ ...u, hp: 0 }, position, 4, 1.2, 1);
  assert.equal(fx.root.count, 0);
  fx.dispose();
});
test('envelope pool is bounded, reuses attributes, honors locked colors, reduced motion, disable/reset/dispose', () => {
  const fx = new UnitStatusBodies(),
    p = defaultUnitFeedback().bodies,
    g = structuredClone(COMPAT_GAMEPLAY),
    point = new THREE.Vector3();
  g.spells.ice.color = '#123456';
  g.spells.shield.color = '#abcdef';
  fx.configure(p);
  fx.begin(g, 7, true);
  assert.equal(fx.root.material.uniforms.motion.value, 0);
  assert.equal(fx.root.material.uniforms.clock.value, 7);
  assert.equal(fx.root.material.uniforms.frost.value.getHexString(), '123456');
  assert.equal(fx.root.material.uniforms.shield.value.getHexString(), 'abcdef');
  const attribute = fx.root.instanceMatrix;
  for (let i = 0; i < 500; i++) fx.add(unit({ frozenUntil: 2 }), point, 2, 0.7, 1);
  fx.end();
  assert.equal(fx.root.count, 200);
  fx.reset();
  assert.equal(fx.root.count, 0);
  assert.equal(fx.root.instanceMatrix, attribute);
  fx.configure({ ...p, enabled: false });
  fx.begin(g, 0, false);
  fx.add(unit(), point, 2, 0.7, 0);
  assert.equal(fx.root.count, 0);
  let released = 0;
  fx.root.geometry.addEventListener('dispose', () => released++);
  fx.root.material.addEventListener('dispose', () => released++);
  fx.dispose();
  assert.equal(released, 2);
});
test('managed frost replaces the old shell and follows configured ice color and model height', () => {
  const fx = new SpellEffects(),
    g = structuredClone(COMPAT_GAMEPLAY),
    u = unit({ frozenUntil: 4 });
  g.spells.ice.color = '#123456';
  fx.setConfig(g);
  fx.update([], [u], 1, 1, () => ({ x: 3, z: 1, scale: 0.5, height: 4 }));
  const shell = fx.root.getObjectByName('FreezeShell') as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  >;
  assert.equal(shell.scale.y, 4);
  assert.equal(shell.position.y, 2);
  assert.equal(shell.material.color.getHexString(), '123456');
  assert.equal(shell.visible, true);
  fx.update([], [u], 1, 1, undefined, { bodyManaged: true, reducedMotion: true });
  assert.equal(shell.visible, false);
  assert.equal(fx.root.getObjectByName('FreezeShards')!.visible, false);
  fx.update([], [u], 4, 4);
  assert.equal(fx.root.children.length, 0);
  fx.dispose();
});
test('managed frost hides the legacy additive rune instead of covering the new body twice', async (t) => {
  const original = THREE.TextureLoader.prototype.loadAsync,
    fx = new SpellEffects();
  t.after(() => {
    THREE.TextureLoader.prototype.loadAsync = original;
    fx.dispose();
  });
  THREE.TextureLoader.prototype.loadAsync = async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 128, height: 128 };
    return texture;
  };
  const profile = defaultContent().vfx;
  profile.spellSprites = { ice: { assetId: 'ice', columns: 1, rows: 1, fps: 8 } };
  await fx.configure(profile);
  fx.update([], [unit({ frozenUntil: 4 })], 1, 1);
  const rune = fx.root.getObjectByName('frost')!.children.find((o) => o instanceof THREE.Sprite)!;
  assert.equal(rune.visible, true);
  fx.update([], [unit({ frozenUntil: 4 })], 1, 1, undefined, { bodyManaged: true });
  assert.equal(rune.visible, false);
});
test('feedback validation/admin accept optional legacy profiles and reject unsafe ranges/types/keys', () => {
  const c = defaultContent();
  assert.equal(c.vfx.feedback, undefined);
  validateContent(c);
  c.vfx.feedback = defaultUnitFeedback();
  validateContent(c);
  for (const mutate of [
    (p: ReturnType<typeof defaultUnitFeedback>) => (p.numbers.pixels = 3),
    (p: ReturnType<typeof defaultUnitFeedback>) => (p.bodies.opacity = NaN),
    (p: ReturnType<typeof defaultUnitFeedback>) => (p.numbers.healColor = 'red'),
    (p: ReturnType<typeof defaultUnitFeedback>) =>
      ((p.bodies as unknown as Record<string, unknown>).extra = true),
  ]) {
    const bad = structuredClone(c);
    mutate(bad.vfx.feedback!);
    assert.throws(() => validateContent(bad));
  }
  const html = unitFeedbackEditor(c);
  assert.match(html, /vfx.feedback.numbers.pixels/);
  assert.match(html, /vfx.feedback.bodies.opacity/);
});
test('feedback installation backs up, preserves custom draft/history/gameplay and never overrides existing profiles', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-feedback-')),
    store = new GameDatabase(directory, 'test');
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const state = store.config(),
    history = store.db.prepare('SELECT * FROM revisions').all();
  state.draft.economy.winGold = 111;
  state.draft.vfx.feedback = defaultUnitFeedback();
  state.draft.vfx.feedback.numbers.pixels = 22;
  store.saveDraft(state.draft, state.version);
  const result = installUnitFeedback(store);
  assert.ok(existsSync(result.backup!));
  assert.equal(store.config().published.vfx.feedback!.numbers.pixels, 18);
  assert.equal(store.config().draft.vfx.feedback!.numbers.pixels, 22);
  assert.equal(store.config().draft.economy.winGold, 111);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions WHERE id<=?').all(state.revision), history);
  assert.deepEqual(store.config().published.gameplay, state.published.gameplay);
  const version = store.config().version;
  assert.equal(installUnitFeedback(store).changed, false);
  assert.equal(store.config().version, version);
});
