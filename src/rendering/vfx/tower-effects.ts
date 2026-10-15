import * as THREE from 'three';
import type { Tower, Side } from '../../core/types';
import type { ArenaPresentation } from '../../data/arena-presentation';
import { LANES } from '../../data/map';
interface Shot {
  source: THREE.Vector3;
  target: THREE.Vector3;
  side: Side;
  age: number;
  duration: number;
}
const colors = [0x55caff, 0xff6a4d];
export function towerRangeBounds(x: number, z: number, range: number, halfWidth: number) {
  return { minX: x - range, maxX: x + range, minZ: z - halfWidth, maxZ: z + halfWidth };
}
/** Presentation-only tower telegraphs and bounded projectiles, driven by server events. */
export class TowerEffects {
  readonly root = new THREE.Group();
  private zones = new Map<
    string,
    {
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      edge: THREE.LineSegments;
      flash: number;
    }
  >();
  private shots: Shot[] = [];
  private bolt = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    32,
  );
  private trail = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.1, 0.035, 1, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
    32,
  );
  private impact = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.7, 1, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    32,
  );
  private glow = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
    32,
  );
  private dummy = new THREE.Object3D();
  private direction = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private color = new THREE.Color();
  constructor() {
    this.root.name = 'TowerRangeAndProjectiles';
    for (const mesh of [this.bolt, this.trail, this.impact, this.glow]) {
      mesh.setColorAt(0, new THREE.Color(0xffffff));
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.root.add(mesh);
    }
  }
  emit(id: string, from: THREE.Vector3, target: THREE.Vector3, side: Side, duration: number) {
    if (this.shots.length >= 32) this.shots.shift();
    this.shots.push({ source: from.clone(), target: target.clone(), side, age: 0, duration });
    const zone = this.zones.get(id);
    if (zone) zone.flash = 1;
  }
  update(
    towers: Tower[],
    range: number,
    halfWidth: number,
    config: ArenaPresentation['towers'],
    dt: number,
    camera: THREE.Camera,
  ) {
    for (const tower of towers) {
      let zone = this.zones.get(tower.id);
      if (!zone) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color: colors[tower.side],
            transparent: true,
            opacity: 0.1,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        mesh.name = 'TowerLaneRange';
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.082;
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({
            color: colors[tower.side],
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
          }),
        );
        edge.rotation.x = -Math.PI / 2;
        edge.position.y = 0.092;
        this.root.add(mesh, edge);
        zone = { mesh, edge, flash: 0 };
        this.zones.set(tower.id, zone);
      }
      zone.flash = Math.max(0, zone.flash - dt * 2.4);
      const bounds = towerRangeBounds(tower.x, LANES[tower.lane], range, halfWidth);
      zone.mesh.position.x = zone.edge.position.x = tower.x;
      zone.mesh.position.z = zone.edge.position.z = LANES[tower.lane];
      zone.mesh.scale.set(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1);
      zone.edge.scale.copy(zone.mesh.scale);
      zone.mesh.visible = zone.edge.visible = config.showRange && tower.hp > 0;
      const opacity = THREE.MathUtils.lerp(config.idleRangeOpacity, config.firingRangeOpacity, zone.flash);
      zone.mesh.material.opacity = opacity * 0.2;
      (zone.edge.material as THREE.LineBasicMaterial).opacity = opacity;
    }
    this.bolt.count = this.trail.count = this.impact.count = this.glow.count = 0;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.age += dt;
      const p = shot.age / shot.duration;
      if (p >= 1.8) {
        this.shots.splice(i, 1);
        continue;
      }
      this.color.setHex(colors[shot.side]);
      if (p < 1) {
        const head = shot.source.clone().lerp(shot.target, p);
        head.y += Math.sin(p * Math.PI) * 0.5;
        const back = shot.source.clone().lerp(shot.target, Math.max(0, p - 0.4));
        back.y += Math.sin(Math.max(0, p - 0.4) * Math.PI) * 0.5;
        this.dummy.position.copy(head);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(0.2);
        this.dummy.updateMatrix();
        this.bolt.setMatrixAt(this.bolt.count++, this.dummy.matrix);
        this.dummy.scale.setScalar(0.38);
        this.dummy.updateMatrix();
        this.glow.setColorAt(this.glow.count, this.color);
        this.glow.setMatrixAt(this.glow.count++, this.dummy.matrix);
        this.direction.subVectors(head, back);
        this.dummy.position.copy(head).add(back).multiplyScalar(0.5);
        this.dummy.quaternion.setFromUnitVectors(this.up, this.direction.clone().normalize());
        this.dummy.scale.set(1, Math.max(0.01, this.direction.length()), 1);
        this.dummy.updateMatrix();
        this.trail.setColorAt(this.trail.count, this.color);
        this.trail.setMatrixAt(this.trail.count++, this.dummy.matrix);
      } else {
        const fade = (p - 1) / 0.8;
        this.dummy.position.copy(shot.target);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.setScalar((0.2 + fade * 0.7) * (1 - fade));
        this.dummy.updateMatrix();
        this.impact.setColorAt(this.impact.count, this.color);
        this.impact.setMatrixAt(this.impact.count++, this.dummy.matrix);
      }
      // A short muzzle halo shows exactly which tower fired, even when the target is obscured.
      if (p < 0.5) {
        this.dummy.position.copy(shot.source);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.setScalar(0.32 * (1 - p * 2));
        this.dummy.updateMatrix();
        this.impact.setColorAt(this.impact.count, this.color);
        this.impact.setMatrixAt(this.impact.count++, this.dummy.matrix);
      }
    }
    for (const mesh of [this.bolt, this.trail, this.impact, this.glow]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  reset() {
    this.shots = [];
    for (const z of this.zones.values()) z.flash = 0;
    this.bolt.count = this.trail.count = this.impact.count = this.glow.count = 0;
  }
  dispose() {
    this.root.removeFromParent();
    for (const z of this.zones.values()) {
      z.mesh.geometry.dispose();
      z.mesh.material.dispose();
      z.edge.geometry.dispose();
      (z.edge.material as THREE.Material).dispose();
    }
    for (const m of [this.bolt, this.trail, this.impact, this.glow]) {
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
    this.zones.clear();
    this.shots = [];
  }
}
