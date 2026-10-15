import * as THREE from 'three';
import type { Tower } from '../../core/types';

interface Collapse {
  age: number;
  dead: boolean;
  body: THREE.Object3D;
  scale: THREE.Vector3;
  rotation: number;
}
interface Debris {
  x: number;
  z: number;
  angle: number;
  age: number;
  size: number;
}
/** The body collapses above its fixed foundation; bounded rubble survives until reset. */
export class StructureAnimator {
  readonly root = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0x8f8172 }),
    72,
  );
  private states = new Map<string, Collapse>();
  private debris: Debris[] = [];
  private rubbleDirty = false;
  private dummy = new THREE.Object3D();
  constructor() {
    this.root.name = 'TowerCollapseDebris';
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.receiveShadow = true;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  update(towers: Tower[], meshes: Map<string, THREE.Group>, dt: number) {
    let changed = false;
    for (const tower of towers) {
      const mesh = meshes.get(tower.id);
      if (!mesh) continue;
      let state = this.states.get(tower.id);
      if (!state) {
        const dead = tower.hp <= 0,
          body = mesh.getObjectByName('TowerBody') ?? mesh;
        state = { age: dead ? 1 : 0, dead, body, scale: body.scale.clone(), rotation: body.rotation.z };
        this.states.set(tower.id, state);
        // A reconnect/replay can begin after destruction. Show the settled ruins,
        // without replaying a collapse or throwing fresh debris at the viewer.
        if (dead) this.scatter(mesh, tower.side, true);
      }
      if (tower.hp <= 0 && !state.dead) {
        state.dead = true;
        state.age = 0;
        this.scatter(mesh, tower.side, false);
      }
      if (state.dead) {
        state.age = Math.min(1, state.age + dt / 0.65);
        const p = state.age,
          ease = 1 - Math.pow(1 - p, 3);
        const height = state.scale.y * (1 - ease * 0.78),
          rotation =
            state.rotation +
            (tower.side ? -1 : 1) * (ease * 0.18 + Math.sin(p * Math.PI * 5) * (1 - p) * 0.04);
        changed ||= state.body.scale.y !== height || state.body.rotation.z !== rotation;
        state.body.scale.y = height;
        state.body.rotation.z = rotation;
      }
    }
    const debrisChanged = this.rubbleDirty || (dt > 0 && this.debris.some((piece) => piece.age < 0.9));
    if (!debrisChanged) return changed;
    let count = 0;
    for (const piece of this.debris) {
      piece.age = Math.min(0.9, piece.age + dt);
      const p = piece.age / 0.9,
        spread = p * (1.1 + piece.size * 4);
      this.dummy.position.set(
        piece.x + Math.cos(piece.angle) * spread,
        0.06 + piece.size * 0.6 + Math.sin(p * Math.PI) * (0.5 + piece.size * 3),
        piece.z + Math.sin(piece.angle) * spread * 0.7,
      );
      this.dummy.rotation.set(p * 7, piece.angle, p * 4);
      this.dummy.scale.setScalar(piece.size);
      this.dummy.updateMatrix();
      this.root.setMatrixAt(count++, this.dummy.matrix);
    }
    this.root.count = count;
    this.root.instanceMatrix.needsUpdate = true;
    this.rubbleDirty = false;
    return changed;
  }
  private scatter(mesh: THREE.Group, side: number, settled: boolean) {
    this.rubbleDirty = true;
    for (let i = 0; i < 12 && this.debris.length < 72; i++)
      this.debris.push({
        x: mesh.position.x,
        z: mesh.position.z,
        angle: i * 2.399 + side,
        age: settled ? 0.9 : 0,
        size: 0.09 + (i % 3) * 0.04,
      });
  }
  reset(meshes: Map<string, THREE.Group>) {
    for (const [id, state] of this.states)
      if (meshes.has(id)) {
        state.body.scale.copy(state.scale);
        state.body.rotation.z = state.rotation;
      }
    this.states.clear();
    this.debris = [];
    this.rubbleDirty = false;
    this.root.count = 0;
  }
  dispose() {
    this.states.clear();
    this.debris = [];
    this.root.removeFromParent();
    this.root.geometry.dispose();
    (this.root.material as THREE.Material).dispose();
    this.root.dispose();
  }
}
