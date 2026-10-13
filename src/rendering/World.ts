import * as THREE from 'three';
import type { Battle, GameEvent, Unit } from '../core/index';
import { pickDeployment } from '../core/physics/lane-space';
import { HERO_MAP, LANES, type Hero } from '../data/index';
import { animateUnit } from './animation/unit-animator';
import { createHeroPrefabs } from './assets/hero-prefabs';
import { buildEnvironment } from './environment';
import { disposeSharedResources, healthGeometry, healthMaterial, part } from './resources';
import { SpriteEffects } from './vfx/sprite-effects';
interface Visual {
    group: THREE.Group;
    bar: THREE.Mesh;
    shield: THREE.Mesh;
    unit: Unit;
}
interface Effect {
    mesh: THREE.Object3D;
    start: number;
    duration: number;
    kind: string;
    x: number;
    toX: number;
    z: number;
    side: number;
}
export class World {
    private prefabs = createHeroPrefabs();
    private sprites = new SpriteEffects();
    private resizeObserver: ResizeObserver;
    private disposed = false;
    scene = new THREE.Scene();
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    canvas: HTMLCanvasElement;
    units = new Map<number, Visual>();
    towerMeshes = new Map<string, THREE.Group>();
    coreCrystals: THREE.Mesh[] = [];
    effects: Effect[] = [];
    lastEvent = 0;
    clock = 0;
    quality: 'high' | 'low' = 'high';
    ray = new THREE.Raycaster();
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    pointer = new THREE.Vector2();
    unitBatches = new Map<string, {
        mesh: THREE.InstancedMesh;
        count: number;
    }>();
    instanceColor = new THREE.Color();
    deployZone = new THREE.Group();
    hoverRing: THREE.Mesh;
    selected = false;
    selectedLane = -1;
    stats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
    constructor(container: HTMLElement) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.canvas = this.renderer.domElement;
        this.canvas.setAttribute('aria-label', 'Chiến trường 3D: chọn thẻ rồi chạm vùng bên trái để thả quân');
        this.canvas.tabIndex = 0;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        container.appendChild(this.canvas);
        this.scene.background = new THREE.Color(0x142c31);
        this.scene.fog = new THREE.FogExp2(0x142c31, .011);
        this.camera = new THREE.OrthographicCamera(-20, 20, 12, -12, .1, 150);
        this.camera.position.set(0, 28, 25);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(new THREE.HemisphereLight(0xe6fff3, 0x324436, 2.7));
        const sun = new THREE.DirectionalLight(0xffe3ab, 3.2);
        sun.position.set(-12, 24, 6);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -23;
        sun.shadow.camera.right = 23;
        sun.shadow.camera.top = 19;
        sun.shadow.camera.bottom = -19;
        sun.shadow.normalBias = .06;
        this.scene.add(sun);
        const rim = new THREE.DirectionalLight(0x79dacc, 1.5);
        rim.position.set(6, 10, -14);
        this.scene.add(rim);
        this.buildEnvironment();
        this.scene.add(this.sprites.root);
        for (let lane = 0; lane < 3; lane++) {
            const zone = new THREE.Mesh(new THREE.PlaneGeometry(7.7, 2.9), new THREE.MeshBasicMaterial({ color: 0x77e9c4, transparent: true, opacity: .15, side: THREE.DoubleSide, depthWrite: false }));
            zone.rotation.x = -Math.PI / 2;
            zone.position.set(-9.65, .05, LANES[lane]);
            this.deployZone.add(zone);
            const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.7, 2.9)), new THREE.LineBasicMaterial({ color: 0x99f6cc, transparent: true, opacity: .75 }));
            edge.rotation.x = -Math.PI / 2;
            edge.position.copy(zone.position).add(new THREE.Vector3(0, .01, 0));
            this.deployZone.add(edge);
        }
        this.scene.add(this.deployZone);
        this.deployZone.visible = false;
        this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(.65, .73, 40), new THREE.MeshBasicMaterial({ color: 0xa2ffdd, transparent: true, opacity: .85, side: THREE.DoubleSide }));
        this.hoverRing.rotation.x = -Math.PI / 2;
        this.hoverRing.visible = false;
        this.scene.add(this.hoverRing);
        this.resizeObserver = new ResizeObserver(() => this.resize(container));
        this.resizeObserver.observe(container);
        this.resize(container);
    }
    resize(el: HTMLElement) {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h)
            return;
        this.renderer.setSize(w, h, false);
        const aspect = w / h;
        const width = Math.max(36, 18 * aspect);
        this.camera.left = -width / 2;
        this.camera.right = width / 2;
        this.camera.top = width / aspect / 2;
        this.camera.bottom = -width / aspect / 2;
        this.camera.updateProjectionMatrix();
    }
    buildEnvironment() { buildEnvironment(this); }
    portrait(h: Hero) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1b343b);
        const model = this.prefabs.get(h.id)();
        model.rotation.y = -.3;
        scene.add(model);
        scene.add(new THREE.HemisphereLight(0xe3ffff, 0x3a4045, 3));
        const sun = new THREE.DirectionalLight(0xffe8c2, 4);
        sun.position.set(-3, 6, 5);
        scene.add(sun);
        const camera = new THREE.PerspectiveCamera(30, 1, .1, 20);
        camera.position.set(2, 2.25, 4.1);
        camera.lookAt(0, 1.15, 0);
        const oldSize = this.renderer.getSize(new THREE.Vector2()), ratio = this.renderer.getPixelRatio();
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(256, 256, false);
        this.renderer.render(scene, camera);
        const url = this.canvas.toDataURL('image/webp');
        this.renderer.setPixelRatio(ratio);
        this.renderer.setSize(oldSize.x, oldSize.y, false);
        return url;
    }
    pick(clientX: number, clientY: number) {
        const r = this.canvas.getBoundingClientRect();
        this.pointer.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
        this.ray.setFromCamera(this.pointer, this.camera);
        const hit = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
        if (!hit)
            return null;
        return pickDeployment(hit.x, hit.z);
    }
    setHover(clientX: number, clientY: number, ability = false) {
        const p = this.pick(clientX, clientY);
        this.hoverRing.visible = !!p && (ability || p.valid);
        if (p) {
            this.hoverRing.position.set(ability ? 0 : p.x, .27, LANES[p.lane]);
            this.selectedLane = p.lane;
        }
        return p;
    }
    setQuality(q: 'high' | 'low') { this.quality = q; this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.25 : .85)); this.renderer.shadowMap.enabled = q === 'high'; this.renderer.shadowMap.needsUpdate = true; }
    reset() {
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
        for (const e of this.effects)
            this.scene.remove(e.mesh);
        this.effects = [];
        this.lastEvent = 0;
        for (const t of this.towerMeshes.values()) {
            t.visible = true;
            t.scale.setScalar(1);
        }
    }
    disposeUnit(_v: Visual) { }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.resizeObserver.disconnect();
        this.sprites.dispose();
        this.scene.remove(this.sprites.root);
        this.prefabs.dispose();
        this.reset();
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        this.scene.traverse(object => {
            if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
                geometries.add(object.geometry);
                const list = Array.isArray(object.material) ? object.material : [object.material];
                list.forEach(material => materials.add(material));
            }
            if (object instanceof THREE.InstancedMesh)
                object.dispose();
            if (object instanceof THREE.DirectionalLight)
                object.shadow.dispose();
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
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
        bar.scale.set(.94, .085, 1);
        const shield = new THREE.Mesh(healthGeometry, healthMaterial);
        shield.scale.set(.94, .038, 1);
        const v = { group, bar, shield, unit: u };
        this.units.set(u.id, v);
        return v;
    }
    batchUnitMesh(o: THREE.Mesh, color = 0xffffff) {
        const material = o.material as THREE.Material, key = `${o.geometry.uuid}/${material.uuid}`;
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
        if (batch.count >= 1024)
            return;
        batch.mesh.setMatrixAt(batch.count, o.matrixWorld);
        this.instanceColor.setHex(color);
        batch.mesh.setColorAt(batch.count, this.instanceColor);
        batch.count++;
    }
    syncUnitBatches() {
        for (const b of this.unitBatches.values())
            b.count = 0;
        for (const v of this.units.values()) {
            v.group.updateMatrixWorld(true);
            v.group.traverse(o => {
                if (o instanceof THREE.Mesh && o.visible)
                    this.batchUnitMesh(o);
            });
            v.bar.updateMatrixWorld(true);
            this.batchUnitMesh(v.bar, v.unit.side === 0 ? 0x95f4c8 : 0xff998b);
            if (v.shield.visible) {
                v.shield.updateMatrixWorld(true);
                this.batchUnitMesh(v.shield, 0xffe4a3);
            }
        }
        for (const b of this.unitBatches.values()) {
            b.mesh.count = b.count;
            b.mesh.visible = b.count > 0;
            b.mesh.instanceMatrix.needsUpdate = true;
            if (b.mesh.instanceColor)
                b.mesh.instanceColor.needsUpdate = true;
        }
    }
    effect(e: GameEvent) {
        this.sprites.emit(e);
        const color = e.type === 'heal' ? 0x83ffc2 : e.side === 0 ? 0xb4ffde : 0xffb4a0;
        if (e.type === 'hit' || e.type === 'core')
            return;
        const kind = e.type === 'projectile' ? 'bolt' : e.type === 'pulse' ? 'pulse' : e.type === 'death' ? 'death' : 'ring';
        const mesh = kind === 'bolt' ? part(this.scene, 'orb', color, e.x, 1.25, LANES[e.lane], .13, .13, .13, 1) : part(this.scene, 'ring', e.heroId ? HERO_MAP[e.heroId].accent : color, e.x, .3, LANES[e.lane], .5, .5, .5, .8);
        if (kind !== 'bolt')
            mesh.rotation.x = -Math.PI / 2;
        this.effects.push({ mesh, start: this.clock, duration: kind === 'bolt' ? .28 : kind === 'pulse' ? 1.2 : .75, kind, x: e.x, toX: e.toX ?? e.x, z: LANES[e.lane], side: e.side });
    }
    render(battle: Battle, dt: number, selected: boolean) {
        this.clock += dt;
        this.deployZone.visible = selected && battle.phase === 'playing';
        if (!selected)
            this.hoverRing.visible = false;
        const ids = new Set(battle.units.map(u => u.id));
        for (const [id, v] of this.units)
            if (!ids.has(id)) {
                this.scene.remove(v.group, v.bar, v.shield);
                this.disposeUnit(v);
                this.units.delete(id);
            }
        for (const u of battle.units) {
            const v = this.units.get(u.id) || this.addUnit(u);
            v.unit = u;
            const z = LANES[u.lane] + ((u.id % 3) - 1) * .32;
            const targetX = u.x;
            v.group.position.x = THREE.MathUtils.lerp(v.group.position.x || targetX, targetX, Math.min(1, dt * 18));
            v.group.position.z = z;
            const born = Math.min(1, (battle.time - u.born) * 3 + .15);
            v.group.scale.setScalar(born);
            animateUnit(v.group, u, battle.time, this.clock, battle.phase);
            v.bar.position.set(v.group.position.x, 2.6, z);
            v.bar.quaternion.copy(this.camera.quaternion);
            v.bar.scale.x = .94 * Math.max(.001, u.hp / u.maxHp);
            v.shield.position.copy(v.bar.position).add(new THREE.Vector3(0, .13, 0));
            v.shield.quaternion.copy(this.camera.quaternion);
            v.shield.scale.x = .94 * Math.min(1, u.shield / 200);
            v.shield.visible = u.shield > 0;
        }
        for (const t of battle.towers) {
            const mesh = this.towerMeshes.get(t.id)!;
            mesh.scale.y = t.hp <= 0 ? .22 : 1;
            mesh.rotation.z = t.hp <= 0 ? .12 : 0;
        }
        this.coreCrystals.forEach((c, i) => { c.rotation.y = this.clock * .35 * (i === 0 ? 1 : -1); c.position.y = 2.25 + Math.sin(this.clock * 1.7 + i) * .1; c.scale.set(.8, 1.55, .8).multiplyScalar(battle.cores[i] <= 0 ? .05 : 1); });
        for (const e of battle.events)
            if (e.id > this.lastEvent) {
                this.effect(e);
                this.lastEvent = e.id;
            }
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i], p = (this.clock - e.start) / e.duration;
            if (p >= 1) {
                this.scene.remove(e.mesh);
                this.effects.splice(i, 1);
                continue;
            }
            if (e.kind === 'bolt') {
                e.mesh.position.x = THREE.MathUtils.lerp(e.x, e.toX, p);
                e.mesh.position.y = 1.2 + Math.sin(p * Math.PI) * .5;
            }
            else {
                e.mesh.scale.setScalar(e.kind === 'pulse' ? 1 + p * 9 : .2 + p * 2.4);
                e.mesh.position.y = .2 + p * .45;
            }
        }
        this.sprites.update(dt);
        this.syncUnitBatches();
        this.renderer.render(this.scene, this.camera);
        const info = this.renderer.info;
        this.stats = { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures };
    }
}
