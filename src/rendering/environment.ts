import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANES } from '../data/index';
import { part, seeded } from './resources';

export interface ArenaScene {
  scene: THREE.Scene;
  coreCrystals: THREE.Mesh[];
  towerMeshes: Map<string, THREE.Group>;
  baseGroups: THREE.Group[];
}
export const ARENA_STONE = [0x948a7b, 0xa29787, 0x8e8578];
export const ARENA_WALL = [0x3c414d, 0x545360, 0x656674];

/** An open Aether arena: scenery stays outside the three combat lanes. */
export function buildEnvironment(world: ArenaScene) {
  const stage = new THREE.Group();
  stage.name = 'ArenaArchitecture';
  const random = seeded();
  const bronze = 0x9c734a;
  part(stage, 'box', 0x242a35, 0, -1.25, 0, 35.4, 2.2, 16.8);
  part(stage, 'box', ARENA_WALL[0], 0, -0.28, 0, 33.8, 0.45, 15.7);
  for (let lane = 0; lane < LANES.length; lane++) {
    const z = LANES[lane];
    part(stage, 'box', ARENA_STONE[0], 0, -0.08, z, 28, 0.16, 3.45);
    for (let column = 0; column < 19; column++)
      for (let row = 0; row < 3; row++) {
        const tile = part(
          stage,
          'box',
          ARENA_STONE[Math.floor(random() * ARENA_STONE.length)],
          -13.25 + column * 1.47 + (row % 2 ? 0.1 : 0),
          0.025,
          z + (row - 1) * 1.08,
          1.39,
          0.07,
          1.01,
        );
        tile.rotation.y = (random() - 0.5) * 0.015;
      }
    for (const edge of [-1, 1]) {
      part(stage, 'box', ARENA_WALL[1], 0, 0.09, z + edge * 1.87, 28.7, 0.35, 0.32);
      part(stage, 'box', bronze, 0, 0.28, z + edge * 1.87, 28.8, 0.055, 0.35);
    }
    for (const side of [0, 1]) {
      const sign = side ? 1 : -1,
        color = side ? 0xf47862 : 0x63caff;
      for (let i = 0; i < 3; i++)
        part(stage, 'crystal', color, sign * (6.3 + i * 0.48), 0.095, z, 0.11, 0.028, 0.2, 0.3);
      part(stage, 'box', color, sign * 13.7, 0.07, z, 0.055, 0.08, 2.8, 0.4);
    }
  }
  for (const z of [-7.4, 7.4]) {
    part(stage, 'box', ARENA_WALL[1], 0, 0.05, z, 34, 0.6, 0.7);
    part(stage, 'box', bronze, 0, 0.39, z, 34, 0.08, 0.78);
  }
  // Battlements and silhouettes frame the arena without obscuring combat.
  part(stage, 'box', ARENA_WALL[0], 0, 0.6, -9.3, 35, 2, 1.3);
  part(stage, 'box', bronze, 0, 1.64, -9.3, 35, 0.09, 1.45);
  for (let i = 0; i < 15; i++) {
    const x = -16.8 + i * 2.4;
    part(stage, 'box', ARENA_WALL[2], x, 2, -9.3, 1.05, 0.75, 1.35);
    part(stage, 'box', bronze, x, 2.4, -9.3, 1.13, 0.08, 1.42);
    if (i % 3 === 0) {
      const rock = part(stage, 'orb', 0x242d3d, x, 0.7, -13, 3.5, 2 + random(), 2.4);
      rock.rotation.set(0.2, random() * 2, 0.3);
    }
  }
  for (const side of [0, 1]) {
    const sign = side ? 1 : -1,
      color = side ? 0xf47862 : 0x63caff;
    const x = sign * 15.1;
    for (const z of [-7.1, 7.1]) {
      part(stage, 'box', ARENA_WALL[0], x, 1.1, z, 1.25, 2.7, 1.2);
      part(stage, 'box', bronze, x, 2.5, z, 1.4, 0.18, 1.35);
      part(stage, 'crystal', color, x, 3.1, z, 0.3, 0.7, 0.3, 0.8);
    }
    const base = new THREE.Group();
    world.scene.add(base);
    world.baseGroups.push(base);
    part(base, 'cylinder', ARENA_WALL[1], x, 0.2, 0, 1.9, 0.55, 2.2);
    part(base, 'cylinder', bronze, x, 0.55, 0, 1.65, 0.18, 1.9);
    part(base, 'cylinder', ARENA_WALL[2], x, 1, 0, 1.25, 0.8, 1.5);
    const core = part(world.scene, 'crystal', color, x, 2.25, 0, 0.8, 1.55, 0.8, 0.8);
    world.coreCrystals.push(core);
    const orbit = part(base, 'ring', bronze, x, 1.7, 0, 1.5, 1.5, 1.5, 0.25);
    orbit.rotation.x = Math.PI / 2;
    for (let lane = 0; lane < LANES.length; lane++) {
      const tower = new THREE.Group();
      tower.position.set(sign * 9, 0, LANES[lane]);
      part(tower, 'cylinder', ARENA_WALL[0], 0, 0.15, 0, 0.63, 0.3, 0.63);
      part(tower, 'cylinder', ARENA_WALL[2], 0, 0.65, 0, 0.4, 0.85, 0.4);
      part(tower, 'cylinder', bronze, 0, 1.12, 0, 0.55, 0.15, 0.55);
      part(tower, 'crystal', color, 0, 1.72, 0, 0.32, 0.65, 0.32, 0.7);
      world.scene.add(tower);
      world.towerMeshes.set(`${side}-${lane}`, tower);
    }
    for (const z of [-6.5, 6.5]) {
      part(stage, 'cylinder', bronze, sign * 12.7, 0.6, z, 0.2, 1.1, 0.2);
    }
  }
  for (const x of [-12.7, 12.7]) {
    const lamp = new THREE.PointLight(0xffaa64, 2, 11, 2);
    lamp.position.set(x, 3, -6.5);
    world.scene.add(lamp);
  }
  stage.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  stage.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = (
      object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
    ).applyMatrix4(object.matrixWorld);
    const positions = geometry.getAttribute('position'),
      normals = geometry.getAttribute('normal'),
      uv = geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) {
      const nx = Math.abs(normals.getX(i)),
        ny = Math.abs(normals.getY(i));
      uv.setXY(
        i,
        nx > ny && nx > Math.abs(normals.getZ(i)) ? positions.getZ(i) / 2 : positions.getX(i) / 2,
        ny > 0.5 ? positions.getZ(i) / 2 : positions.getY(i) / 2,
      );
    }
    const material = object.material as THREE.Material;
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material)!.push(geometry);
  });
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      world.scene.add(mesh);
    }
    geometries.forEach((geometry) => geometry.dispose());
  }
}
