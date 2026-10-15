import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ArenaBackdrop } from '../src/rendering/arena-backdrop';
import { defaultContent, validateContent, assetReferences } from '../src/data/content';

test('valley background binding and vertical scenery positions validate and protect asset references', () => {
  const c = defaultContent();
  c.map.backdropAssetId = 'valley';
  c.map.backdropCrop = 0.65;
  c.map.props = [{ assetId: 'cliff', x: 21, z: 11, y: -4.6, scale: 4.4, yaw: 0 }];
  validateContent(c);
  assert.ok(assetReferences(c).includes('valley'));
  c.map.backdropCrop = 2;
  assert.throws(() => validateContent(c), /Map/);
  c.map.backdropCrop = 0.65;
  const before = JSON.stringify(c);
  delete c.map.props[0].y;
  delete c.map.backdropAssetId;
  validateContent(c);
  Object.assign(c, JSON.parse(before));
  c.map.props[0].y = Infinity;
  assert.throws(() => validateContent(c), /Prop/);
  c.map.props[0].y = -4.6;
  c.map.props[0].tint = 'bad-color';
  assert.throws(() => validateContent(c), /Prop/);
  c.map.props[0].tint = '#807569';
  c.map.backdropAssetId = '../../outside';
  assert.throws(() => validateContent(c), /Asset/);
});
test('backdrop covers wide/narrow viewports across zoom, grades night and preserves missing-image fallback', async () => {
  const backdrop = new ArenaBackdrop(),
    texture = new THREE.Texture();
  texture.image = { width: 2172, height: 724 };
  await backdrop.configure('valley', false, async (url) => {
    assert.equal(url, '/api/assets/valley');
    return texture;
  });
  assert.equal(backdrop.root.visible, true);
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  const camera = new THREE.PerspectiveCamera(30, 2.2, 0.1, 180);
  camera.position.set(0, 29, 35);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  for (const aspect of [1.5, 3.5])
    for (const zoom of [1, 1.85]) {
      camera.aspect = aspect;
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      backdrop.update(camera);
      backdrop.root.updateMatrixWorld(true);
      const a = backdrop.root.localToWorld(new THREE.Vector3(-0.5, -0.5, 0)).project(camera),
        b = backdrop.root.localToWorld(new THREE.Vector3(0.5, 0.5, 0)).project(camera);
      assert.ok(a.x <= -1 + 1e-6 && a.y <= -1 + 1e-6 && b.x >= 1 - 1e-6 && b.y >= 1 - 1e-6);
    }
  await backdrop.configure('night', true, async () => new THREE.Texture(), 0.65);
  assert.equal(backdrop.root.material.map!.repeat.y, 0.65);
  assert.notEqual(backdrop.root.material.color.getHex(), 0xffffff);
  await backdrop.configure('missing', false, async () => {
    throw new Error('offline');
  });
  assert.equal(backdrop.root.visible, false);
  backdrop.dispose();
});
test('an older image load cannot replace or leak over a newer background or disposed renderer', async () => {
  const backdrop = new ArenaBackdrop(),
    old = new THREE.Texture(),
    current = new THREE.Texture();
  let resolve!: (texture: THREE.Texture) => void;
  let disposed = 0;
  old.addEventListener('dispose', () => disposed++);
  const loading = backdrop.configure('old', false, () => new Promise((r) => (resolve = r)));
  await backdrop.configure('current', false, async () => current);
  resolve(old);
  await loading;
  assert.equal(backdrop.root.material.map, current);
  assert.equal(disposed, 1);
  backdrop.dispose();
});
