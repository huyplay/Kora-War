import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { combatEventAnchors, type CombatAnchor } from '../src/rendering/combat-anchors';
import { HeroProjectiles } from '../src/rendering/vfx/hero-projectiles';
import { World } from '../src/rendering/World';
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

test('World hero shots start and end at the displayed torso including origin height and formation scale', () => {
  const content = defaultContent();
  content.vfx.combat = profile();
  content.models.lyra = { assetId: 'qa', height: 3, yaw: 0, clips: {} };
  content.models.solan = { assetId: 'qa', height: 4, yaw: 0, clips: {} };
  const source = anchor(1, 0, 0),
    target = anchor(2, 1, 3, 'solan');
  source.position.y = 0.2;
  source.scale = 0.4;
  target.position.y = 0.5;
  target.scale = 0.7;
  const before = JSON.stringify([source, target]),
    calls: unknown[][] = [];
  const world = Object.create(World.prototype) as World;
  Object.assign(world, {
    content,
    heroProjectiles: { emit: (...args: unknown[]) => calls.push(args) },
    reducedMotion: { matches: true },
  });
  world.effect(event({}), { source, target });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    'lyra',
    new THREE.Vector3(source.position.x, 0.2 + 3 * 0.4 * 0.55, source.position.z),
    new THREE.Vector3(target.position.x, 0.5 + 4 * 0.7 * 0.55, target.position.z),
    2,
    true,
  ]);
  assert.equal(JSON.stringify([source, target]), before);
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

test('hero trails taper and fade with shared geometry; configured heads remain fully colored', () => {
  const fx = new HeroProjectiles(),
    c = profile(),
    camera = new THREE.PerspectiveCamera();
  c.size = 0.3;
  fx.configure(c);
  for (const id of ['lyra', 'vesper', 'orin']) fx.emit(id, new THREE.Vector3(), new THREE.Vector3(5, 1, 0));
  fx.update(0.05, camera);
  const shots = fx.root.children.filter((o) => o.name === 'HeroProjectile' && o.visible);
  const trails = shots.map(
    (s) => s.getObjectByName('HeroTrail') as THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>,
  );
  assert.equal(new Set(trails.map((t) => t.geometry)).size, 1);
  const geometry = trails[0].geometry,
    colors = geometry.getAttribute('color'),
    positions = geometry.getAttribute('position');
  assert.ok(geometry.parameters.radiusBottom < geometry.parameters.radiusTop);
  assert.equal(geometry.parameters.openEnded, true);
  for (let i = 0; i < colors.count; i++) assert.equal(colors.getX(i), positions.getY(i) > 0 ? 1 : 0);
  for (const [i, shot] of shots.entries()) {
    assert.equal(trails[i].scale.x, c.size * 0.32);
    assert.ok(trails[i].scale.y <= c.trailLength);
    const head = shot.children.find((o) => o.visible && o.name !== 'HeroTrail') as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicMaterial
    >;
    assert.ok([...head.geometry.getAttribute('color').array].every((v) => v === 1));
    assert.equal(head.material.color.getHexString(), c.heroes[['lyra', 'vesper', 'orin'][i]].color.slice(1));
    assert.equal(head.material.toneMapped, false);
  }
  fx.dispose();
});

