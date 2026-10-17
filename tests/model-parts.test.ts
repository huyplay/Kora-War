import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelInstance } from '../src/rendering/assets/model-library';
import { visibleModelBounds, modelMaterialNames } from '../src/rendering/assets/model-parts';
import { defaultContent, validateContent } from '../src/data/content';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { inspectModelMaterials } from '../server/model-materials';
import { installModelPresentation } from '../server/model-presentation';
import { installModelAnimation } from '../server/model-animation-presentation';
import { modelPartsEditor } from '../src/admin/model-parts';
import { selectAnimationClips } from '../tools/animation-mapping';

function fixture() {
  const values = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const doc = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [0, 1].map((material) => ({ attributes: { POSITION: 0 }, material })) }],
    materials: [{ name: 'Body' }, { name: 'Poro' }],
    buffers: [{ byteLength: values.byteLength }],
    bufferViews: [{ buffer: 0, byteLength: values.byteLength }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
    ],
    animations: ['Idle', 'Walk', 'Custom'].map((name) => ({ name, samplers: [], channels: [] })),
  };
  const raw = Buffer.from(JSON.stringify(doc)),
    json = Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 32)]),
    bin = Buffer.from(values.buffer),
    out = Buffer.alloc(28 + json.length + bin.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(json.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  json.copy(out, 20);
  out.writeUInt32LE(bin.length, 20 + json.length);
  out.writeUInt32LE(0x004e4942, 24 + json.length);
  bin.copy(out, 28 + json.length);
  return out;
}
test('hidden props do not inflate height/footprint or mutate cached geometry/materials/other instances', () => {
  const source = new THREE.Group(),
    bodyMat = new THREE.MeshStandardMaterial(),
    propMat = new THREE.MeshStandardMaterial();
  bodyMat.name = 'Body';
  propMat.name = 'Poro';
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), bodyMat),
    prop = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 10), propMat);
  prop.position.x = 100;
  source.add(body, prop);
  const binding = { assetId: 'fixture', height: 2, yaw: 0, clips: {} };
  const clean = new ModelInstance(source, [], { ...binding, hiddenMaterials: ['Poro'] }),
    original = new ModelInstance(source, [], binding);
  assert.equal(clean.footprintRadius, 0.5);
  assert.equal(visibleModelBounds(clean.root).getSize(new THREE.Vector3()).y, 2);
  assert.deepEqual(modelMaterialNames(clean.model), ['Body', 'Poro']);
  assert.equal(source.children.length, 2);
  assert.equal(propMat.visible, true);
  assert.equal((original.model.children[1] as THREE.Mesh).material, propMat);
  const hidden = (clean.model.children[1] as THREE.Mesh).material as THREE.Material;
  assert.equal(hidden.visible, false);
  let disposed = 0;
  hidden.addEventListener('dispose', () => disposed++);
  clean.setHitFlash(0.5);
  clean.teamPalette(1);
  clean.dispose();
  original.dispose();
  assert.equal(disposed, 1);
  body.geometry.dispose();
  prop.geometry.dispose();
  bodyMat.dispose();
  propMat.dispose();
});
test('visible bounds handle partial material groups, invisible parents and empty scenes', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 2, 0, 100, 0, 0, 110, 0, 0, 100, 20, 0], 3),
  );
  geometry.addGroup(0, 3, 0);
  geometry.addGroup(3, 3, 1);
  const mats = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
  mats[0].name = 'Body';
  mats[1].name = 'Prop';
  const source = new THREE.Group();
  source.add(new THREE.Mesh(geometry, mats));
  const model = new ModelInstance(source, [], {
    assetId: 'test',
    height: 2,
    yaw: 0,
    clips: {},
    hiddenMaterials: ['Prop'],
  });
  assert.equal(model.footprintRadius, 0.5);
  const box = visibleModelBounds(model.root);
  assert.equal(box.getSize(new THREE.Vector3()).x, 1);
  model.root.visible = false;
  assert.ok(visibleModelBounds(model.root).getSize(new THREE.Vector3()).toArray().every(Number.isFinite));
  model.dispose();
  geometry.dispose();
  mats.forEach((m) => m.dispose());
});
test('indexed skin bounds ignore unused shared vertices and follow bones after scaling/reparenting', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 2, 0, 100, 100, 100], 3),
  );
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(16).fill(0), 4));
  geometry.setAttribute(
    'skinWeight',
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  geometry.setIndex([0, 1, 2]);
  const bone = new THREE.Bone(),
    mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  mesh.add(bone);
  mesh.bind(new THREE.Skeleton([bone]));
  const parent = new THREE.Group();
  parent.position.set(4, 0, 0);
  parent.scale.setScalar(2);
  parent.add(mesh);
  bone.position.y = 1;
  const bounds = visibleModelBounds(parent);
  assert.deepEqual(bounds.min.toArray(), [4, 2, 0]);
  assert.deepEqual(bounds.max.toArray(), [6, 6, 0]);
  assert.equal(geometry.getAttribute('position').count, 4);
  geometry.dispose();
  (mesh.material as THREE.Material).dispose();
  mesh.skeleton.dispose();
});
test('visibility config validates names and server rejects missing or completely hidden models', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-parts-')),
    store = new GameDatabase(dir, 'test');
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const content = defaultContent();
  content.models.solan = { assetId: 'test', height: 2, yaw: 0, clips: {}, hiddenMaterials: ['Poro'] };
  validateContent(content);
  content.models.solan.showcaseYaw = 361;
  assert.throws(() => validateContent(content));
  content.models.solan.showcaseYaw = 0;
  validateContent(content);
  for (const hidden of [['Poro', 'Poro'], [''], ['\n'], ['x'.repeat(201)], 'Poro']) {
    const bad = structuredClone(content);
    bad.models.solan.hiddenMaterials = hidden as string[];
    assert.throws(() => validateContent(bad));
  }
  const bytes = fixture();
  assert.deepEqual(inspectModelMaterials(bytes), ['Body', 'Poro']);
  const asset = importAsset(store, bytes, {
    name: 'Model',
    author: 'Test',
    license: 'CC0',
    sourceUrl: 'https://example.com/model',
    rightsConfirmed: true,
  });
  const state = store.config();
  state.draft.models.solan = { ...content.models.solan, assetId: asset.id };
  store.saveDraft(state.draft, state.version);
  store.publish(store.config().version);
  const revision = store.config().revision;
  for (const hidden of [['Missing'], ['Body', 'Poro']]) {
    const s = store.config();
    s.draft.models.solan.hiddenMaterials = hidden;
    store.saveDraft(s.draft, s.version);
    assert.throws(() => store.publish(store.config().version), /model|GLB/i);
    assert.equal(store.config().revision, revision);
  }
});
test('visible bounds include instance transforms and honor geometry draw ranges', () => {
  const geometry = new THREE.BoxGeometry(1, 2, 1),
    material = new THREE.MeshBasicMaterial(),
    mesh = new THREE.InstancedMesh(geometry, material, 2);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-3, 0, 0));
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(4, 1, 0));
  const box = visibleModelBounds(mesh);
  assert.deepEqual(box.min.toArray(), [-3.5, -1, -0.5]);
  assert.deepEqual(box.max.toArray(), [4.5, 2, 0.5]);
  geometry.setDrawRange(0, 0);
  assert.ok(visibleModelBounds(mesh).getSize(new THREE.Vector3()).toArray().every(Number.isFinite));
  mesh.dispose();
  geometry.dispose();
  material.dispose();
});
test('presentation installer preserves draft work, custom clip/visibility choices and historical revisions', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-polish-')),
    store = new GameDatabase(dir, 'test');
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const asset = importAsset(store, fixture(), {
    name: 'Model',
    author: 'Test',
    license: 'CC0',
    sourceUrl: 'https://example.com/model',
    rightsConfirmed: true,
  });
  const state = store.config();
  state.draft.models.solan = {
    assetId: asset.id,
    height: 2,
    yaw: 17,
    portraitYaw: 180,
    clips: { idle: 'Idle' },
  };
  store.saveDraft(state.draft, state.version);
  store.publish(store.config().version);
  const old = store.config(),
    history = store.db.prepare('SELECT * FROM revisions').all();
  old.draft.economy.winGold = 123;
  old.draft.models.solan.clips.idle = 'Custom';
  old.draft.models.solan.hiddenMaterials = [];
  store.saveDraft(old.draft, old.version);
  const updates = [
    {
      hero: 'solan',
      expectedSha256: asset.sha256,
      assetId: asset.id,
      hiddenMaterials: ['Poro'],
      showcaseYaw: { from: 180, to: 0 },
      clips: [{ state: 'idle' as const, from: 'Idle', to: 'Walk' }],
    },
  ];
  const result = installModelPresentation(store, updates);
  assert.ok(existsSync(result.backup!));
  const current = store.config();
  assert.equal(current.published.models.solan.clips.idle, 'Walk');
  assert.deepEqual(current.published.models.solan.hiddenMaterials, ['Poro']);
  assert.equal(current.published.models.solan.yaw, 17);
  assert.equal(current.published.models.solan.showcaseYaw, 0);
  assert.equal(current.published.models.solan.portraitYaw, 180);
  assert.equal(current.draft.models.solan.clips.idle, 'Custom');
  assert.deepEqual(current.draft.models.solan.hiddenMaterials, []);
  assert.equal(current.draft.economy.winGold, 123);
  assert.equal(current.published.economy.winGold, 80);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions WHERE id<=?').all(old.revision), history);
  assert.deepEqual(installModelPresentation(store, updates).changed, []);
  const before = store.config();
  assert.throws(() => installModelPresentation(store, [{ ...updates[0], assetId: 'missing' }]));
  assert.deepEqual(store.config(), before);
  before.draft.models.solan.animationAssetId = asset.id;
  before.draft.models.solan.clips.idle = 'Idle';
  store.saveDraft(before.draft, before.version);
  const custom = store.config();
  assert.deepEqual(installModelPresentation(store, updates).changed, []);
  assert.deepEqual(store.config(), custom);
});
test('normal loops win over spell/transition/homeguard animation names and admin escapes part labels', () => {
  for (const names of [
    ['Volibear_spell1_run.anm', 'Run_Homeguard', 'Run_Base'],
    ['Run_Fast', 'Run_Haste', 'Run_Base'],
  ])
    assert.equal(selectAnimationClips(names).walk, 'Run_Base');
  assert.equal(selectAnimationClips(['Run_Homeguard', 'morgana_run']).walk, 'morgana_run');
  assert.equal(selectAnimationClips(['Idle_01_In', 'Idle_01_Loop']).idle, 'Idle_01_Loop');
  const html = modelPartsEditor(['Body', 'Poro', '<script>'], ['Poro']);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /data-model-part="Poro"\s*>/);
});

