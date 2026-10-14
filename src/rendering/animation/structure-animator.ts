import * as THREE from 'three';
import type { Tower } from '../../core/types';

interface Collapse {
  age: number;
  dead: boolean;
}
interface Debris {
  x: number;
  z: number;
  angle: number;
  age: number;
  size: number;
}
/** Cosmetic collapse follows authoritative HP; it never controls a tower's combat state. */
export class StructureAnimator {
  readonly root = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0x8f8172 }),
    72,
  );
  private states = new Map<string, Collapse>();
  private debris: Debris[] = [];
  private dummy = new THREE.Object3D();
  constructor() {
    this.root.name = 'TowerCollapseDebris';
    this.root.count = 0;
    this.root.frustumCulled = false;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  update(towers: Tower[], meshes: Map<string, THREE.Group>, dt: number) {
    for (const tower of towers) {
      const mesh = meshes.get(tower.id);
      if (!mesh) continue;
      let state = this.states.get(tower.id);
      if (!state) {
        state = { age: 0, dead: false };
        this.states.set(tower.id, state);
      }
      if (tower.hp <= 0 && !state.dead) {
        state.dead = true;
        state.age = 0;
        for (let i = 0; i < 12 && this.debris.length < 72; i++)
          this.debris.push({
            x: mesh.position.x,
            z: mesh.position.z,
            angle: i * 2.399 + tower.side,
            age: 0,
            size: 0.09 + (i % 3) * 0.04,
          });
      }
      if (state.dead) {
        state.age = Math.min(1, state.age + dt / 0.65);
        const p = state.age,
          ease = 1 - Math.pow(1 - p, 3);
        mesh.scale.y = 1 - ease * 0.78;
        mesh.rotation.z = (tower.side ? -1 : 1) * (ease * 0.18 + Math.sin(p * Math.PI * 5) * (1 - p) * 0.04);
      }
    }
    let count = 0;
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const piece = this.debris[i];
      piece.age += dt;
      if (piece.age >= 0.9) {
        this.debris.splice(i, 1);
        continue;
      }
      const p = piece.age / 0.9,
        spread = p * (1.1 + piece.size * 4);
      this.dummy.position.set(
        piece.x + Math.cos(piece.angle) * spread,
        0.08 + Math.sin(p * Math.PI) * (0.5 + piece.size * 3),
        piece.z + Math.sin(piece.angle) * spread * 0.7,
      );
      this.dummy.rotation.set(p * 7, piece.angle, p * 4);
      this.dummy.scale.setScalar(piece.size * Math.min(1, (1 - p) * 4));
      this.dummy.updateMatrix();
      this.root.setMatrixAt(count++, this.dummy.matrix);
    }
    this.root.count = count;
    this.root.instanceMatrix.needsUpdate = true;
  }
  reset(meshes: Map<string, THREE.Group>) {
    this.states.clear();
    this.debris = [];
    this.root.count = 0;
    for (const mesh of meshes.values()) {
      mesh.scale.setScalar(1);
      mesh.rotation.z = 0;
    }
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
