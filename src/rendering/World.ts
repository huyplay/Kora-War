import { ArenaLighting } from './arena-lighting';
import { TowerEffects } from './vfx/tower-effects';
import { DeploymentGuidance } from './deployment-guidance';
import { portraitCamera } from './portrait-camera';
import { canDeployInRange } from '../core/physics/deployment-range';
import * as THREE from 'three';
import type { Battle, GameEvent, Unit } from '../core/index';
import { pickDeployment } from '../core/physics/lane-space';
import type { ContentConfig } from '../data/content';
import { HERO_MAP, LANES, ORIGINS, type Hero } from '../data/index';
import { animateUnit } from './animation/unit-animator';
import { createHeroPrefabs } from './assets/hero-prefabs';
import { ModelLibrary, type ModelInstance } from './assets/model-library';
import { buildEnvironment } from './environment';
import {
  disposeSharedResources,
  healthGeometry,
  healthMaterial,
  geo,
  teamRings,
  unitRingGeometry,
} from './resources';
import { TerrainStyle } from './terrain-style';
import { SpriteEffects } from './vfx/sprite-effects';
import { type SpellId } from '../data/spells';
import { gameplayOf, COMPAT_GAMEPLAY } from '../data/gameplay';
import { SpellEffects } from './vfx/spell-effects';
import { ArenaCamera } from './arena-camera';
import { ArenaAtmosphere } from './arena-atmosphere';
import { CombatAccents } from './vfx/combat-accents';
import { alignFortressFrontages } from './fortress-gates';
import { ContactShadows } from './vfx/contact-shadows';
import { FloatingNumbers } from './vfx/floating-numbers';
import { StructureAnimator } from './animation/structure-animator';
import { UnitFeedback } from './animation/unit-feedback';
import { FormationLayout } from './formation-layout';
import { presentationOf } from '../data/presentation';
import { unitVisualMetrics } from './unit-visual-metrics';
interface Visual {
  group: THREE.Group;
  bar: THREE.Mesh;
  shield: THREE.Mesh;
  barBack: THREE.Mesh;
  barTrail: THREE.Mesh;
  feedback: UnitFeedback;
  unit: Unit;
  imported?: ModelInstance;
}
interface Effect {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  start: number;
  duration: number;
  kind: string;
  x: number;
  toX: number;
  z: number;
  side: number;
  toZ?: number;
}
export class World {
  private models = new ModelLibrary();
  private terrain = new TerrainStyle();
  private content?: ContentConfig;
  private templates = new Map<string, ModelInstance>();
  private mapInstances: ModelInstance[] = [];
  private coreModels: ModelInstance[] = [];
  private corpses: {
    model: ModelInstance;
    age: number;
  }[] = [];
  private prefabs = createHeroPrefabs();
  private sprites = new SpriteEffects();
  private resizeObserver: ResizeObserver;
  private disposed = false;
  private spellEffects = new SpellEffects();
  private atmosphere = new ArenaAtmosphere();
  private accents = new CombatAccents();
  private contactShadows = new ContactShadows();
  private numbers = new FloatingNumbers();
  private structures = new StructureAnimator();
  private lighting = new ArenaLighting();
  private towerEffects = new TowerEffects();
  private fortressSides: THREE.Group[] = [];
  private gateFrontages: THREE.Group[] = [];
  private structureShadows = new ContactShadows();
  private formation = new FormationLayout();
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private arenaCamera: ArenaCamera;
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  units = new Map<number, Visual>();
  towerMeshes = new Map<string, THREE.Group>();
  baseGroups: THREE.Group[] = [];
  coreCrystals: THREE.Mesh[] = [];
  effects: Effect[] = [];
  lastEvent = 0;
  clock = 0;
  quality: 'high' | 'low' = 'high';
  ray = new THREE.Raycaster();
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  pointer = new THREE.Vector2();
  unitBatches = new Map<
    string,
    {
      mesh: THREE.InstancedMesh;
      count: number;
    }
  >();
  instanceColor = new THREE.Color();
  private deploymentGuidance = new DeploymentGuidance();
  private placementState?: Battle;
  deployZone = this.deploymentGuidance.root;
  hoverRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  selected = false;
  selectedLane = -1;
  stats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-label', 'Chiến trường 3D: chọn thẻ rồi chạm vùng bên trái để thả quân');
    this.canvas.tabIndex = 0;
    this.renderer.setPixelRatio(Math.max(1, Math.min(devicePixelRatio, 2)));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.canvas);
    this.scene.background = new THREE.Color(0x142c31);
    this.scene.fog = new THREE.FogExp2(0x142c31, 0.011);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 180);
    this.camera.position.set(0, 29, 35.2);
    this.camera.lookAt(0, 0.5, 1.2);
    this.arenaCamera = new ArenaCamera(this.camera);
    this.scene.add(this.lighting.root, this.towerEffects.root, this.structureShadows.root);
    this.lighting.configure(presentationOf({}).arena.lighting);
    this.buildEnvironment();
    this.terrain.apply(this.scene);
    this.scene.add(this.sprites.root);
    this.scene.add(this.spellEffects.root);
    this.scene.add(this.atmosphere.root, this.accents.root);
    this.scene.add(this.contactShadows.root, this.numbers.root, this.structures.root);
    this.scene.add(this.deployZone);
    this.deployZone.visible = false;
    this.hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.73, 40),
      new THREE.MeshBasicMaterial({
        color: 0xa2ffdd,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.scene.add(this.hoverRing);
    this.resizeObserver = new ResizeObserver(() => this.resize(container));
    this.resizeObserver.observe(container);
    this.resize(container);
  }
  resize(el: HTMLElement) {
    const w = el.clientWidth,
      h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Reserve a little foreground for the card hand; perspective keeps rear lanes narrower.
    const distance = Math.hypot(29 - 0.5, 34);
    const frameHeight = Math.max(18, 43 / aspect);
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(frameHeight / (2 * distance)));
    this.camera.updateProjectionMatrix();
  }
  buildEnvironment() {
    const environment = buildEnvironment(this);
    this.fortressSides = environment.fortresses;
    this.gateFrontages = environment.gateFrontages;
  }
  zoomBy(factor: number, x?: number, y?: number) {
    let anchor: THREE.Vector3 | undefined;
    if (x !== undefined && y !== undefined) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.set(((x - rect.left) / rect.width) * 2 - 1, (-(y - rect.top) / rect.height) * 2 + 1);
      this.ray.setFromCamera(this.pointer, this.camera);
      anchor = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()) || undefined;
    }
    this.arenaCamera.zoomBy(factor, anchor);
  }
  resetZoom() {
    this.arenaCamera.reset();
  }
  async prepareContent(content: ContentConfig) {
    this.content = content;
    const arena = presentationOf(content).arena;
    this.lighting.configure(arena.lighting);
    this.atmosphere.setNight(arena.lighting.mode === 'night');
    for (const group of this.fortressSides)
      group.scale.set(arena.structures.wallThicknessScale, arena.structures.wallHeightScale, 1);
    alignFortressFrontages(
      this.gateFrontages,
      gameplayOf(content).board.coreX,
      arena.structures.wallHeightScale,
      arena.structures.wallThicknessScale,
    );
    for (const tower of this.towerMeshes.values()) {
      const body = tower.getObjectByName('TowerBody')!;
      body.scale.setScalar(arena.structures.towerHeight / 2.37);
    }

    const skyColor = new THREE.Color(content.map.background).lerp(
      new THREE.Color(arena.lighting.mode === 'day' ? 0x8b9dad : 0x0e1b38),
      arena.lighting.mode === 'day' ? 0.35 : 0.3,
    );
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor, 0.009);
    this.renderer.toneMappingExposure = content.map.exposure * arena.lighting.exposure;
    await this.models.supportTextures(this.renderer);
    this.sprites.configure(content.vfx);
    await this.spellEffects.configure(content.vfx);
    await this.terrain.configure(
      content.map.textures,
      Math.min(8, this.renderer.capabilities.getMaxAnisotropy()),
    );
    const results = await Promise.allSettled(
      Object.entries(content.models).map(async ([id, binding]) => {
        const instance = await this.models.instance(binding);
        this.templates.set(id, instance);
      }),
    );
    for (const result of results)
      if (result.status === 'rejected') console.warn('Model fallback:', result.reason);
    await Promise.allSettled(
      content.map.props.map(async (p) => {
        const instance = await this.models.instance({
          assetId: p.assetId,
          height: p.scale,
          yaw: p.yaw,
          clips: {},
        });
        instance.root.position.set(p.x, 0, p.z);
        this.mapInstances.push(instance);
        this.scene.add(instance.root);
      }),
    );
    if (content.map.towerAssetId)
      for (const [id, tower] of this.towerMeshes) {
        try {
          const instance = await this.models.instance({
            assetId: content.map.towerAssetId,
            height: arena.structures.towerHeight,
            yaw: 0,
            clips: {},
          });
          instance.teamPalette(Number(id[0]));
          const body = tower.getObjectByName('TowerBody')!;
          body.clear();
          body.scale.setScalar(1);
          body.add(instance.root);
          instance.root.traverse((o) => {
            if (o instanceof THREE.Mesh) o.castShadow = true;
          });
          this.mapInstances.push(instance);
        } catch (e) {
          console.warn('Tower fallback:', e);
          break;
        }
      }
    if (content.map.coreAssetId)
      for (const side of [0, 1]) {
        try {
          const instance = await this.models.instance({
            assetId: content.map.coreAssetId,
            height: arena.structures.coreHeight,
            yaw: side === 0 ? 90 : -90,
            clips: {},
          });
          instance.teamPalette(side);
          instance.root.position.set(side === 0 ? -15 : 15, 0.65, 0);
          instance.root.traverse((o) => {
            if (o instanceof THREE.Mesh) o.castShadow = true;
          });
          this.scene.add(instance.root);
          this.coreModels.push(instance);
          this.coreCrystals[side].visible = false;
          this.baseGroups[side].visible = true;
          for (const child of this.baseGroups[side].children)
            if (child.position.y > 0.7) child.visible = false;
        } catch (e) {
          console.warn('Core fallback:', e);
          break;
        }
      }
    this.renderer.shadowMap.needsUpdate = true;
  }
  portrait(h: Hero) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(ORIGINS[h.origin].color).multiplyScalar(0.12);
    const template = this.templates.get(h.id);
    const model = template?.root || this.prefabs.get(h.id)();
    const originalParent = model.parent,
      originalRotation = model.rotation.clone();
    // Portrait orientation is independent of combat yaw and configurable for each source model.
    model.rotation.y = template
      ? (((template.binding.portraitYaw ?? 0) - template.binding.yaw) * Math.PI) / 180 - 0.3
      : -0.3;
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xe3ffff, 0x3a4045, 3));
    const sun = new THREE.DirectionalLight(0xffe8c2, 4);
    sun.position.set(-3, 6, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(ORIGINS[h.origin].color, 3);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    const camera = portraitCamera(model);
    const oldSize = this.renderer.getSize(new THREE.Vector2()),
      ratio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(256, 352, false);
    this.renderer.render(scene, camera);
    const url = this.canvas.toDataURL('image/webp');
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(oldSize.x, oldSize.y, false);
    model.removeFromParent();
    model.rotation.copy(originalRotation);
    if (originalParent) originalParent.add(model);
    return url;
  }
  pick(clientX: number, clientY: number, spellTarget = false, friendly: boolean | 'all' = false) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - r.left) / r.width) * 2 - 1, (-(clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    if (spellTarget) {
      // A touch on a tall model must target the unit, not the ground behind its
      // head. Lightweight body volumes also work for batched procedural units.
      const box = new THREE.Box3(),
        hit = new THREE.Vector3();
      let nearest: Visual | undefined,
        distance = Infinity;
      for (const visual of this.units.values()) {
        const unit = visual.unit;
        if ((friendly !== 'all' && unit.side !== (friendly ? 0 : 1)) || unit.hp <= 0) continue;
        const position = visual.group.position;
        const metrics = unitVisualMetrics(
          this.content?.models[unit.heroId]?.height ?? 2.65,
          visual.group.scale.y,
          visual.imported?.footprintRadius,
        );
        box.min.set(position.x - metrics.pickRadius, position.y, position.z - metrics.pickRadius);
        box.max.set(
          position.x + metrics.pickRadius,
          position.y + metrics.bodyHeight,
          position.z + metrics.pickRadius,
        );
        if (!this.ray.ray.intersectBox(box, hit)) continue;
        const nextDistance = hit.distanceToSquared(this.ray.ray.origin);
        if (nextDistance < distance) {
          distance = nextDistance;
          nearest = visual;
        }
      }
      if (nearest) {
        const unit = nearest.unit;
        return { x: unit.x, z: LANES[unit.lane], lane: unit.lane, valid: false, spellValid: true };
      }
    }
    const hit = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    if (!hit) return null;
    const board = this.content ? gameplayOf(this.content).board : COMPAT_GAMEPLAY.board;
    const point = pickDeployment(hit.x, hit.z, 0, board);
    return {
      ...point,
      valid:
        point.valid &&
        (!this.placementState || canDeployInRange(this.placementState, 0, point.lane, point.x)),
      spellValid:
        hit.x >= board.minX && hit.x <= board.maxX && Math.abs(hit.z - LANES[point.lane]) < board.halfWidth,
    };
  }
  setHover(clientX: number, clientY: number, ability = false, spellId?: SpellId) {
    const p = this.pick(
      clientX,
      clientY,
      !!spellId,
      spellId
        ? (this.content ? gameplayOf(this.content) : COMPAT_GAMEPLAY).spells[spellId].target === 'all'
          ? 'all'
          : (this.content ? gameplayOf(this.content) : COMPAT_GAMEPLAY).spells[spellId].target === 'ally'
        : false,
    );
    const spell = spellId
      ? (this.content ? gameplayOf(this.content) : COMPAT_GAMEPLAY).spells[spellId]
      : undefined;
    this.hoverRing.visible = !!p && p.spellValid;
    if (p) {
      this.hoverRing.position.set(p.x, 0.27, LANES[p.lane]);
      if (spell) {
        const outerRadius = this.hoverRing.geometry.parameters.outerRadius;
        this.hoverRing.scale.set(spell.radius / outerRadius, 1.35 / outerRadius, 1);
      } else this.hoverRing.scale.setScalar(ability ? 3 : 1);
      this.hoverRing.material.color.set(spell?.color || (ability || p.valid ? 0xa2ffdd : 0xff536a));
      this.selectedLane = p.lane;
    }
    return p;
  }
  setQuality(q: 'high' | 'low') {
    this.quality = q;
    this.renderer.setPixelRatio(Math.max(1, Math.min(devicePixelRatio, q === 'high' ? 2 : 1)));
    this.renderer.shadowMap.enabled = q === 'high';
    this.renderer.shadowMap.needsUpdate = true;
  }
  reset() {
    this.placementState = undefined;
    this.formation.reset();
    this.renderer.shadowMap.needsUpdate = true;
    this.arenaCamera.reset();
    this.spellEffects.reset();
    this.accents.reset();
    this.numbers.reset();
    this.contactShadows.begin();
    this.structures.reset(this.towerMeshes);
    this.towerEffects.reset();
    this.corpses.forEach((c) => c.model.dispose());
    this.corpses = [];
    this.sprites.reset();
    this.clock = 0;
    this.hoverRing.visible = false;
    this.deployZone.visible = false;
    for (const batch of this.unitBatches.values()) {
      batch.count = 0;
      batch.mesh.count = 0;
      batch.mesh.visible = false;
    }
    for (const v of this.units.values()) {
      this.scene.remove(v.group, v.bar, v.shield);
      this.disposeUnit(v);
    }
    this.units.clear();
    for (const e of this.effects) {
      this.scene.remove(e.mesh);
      e.mesh.material.dispose();
    }
    this.effects = [];
    this.lastEvent = 0;
    for (const t of this.towerMeshes.values()) {
      t.visible = true;
      t.scale.setScalar(1);
    }
  }
  disposeUnit(v: Visual, death = false) {
    if (v.imported && death && this.corpses.length < 12) {
      v.imported.play('death', true);
      this.scene.add(v.imported.root);
      this.corpses.push({ model: v.imported, age: 0 });
    } else v.imported?.dispose();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.sprites.dispose();
    this.scene.remove(this.sprites.root);
    this.prefabs.dispose();
    this.reset();
    this.spellEffects.dispose();
    this.accents.dispose();
    this.atmosphere.dispose();
    this.numbers.dispose();
    this.contactShadows.dispose();
    this.structures.dispose();
    this.towerEffects.dispose();
    this.deploymentGuidance.dispose();
    this.lighting.dispose();
    this.structureShadows.dispose();
    this.mapInstances.forEach((m) => m.dispose());
    this.coreModels.forEach((m) => m.dispose());
    this.templates.forEach((m) => m.dispose());
    this.models.dispose();
    this.terrain.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => materials.add(material));
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    disposeSharedResources();
    this.unitBatches.clear();
    this.scene.clear();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
  addUnit(u: Unit) {
    const group = this.prefabs.get(u.heroId)(u.side);
    group.rotation.y = u.side === 0 ? Math.PI / 2 : -Math.PI / 2;
    const bar = new THREE.Mesh(healthGeometry, healthMaterial);
    bar.position.set(0, 2.6, 0);
    bar.quaternion.copy(this.camera.quaternion);
    bar.scale.set(0.94, 0.085, 1);
    const shield = new THREE.Mesh(healthGeometry, healthMaterial);
    shield.scale.set(0.94, 0.038, 1);
    const barBack = new THREE.Mesh(healthGeometry, healthMaterial);
    const barTrail = new THREE.Mesh(healthGeometry, healthMaterial);
    const v: Visual = { group, bar, shield, barBack, barTrail, feedback: new UnitFeedback(u), unit: u };
    this.units.set(u.id, v);
    const binding = this.content?.models[u.heroId];
    if (binding && this.templates.has(u.heroId))
      void this.models.instance(binding).then((instance) => {
        if (this.disposed || this.units.get(u.id) !== v) {
          instance.dispose();
          return;
        }
        v.imported = instance;
        const ring = new THREE.Mesh(unitRingGeometry, teamRings[u.side]);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.21;
        ring.scale.setScalar(1.25);
        instance.root.add(ring);
        instance.root.rotation.y = u.side === 0 ? Math.PI / 2 : -Math.PI / 2;
        instance.root.position.copy(v.group.position);
        v.group = instance.root;
        this.scene.add(instance.root);
      });
    return v;
  }
  batchUnitMesh(o: THREE.Mesh, color = 0xffffff) {
    const material = o.material as THREE.Material,
      key = `${o.geometry.uuid}/${material.uuid}`;
    let batch = this.unitBatches.get(key);
    if (!batch) {
      const mesh = new THREE.InstancedMesh(o.geometry, material, 1024);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.scene.add(mesh);
      batch = { mesh, count: 0 };
      this.unitBatches.set(key, batch);
    }
    if (batch.count >= 1024) return;
    batch.mesh.setMatrixAt(batch.count, o.matrixWorld);
    this.instanceColor.setHex(color);
    batch.mesh.setColorAt(batch.count, this.instanceColor);
    batch.count++;
  }
  syncUnitBatches() {
    for (const b of this.unitBatches.values()) b.count = 0;
    for (const v of this.units.values()) {
      v.group.updateMatrixWorld(true);
      if (!v.imported)
        v.group.traverse((o) => {
          if (o instanceof THREE.Mesh && o.visible) this.batchUnitMesh(o);
        });
      v.bar.updateMatrixWorld(true);
      v.barBack.updateMatrixWorld(true);
      v.barTrail.updateMatrixWorld(true);
      this.batchUnitMesh(v.barBack, 0x15222e);
      this.batchUnitMesh(v.barTrail, 0xe5ad66);
      this.batchUnitMesh(v.bar, v.unit.side === 0 ? 0x26cfe8 : 0xff5959);
      if (v.shield.visible) {
        v.shield.updateMatrixWorld(true);
        this.batchUnitMesh(v.shield, 0xffe4a3);
      }
    }
    for (const b of this.unitBatches.values()) {
      b.mesh.count = b.count;
      b.mesh.visible = b.count > 0;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    }
  }
  effect(e: GameEvent) {
    const closest = (x: number, side: number, heroId?: string) =>
      Array.from(this.units.values())
        .filter(
          (v) => v.unit.lane === e.lane && v.unit.side === side && (!heroId || v.unit.heroId === heroId),
        )
        .sort((a, b) => Math.abs(a.unit.x - x) - Math.abs(b.unit.x - x))[0]?.group.position;
    const point = e.targetId
      ? this.units.get(e.targetId)?.group.position
      : e.heroId
        ? closest(e.x, e.side, e.heroId)
        : undefined;
    const target = e.type === 'projectile' ? closest(e.toX ?? e.x, 1 - e.side) : undefined;
    if (e.type === 'projectile' && !e.heroId) {
      const arena = presentationOf(this.content ?? {}).arena;
      const source = new THREE.Vector3(e.x, 0.48 + arena.structures.towerHeight * 0.85, LANES[e.lane]);
      const destination = new THREE.Vector3(target?.x ?? e.toX ?? e.x, 1.1, target?.z ?? LANES[e.lane]);
      this.towerEffects.emit(
        `${e.side}-${e.lane}`,
        source,
        destination,
        e.side,
        arena.towers.projectileSeconds,
      );
      return;
    }
    this.sprites.emit(e, point, target);
    this.accents.emit(e, point);
    const color = e.type === 'heal' ? 0x83ffc2 : e.side === 0 ? 0xb4ffde : 0xffb4a0;
    if (e.type === 'hit' || e.type === 'core' || e.type === 'finish') return;
    const kind =
      e.type === 'projectile' ? 'bolt' : e.type === 'pulse' ? 'pulse' : e.type === 'death' ? 'death' : 'ring';
    if (this.effects.length >= 64) {
      const oldest = this.effects.shift()!;
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    const mesh = new THREE.Mesh(
      geo(kind === 'bolt' ? 'orb' : 'ring'),
      new THREE.MeshBasicMaterial({
        color: e.heroId ? HERO_MAP[e.heroId].accent : color,
        transparent: true,
        opacity: kind === 'pulse' ? 0.4 : 0.7,
        depthWrite: false,
      }),
    );
    mesh.position.set(point?.x ?? e.x, kind === 'bolt' ? 1.25 : 0.3, point?.z ?? LANES[e.lane]);
    mesh.scale.setScalar(kind === 'bolt' ? 0.13 : 0.5);
    this.scene.add(mesh);
    if (kind !== 'bolt') mesh.rotation.x = -Math.PI / 2;
    this.effects.push({
      mesh,
      start: this.clock,
      duration: kind === 'bolt' ? 0.28 : kind === 'pulse' ? 1.2 : 0.75,
      kind,
      x: point?.x ?? e.x,
      toX: target?.x ?? e.toX ?? e.x,
      z: point?.z ?? LANES[e.lane],
      toZ: target?.z,
      side: e.side,
    });
  }
  render(battle: Battle, dt: number, selected: boolean, spellTarget = false, animationRate = 1) {
    this.placementState = battle;
    this.arenaCamera.update(dt);
    // Smooth render-frame motion, independent of the simulation's 20 Hz snapshots.
    const animationDt = battle.phase === 'playing' ? dt * animationRate : 0;
    this.clock += animationDt;
    this.atmosphere.update(this.clock, this.camera, this.quality === 'low');
    this.deployZone.visible = selected && !spellTarget && battle.phase === 'playing';
    if (this.deployZone.visible) this.deploymentGuidance.update(battle, this.clock);
    if (!selected) this.hoverRing.visible = false;
    const ids = new Set(battle.units.map((u) => u.id));
    for (const [id, v] of this.units)
      if (!ids.has(id)) {
        this.scene.remove(v.group, v.bar, v.shield);
        this.disposeUnit(v, true);
        this.units.delete(id);
      }
    this.contactShadows.begin();
    const barRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const barForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion);
    const formation = presentationOf(battle.content).formation;
    const positions = this.formation.update(
      battle.units,
      formation,
      battle.gameplay.board,
      animationDt,
      (unit) => (this.templates.get(unit.heroId)?.footprintRadius ?? 0) * formation.modelScale,
    );
    for (const u of battle.units) {
      const v = this.units.get(u.id) || this.addUnit(u);
      v.unit = u;
      const point = positions.get(u.id)!;
      const z = point.z;
      v.group.position.x = point.x;
      v.group.position.z = z;
      const born = Math.min(1, (battle.time - u.born) * 3 + 0.15);
      v.group.scale.setScalar(born * point.scale);
      const metrics = unitVisualMetrics(this.content?.models[u.heroId]?.height ?? 2.4, v.group.scale.y);
      this.contactShadows.add(
        v.group.position,
        Math.min(2, (this.content?.models[u.heroId]?.height ?? 2.4) * 0.65) * point.scale,
        born,
      );
      const change = v.feedback.update(u, animationDt);
      if (change) {
        const point = v.group.position.clone();
        point.y = metrics.barY + 0.15;
        this.numbers.emit(change.damage, point);
        this.numbers.emit(change.healing, point, true);
      }
      if (v.imported) v.imported.update(u, battle.time, battle.phase, animationDt);
      else animateUnit(v.group, u, battle.time, this.clock, battle.phase);
      v.imported?.setHitFlash(v.feedback.flash);
      v.bar.position.set(v.group.position.x, metrics.barY, z);
      v.bar.quaternion.copy(this.camera.quaternion);
      const barWidth = 0.94 * metrics.barScale;
      v.bar.scale.set(barWidth * Math.max(0.001, u.hp / u.maxHp), 0.085, 1);
      v.barBack.position.copy(v.bar.position).addScaledVector(barForward, -0.018);
      v.barBack.quaternion.copy(this.camera.quaternion);
      v.barBack.scale.set(metrics.barScale, 0.13, 1);
      v.barTrail.position.copy(v.bar.position).addScaledVector(barForward, -0.009);
      v.barTrail.quaternion.copy(this.camera.quaternion);
      v.barTrail.scale.set(barWidth * Math.max(0.001, v.feedback.trailHp / u.maxHp), 0.085, 1);
      v.barTrail.position.addScaledVector(barRight, (v.barTrail.scale.x - barWidth) / 2);
      v.bar.position.addScaledVector(barRight, (v.bar.scale.x - barWidth) / 2);
      v.shield.position.set(v.group.position.x, v.bar.position.y + 0.13, z);
      v.shield.quaternion.copy(this.camera.quaternion);
      v.shield.scale.x = barWidth * Math.min(1, u.shield / 200);
      v.shield.position.addScaledVector(barRight, (v.shield.scale.x - barWidth) / 2);
      v.shield.visible = u.shield > 0;
    }
    this.spellEffects.setConfig(battle.gameplay);
    this.spellEffects.update(
      battle.spellZones,
      battle.tactical ? battle.units : [],
      battle.time,
      this.clock,
      (id) => {
        const group = this.units.get(id)?.group;
        return group ? { x: group.position.x, z: group.position.z, scale: group.scale.x } : undefined;
      },
    );
    for (const tower of battle.towers) this.towerMeshes.get(tower.id)?.position.setX(tower.x);
    this.contactShadows.end();
    this.structureShadows.begin();
    for (const t of battle.towers)
      this.structureShadows.add(new THREE.Vector3(t.x, 0, LANES[t.lane]), 2.9, t.hp > 0 ? 1 : 0.65);
    for (const side of [0, 1])
      this.structureShadows.add(
        new THREE.Vector3((side ? 1 : -1) * (battle.gameplay.board.coreX + 1), 0, 0),
        4.2,
        battle.cores[side] > 0 ? 1 : 0.4,
      );
    this.structureShadows.end();
    this.towerEffects.update(
      battle.towers,
      battle.content.rules.towerRange,
      battle.gameplay.board.halfWidth,
      presentationOf(battle.content).arena.towers,
      animationDt,
      this.camera,
    );
    this.numbers.update(animationDt, this.camera);
    this.structures.update(battle.towers, this.towerMeshes, animationDt);
    this.coreCrystals.forEach((c, i) => {
      c.rotation.y = this.clock * 0.35 * (i === 0 ? 1 : -1);
      c.position.y = 2.25 + Math.sin(this.clock * 1.7 + i) * 0.1;
      c.scale.set(0.8, 1.55, 0.8).multiplyScalar(battle.cores[i] <= 0 ? 0.05 : 1);
    });
    for (const e of battle.events)
      if (e.id > this.lastEvent) {
        this.effect(e);
        this.lastEvent = e.id;
      }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i],
        p = (this.clock - e.start) / e.duration;
      if (p >= 1) {
        this.scene.remove(e.mesh);
        e.mesh.material.dispose();
        this.effects.splice(i, 1);
        continue;
      }
      e.mesh.material.opacity = Math.pow(1 - p, 1.4) * (e.kind === 'pulse' ? 0.4 : 0.7);
      if (e.kind === 'bolt') {
        e.mesh.position.x = THREE.MathUtils.lerp(e.x, e.toX, p);
        e.mesh.position.z = THREE.MathUtils.lerp(e.z, e.toZ ?? e.z, p);
        e.mesh.position.y = 1.2 + Math.sin(p * Math.PI) * 0.5;
      } else {
        e.mesh.scale.setScalar(e.kind === 'pulse' ? 1 + p * 3 : 0.2 + p * 1.8);
        e.mesh.position.y = 0.2 + p * 0.45;
      }
    }
    this.accents.observe(battle.units, battle.time, (id) => this.units.get(id)?.group.position);
    this.accents.update(animationDt, this.camera);
    this.sprites.update(animationDt);
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      if (battle.phase === 'playing') {
        corpse.age += animationDt;
        corpse.model.tick(animationDt);
      }
      if (corpse.age > 1.1) {
        corpse.model.dispose();
        this.corpses.splice(i, 1);
      }
    }
    this.coreModels.forEach((model, side) => {
      model.root.scale.setScalar(battle.cores[side] <= 0 ? 0.05 : 1);
      model.root.position.x = (side ? 1 : -1) * (battle.gameplay.board.coreX + 1);
    });
    this.mapInstances.forEach((model) => model.tick(animationDt));
    this.syncUnitBatches();
    this.renderer.render(this.scene, this.camera);
    const info = this.renderer.info;
    this.stats = {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  }
}
