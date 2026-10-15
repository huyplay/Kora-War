import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameDatabase } from '../server/database';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultContent, validateContent } from '../src/data/content';
import { presentationOf } from '../src/data/presentation';
import { ArenaLighting } from '../src/rendering/arena-lighting';
import { TowerEffects, towerRangeBounds } from '../src/rendering/vfx/tower-effects';
import { buildEnvironment } from '../src/rendering/environment';
import type { Tower } from '../src/core/types';

test('day/night lighting uses the database profile with brighter sunlight and stronger night torches', () => {
  const c = defaultContent(),
    a = presentationOf(c).arena,
    lighting = new ArenaLighting();
  const original = structuredClone(c);
  lighting.configure(a.lighting);
  const day = {
    sky: lighting.sky.intensity,
    key: lighting.key.intensity,
    torch: lighting.torches[0].intensity,
  };
  lighting.configure({ ...a.lighting, mode: 'night' });
  assert.ok(lighting.key.intensity < day.key);
  assert.ok(lighting.sky.intensity < day.sky);
  assert.ok(lighting.torches.every((t) => t.intensity > day.torch && !t.castShadow));
  assert.equal(lighting.torches.length, 4);
  assert.deepEqual(c, original);
  lighting.dispose();
});
test('presentation validators reject invalid lighting, wall dimensions and range opacity', () => {
  const c = defaultContent();
  validateContent(c);
  for (const apply of [
    () => (c.presentation!.arena!.lighting.exposure = 9),
    () => (c.presentation!.arena!.structures.wallThicknessScale = 5),
    () => (c.presentation!.arena!.towers.projectileSeconds = -1),
  ]) {
    c.presentation = structuredClone(presentationOf(defaultContent()));
    apply();
    assert.throws(() => validateContent(c), /hiển thị/);
  }
  Object.assign(c.presentation!, { arena: null });
  assert.throws(() => validateContent(c), /ánh sáng/);
});
test('presentation schema v1 upgrades atomically to v2 without rewriting history or existing formation', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-arena-v2-'));
  let db = new GameDatabase(dir, 'qa-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const raw = db.config().published;
  delete raw.presentation!.arena;
  raw.presentation!.formation.spacing = 0.2;
  const old = JSON.stringify(raw);
  db.db.prepare('UPDATE config SET draft=?,published=? WHERE id=1').run(old, old);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(old);
  db.db
    .prepare("UPDATE rule_modules SET schema_version=1,payload=? WHERE module_id='presentation'")
    .run(JSON.stringify(raw.presentation));
  db.db
    .prepare("UPDATE rule_module_revisions SET schema_version=1,payload=? WHERE module_id='presentation'")
    .run(JSON.stringify(raw.presentation));
  db.close();
  db = new GameDatabase(dir, 'qa-password');
  assert.equal(db.config().revision, 2);
  assert.equal(db.config().published.presentation!.formation.spacing, 0.2);
  assert.equal(db.config().published.presentation!.arena!.lighting.mode, 'day');
  assert.equal(db.ruleModules.status().find((m) => m.id === 'presentation')!.schemaVersion, 2);
  assert.equal(db.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, old);
  db.restoreRevision(1, db.config().version);
  assert.ok(db.config().draft.presentation!.arena);
  db.close();
  db = new GameDatabase(dir, 'qa-password');
  assert.equal(db.config().revision, 2);
});
test('fortress scaling stays outside deployment and towers preserve separate physical foundations', () => {
  const scene = new THREE.Scene(),
    towerMeshes = new Map<string, THREE.Group>();
  const { fortresses } = buildEnvironment({ scene, towerMeshes, coreCrystals: [], baseGroups: [] });
  const a = presentationOf(defaultContent()).arena;
  for (const group of fortresses) {
    group.scale.set(a.structures.wallThicknessScale, a.structures.wallHeightScale, 1);
    const bounds = new THREE.Box3().setFromObject(group);
    assert.ok(bounds.max.y > 6.8);
    assert.ok(group.position.x < 0 ? bounds.max.x < -14.5 : bounds.min.x > 14.5);
  }
  for (const tower of towerMeshes.values()) {
    assert.ok(tower.getObjectByName('TowerPedestal'));
    assert.ok(tower.getObjectByName('TowerBody'));
  }
});
test('tower range visuals match same-lane rule bounds and hide destroyed or disabled indicators', () => {
  const fx = new TowerEffects(),
    config = presentationOf(defaultContent()).arena.towers,
    camera = new THREE.PerspectiveCamera();
  const towers: Tower[] = [{ id: '0-1', side: 0, lane: 1, x: -9, hp: 400, maxHp: 400, cooldown: 0 }];
  const original = structuredClone(towers);
  fx.update(towers, 4, 1.55, config, 0, camera);
  const zone = fx.root.getObjectByName('TowerLaneRange')!;
  const box = new THREE.Box3().setFromObject(zone),
    bounds = towerRangeBounds(-9, 0, 4, 1.55);
  assert.ok(Math.abs(box.min.x - bounds.minX) < 1e-6);
  assert.ok(Math.abs(box.max.x - bounds.maxX) < 1e-6);
  assert.ok(Math.abs(box.min.z - bounds.minZ) < 1e-6);
  assert.ok(Math.abs(box.max.z - bounds.maxZ) < 1e-6);
  fx.update(towers, 6, 1.55, config, 0, camera);
  assert.equal(zone.scale.x, 12);
  fx.update(towers, 4, 1.55, { ...config, showRange: false }, 0, camera);
  assert.equal(zone.visible, false);
  assert.deepEqual(towers, original);
  towers[0].hp = 0;
  fx.update(towers, 4, 1.55, config, 0, camera);
  assert.equal(zone.visible, false);
  fx.dispose();
});
test('tower projectiles use elevated muzzle, bounded instances, pause-safe ages and clean restart', () => {
  const fx = new TowerEffects(),
    c = presentationOf(defaultContent()).arena.towers,
    camera = new THREE.PerspectiveCamera();
  const from = new THREE.Vector3(-9, 4.1, 0),
    to = new THREE.Vector3(-6, 1.1, 0);
  for (let i = 0; i < 100; i++) fx.emit('0-1', from, to, 0, c.projectileSeconds);
  fx.update([], 4, 1.55, c, 0, camera);
  const meshes = fx.root.children.filter((o) => o instanceof THREE.InstancedMesh) as THREE.InstancedMesh[];
  assert.ok(meshes.every((m) => m.count <= 32));
  const head = meshes[0],
    matrix = new THREE.Matrix4();
  head.getMatrixAt(0, matrix);
  assert.ok(Math.abs(matrix.elements[13] - 4.1) < 1e-5);
  fx.update([], 4, 1.55, c, c.projectileSeconds * 1.2, camera);
  assert.equal(head.count, 0);
  assert.ok(meshes[2].count > 0);
  fx.reset();
  assert.ok(meshes.every((m) => m.count === 0));
  fx.dispose();
});
