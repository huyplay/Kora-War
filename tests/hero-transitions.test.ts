import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FallenHeroes, heroEntrance } from '../src/rendering/animation/hero-transitions';
import { ModelInstance } from '../src/rendering/assets/model-library';

test('modern entrance eases near full size and fades in; reduced motion and legacy keep their intended paths', () => {
  let previous = { scale: 0, visibility: 0 };
  for (const age of [0, 0.05, 0.1, 0.2, 0.3, 1]) {
    const pose = heroEntrance(5 + age, 5, false, true);
    assert.ok(pose.scale >= 0.88 && pose.scale <= 1 && pose.scale >= previous.scale);
    assert.ok(pose.visibility >= previous.visibility && pose.visibility <= 1);
    assert.deepEqual(heroEntrance(5 + age, 5, true, true), { scale: 1, visibility: 1 });
    previous = pose;
  }
  assert.deepEqual(heroEntrance(6, 5, false, true), { scale: 1, visibility: 1 });
  assert.deepEqual(heroEntrance(5, 5, false, false), { scale: 0.15, visibility: 1 });
  assert.deepEqual(heroEntrance(5, 5, true, false), { scale: 0.15, visibility: 1 });
  assert.deepEqual(heroEntrance(NaN, 0, false, true), { scale: 1, visibility: 1 });
});

function fallen() {
  const root = new THREE.Group(),
    ring = new THREE.Group(),
    plays: string[] = [],
    coverage: number[] = [];
  ring.name = 'UnitTeamRing';
  root.add(ring);
  return {
    root,
    ring,
    plays,
    coverage,
    ticks: 0,
    disposed: 0,
    play(name: string) {
      plays.push(name);
    },
    tick(dt: number) {
      this.ticks += dt;
    },
    setHitFlash() {},
    setVisibility(value: number) {
      coverage.push(value);
    },
    dispose() {
      this.disposed++;
      root.removeFromParent();
    },
  };
}

test('fallen model keeps the configured death clip, loses its live-team ring, fades before retirement and pauses', () => {
  const pool = new FallenHeroes(),
    model = fallen(),
    scene = new THREE.Scene();
  assert.equal(pool.add(model, scene, true, false), true);
  assert.equal(model.root.parent, scene);
  assert.equal(model.ring.parent, null);
  assert.deepEqual(model.plays, ['death']);
  pool.update(0.7);
  const opacity = model.coverage.at(-1)!;
  assert.ok(opacity > 0 && opacity < 1);
  const ticks = model.ticks;
  pool.update(0);
  pool.update(NaN);
  pool.update(-1);
  pool.update(Infinity);
  assert.equal(model.ticks, ticks);
  assert.equal(model.coverage.at(-1), opacity);
  pool.update(0.2);
  assert.ok(model.coverage.at(-1)! < opacity);
  pool.update(0.21);
  assert.equal(pool.activeCount, 0);
  assert.equal(model.disposed, 1);
  pool.reset();
  pool.dispose();
  assert.equal(model.disposed, 1);
});

test('reduced motion suppresses or freezes death pose without stopping expiry or restarting when toggled off', () => {
  const pool = new FallenHeroes(),
    scene = new THREE.Scene(),
    first = fallen(),
    second = fallen();
  pool.add(first, scene, true, true);
  pool.update(0.2);
  assert.deepEqual(first.plays, []);
  assert.equal(first.ticks, 0);
  pool.add(second, scene, true, false);
  pool.update(0.2);
  const pose = second.ticks;
  pool.update(0.1, true);
  pool.update(0.2, false);
  assert.equal(second.ticks, pose);
  assert.equal(first.ticks, 0);
  pool.update(2);
  assert.equal(first.disposed, 1);
  assert.equal(second.disposed, 1);
});

