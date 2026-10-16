import test from 'node:test';
import assert from 'node:assert/strict';
import { SpellEffects } from '../src/rendering/vfx/spell-effects';
import { tacticalBattle } from '../src/core/tactical';
import { defaultContent } from '../src/data/content';
import { DEFAULT_DECK } from '../src/data/heroes';
import type { SpellZone } from '../src/core/systems/spells';
import * as THREE from 'three';
import { defaultGameplay } from '../src/data/gameplay';
import { LANES } from '../src/data/map';
import { SPELLS } from '../src/data/spells';
import { spellAffectsUnit } from '../src/core/physics/spell-area';
import { SpellAimPreview } from '../src/rendering/spell-aim-preview';
import { defaultVfxReadability } from '../src/data/vfx-readability';

function units() {
  const b = tacticalBattle(DEFAULT_DECK, ['fire', 'ice'], defaultContent(), 1, DEFAULT_DECK);
  b.start();
  b.mana = [100, 100];
  b.play(0, 'solan', 1);
  b.play(1, 'solan', 1);
  b.cooldowns[1] = {};
  b.play(1, 'solan', 0);
  b.units.forEach((unit) => (unit.x = 0));
  return b.units;
}
const fire: SpellZone = { id: 10, spellId: 'fire', side: 0, lane: 1, x: 0, starts: 0.7, ends: 3.7 };

test('status shells follow formation scale while the damaging zone keeps its gameplay radius', () => {
  const effects = new SpellEffects(),
    targets = units();
  const before = structuredClone(targets);
  try {
    effects.update([fire], targets, 1, 1, () => ({ x: 4, z: 0.4, scale: 0.3 }));
    const status = effects.root.getObjectByName(`spell-status-${targets[1].id}`)!;
    const zone = effects.root.getObjectByName('spell-zone-10')!;
    assert.deepEqual(status.scale.toArray(), [0.3, 0.3, 0.3]);
    assert.equal(status.position.x, 4);
    assert.equal(zone.position.x, fire.x);
    assert.deepEqual(zone.scale.toArray(), [1, 1, 1]);
    effects.update([fire], targets, 1, 1);
    assert.deepEqual(status.scale.toArray(), [1, 1, 1], 'fallback must not retain old packed scale');
    assert.deepEqual(targets, before);
  } finally {
    effects.dispose();
  }
});

test('spell atlas load after disposal releases its frames and cannot resurrect effects', async () => {
  const previous = THREE.TextureLoader.prototype.loadAsync;
  let resolve!: (texture: THREE.Texture) => void;
  THREE.TextureLoader.prototype.loadAsync = () =>
    new Promise((done) => {
      resolve = done;
    });
  const effects = new SpellEffects();
  try {
    const profile = defaultContent().vfx;
    profile.spellSprites = { fire: { assetId: 'flame', columns: 8, rows: 1, fps: 8 } };
    const loading = effects.configure(profile);
    effects.dispose();
    const texture = new THREE.Texture();
    texture.image = { width: 1024, height: 128 };
    let disposed = 0;
    texture.addEventListener('dispose', () => disposed++);
    resolve(texture);
    await loading;
    assert.equal(disposed, 1);
    assert.equal(effects.root.children.length, 0);
    assert.equal((effects as unknown as { atlases: Map<string, unknown> }).atlases.size, 0);
  } finally {
    THREE.TextureLoader.prototype.loadAsync = previous;
    effects.dispose();
  }
});

test('Fire shows flames only after warning and marks only enemies inside the active zone', () => {
  const effects = new SpellEffects(),
    targets = units();
  const before = structuredClone(targets);
  effects.update([fire], targets, 0.65, 1);
  const zone = effects.root.getObjectByName('spell-zone-10')!;
  assert.equal(zone.getObjectByName('spell-zone-10-flames')!.visible, false);
  assert.equal(effects.root.children.length, 1);
  effects.update([fire], targets, 0.7, 2);
  assert.equal(zone.getObjectByName('spell-zone-10-flames')!.visible, true);
  assert.equal(effects.root.getObjectByName(`spell-status-${targets[0].id}`), undefined);
  assert.equal(effects.root.getObjectByName(`spell-status-${targets[2].id}`), undefined);
  assert.equal(
    effects.root.getObjectByName(`spell-status-${targets[1].id}`)!.getObjectByName('burn')!.visible,
    true,
  );
  targets[1].x = 3;
  effects.update([fire], targets, 1, 3);
  assert.equal(effects.root.getObjectByName(`spell-status-${targets[1].id}`), undefined);
  targets[1].x = 0;
  assert.deepEqual(targets, before, 'the renderer cannot change combat state');
  effects.update([], targets, 3.7, 4);
  assert.equal(effects.root.children.length, 0);
  effects.dispose();
});

