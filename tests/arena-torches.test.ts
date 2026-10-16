import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defaultArenaPresentation } from '../src/data/arena-presentation';
import { ArenaAtmosphere } from '../src/rendering/arena-atmosphere';
import { ArenaLighting } from '../src/rendering/arena-lighting';
import { ARENA_TORCHES, TORCH_BOWL_Y, TORCH_FLAME_Y, arenaBraziers } from '../src/rendering/arena-torches';

function fixture(t: TestContext) {
  const previous = globalThis.document,
    gradient = { addColorStop() {} };
  const ink = {
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    fillRect() {},
    beginPath() {},
    arc() {},
    stroke() {},
    save() {},
    translate() {},
    rotate() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    restore() {},
    clip() {},
    strokeRect() {},
    fill() {},
    bezierCurveTo() {},
  };
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ink }),
  } as unknown as Document;
  const atmosphere = new ArenaAtmosphere(),
    lighting = new ArenaLighting(),
    camera = new THREE.PerspectiveCamera();
  const config = { ...defaultArenaPresentation().lighting, mode: 'night' as const };
  atmosphere.configure(config);
  lighting.configure(config);
  t.after(() => {
    atmosphere.dispose();
    lighting.dispose();
    globalThis.document = previous;
  });
  const sprites = (name: string) => atmosphere.root.children.filter((o) => o.name === name) as THREE.Sprite[];
  const embers = atmosphere.root.children.find(
    (o) => o instanceof THREE.InstancedMesh && o.name !== 'GateAetherSeals',
  ) as THREE.InstancedMesh;
  const update = (time: number, reduced = false, low = false) => {
    atmosphere.update(time, camera, low, reduced);
    lighting.update(time, reduced);
  };
  return { atmosphere, lighting, camera, config, sprites, embers, update };
}

test('four stepped braziers meet the floor and stay in the existing scenery footprint', () => {
  const root = new THREE.Group();
  arenaBraziers(root, [0x3e424c, 0x555a64, 0x686a72], 0x9c734a);
  assert.equal(root.children.length, 4 * 8);
  for (const { x, z } of ARENA_TORCHES) {
    const meshes = root.children.filter((o) => o.position.x === x && o.position.z === z);
    const bounds = new THREE.Box3();
    meshes.forEach((mesh) => bounds.union(new THREE.Box3().setFromObject(mesh)));
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
    assert.ok(bounds.max.y > TORCH_BOWL_Y && bounds.max.y < TORCH_FLAME_Y);
    assert.ok(bounds.max.x - bounds.min.x <= 0.77 && bounds.max.z - bounds.min.z <= 0.77);
  }
});

test('flames meet the bowl through flicker, light stays inside the flame, and all sources share anchors', (t) => {
  const f = fixture(t),
    before = structuredClone(f.config);
  assert.equal(f.sprites('BrazierFlame').length, 4);
  assert.equal(f.sprites('BrazierFlameCore').length, 4);
  assert.equal(f.sprites('BrazierHalo').length, 4);
  for (let step = 0; step < 50; step++) {
    f.update(step / 17);
    f.sprites('BrazierFlame').forEach((flame, i) => {
      const source = ARENA_TORCHES[i],
        light = f.lighting.torches[i];
      assert.equal(flame.position.x, source.x);
      assert.equal(flame.position.z, source.z);
      assert.deepEqual(light.position.toArray(), [source.x, TORCH_FLAME_Y, source.z]);
      assert.ok(Math.abs(flame.position.y - flame.scale.y * flame.center.y - TORCH_BOWL_Y) < 1e-12);
      assert.ok(light.position.y > TORCH_BOWL_Y && light.position.y < TORCH_BOWL_Y + flame.scale.y);
      assert.ok(
        light.intensity >= f.config.torchIntensity * 0.895 &&
          light.intensity <= f.config.torchIntensity * 1.105,
      );
      assert.ok(Math.abs(light.intensity / f.config.torchIntensity - flame.scale.y / 0.95) < 1e-12);
      assert.equal(light.castShadow, false);
    });
  }
  assert.deepEqual(f.config, before);
});

