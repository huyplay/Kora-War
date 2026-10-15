import * as THREE from 'three';
import type { SpellZone } from '../../core/systems/spells';
import type { Unit } from '../../core/types';
import { LANES } from '../../data/map';
import { COMPAT_GAMEPLAY, type GameplayConfig } from '../../data/gameplay';
import type { SpellId } from '../../data/spells';
import type { ContentConfig } from '../../data/content';
import { loadAtlas } from './atlas';

interface ZoneVisual {
  group: THREE.Group;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  fill: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  flames: THREE.Group;
}
interface StatusVisual {
  group: THREE.Group;
  frost: THREE.Group;
  fire: THREE.Group;
  haste: THREE.Mesh;
  weaken: THREE.Mesh;
}

/** Presentation only: all visibility and lifetimes come from the combat snapshot. */
export class SpellEffects {
  private config = COMPAT_GAMEPLAY;
  setConfig(config: GameplayConfig) {
    if (this.config === config) return;
    this.reset();
    this.config = config;
    this.iceMaterial.color.set(config.spells.ice.color);
    this.hasteMaterial.color.set(config.spells.haste.color);
    this.weakenMaterial.color.set(config.spells.weaken.color);
  }
  readonly root = new THREE.Group();
  private zones = new Map<number, ZoneVisual>();
  private statuses = new Map<number, StatusVisual>();
  private atlases = new Map<SpellId, { frames: THREE.Texture[]; fps: number }>();
  private generation = 0;
  async configure(profile: ContentConfig['vfx']) {
    this.reset();
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
    if (!atlas) return undefined;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: atlas.frames[0],
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
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
  private fillGeometry = new THREE.CircleGeometry(1, 32);
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

  private flames(count: number, radius: number, width: number) {
    const group = new THREE.Group();
    if (!count) return group;
    const flames = new THREE.InstancedMesh(this.flameGeometry, this.flameMaterial, count);
    flames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flames.frustumCulled = false;
    const offsets: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963;
      const spread = Math.sqrt((i + 0.5) / count);
      offsets.push([Math.cos(angle) * radius * spread, Math.sin(angle) * width * spread]);
    }
    flames.userData.offsets = offsets;
    group.add(flames);
    return group;
  }

  private createZone(zone: SpellZone): ZoneVisual {
    const group = new THREE.Group();
    group.name = `spell-zone-${zone.id}`;
    const material = new THREE.MeshBasicMaterial({
      color: this.config.spells[zone.spellId].color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeometry, material);
    const fill = new THREE.Mesh(this.fillGeometry, material.clone());
    for (const mesh of [ring, fill]) {
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.28;
      mesh.scale.set(this.config.spells[zone.spellId].radius, 1.35, 1);
      group.add(mesh);
    }
    const flames = this.flames(
      zone.spellId === 'fire' ? 18 : 0,
      this.config.spells[zone.spellId].radius * 0.9,
      1.1,
    );
    if (zone.spellId === 'fire')
      for (const x of [-1.5, 0, 1.5]) {
        const sprite = this.sprite('fire', 2.8);
        if (sprite) {
          sprite.position.set(x, 1, 0);
          flames.add(sprite);
        }
      }
    group.add(flames);
    group.position.set(zone.x, 0, LANES[zone.lane]);
    this.root.add(group);
    return { group, ring, fill, flames };
  }

  private createStatus(id: number): StatusVisual {
    const group = new THREE.Group();
    group.name = `spell-status-${id}`;
    const frost = new THREE.Group();
    frost.name = 'frost';
    const shell = new THREE.Mesh(this.shellGeometry, this.shellMaterial);
    shell.position.y = 1.15;
    shell.scale.y = 2.3;
    frost.add(shell);
    const shards = new THREE.InstancedMesh(this.crystalGeometry, this.iceMaterial, 5);
    shards.frustumCulled = false;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      this.matrix.makeScale(0.22, 0.7, 0.22).setPosition(Math.cos(angle) * 0.65, 0.5, Math.sin(angle) * 0.65);
      shards.setMatrixAt(i, this.matrix);
    }
    frost.add(shards);
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
    return { group, frost, fire, haste, weaken };
  }

