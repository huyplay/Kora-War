import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { shadeArenaSurface } from '../src/rendering/arena-surface-shading';
import { TerrainStyle } from '../src/rendering/terrain-style';
import { ARENA_STONE, ARENA_WALL, buildEnvironment } from '../src/rendering/environment';

test('stone shading adds neutral stable seams/face contrast without changing bounds, UVs or topology', () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2),
    before = geometry.clone();
  shadeArenaSurface(geometry);
  for (const name of ['position', 'normal', 'uv'])
    assert.deepEqual(geometry.attributes[name].array, before.attributes[name].array);
  assert.deepEqual(geometry.index!.array, before.index!.array);
  const colors = geometry.getAttribute('color'),
    positions = geometry.getAttribute('position'),
    normals = geometry.getAttribute('normal');
  let top = 0,
    sideTop = 0,
    sideBottom = 0;
  for (let i = 0; i < colors.count; i++) {
    const value = colors.getX(i);
    assert.ok(Number.isFinite(value) && value >= 0.7 && value <= 1);
    assert.equal(value, colors.getY(i));
    assert.equal(value, colors.getZ(i));
    if (normals.getY(i) === 1) top = value;
    if (normals.getZ(i) === 1) {
      if (positions.getY(i) === 1) sideTop = value;
      else sideBottom = value;
    }
  }
  assert.ok(top > sideTop && sideTop > sideBottom);
  shadeArenaSurface(before);
  assert.deepEqual(colors.array, before.getAttribute('color').array);
  const adjacent = geometry.clone().translate(3, 0, 0);
  shadeArenaSurface(adjacent);
  assert.notDeepEqual(colors.array, adjacent.getAttribute('color').array);
  geometry.dispose();
  before.dispose();
  adjacent.dispose();
});

test('baked stone batches use vertex shading while architecture retains the triangle and draw budget', () => {
  const scene = new THREE.Scene(),
    terrain = new TerrainStyle();
  buildEnvironment({ scene, coreCrystals: [], baseGroups: [], towerMeshes: new Map() });
  terrain.apply(scene);
  let batches = 0,
    triangles = 0,
    shaded = 0;
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    materials.add(object.material as THREE.Material);
    if (object.name !== 'ArenaSurfaceBatch') return;
    batches++;
    triangles += object.geometry.attributes.position.count / 3;
    const colors = object.geometry.getAttribute('color');
    if (!colors) return;
    shaded++;
    assert.equal(colors.count, object.geometry.getAttribute('position').count);
    assert.ok([...colors.array].every((v) => Number.isFinite(v) && v >= 0.7 && v <= 1));
    assert.equal((object.material as THREE.MeshStandardMaterial).vertexColors, true);
  });
  assert.ok(shaded > 0);
  assert.equal(batches, 36);
  assert.equal(triangles, 32280);
  terrain.dispose();
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
});

function fixture(t: TestContext) {
  const scene = new THREE.Scene(),
    geometry = new THREE.BoxGeometry(),
    stoneOriginal = new THREE.MeshLambertMaterial({ color: ARENA_STONE[0] }),
    wallOriginal = new THREE.MeshLambertMaterial({ color: ARENA_WALL[0] });
  const stoneMesh = new THREE.Mesh(geometry, stoneOriginal),
    twin = new THREE.Mesh(geometry, stoneOriginal),
    wallMesh = new THREE.Mesh(geometry, wallOriginal);
  shadeArenaSurface(geometry);
  scene.add(stoneMesh, twin, wallMesh);
  const terrain = new TerrainStyle();
  terrain.apply(scene);
  const stone = stoneMesh.material as unknown as THREE.MeshStandardMaterial,
    wall = wallMesh.material as unknown as THREE.MeshStandardMaterial;
  const pending = new Map<
    string,
    { resolve: (texture: THREE.Texture) => void; reject: (reason: Error) => void }
  >();
  t.mock.method(
    THREE.TextureLoader.prototype,
    'loadAsync',
    (url: string) => new Promise<THREE.Texture>((resolve, reject) => pending.set(url, { resolve, reject })),
  );
  const disposals = new Map<THREE.Texture, number>();
  const resolve = (id: string) => {
    const texture = new THREE.Texture();
    disposals.set(texture, 0);
    texture.addEventListener('dispose', () => disposals.set(texture, disposals.get(texture)! + 1));
    assert.ok(pending.has(`/api/assets/${id}`), `requested ${id}`);
    pending.get(`/api/assets/${id}`)!.resolve(texture);
    return texture;
  };
  t.after(() => {
    terrain.dispose();
    geometry.dispose();
    stoneOriginal.dispose();
    wallOriginal.dispose();
    stone.dispose();
    wall.dispose();
  });
  return { terrain, stone, wall, twin, pending, resolve, disposals };
}
const binding = (assetId: string) => ({ assetId, repeat: 0.35, tint: '#c8b9a4' });