test('day/night and disabled torch profiles reuse resources and hide all fire including embers', (t) => {
  const f = fixture(t),
    flame = f.sprites('BrazierFlame')[0],
    halo = f.sprites('BrazierHalo')[0];
  const material = flame.material,
    texture = material.map,
    count = f.atmosphere.root.children.length;
  const night = halo.material.opacity;
  f.atmosphere.configure({ ...f.config, mode: 'day' });
  assert.ok(halo.material.opacity < night);
  f.atmosphere.configure({ ...f.config, torchIntensity: 0 });
  f.lighting.configure({ ...f.config, torchIntensity: 0 });
  f.update(4);
  assert.equal(f.embers.count, 0);
  for (const name of ['BrazierFlame', 'BrazierFlameCore', 'BrazierHalo']) {
    assert.ok(f.sprites(name).every((sprite) => !sprite.visible && sprite.material.opacity === 0));
  }
  assert.ok(f.lighting.torches.every((light) => light.intensity === 0));
  f.atmosphere.configure(f.config);
  f.lighting.configure(f.config);
  f.update(5, false, true);
  assert.equal(flame.visible, true);
  assert.equal(f.embers.count, 12);
  f.update(6);
  assert.equal(f.embers.count, 24);
  assert.equal(flame.material, material);
  assert.equal(flame.material.map, texture);
  assert.equal(f.atmosphere.root.children.length, count);
});

function snapshot(atmosphere: ArenaAtmosphere, lighting: ArenaLighting) {
  return {
    objects: atmosphere.root.children.map((object) => ({
      position: object.position.toArray(),
      scale: object.scale.toArray(),
      opacity: (object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material?.opacity,
      positions:
        object instanceof THREE.Mesh ? Array.from(object.geometry.attributes.position.array) : undefined,
      instances: object instanceof THREE.InstancedMesh ? Array.from(object.instanceMatrix.array) : undefined,
    })),
    lights: lighting.torches.map((light) => light.intensity),
  };
}

test('pause keeps fire/illumination stationary, reduced motion also freezes cloth/seals and removes airborne sparks', (t) => {
  const f = fixture(t);
  f.update(1);
  const moving = snapshot(f.atmosphere, f.lighting);
  f.update(2);
  assert.notDeepEqual(snapshot(f.atmosphere, f.lighting), moving);
  const paused = snapshot(f.atmosphere, f.lighting);
  f.update(2);
  assert.deepEqual(snapshot(f.atmosphere, f.lighting), paused);
  f.update(5, true);
  const still = snapshot(f.atmosphere, f.lighting);
  f.update(17, true);
  assert.deepEqual(snapshot(f.atmosphere, f.lighting), still);
  assert.equal(f.embers.count, 0);
  assert.ok(f.lighting.torches.every((light) => light.intensity === f.config.torchIntensity));
  f.update(18);
  assert.equal(f.embers.count, 24);
});

test('scene teardown releases shared fire textures/materials once and ignores subsequent frames', (t) => {
  const f = fixture(t),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  f.atmosphere.root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
      materials.add(object.material as THREE.Material);
      const map = (object.material as THREE.MeshBasicMaterial).map;
      if (map) textures.add(map);
    }
  });
  assert.equal(textures.size, 5);
  const disposed = new Map<string, number>();
  [...materials, ...textures].forEach((resource) =>
    resource.addEventListener('dispose', () => {
      disposed.set(resource.uuid, (disposed.get(resource.uuid) || 0) + 1);
    }),
  );
  const scene = new THREE.Scene();
  scene.add(f.atmosphere.root);
  f.atmosphere.dispose();
  f.atmosphere.dispose();
  f.atmosphere.configure(f.config);
  f.atmosphere.update(2, f.camera, false);
  assert.equal(f.atmosphere.root.parent, null);
  assert.equal(f.atmosphere.root.children.length, 0);
  for (const resource of [...materials, ...textures]) assert.equal(disposed.get(resource.uuid), 1);
});
