import * as THREE from 'three';
import type { Tower, Side } from '../../core/types';
import type { ArenaPresentation } from '../../data/arena-presentation';
import { LANES } from '../../data/map';
import type { ContentConfig } from '../../data/content';
import { createAimArea } from '../aim-primitives';
interface Shot {
  source: THREE.Vector3;
  target: THREE.Vector3;
  side: Side;
  age: number;
  duration: number;
  targetId?: number;
  reduced: boolean;
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
      mesh: ReturnType<typeof createAimArea>;
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
  private targetMarker = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.78, 1, 32),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
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
    this.bolt.name = 'TowerBolts';
    this.trail.name = 'TowerTrails';
    this.impact.name = 'TowerImpacts';
    this.glow.name = 'TowerGlows';
    this.targetMarker.name = 'TowerTargetMarkers';
    for (const mesh of [this.bolt, this.trail, this.impact, this.glow, this.targetMarker]) {
      mesh.setColorAt(0, new THREE.Color(0xffffff));
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.root.add(mesh);
    }
  }
  emit(
    id: string,
    from: THREE.Vector3,
    target: THREE.Vector3,
    side: Side,
    duration: number,
    targetId?: number,
    reduced = false,
  ) {
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      ![...from.toArray(), ...target.toArray()].every(Number.isFinite)
    )
      return;
    if (this.shots.length >= 32) this.shots.shift();
    this.shots.push({
      source: from.clone(),
      target: target.clone(),
      side,
      age: 0,
      duration,
      targetId,
      reduced,
    });
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
    targetPosition?: (id: number) => THREE.Vector3 | undefined,
    options?: { reducedMotion?: boolean; palette?: Pick<ContentConfig['vfx'], 'ally' | 'enemy'> },
  ) {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const ids = new Set(towers.map((t) => t.id));
    for (const [id, zone] of this.zones)
      if (!ids.has(id)) {
        zone.mesh.removeFromParent();
        zone.mesh.geometry.dispose();
        zone.mesh.material.dispose();
        this.zones.delete(id);
      }
    for (const tower of towers) {
      let zone = this.zones.get(tower.id);
      if (!zone) {
        const mesh = createAimArea();
        mesh.name = 'TowerLaneRange';
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.26;
        mesh.material.uniforms.borderOpacity.value = 1;
        mesh.material.uniforms.fillOpacity.value = 0.2;
        this.root.add(mesh);
        zone = { mesh, flash: 0 };
        this.zones.set(tower.id, zone);
      }
      zone.flash = Math.max(0, zone.flash - step * 2.4);
      const bounds = towerRangeBounds(tower.x, LANES[tower.lane], range, halfWidth);
      zone.mesh.position.x = tower.x;
      zone.mesh.position.z = LANES[tower.lane];
      zone.mesh.scale.set(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1);
      zone.mesh.material.uniforms.size.value.set(zone.mesh.scale.x, zone.mesh.scale.y);
      zone.mesh.material.uniforms.color.value.set(
        options?.palette?.[tower.side ? 'enemy' : 'ally'] ?? colors[tower.side],
      );
      zone.mesh.visible = config.showRange && tower.hp > 0;
      const opacity = options?.reducedMotion
        ? zone.flash > 0
          ? config.firingRangeOpacity
          : config.idleRangeOpacity
        : THREE.MathUtils.lerp(config.idleRangeOpacity, config.firingRangeOpacity, zone.flash);
      zone.mesh.material.uniforms.strength.value = opacity;
    }
    this.bolt.count = this.trail.count = this.impact.count = this.glow.count = this.targetMarker.count = 0;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.reduced ||= !!options?.reducedMotion;
      if (!shot.reduced && step > 0 && shot.age < shot.duration && shot.targetId !== undefined) {
        const position = targetPosition?.(shot.targetId);
        if (position && position.toArray().every(Number.isFinite)) shot.target.copy(position);
      }
      shot.age += step;
      const p = shot.age / shot.duration;
      if (p >= 1.8) {
        this.shots.splice(i, 1);
        continue;
      }
      this.color.set(options?.palette?.[shot.side ? 'enemy' : 'ally'] ?? colors[shot.side]);
      if (p < 1 || shot.reduced) {
        this.dummy.position.set(shot.target.x, 0.29, shot.target.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.setScalar(shot.reduced ? 0.65 : 0.65 + 0.12 * Math.sin(p * Math.PI));
        this.dummy.updateMatrix();
        this.targetMarker.setColorAt(this.targetMarker.count, this.color);
        this.targetMarker.setMatrixAt(this.targetMarker.count++, this.dummy.matrix);
      }
      if (shot.reduced) {
        this.dummy.position.copy(shot.target);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.setScalar(0.32);
        this.dummy.updateMatrix();
        this.impact.setColorAt(this.impact.count, this.color);
        this.impact.setMatrixAt(this.impact.count++, this.dummy.matrix);
      } else if (p < 1) {
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
        if (this.direction.lengthSq() > 1e-8)
          this.dummy.quaternion.setFromUnitVectors(this.up, this.direction.clone().normalize());
        else this.dummy.quaternion.identity();
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
      if (!shot.reduced && p < 0.5) {
        this.dummy.position.copy(shot.source);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.scale.setScalar(0.32 * (1 - p * 2));
        this.dummy.updateMatrix();
        this.impact.setColorAt(this.impact.count, this.color);
        this.impact.setMatrixAt(this.impact.count++, this.dummy.matrix);
      }
    }
    for (const mesh of [this.bolt, this.trail, this.impact, this.glow, this.targetMarker]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  reset() {
    this.shots = [];
    for (const z of this.zones.values()) {
      z.flash = 0;
      z.mesh.visible = false;
    }
    this.bolt.count = this.trail.count = this.impact.count = this.glow.count = this.targetMarker.count = 0;
  }
  dispose() {
    this.root.removeFromParent();
    for (const z of this.zones.values()) {
      z.mesh.geometry.dispose();
      z.mesh.material.dispose();
    }
    for (const m of [this.bolt, this.trail, this.impact, this.glow, this.targetMarker]) {
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
    this.zones.clear();
    this.shots = [];
    this.root.clear();
  }
}
