import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TowerHealthBars } from '../src/rendering/tower-health';
import type { Tower } from '../src/core/types';

function fixture() {
  const writes: string[] = [],
    textures: THREE.Texture[] = [];
  const bars = new TowerHealthBars(() => {
    const texture = new THREE.Texture();
    textures.push(texture);
    return { texture, write: (text) => writes.push(text) };
  });
  const camera = new THREE.PerspectiveCamera(30, 844 / 390, 0.1, 180);
  camera.position.set(0, 29, 35);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const towers: Tower[] = [
    { id: '0-0', side: 0, lane: 0, x: -9, hp: 400, maxHp: 400, cooldown: 0 },
    { id: '1-2', side: 1, lane: 2, x: 9, hp: 800, maxHp: 800, cooldown: 0 },
  ];
  const update = (dt = 0) => bars.update(towers, 4.2, dt, camera, 390);
  return { bars, camera, towers, writes, textures, update };
}
test('tower bars read authoritative HP, hold damage trails while paused, hide destroyed towers and reset cleanly', () => {
  const f = fixture(),
    before = structuredClone(f.towers);
  f.update();
  assert.deepEqual(f.towers, before);
  const a = f.bars.root.children[0] as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  assert.equal(a.userData.health, '400 / 400');
  assert.equal(f.writes.length, 2);
  f.update();
  assert.equal(f.writes.length, 2, 'unchanged health never uploads another label');
  f.towers[0].hp = 200;
  f.update();
  assert.equal(a.userData.health, '200 / 400');
  assert.equal(a.material.uniforms.hp.value, 0.5);
  assert.equal(a.material.uniforms.trail.value, 1);
  for (let i = 0; i < 10; i++) f.update();
  assert.equal(a.material.uniforms.trail.value, 1);
  f.update(0.4);
  f.update(0.3);
  assert.ok(a.material.uniforms.trail.value > 0.5 && a.material.uniforms.trail.value < 1);
  f.update(1);
  assert.equal(a.material.uniforms.trail.value, 0.5);
  f.towers[0].hp = 0;
  f.update();
  assert.equal(a.visible, false);
  f.bars.reset();
  assert.ok(f.bars.root.children.every((m) => !m.visible));
  f.towers[0].hp = 400;
  f.update();
  assert.equal(a.visible, true);
  assert.equal(a.material.uniforms.trail.value, 1);
  assert.equal(f.textures.length, 6, 'fixed-size label pool survives restarts');
  f.bars.dispose();
});
test('tower labels maintain readable pixel width across lanes and optical zoom and follow configured tower height', () => {
  const f = fixture();
  for (const zoom of [1, 1.85]) {
    f.camera.zoom = zoom;
    f.camera.updateProjectionMatrix();
    f.update();
    f.bars.root.updateMatrixWorld(true);
    for (const child of f.bars.root.children.filter((m) => m.visible)) {
      const a = child.localToWorld(new THREE.Vector3(-0.5, 0, 0)).project(f.camera),
        b = child.localToWorld(new THREE.Vector3(0.5, 0, 0)).project(f.camera);
      assert.ok(Math.abs(((b.x - a.x) * 844) / 2 - 72) < 1e-5);
      assert.equal(child.position.y, 5.05);
    }
  }
  f.bars.dispose();
});
