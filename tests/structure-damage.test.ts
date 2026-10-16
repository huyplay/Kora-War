import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Tower } from '../src/core/types';
import { defaultContent } from '../src/data/content';
import { defaultVfxReadability } from '../src/data/vfx-readability';
import { StructureDamage } from '../src/rendering/structure-damage';

const tower = (extra: Partial<Tower> = {}): Tower => ({
  id: '0-1',
  side: 0,
  lane: 1,
  x: -9,
  hp: 400,
  maxHp: 400,
  cooldown: 0,
  ...extra,
});
function fixture() {
  const fx = new StructureDamage(),
    camera = new THREE.PerspectiveCamera(),
    vfx = defaultContent().vfx;
  vfx.readability = defaultVfxReadability();
  const floors = fx.root.children.filter((o) => o.name === 'TowerFoundationFractures') as THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial
  >[];
  const hits = fx.root.children.filter((o) => o.name === 'TowerDamageImpact') as typeof floors;
  const update = (towers: Tower[], dt = 0, reduced = false, height = 4.2) =>
    fx.update(towers, height, dt, camera, vfx, reduced);
  return { fx, camera, vfx, floors, hits, update };
}

test('snapshot HP creates proportional foundation fractures without initial or healed hit bursts', () => {
  const f = fixture(),
    state = [tower({ hp: 200 }), tower({ id: '1-2', side: 1, lane: 2, x: 9, hp: 0 })],
    before = structuredClone(state);
  f.update(state);
  assert.deepEqual(state, before);
  assert.ok(f.hits.every((h) => !h.visible));
  assert.equal(f.floors[0].material.uniforms.opacity.value, 0.5 * f.vfx.readability!.events.death.opacity);
  assert.equal(f.floors[1].material.uniforms.opacity.value, f.vfx.readability!.events.death.opacity);
  assert.deepEqual(f.floors[1].position.toArray(), [9, 0.085, 4.8]);
  state[0].hp = 400;
  f.update(state, 0.1);
  assert.equal(f.floors[0].visible, false);
  assert.ok(f.hits.every((h) => !h.visible));
  f.fx.dispose();
});

test('a real HP decrease shows a palette-bound impact at configured body height, pauses and expires', () => {
  const f = fixture(),
    state = [tower()];
  f.vfx.ally = '#3366aa';
  f.update(state);
  state[0].hp = 300;
  f.update(state, 0, false, 5);
  const hit = f.hits[0];
  assert.equal(hit.material.depthTest, false, 'body feedback remains visible over the tower model');
  assert.equal(f.floors[0].material.depthTest, true, 'fractures stay on the floor behind opaque geometry');
  assert.equal(hit.visible, true);
  assert.deepEqual(hit.position.toArray(), [-9, 0.48 + 5 * 0.55, 0]);
  assert.ok(hit.material.uniforms.team.value.equals(new THREE.Color('#3366aa')));
  assert.equal(hit.material.blending, THREE.NormalBlending);
  assert.equal(hit.scale.x, 1.6 * f.vfx.readability!.events.hit.scale);
  assert.equal(hit.material.uniforms.opacity.value, f.vfx.readability!.events.hit.opacity);
  f.update(state, 0.1);
  const progress = hit.material.uniforms.progress.value,
    opacity = hit.material.uniforms.opacity.value;
  f.update(state, 0);
  assert.equal(hit.material.uniforms.progress.value, progress);
  assert.equal(hit.material.uniforms.opacity.value, opacity);
  f.update(state, 0.3);
  assert.equal(hit.visible, false);
  f.fx.dispose();
});

test('rapid HP deltas are rate-limited and published opacity/blend/lifetime controls are respected', () => {
  const f = fixture(),
    state = [tower()];
  const style = f.vfx.readability!.events.hit;
  style.cooldown = 0.2;
  style.blend = 'additive';
  f.vfx.readability!.maxDuration = 0.1;
  f.update(state);
  state[0].hp = 390;
  f.update(state);
  state[0].hp = 380;
  f.update(state, 0.05);
  assert.equal(f.hits[0].material.uniforms.progress.value, 0.5, 'second delta did not restart');
  f.update(state, 0.06);
  assert.equal(f.hits[0].visible, false);
  state[0].hp = 370;
  f.update(state, 0.1);
  assert.equal(f.hits[0].visible, true);
  assert.equal(f.hits[0].material.uniforms.progress.value, 0);
  assert.equal(f.hits[0].material.blending, THREE.AdditiveBlending);
  style.opacity = 0;
  f.vfx.readability!.events.death.opacity = 0;
  f.update(state);
  assert.equal(f.hits[0].visible, false);
  assert.equal(f.floors[0].visible, false);
  f.fx.dispose();
});

test('reduced motion freezes an active mark and never resumes its expansion after preference changes', () => {
  const f = fixture(),
    state = [tower()];
  f.update(state);
  state[0].hp = 300;
  f.update(state);
  f.update(state, 0.08, true);
  const mark = f.hits[0].material.uniforms;
  assert.equal(mark.progress.value, 0.35);
  const opacity = mark.opacity.value;
  f.update(state, 0.08, false);
  assert.equal(mark.progress.value, 0.35);
  assert.equal(mark.opacity.value, opacity);
  f.update(state, 0.3);
  assert.equal(f.hits[0].visible, false);
  state[0].hp = 200;
  f.update(state);
  assert.equal(mark.progress.value, 0, 'new damage uses the current normal-motion preference');
  f.fx.dispose();
});

test('missing, invalid, reset and excess snapshots do not retain stale marks or grow the six-slot pool', () => {
  const f = fixture(),
    state = [tower({ hp: 200 })];
  f.update(state);
  f.update([{ ...state[0], hp: NaN }]);
  assert.ok(f.floors.every((m) => !m.visible));
  f.update(state);
  assert.ok(f.hits.every((m) => !m.visible));
  f.update([]);
  assert.ok(f.fx.root.children.every((m) => !m.visible));
  f.update(Array.from({ length: 50 }, (_, i) => tower({ id: String(i), hp: 0 })));
  assert.equal(f.fx.root.children.length, 12);
  assert.equal(f.floors.filter((m) => m.visible).length, 6);
  f.fx.reset();
  assert.ok(f.fx.root.children.every((m) => !m.visible));
  f.update(state);
  assert.ok(f.hits.every((m) => !m.visible));
  f.fx.dispose();
});

test('legacy content renders safe fallbacks and shared geometry/materials dispose once', () => {
  const f = fixture(),
    legacy = defaultContent().vfx,
    state = [tower()];
  delete legacy.readability;
  f.fx.update(state, 4.2, 0, f.camera, legacy);
  state[0].hp = 0;
  f.fx.update(state, 4.2, 0, f.camera, legacy, true);
  assert.equal(f.hits[0].visible, true);
  assert.equal(f.floors[0].visible, true);
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  for (const mesh of [...f.floors, ...f.hits]) {
    resources.add(mesh.geometry);
    resources.add(mesh.material);
  }
  assert.equal(resources.size, 13);
  const disposed = new Map<string, number>();
  resources.forEach((r) =>
    r.addEventListener('dispose', () => disposed.set(r.uuid, (disposed.get(r.uuid) || 0) + 1)),
  );
  const scene = new THREE.Scene();
  scene.add(f.fx.root);
  f.fx.dispose();
  f.fx.dispose();
  f.update(state);
  assert.equal(f.fx.root.parent, null);
  assert.equal(f.fx.root.children.length, 0);
  resources.forEach((r) => assert.equal(disposed.get(r.uuid), 1));
});
