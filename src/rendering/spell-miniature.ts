import * as THREE from 'three';
import type { SpellId } from '../data/spells';

/** Small, distinct spell sculptures, built from the existing spell catalog palette. */
export function spellMiniature(
  id: SpellId,
  tint: THREE.Color,
  own: <T extends THREE.BufferGeometry | THREE.Material>(resource: T) => T,
) {
  const group = new THREE.Group();
  const material = own(
    new THREE.MeshStandardMaterial({
      color: tint.clone().multiplyScalar(0.55),
      emissive: tint,
      emissiveIntensity: 0.45,
      metalness: 0.25,
      roughness: 0.4,
    }),
  );
  if (id === 'wind') {
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(own(new THREE.TorusGeometry(0.16 + i * 0.095, 0.055, 6, 28)), material);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(Math.sin(i) * 0.08, 0.4 + i * 0.25, 0);
      group.add(ring);
    }
  } else if (id === 'ice') {
    const geometry = own(new THREE.OctahedronGeometry(0.5));
    for (let i = -1; i <= 1; i++) {
      const shard = new THREE.Mesh(geometry, material);
      shard.position.set(i * 0.35, i ? 0.75 : 1.1, 0);
      shard.scale.set(0.6, i ? 1.25 : 2, 0.65);
      shard.rotation.z = -i * 0.25;
      group.add(shard);
    }
  } else {
    const shape = new THREE.Shape();
    const points: Partial<Record<SpellId, number[][]>> = {
      lightning: [
        [0.2, 1.9],
        [-0.65, 0.85],
        [-0.1, 0.85],
        [-0.35, 0.05],
        [0.7, 1.2],
        [0.12, 1.2],
      ],
      heal: [
        [-0.24, 1.8],
        [0.24, 1.8],
        [0.24, 1.2],
        [0.8, 1.2],
        [0.8, 0.72],
        [0.24, 0.72],
        [0.24, 0.15],
        [-0.24, 0.15],
        [-0.24, 0.72],
        [-0.8, 0.72],
        [-0.8, 1.2],
        [-0.24, 1.2],
      ],
      shield: [
        [0, 1.9],
        [0.75, 1.6],
        [0.6, 0.65],
        [0, 0.1],
        [-0.6, 0.65],
        [-0.75, 1.6],
      ],
      haste: [
        [-0.65, 1.8],
        [0, 1.8],
        [0.8, 1],
        [0, 0.2],
        [-0.65, 0.2],
        [0.15, 1],
      ],
      weaken: [
        [-0.75, 1.8],
        [0, 1.35],
        [0.75, 1.8],
        [0.45, 0.65],
        [0, 0.05],
        [-0.45, 0.65],
      ],
    };
    if (id === 'fire') {
      shape.moveTo(0, 0.05);
      shape.bezierCurveTo(-1, 0.35, -0.65, 1.15, -0.2, 1.5);
      shape.bezierCurveTo(-0.25, 1.1, 0.05, 0.9, 0.15, 1.25);
      shape.bezierCurveTo(0.55, 1.7, 0.2, 1.75, 0.3, 2);
      shape.bezierCurveTo(1, 1.2, 0.9, 0.35, 0, 0.05);
    } else {
      const outline = points[id]!;
      shape.moveTo(outline[0][0], outline[0][1]);
      for (const [x, y] of outline.slice(1)) shape.lineTo(x, y);
      shape.closePath();
    }
    const mesh = new THREE.Mesh(
      own(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.15,
          bevelEnabled: true,
          bevelSize: 0.045,
          bevelThickness: 0.045,
          bevelSegments: 1,
          steps: 1,
        }),
      ),
      material,
    );
    mesh.position.z = -0.075;
    group.add(mesh);
  }
  return group;
}
