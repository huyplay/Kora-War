import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fortressGates, alignFortressFrontages, GATE_CONTACT_X } from '../src/rendering/fortress-gates';
import { ARENA_WALL, buildEnvironment } from '../src/rendering/environment';

test('six reinforced gates have shared shields, six rivets and grounded thresholds in their existing lane', () => {
  const root = new THREE.Group(),
    owned = fortressGates(root, ARENA_WALL, 0x9c734a);
  root.updateMatrixWorld(true);
  const shields = new Set<THREE.BufferGeometry>(),
    rivets = new Set<THREE.BufferGeometry>();
  let count = 0;
  for (const side of root.children) {
    for (const gate of side.children.filter((o) => o.name === 'FortressGate')) {
      count++;
      assert.ok([-4.8, 0, 4.8].includes(gate.position.z));
      const badge = gate.getObjectByName('GateAetherShield') as THREE.Mesh;
      const inset = gate.getObjectByName('GateShieldInset') as THREE.Mesh;
      const gem = gate.getObjectByName('GateAetherGem') as THREE.Mesh;
      assert.ok(badge && inset && gem);
      assert.equal(badge.geometry, inset.geometry);
      shields.add(badge.geometry);
      assert.deepEqual(inset.scale.toArray(), [0.78, 0.78, 0.65]);
      assert.equal(badge.position.y, gem.position.y);
      assert.equal(
        (gem.material as THREE.MeshLambertMaterial).color.getHex(),
        side.userData.sign < 0 ? 0x63caff : 0xf47862,
      );
      const bolts = gate.children.filter((o) => o.name === 'GateRivet') as THREE.Mesh[];
      assert.equal(bolts.length, 6);
      bolts.forEach((bolt) => rivets.add(bolt.geometry));
      const threshold = gate.getObjectByName('GateThreshold')!;
      const floor = new THREE.Box3().setFromObject(threshold);
      assert.ok(Math.abs(floor.min.y) < 1e-6);
      assert.ok(
        Math.abs(floor.min.z - gate.position.z) <= 1.53 && Math.abs(floor.max.z - gate.position.z) <= 1.53,
      );
    }
  }
  assert.equal(count, 6);
  assert.equal(shields.size, 1);
  assert.equal(rivets.size, 1);
  for (const geometry of [...shields, ...rivets]) assert.ok(owned.includes(geometry));
  assert.equal(new Set(owned).size, owned.length);
  owned.forEach((g) => g.dispose());
});

test('reinforced gate silhouettes mirror between teams and remain outside the open combat field', () => {
  const root = new THREE.Group(),
    owned = fortressGates(root, ARENA_WALL, 0x9c734a);
  const [left, right] = root.children.map((side) => new THREE.Box3().setFromObject(side));
  assert.ok(Math.abs(left.min.x + right.max.x) < 1e-6);
  assert.ok(Math.abs(left.max.x + right.min.x) < 1e-6);
  // The existing pillar foot reaches x=15.4; the gates themselves keep the stricter x=15.5 clearance.
  assert.ok(left.max.x < -15.3 && right.min.x > 15.3);
  assert.ok(Math.abs(left.max.y - right.max.y) < 1e-6);
  assert.ok(Math.abs(left.min.z - right.min.z) < 1e-6 && Math.abs(left.max.z - right.max.z) < 1e-6);
  owned.forEach((g) => g.dispose());
});

test('baked reinforcement keeps shared-core contact at configured scale and all surface attributes finite', () => {
  const scene = new THREE.Scene(),
    { gateFrontages } = buildEnvironment({ scene, coreCrystals: [], baseGroups: [], towerMeshes: new Map() });
  for (const coreX of [12, 14, 16])
    for (const thickness of [1, 1.35, 1.6])
      for (const height of [1, 1.6, 2]) {
        alignFortressFrontages(gateFrontages, coreX, height, thickness);
        scene.updateMatrixWorld(true);
        for (const group of gateFrontages) {
          const sign = group.userData.sign;
          for (const z of [-4.8, 0, 4.8]) {
            const contact = group.localToWorld(new THREE.Vector3(-sign * GATE_CONTACT_X, 1.5, z));
            assert.ok(Math.abs(contact.x - sign * coreX) < 1e-9);
            assert.equal(contact.z, z);
          }
          const bounds = new THREE.Box3().setFromObject(group);
          assert.ok(sign < 0 ? bounds.max.x <= -coreX + 0.4 : bounds.min.x >= coreX - 0.4);
        }
      }
  const geometries = new Set<THREE.BufferGeometry>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.name !== 'ArenaSurfaceBatch') return;
    geometries.add(object.geometry);
    for (const key of ['position', 'normal', 'uv'])
      assert.ok([...object.geometry.getAttribute(key).array].every(Number.isFinite));
  });
  geometries.forEach((g) => g.dispose());
});