test('ice visuals persist after the instant spell zone disappears, expire with the slow and clean dead units', () => {
  const effects = new SpellEffects(),
    targets = units();
  const enemy = targets[1];
  enemy.slowFactor = 0.6;
  enemy.slowUntil = 2.4;
  effects.update([], targets, 0.4, 1);
  const status = effects.root.getObjectByName(`spell-status-${enemy.id}`)!;
  assert.equal(status.getObjectByName('frost')!.visible, true);
  assert.equal(status.getObjectByName('FreezeShell')!.visible, false);
  assert.equal(status.getObjectByName('FreezeShards')!.visible, false);
  assert.equal(status.getObjectByName('ChillRing')!.visible, true);
  assert.equal(status.getObjectByName('burn')!.visible, false);
  effects.update([], targets, 2.39, 2);
  assert.equal(effects.root.children.length, 1);
  effects.update([], targets, 2.4, 3);
  assert.equal(effects.root.children.length, 0);
  effects.update([], targets, 1, 4);
  enemy.hp = 0;
  effects.update([], targets, 1.1, 5);
  assert.equal(effects.root.children.length, 0);
  effects.dispose();
});

test('match reset removes all spell visuals and repeated battles release their zone materials', () => {
  const effects = new SpellEffects(),
    targets = units();
  let disposals = 0;
  for (let i = 0; i < 3; i++) {
    effects.update([fire], targets, 1, 1);
    const zone = effects.root.getObjectByName('spell-zone-10')!;
    const area = zone.getObjectByName('spell-zone-10-area') as THREE.Mesh;
    area.geometry.addEventListener('dispose', () => disposals++);
    (area.material as THREE.Material).addEventListener('dispose', () => disposals++);
    effects.reset();
    assert.equal(effects.root.children.length, 0);
  }
  assert.equal(disposals, 6);
  effects.dispose();
  assert.equal(disposals, 6);
});
test('freeze, haste and weaken visuals expire independently without mutating combat state', () => {
  const effects = new SpellEffects(),
    targets = units(),
    target = targets[1];
  target.frozenUntil = 2;
  target.slowUntil = 2.5;
  target.slowFactor = 0.6;
  target.hasteUntil = 3;
  target.weakenUntil = 4;
  const before = structuredClone(targets);
  effects.update([], targets, 1, 1);
  const status = effects.root.getObjectByName(`spell-status-${target.id}`)!;
  assert.equal(status.getObjectByName('frost')!.visible, true);
  assert.equal(status.getObjectByName('FreezeShell')!.visible, true);
  assert.equal(status.getObjectByName('FreezeShards')!.visible, true);
  assert.equal(status.getObjectByName('ChillRing')!.visible, false);
  assert.equal(status.getObjectByName('haste')!.visible, true);
  assert.equal(status.getObjectByName('weaken')!.visible, true);
  effects.update([], targets, 2, 2);
  assert.equal(status.getObjectByName('frost')!.visible, true);
  assert.equal(status.getObjectByName('FreezeShell')!.visible, false);
  assert.equal(status.getObjectByName('FreezeShards')!.visible, false);
  assert.equal(status.getObjectByName('ChillRing')!.visible, true);
  assert.equal(status.getObjectByName('haste')!.visible, true);
  effects.update([], targets, 3, 3);
  assert.equal(status.getObjectByName('haste')!.visible, false);
  assert.equal(status.getObjectByName('weaken')!.visible, true);
  effects.update([], targets, 4, 4);
  assert.equal(effects.root.children.length, 0);
  assert.deepEqual(targets, before);
  effects.dispose();
});