test('hero target sampling stops on pause, ignores invalid points and keeps the last valid body anchor', () => {
  const fx = new HeroProjectiles(),
    camera = new THREE.PerspectiveCamera();
  fx.configure(profile());
  fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(3, 1, 0), 17);
  let calls = 0;
  const valid = new THREE.Vector3(5, 2.5, -1);
  const lookup = (id: number) => {
    calls++;
    assert.equal(id, 17);
    return valid;
  };
  for (const dt of [0, -1, NaN, Infinity]) fx.update(dt, camera, lookup);
  assert.equal(calls, 0);
  fx.update(0.05, camera, lookup);
  const shot = fx.root.children.find((o) => o.name === 'HeroProjectile' && o.visible)!;
  fx.update(0.05, camera, () => new THREE.Vector3(NaN, Infinity, 0));
  assert.ok(shot.position.toArray().every(Number.isFinite));
  fx.update(0.05, camera, () => undefined);
  fx.update(0.05, camera, () => new THREE.Vector3(0, NaN, 0));
  const hit = fx.root.children.find((o) => o.name === 'HeroImpact' && o.visible)!;
  assert.deepEqual(hit.position.toArray(), valid.toArray());
  assert.equal((hit as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>).material.depthTest, false);
  assert.deepEqual(valid.toArray(), [5, 2.5, -1]);
  fx.dispose();
});

test('reduced motion converts a flying hero shot to a static hit and never restarts that hit', () => {
  const fx = new HeroProjectiles(),
    camera = new THREE.PerspectiveCamera(),
    c = profile();
  fx.configure(c);
  fx.emit('vesper', new THREE.Vector3(), new THREE.Vector3(4, 1, 0), 21);
  fx.update(0.05, camera, () => new THREE.Vector3(5, 2, 1));
  fx.update(
    0,
    camera,
    () => {
      throw Error('paused/reduced lookup');
    },
    true,
  );
  assert.equal(fx.activeCount, 0);
  const hit = fx.root.children.find((o) => o.name === 'HeroImpact' && o.visible) as THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial
  >;
  const position = hit.position.clone(),
    scale = hit.scale.clone();
  assert.deepEqual(position.toArray(), [5, 2, 1]);
  assert.equal(hit.material.uniforms.color.value.getHexString(), c.heroes.vesper.color.slice(1));
  fx.update(0.05, camera, undefined, false);
  assert.deepEqual(hit.position, position);
  assert.deepEqual(hit.scale, scale);
  assert.equal(fx.activeCount, 0);
  const opacity = hit.material.uniforms.opacity.value;
  fx.update(0, camera);
  assert.equal(hit.material.uniforms.opacity.value, opacity);
  fx.update(0.25, camera);
  assert.equal(hit.visible, false);
  // A normal impact already expanding also freezes its current size, without a jump.
  fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(2, 1, 0));
  fx.update(0.25, camera);
  fx.update(0.05, camera);
  const before = hit.scale.clone();
  fx.update(0, camera, undefined, true);
  assert.deepEqual(hit.scale, before);
  fx.update(0.05, camera, undefined, false);
  assert.deepEqual(hit.scale, before);
  fx.reset();
  assert.ok(fx.root.children.every((o) => !o.visible));
  fx.dispose();
});

test('pooled hero shots reset a degenerate orientation and disposal rejects late work', () => {
  const fx = new HeroProjectiles(),
    c = profile(),
    camera = new THREE.PerspectiveCamera();
  c.arcHeight = 0;
  fx.configure(c);
  fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(3, 0, 0));
  const shot = fx.root.children.find((o) => o.name === 'HeroProjectile' && o.visible)!;
  assert.notDeepEqual(shot.quaternion.toArray(), [0, 0, 0, 1]);
  fx.reset();
  fx.emit('orin', new THREE.Vector3(1, 2, 3), new THREE.Vector3(1, 2, 3));
  assert.deepEqual(shot.quaternion.toArray(), [0, 0, 0, 1]);
  const resources = new Set<THREE.Material | THREE.BufferGeometry>();
  fx.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      resources.add(o.geometry);
      resources.add(o.material);
    }
  });
  let disposed = 0;
  resources.forEach((r) => r.addEventListener('dispose', () => disposed++));
  fx.dispose();
  fx.dispose();
  assert.equal(disposed, resources.size);
  fx.configure(c);
  assert.equal(fx.emit('lyra', new THREE.Vector3(), new THREE.Vector3(2, 1, 0)), false);
  fx.update(0.1, camera);
  assert.equal(fx.root.children.length, 0);
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