test('animation installer verifies assets, preserves drafts/history and is idempotent', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-animation-')),
    store = new GameDatabase(dir, 'test');
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const asset = importAsset(store, fixture(), {
    name: 'Model',
    author: 'Test',
    license: 'CC0',
    sourceUrl: 'https://example.com/model',
    rightsConfirmed: true,
  });
  const state = store.config();
  state.draft.models.solan = {
    assetId: asset.id,
    height: 2,
    yaw: 0,
    clips: { idle: 'Idle', attack: 'Walk', cast: 'Custom' },
  };
  store.saveDraft(state.draft, state.version);
  store.publish(store.config().version);
  const old = store.config(),
    history = store.db.prepare('SELECT * FROM revisions').all();
  old.draft.models.solan.animation = { castSeconds: 1.1 };
  old.draft.economy.winGold = 123;
  store.saveDraft(old.draft, old.version);
  const update = {
    hero: 'solan',
    expectedSha256: asset.sha256,
    clips: { attack: 'Walk', cast: 'Custom' },
    animation: { attackSeconds: 0.6, castSeconds: 0.8, crossFadeSeconds: 0.1 },
  };
  const result = installModelAnimation(store, [update]);
  assert.ok(existsSync(result.backup!));
  const current = store.config();
  assert.deepEqual(current.published.models.solan.animation, update.animation);
  assert.deepEqual(current.draft.models.solan.animation, { castSeconds: 1.1 });
  assert.equal(current.draft.economy.winGold, 123);
  assert.equal(current.published.economy.winGold, 80);
  assert.deepEqual(store.db.prepare('SELECT * FROM revisions WHERE id<=?').all(old.revision), history);
  assert.deepEqual(installModelAnimation(store, [update]).changed, []);
  assert.deepEqual(store.config(), current);
  const cleared = store.config();
  delete cleared.draft.models.solan.animation;
  store.saveDraft(cleared.draft, cleared.version);
  const revision = store.config().revision;
  installModelAnimation(store, [update]);
  assert.equal(
    store.config().revision,
    revision,
    'draft-only provisioning does not publish a duplicate revision',
  );
  assert.deepEqual(store.config().draft.models.solan.animation, update.animation);
});

