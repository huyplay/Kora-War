import * as THREE from 'three';
import type { SpellZone } from '../../core/systems/spells';
import type { Unit } from '../../core/types';
import { LANES } from '../../data/map';
import { COMPAT_GAMEPLAY, type GameplayConfig } from '../../data/gameplay';
import type { SpellId } from '../../data/spells';
import type { ContentConfig } from '../../data/content';
import { loadAtlas } from './atlas';
import { spellAffectsUnit } from '../../core/physics/spell-area';
import { createAimArea } from '../aim-primitives';
import { UnitSupportAuras } from './unit-support-auras';

interface ZoneVisual {
  group: THREE.Group;
  area: ReturnType<typeof createAimArea>;
  flames: THREE.Group;
}
interface StatusVisual {
  group: THREE.Group;
  frost: THREE.Group;
  iceShell: THREE.Mesh;
  iceShards: THREE.InstancedMesh;
  chillRing: THREE.Mesh;
  freezeRune?: THREE.Sprite;
  fire: THREE.Group;
  haste: THREE.Mesh;
  weaken: THREE.Mesh;
}

/** Presentation only: all visibility and lifetimes come from the combat snapshot. */
export class SpellEffects {
  private support = new UnitSupportAuras();
  private disposed = false;
  private clock = 0;
  private config = COMPAT_GAMEPLAY;
  setConfig(config: GameplayConfig) {
    if (this.disposed) return;
    if (this.config === config) return;
    this.reset();
    this.config = config;
    this.iceMaterial.color.set(config.spells.ice.color);
    this.shellMaterial.color.set(config.spells.ice.color);
    this.hasteMaterial.color.set(config.spells.haste.color);
    this.weakenMaterial.color.set(config.spells.weaken.color);
    this.flameMaterial.color.set(config.spells.fire.color);
  }
  readonly root = new THREE.Group();
  private zones = new Map<number, ZoneVisual>();
  private statuses = new Map<number, StatusVisual>();
  private atlases = new Map<SpellId, { frames: THREE.Texture[]; fps: number }>();
  private spriteStyle?: { opacity: number; blend: 'normal' | 'additive' };
  private generation = 0;
  async configure(profile: ContentConfig['vfx']) {
    if (this.disposed) return;
    this.reset();
    this.spriteStyle = profile.readability?.events.skill;
    this.support.configure(profile.readability?.events.skill);
    const generation = ++this.generation;
    this.atlases.forEach(({ frames }) => frames.forEach((frame) => frame.dispose()));
    this.atlases.clear();
    await Promise.allSettled(
      Object.entries(profile.spellSprites || {}).map(async ([id, binding]) => {
        const frames = await loadAtlas(binding);
        if (generation !== this.generation) {
          frames.forEach((frame) => frame.dispose());
          return;
        }
        this.atlases.set(id as SpellId, { frames, fps: binding.fps });
      }),
    );
  }
  private sprite(id: SpellId, size: number) {
    const atlas = this.atlases.get(id);
    if (!atlas || this.spriteStyle?.opacity === 0) return undefined;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: atlas.frames[0],
        transparent: true,
        depthWrite: false,
        blending: this.spriteStyle?.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
        opacity: this.spriteStyle?.opacity ?? 1,
        toneMapped: !this.spriteStyle,
      }),
    );
    sprite.scale.setScalar(size);
    sprite.userData.spell = id;
    return sprite;
  }
  private animateAtlas(group: THREE.Group, time: number) {
    group.traverse((object) => {
      if (!(object instanceof THREE.Sprite)) return;
      const atlas = this.atlases.get(object.userData.spell);
      if (atlas) object.material.map = atlas.frames[Math.floor(time * atlas.fps) % atlas.frames.length];
    });
  }
  private matrix = new THREE.Matrix4();
  private ringGeometry = new THREE.RingGeometry(0.88, 1, 40);
  private flameGeometry = new THREE.ConeGeometry(1, 1, 5);
  private crystalGeometry = new THREE.OctahedronGeometry(1);
  private shellGeometry = new THREE.CylinderGeometry(0.62, 0.75, 1, 6, 1, true);
  private flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8c32,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  private iceMaterial = new THREE.MeshBasicMaterial({
    color: 0x89dbff,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  private shellMaterial = new THREE.MeshBasicMaterial({
    color: 0x89dbff,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private hasteMaterial = new THREE.MeshBasicMaterial({
    color: 0x7fffe4,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private weakenMaterial = new THREE.MeshBasicMaterial({
    color: 0xbf83f7,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  constructor() {
    this.root.name = 'SpellEffects';
  }

  private flames(count: number, radius: number, width: number, rectangular = false) {
    const group = new THREE.Group();
    if (!count) return group;
    const flames = new THREE.InstancedMesh(this.flameGeometry, this.flameMaterial, count);
    flames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flames.frustumCulled = false;
    const offsets: [number, number][] = [];
    const columns = Math.max(1, Math.min(count, Math.ceil(Math.sqrt((count * radius) / width))));
    const rows = Math.ceil(count / columns);
    for (let i = 0; i < count; i++) {
      if (rectangular) {
        const row = Math.floor(i / columns);
        const inRow = Math.min(columns, count - row * columns);
        offsets.push([
          ((((i % columns) + 0.5) / inRow) * 2 - 1) * radius,
          (((row + 0.5) / rows) * 2 - 1) * width,
        ]);
        continue;
      }
      const angle = i * 2.399963;
      const spread = Math.sqrt((i + 0.5) / count);
      offsets.push([Math.cos(angle) * radius * spread, Math.sin(angle) * width * spread]);
    }
    flames.userData.offsets = offsets;
    flames.userData.width = rectangular ? Math.min(0.14, radius * 0.1, width * 0.1) : 0.14;
    group.add(flames);
    return group;
  }

  private createZone(zone: SpellZone): ZoneVisual {
    const group = new THREE.Group();
    group.name = `spell-zone-${zone.id}`;
    const spell = this.config.spells[zone.spellId];
    const halfWidth = this.config.board.halfWidth;
    const area = createAimArea();
    area.name = `spell-zone-${zone.id}-area`;
    area.position.y = 0.28;
    area.scale.set(spell.radius * 2, halfWidth * 2, 1);
    area.material.uniforms.size.value.set(spell.radius * 2, halfWidth * 2);
    area.material.uniforms.color.value.set(spell.color);
    group.add(area);
    const flames = this.flames(zone.spellId === 'fire' ? 18 : 0, spell.radius * 0.9, halfWidth * 0.9, true);
    flames.name = `spell-zone-${zone.id}-flames`;
    if (zone.spellId === 'fire')
      for (const x of [-0.55, 0, 0.55]) {
        const size = Math.min(2.8, spell.radius * 0.8, halfWidth * 1.4);
        const sprite = this.sprite('fire', size);
        if (sprite) {
          sprite.position.set(x * spell.radius, size * 0.4, 0);
          flames.add(sprite);
        }
      }
    group.add(flames);
    group.position.set(zone.x, 0, LANES[zone.lane]);
    this.root.add(group);
    return { group, area, flames };
  }

  private createStatus(id: number): StatusVisual {
    const group = new THREE.Group();
    group.name = `spell-status-${id}`;
    const frost = new THREE.Group();
    frost.name = 'frost';
    const shell = new THREE.Mesh(this.shellGeometry, this.shellMaterial);
    shell.name = 'FreezeShell';
    shell.position.y = 1.15;
    shell.scale.y = 2.3;
    frost.add(shell);
    const shards = new THREE.InstancedMesh(this.crystalGeometry, this.iceMaterial, 5);
    shards.name = 'FreezeShards';
    shards.frustumCulled = false;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      this.matrix.makeScale(0.22, 0.7, 0.22).setPosition(Math.cos(angle) * 0.65, 0.5, Math.sin(angle) * 0.65);
      shards.setMatrixAt(i, this.matrix);
    }
    frost.add(shards);
    const chillRing = new THREE.Mesh(this.ringGeometry, this.iceMaterial);
    chillRing.name = 'ChillRing';
    chillRing.rotation.x = -Math.PI / 2;
    chillRing.position.y = 0.24;
    chillRing.scale.setScalar(0.8);
    frost.add(chillRing);
    const frostRune = this.sprite('ice', 2.5);
    if (frostRune) {
      frostRune.position.y = 1;
      frost.add(frostRune);
    }
    const fire = this.flames(5, 0.6, 0.6);
    fire.name = 'burn';
    const haste = new THREE.Mesh(this.ringGeometry, this.hasteMaterial),
      weaken = new THREE.Mesh(this.ringGeometry, this.weakenMaterial);
    haste.name = 'haste';
    weaken.name = 'weaken';
    for (const marker of [haste, weaken]) {
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.25;
      marker.scale.setScalar(0.8);
    }
    weaken.position.y = 0.27;
    weaken.scale.setScalar(1);
    group.add(frost, fire, haste, weaken);
    this.root.add(group);
    return {
      group,
      frost,
      iceShell: shell,
      iceShards: shards,
      chillRing,
      freezeRune: frostRune,
      fire,
      haste,
      weaken,
    };
  }

  update(
    zones: readonly SpellZone[],
    units: readonly Unit[],
    time: number,
    clock: number,
    position?: (
      id: number,
    ) => { x: number; y?: number; z: number; scale?: number; height?: number; radius?: number } | undefined,
    options?: { bodyManaged?: boolean; reducedMotion?: boolean },
  ) {
    if (this.disposed || !Number.isFinite(time)) return;
    if (Number.isFinite(clock)) this.clock = clock;
    clock = this.clock;
    this.support.begin(this.config, clock, !!options?.reducedMotion);
    if (options?.reducedMotion) clock = 0;
    const ids = new Set(zones.map((zone) => zone.id));
    for (const [id, visual] of this.zones)
      if (!ids.has(id)) {
        visual.group.removeFromParent();
        this.releaseInstances(visual.group);
        visual.area.geometry.dispose();
        visual.area.material.dispose();
        this.zones.delete(id);
      }
    for (const zone of zones) {
      const visual = this.zones.get(zone.id) ?? this.createZone(zone);
      this.zones.set(zone.id, visual);
      const active = time + 1e-8 >= zone.starts;
      visual.area.material.uniforms.strength.value = active ? 1 : 0.55 + 0.3 * Math.abs(Math.sin(clock * 6));
      visual.area.material.uniforms.fillOpacity.value = active ? 0.14 : 0.04;
      visual.flames.visible = active;
      this.animateFlames(visual.flames, clock);
      this.animateAtlas(visual.flames, options?.reducedMotion ? 0 : time);
    }
    const activeIds = new Set<number>();
    for (const unit of units) {
      if (unit.hp <= 0 || !Number.isFinite(unit.hp) || !Number.isFinite(unit.id)) continue;
      const frozen = (unit.frozenUntil ?? 0) > time + 1e-8;
      const chilled = (unit.slowUntil > time + 1e-8 && unit.slowFactor < 1) || frozen;
      const burning = zones.some(
        (zone) =>
          zone.spellId === 'fire' &&
          this.config.spells[zone.spellId].effects.some((e) => e.kind === 'damage' && e.amount > 0) &&
          spellAffectsUnit(unit, zone, this.config.spells[zone.spellId]) &&
          time + 1e-8 >= zone.starts &&
          time < zone.ends,
      );
      const hasted = Number.isFinite(unit.hasteUntil) && (unit.hasteUntil ?? 0) > time + 1e-8,
        weakened = Number.isFinite(unit.weakenUntil) && (unit.weakenUntil ?? 0) > time + 1e-8;
      const point = position?.(unit.id);
      const x = point?.x ?? unit.x ?? 0,
        z = point?.z ?? LANES[unit.lane] + ((unit.id % 3) - 1) * 0.32,
        y = point?.y ?? 0,
        scale = point?.scale ?? 1;
      if (![x, y, z, scale, point?.height ?? 2.3, point?.radius ?? 0.8].every(Number.isFinite) || scale <= 0)
        continue;
      this.support.add(unit, { x, y, z, radius: point?.radius ?? 0.8 * scale }, time);
      if (!chilled && !burning && (this.support.managed || (!hasted && !weakened))) continue;
      activeIds.add(unit.id);
      const visual = this.statuses.get(unit.id) ?? this.createStatus(unit.id);
      this.statuses.set(unit.id, visual);
      visual.group.position.set(x, y + 0.05, z);
      visual.group.scale.setScalar(point?.scale ?? 1);
      visual.frost.visible = chilled;
      visual.iceShell.visible = visual.iceShards.visible = frozen && !options?.bodyManaged;
      const bodyHeight = point?.height ?? 2.3;
      visual.iceShell.scale.y = bodyHeight;
      visual.iceShell.position.y = bodyHeight * 0.5;
      if (visual.freezeRune) visual.freezeRune.visible = frozen && !options?.bodyManaged;
      visual.chillRing.visible = !frozen;
      visual.fire.visible = burning;
      visual.haste.visible = hasted && !this.support.managed;
      visual.weaken.visible = weakened && !this.support.managed;
      this.animateFlames(visual.fire, clock);
      this.animateAtlas(visual.frost, options?.reducedMotion ? 0 : time);
    }
    for (const [id, visual] of this.statuses)
      if (!activeIds.has(id)) {
        visual.group.removeFromParent();
        this.releaseInstances(visual.group);
        this.statuses.delete(id);
      }
    this.support.end(this.root);
  }

  private animateFlames(group: THREE.Group, clock: number) {
    const flames = group.children[0] as THREE.InstancedMesh | undefined;
    if (!flames) return;
    const offsets = flames.userData.offsets as [number, number][];
    const width = flames.userData.width as number;
    for (let i = 0; i < offsets.length; i++) {
      const height = 0.65 + 0.35 * Math.sin(clock * 13 + i * 1.7);
      this.matrix
        .makeScale(width, height, width)
        .setPosition(offsets[i][0], height / 2 + 0.25, offsets[i][1]);
      flames.setMatrixAt(i, this.matrix);
    }
    flames.instanceMatrix.needsUpdate = true;
  }
  private releaseInstances(group: THREE.Group) {
    group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Sprite) object.material.dispose();
    });
  }
  reset() {
    this.support.reset();
    this.clock = 0;
    this.releaseInstances(this.root);
    for (const visual of this.zones.values()) {
      visual.area.geometry.dispose();
      visual.area.material.dispose();
    }
    this.zones.clear();
    this.statuses.clear();
    this.root.clear();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.reset();
    this.root.removeFromParent();
    this.support.dispose();
    for (const geometry of [this.ringGeometry, this.flameGeometry, this.crystalGeometry, this.shellGeometry])
      geometry.dispose();
    for (const material of [
      this.flameMaterial,
      this.iceMaterial,
      this.shellMaterial,
      this.hasteMaterial,
      this.weakenMaterial,
    ])
      material.dispose();
    this.atlases.forEach(({ frames }) => frames.forEach((frame) => frame.dispose()));
    this.atlases.clear();
  }
}