  update(
    zones: readonly SpellZone[],
    units: readonly Unit[],
    time: number,
    clock: number,
    position?: (id: number) => { x: number; z: number; scale?: number } | undefined,
  ) {
    const ids = new Set(zones.map((zone) => zone.id));
    for (const [id, visual] of this.zones)
      if (!ids.has(id)) {
        visual.group.removeFromParent();
        this.releaseInstances(visual.group);
        visual.ring.material.dispose();
        visual.fill.material.dispose();
        this.zones.delete(id);
      }
    for (const zone of zones) {
      const visual = this.zones.get(zone.id) ?? this.createZone(zone);
      this.zones.set(zone.id, visual);
      const active = time + 1e-8 >= zone.starts;
      visual.ring.material.opacity = active ? 0.9 : 0.35 + 0.4 * Math.abs(Math.sin(clock * 10));
      visual.fill.material.opacity = active ? 0.22 : 0.08;
      visual.flames.visible = active;
      this.animateFlames(visual.flames, clock);
      this.animateAtlas(visual.flames, time);
    }
    const activeIds = new Set<number>();
    for (const unit of units) {
      if (unit.hp <= 0) continue;
      const chilled =
        (unit.slowUntil > time + 1e-8 && unit.slowFactor < 1) || (unit.frozenUntil ?? 0) > time + 1e-8;
      const burning = zones.some(
        (zone) =>
          zone.spellId === 'fire' &&
          this.config.spells[zone.spellId].effects.some((e) => e.kind === 'damage' && e.amount > 0) &&
          (this.config.spells[zone.spellId].target === 'all' ||
            (this.config.spells[zone.spellId].target === 'ally'
              ? zone.side === unit.side
              : zone.side !== unit.side)) &&
          zone.lane === unit.lane &&
          time + 1e-8 >= zone.starts &&
          time < zone.ends &&
          Math.abs(unit.x - zone.x) <= this.config.spells[zone.spellId].radius,
      );
      const hasted = (unit.hasteUntil ?? 0) > time,
        weakened = (unit.weakenUntil ?? 0) > time;
      if (!chilled && !burning && !hasted && !weakened) continue;
      activeIds.add(unit.id);
      const visual = this.statuses.get(unit.id) ?? this.createStatus(unit.id);
      this.statuses.set(unit.id, visual);
      const point = position?.(unit.id);
      visual.group.position.set(
        point?.x ?? unit.x,
        0.05,
        point?.z ?? LANES[unit.lane] + ((unit.id % 3) - 1) * 0.32,
      );
      visual.group.scale.setScalar(point?.scale ?? 1);
      visual.frost.visible = chilled;
      visual.fire.visible = burning;
      visual.haste.visible = hasted;
      visual.weaken.visible = weakened;
      this.animateFlames(visual.fire, clock);
      this.animateAtlas(visual.frost, time);
    }
    for (const [id, visual] of this.statuses)
      if (!activeIds.has(id)) {
        visual.group.removeFromParent();
        this.releaseInstances(visual.group);
        this.statuses.delete(id);
      }
  }

  private animateFlames(group: THREE.Group, clock: number) {
    const flames = group.children[0] as THREE.InstancedMesh | undefined;
    if (!flames) return;
    const offsets = flames.userData.offsets as [number, number][];
    for (let i = 0; i < offsets.length; i++) {
      const height = 0.65 + 0.35 * Math.sin(clock * 13 + i * 1.7);
      this.matrix.makeScale(0.14, height, 0.14).setPosition(offsets[i][0], height / 2 + 0.25, offsets[i][1]);
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
    this.releaseInstances(this.root);
    for (const visual of this.zones.values()) {
      visual.ring.material.dispose();
      visual.fill.material.dispose();
    }
    this.zones.clear();
    this.statuses.clear();
    this.root.clear();
  }
  dispose() {
    this.generation++;
    this.reset();
    this.root.removeFromParent();
    for (const geometry of [
      this.ringGeometry,
      this.fillGeometry,
      this.flameGeometry,
      this.crystalGeometry,
      this.shellGeometry,
    ])
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
