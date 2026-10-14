import * as THREE from 'three';
import type { Battle, GameEvent, Unit } from '../core/index';
import { pickDeployment } from '../core/physics/lane-space';
import type { ContentConfig } from '../data/content';
import { HERO_MAP, LANES, type Hero } from '../data/index';
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
import { SPELLS, type SpellId } from '../data/spells';
import { SpellEffects } from './vfx/spell-effects';
import { ArenaCamera } from './arena-camera';
import { ArenaAtmosphere } from './arena-atmosphere';
import { CombatAccents } from './vfx/combat-accents';
import { ContactShadows } from './vfx/contact-shadows';
import { FloatingNumbers } from './vfx/floating-numbers';
import { StructureAnimator } from './animation/structure-animator';
import { UnitFeedback } from './animation/unit-feedback';
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
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
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
  deployZone = new THREE.Group();
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
    this.camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 150);
    this.camera.position.set(0, 24, 30);
    this.camera.lookAt(0, 0.5, 0);
    this.arenaCamera = new ArenaCamera(this.camera);
    this.scene.add(new THREE.HemisphereLight(0xb6cee8, 0x272330, 2.2));
    const sun = new THREE.DirectionalLight(0xffd6a0, 3);
    sun.position.set(-12, 24, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -23;
    sun.shadow.camera.right = 23;
    sun.shadow.camera.top = 19;
    sun.shadow.camera.bottom = -19;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x89b5ff, 1.15);
    rim.position.set(6, 10, -14);
    this.scene.add(rim);
    this.buildEnvironment();
    this.terrain.apply(this.scene);
    this.scene.add(this.sprites.root);
    this.scene.add(this.spellEffects.root);
    this.scene.add(this.atmosphere.root, this.accents.root);
    this.scene.add(this.contactShadows.root, this.numbers.root, this.structures.root);
    for (let lane = 0; lane < 3; lane++) {
      const zone = new THREE.Mesh(
        new THREE.PlaneGeometry(7.7, 2.9),
        new THREE.MeshBasicMaterial({
          color: 0x77e9c4,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(-9.65, 0.05, LANES[lane]);
      this.deployZone.add(zone);
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.7, 2.9)),
        new THREE.LineBasicMaterial({ color: 0x99f6cc, transparent: true, opacity: 0.75 }),
      );
      edge.rotation.x = -Math.PI / 2;
      edge.position.copy(zone.position).add(new THREE.Vector3(0, 0.01, 0));
      this.deployZone.add(edge);
    }
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
    const width = Math.max(36, 18 * aspect);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = width / aspect / 2;
    this.camera.bottom = -width / aspect / 2;
    this.camera.updateProjectionMatrix();
  }
  buildEnvironment() {
    buildEnvironment(this);
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
    this.scene.background = new THREE.Color(content.map.background);
    this.scene.fog = new THREE.FogExp2(content.map.background, 0.011);
    this.renderer.toneMappingExposure = content.map.exposure;
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
            height: 2.4,
            yaw: 0,
            clips: {},
          });
          instance.teamPalette(Number(id[0]));
          tower.clear();
          tower.add(instance.root);
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
            height: 3.5,
            yaw: side === 0 ? 90 : -90,
            clips: {},
          });
          instance.teamPalette(side);
          instance.root.position.set(side === 0 ? -15 : 15, 0, 0);
          this.scene.add(instance.root);
          this.coreModels.push(instance);
          this.coreCrystals[side].visible = false;
          this.baseGroups[side].visible = false;
        } catch (e) {
          console.warn('Core fallback:', e);
          break;
        }
      }
  }
  portrait(h: Hero) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b343b);
    const model = this.templates.get(h.id)?.root || this.prefabs.get(h.id)();
    model.rotation.y = -0.3;
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xe3ffff, 0x3a4045, 3));
    const sun = new THREE.DirectionalLight(0xffe8c2, 4);
    sun.position.set(-3, 6, 5);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(2, 2.25, 4.1);
    camera.lookAt(0, 1.15, 0);
    const oldSize = this.renderer.getSize(new THREE.Vector2()),
      ratio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(256, 256, false);
    this.renderer.render(scene, camera);
    const url = this.canvas.toDataURL('image/webp');
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(oldSize.x, oldSize.y, false);
    model.removeFromParent();
    return url;
  }
  pick(clientX: number, clientY: number, spellTarget = false) {
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
        if (unit.side !== 1 || unit.hp <= 0) continue;
        const position = visual.group.position;
        const height = (this.content?.models[unit.heroId]?.height ?? 2.65) * visual.group.scale.y;
        box.min.set(position.x - 0.7, position.y, position.z - 0.7);
        box.max.set(position.x + 0.7, position.y + height, position.z + 0.7);
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
    const point = pickDeployment(hit.x, hit.z);
    return { ...point, spellValid: Math.abs(hit.x) <= 14 && Math.abs(hit.z - LANES[point.lane]) < 1.55 };
  }
  setHover(clientX: number, clientY: number, ability = false, spellId?: SpellId) {
    const p = this.pick(clientX, clientY, !!spellId);
    const spell = spellId ? SPELLS[spellId] : undefined;
    this.hoverRing.visible = !!p && (ability || spell ? p.spellValid : p.valid);
    if (p) {
      this.hoverRing.position.set(p.x, 0.27, LANES[p.lane]);
      if (spell) {
        const outerRadius = this.hoverRing.geometry.parameters.outerRadius;
        this.hoverRing.scale.set(spell.radius / outerRadius, 1.35 / outerRadius, 1);
      } else this.hoverRing.scale.setScalar(ability ? 3 : 1);
      this.hoverRing.material.color.set(spell?.color || 0xa2ffdd);
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
    this.renderer.shadowMap.needsUpdate = true;
    this.arenaCamera.reset();
    this.spellEffects.reset();
    this.accents.reset();
    this.numbers.reset();
    this.contactShadows.begin();
    this.structures.reset(this.towerMeshes);
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
    this.sprites.emit(e);
    this.accents.emit(e);
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
    mesh.position.set(e.x, kind === 'bolt' ? 1.25 : 0.3, LANES[e.lane]);
    mesh.scale.setScalar(kind === 'bolt' ? 0.13 : 0.5);
    this.scene.add(mesh);
    if (kind !== 'bolt') mesh.rotation.x = -Math.PI / 2;
    this.effects.push({
      mesh,
      start: this.clock,
      duration: kind === 'bolt' ? 0.28 : kind === 'pulse' ? 1.2 : 0.75,
      kind,
      x: e.x,
      toX: e.toX ?? e.x,
      z: LANES[e.lane],
      side: e.side,
    });
  }
  render(battle: Battle, dt: number, selected: boolean, spellTarget = false, animationRate = 1) {
    this.arenaCamera.update(dt);
    // Smooth render-frame motion, independent of the simulation's 20 Hz snapshots.
    const animationDt = battle.phase === 'playing' ? dt * animationRate : 0;
    this.clock += animationDt;
    this.atmosphere.update(this.clock, this.camera, this.quality === 'low');
    this.deployZone.visible = selected && !spellTarget && battle.phase === 'playing';
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
    for (const u of battle.units) {
      const v = this.units.get(u.id) || this.addUnit(u);
      v.unit = u;
      const z = LANES[u.lane] + ((u.id % 3) - 1) * 0.32;
      const targetX = u.x;
      v.group.position.x = THREE.MathUtils.lerp(v.group.position.x || targetX, targetX, Math.min(1, dt * 18));
      v.group.position.z = z;
      const born = Math.min(1, (battle.time - u.born) * 3 + 0.15);
      v.group.scale.setScalar(born);
      this.contactShadows.add(
        v.group.position,
        Math.min(2, (this.content?.models[u.heroId]?.height ?? 2.4) * 0.65),
        born,
      );
      const change = v.feedback.update(u, animationDt);
      if (change) {
        const point = v.group.position.clone();
        point.y = Math.max(2.8, (this.content?.models[u.heroId]?.height ?? 2.4) + 0.35);
        this.numbers.emit(change.damage, point);
        this.numbers.emit(change.healing, point, true);
      }
      if (v.imported) v.imported.update(u, battle.time, battle.phase, animationDt);
      else animateUnit(v.group, u, battle.time, this.clock, battle.phase);
      v.imported?.setHitFlash(v.feedback.flash);
      v.bar.position.set(
        v.group.position.x,
        Math.max(2.6, (this.content?.models[u.heroId]?.height ?? 2.4) + 0.2),
        z,
      );
      v.bar.quaternion.copy(this.camera.quaternion);
      v.bar.scale.x = 0.94 * Math.max(0.001, u.hp / u.maxHp);
      v.barBack.position.copy(v.bar.position).addScaledVector(barForward, -0.018);
      v.barBack.quaternion.copy(this.camera.quaternion);
      v.barBack.scale.set(1, 0.13, 1);
      v.barTrail.position.copy(v.bar.position).addScaledVector(barForward, -0.009);
      v.barTrail.quaternion.copy(this.camera.quaternion);
      v.barTrail.scale.set(0.94 * Math.max(0.001, v.feedback.trailHp / u.maxHp), 0.085, 1);
      v.barTrail.position.addScaledVector(barRight, (v.barTrail.scale.x - 0.94) / 2);
      v.bar.position.addScaledVector(barRight, (v.bar.scale.x - 0.94) / 2);
      v.shield.position.set(v.group.position.x, v.bar.position.y + 0.13, z);
      v.shield.quaternion.copy(this.camera.quaternion);
      v.shield.scale.x = 0.94 * Math.min(1, u.shield / 200);
      v.shield.position.addScaledVector(barRight, (v.shield.scale.x - 0.94) / 2);
      v.shield.visible = u.shield > 0;
    }
    this.spellEffects.update(battle.spellZones, battle.tactical ? battle.units : [], battle.time, this.clock);
    this.contactShadows.end();
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
        e.mesh.position.y = 1.2 + Math.sin(p * Math.PI) * 0.5;
      } else {
        e.mesh.scale.setScalar(e.kind === 'pulse' ? 1 + p * 3 : 0.2 + p * 1.8);
        e.mesh.position.y = 0.2 + p * 0.45;
      }
    }
    this.accents.observe(battle.units, battle.time);
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
    this.coreModels.forEach((model, side) => model.root.scale.setScalar(battle.cores[side] <= 0 ? 0.05 : 1));
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
