import * as THREE from 'three';
import type { GameEvent, Unit } from '../../core/types';
import { LANES } from '../../data/index';
import type { VfxReadability } from '../../data/vfx-readability';

export interface MeleePosition {
  x: number;
  y?: number;
  z: number;
  height?: number;
  radius?: number;
}
type PositionLookup = (id: number) => MeleePosition | undefined;
const validPosition = (p: MeleePosition) =>
  [p.x, p.y ?? 0, p.z, p.height ?? 2.4, p.radius ?? 0.6].every(Number.isFinite) &&
  (p.height ?? 2.4) > 0 &&
  (p.radius ?? 0.6) >= 0;

/** A shaded crescent: narrow ends and dark edges avoid a hard rectangular ribbon. */
export function meleeSlashGeometry() {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24,
      angle = -1.2 + t * 2.4,
      width = 0.32 * Math.sin(t * Math.PI) * (0.4 + t * 0.6);
    for (let row = 0; row < 3; row++) {
      const radius = 0.7 + (row - 1) * width * 0.5;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      const brightness = row === 1 ? 0.45 + t * 0.85 : 0;
      colors.push(brightness, brightness, brightness);
    }
    if (i < 24)
      for (let row = 0; row < 2; row++) {
        const a = i * 3 + row,
          b = a + 3;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
interface Spark {
  x: number;
  z: number;
  y: number;
  age: number;
  angle: number;
  side: number;
}
/** Fixed-size pools keep dense fights from allocating geometry or growing without bound. */
export class CombatAccents {
  readonly root = new THREE.Group();
  private particles: Spark[] = [];
  private sparks = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    128,
  );
  private arcs: {
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    age: number;
    side: number;
    scale: number;
    unitId?: number;
  }[] = [];
  private strikes = new Map<number, number>();
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private profile?: VfxReadability;
  private disposed = false;
  private colors = [new THREE.Color(0xbceeff), new THREE.Color(0xffc6a3)];
  private geometry = new THREE.RingGeometry(0.62, 0.78, 24, 1, -0.8, 1.6);
  private slash = meleeSlashGeometry();
  constructor() {
    this.root.name = 'CombatImpactAccents';
    this.sparks.count = 0;
    this.sparks.frustumCulled = false;
    this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.sparks);
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(
        this.geometry,
        new THREE.MeshBasicMaterial({
          color: 0xc9efff,
          transparent: true,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.name = 'MeleeSlash';
      mesh.visible = false;
      this.arcs.push({ mesh, age: 1, side: 0, scale: 1 });
      this.root.add(mesh);
    }
  }
  configure(profile?: VfxReadability, colors?: [string, string]) {
    if (this.disposed) return;
    this.reset();
    this.profile = profile;
    this.colors[0].set(profile ? (colors?.[0] ?? 0xbceeff) : 0xbceeff);
    this.colors[1].set(profile ? (colors?.[1] ?? 0xffc6a3) : 0xffc6a3);
    for (const arc of this.arcs) {
      arc.mesh.geometry = profile ? this.slash : this.geometry;
      arc.mesh.material.vertexColors = !!profile;
      arc.mesh.material.toneMapped = !profile;
      arc.mesh.material.needsUpdate = true;
    }
  }
  emit(
    event: GameEvent,
    position?: { x: number; y?: number; z: number },
    height = 1.1,
    reducedMotion = false,
  ) {
    if (this.disposed || !Number.isFinite(height) || (position && !validPosition(position))) return;
    if (!['hit', 'core'].includes(event.type) || (event.value ?? 0) <= 0) return;
    if (this.profile && reducedMotion) return;
    const x = position?.x ?? event.x,
      z = position?.z ?? LANES[event.lane];
    if (![x, z].every(Number.isFinite)) return;
    for (let i = 0; i < (event.type === 'core' ? 8 : 4) && this.particles.length < 128; i++)
      this.particles.push({
        x,
        z,
        y: this.profile ? (position?.y ?? 0) + height : 1.1,
        age: 0,
        angle: event.id * 2.399 + i * 1.57,
        side: event.side,
      });
  }
  observe(units: Unit[], time: number, position?: PositionLookup, reducedMotion = false) {
    if (this.disposed || !Number.isFinite(time)) return;
    const alive = new Set<number>();
    for (const unit of units) {
      if (unit.hp <= 0 || !Number.isFinite(unit.attackAt)) continue;
      alive.add(unit.id);
      const last = this.strikes.get(unit.id);
      this.strikes.set(unit.id, unit.attackAt);
      const suppressed =
        this.profile &&
        (!this.profile.melee.enabled ||
          reducedMotion ||
          (unit.frozenUntil ?? 0) > time + 1e-8 ||
          unit.stunUntil > time + 1e-8 ||
          unit.state === 'stunned');
      if (suppressed) {
        for (const arc of this.arcs) if (arc.unitId === unit.id) arc.mesh.visible = false;
        continue;
      }
      const age = time - unit.attackAt;
      if (last === undefined || last === unit.attackAt || age < -1e-8 || age > 0.35 || unit.range > 2)
        continue;
      const arc = this.arcs.find((item) => !item.mesh.visible);
      if (!arc) continue;
      arc.age = 0;
      arc.side = unit.side;
      arc.unitId = unit.id;
      const sample = position?.(unit.id);
      const point =
        sample && validPosition(sample)
          ? sample
          : {
              x: unit.x,
              z: LANES[unit.lane] + ((unit.id % 3) - 1) * 0.32,
            };
      if (!validPosition(point)) continue;
      this.place(arc, point);
      arc.mesh.visible = true;
      arc.mesh.material.color.copy(this.colors[unit.side]);
      arc.mesh.material.opacity = this.profile?.melee.opacity ?? 0.65;
      arc.mesh.scale.setScalar(0.8 * arc.scale);
    }
    for (const id of this.strikes.keys()) if (!alive.has(id)) this.strikes.delete(id);
    if (this.profile)
      for (const arc of this.arcs)
        if (arc.unitId !== undefined && !alive.has(arc.unitId)) arc.mesh.visible = false;
  }
  private place(arc: (typeof this.arcs)[number], point: MeleePosition) {
    const melee = this.profile?.melee;
    arc.scale = melee ? THREE.MathUtils.clamp((point.height ?? 2.4) * 0.45 * melee.size, 0.25, 2.5) : 1;
    arc.mesh.position.set(
      point.x + (arc.side ? -1 : 1) * (melee ? Math.min(point.radius ?? arc.scale * 0.6, 1.5) : 0.5),
      melee ? (point.y ?? 0) + (point.height ?? 2.4) * melee.heightRatio : 1.1,
      point.z,
    );
  }
  update(dt: number, camera: THREE.Camera, reducedMotion = false, position?: PositionLookup) {
    if (this.disposed) return;
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (this.profile && reducedMotion) {
      this.particles = [];
      this.sparks.count = 0;
      this.arcs.forEach((arc) => (arc.mesh.visible = false));
      return;
    }
    let count = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += step;
      if (p.age >= 0.28) {
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.age / 0.28;
      this.dummy.position.set(
        p.x + Math.cos(p.angle) * t * 0.65,
        p.y + Math.sin(p.angle) * t * 0.5 - t * t * 0.2,
        p.z + Math.sin(p.angle * 2) * t * 0.25,
      );
      this.dummy.quaternion.copy(camera.quaternion);
      this.dummy.rotateZ(p.angle);
      this.dummy.scale.set(0.18 * (1 - t), 0.045 * (1 - t), 1);
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(count, this.dummy.matrix);
      if (this.profile)
        this.color.copy(this.colors[p.side]).multiplyScalar((1 - t) * this.profile.events.hit.opacity);
      else this.color.setHex(p.side ? 0xffbc7e : 0xb4e7ff).multiplyScalar(1 - t);
      this.sparks.setColorAt(count++, this.color);
    }
    this.sparks.count = count;
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
    for (const arc of this.arcs) {
      if (!arc.mesh.visible) continue;
      arc.age += step;
      const t = arc.age / (this.profile?.melee.lifetime ?? 0.22);
      arc.mesh.visible = t < 1;
      if (!arc.mesh.visible) {
        arc.unitId = undefined;
        continue;
      }
      if (this.profile && step > 0 && arc.unitId !== undefined) {
        const point = position?.(arc.unitId);
        if (point && validPosition(point)) this.place(arc, point);
      }
      arc.mesh.quaternion.copy(camera.quaternion);
      arc.mesh.rotateZ((arc.side ? Math.PI : 0) - 0.9 + t * 1.8);
      arc.mesh.scale.setScalar((0.8 + t * 0.5) * arc.scale);
      arc.mesh.material.opacity = Math.max(0, 1 - t) * (this.profile?.melee.opacity ?? 0.65);
    }
  }
  reset() {
    this.particles = [];
    this.strikes.clear();
    this.sparks.count = 0;
    this.arcs.forEach((arc) => {
      arc.mesh.visible = false;
      arc.unitId = undefined;
    });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.root.removeFromParent();
    this.geometry.dispose();
    this.slash.dispose();
    this.arcs.forEach((arc) => arc.mesh.material.dispose());
    this.sparks.geometry.dispose();
    this.sparks.material.dispose();
    this.sparks.dispose();
    this.root.clear();
  }
}
