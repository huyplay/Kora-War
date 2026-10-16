import * as THREE from 'three';
import type { CombatPresentation, ProjectileStyle } from '../../data/combat-presentation';
interface Shot {
  root: THREE.Group;
  tip: THREE.Mesh;
  trail: THREE.Mesh;
  core: THREE.Mesh;
  age: number;
  active: boolean;
  from: THREE.Vector3;
  to: THREE.Vector3;
  targetId?: number;
  style: ProjectileStyle;
}
/** Bounded, shared geometry: no per-shot meshes/materials/texture downloads. Visuals never apply damage. */
export class HeroProjectiles {
  readonly root = new THREE.Group();
  private shots: Shot[] = [];
  private impacts: {
    mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
    age: number;
    active: boolean;
    reduced: boolean;
  }[] = [];
  private config?: CombatPresentation;
  private arrow = new THREE.ConeGeometry(1, 2, 5);
  private orb = new THREE.IcosahedronGeometry(1, 1);
  private bolt = new THREE.OctahedronGeometry(1);
  private line = new THREE.CylinderGeometry(1, 1, 1, 5);
  private ring = new THREE.RingGeometry(0.55, 1, 20);
  private direction = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  constructor() {
    this.root.name = 'HeroProjectiles';
    for (let i = 0; i < 40; i++) {
      const root = new THREE.Group(),
        material = new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
      const tip = new THREE.Mesh(this.arrow, material),
        trail = new THREE.Mesh(this.line, material),
        core = new THREE.Mesh(this.orb, material);
      root.add(tip, trail, core);
      root.visible = false;
      this.root.add(root);
      this.shots.push({
        root,
        tip,
        trail,
        core,
        age: 0,
        active: false,
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
        style: 'orb',
      });
      const mesh = new THREE.Mesh(
        this.ring,
        new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      mesh.visible = false;
      this.root.add(mesh);
      this.impacts.push({ mesh, age: 0, active: false, reduced: false });
    }
  }
  configure(config?: CombatPresentation) {
    this.reset();
    this.config = config;
  }
  emit(hero: string, from: THREE.Vector3, to: THREE.Vector3, targetId?: number, reduced = false) {
    const c = this.config,
      profile = c?.heroes[hero];
    if (!c?.enabled || !profile || ![...from.toArray(), ...to.toArray()].every(Number.isFinite)) return false;
    if (reduced) {
      this.impact(to, new THREE.Color(profile.color), true);
      return true;
    }
    const shot = this.shots.find((shot) => !shot.active);
    if (!shot) return false;
    shot.from.copy(from);
    shot.to.copy(to);
    shot.age = 0;
    shot.active = true;
    shot.targetId = targetId;
    shot.style = profile.style;
    shot.root.visible = true;
    shot.root.position.copy(from);
    shot.tip.geometry =
      profile.style === 'arrow' ? this.arrow : profile.style === 'bolt' ? this.bolt : this.orb;
    shot.tip.visible = profile.style !== 'orb';
    shot.core.visible = profile.style === 'orb';
    (shot.tip.material as THREE.MeshBasicMaterial).color.set(profile.color);
    (shot.tip.material as THREE.MeshBasicMaterial).opacity = 1;
    this.pose(shot, 0);
    return true;
  }
  private pose(shot: Shot, progress: number) {
    const c = this.config!,
      size = c.size;
    shot.root.position.lerpVectors(shot.from, shot.to, progress);
    shot.root.position.y += Math.sin(progress * Math.PI) * c.arcHeight;
    this.direction.subVectors(shot.to, shot.from);
    this.direction.y += Math.cos(progress * Math.PI) * c.arcHeight * Math.PI;
    if (this.direction.lengthSq() > 0.000001)
      shot.root.quaternion.setFromUnitVectors(this.up, this.direction.normalize());
    shot.tip.scale.set(size, shot.style === 'arrow' ? size * 2.8 : size * 1.8, size);
    shot.core.scale.setScalar(size * (1 + 0.18 * Math.sin(progress * Math.PI * 4)));
    const length = Math.min(c.trailLength, shot.from.distanceTo(shot.root.position));
    shot.trail.visible = length > 0.01;
    shot.trail.scale.set(size * 0.32, length, size * 0.32);
    shot.trail.position.y = -length * 0.5;
  }
  private impact(position: THREE.Vector3, color: THREE.Color, reduced = false) {
    const impact = this.impacts.find((impact) => !impact.active);
    if (!impact) return;
    impact.active = true;
    impact.age = 0;
    impact.reduced = reduced;
    impact.mesh.visible = true;
    impact.mesh.position.copy(position);
    impact.mesh.material.color.copy(color);
    impact.mesh.material.opacity = 1;
    impact.mesh.scale.setScalar(this.config!.impactSize * (reduced ? 1 : 0.35));
  }
  update(
    dt: number,
    camera: THREE.Camera,
    lookup?: (id: number) => THREE.Vector3 | undefined,
    reduced = false,
  ) {
    const c = this.config;
    if (!c) return;
    const step = Math.max(0, Math.min(dt, 0.25));
    for (const impact of this.impacts)
      if (impact.active) {
        impact.age += step;
        const p = impact.age / c.impactSeconds;
        impact.active = p < 1;
        impact.mesh.visible = impact.active;
        impact.mesh.quaternion.copy(camera.quaternion);
        impact.mesh.scale.setScalar(c.impactSize * (impact.reduced || reduced ? 1 : 0.35 + p));
        impact.mesh.material.opacity = Math.max(0, 1 - p);
      }
    for (const shot of this.shots)
      if (shot.active) {
        if (reduced) {
          shot.active = false;
          shot.root.visible = false;
          continue;
        }
        shot.age += step;
        const position = shot.targetId === undefined ? undefined : lookup?.(shot.targetId);
        if (position && step > 0) shot.to.copy(position);
        const p = Math.min(1, shot.age / c.flightSeconds);
        this.pose(shot, p);
        if (p >= 1) {
          shot.active = false;
          shot.root.visible = false;
          this.impact(shot.to, (shot.tip.material as THREE.MeshBasicMaterial).color);
        }
      }
    // New impacts created during this frame must face the camera immediately too.
    for (const impact of this.impacts) if (impact.active) impact.mesh.quaternion.copy(camera.quaternion);
  }
  get activeCount() {
    return this.shots.filter((shot) => shot.active).length;
  }
  reset() {
    for (const shot of this.shots) {
      shot.active = false;
      shot.root.visible = false;
      shot.targetId = undefined;
    }
    for (const impact of this.impacts) {
      impact.active = false;
      impact.mesh.visible = false;
    }
  }
  dispose() {
    this.reset();
    this.root.removeFromParent();
    for (const shot of this.shots) (shot.tip.material as THREE.Material).dispose();
    for (const impact of this.impacts) impact.mesh.material.dispose();
    for (const geometry of [this.arrow, this.orb, this.bolt, this.line, this.ring]) geometry.dispose();
    this.root.clear();
  }
}