test('every warning and active spell footprint matches aiming, configured radius and full lane corners', () => {
  const effects = new SpellEffects(),
    aim = new SpellAimPreview();
  const config = defaultGameplay();
  config.board.halfWidth = 1.1;
  const zones = Object.keys(SPELLS).map((id, i): SpellZone => {
    const spellId = id as SpellZone['spellId'];
    config.spells[spellId].radius = 0.5 + i * 0.4;
    config.spells[spellId].color = '#cc44aa';
    return { id: i, spellId, side: (i % 2) as 0 | 1, lane: i % 3, x: i - 4, starts: 1, ends: 5 };
  });
  const before = JSON.stringify({ config, zones });
  try {
    effects.setConfig(config);
    effects.update(zones, [], 0.5, 0.5);
    effects.root.updateMatrixWorld(true);
    for (const zone of zones) {
      const spell = config.spells[zone.spellId];
      const area = effects.root.getObjectByName(`spell-zone-${zone.id}-area`) as THREE.Mesh<
        THREE.PlaneGeometry,
        THREE.ShaderMaterial
      >;
      const bounds = new THREE.Box3().setFromObject(area);
      assert.ok(Math.abs(bounds.min.x - (zone.x - spell.radius)) < 1e-6);
      assert.ok(Math.abs(bounds.max.x - (zone.x + spell.radius)) < 1e-6);
      assert.ok(Math.abs(bounds.min.z - (LANES[zone.lane] - config.board.halfWidth)) < 1e-6);
      assert.ok(Math.abs(bounds.max.z - (LANES[zone.lane] + config.board.halfWidth)) < 1e-6);
      aim.update(zone, spell, config.board, [], () => undefined);
      assert.deepEqual(area.scale.toArray(), aim.area.scale.toArray());
      assert.equal(area.material.uniforms.color.value.getHex(), 0xcc44aa);
      assert.equal(area.material.uniforms.fillOpacity.value, 0.04);
      assert.equal(area.material.toneMapped, false);
    }
    const areas = effects.root.children.map((g) => g.children[0]);
    effects.update(zones, [], 1, 1);
    assert.deepEqual(
      effects.root.children.map((g) => g.children[0]),
      areas,
      'warning and active reuse the same footprint',
    );
    for (const area of areas as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[]) {
      assert.equal(area.material.uniforms.strength.value, 1);
      assert.equal(area.material.uniforms.fillOpacity.value, 0.14);
    }
    assert.equal(JSON.stringify({ config, zones }), before);
  } finally {
    aim.dispose();
    effects.dispose();
  }
});

test('burn markers use the shared membership for either side, target mode and exact boundaries', () => {
  const template = units()[0];
  for (const side of [0, 1] as const)
    for (const target of ['enemy', 'ally', 'all'] as const) {
      const effects = new SpellEffects(),
        config = defaultGameplay();
      Object.assign(config.spells.fire, { target, radius: 0.75 });
      const zone = { ...fire, side, x: 2 };
      const targets = ([0, 1] as const).flatMap((unitSide) =>
        [1.25, 2.75, 2.75 + 1e-10].map((x, i) => ({ ...template, id: unitSide * 10 + i, side: unitSide, x })),
      );
      targets.push({ ...template, id: 30, side, x: 2, hp: 0 }, { ...template, id: 31, side, lane: 2, x: 2 });
      const before = structuredClone(targets);
      try {
        effects.setConfig(config);
        effects.update([zone], targets, 0.69, 0.69);
        assert.equal(effects.root.children.length, 1, 'warning has no burn markers');
        effects.update([zone], targets, 0.7, 0.7);
        for (const unit of targets)
          assert.equal(
            !!effects.root.getObjectByName(`spell-status-${unit.id}`),
            spellAffectsUnit(unit, zone, config.spells.fire),
          );
        assert.deepEqual(targets, before);
        targets.forEach((u) => (u.x = 99));
        effects.update([zone], targets, 0.8, 0.8);
        assert.equal(
          effects.root.children.length,
          1,
          'stationary aim cannot retain a burn after a unit leaves',
        );
        targets.forEach((u) => (u.x = 2));
        effects.update([zone], targets, zone.ends, zone.ends);
        assert.equal(effects.root.children.length, 1, 'expired damage has no burn markers');
      } finally {
        effects.dispose();
      }
    }
});

test('fire cones and atlas centers scale with tiny, regular and wide configured footprints', async () => {
  const previous = THREE.TextureLoader.prototype.loadAsync;
  THREE.TextureLoader.prototype.loadAsync = async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 128, height: 128 };
    return texture;
  };
  const effects = new SpellEffects();
  try {
    const profile = defaultContent().vfx;
    profile.spellSprites = { fire: { assetId: 'flame', columns: 1, rows: 1, fps: 8 } };
    await effects.configure(profile);
    for (const [radius, halfWidth] of [
      [0.05, 0.05],
      [2, 1.55],
      [28, 1.7],
    ]) {
      const config = defaultGameplay();
      config.spells.fire.radius = radius;
      config.spells.fire.color = '#aa3311';
      config.board.halfWidth = halfWidth;
      effects.setConfig(config);
      effects.update([fire], [], 1, 1);
      const flames = effects.root.getObjectByName('spell-zone-10-flames')!;
      const cones = flames.children[0] as THREE.InstancedMesh;
      assert.equal(cones.count, 18);
      assert.equal((cones.material as THREE.MeshBasicMaterial).color.getHex(), 0xaa3311);
      const matrix = new THREE.Matrix4(),
        scale = new THREE.Vector3();
      for (let i = 0; i < cones.count; i++) {
        cones.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        assert.ok(Math.abs(matrix.elements[12]) + scale.x <= radius + 1e-6);
        assert.ok(Math.abs(matrix.elements[14]) + scale.z <= halfWidth + 1e-6);
      }
      const sprites = flames.children.filter((o) => o instanceof THREE.Sprite) as THREE.Sprite[];
      assert.equal(sprites.length, 3);
      for (const sprite of sprites) {
        assert.ok(Math.abs(sprite.position.x) + sprite.scale.x / 2 < radius);
        assert.ok(sprite.scale.x <= halfWidth * 1.4 + 1e-6);
      }
    }
  } finally {
    THREE.TextureLoader.prototype.loadAsync = previous;
    effects.dispose();
  }
});

