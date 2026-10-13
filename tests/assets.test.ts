import test from 'node:test';
import assert from 'node:assert/strict';
import { compactGLB } from '../tools/compact-glb';
import { inspectGLB, importAsset } from '../server/assets';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { ModelInstance } from '../src/rendering/assets/model-library';
import { GameDatabase } from '../server/database';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fixture() {
  const values = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 2, 0, 9, 9, 9, 8, 8, 8]);
  const doc = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Hero', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: values.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: values.byteLength }],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
      { bufferView: 0, byteOffset: 36, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 0, byteOffset: 44, componentType: 5126, count: 2, type: 'VEC3' },
      { bufferView: 0, byteOffset: 68, componentType: 5126, count: 2, type: 'VEC3' },
    ],
    animations: [
      {
        name: 'Idle',
        samplers: [{ input: 1, output: 2 }],
        channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
      },
      {
        name: 'Unused',
        samplers: [{ input: 1, output: 3 }],
        channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
      },
    ],
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
test('mobile GLB compaction retains loaded geometry and exact selected animation keyframes', async () => {
  const original = fixture(),
    packed = compactGLB(original, ['Idle']);
  assert.ok(packed.length < original.length);
  const loader = new GLTFLoader();
  const a = await loader.parseAsync(
    original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength) as ArrayBuffer,
    '',
  );
  const b = await loader.parseAsync(
    packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength) as ArrayBuffer,
    '',
  );
  const meshA = a.scene.getObjectByName('Hero') as THREE.Mesh,
    meshB = b.scene.getObjectByName('Hero') as THREE.Mesh;
  assert.deepEqual(
    meshB.geometry.getAttribute('position').array,
    meshA.geometry.getAttribute('position').array,
  );
  assert.equal(b.animations.length, 1);
  assert.deepEqual(b.animations[0].tracks[0].values, a.animations[0].tracks[0].values);
  assert.deepEqual(b.animations[0].tracks[0].times, a.animations[0].tracks[0].times);
  assert.equal(inspectGLB(packed).triangles, 1);
});
test('model normalization uses a wrapper so animation cannot overwrite configured height', () => {
  const source = new THREE.Group(),
    mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 200, 100), new THREE.MeshBasicMaterial());
  mesh.name = 'Hero';
  mesh.position.y = 100;
  source.add(mesh);
  const clip = new THREE.AnimationClip('Idle', 1, [
    new THREE.VectorKeyframeTrack('Hero.position', [0, 1], [0, 100, 0, 0, 110, 0]),
  ]);
  const instance = new ModelInstance(source, [clip], {
    assetId: 'fixture',
    height: 2,
    yaw: 0,
    clips: { idle: 'Idle' },
  });
  instance.tick(0.5);
  instance.root.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(instance.root).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.y - 2) < 0.001);
  assert.equal(source.children[0].position.y, 100);
  instance.dispose();
});
test('asset import stores provenance and checks rights before publication', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-assets-')),
    db = new GameDatabase(dir, 'test-password');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const meta = {
    name: 'Test model',
    author: 'Test author',
    sourceUrl: 'https://example.com/model',
    license: 'CC0',
    rightsConfirmed: true,
  };
  assert.throws(() => importAsset(db, fixture(), { ...meta, rightsConfirmed: false }), /quyền/);
  const imported = importAsset(db, fixture(), meta);
  assert.equal(imported.metadata.author, 'Test author');
  assert.match(imported.sha256, /^[a-f0-9]{64}$/);
  db.archiveAsset(imported.id, true);
  assert.equal(db.assets().length, 0);
  db.archiveAsset(imported.id, false);
  assert.equal(db.assets().length, 1);
  const c = db.config();
  c.draft.models.solan = { assetId: imported.id, height: 2, yaw: 0, clips: { idle: 'Missing' } };
  db.saveDraft(c.draft, c.version);
  assert.throws(() => db.publish(db.config().version), /Animation/);
  c.draft.models.solan.clips.idle = 'Idle';
  db.saveDraft(c.draft, db.config().version);
  assert.doesNotThrow(() => db.publish(db.config().version));
  assert.throws(() => db.archiveAsset(imported.id, true), /đang dùng/);
});