test('colored architecture and plain pedestal/metal meshes receive compatible shared material variants', () => {
  const scene = new THREE.Scene(),
    terrain = new TerrainStyle();
  const plain = new THREE.BoxGeometry(),
    shaded = plain.clone();
  shadeArenaSurface(shaded);
  const stone = new THREE.MeshLambertMaterial({ color: ARENA_STONE[0] }),
    metal = new THREE.MeshLambertMaterial({ color: 0x9c734a });
  const a = new THREE.Mesh(shaded, stone),
    b = new THREE.Mesh(plain, stone),
    twin = new THREE.Mesh(plain, stone),
    trim = new THREE.Mesh(plain, metal);
  scene.add(a, b, twin, trim);
  terrain.apply(scene);
  const material = (mesh: THREE.Mesh) => mesh.material as THREE.MeshStandardMaterial;
  assert.equal(material(a).vertexColors, true);
  for (const mesh of [b, twin, trim]) assert.equal(material(mesh).vertexColors, false);
  assert.equal(b.material, twin.material);
  assert.notEqual(a.material, b.material);
  assert.ok(material(trim).color.equals(new THREE.Color(0xb68c50)));
  const materials = new Set([a.material, b.material, twin.material, trim.material] as THREE.Material[]);
  terrain.dispose();
  materials.forEach((m) => m.dispose());
  plain.dispose();
  shaded.dispose();
  stone.dispose();
  metal.dispose();
});

test('PBR channels use the captured published tint/repeat and correct color spaces without editing inputs', async (t) => {
  const f = fixture(t),
    input = { stone: { ...binding('color'), normalAssetId: 'normal', roughnessAssetId: 'rough' } },
    before = structuredClone(input);
  const configuring = f.terrain.configure(input, 8);
  input.stone.tint = '#ff0000';
  input.stone.repeat = 2;
  const color = f.resolve('color'),
    normal = f.resolve('normal'),
    rough = f.resolve('rough');
  await configuring;
  assert.equal(f.stone, f.twin.material);
  assert.equal(f.stone.vertexColors, true);
  assert.equal(f.stone.map, color);
  assert.equal(f.stone.normalMap, normal);
  assert.equal(f.stone.roughnessMap, rough);
  assert.equal(color.colorSpace, THREE.SRGBColorSpace);
  assert.equal(normal.colorSpace, THREE.NoColorSpace);
  assert.equal(rough.colorSpace, THREE.NoColorSpace);
  for (const texture of [color, normal, rough]) {
    assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.equal(texture.wrapT, THREE.RepeatWrapping);
    assert.deepEqual(texture.repeat.toArray(), [before.stone.repeat, before.stone.repeat]);
    assert.equal(texture.anisotropy, 8);
  }
  assert.ok(f.stone.color.equals(new THREE.Color(before.stone.tint).multiplyScalar(0.88)));
  assert.equal(f.stone.normalScale.x, 0.6);
  assert.equal(input.stone.tint, '#ff0000');
  assert.equal(input.stone.repeat, 2);
});

