import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { combatEventAnchors, type CombatAnchor } from '../src/rendering/combat-anchors';
import { HeroProjectiles } from '../src/rendering/vfx/hero-projectiles';
import { defaultCombatPresentation } from '../src/data/combat-presentation';
import { defaultContent, validateContent, type ContentConfig } from '../src/data/content';
import { GameDatabase } from '../server/database';
import { installCombatPresentation } from '../server/combat-presentation';
import { combatVfxEditor } from '../src/admin/combat-vfx-editor';
import type { GameEvent, Unit } from '../src/core/types';
const profile = () => defaultCombatPresentation(defaultContent().heroes);
const event = (overrides: Partial<GameEvent>): GameEvent => ({
  id: 1,
  time: 2,
  type: 'projectile',
  side: 0,
  lane: 1,
  x: 0,
  toX: 3,
  heroId: 'lyra',
  ...overrides,
});
const anchor = (id: number, side: 0 | 1, x: number, heroId = 'lyra'): CombatAnchor => ({
  unit: { id, side, x, lane: 1, heroId, attackAt: 2, range: 5 } as Unit,
  position: { x: x + 0.1, y: 0, z: id * 0.2 },
  scale: 0.9,
});
test('unit shots pair with the actual hit target instead of a closer stacked unit; missing IDs never retarget', () => {
  const anchors = new Map([
    [1, anchor(1, 0, 0)],
    [2, anchor(2, 1, 3)],
    [3, anchor(3, 1, 3)],
  ]);
  const events = [event({}), event({ id: 2, type: 'hit', x: 3, targetId: 3, value: 20, heroId: undefined })],
    before = JSON.stringify(events);
  const resolved = combatEventAnchors(events, 0, anchors);
  assert.equal(resolved.source?.unit.id, 1);
  assert.equal(resolved.target?.unit.id, 3);
  assert.equal(combatEventAnchors([events[0]], 0, anchors).target, undefined);
  assert.equal(combatEventAnchors([events[0], { ...events[1], id: 9 }], 0, anchors).target, undefined);
  assert.equal(JSON.stringify(events), before);
});
test('tower shot/death pairs retain the killed target visual and do not choose a surviving neighbor', () => {
  const anchors = new Map([
    [1, anchor(1, 0, 0)],
    [2, anchor(2, 1, 3)],
    [3, anchor(3, 1, 3)],
  ]);
  const hit = event({ id: 10, type: 'hit', heroId: undefined, x: 3, targetId: 2 }),
    death = event({ id: 11, type: 'death', heroId: 'lyra', side: 1, x: 3 }),
    shot = event({ id: 12, heroId: undefined });
  assert.equal(combatEventAnchors([hit, death, shot], 2, anchors).target?.unit.id, 2);
  assert.equal(combatEventAnchors([hit, death, shot], 1, anchors).target?.unit.id, 2);
  assert.equal(combatEventAnchors([hit, { ...shot, id: 11 }], 1, anchors).target?.unit.id, 2);
  assert.equal(combatEventAnchors([hit, { ...death, id: 9 }, shot], 2, anchors).target, undefined);
  const ownShot = event({ id: 9 });
  assert.equal(combatEventAnchors([ownShot, hit, death], 0, anchors).target?.unit.id, 2);
});
test('a structure shot cannot borrow the following skill hit outside its unit attack range', () => {
  const attacker = anchor(1, 0, 0);
  attacker.unit.range = 3;
  const anchors = new Map([
    [1, attacker],
    [2, anchor(2, 1, 3.5)],
  ]);
  const events = [event({ toX: 3.5 }), event({ id: 2, type: 'hit', heroId: undefined, x: 3.5, targetId: 2 })];
  assert.equal(combatEventAnchors(events, 0, anchors).target, undefined);
});
test('projectiles use configured shapes/colors, preserve pause and follow only their retained target ID', () => {
  const fx = new HeroProjectiles(),
    c = profile(),
    camera = new THREE.PerspectiveCamera(),
    from = new THREE.Vector3(0, 1, 0),
    to = new THREE.Vector3(10, 1, 0);
  camera.rotation.set(-0.7, 0.1, 0);
  fx.configure(c);
  assert.equal(fx.emit('lyra', from, to, 3), true);
  const shot = fx.root.children.find((o) => o instanceof THREE.Group && o.visible)!;
  fx.update(0.1, camera);
  assert.equal(shot.position.x, 5);
  assert.ok(shot.position.y > 1);
  const paused = shot.position.clone();
  fx.update(0, camera, () => new THREE.Vector3(30, 1, 0));
  assert.deepEqual(shot.position, paused);
  fx.update(0.1, camera, (id) => {
    assert.equal(id, 3);
    return new THREE.Vector3(12, 2, 1);
  });
  assert.equal(fx.activeCount, 0);
  const impact = fx.root.children.find((o) => o instanceof THREE.Mesh && o.visible) as THREE.Mesh;
  assert.deepEqual(impact.position.toArray(), [12, 2, 1]);
  assert.deepEqual(impact.quaternion.toArray(), camera.quaternion.toArray());
  assert.deepEqual(to.toArray(), [10, 1, 0]);
  fx.reset();
  for (const id of ['lyra', 'vesper', 'orin']) assert.equal(fx.emit(id, from, to), true);
  assert.equal(fx.activeCount, 3);
  const active = fx.root.children.filter((o) => o instanceof THREE.Group && o.visible);
  for (const [i, id] of ['lyra', 'vesper', 'orin'].entries()) {
    const visible = active[i].children.filter((o) => o.visible) as THREE.Mesh[];
    assert.equal(visible.length, 1);
    assert.equal(
      (visible[0].material as THREE.MeshBasicMaterial).color.getHexString(),
      c.heroes[id].color.slice(1),
    );
    assert.equal(
      visible[0].geometry.type,
      id === 'lyra' ? 'ConeGeometry' : id === 'orin' ? 'OctahedronGeometry' : 'IcosahedronGeometry',
    );
  }
  fx.dispose();
});
test('dense projectile bursts stay bounded, expire, reuse resources and dispose shared resources once', () => {
  const fx = new HeroProjectiles(),
    camera = new THREE.PerspectiveCamera();
  fx.configure(profile());
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  fx.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      materials.add(o.material as THREE.Material);
    }
  });
  let disposedGeometry = 0,
    disposedMaterial = 0;
  geometries.forEach((g) => g.addEventListener('dispose', () => disposedGeometry++));
  materials.forEach((m) => m.addEventListener('dispose', () => disposedMaterial++));
  const children = fx.root.children.length;
  for (let i = 0; i < 500; i++) fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(2, 1, 0));
  assert.equal(fx.activeCount, 40);
  fx.update(0.25, camera);
  fx.update(0.25, camera);
  assert.equal(fx.activeCount, 0);
  assert.ok(fx.root.children.every((child) => !child.visible));
  assert.equal(fx.root.children.length, children);
  fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(1, 1, 0));
  fx.reset();
  assert.equal(fx.activeCount, 0);
  fx.dispose();
  assert.equal(disposedGeometry, geometries.size);
  assert.equal(disposedMaterial, materials.size);
});
test('reduced motion emits a static impact and changing preferences clears moving shots', () => {
  const fx = new HeroProjectiles(),
    camera = new THREE.PerspectiveCamera();
  fx.configure(profile());
  fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(3, 1, 0), undefined, true);
  assert.equal(fx.activeCount, 0);
  const impact = fx.root.children.find((o) => o instanceof THREE.Mesh && o.visible)!;
  const size = impact.scale.clone(),
    position = impact.position.clone();
  fx.update(0.1, camera, undefined, true);
  assert.deepEqual(impact.scale, size);
  assert.deepEqual(impact.position, position);
  fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(3, 1, 0));
  fx.update(0.01, camera, undefined, true);
  assert.equal(fx.activeCount, 0);
  fx.dispose();
});
test('profile validation protects the catalog and legacy content; admin exposes configurable VFX', () => {
  const c = defaultContent();
  assert.equal(c.vfx.combat, undefined);
  validateContent(c);
  c.vfx.combat = profile();
  validateContent(c);
  for (const change of [
    (c: ContentConfig) => (c.vfx.combat!.flightSeconds = 0),
    (c: ContentConfig) => (c.vfx.combat!.size = NaN),
    (c: ContentConfig) => (c.vfx.combat!.heroes.lyra.color = 'red'),
    (c: ContentConfig) => (c.vfx.combat!.heroes.unknown = { style: 'orb', color: '#ffffff' }),
  ]) {
    const bad = structuredClone(c);
    change(bad);
    assert.throws(() => validateContent(bad));
  }
  const html = combatVfxEditor(c);
  assert.match(html, /vfx.combat.flightSeconds/);
  assert.match(html, /vfx.combat.heroes.lyra.style/);
  assert.match(html, /vfx.combat.heroes.lyra.color/);
});
test('combat presentation publication is backed up, additive, draft-safe and idempotent', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-vfx-')),
    store = new GameDatabase(dir, 'test');
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const state = store.config(),
    history = store.db.prepare('SELECT * FROM revisions').all();
  state.draft.economy.winGold = 111;
  state.draft.vfx.combat = profile();
  state.draft.vfx.combat.flightSeconds = 0.35;
  store.saveDraft(state.draft, state.version);
  const result = installCombatPresentation(store);
  assert.ok(existsSync(result.backup!));
  assert.equal(store.config().published.vfx.combat!.flightSeconds, 0.2);
  assert.equal(store.config().draft.vfx.combat!.flightSeconds, 0.35);
  assert.equal(store.config().draft.economy.winGold, 111);
  assert.equal(store.config().published.economy.winGold, 80);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions WHERE id<=?').all(state.revision), history);
  const version = store.config().version;
  assert.equal(installCombatPresentation(store).changed, false);
  assert.equal(store.config().version, version);
  assert.deepEqual(store.config().published.gameplay, state.published.gameplay);
});
