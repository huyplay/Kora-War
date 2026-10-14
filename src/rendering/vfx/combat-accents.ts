import * as THREE from 'three';
import type { GameEvent, Unit } from '../../core/types';
import { LANES } from '../../data/index';

interface Spark {
  x: number;
  z: number;
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
    mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
    age: number;
    side: number;
  }[] = [];
  private strikes = new Map<number, number>();
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private geometry = new THREE.RingGeometry(0.62, 0.78, 24, 1, -0.8, 1.6);
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
      mesh.visible = false;
      this.arcs.push({ mesh, age: 1, side: 0 });
      this.root.add(mesh);
    }
  }
  emit(event: GameEvent) {
    if (event.type !== 'hit' || (event.value ?? 0) <= 0) return;
    for (let i = 0; i < 4 && this.particles.length < 128; i++)
      this.particles.push({
        x: event.x,
        z: LANES[event.lane],
        age: 0,
        angle: event.id * 2.399 + i * 1.57,
        side: event.side,
      });
  }
  observe(units: Unit[], time: number) {
    const alive = new Set<number>();
    for (const unit of units) {
      alive.add(unit.id);
      const last = this.strikes.get(unit.id);
      this.strikes.set(unit.id, unit.attackAt);
      if (last === undefined || last === unit.attackAt || time - unit.attackAt > 0.35 || unit.range > 2)
        continue;
      const arc = this.arcs.find((item) => !item.mesh.visible);
      if (!arc) continue;
      arc.age = 0;
      arc.side = unit.side;
      arc.mesh.visible = true;
      arc.mesh.position.set(
        unit.x + (unit.side ? -0.5 : 0.5),
        1.1,
        LANES[unit.lane] + ((unit.id % 3) - 1) * 0.32,
      );
      arc.mesh.material.color.setHex(unit.side ? 0xffc6a3 : 0xbceeff);
    }
    for (const id of this.strikes.keys()) if (!alive.has(id)) this.strikes.delete(id);
  }
  update(dt: number, camera: THREE.Camera) {
    let count = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= 0.28) {
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.age / 0.28;
      this.dummy.position.set(
        p.x + Math.cos(p.angle) * t * 0.65,
        1.1 + Math.sin(p.angle) * t * 0.5 - t * t * 0.2,
        p.z + Math.sin(p.angle * 2) * t * 0.25,
      );
      this.dummy.quaternion.copy(camera.quaternion);
      this.dummy.rotateZ(p.angle);
      this.dummy.scale.set(0.18 * (1 - t), 0.045 * (1 - t), 1);
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(count, this.dummy.matrix);
      this.color.setHex(p.side ? 0xffbc7e : 0xb4e7ff).multiplyScalar(1 - t);
      this.sparks.setColorAt(count++, this.color);
    }
    this.sparks.count = count;
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
    for (const arc of this.arcs) {
      if (!arc.mesh.visible) continue;
      arc.age += dt;
      const t = arc.age / 0.22;
      arc.mesh.visible = t < 1;
      arc.mesh.quaternion.copy(camera.quaternion);
      arc.mesh.rotateZ((arc.side ? Math.PI : 0) - 0.9 + t * 1.8);
      arc.mesh.scale.setScalar(0.8 + t * 0.5);
      arc.mesh.material.opacity = Math.max(0, 1 - t) * 0.65;
    }
  }
  reset() {
    this.particles = [];
    this.strikes.clear();
    this.sparks.count = 0;
    this.arcs.forEach((arc) => (arc.mesh.visible = false));
  }
  dispose() {
    this.reset();
    this.root.removeFromParent();
    this.geometry.dispose();
    this.arcs.forEach((arc) => arc.mesh.material.dispose());
    this.sparks.geometry.dispose();
    this.sparks.material.dispose();
    this.sparks.dispose();
  }
}