test('corpse ownership is bounded, resettable and teardown-safe; historical content skips the new fade', () => {
  const pool = new FallenHeroes(),
    scene = new THREE.Scene(),
    models = Array.from({ length: 20 }, fallen);
  for (const model of models) pool.add(model, scene, false, true);
  assert.equal(pool.activeCount, 12);
  assert.equal(scene.children.length, 12);
  assert.ok(models.slice(12).every((model) => model.disposed === 1));
  pool.update(0.8, true);
  assert.ok(models.slice(0, 12).every((model) => model.coverage.length === 0 && model.ticks === 0.8));
  pool.reset();
  assert.equal(scene.children.length, 0);
  assert.ok(models.every((model) => model.disposed === 1));
  pool.dispose();
  pool.dispose();
  const late = fallen();
  pool.add(late, scene, true, false);
  pool.update(1);
  assert.equal(late.disposed, 1);
  assert.equal(pool.activeCount, 0);
});

function modelFixture() {
  const source = new THREE.Group(),
    texture = new THREE.Texture(),
    material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.25, roughness: 0.8 });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = '//source-hook\n' + shader.fragmentShader;
  };
  material.customProgramCacheKey = () => 'fixture-source';
  source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material));
  const binding = { assetId: 'fixture', height: 2, yaw: 0, clips: {} };
  return {
    source,
    material,
    texture,
    a: new ModelInstance(source, [], binding),
    b: new ModelInstance(source, [], binding),
  };
}
function compile(material: THREE.Material) {
  const shader = {
    uniforms: {},
    vertexShader: '',
    fragmentShader:
      '#include <common>\n#include <map_fragment>\n#include <emissivemap_fragment>\n#include <alphatest_fragment>\n#include <opaque_fragment>',
  };
  material.onBeforeCompile(
    shader as Parameters<THREE.Material['onBeforeCompile']>[0],
    {} as THREE.WebGLRenderer,
  );
  return shader as typeof shader & { uniforms: Record<string, { value: number }> };
}

test('dither fade shares textures and preserves alpha-test/source hooks, isolates instances and reuses hit materials', () => {
  const { a, b, material, texture } = modelFixture();
  a.setVisibility(0.5);
  const own = (a.model.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
  assert.notEqual(own, material);
  assert.equal(own.map, texture);
  assert.equal(own.alphaTest, 0.25);
  assert.equal(own.transparent, false);
  assert.equal(own.depthWrite, material.depthWrite);
  assert.equal((b.model.children[0] as THREE.Mesh).material, material);
  const shader = compile(own);
  assert.match(shader.fragmentShader, /source-hook/);
  assert.match(shader.fragmentShader, /gl_FragCoord/);
  assert.match(shader.fragmentShader, /#include <alphatest_fragment>/);
  assert.equal(shader.uniforms.koraVisibility.value, 0.5);
  a.setHitFlash(0.6);
  assert.equal((a.model.children[0] as THREE.Mesh).material, own);
  assert.equal(shader.uniforms.koraImpact.value, 0.6);
  a.setVisibility(1);
  assert.equal(shader.uniforms.koraVisibility.value, 1);
  a.setVisibility(NaN);
  assert.equal(shader.uniforms.koraVisibility.value, 1);
  assert.equal(material.opacity, 1);
  assert.equal(material.map, texture);
  let disposed = 0;
  own.addEventListener('dispose', () => disposed++);
  a.dispose();
  a.dispose();
  a.setVisibility(0);
  a.setHitFlash(1);
  a.play('death');
  a.tick(1);
  assert.equal(disposed, 1);
  b.dispose();
});

test('fade after a hit or a team-palette shader does not clone shared resources a second time', () => {
  const { a, b } = modelFixture();
  a.teamPalette(1);
  a.setHitFlash(0.5);
  const own = (a.model.children[0] as THREE.Mesh).material as THREE.Material;
  a.setVisibility(0.25);
  assert.equal((a.model.children[0] as THREE.Mesh).material, own);
  const shader = compile(own);
  assert.equal(shader.uniforms.koraVisibility.value, 0.25);
  assert.match(shader.fragmentShader, /diffuseColor.b>diffuseColor.r/);
  assert.match(shader.fragmentShader, /totalEmissiveRadiance.b/);
  b.setVisibility(1);
  a.dispose();
  b.dispose();
});