test('animation installer skips custom assets/clips and rolls back a failed publish', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-animation-fail-')),
    store = new GameDatabase(dir, 'test');
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const asset = importAsset(store, fixture(), {
    name: 'Model',
    author: 'Test',
    license: 'CC0',
    sourceUrl: 'https://example.com/model',
    rightsConfirmed: true,
  });
  const state = store.config();
  state.draft.models.solan = {
    assetId: asset.id,
    height: 2,
    yaw: 0,
    clips: { idle: 'Idle', attack: 'Walk', cast: 'Custom' },
  };
  store.saveDraft(state.draft, state.version);
  store.publish(store.config().version);
  const update = {
    hero: 'solan',
    expectedSha256: asset.sha256,
    clips: { attack: 'Walk', cast: 'Custom' },
    animation: { attackSeconds: 0.6, castSeconds: 0.8, crossFadeSeconds: 0.1 },
  };
  const before = store.config();
  assert.deepEqual(installModelAnimation(store, [{ ...update, expectedSha256: '0'.repeat(64) }]).changed, []);
  assert.deepEqual(
    installModelAnimation(store, [{ ...update, clips: { attack: 'Custom', cast: 'Walk' } }]).changed,
    [],
  );
  assert.deepEqual(store.config(), before);
  const publish = store.publish;
  store.publish = () => {
    throw Error('Injected publish failure');
  };
  assert.throws(() => installModelAnimation(store, [update]), /Injected/);
  store.publish = publish;
  assert.deepEqual(store.config(), before);
  assert.throws(() =>
    installModelAnimation(store, [{ ...update, animation: { ...update.animation, castSeconds: NaN } }]),
  );
  assert.deepEqual(store.config(), before);
});