test('zone removal and config reset dispose owned planes while reduced motion freezes presentation only', () => {
  const effects = new SpellEffects(),
    config = defaultGameplay();
  try {
    effects.setConfig(config);
    effects.update([fire], [], 0.6, 0.6, undefined, { reducedMotion: true });
    const area = effects.root.getObjectByName('spell-zone-10-area') as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.ShaderMaterial
    >;
    const strength = area.material.uniforms.strength.value;
    assert.equal(strength, 0.55, 'reduced-motion warning keeps a readable static edge');
    effects.update([fire], [], 0.6, 999, undefined, { reducedMotion: true });
    assert.equal(area.material.uniforms.strength.value, strength);
    assert.equal(effects.root.getObjectByName('spell-zone-10-flames')!.visible, false);
    effects.update([fire], [], 0.7, 999, undefined, { reducedMotion: true });
    assert.equal(
      effects.root.getObjectByName('spell-zone-10-flames')!.visible,
      true,
      'activation still follows authoritative snapshot time',
    );
    let geometryDisposals = 0,
      materialDisposals = 0;
    area.geometry.addEventListener('dispose', () => geometryDisposals++);
    area.material.addEventListener('dispose', () => materialDisposals++);
    effects.update([], [], 4, 4);
    effects.reset();
    assert.equal(geometryDisposals, 1);
    assert.equal(materialDisposals, 1);
    effects.update([fire], [], 1, 1);
    const nextArea = effects.root.getObjectByName('spell-zone-10-area') as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.ShaderMaterial
    >;
    nextArea.geometry.addEventListener('dispose', () => geometryDisposals++);
    nextArea.material.addEventListener('dispose', () => materialDisposals++);
    effects.setConfig({ ...config, board: { ...config.board, halfWidth: 0.75 } });
    assert.equal(effects.root.children.length, 0);
    assert.equal(geometryDisposals, 2);
    assert.equal(materialDisposals, 2);
    effects.update([fire], [], 1, 1);
    assert.equal((effects.root.getObjectByName('spell-zone-10-area') as THREE.Mesh).scale.y, 1.5);
  } finally {
    effects.dispose();
  }
});

test('spell atlases use published readability opacity/blend, preserve legacy and can hide sprites without hiding the zone', async () => {
  const previous = THREE.TextureLoader.prototype.loadAsync;
  THREE.TextureLoader.prototype.loadAsync = async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 128, height: 128 };
    return texture;
  };
  const effects = new SpellEffects();
  try {
    const profile = defaultContent().vfx;
    profile.spellSprites = { fire: { assetId: 'flame', columns: 1, rows: 1, fps: 8 } };
    delete profile.readability;
    await effects.configure(profile);
    effects.update([fire], [], 1, 1);
    let sprites = effects.root
      .getObjectByName('spell-zone-10-flames')!
      .children.filter((o) => o instanceof THREE.Sprite) as THREE.Sprite[];
    assert.equal(sprites[0].material.blending, THREE.AdditiveBlending);
    assert.equal(sprites[0].material.opacity, 1);
    profile.readability = defaultVfxReadability();
    Object.assign(profile.readability.events.skill, { opacity: 0.25, blend: 'normal' });
    await effects.configure(profile);
    effects.update([fire], [], 1, 1);
    sprites = effects.root
      .getObjectByName('spell-zone-10-flames')!
      .children.filter((o) => o instanceof THREE.Sprite) as THREE.Sprite[];
    assert.equal(sprites[0].material.blending, THREE.NormalBlending);
    assert.equal(sprites[0].material.opacity, 0.25);
    assert.equal(sprites[0].material.toneMapped, false);
    let disposals = 0;
    sprites.forEach((s) => s.material.addEventListener('dispose', () => disposals++));
    profile.readability.events.skill.opacity = 0;
    await effects.configure(profile);
    effects.update([fire], [], 1, 1);
    assert.equal(disposals, 3);
    assert.equal(
      effects.root.getObjectByName('spell-zone-10-flames')!.children.length,
      1,
      'procedural flames remain',
    );
    assert.ok(effects.root.getObjectByName('spell-zone-10-area')?.visible);
  } finally {
    THREE.TextureLoader.prototype.loadAsync = previous;
    effects.dispose();
  }
});
