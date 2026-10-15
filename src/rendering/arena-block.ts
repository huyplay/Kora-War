import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

/** A 44-triangle stone block: bevels catch light without subdivision or extra draw calls. */
export function arenaBlock(width: number, height: number, depth: number) {
  const hx = width / 2,
    hy = height / 2,
    hz = depth / 2;
  const bevel = Math.min(0.09, Math.min(width, height, depth) * 0.22);
  const points: THREE.Vector3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        points.push(
          new THREE.Vector3(x * hx, y * (hy - bevel), z * (hz - bevel)),
          new THREE.Vector3(x * (hx - bevel), y * hy, z * (hz - bevel)),
          new THREE.Vector3(x * (hx - bevel), y * (hy - bevel), z * hz),
        );
      }
  const geometry = new ConvexGeometry(points);
  // World-space UVs are applied after positioning, just before batching.
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2),
  );
  return geometry;
}