test('replacing then removing a binding clears every old channel and restores the original fallback color', async (t) => {
  const f = fixture(t),
    original = f.stone.color.clone();
  const first = f.terrain.configure({
    stone: { ...binding('old'), normalAssetId: 'old-n', roughnessAssetId: 'old-r' },
  });
  const old = ['old', 'old-n', 'old-r'].map(f.resolve);
  await first;
  const next = f.terrain.configure({ stone: binding('new') });
  assert.equal(f.stone.map, old[0], 'keep a coherent old surface until its replacement finishes');
  const current = f.resolve('new');
  await next;
  assert.equal(f.stone.map, current);
  assert.equal(f.stone.normalMap, null);
  assert.equal(f.stone.roughnessMap, null);
  assert.equal(f.stone.normalScale.x, 1);
  old.forEach((texture) => assert.equal(f.disposals.get(texture), 1));
  await f.terrain.configure(undefined);
  assert.equal(f.stone.map, null);
  assert.ok(f.stone.color.equals(original));
  assert.equal(f.disposals.get(current), 1);
  await f.terrain.configure({ grass: binding('unused') });
  assert.ok(!f.pending.has('/api/assets/unused'));
});

test('a superseded partially loaded profile releases pending textures and cannot overwrite the newer surface', async (t) => {
  const f = fixture(t);
  const first = f.terrain.configure({ stone: { ...binding('stale'), normalAssetId: 'late' } });
  const stale = f.resolve('stale');
  await Promise.resolve();
  const next = f.terrain.configure({ stone: binding('current') });
  assert.equal(
    f.disposals.get(stale),
    1,
    'free the completed channel before the other stale channel finishes',
  );
  const current = f.resolve('current');
  await next;
  const late = f.resolve('late');
  await first;
  assert.equal(f.stone.map, current);
  assert.equal(f.stone.normalMap, null);
  assert.equal(f.disposals.get(stale), 1);
  assert.equal(f.disposals.get(late), 1);
  assert.equal(f.disposals.get(current), 0);
});

test('failed channels clear stale maps while successful channels and the other surface still commit', async (t) => {
  const f = fixture(t),
    initial = f.terrain.configure({ stone: binding('old') });
  const old = f.resolve('old');
  await initial;
  const next = f.terrain.configure({
    stone: { ...binding('missing'), normalAssetId: 'normal', roughnessAssetId: 'bad-rough' },
    wall: binding('wall'),
  });
  f.pending.get('/api/assets/missing')!.reject(new Error('404'));
  f.pending.get('/api/assets/bad-rough')!.reject(new Error('404'));
  const normal = f.resolve('normal'),
    wall = f.resolve('wall');
  await next;
  assert.equal(f.stone.map, null);
  assert.equal(f.stone.normalMap, normal);
  assert.equal(f.stone.roughnessMap, null);
  assert.equal(f.wall.map, wall);
  assert.equal(f.disposals.get(old), 1);
});

test('teardown releases active and pending textures once, disposes late arrivals and refuses new loads', async (t) => {
  const f = fixture(t),
    first = f.terrain.configure({ stone: binding('active') });
  const active = f.resolve('active');
  await first;
  const next = f.terrain.configure({ stone: { ...binding('pending'), normalAssetId: 'late' } });
  const pending = f.resolve('pending');
  await Promise.resolve();
  f.terrain.dispose();
  f.terrain.dispose();
  assert.equal(f.disposals.get(active), 1);
  assert.equal(f.disposals.get(pending), 1);
  const late = f.resolve('late');
  await next;
  assert.equal(f.disposals.get(late), 1);
  await f.terrain.configure({ stone: binding('after-dispose') });
  assert.ok(!f.pending.has('/api/assets/after-dispose'));
  for (const count of f.disposals.values()) assert.equal(count, 1);
});
