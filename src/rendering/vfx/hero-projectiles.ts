import * as THREE from 'three';
import type { CombatPresentation, ProjectileStyle } from '../../data/combat-presentation';
const finitePoint = (p: THREE.Vector3) =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
const impactVertex = `
varying vec2 impactUv;
void main() {
  impactUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const impactFragment = `
uniform vec3 color;
uniform float opacity;
varying vec2 impactUv;
void main() {
  vec2 p = impactUv * 2.0 - 1.0;
  float r = length(p);
  float core = exp(-r * r * 32.0);
  float ring = exp(-pow((r - .52) * 14.0, 2.0));
  float rays = pow(abs(cos(atan(p.y, p.x + .00001) * 4.0)), 18.0)
    * (1.0 - smoothstep(.2, 1.0, r)) * smoothstep(.08, .25, r);
  float alpha = clamp(core + ring * .5 + rays * .55, 0.0, 1.0) * opacity;
  if (alpha < .005) discard;
  gl_FragColor = vec4(mix(color, vec3(1.0), core * .85), alpha);
  #include <colorspace_fragment>
}`;
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
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    age: number;
    active: boolean;
    reduced: boolean;
  }[] = [];
  private config?: CombatPresentation;
  private disposed = false;
  private arrow = new THREE.ConeGeometry(1, 2, 5);
  private orb = new THREE.IcosahedronGeometry(1, 1);
  private bolt = new THREE.OctahedronGeometry(1);
  private line = new THREE.CylinderGeometry(1, 0.03, 1, 5, 1, true);
  private impactPlane = new THREE.PlaneGeometry(2, 2);
  private direction = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  constructor() {
    this.root.name = 'HeroProjectiles';
    // Additive vertex colors fade the narrow tail without another transparent layer.
    const positions = this.line.getAttribute('position'),
      colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const brightness = Math.max(0, positions.getY(i) + 0.5);
      colors.fill(brightness, i * 3, i * 3 + 3);
    }
    this.line.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const geometry of [this.arrow, this.orb, this.bolt])
      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3),
      );
    for (let i = 0; i < 40; i++) {
      const root = new THREE.Group(),
        material = new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexColors: true,
          toneMapped: false,
        });
      const tip = new THREE.Mesh(this.arrow, material),
        trail = new THREE.Mesh(this.line, material),
        core = new THREE.Mesh(this.orb, material);
      root.name = 'HeroProjectile';
      tip.name = 'HeroHead';
      trail.name = 'HeroTrail';
      core.name = 'HeroCore';
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
        this.impactPlane,
        new THREE.ShaderMaterial({
          uniforms: { color: { value: new THREE.Color() }, opacity: { value: 1 } },
          vertexShader: impactVertex,
          fragmentShader: impactFragment,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          toneMapped: false,
          depthTest: false,
        }),
      );
      mesh.name = 'HeroImpact';
      // The torso anchor lies inside the model; a small billboard must remain readable on its surface.
      mesh.renderOrder = 12;
      mesh.visible = false;
      this.root.add(mesh);
      this.impacts.push({ mesh, age: 0, active: false, reduced: false });
    }
  }
  configure(config?: CombatPresentation) {
    if (this.disposed) return;
    this.reset();
    this.config = config;
  }
  emit(hero: string, from: THREE.Vector3, to: THREE.Vector3, targetId?: number, reduced = false) {
    const c = this.config,
      profile = c?.heroes[hero];
    if (this.disposed || !c?.enabled || !profile || !finitePoint(from) || !finitePoint(to)) return false;
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
    else shot.root.quaternion.identity();
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
    impact.mesh.material.uniforms.color.value.copy(color);
    impact.mesh.material.uniforms.opacity.value = 1;
    impact.mesh.scale.setScalar(this.config!.impactSize * (reduced ? 1 : 0.35));
  }
  update(
    dt: number,
    camera: THREE.Camera,
    lookup?: (id: number) => THREE.Vector3 | undefined,
    reduced = false,
  ) {
    const c = this.config;
    if (!c || this.disposed) return;
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.25)) : 0;
    for (const impact of this.impacts)
      if (impact.active) {
        impact.age += step;
        const p = impact.age / c.impactSeconds;
        impact.active = p < 1;
        impact.mesh.visible = impact.active;
        impact.mesh.quaternion.copy(camera.quaternion);
        // Once reduced, this impact stays at its current size until it expires.
        impact.reduced ||= reduced;
        if (!impact.reduced) impact.mesh.scale.setScalar(c.impactSize * (0.35 + p));
        impact.mesh.material.uniforms.opacity.value = Math.max(0, 1 - p);
      }
    for (const shot of this.shots)
      if (shot.active) {
        if (reduced) {
          shot.active = false;
          shot.root.visible = false;
          this.impact(shot.to, (shot.tip.material as THREE.MeshBasicMaterial).color, true);
          shot.targetId = undefined;
          continue;
        }
        shot.age += step;
        const position = step > 0 && shot.targetId !== undefined ? lookup?.(shot.targetId) : undefined;
        if (position && finitePoint(position)) shot.to.copy(position);
        const p = Math.min(1, shot.age / c.flightSeconds);
        this.pose(shot, p);
        if (p >= 1) {
          shot.active = false;
          shot.root.visible = false;
          this.impact(shot.to, (shot.tip.material as THREE.MeshBasicMaterial).color);
          shot.targetId = undefined;
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
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.root.removeFromParent();
    for (const shot of this.shots) (shot.tip.material as THREE.Material).dispose();
    for (const impact of this.impacts) impact.mesh.material.dispose();
    for (const geometry of [this.arrow, this.orb, this.bolt, this.line, this.impactPlane]) geometry.dispose();
    this.root.clear();
  }
}
